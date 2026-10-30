import { renderChrome, getAllData, getDataById, esc, imgUrl, genreText, formatDuration, money, dateKey, dateLabel, playsAt } from "./common.js"

const $ = (id) => document.getElementById(id)
const { cinema } = await renderChrome({ nav: "catalog" })

const [movies, halls] = await Promise.all([getAllData("MovieTickets"), getAllData("Halls")])
const shown = movies.filter((m) => m.status === "now showing" && playsAt(m, cinema))
const hallOf = (m) => halls.find((h) => h.id === m.hallId) || halls[0] || {}
const fromPrice = (m) => { const p = (hallOf(m).rows || []).map((r) => r.price); return p.length ? Math.min(...p) : m.price }
const fmtClass = (f = "") => (/imax/i.test(f) ? "fmt-red" : /4dx/i.test(f) ? "fmt-gold" : /dolby/i.test(f) ? "fmt-purple" : "")

// The next five days are worked out from today's date
const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })
const state = { day: 0, format: "All", genre: "", q: new URLSearchParams(location.search).get("q") || "", sort: "rating" }
$("q").value = state.q
if (cinema) $("where").textContent = `${cinema.name} • Screenings Today`

const chips = (label, items, active) =>
  `<span class="chip-label">${label}</span>` + items.map(([key, text]) => `<button class="pill${key === active ? " active" : ""}" data-key="${esc(key)}">${esc(text)}</button>`).join("")

function drawFilters() {
  const md = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const dayText = (d, i) => (i === 0 ? "Today, " + md(d) : i === 1 ? "Tomorrow, " + md(d) : dateLabel(d))
  $("dates").innerHTML = days.map((d, i) => `<button class="pill${i === state.day ? " active" : ""}" data-key="${i}">${dayText(d, i)}</button>`).join("")
  const formats = [...new Set(shown.map((m) => m.format).filter(Boolean))]
  $("formats").innerHTML = chips("Format:", [["All", "All"], ...formats.map((f) => [f, f])], state.format)
  const genres = [...new Set(shown.flatMap((m) => String(m.genre || "").split(/,\s*/)).filter(Boolean))]
  $("genres").innerHTML = chips("Genre:", genres.map((g) => [g, g]), state.genre)
}

function drawGrid() {
  const q = state.q.toLowerCase()
  let list = shown.filter((m) =>
    (state.format === "All" || m.format === state.format) &&
    (!state.genre || String(m.genre).toLowerCase().includes(state.genre.toLowerCase())) &&
    (!q || [m.title, m.genre, m.director].join(" ").toLowerCase().includes(q)))

  list = [...list].sort((a, b) =>
    state.sort === "az" ? a.title.localeCompare(b.title) : state.sort === "length" ? a.durationMins - b.durationMins : b.rating - a.rating)

  $("count").innerHTML = `Showing ${list.length}<br>${list.length === 1 ? "Title" : "Titles"}`
  $("grid").innerHTML = list.length ? list.map((m) => `
    <article class="movie">
      <div class="poster-img">
        <img src="${esc(imgUrl(m.posterUrl))}" alt="${esc(m.title)}" class="poster-photo" />
        <div class="ptags">${m.format ? `<span class="tag ${fmtClass(m.format)}">${esc(m.format)}</span>` : ""}${m.highlight ? `<span class="tag">${esc(m.highlight)}</span>` : ""}</div>
        <span class="score"><i class="fa-solid fa-star gold"></i> ${esc(m.rating)}</span>
      </div>
      <div class="movie-body">
        <p class="genre">${esc(genreText(m.genre))}</p>
        <h3>${esc(m.title)}</h3>
        <p class="dir">${m.director ? "Dir. " + esc(m.director) + " • " : ""}${formatDuration(m.durationMins)} • ${esc(m.ageRating)}</p>
        ${m.description ? `<p class="desc">${esc(m.description)}</p>` : ""}
        <p class="show-label"><span>Next showtimes (${esc(hallOf(m).name || "")})</span><span>${esc(m.hallNote || "")}</span></p>
        <div class="slots">${(m.showing || []).map((t, i) => `<button class="time${i === 0 ? " active" : ""}" data-time="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        <div class="book-row">
          <div><p>From</p><strong>${money(fromPrice(m))}</strong></div>
          <button class="btn-red" data-book="${esc(m.id)}">Quick Book <i class="fa-solid fa-ticket"></i></button>
        </div>
      </div>
    </article>`).join("") : "<p>No movies match those filters.</p>"
}

function draw() { drawFilters(); drawGrid() }

$("dates").addEventListener("click", (e) => { const b = e.target.closest(".pill"); if (b) { state.day = +b.dataset.key; draw() } })
$("formats").addEventListener("click", (e) => { const b = e.target.closest(".pill"); if (b) { state.format = b.dataset.key; draw() } })
$("genres").addEventListener("click", (e) => { const b = e.target.closest(".pill"); if (b) { state.genre = state.genre === b.dataset.key ? "" : b.dataset.key; draw() } })
$("q").addEventListener("input", (e) => { state.q = e.target.value; drawGrid() })
$("sort").addEventListener("change", (e) => { state.sort = e.target.value; drawGrid() })
$("clear").addEventListener("click", () => { Object.assign(state, { day: 0, format: "All", genre: "", q: "", sort: "rating" }); $("q").value = ""; $("sort").value = "rating"; draw() })

$("grid").addEventListener("click", (e) => {
  const t = e.target.closest(".time")
  if (t) { t.parentElement.querySelectorAll(".time").forEach((x) => x.classList.remove("active")); t.classList.add("active"); return }
  const b = e.target.closest("[data-book]")
  if (!b) return
  const time = b.closest(".movie").querySelector(".time.active")?.dataset.time || ""
  location.href = `seats.html?movie=${b.dataset.book}&time=${encodeURIComponent(time)}&date=${dateKey(days[state.day])}`
})

draw()
