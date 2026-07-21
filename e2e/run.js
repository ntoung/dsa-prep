import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import Browserbase from '@browserbasehq/sdk'

function waitForLine(proc, pattern, label, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let resolved = false
    const onData = (data) => {
      const text = data.toString()
      process.stdout.write(`[${label}] ${text}`)
      const match = text.match(pattern)
      if (match && !resolved) {
        resolved = true
        resolve(match[1])
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', (data) => process.stderr.write(`[${label}] ${data}`))
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`${label} exited early with code ${code}`))
    })
    setTimeout(() => {
      if (!resolved) reject(new Error(`Timed out waiting for ${label} to be ready`))
    }, timeoutMs)
  })
}

function spawnDetached(command, args) {
  return spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true })
}

function killProcessTree(proc) {
  if (!proc || proc.killed || proc.exitCode !== null) return
  try {
    process.kill(-proc.pid, 'SIGTERM')
  } catch {
    proc.kill('SIGTERM')
  }
  setTimeout(() => {
    if (proc.exitCode === null) {
      try {
        process.kill(-proc.pid, 'SIGKILL')
      } catch {
        proc.kill('SIGKILL')
      }
    }
  }, 3000)
}

function startDevServer() {
  const proc = spawnDetached('npx', ['vite', '--config', 'e2e/vite.config.e2e.ts', '--strictPort', 'false'])
  return waitForLine(proc, /Local:\s+http:\/\/localhost:(\d+)\//, 'vite').then((port) => ({ proc, port }))
}

function startTunnel(port) {
  const proc = spawnDetached('npx', ['localtunnel', '--port', String(port)])
  return waitForLine(proc, /your url is:\s+(https:\/\/\S+)/i, 'localtunnel').then((url) => ({ proc, url }))
}

async function check(page, selector, label, timeoutMs = 10000) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: timeoutMs })
  console.log(`PASS: ${label}`)
}

async function gotoWithRetry(page, url, checkSelector, label) {
  let loaded = false
  for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    try {
      await page.locator(checkSelector).first().waitFor({ state: 'visible', timeout: 20000 })
      loaded = true
    } catch {
      console.log(`${label} attempt ${attempt} didn't come up in time, retrying...`)
    }
  }
  if (!loaded) throw new Error(`${label} did not load (tunnel connection issue)`)
  console.log(`PASS: ${label}`)
}

async function reloadWithRetry(page, checkSelector, label) {
  let loaded = false
  for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    try {
      await page.locator(checkSelector).first().waitFor({ state: 'visible', timeout: 20000 })
      loaded = true
    } catch {
      console.log(`Reload attempt ${attempt} didn't come up in time, retrying...`)
    }
  }
  if (!loaded) throw new Error('App did not remount after reload (tunnel connection issue)')
  console.log(`PASS: ${label}`)
}

async function main() {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error('BROWSERBASE_API_KEY is not set (check .env)')
  }

  const devServer = await startDevServer()
  const tunnel = await startTunnel(devServer.port)

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY })
  const session = await bb.sessions.create()
  console.log(`Session replay: https://www.browserbase.com/sessions/${session.id}`)

  const browser = await chromium.connectOverCDP(session.connectUrl)
  const context = browser.contexts()[0]
  const page = context.pages()[0]
  await context.setExtraHTTPHeaders({ 'bypass-tunnel-reminder': 'true' })
  await page.setViewportSize({ width: 390, height: 844 })

  try {
    await gotoWithRetry(page, tunnel.url, '.problem-card', 'Swipe view loads (default tab)')

    await check(page, '.card-title:has-text("Contains Duplicate")', 'First due card shows "Contains Duplicate"')

    await page.click('.problem-card')
    await check(page, '.card-back h3:has-text("Approach")', 'Tapping the card flips to the explanation')
    await page.locator('.swipe-actions').waitFor({ state: 'hidden', timeout: 3000 })
    console.log('PASS: Icon overlay hides while the card is flipped (would otherwise cover the text)')

    await page.click('.problem-card')
    await check(page, '.swipe-actions', 'Tapping again flips back and the icon overlay reappears')

    await page.click('.swipe-actions .icon-button-positive')
    await check(
      page,
      'button[aria-label="Undo last swipe"]',
      'Swiping "Reviewed" advances the deck and reveals Undo on the card',
    )
    await check(page, '.card-title:has-text("Valid Anagram")', 'Next card in the deck is shown')

    await page.click('button[aria-label="Undo last swipe"]')
    await check(page, '.card-title:has-text("Contains Duplicate")', 'Clicking Undo actually reverts to the previous card')

    // Undo also reverted today's review count - redo the swipe so the rest of
    // this test's assumptions (1 reviewed, todayCount 1) hold.
    await page.click('.swipe-actions .icon-button-positive')
    await check(page, '.card-title:has-text("Valid Anagram")', 'Re-reviewing after undo advances the deck again')

    await page.click('.bottom-nav-item[aria-label="Stats"]')
    await check(page, '.stats-streak-number:has-text("1")', 'Stats: streak is 1 day')
    await check(page, '.stats-card:has-text("Total reviewed") span:has-text("1 / 150")', 'Stats: total reviewed is 1 / 150')

    await page.click('.bottom-nav-item[aria-label="Settings"]')
    await check(page, '.settings-size-pills', 'Settings tab loads')
    await page.click('.settings-size-pills button:has-text("S")')
    const previewFontSize = await page.locator('.settings-preview code').evaluate((el) => getComputedStyle(el).fontSize)
    if (previewFontSize !== '12px') {
      throw new Error(`Expected preview font-size 12px after selecting "S", got ${previewFontSize}`)
    }
    console.log('PASS: Selecting "S" sets code font-size to 12px')

    await page.click('.bottom-nav-item[aria-label="Swipe"]')
    const cardFontSize = await page
      .locator('.card-solution code')
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize)
    if (cardFontSize !== '12px') {
      throw new Error(`Expected the swipe card's code font-size to follow the setting (12px), got ${cardFontSize}`)
    }
    console.log('PASS: Font-size setting applies to the swipe card too')

    await page.click('.bottom-nav-item[aria-label="Settings"]')
    const difficultyCard = page.locator('.stats-card:has-text("Review difficulty")')
    await difficultyCard.locator('button:has-text("Medium")').click()
    await difficultyCard.locator('button:has-text("Hard")').click()
    const enabledDifficulties = await page.evaluate(() => {
      const raw = localStorage.getItem('dsa-prep:settings')
      return raw ? JSON.parse(raw).enabledDifficulties : null
    })
    if (JSON.stringify(enabledDifficulties) !== JSON.stringify(['Easy'])) {
      throw new Error(`Expected only "Easy" enabled, got ${JSON.stringify(enabledDifficulties)}`)
    }
    console.log('PASS: Deselecting Medium and Hard leaves only Easy enabled in settings')

    // Lower the daily goal to just above the current today-count (1, from the
    // earlier "Mark reviewed" swipe) so the very next review action crosses it.
    await page.evaluate(() => {
      const raw = localStorage.getItem('dsa-prep:settings')
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.dailyGoal = 2
      localStorage.setItem('dsa-prep:settings', JSON.stringify(parsed))
    })
    await reloadWithRetry(page, '.problem-card', 'App reloads with the lowered daily goal')
    await page.click('.swipe-actions .icon-button-positive')
    await check(page, '.goal-toast:has-text("Daily goal reached")', 'Goal toast appears the moment the goal is crossed')
    await page.locator('.goal-toast').waitFor({ state: 'hidden', timeout: 4000 })
    console.log('PASS: Goal toast auto-dismisses after a few seconds')

    await page.click('.bottom-nav-item[aria-label="Learn"]')
    await check(page, '.view-title:has-text("Learn")', 'Learn: page title renders')
    await check(page, '.learn-card-header:has-text("Arrays & Hashing")', 'Learn: category list renders')

    await page.fill('.search-input', 'hash set')
    await check(page, '.learn-card-header:has-text("Arrays & Hashing")', 'Learn: search matches on lesson body text, not just the title')
    const twoPointersVisible = await page.locator('.learn-card-header:has-text("Two Pointers")').count()
    if (twoPointersVisible !== 0) throw new Error('Expected "Two Pointers" to be filtered out by the "hash set" search')
    console.log('PASS: Learn: search filters out non-matching categories')

    await page.fill('.search-input', 'zzz-no-such-topic')
    await check(page, '.no-results:has-text(\'No topics match "zzz-no-such-topic"\')', 'Learn: no-results message renders for an unmatched query')

    await page.fill('.search-input', '')
    await page.click('.learn-card-header:has-text("Arrays & Hashing")')
    await check(page, '.overlay-view h3:has-text("Recognize it")', 'Learn: opening a topic shows its lesson in a full-screen overlay')
    await check(page, '.topic-problem-row:has-text("Contains Duplicate")', 'Learn: topic overlay lists problems in that category')

    await page.click('.topic-problem-row:has-text("Contains Duplicate")')
    await check(page, '.learn-flip-card .card-title:has-text("Contains Duplicate")', 'Learn: tapping a problem opens its flip card')

    await page.click('.learn-flip-card')
    await check(page, '.learn-flip-card .card-back h3:has-text("Summary")', 'Learn: tapping the card flips it to the explanation')

    await page.click('.overlay-view-problem .icon-button[aria-label="Close"]')
    await page.click('.overlay-view-topic .icon-button[aria-label="Close"]')
    console.log('PASS: Learn: closing the overlays does not crash the app')

    await page.click('.bottom-nav-item[aria-label="Stats"]')
    await check(page, '.view-title:has-text("Stats")', 'Stats: page title renders')
    await check(
      page,
      '.category-stat-row:has-text("Arrays & Hashing") .heatmap-cell.level-1',
      'Stats: coverage heatmap shows a colored cell for the reviewed problem',
    )

    await reloadWithRetry(page, '.bottom-nav-item', 'App remounts after reload')
    await page.click('.bottom-nav-item[aria-label="Stats"]')
    await check(page, '.stats-card:has-text("Total reviewed") span:has-text("1 / 150")', 'Reviewed state persists across reload')

    console.log('\nAll E2E checks passed.')
  } finally {
    await browser.close()
    killProcessTree(tunnel.proc)
    killProcessTree(devServer.proc)
  }
}

main().catch((err) => {
  console.error('E2E test failed:', err)
  process.exitCode = 1
})
