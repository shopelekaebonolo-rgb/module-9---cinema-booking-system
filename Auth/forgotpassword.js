import { resetPassword } from "./auth.js"

document.getElementById("recover-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  const email = document.getElementById("contact").value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert("Please enter the email you registered with."); return }
  try {
    await resetPassword(email)
  } catch (error) {
    console.error("Password reset failed:", error.code)
  }
  // Same message either way, so nobody can use this page to find out who has an account
  alert("If that email has an account, a reset link is on its way. Check your inbox and spam folder.")
  location.href = "login.html"
})
