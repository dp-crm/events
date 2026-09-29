# Wealth Matrix Webinar & Event Tracker

One Apps Script backend, your existing Google Sheet as the database, and
three static pages on GitHub Pages.

- **register.html** — the public registration page you share. `?id=EVT...`
  decides which webinar it shows; heading is the Topic, pulled live.
- **feedback.html** — the public post-webinar feedback page. The follow-up
  email links here with `?id=...&name=...&email=...&mobile=...` so the
  person's details are pre-filled.
- **admin.html** — your app (installable as a PWA). Schedule webinars, get a
  share link, see who registered, email or WhatsApp them individually — and,
  behind the bar-chart icon, a **Dashboard** view right inside the same app:
  totals, registrations per webinar, registrations per country. No separate
  page or second passcode entry.
- **Code.gs** — the Apps Script Web App all three pages talk to.
- **config.js** — the small shared settings file (Web App URL, firm name,
  optional reCAPTCHA site key) all three pages load.

## What I assumed, so you can correct anything

1. **A new "Events" tab** holds each webinar's Topic, Date, Conducted by,
   Meeting Link, Description, and a Calendar Event ID — separate from your
   existing registrations sheet. Your columns A–G stay exactly as they are;
   I add **H "Event ID"**, **I "Meeting Link"**, **J/K/L** for the 5-day,
   1-day and 2-hour reminder flags, and now **M "Follow-up Sent"**.
2. **The Google Meet link and calendar event are created automatically** the
   moment you tap **Schedule webinar**, on your own calendar. You don't type
   a meeting link in when creating a webinar — the **Edit** button on a
   webinar's detail screen can still override it (Zoom, a fixed link,
   whatever), and edits to topic/date/description sync back to the calendar
   event.
3. **Reminders** send automatically at 5 days, 1 day, and 2 hours before each
   webinar, and a **feedback follow-up** sends 2 hours after each webinar
   *ends* (start time + the 60-minute duration + 2 hours) — all on top of
   the confirmation email sent immediately at registration. One time-driven
   trigger, checking every 30 minutes, handles all of it; see `setupTriggers`
   below. A late registrant never gets a reminder phrased for a time that's
   already passed — they just pick up the next stage that still applies.
4. **The feedback page writes to a new "webinarfeedback" tab**, columns
   *Name of participant, Mail ID, Mobile no, Feedback comment* exactly as
   asked, plus **Webinar Topic**, **Event ID**, and **Submitted At** after
   them — without those, feedback from different webinars would be
   impossible to tell apart once you have more than one.
5. **reCAPTCHA v3 is wired in but off by default.** Leave `RECAPTCHA_SECRET_KEY`
   (Code.gs) and `RECAPTCHA_SITE_KEY` (config.js) blank and registration
   works exactly as before, unprotected. Fill in both — from a free key pair
   at google.com/recaptcha/admin for your GitHub Pages domain — and it
   activates automatically on both ends; submissions scoring below `0.5`
   (tune via `RECAPTCHA_MIN_SCORE`) are rejected server-side.
6. **Registrants are added to Google Contacts**, in a "Webinar leads" group,
   right after they register — best-effort: if it fails for any reason
   (People API not yet enabled, a quota hiccup), the registration and email
   still go through, nothing is blocked. One limitation worth knowing: it
   always creates a new contact rather than checking for an existing one
   first, so someone who registers for a second webinar with the same email
   may end up as two contacts — Google Contacts has a built-in "merge
   duplicates" tool if that piles up.
7. **The dashboard lives inside admin.html itself**, as a view you switch
   into (tap the bar-chart icon, tap the back arrow to return) rather than a
   separate page — no extra passcode prompt, no second file to deploy. Reads
   live from the same sheet, no separate account or setup needed.
8. Webinar **date + time** are treated as **IST**; calendar invites default
   to **60 minutes** (`DEFAULT_DURATION_MINUTES` in Code.gs).
9. The admin app (dashboard included) is protected by a **single passcode**
   (`ADMIN_TOKEN` in Code.gs) — not a full login system. It exists because
   admin.html is a public URL once deployed; without it, anyone with the
   link could read attendee details or create/edit webinars.
10. Confirmation, reminder, and follow-up emails all send via `MailApp` —
    free Gmail accounts are capped at **100 emails/day**. With four emails
    now possible per registrant (confirmation + 3 reminders, or fewer if
    they register late) plus the follow-up, keep an eye on this for a large
    webinar.
11. WhatsApp sending stays **manual by design** — the app opens WhatsApp
    Web/app pre-filled; you review and hit send.

## Deploy

### 1. Apps Script (Code.gs)
1. Open your sheet → **Extensions → Apps Script**.
2. Paste in `Code.gs`, replacing the placeholder code.
3. Edit the constants at the top:
   - `ADMIN_TOKEN` — change this passcode.
   - `SITE_BASE_URL` — your GitHub Pages URL, no trailing slash (you can
     come back and fill this in once you've done part 3 below — it's only
     used to build the feedback link in follow-up emails).
   - `RECAPTCHA_SECRET_KEY` — optional, see assumption 5 above.
4. **Enable the Calendar Advanced Service** (auto-creates the Meet link +
   calendar event): left sidebar → **Services** → **+** → **Google Calendar
   API** → **Add**. If it shows a Cloud project warning, follow its link and
   enable "Google Calendar API" there too (one-time).
5. **Enable the People Advanced Service** (adds registrants to Contacts):
   same steps as above, but **Google People API**.
6. Run `setupSheets` once (function dropdown → ▶ → approve every permission
   it asks for — Calendar, Contacts, Gmail, Sheets — this is where those
   prompts appear). Adds the Events tab, the webinarfeedback tab, and
   columns H–M. Safe to re-run any time, including now, to backfill new
   columns on top of the previous version.
7. Run `setupTriggers` once. Installs the timers for reminders *and* the
   post-webinar follow-up — both check every 30 minutes. Safe to re-run.
8. **Deploy → New deployment → Web app.** Execute as **Me**, access
   **Anyone**. Copy the URL (ends in `/exec`).

### 2. config.js
Paste the Web App URL in as `WEB_APP_URL`. Leave `RECAPTCHA_SITE_KEY` blank
unless you've set up reCAPTCHA (assumption 5).

### 3. GitHub Pages
Upload all of these to your repo, same folder, no subfolders (the pages
reference each other by relative path): `register.html`, `feedback.html`,
`admin.html`, `config.js`, `manifest.json`, `sw.js`,
`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`. Enable Pages as
usual, then go back into Code.gs and paste the resulting URL into
`SITE_BASE_URL` (step 1.3) — redeploy (Manage deployments → ✎ → New version)
after that change.

If you'd already uploaded a `dashboard.html` from an earlier version, delete
it from the repo — the dashboard now lives inside admin.html and that file
is no longer used.

## Using it
- Open `admin.html`, enter your passcode, tap **+** to schedule your first
  webinar — topic, date & time, who's conducting it, an optional description.
  No meeting link to paste in; a Meet link and calendar event are created
  for you, and you get a share link immediately.
- Tap the bar-chart icon next to refresh for the **dashboard** — stats and
  charts open right in place; tap the back arrow to return to your webinars.
- About two hours after each webinar ends, everyone who registered gets a
  feedback email automatically — no action needed from you.
- Redeploy note: any time you change Code.gs, use **Manage deployments → ✎ →
  New version** — editing the file alone doesn't update the live URL.
