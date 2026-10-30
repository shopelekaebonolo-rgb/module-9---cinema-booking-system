# CineNova: running the site and sending ticket emails

Opening the pages directly is fine for looking around, but the ticket emails need the small server in this folder.

## One-time setup
1. Install Node.js (nodejs.org, the LTS version).
2. Open a terminal in this folder and run: `npm install`
3. Make a Gmail **App Password** (Gmail won't accept your normal password here):
   - Google Account > Security > turn on **2-Step Verification**
   - Google Account > Security > **App passwords** > create one called "CineNova"
   - Copy the 16-letter password
4. Copy `.env.example` to a new file called `.env` and fill it in:
   ```
   GMAIL_USER=yourname@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```
   Never share, upload or screenshot the `.env` file.

## Every time
```
npm start
```
Then open http://localhost:3000 (use this address, not Live Server, the first time).

## Try it without Gmail
```
npm run demo
```
Nothing is sent. The email is saved as `last-email.html`; double-click it to see exactly what the customer would get.

## How it works
- `payment.html` saves the order. `confirmation.html` shows the full ticket and asks the server to email it.
- `server.js` sends the email from your Gmail address. `email.js` builds the email design. The QR code is made by the server.
- If the server isn't running, the ticket still shows on the website and the page tells you the email wasn't sent.

## Good to know
- The email comes from your own Gmail account, so it can land in the customer's spam folder at first. Gmail also limits how many you can send per day (about 500).
- This is a demo shop: no real card payment happens.
