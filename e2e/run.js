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

  try {
    await page.goto(tunnel.url, { waitUntil: 'domcontentloaded' })
    await check(page, 'h1:has-text("NeetCode 150 Review")', 'App loads')

    await page.fill('.app-search', 'Contains Duplicate')
    await check(page, '.problem-row-title:has-text("Contains Duplicate")', 'Search finds "Contains Duplicate"')
    const rowCount = await page.locator('.problem-row').count()
    if (rowCount !== 1) throw new Error(`Expected 1 problem row after search, got ${rowCount}`)
    console.log('PASS: search narrows the list to a single match')

    await page.click('.problem-row:has-text("Contains Duplicate")')
    await check(page, 'h2:has-text("Contains Duplicate")', 'Selecting a row shows its detail panel')

    await page.click('.reveal-button')
    await check(page, 'text=Approach', 'Revealing the solution shows the approach section')

    const progressBefore = await page.textContent('.app-progress')
    await page.click('.reviewed-toggle')
    await check(page, '.reviewed-toggle.active:has-text("Reviewed")', 'Toggle switches to the Reviewed state')
    const progressAfter = await page.textContent('.app-progress')
    if (progressBefore === progressAfter) {
      throw new Error(`Expected the progress count to change, stayed at "${progressAfter.trim()}"`)
    }
    console.log(`PASS: progress count updated (${progressBefore.trim()} -> ${progressAfter.trim()})`)

    await check(page, '.problem-row.selected .reviewed-check', 'Checkmark appears on the reviewed row')

    // localtunnel's free tier occasionally drops the connection on a fresh reload,
    // so retry the reload itself rather than just the element wait.
    let reloaded = false
    for (let attempt = 1; attempt <= 3 && !reloaded; attempt++) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      try {
        await page.locator('h1:has-text("NeetCode 150 Review")').first().waitFor({ state: 'visible', timeout: 8000 })
        reloaded = true
      } catch {
        console.log(`Reload attempt ${attempt} didn't come up in time, retrying...`)
      }
    }
    if (!reloaded) throw new Error('App did not remount after reload (tunnel connection issue)')
    console.log('PASS: App remounts after reload')
    await check(page, '.reviewed-toggle.active:has-text("Reviewed")', 'Reviewed state persists across reload')

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
