
import { getDataById } from "../db/db.js";

const IMG_PATH = "Images/";

const params = new URLSearchParams(window.location.search);
const movieId = params.get("movie");
const time = params.get("time");

function formatDuration(mins = 0) {
  const h = Math.floor(mins / 60);
  const m = String(mins % 60).padStart(2, "0");
  return `${h}h ${m}m`;
}

// Preserve the icon inside each information span.
function setText(el, text) {
  if (!el) return;

  const textNode = Array.from(el.childNodes).find(
    node => node.nodeType === Node.TEXT_NODE
  );

  if (textNode) {
    textNode.textContent = " " + text;
  } else {
    el.append(" " + text);
  }
}

async function loadMovie() {
  if (!movieId) {
    alert("Please select a movie first.");
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const movie = await getDataById("MovieTickets", movieId);

    if (!movie) {
      alert("Movie not found.");
      window.location.href = "dashboard.html";
      return;
    }

    const shortDate = new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    const longDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    });

    const duration = formatDuration(movie.durationMins);
    const showTime = time || movie.showing?.[0] || "Time unavailable";

    document.title = `Seat Selection - ${movie.title}`;

    // Movie information bar
    const title = document.querySelector(".hall-left strong");

    if (title) title.textContent = movie.title;

    document.querySelectorAll(".hall-left .tag").forEach(tag => {
      tag.remove();
    });

    const hallInfo = document.querySelectorAll(".hall-right span");

    setText(hallInfo[1], `${shortDate} • ${showTime}`);
    setText(hallInfo[2], duration);

    // Movie poster
    const poster = document.querySelector(".mini-poster-box img");

    if (poster) {
      poster.src = IMG_PATH + movie.posterUrl;
      poster.alt = `${movie.title} poster`;
    }

    document.querySelector(".mini-poster-box span")?.remove();

    // Order summary
    const orderTitle = document.querySelector(".order-head h3");
    if (orderTitle) orderTitle.textContent = movie.title;

    const genre = document.querySelector(
      ".order-head p:not(.kicker)"
    );

    if (genre) {
      genre.textContent = (movie.genre || "").replace(/,\s*/g, " • ");
    }

    const tags = document.querySelectorAll(".head-tags .tag");

    if (tags[0]) tags[0].textContent = movie.ageRating || "";
    if (tags[1]) tags[1].textContent = duration;

    const dates = document.querySelectorAll(".when strong");

    setText(dates[0], longDate);
    setText(dates[1], showTime);

  } catch (error) {
    console.error("Error loading movie:", error);
    alert("Unable to load movie details. Please try again.");
  }
}

loadMovie();
