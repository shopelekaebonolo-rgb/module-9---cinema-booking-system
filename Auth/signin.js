import { signIn } from "./auth.js"
import { getDataById } from "../db/db.js"

const form = document.getElementById("login-form")
const emailEl = document.getElementById("email"), passEl = document.getElementById("password")

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  const email = emailEl.value.trim(), password = passEl.value
  if (!email) { alert("Please enter your email address."); emailEl.focus(); return }
  if (!password.trim()) { alert("Please enter your password."); passEl.focus(); return }

  try {
    const user = await signIn(email, password)
    // Admins land on the admin page; their role is stored on their user document
    const profile = await getDataById("users", user.uid)
    location.href = profile?.role === "admin" ? "admin.html" : "dashboard.html"
  } catch (error) {
    console.error("Sign-in failed:", error.code, error.message)
    alert("Invalid email or password. Please try again.")
  }
})
