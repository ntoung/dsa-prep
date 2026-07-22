// Paste this into script.google.com (Extensions > Apps Script from a Google Sheet)
// then deploy as a Web App. See google-apps-script/README.md for step-by-step instructions.

// Set the same value in .env as FEEDBACK_SECRET. This is a soft deterrent against
// bots hitting the endpoint, not real auth - anything shipped to the client bundle is
// visible to anyone who reads it.
var SHARED_SECRET = 'REPLACE_WITH_A_RANDOM_STRING'

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  var body = JSON.parse(e.postData.contents)

  if (body.secret !== SHARED_SECRET) {
    return jsonResponse({ ok: false, error: 'unauthorized' })
  }
  if (!body.description || !body.type) {
    return jsonResponse({ ok: false, error: 'missing fields' })
  }

  sheet.appendRow([
    new Date(),
    body.type,
    body.description,
    body.contact || '',
    body.userAgent || '',
  ])

  return jsonResponse({ ok: true })
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
