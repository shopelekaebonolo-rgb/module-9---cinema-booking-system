import { signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"
import { auth } from "../config.js"
import { renderChrome, getAllData, getDataById, mergeData, where1, esc, money, dateKey, fullName, tierFor, getCinemas, parseMoney } from "./common.js"

const $ = (id) => document.getElementById(id)
const { profile, bookings } = await renderChrome({ nav: "profile" })
if (!profile) location.replace("login.html")

// Everything below is kept in the signed-in user's own document (users/<uid>)
let me = profile
const save = async (data) => { await mergeData("users", me.uid, data); me = { ...me, ...data } }

let toastTimer
function toast(message) {
  const t = $("toast"); t.textContent = message; t.classList.add("show")
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600)
}

// A member number is made once, the first time you open your profile
if (!me.memberId) await save({ memberId: "CN-" + (Math.floor(Math.random() * 9000) + 1000) + "-" + (Math.floor(Math.random() * 9000) + 1000) })

const [cinemas, foodOrders] = await Promise.all([getCinemas(), where1("FoodOrders", "uid", me.uid)])
const points = me.points || 0
const { current, next, floor } = await tierFor(points)
const today = dateKey()
const upcoming = bookings.filter((o) => (o.booking.dateKey || "") >= today).sort((a, b) => (a.booking.dateKey + a.booking.showTime).localeCompare(b.booking.dateKey + b.booking.showTime))
const watched = bookings.filter((o) => (o.booking.dateKey || "") < today)

// ---------- Header ----------
function drawHeader() {
  const name = fullName(me)
  const created = me.authUser?.metadata?.creationTime
  $("pf-name").textContent = name
  $("pf-tier").textContent = current ? current.name + " Tier" : ""
  $("pass-tier").textContent = current ? current.name : ""
  $("pf-handle").textContent = me.handle || "@" + name.toLowerCase().replace(/\s+/g, "")
  $("pf-since").textContent = created ? new Date(created).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"
  $("pf-cinema").textContent = cinemas.find((c) => c.id === me.homeCinema)?.name || cinemas[0]?.name || ""
  $("perk-name").textContent = name.split(" ")[0]
  $("pass-id").textContent = me.memberId
  $("pass-name").textContent = name.toUpperCase()
}
drawHeader()

$("pf-stats").innerHTML = [
  ["CineNova Points", points.toLocaleString(), "PTS", next ? `${(next.minPoints - points).toLocaleString()} pts to ${next.name}` : "Top tier reached"],
  ["Films Watched", watched.length, "Screenings", `${upcoming.length} coming up`],
  ["In-Seat Orders", foodOrders.length, "Orders", `${money(foodOrders.reduce((n, o) => n + (o.total || 0), 0))} spent`],
  ["Total Booked", money(bookings.reduce((n, o) => n + (o.booking.totalAmount ?? parseMoney(o.booking.total)), 0)), "", `${bookings.length} bookings`],
].map(([l, v, u, sub]) => `<div><p>${esc(l)}</p><strong>${esc(v)} ${u ? `<small>${esc(u)}</small>` : ""}</strong><p>${esc(sub)}</p></div>`).join("")

if (current) {
  const pct = next ? Math.min(100, ((points - floor) / (next.minPoints - floor)) * 100) : 100
  $("pf-progress").innerHTML = `
    <p class="pf-row"><strong>${esc(current.name)} Tier <span class="tag gold">${Math.round(pct)}%</span></strong><strong>${points.toLocaleString()}${next ? " / " + next.minPoints.toLocaleString() : ""} pts</strong></p>
    <div class="pf-bar"><span style="width:${pct}%"></span></div>
    ${next ? `<p class="pf-row"><span>Earn ${(next.minPoints - points).toLocaleString()} more pts</span><span>to reach ${esc(next.name)}</span></p>` : ""}`
}

// ---------- Pass QR (made by the server; icon if it isn't running) ----------
const qr = $("pf-qr-img")
qr.onerror = () => { qr.classList.add("hidden"); $("pf-qr-icon").classList.remove("hidden") }
qr.src = (window.CINENOVA_API ?? "") + "/api/qr/" + me.memberId + ".png"

// ---------- Tickets ----------
const seatIds = (o) => o.booking.seats.map((s) => s.id.replace("-", "")).join(" & ")
const n = upcoming[0] || bookings[0]
$("pf-next").innerHTML = n ? `
  <div class="pf-next">
    <div class="grow">
      <span class="tag f-red">${upcoming[0] ? "Next Screening" : "Latest Booking"}</span>
      <h3>${esc(n.booking.movie)}</h3>
      <p>${esc(n.booking.when)}</p>
      <p class="gold">${esc(String(n.booking.hall).split("•")[0].trim())} • Seats ${esc(seatIds(n))}</p>
    </div>
    <div class="pf-next-btns">
      <button type="button" class="btn-red" id="open-ticket"><i class="fa-solid fa-ticket"></i> View Ticket</button>
      <button type="button" class="btn" data-href="bar-kitchen.html"><i class="fa-solid fa-utensils gold"></i> Pre-Order Bar &amp; Kitchen</button>
    </div>
  </div>` : "<p>No bookings yet. <a href=\"catalog.html\">Find a film</a>.</p>"
$("open-ticket")?.addEventListener("click", () => { localStorage.setItem("cinenovaOrder", JSON.stringify(n)); location.href = "confirmation.html" })

$("pf-watched").innerHTML = watched.slice(0, 4).map((o) => `
  <div class="pf-watch"><span class="pf-ico"><i class="fa-solid fa-clapperboard"></i></span>
    <div class="grow"><strong>${esc(o.booking.movie)}</strong><p>${esc(o.booking.when)}</p></div></div>`).join("") || "<p>Nothing watched yet.</p>"

// ---------- Perks (collection: Perks, applied ones saved on your user) ----------
const perks = (await getAllData("Perks")).filter((p) => !p.minPoints || points >= p.minPoints)
function drawPerks() {
  const used = me.appliedPerks || []
  $("pf-perks").innerHTML = perks.map((p) => `
    <div class="pf-perk"><span class="pf-ico"><i class="fa-solid ${esc(p.icon || "fa-gift")} gold"></i></span>
      <div class="grow"><strong>${esc(p.title)}</strong><p>${esc(p.detail || "")}</p>${p.expires ? `<p>${esc(p.expires)}</p>` : ""}</div>
      <button type="button" class="btn pf-apply${used.includes(p.id) ? " applied" : ""}" data-perk="${esc(p.id)}">${used.includes(p.id) ? "Applied ✓" : "Apply"}</button></div>`).join("") || "<p>No perks available yet.</p>"
  const left = perks.filter((p) => !used.includes(p.id)).length
  $("perk-count").textContent = left + (left === 1 ? " Voucher" : " Vouchers")
}
drawPerks()
$("pf-perks").addEventListener("click", async (e) => {
  const b = e.target.closest(".pf-apply"); if (!b) return
  const used = me.appliedPerks || []
  if (used.includes(b.dataset.perk)) return
  await save({ appliedPerks: [...used, b.dataset.perk] }); drawPerks(); toast("Voucher applied to your next booking.")
})

// ---------- Switches (list comes from Settings/profile) ----------
const switches = (await getDataById("Settings", "profile"))?.switches || []
function drawSwitches() {
  const on = me.switches || {}
  $("pf-switches").innerHTML = switches.map((s) => `
    <div class="pf-switchrow"><div><strong>${esc(s.title)}</strong><p>${esc(s.detail || "")}</p></div>
    <button type="button" class="pf-switch${(on[s.key] ?? s.default ?? true) ? " on" : ""}" data-key="${esc(s.key)}" aria-label="${esc(s.title)}"><i></i></button></div>`).join("")
}
drawSwitches()
$("pf-switches").addEventListener("click", async (e) => {
  const s = e.target.closest(".pf-switch"); if (!s) return
  const isOn = s.classList.toggle("on")
  await save({ switches: { ...(me.switches || {}), [s.dataset.key]: isOn } })
})

// ---------- Edit profile ----------
const modal = $("edit-modal"), closeModal = () => modal.classList.remove("open")
$("e-cinema").innerHTML = cinemas.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")
$("edit-btn").addEventListener("click", () => {
  $("e-fname").value = me.fname || ""; $("e-lname").value = me.lname || ""
  $("e-handle").value = $("pf-handle").textContent; $("e-cinema").value = me.homeCinema || cinemas[0]?.id
  modal.classList.add("open")
})
$("edit-close").addEventListener("click", closeModal)
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal() })
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal() })
$("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  const fname = $("e-fname").value.trim(), lname = $("e-lname").value.trim()
  if (!fname) { toast("Please enter a first name."); return }
  const h = $("e-handle").value.trim()
  await save({ fname, lname, handle: h ? (h.startsWith("@") ? h : "@" + h) : "@" + (fname + lname).toLowerCase(), homeCinema: $("e-cinema").value })
  localStorage.setItem("cinenovaCinema", me.homeCinema)
  drawHeader(); closeModal(); toast("Profile updated.")
})

$("share-btn").addEventListener("click", () => {
  const text = `CineNova • ${fullName(me)} • ${me.memberId}`
  ;(navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
    () => toast("Card details copied to your clipboard."), () => toast("Copy isn't available in this browser."))
})
$("sign-out").addEventListener("click", async (e) => { e.preventDefault(); await signOut(auth); location.href = "login.html" })
