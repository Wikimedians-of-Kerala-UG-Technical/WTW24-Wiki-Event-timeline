let progress = document.querySelector('.progress');
let movieCards = document.querySelectorAll('.movie-card');
let playInterval;
let isPaused = false;
let yearMarkers = []; // Will hold dynamically populated year markers.
let yearColors = {};  // Object to hold color for each year

// Start or continue playing the timeline
function playTimeline() {
    let width = parseFloat(progress.style.width) || 0;
    clearInterval(playInterval);

    playInterval = setInterval(() => {
        if (isPaused) return;

        if (width >= 100) {
            clearInterval(playInterval);
        } else {
            width += 1; // Slower progress increment
            progress.style.width = `${width}%`;

            // Calculate and scroll to the corresponding year
            let currentYear = calculateYearFromProgress(width);
            scrollToYear(currentYear);
        }
    }, 1000); // Slower timeline speed
}

// Toggle play/pause state
function togglePause() {
    isPaused = !isPaused;
    document.getElementById('playButton').innerText = isPaused ? 'Play' : 'Pause';
}

// Calculate year based on progress width
function calculateYearFromProgress(progressWidth) {
    const totalYears = yearMarkers[yearMarkers.length - 1] - yearMarkers[0];
    const relativeYear = Math.round((progressWidth / 100) * totalYears);
    return yearMarkers[0] + relativeYear;
}

// Filter displayed movies based on user input
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

// Scroll to a specific year on the timeline and highlight the movie cards
function scrollToYear(year) {
    // Reset previous highlights
    movieCards.forEach((card) => {
        card.classList.remove('highlight'); // Remove any previous highlights
        card.style.backgroundColor = '';    // Reset the background color
    });

    // Find the movie cards for the clicked year
    const yearCards = [...movieCards].filter((card) => card.getAttribute('data-year') === year.toString());

    // Highlight the movie cards of the clicked year
    yearCards.forEach((card) => {
        const color = yearColors[year] || 'yellow';  // Default to yellow if no color is assigned
        card.classList.add('highlight');
        card.style.backgroundColor = color; // Set the background color for the year
    });

    // Scroll the first movie card of the selected year into view
    if (yearCards.length > 0) {
        yearCards[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
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

        progress.style.width = `${progressWidth}%`;
        scrollToYear(clickedYear);
    });
}

// Fetch and display movies dynamically
const query = `
SELECT ?movie ?movieLabel ?releaseDate ?wikipedia WHERE {
  ?movie wdt:P31 wd:Q11424.                  # Instance of movie
  ?movie wdt:P364 wd:Q36236.                 # Language is Malayalam
  OPTIONAL { ?movie wdt:P577 ?releaseDate. } # Release date
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
            const sortedMovies = bindings
                .map((movie) => ({
                    title: movie.movieLabel.value,
                    releaseDate: movie.releaseDate
                        ? new Date(movie.releaseDate.value)
                        : null,
                    wikipedia: movie.wikipedia ? movie.wikipedia.value : null,
                }))
                .sort((a, b) => (a.releaseDate - b.releaseDate || 0));

            const allYears = [...new Set(sortedMovies.map((movie) => movie.releaseDate?.getFullYear()))]
                .filter(Boolean)
                .sort((a, b) => a - b);

            const interval = 25;
            const startYear = Math.floor(allYears[0] / interval) * interval;
            const endYear = Math.ceil(allYears[allYears.length - 1] / interval) * interval;

            yearMarkers = [];
            for (let year = startYear; year <= endYear; year += interval) {
                yearMarkers.push(year);
            }

            // Assign colors for each year
            yearMarkers.forEach((year, index) => {
                const colors = ['#FF6347', '#FFD700', '#ADFF2F', '#20B2AA', '#8A2BE2', '#FF1493', '#00BFFF']; // Example colors
                yearColors[year] = colors[index % colors.length];  // Loop through colors
            });

            document.querySelector('.year-markers').innerHTML = yearMarkers
                .map((year) => `<span data-year="${year}">${year}</span>`)
                .join('');

            const movieList = sortedMovies.map((movie) => {
                const releaseYear = movie.releaseDate
                    ? new Date(movie.releaseDate).getFullYear()
                    : "Unknown";
                const wikipediaLink = movie.wikipedia
                    ? `<a href="${movie.wikipedia}" target="_blank">Wikipedia</a>`
                    : "No Link";

                return `
                    <div class="movie-card" data-year="${releaseYear}">
                        <h3>${movie.title}</h3>
                        <p><strong>Release Year:</strong> ${releaseYear}</p>
                        <p>${wikipediaLink}</p>
                    </div>
                `;
            });

            document.getElementById("movie-details").innerHTML = movieList.join("");
            movieCards = document.querySelectorAll('.movie-card');
            attachTimelineClickEvent();
        } else {
            document.getElementById("movie-details").innerHTML = "<p>No movies found.</p>";
        }
    })
    .catch((error) => {
        console.error("Error fetching movie data:", error);
        document.getElementById("movie-details").innerHTML = "<p>Error loading movies.</p>";
    });

// Event listeners
document.getElementById('playButton').addEventListener('click', () => {
    if (!isPaused) playTimeline();
    togglePause();
});

// Add a new CSS rule for the highlight effect
const style = document.createElement('style');
style.innerHTML = `
    .movie-card.highlight {
        border: 2px solid red;     /* Add border if needed */
        color: white;              /* Change text color if needed */
    }
`;
document.head.appendChild(style);
