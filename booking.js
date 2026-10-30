import { saveData } from "../db/db.js"
import { auth } from "../config.js"
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js"

let currentUser = null
onAuthStateChanged(auth, (user) => {
  currentUser = user
  if (user) {
    if (!nameEl.value) nameEl.value = user.displayName ?? ""
    if (!emailEl.value) emailEl.value = user.email ?? ""
  }
})

const BOOKINGS = "Bookings"   // Firestore collection name

const form = document.getElementById("booking-form")
const nameEl = document.getElementById("b-name")
const emailEl = document.getElementById("b-email")
const phoneEl = document.getElementById("b-phone")
const errorEl = document.getElementById("book-error")
const btn = document.getElementById("book-btn")

// The booking saved by the seat page (booking.html's inline script falls back to a sample)
function currentBooking() {
  try {
    return JSON.parse(localStorage.getItem("cinenovaBooking") || "null") || window.booking
  } catch {
    return window.booking
  }
}

function problem() {
  if (!nameEl.value.trim()) return "Please enter your full name."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) return "Enter a valid email for your digital pass."
  const phone = phoneEl.value.replace(/[\s()+-]/g, "")
  if (phone && !/^\d{9,15}$/.test(phone)) return "That phone number doesn't look right."
  return ""
}

function newReference() {
  return "CN-" + (Math.floor(Math.random() * 9000) + 1000) + "-" + (Math.floor(Math.random() * 9000) + 1000)
}

// Builds the record and saves it to Firestore. Returns the finished order.
async function saveBooking(booking) {
  if (!booking) throw new Error("No booking found")

  // Shape used by confirmation.html (localStorage) — no undefined values
 const order = {
  id: newReference(),
  uid: currentUser ? currentUser.uid : null,   // links booking to the Auth user
  name: nameEl.value.trim(),
    email: emailEl.value.trim(),
    phone: phoneEl.value.trim(),
    method: "Pay at cinema",
    status: "confirmed",
    paidAt: new Date().toISOString(),
    booking: {
      movie: booking.movie ?? "",
      rating: booking.rating ?? "",
      duration: booking.duration ?? "",
      format: booking.format ?? "Standard",
      cinema: booking.cinema ?? "",
      gate: booking.gate ?? "",
      hall: booking.hall ?? "",
      when: booking.when ?? "",
      seats: (booking.seats ?? []).map(s => ({
        id: s.id ?? "",
        price: s.price ?? "",
        zone: s.zone ?? ""
      })),
      lines: booking.lines ?? [],      // [[label, amount], ...]
      total: booking.total ?? ""
    }
  }

  // Firestore can't store arrays inside arrays, so lines become objects there
  const record = {
    ...order,
    booking: {
      ...order.booking,
      lines: order.booking.lines.map(([label, amount]) => ({ label, amount }))
    }
  }

  order.firestoreId = await saveData(BOOKINGS, record)   // addDoc returns the new doc id
  return order
}

form.addEventListener("submit", async (e) => {
  e.preventDefault()

  const msg = problem()
  errorEl.textContent = msg
  if (msg) return

  btn.disabled = true
  btn.textContent = "Saving..."

  try {
    const order = await saveBooking(currentBooking())

    localStorage.setItem("cinenovaOrder", JSON.stringify(order))
    localStorage.removeItem("cinenovaBooking")
    location.href = "confirmation.html"
  } catch (err) {
    console.error("Could not save booking:", err)
    errorEl.textContent = "We couldn't save your booking. Please try again."
    btn.disabled = false
    btn.textContent = "Confirm Booking"
  }
})