# Feedback -> Google Sheet

Bug reports and feature requests from the Settings page get POSTed straight to a Google Apps Script Web App, which appends a row to a Sheet.
No backend to host or maintain - the script runs on Google's infrastructure under your account.

## One-time setup

1. Create a new Google Sheet (e.g. "dsa-prep feedback"). Add a header row: `Timestamp | Type | Description | Contact | User Agent`.
2. In the Sheet, go to **Extensions > Apps Script**.
3. Delete the placeholder code and paste in `feedback.gs` from this folder.
4. Replace `SHARED_SECRET` with a random string (e.g. run `openssl rand -hex 16` locally).
5. Click **Deploy > New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Authorize when prompted (it's your own script, acting on your own Sheet).
7. Copy the Web App URL - it ends in `/exec`.
8. In the dsa-prep repo, set in `.env`:
   ```
   VITE_FEEDBACK_ENDPOINT=<the /exec URL>
   VITE_FEEDBACK_SECRET=<the same random string from step 4>
   ```
9. Rebuild/redeploy the app (`npm run deploy`).

## Updating the script later

Editing `feedback.gs` in the Apps Script editor alone isn't enough - you need **Deploy > Manage deployments > Edit (pencil icon) > New version** for changes to take effect on the existing `/exec` URL.
