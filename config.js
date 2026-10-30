
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';

import { getAuth } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';

import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

    const firebaseConfig = {
  apiKey: "AIzaSyBfulPaYjILEeIxwi7rBb11nZ33Hxjt3WA",
  authDomain: "cinenova-de572.firebaseapp.com",
  projectId: "cinenova-de572",
  storageBucket: "cinenova-de572.firebasestorage.app",
  messagingSenderId: "168496600840",
  appId: "1:168496600840:web:84d3a841fb1e0f1465febd",
  measurementId: "G-J8S7MVXPWY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);