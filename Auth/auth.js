// =====================================================================
// auth.js - everything to do with signing up, signing in and passwords
// =====================================================================

// Import the "auth" (login service) and "db" (database) objects that we
// created and exported in config.js. "../" means "go up one folder".
import { auth, db } from "../config.js";

// Import three ready-made functions from Firebase's Authentication library.
// They are loaded straight from Google's servers (the URL).
import {
  createUserWithEmailAndPassword, // creates a brand new login account
  signInWithEmailAndPassword,     // checks an email + password and logs the user in
  sendPasswordResetEmail,         // emails the user a "reset your password" link
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// Import two functions from Firebase's Firestore (database) library.
import {
  doc,    // builds a reference (an "address") to one document in the database
  setDoc, // writes data into the document at that address
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// A small helper that makes a random member number like "CN-4821-7364".
// Math.random() gives a number between 0 and 1.
// Multiply by 9000 and add 1000 -> a number from 1000 to 9999.
// Math.floor() rounds it down to a whole number.
// We do that twice and join the pieces with "CN-" and "-".
const memberId = () => "CN-" + (Math.floor(Math.random() * 9000) + 1000) + "-" + (Math.floor(Math.random() * 9000) + 1000);

// ---------------------------------------------------------------------
// SIGN UP
// profile is an object like { fname, lname, phone, homeCinema, formats }
// "export" lets other files (like signup.js) import and use this function.
// "async" means the function waits for slow things (the internet) using "await".
// ---------------------------------------------------------------------
export async function signUp(email, password, profile) {
  // Create the login account in Firebase Authentication.
  // The result contains a "user" object; { user } pulls it out directly.
  // "await" pauses here until Firebase answers. If it fails (e.g. email already used),
  // an error is thrown and the code below does not run.
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Note for developers: the role is never set here, so nobody can make themselves an admin.
  // You add role: "admin" to a user by hand in the Firebase console.

  // Save extra information about the user in the "users" collection.
  // doc(db, "users", user.uid) = the document named after the user's unique ID.
  // setDoc writes this object into it:
  //   uid      - the user's unique ID from Authentication
  //   email    - their email address (shorthand for email: email)
  //   points   - loyalty points, everyone starts at 0
  //   memberId - a random CineNova member number from the helper above
  //   ...profile - "spreads" the profile object in, adding fname, lname, phone, etc.
  await setDoc(doc(db, "users", user.uid), { uid: user.uid, email, points: 0, memberId: memberId(), ...profile });

  // Give the new user object back to whoever called signUp().
  return user;
}

// ---------------------------------------------------------------------
// SIGN IN
// ---------------------------------------------------------------------
export async function signIn(email, password) {
  // Ask Firebase to check the email and password.
  // If they are wrong, it throws an error (signin.js catches it and shows an alert).
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  // Return the logged-in user so the caller can look up their profile/role.
  return user;
}

// ---------------------------------------------------------------------
// RESET PASSWORD
// A one-line function: given an email, Firebase sends a reset link to it.
// It is written as an arrow function and exported in one go.
// It returns a promise, so callers can "await" it.
// ---------------------------------------------------------------------
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);