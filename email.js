// Builds the ticket email (HTML + plain text) from an order. No sending happens here.

// Order data comes from the browser, so every value is escaped before it goes into the HTML
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? String(v) : "$" + n.toFixed(2);
};

// "F8" -> "Row F, Seat 8"   "I-3" -> "Row I, Seat 3"
const seatLabel = (id) => {
  const m = /^([A-J])-?(\d+)$/.exec(String(id));
  return m ? `Row ${m[1]}, Seat ${m[2]}` : String(id);
};

function buildTicketEmail(order) {
  const b = order.booking;
  const paid = new Date(order.paidAt || Date.now()).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
  const name = order.name || "CineNova Patron";

  const facts = [
    ["Cinema", b.cinema], ["Hall", b.hall], ["Date & time", b.when], ["Entry", b.gate],
    ["Rating", b.rating], ["Duration", b.duration], ["Booked by", name], ["Payment", order.method], ["Paid on", paid],
  ];

  const factRows = facts.map(([k, v]) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #2b2c3a;color:#f0a898;font-size:11px;text-transform:uppercase;letter-spacing:1px">${esc(k)}</td>
        <td style="padding:9px 0;border-bottom:1px solid #2b2c3a;color:#ffffff;font-size:14px;font-weight:bold;text-align:right">${esc(v)}</td>
      </tr>`).join("");

  const seatRows = b.seats.map((s) => `
      <tr>
        <td style="padding:10px 12px;color:#1a1a1a;background:#ffd43b;font-weight:bold;font-size:14px;border-radius:6px;width:56px;text-align:center">${esc(String(s.id).replace("-", ""))}</td>
        <td style="padding:10px 12px;color:#ffffff;font-size:14px">${esc(seatLabel(s.id))}<br><span style="color:#f0a898;font-size:12px">${esc(s.zone || "")}</span></td>
        <td style="padding:10px 12px;color:#ffd43b;font-size:14px;font-weight:bold;text-align:right">${s.price ? money(s.price) : ""}</td>
      </tr>
      <tr><td colspan="3" style="height:6px;line-height:6px">&nbsp;</td></tr>`).join("");

  const lineRows = b.lines.map(([label, value]) => `
      <tr>
        <td style="padding:6px 0;color:#ffffff;font-size:13px">${esc(label)}</td>
        <td style="padding:6px 0;color:#ffffff;font-size:13px;text-align:right">${esc(value)}</td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your CineNova ticket</title></head>
<body style="margin:0;padding:0;background:#05050a;font-family:'Segoe UI',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05050a"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#14141f;border-radius:16px;overflow:hidden">

    <tr><td style="padding:26px 28px;background:#2a0a12">
      <div style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px">CINE<span style="color:#e50914">NOVA</span></div>
      <div style="margin-top:14px;font-size:26px;font-weight:bold;color:#ffffff">Booking Confirmed &#10003;</div>
      <div style="margin-top:6px;font-size:14px;color:#f0a898">Hi ${esc(name)}, your tickets are ready. Show the QR code below at the gate.</div>
    </td></tr>

    <tr><td style="padding:24px 28px 8px">
      <div style="font-size:11px;color:#ffd43b;text-transform:uppercase;letter-spacing:1px;font-weight:bold">Now showing &bull; ${esc(b.format)}</div>
      <div style="margin-top:6px;font-size:28px;font-weight:bold;color:#ffffff">${esc(b.movie)}</div>
      <div style="margin-top:6px;font-size:13px;color:#f0a898">Order <b style="color:#ffffff">#${esc(order.id)}</b></div>
    </td></tr>

    <tr><td style="padding:8px 28px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${factRows}</table>
    </td></tr>

    <tr><td style="padding:16px 28px 0">
      <div style="font-size:11px;color:#ffd43b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:10px">Your seats</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b14;border-radius:10px"><tr><td style="padding:10px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${seatRows}</table>
      </td></tr></table>
    </td></tr>

    <tr><td style="padding:18px 28px 0">
      <div style="font-size:11px;color:#ffd43b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:8px">Payment summary</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lineRows}
        <tr>
          <td style="padding:12px 0 0;border-top:1px solid #2b2c3a;color:#ffffff;font-size:16px;font-weight:bold">Total paid</td>
          <td style="padding:12px 0 0;border-top:1px solid #2b2c3a;color:#ffd43b;font-size:24px;font-weight:bold;text-align:right">${esc(b.total)}</td>
        </tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:26px 28px 8px">
      <div style="display:inline-block;background:#ffffff;padding:12px;border-radius:12px"><img src="cid:ticketqr" width="160" height="160" alt="Ticket QR code" style="display:block"></div>
      <div style="margin-top:10px;font-size:14px;font-weight:bold;color:#ffffff;font-family:monospace">#${esc(order.id)}</div>
      <div style="font-size:12px;color:#f0a898">Scan at the Fast Gate turnstile</div>
    </td></tr>

    <tr><td style="padding:18px 28px 28px">
      <div style="padding:14px 16px;background:#0b0b14;border-radius:10px;font-size:12px;line-height:1.7;color:#f0a898">
        &bull; Please arrive 20 minutes before showtime.<br>
        &bull; 100% refundable up to 2 hours before the film starts.<br>
        &bull; Keep this email. You can show it on your phone or print it.
      </div>
    </td></tr>

    <tr><td style="padding:16px 28px;background:#0b0b14;text-align:center;font-size:11px;color:#8a8a9a">
      &copy; ${new Date().getFullYear()} CineNova Midnight Cinemas, Inc. This is a demo booking.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    "CINENOVA - BOOKING CONFIRMED", "",
    `${b.movie} (${b.format})`, `Order #${order.id}`, "",
    ...facts.map(([k, v]) => `${k}: ${v}`), "",
    "Seats:", ...b.seats.map((s) => `  ${seatLabel(s.id)} - ${s.zone || ""} ${s.price ? money(s.price) : ""}`), "",
    ...b.lines.map(([l, v]) => `${l}: ${v}`), `Total paid: ${b.total}`, "",
    "Show your QR code at the Fast Gate turnstile. Arrive 20 minutes early.",
  ].join("\n");

  return { subject: `Your CineNova ticket: ${b.movie} - ${b.when} (${order.id})`, html, text };
}

module.exports = { buildTicketEmail, esc };
