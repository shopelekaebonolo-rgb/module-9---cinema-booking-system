// Where the CineNova server runs (it sends the ticket emails)
var CINENOVA_API = location.port === "3000" ? "" : "http://localhost:3000";

// ---------- Shared script for every CineNova page ----------

document.addEventListener("click", function (e) {
  // Anything with data-href="page.html" works like a link (buttons, cards, posters)
  var go = e.target.closest("[data-href]");
  if (go) { location.href = go.dataset.href; return; }

  // data-scroll="id" smoothly scrolls to that section on the same page
  var scroll = e.target.closest("[data-scroll]");
  if (scroll) {
    var target = document.getElementById(scroll.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // Menu button (shown on phones) opens and closes the top bar links
  var menu = e.target.closest(".menu-btn");
  if (menu) menu.closest(".topbar").classList.toggle("open");
});

// ---------- Seat selection: Proceed to Booking ----------
document.addEventListener("click", function (e) {
  // Clicks on the icon inside the button count too, because closest() looks at parents
  if (!e.target.closest("#pay")) return;

  // Seats the user has picked on the map
  var chosen = Array.from(document.querySelectorAll(".chair.selected"));
  if (!chosen.length) { alert("Please select at least one seat."); return; }

  try {
    // Safe text reader: returns a fallback instead of crashing if an element is missing
    var text = function (selector, fallback) {
      var el = document.querySelector(selector);
      return el ? el.textContent.trim() : fallback;
    };

    // Price rows from the order box ([label, amount] pairs), skipping any row without two cells
    var lines = [];
    document.querySelectorAll(".price-box p:not(.total-row):not(.hidden)").forEach(function (row) {
      var cells = row.querySelectorAll("span");
      if (cells.length >= 2) lines.push([cells[0].textContent, cells[1].textContent]);
    });

    var tags = document.querySelectorAll(".head-tags .tag");
    var hallRight = document.querySelectorAll(".hall-right span");

    localStorage.setItem("cinenovaBooking", JSON.stringify({
      movie: text(".order-head h3", "Unknown movie"),
      rating: tags[0] ? tags[0].textContent.trim() : "",
      duration: tags[1] ? tags[1].textContent.trim() : "",
      format: "Standard",
      cinema: "CineNova Downtown Flagship",
      gate: "Fast Gate Entry \u2022 Turnstile C",
      hall: hallRight[0] ? hallRight[0].textContent.trim() : "",
      when: hallRight[1] ? hallRight[1].textContent.trim() : "",
      seats: chosen.map(function (c) { return { id: c.dataset.id, price: c.dataset.price, zone: c.dataset.zone }; }),
      lines: lines,
      total: text("#total", "$0.00"),
      back: location.href   // so "Return to Seat Selection" comes back to the same movie and time
    }));

    location.href = "booking.html";
  } catch (err) {
    // Show the real reason instead of failing silently
    console.error("Proceed to Booking failed:", err);
    alert("Couldn't continue to booking: " + err.message);
  }
});