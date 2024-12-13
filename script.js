let progress = document.querySelector('.progress');
let movieCards = document.querySelectorAll('.movie-card');
let playInterval;
let isPaused = false;
let yearMarkers = []; // Dynamically populated based on fetched data.

function playTimeline() {
    let width = parseFloat(progress.style.width) || 0;
    clearInterval(playInterval);

    playInterval = setInterval(() => {
        if (isPaused) return;

        if (width >= 100) {
            clearInterval(playInterval);
        } else {
            width += 0.25; // Slower progress
            progress.style.width = `${width}%`;

            // Calculate the current year based on progress
            let currentYear = calculateYearFromProgress(width);

            // Automatically scroll to the movie card of the current year
            scrollToYear(currentYear);
        }
    }, 500); // Slower increment
}

function pauseTimeline() {
    isPaused = !isPaused;
    document.getElementById('play-pause-btn').innerText = isPaused ? 'Play' : 'Pause';
}

function calculateYearFromProgress(progressWidth) {
    const totalYears = yearMarkers[yearMarkers.length - 1] - yearMarkers[0];
    const relativeYear = Math.round((progressWidth / 100) * totalYears);
    return yearMarkers[0] + relativeYear;
}

function filterTimeline() {
    let filterValue = document.getElementById('filterYear').value.trim();
    movieCards.forEach((card) => {
        let cardYear = card.getAttribute('data-year');
        if (filterValue && !cardYear.includes(filterValue)) {
            card.style.display = 'none';
        } else {
            card.style.display = 'block';
        }
    });
}

function scrollToYear(year) {
    const movieCard = [...movieCards].find((card) => card.getAttribute('data-year') === year.toString());
    if (movieCard) {
        movieCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Attach click event to the timeline
function attachTimelineClickEvent() {
    const timeline = document.querySelector('.timeline');
    timeline.addEventListener('click', (event) => {
        const timelineRect = timeline.getBoundingClientRect();
        const clickPosition = event.clientX - timelineRect.left;
        const timelineWidth = timelineRect.width;

        const progressWidth = (clickPosition / timelineWidth) * 100;
        const clickedYear = calculateYearFromProgress(progressWidth);

        scrollToYear(clickedYear);
    });
}

// Make timeline and play button static
window.addEventListener('scroll', () => {
    const controls = document.querySelector('.timeline-controls');
    controls.style.position = 'fixed';
    controls.style.bottom = '10px';
    controls.style.left = '10px';
    controls.style.zIndex = '1000';
});

// Fetch movie data from Wikidata
const query = `
SELECT ?movie ?movieLabel ?releaseDate ?directorLabel ?castLabel ?wikipedia WHERE {
  ?movie wdt:P31 wd:Q11424.                  # Movie instance
  ?movie wdt:P364 wd:Q36236.                 # Language is Malayalam
  OPTIONAL { ?movie wdt:P577 ?releaseDate. } # Release date (optional)
  OPTIONAL {
    ?wikipedia schema:about ?movie;
               schema:isPartOf <https://en.wikipedia.org/>. # Wikipedia link
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}`;

const endpointUrl = "https://query.wikidata.org/sparql";

fetch(endpointUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
    },
    body: new URLSearchParams({ query }),
})
    .then((response) => response.json())
    .then((data) => {
        const bindings = data.results.bindings;

        if (bindings.length > 0) {
            // Map and sort movies by release date
            const sortedMovies = bindings
                .map((movie) => ({
                    title: movie.movieLabel.value,
                    releaseDate: movie.releaseDate
                        ? new Date(movie.releaseDate.value)
                        : null,
                    wikipedia: movie.wikipedia ? movie.wikipedia.value : null,
                }))
                .sort((a, b) => {
                    if (!a.releaseDate) return 1; // Unknown dates to the end
                    if (!b.releaseDate) return -1;
                    return a.releaseDate - b.releaseDate; // Ascending order
                });

            // Generate year markers dynamically at intervals (e.g., every 25 years)
            const allYears = [...new Set(sortedMovies.map((movie) => movie.releaseDate?.getFullYear()))]
                .filter(Boolean)
                .sort((a, b) => a - b);

            const interval = 25; // Year interval (e.g., 1925, 1950, 1975...)
            const startYear = Math.floor(allYears[0] / interval) * interval;
            const endYear = Math.ceil(allYears[allYears.length - 1] / interval) * interval;

            yearMarkers = [];
            for (let year = startYear; year <= endYear; year += interval) {
                yearMarkers.push(year);
            }

            document.querySelector('.year-markers').innerHTML = yearMarkers
            .map((year) => `<span data-year="${year}" style="visibility: visible; margin: 0 10px; font-size: 14px;">${year}</span>`)
            .join('');

            // Generate movie cards
            const movieList = sortedMovies.map((movie) => {
                const releaseYear = movie.releaseDate
                    ? new Date(movie.releaseDate).getFullYear()
                    : "Unknown";
                const wikipediaLink = movie.wikipedia
                    ? `<a href="${movie.wikipedia}" target="_blank" class="text-blue-500 underline">Wikipedia</a>`
                    : "No Link";

                return `
                    <div class="movie-card" data-year="${releaseYear}">
                        <h3>${movie.title}</h3>
                        <p><strong>Release Date:</strong> ${releaseYear}</p>
                        <p><strong>More Info:</strong> ${wikipediaLink}</p>
                    </div>
                `;
            });

            document.getElementById("movie-details").innerHTML = movieList.join("");
            movieCards = document.querySelectorAll('.movie-card');

            // Attach events to timeline
            attachTimelineClickEvent();
        } else {
            document.getElementById("movie-details").innerHTML = "<p>No Malayalam movies found.</p>";
        }
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
        document.getElementById("movie-details").innerHTML = "<p>Error loading data.</p>";
    });
