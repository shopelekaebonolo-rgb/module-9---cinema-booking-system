import { renderChrome, getAllData, saveData, esc, imgUrl, money, bookingSettings } from "./common.js"

const $ = (id) => document.getElementById(id)
const { profile, bookings } = await renderChrome({ nav: "food" })

// Menu items come from Firestore (MenuItems). look: big | plate | wide | drink
const dishes = (await getAllData("MenuItems")).filter((d) => d.sec)
const byId = Object.fromEntries(dishes.map((d) => [d.id, d]))
const settings = await bookingSettings()
const TAX = settings.foodTaxRate ?? 0.09, POINTS_GOAL = settings.pointsGoal ?? 140

// ---------- Where the food goes: your latest booking ----------
const last = bookings[0] || JSON.parse(localStorage.getItem("cinenovaOrder") || "null")
let seatsText = last ? last.booking.seats.map((s) => s.id.replace("-", "")).join(", ") : ""
function drawTarget() {
  const hall = last ? String(last.booking.hall).split("•")[0].trim() : ""
  $("dest").textContent = last ? `${hall} • ${seatsText}` : "No booking yet"
  $("tray-movie").textContent = last ? last.booking.movie : "Choose your seats to order"
  $("tray-where").textContent = last ? `${hall} • Seats ${seatsText}` : "No seats yet"
  $("tray-time").textContent = last ? last.booking.when.split("•").pop().trim() : ""
}
drawTarget()

// ---------- Dish cards ----------
let firstBig = true
function cardHtml(d) {
  const pic = `<div class="k-pic ${esc(d.sec)}"><img src="${esc(imgUrl(d.img))}" alt="${esc(d.name)}" />`
  const attrs = ` data-tags="${esc((d.tags || []).join(" "))}" data-sec="${esc(d.sec)}"`
  const head = `<h4>${esc(d.name)} <b class="gold">${money(d.price)}</b></h4><p>${esc(d.desc || "")}</p>`
  const chips = `<div class="k-mini">${(d.chips || []).map((c) => `<span>${esc(c)}</span>`).join("")}</div>`

  if (d.look === "big") {
    const colour = firstBig ? "red" : "grey"; firstBig = false
    return `<article class="k-card big"${attrs}>${pic}<span class="k-badge red-bg">${esc(d.badge || "")}</span><span class="k-badge2">${esc(d.badge2 || "")}</span></div>` +
      `<div class="k-body">${head}${chips}<div class="k-foot"><span>+${d.pts} Club Points</span><button type="button" class="k-add ${colour}" data-add="${esc(d.id)}"><i class="fa-solid fa-plus"></i> Add to Seat</button></div></div></article>`
  }
  if (d.look === "wide") {
    return `<article class="k-card wide"${attrs}>${pic}</div><div class="k-body">${head}${chips}<div class="k-foot"><span>${esc(d.foot || "")}</span><button type="button" class="k-add grey" data-add="${esc(d.id)}"><i class="fa-solid fa-plus"></i> Add</button></div></div></article>`
  }
  const label = d.look === "plate" ? `<span class="k-label-pic">${esc(d.badge || "")}</span>` : `<span class="k-badge2">${esc(d.badge || "")}</span>`
  return `<article class="k-card small"${attrs}>${pic}${label}</div><div class="k-body">${head}<div class="k-foot"><span>${esc(d.foot || "")}</span><button type="button" class="k-cart" data-add="${esc(d.id)}" aria-label="Add ${esc(d.name)}"><i class="fa-solid fa-cart-plus"></i></button></div></div></article>`
}
dishes.forEach((d) => {
  const grid = $("grid-" + (d.sec === "zero" || d.sec === "cocktails" ? "drinks" : d.sec))
  if (grid) grid.insertAdjacentHTML("beforeend", cardHtml(d))
})

// ---------- Tabs and filters ----------
let tab = "all", picked = []
function applyFilters() {
  let shown = 0
  document.querySelectorAll(".k-card").forEach((c) => {
    const ok = (tab === "all" || c.dataset.sec === tab) && picked.every((t) => c.dataset.tags.split(" ").includes(t))
    c.classList.toggle("hidden", !ok)
    if (ok) shown++
  })
  document.querySelectorAll(".k-sec").forEach((s) => s.classList.toggle("hidden", !s.querySelector(".k-card:not(.hidden)")))
  $("none").classList.toggle("hidden", shown > 0)
}
$("tabs").addEventListener("click", (e) => {
  const b = e.target.closest(".k-tab"); if (!b) return
  $("tabs").querySelectorAll(".k-tab").forEach((t) => t.classList.remove("active"))
  b.classList.add("active"); tab = b.dataset.cat; applyFilters()
})
$("filters").addEventListener("click", (e) => {
  const b = e.target.closest(".k-filter"); if (!b) return
  b.classList.toggle("active")
  picked = [...document.querySelectorAll(".k-filter.active")].map((f) => f.dataset.tag); applyFilters()
})
$("window").addEventListener("click", (e) => {
  const b = e.target.closest(".k-chip"); if (!b) return
  $("window").querySelectorAll(".k-chip").forEach((c) => c.classList.remove("active")); b.classList.add("active")
})

// ---------- The tray ----------
let tray = {}
const add = new URLSearchParams(location.search).get("add")      // arriving from the dashboard's + button
if (add && byId[add]) tray[add] = 1

function drawTray() {
  const list = $("tray-list")
  let sub = 0, pts = 0, count = 0
  list.innerHTML = ""
  Object.keys(tray).forEach((id) => {
    const d = byId[id], qty = tray[id]
    sub += d.price * qty; pts += (d.pts || 0) * qty; count += qty
    const row = document.createElement("div"); row.className = "k-item"
    row.innerHTML = `<span class="k-ico"><i class="fa-solid ${d.sec === "zero" || d.sec === "cocktails" ? "fa-martini-glass" : "fa-utensils"} gold"></i></span><div class="grow"><strong></strong><p></p></div><div class="k-right"><b class="gold"></b><button type="button" class="k-remove">Remove</button></div>`
    row.querySelector("strong").textContent = d.name
    row.querySelector("p").textContent = `Qty: ${qty}${d.note ? " • " + d.note : ""}`
    row.querySelector("b").textContent = money(d.price * qty)
    row.querySelector(".k-remove").dataset.remove = id
    list.appendChild(row)
  })
  if (!count) list.innerHTML = '<p class="k-empty-tray">Your tray is empty. Add dishes to send them to your seat.</p>'
  const tax = Math.round(sub * TAX * 100) / 100
  $("tray-count").textContent = count + (count === 1 ? " item" : " items")
  $("s-sub").textContent = money(sub); $("s-tax").textContent = money(tax); $("s-total").textContent = money(sub + tax)
  $("pts-text").textContent = "+" + pts + " PTS"
  $("pts-bar").style.width = Math.min(100, (pts / POINTS_GOAL) * 100) + "%"
}
document.querySelector(".k-menu").addEventListener("click", (e) => {
  const b = e.target.closest("[data-add]"); if (!b) return
  tray[b.dataset.add] = (tray[b.dataset.add] || 0) + 1
  $("sent").classList.add("hidden")
  b.classList.add("pop"); setTimeout(() => b.classList.remove("pop"), 350)
  drawTray()
})
$("tray-list").addEventListener("click", (e) => { const b = e.target.closest("[data-remove]"); if (b) { delete tray[b.dataset.remove]; drawTray() } })

// ---------- Small switches ----------
$("quiet").addEventListener("click", function () { this.querySelector("b").textContent = this.classList.toggle("on") ? "ON" : "OFF" })
$("light").addEventListener("click", function () { this.querySelector("b").textContent = this.classList.toggle("on") ? "ENABLED" : "DISABLED" })
$("edit-seat").addEventListener("click", () => {
  const seats = prompt("Which seats should we deliver to? (for example: F12, F13)", seatsText)
  if (!seats || !seats.trim()) return
  seatsText = seats.trim().slice(0, 30)
  if (last) drawTarget(); else { $("dest").textContent = seatsText; $("tray-where").textContent = "Seats " + seatsText }
})

// ---------- Confirm: saved to Firestore (FoodOrders) so the admin page can see it ----------
$("confirm").addEventListener("click", async () => {
  const ids = Object.keys(tray), sent = $("sent")
  sent.classList.remove("hidden")
  if (!ids.length) { sent.className = "k-sent err"; sent.textContent = "Add at least one dish to your tray first."; return }
  if (!seatsText) { sent.className = "k-sent err"; sent.textContent = "Tell us your seats first (the pencil button)."; return }

  const sub = ids.reduce((n, id) => n + byId[id].price * tray[id], 0)
  const total = Math.round(sub * (1 + TAX) * 100) / 100
  try {
    await saveData("FoodOrders", {
      uid: profile ? profile.uid : null,
      bookingId: last ? last.id : null,
      seats: seatsText,
      hall: last ? last.booking.hall : "",
      items: ids.map((id) => ({ name: byId[id].name, qty: tray[id], price: byId[id].price })),
      total,
      quiet: $("quiet").classList.contains("on"),
      window: document.querySelector(".k-chip.active").textContent.trim(),
      status: "in kitchen",
      placedAt: new Date().toISOString(),
    })
    sent.className = "k-sent ok"
    sent.textContent = `Order sent! ${money(total)} will be delivered to seats ${seatsText} within 10-15 minutes.`
    tray = {}; drawTray()
  } catch (err) {
    console.error(err)
    sent.className = "k-sent err"; sent.textContent = "We couldn't send your order. Please try again."
  }
})

drawTray()
