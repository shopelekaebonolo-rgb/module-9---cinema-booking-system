import { getAllData, selectedCinema, authReady, getDataById, esc, money, parseMoney, dateKey, dateLabel } from "./common.js"
import { updateData } from "../db/db.js"

const $ = (id) => document.getElementById(id)

// Only users whose document says role: "admin" may see this page (set it in the Firebase console)
const user = await authReady
const me = user ? await getDataById("users", user.uid) : null
if (!me || me.role !== "admin") {
  alert("Admins only.")
  location.replace(user ? "dashboard.html" : "login.html")
  throw new Error("Not an admin")
}

const [movies, halls, bookings, foods, cinema] = await Promise.all([
  getAllData("MovieTickets"), getAllData("Halls"), getAllData("Bookings"), getAllData("FoodOrders"), selectedCinema(),
])
const live = bookings.filter((o) => o.status !== "cancelled")
const hallOf = (m) => halls.find((h) => h.id === m.hallId) || halls[0] || { rows: [] }
const seatCount = (h) => h.rows.reduce((n, r) => n + r.groups.reduce((a, b) => a + b, 0) - (r.companion || []).length, 0)
const showing = movies.filter((m) => m.status === "now showing")

// capacity = seats in the hall x showtimes; booked = seats sold for that movie
const stats = showing.map((m) => {
  const h = hallOf(m), shows = (m.showing || []).length || 1
  const cap = seatCount(h) * shows
  const sold = live.filter((o) => o.booking.movieId === m.id).reduce((n, o) => n + o.booking.seats.length, 0)
  return { m, h, cap, sold, pct: cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0 }
})
const tone = (pct) => (pct >= 100 ? "red" : pct >= 60 ? "gold" : "grey")

// ---------- Header + KPIs ----------
const todayKey = dateKey()
$("cinema-name").textContent = cinema?.name || ""
$("today").textContent = "Today: " + dateLabel(new Date(), true)
$("year").textContent = new Date().getFullYear()
$("hall-count").textContent = `${halls.length} Auditorium${halls.length === 1 ? "" : "s"}`
const totalCap = stats.reduce((n, s) => n + s.cap, 0), totalSold = stats.reduce((n, s) => n + s.sold, 0)
$("occ-total").textContent = (totalCap ? ((totalSold / totalCap) * 100).toFixed(1) : "0.0") + "% Occupancy"

const gross = (list) => list.reduce((n, o) => n + (o.booking.totalAmount ?? parseMoney(o.booking.total)), 0)
const todays = live.filter((o) => String(o.paidAt).startsWith(todayKey))
const foodTotal = foods.reduce((n, o) => n + (o.total || 0), 0)
const vipSold = live.flatMap((o) => o.booking.seats).filter((s) => /vip/i.test(s.zone)).length
$("kpis").innerHTML = [
  ["Today's Bookings", money(gross(todays)), "fa-money-bill-wave", `${todays.length} orders today • ${money(gross(live))} all time`],
  ["Total Tickets Sold", `${totalSold} <small>/ ${totalCap}</small>`, "fa-ticket", `${live.length} bookings`],
  ["Concessions Revenue", money(foodTotal), "fa-bag-shopping", `${foods.length} in-seat orders`],
  ["VIP Seats Sold", vipSold, "fa-martini-glass", "Across all showings"],
].map(([label, value, icon, foot]) => `
  <div class="kpi"><div class="kpi-top"><p>${esc(label)}</p><span class="kpi-icon"><i class="fa-solid ${icon}"></i></span></div>
  <strong>${value}</strong><p class="split"><span>${esc(foot)}</span></p></div>`).join("")

// ---------- Occupancy cards ----------
$("fleet").innerHTML = stats.map(({ m, h, cap, sold, pct }) => `
  <article class="hcard top-${tone(pct)}">
    <div class="hrow"><h3>${esc(h.name || "")} <span class="tag">${esc((h.tags || [])[0] || m.format || "")}</span></h3>
      <span class="state ${tone(pct)}"><i class="fa-solid fa-circle dot"></i> ${pct >= 100 ? "Sold Out" : "On Sale"}</span></div>
    <h4>${esc(m.title)}</h4>
    <p class="run"><b class="gold">${esc((m.showing || []).join(" • "))}</b></p>
    <p class="occ"><span>Occupancy: ${sold} / ${cap} Seats</span><b class="${tone(pct)}">${pct}%</b></p>
    <div class="meter ${tone(pct)}"><span style="width:${pct}%"></span></div>
  </article>`).join("") || "<p>No films on the schedule.</p>"

// ---------- Queue table ----------
$("queue").innerHTML = stats.map(({ m, h, cap, sold, pct }) => {
  const from = Math.min(...h.rows.map((r) => r.price))
  return `<tr><td><strong>${esc(m.title)}</strong><small>${esc(m.director || "")}</small></td>
    <td><span class="tag">${esc(h.name || "")}${m.format ? " • " + esc(m.format) : ""}</span></td>
    <td class="gold"><b>${esc((m.showing || []).join(", "))}</b></td>
    <td>${sold}/${cap} <b class="${tone(pct)}">${pct}%</b><div class="meter ${tone(pct)}"><span style="width:${pct}%"></span></div></td>
    <td><b class="price">${isFinite(from) ? money(from) : ""}</b></td></tr>`
}).join("")
$("filter").addEventListener("input", function () {
  const text = this.value.toLowerCase()
  document.querySelectorAll("#queue tr").forEach((row) => { row.style.display = row.textContent.toLowerCase().includes(text) ? "" : "none" })
})

// ---------- In-seat orders: Dispatch saves the new status ----------
function drawOrders() {
  const recent = [...foods].sort((a, b) => String(b.placedAt).localeCompare(String(a.placedAt))).slice(0, 5)
  $("pending").textContent = foods.filter((o) => o.status !== "dispatched").length + " Pending"
  $("orders").innerHTML = recent.map((o) => `
    <div class="order-card">
      <div class="order-top"><span class="tag">${esc(String(o.hall || "").split("•")[0].trim())} • Seats ${esc(o.seats)}</span>
        <span class="state ${o.status === "dispatched" ? "purple" : "gold"}"><i class="fa-solid fa-circle dot"></i> ${esc(o.status)}</span></div>
      <p class="mono">Placed ${new Date(o.placedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
      ${o.items.map((i) => `<p class="line"><span>${i.qty}x ${esc(i.name)}</span><b class="gold">${money(i.price * i.qty)}</b></p>`).join("")}
      <p class="line"><span>Total: <b class="white">${money(o.total)}</b></span>
        ${o.status === "dispatched" ? "" : `<button class="gold-btn" data-dispatch="${esc(o.id)}">Dispatch to Seat</button>`}</p>
    </div>`).join("") || "<p>No in-seat orders yet.</p>"
}
drawOrders()
$("orders").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-dispatch]"); if (!b) return
  b.disabled = true
  await updateData("FoodOrders", b.dataset.dispatch, { status: "dispatched" })
  foods.find((o) => o.id === b.dataset.dispatch).status = "dispatched"; drawOrders()
})
