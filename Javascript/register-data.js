// Registration page: cinemas, plans and formats come from Firestore
import { getAllData, esc, money } from "./common.js"

const [cinemas, plans, halls] = await Promise.all([getAllData("Cinemas"), getAllData("Plans"), getAllData("Halls")])

document.getElementById("theater").innerHTML = cinemas.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}${c.tagline ? " — " + esc(c.tagline) : ""}</option>`).join("")

const formats = [...new Set(halls.flatMap((h) => h.tags || []))]
document.getElementById("formats").innerHTML = formats
  .map((f) => `<label><input type="checkbox" name="formats" value="${esc(f)}" /> ${esc(f)}</label>`).join("")

// Plans: { name, eyebrow, price (0 = free), badge, perks: [] } shown as switchable tabs
const box = document.getElementById("plans")
plans.sort((a, b) => (a.price || 0) - (b.price || 0))
function draw(i) {
  const p = plans[i]
  box.innerHTML = `
    <div class="toggle">${plans.map((x, j) => `<button type="button" class="${j === i ? "active" : ""}" data-i="${j}">${esc(x.name)}</button>`).join("")}</div>
    <p class="eyebrow">${esc(p.eyebrow || "")}</p>
    <div class="price-row"><p class="price">${p.price ? `${money(p.price)} <small>/ month</small>` : "Complimentary"}</p><span class="badge">${esc(p.badge || "")}</span></div>
    <ul>${(p.perks || []).map((t) => `<li><i class="fa-regular fa-circle-check"></i> ${esc(t)}</li>`).join("")}</ul>`
}
if (plans.length) {
  draw(0)
  box.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) draw(+b.dataset.i) })
} else box.classList.add("hidden")
