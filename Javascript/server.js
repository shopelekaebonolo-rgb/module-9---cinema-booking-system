// CineNova server: serves the website and sends ticket emails through Gmail.
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const { buildTicketEmail } = require("./email");

const PORT = process.env.PORT || 3000;
const DRY_RUN = process.env.DRY_RUN === "true";       // true = don't send, just save last-email.html
const app = express();
app.use(express.json({ limit: "50kb" }));

// Let the pages call this server even when they are opened from Live Server or a file
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin === "null" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---------- Email ----------
const transporter = DRY_RUN
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: (process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, "") } });

const sentRecently = new Map();                        // simple limit: 5 emails per minute per visitor
function tooMany(ip) {
  const now = Date.now();
  const hits = (sentRecently.get(ip) || []).filter((t) => now - t < 60000);
  hits.push(now);
  sentRecently.set(ip, hits);
  return hits.length > 5;
}

const clean = (v, max = 200) => String(v ?? "").slice(0, max);

function checkOrder(o) {
  if (!o || typeof o !== "object" || !o.booking) return "Missing order.";
  if (!/^CN-\d{4}-\d{4}$/.test(clean(o.id))) return "Invalid order number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(o.email))) return "Please enter a valid email address.";
  const b = o.booking;
  if (!Array.isArray(b.seats) || b.seats.length < 1 || b.seats.length > 8) return "Invalid seats.";
  if (!Array.isArray(b.lines)) return "Invalid price lines.";
  return "";
}

// Copy only the fields we expect, trimmed to a safe length
function tidy(o) {
  const b = o.booking;
  return {
    id: clean(o.id), email: clean(o.email), name: clean(o.name, 80), method: clean(o.method, 60), paidAt: clean(o.paidAt, 40),
    booking: {
      movie: clean(b.movie), rating: clean(b.rating, 20), duration: clean(b.duration, 20), format: clean(b.format),
      cinema: clean(b.cinema), hall: clean(b.hall), when: clean(b.when), gate: clean(b.gate), total: clean(b.total, 20),
      seats: b.seats.map((s) => ({ id: clean(s.id, 6), zone: clean(s.zone, 40), price: clean(s.price, 10) })),
      lines: b.lines.slice(0, 10).map((l) => [clean(l[0]), clean(l[1], 20)]),
    },
  };
}

app.post("/api/send-ticket", async (req, res) => {
  const problem = checkOrder(req.body && req.body.order);
  if (problem) return res.status(400).json({ ok: false, message: problem });
  if (tooMany(req.ip)) return res.status(429).json({ ok: false, message: "Too many emails. Please wait a minute." });
  if (!DRY_RUN && (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD))
    return res.status(503).json({ ok: false, message: "Email isn't set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD to the .env file." });

  const order = tidy(req.body.order);
  try {
    const mail = buildTicketEmail(order);
    const qr = await QRCode.toBuffer(order.id, { width: 320, margin: 1 });
    await transporter.sendMail({
      from: `"CineNova Tickets" <${process.env.GMAIL_USER || "tickets@cinenova.local"}>`,
      to: order.email, subject: mail.subject, text: mail.text, html: mail.html,
      attachments: [{ filename: "ticket-qr.png", content: qr, cid: "ticketqr" }],
    });
    if (DRY_RUN) fs.writeFileSync(path.join(__dirname, "last-email.html"), mail.html.replace("cid:ticketqr", "data:image/png;base64," + qr.toString("base64")));
    res.json({ ok: true, dryRun: DRY_RUN });
  } catch (err) {
    console.error("Email failed:", err.message);
    const login = err.code === "EAUTH";
    res.status(500).json({ ok: false, message: login ? "Gmail rejected the login. Check GMAIL_USER and the app password in .env." : "The email could not be sent. Please try again." });
  }
});

// QR code picture for the ticket on the website
app.get("/api/qr/:code", async (req, res) => {
  const code = req.params.code.replace(/\.png$/, "");
  if (!/^CN-\d{4}-\d{4}$/.test(code)) return res.sendStatus(400);
  res.type("png").send(await QRCode.toBuffer(code, { width: 320, margin: 1 }));
});

// ---------- The website itself (server files and secrets are never served) ----------
app.use((req, res, next) => {
  if (/^\/(server\.js|email\.js|package(-lock)?\.json|readme\.md|node_modules|last-email\.html)/i.test(req.path)) return res.sendStatus(404);
  next();
});
app.use(express.static(__dirname, { dotfiles: "deny", index: "index.html", extensions: ["html"] }));

app.listen(PORT, () => console.log(`CineNova running at http://localhost:${PORT}${DRY_RUN ? "  (demo mode: emails are saved to last-email.html, not sent)" : ""}`));
