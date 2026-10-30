// =====================================================================
// home.js - the script behind dashboard.html
// It loads "now showing" movies from Firestore, draws a card for each one,
// and sends the user to the seat page when they book.
// =====================================================================

// Import the helper that reads every document in a collection (from db.js).
import { getAllData } from "../db/db.js";

// Folder where poster images are stored. The poster file name from the
// database (e.g. "NEON SHADOW.png") is added to the end of this.
const IMG_PATH = "Images/";

// Turns minutes into text, e.g. 166 -> "2h 46m".
// "mins = 0" is a default: if no value is given, use 0.
function formatDuration(mins = 0) {
  const h = Math.floor(mins / 60);              // whole hours (166 / 60 = 2.77 -> 2)
  const m = String(mins % 60).padStart(2, "0"); // leftover minutes (% = remainder), padded to 2 digits e.g. "05"
  return `${h}h ${m}m`;                         // join them into one string
}

// Builds the HTML for ONE movie card from a movie object "m".
function movieCard(m) {
  // Genres are stored like "Sci-Fi, Action". Replace each comma with " • " for display.
  // (m.genre || "") means: if there's no genre, use an empty string so .replace() doesn't crash.
  const genre = (m.genre || "").replace(/,\s*/g, " • ");

  // Make one button for each showtime, e.g. 4:30 PM, 7:45 PM.
  // data-id and data-time store the movie's ID and the time on the button so
  // the click handler further down can read them.
  const times = (m.showing || [])
    .map(time => `
      <button
        type="button"
        class="time"
        data-id="${m.id}"
        data-time="${time}">
        ${time}
      </button>
    `)
    .join(""); // join the array of buttons into one long string of HTML

  // Return the whole card as an HTML template string. ${...} inserts values.
  return `
    <article class="movie">
      <div class="poster-img">
        <img
          class="poster-photo"
          src="${IMG_PATH}${m.posterUrl}"
          alt="${m.title}">

        <span class="tag">${m.ageRating || ""}</span>
        <span class="score">
          <i class="fa-solid fa-star gold"></i>
          ${m.rating ?? ""}
        </span>

        <div class="overlay">
          <button type="button" class="btn-red book-movie">
            Book Tickets
          </button>
          <button type="button" class="btn">
            <i class="fa-regular fa-circle-play"></i> Trailer
          </button>
        </div>
      </div>

      <div class="movie-info">
        <p>${genre} • ${formatDuration(m.durationMins)}</p>
        <h4>${m.title}</h4>
        <div class="times">${times}</div>
      </div>
    </article>
  `;
  // Note: "m.rating ?? ''" uses ?? so a rating of 0 would still show (|| would hide it).
}

// Holds the movies once loaded, so we don't have to fetch them again later.
let movies = [];

// ---------------------------------------------------------------------
// Load movies from Firestore and draw them on the page
// ---------------------------------------------------------------------
async function loadMovies() {
  try {
    // Fetch every document in the "MovieTickets" collection and remember them.
    movies = await getAllData("MovieTickets");

    // Find the <section class="movies"> in dashboard.html.
    const container = document.querySelector(".movies");

    // If the page doesn't have that section, stop quietly.
    if (!container) return;

    // Keep only movies whose status is "now showing" (toLowerCase ignores capital letters),
    // turn each into card HTML, join them, and REPLACE the placeholder cards.
    container.innerHTML = movies
      .filter(m => m.status?.toLowerCase() === "now showing") // ?. avoids a crash if status is missing
      .map(movieCard)
      .join("");
  } catch (error) {
    // If anything goes wrong (e.g. no internet), log it for the developer.
    console.error("Error loading movies:", error);
  }
}

// ---------------------------------------------------------------------
// Featured COSMIC HORIZON: ODYSSEY "Book Tickets" button (the big hero button)
// ---------------------------------------------------------------------
const featuredButton = document.getElementById("bookTickets");

// Only attach the click code if the button exists on this page.
if (featuredButton) {
  featuredButton.addEventListener("click", async () => {
    try {
      // Use the movies we already loaded; if the list is still empty, fetch them now.
      const allMovies = movies.length
        ? movies
        : await getAllData("MovieTickets");

      // Find the movie whose title matches (trimmed and upper-cased so spelling case doesn't matter).
      const movie = allMovies.find(
        m => m.title?.trim().toUpperCase() ===
          "COSMIC HORIZON: ODYSSEY"
      );

      // If it isn't in the database, tell the user and stop.
      if (!movie) {
        alert("COSMIC HORIZON: ODYSSEY was not found.");
        return;
      }

      // Use the first showtime of the movie (or empty text if it has none).
      const time = movie.showing?.[0] || "";

      // Go to the seat page, passing the movie ID and time in the URL.
      // encodeURIComponent makes the text safe to put in a URL (spaces, colons, etc.).
      window.location.href =
        `seats.html?movie=${encodeURIComponent(movie.id)}&time=${encodeURIComponent(time)}`;
    } catch (error) {
      console.error("Unable to open seat selection:", error);
      alert("Unable to load the movie. Please try again.");
    }
  });
}

// ---------------------------------------------------------------------
// Clicks inside the movie list: choosing a showtime, or booking
// ---------------------------------------------------------------------
// One listener on the whole container handles every card ("event delegation").
// That works even though the cards are created by code after the page loads.
const container = document.querySelector(".movies");

if (container) {
  container.addEventListener("click", event => {
    // .closest() looks at what was clicked (or its parents) for a matching element.
    const timeButton = event.target.closest(".time");
    const bookButton = event.target.closest(".book-movie");

    // Case 1: a showtime button was clicked -> mark it as the selected time.
    if (timeButton) {
      const card = timeButton.closest(".movie"); // the whole card it belongs to

      // Un-select all times on this card...
      card.querySelectorAll(".time").forEach(button => {
        button.classList.remove("active");
      });

      // ...then highlight the one that was clicked.
      timeButton.classList.add("active");
      return; // done, don't check the booking case
    }

    // Case 2: a "Book Tickets" button was clicked.
    if (bookButton) {
      const card = bookButton.closest(".movie");
      const selectedTime = card.querySelector(".time.active"); // the highlighted time, if any

      // The user must pick a time first.
      if (!selectedTime) {
        alert("Please select a showtime first.");
        return;
      }

      // Go to the seat page using the ID and time saved on the time button.
      window.location.href =
        `seats.html?movie=${encodeURIComponent(selectedTime.dataset.id)}&time=${encodeURIComponent(selectedTime.dataset.time)}`;
    }
  });
}

// Start everything: fetch the movies and draw them when the page loads.
loadMovies();