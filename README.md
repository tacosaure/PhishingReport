# Report Suspicious Email — Thunderbird Add-on

A Thunderbird MailExtension that lets users report suspicious emails directly
from the message list or the reading pane, either with one click to a fixed
security address, or by picking a specific company/team from a searchable,
GitHub-hosted list.

## Features

- **Quick Report** — right-click a message (or click the toolbar button) to
  instantly forward it to a hardcoded security address.
- **Advanced Report** — right-click a message and choose "Advanced Report" to
  open a searchable list of companies/teams (loaded live from a JSON file in
  this repo) and pick exactly who should receive the report.
- The hardcoded security address is **always** included on every report:
  as the direct recipient on Quick Report, and as a `bcc` on Advanced Report.
- The original email is attached as a `.eml` file (raw source), preserving
  full headers for analysis.
- After reporting, the original message is automatically moved to the
  account's Junk/Spam folder.
- The user gets a native notification confirming what happened (reported,
  moved to spam, or if something failed).

## How it works

```
right-click email
      │
      ├── Quick Report ───────────────► send to hardcoded address ─┐
      │                                                              │
      └── Advanced Report ──► popup.html                             │
                (search + pick a team from security_team_company_list.json)
                                    │                                 │
                                    └── send to team, bcc hardcoded ──┤
                                                                       ▼
                                                        move message to Junk
                                                        show confirmation
```

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Add-on metadata, permissions, entry points |
| `background.js` | Core logic: menus, toolbar button, sending, moving to Junk, notifications |
| `popup.html` | UI for the Advanced Report team picker |
| `popup.js` | Fetches the team list, handles search/sort, sends the user's choice to `background.js` |
| `icon.png` | Toolbar button icon |
| `security_team_company_list.json` | The list of companies/teams and their report addresses, fetched live at report time |

## `security_team_company_list.json` format

A flat JSON array of objects, each with a `name` and an `email`:

```json
[
  { "name": "Amazon", "email": "reportascam@amazon.com" },
  { "name": "Apple", "email": "reportphishing@apple.com" }
]
```

- **`name`** — display name shown in the team picker.
- **`email`** — the address the report is sent to when that team is selected.

You can add, remove, or update entries in this file at any time — the add-on
fetches it fresh every time the Advanced Report popup is opened, so changes
take effect immediately for all users without needing to update the add-on
itself.

## Setup

1. Clone or download this repo into a local folder.
2. Open `popup.js` and confirm `TEAMS_URL` points at the **raw** URL of
   `security_team_company_list.json` in this repo, e.g.:
   ```
   https://raw.githubusercontent.com/<user>/<repo>/refs/heads/main/security_team_company_list.json
   ```
3. Open `background.js` and set `QUICK_REPORT_ADDRESS` to your organization's
   hardcoded security inbox.
4. In Thunderbird, go to **Tools → Add-ons and Themes → gear icon → Debug
   Add-ons → Load Temporary Add-on…**, and select `manifest.json` from this
   folder.

## Permissions used

| Permission | Why it's needed |
|---|---|
| `messagesRead` | Read the reported message's content and headers |
| `messagesMove` | Move the reported message to the Junk/Spam folder |
| `compose` | Create the report email and attach the original message |
| `compose.send` | Send the report automatically, without opening a compose window for the user |
| `accountsRead` | Look up the account's folder list to find the Junk folder |
| `menus` | Add the right-click context menu entries |
| `notifications` | Show the confirmation/failure notification |
| `https://raw.githubusercontent.com/*` | Fetch `security_team_company_list.json` for the Advanced Report picker |

## Notes

- Reports are sent as a new email with the original message attached as a
  `.eml` file, rather than an inline forward, so the original headers are
  preserved exactly as received — this matters for phishing analysis.
- If no Junk/Spam folder can be found on the account, the message is left in
  place and the notification says so, rather than silently failing.
- `security_team_company_list.json` is fetched over plain HTTPS from GitHub's
  raw content host, which supports CORS for `GET` requests — no proxy or
  extra configuration is required. If this repo is ever made private, the
  fetch will need an auth token, which is a bigger design change (a token
  should never be hardcoded client-side).

## Packaging for distribution

```bash
cd PhishingReport
zip -r -FS ../report-suspicious-email.xpi manifest.json background.js popup.html popup.js icon.png
```

The resulting `.xpi` can be installed via **Add-ons Manager → gear icon →
Install Add-on From File**, signed and published on
addons.thunderbird.net, or pushed to users via enterprise policy.
