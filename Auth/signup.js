import { signUp } from "./auth.js"

const $ = (id) => document.getElementById(id)

$("register-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  const password = $("password").value
  if (password.length < 6) { alert("Your passcode needs at least 6 characters."); return }

  try {
    await signUp($("email").value.trim(), password, {
      fname: $("fname").value.trim(),
      lname: $("lname").value.trim(),
      phone: $("phone").value.trim(),
      homeCinema: $("theater").value,
      formats: [...document.querySelectorAll('input[name="formats"]:checked')].map((c) => c.value),
    })
    alert("Welcome to CineNova! Please sign in to continue.")
    location.href = "login.html"
  } catch (error) {
    console.error("Sign-up failed:", error.code)
    alert(error.code === "auth/email-already-in-use" ? "That email already has an account. Try signing in." : "We couldn't create your account. Please try again.")
  }
})
