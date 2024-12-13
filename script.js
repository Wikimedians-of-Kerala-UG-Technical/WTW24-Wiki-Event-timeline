let progress = document.querySelector('.progress');
let movieCards = document.querySelectorAll('.movie-card');
let playInterval;
let isPaused = false;
let yearMarkers = []; // Will hold dynamically populated year markers.

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

// Scroll to a specific year on the timeline
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
}

`;

const endpointUrl = "https://query.wikidata.org/sparql";

const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php"; 

// Function to fetch image for a given Wikipedia title
const fetchImage = async (wikipediaUrl) => {
    if (!wikipediaUrl) return null;
  
    // Extract Wikipedia title from the URL
    const title = wikipediaUrl.split("/").pop();
    const url = `${wikipediaApiUrl}?action=query&format=json&prop=pageimages|images&titles=kerala&formatversion=2&piprop=thumbnail|name|original&pithumbsize=300&origin=*`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      const pages = data.query.pages;
      console.log(pages)
      const pageId = Object.keys(pages)[0];
      console.log(pageId)
      return pages[pageId]?.thumbnail?.source || null;
    } catch (error) {
      // console.error(`Error fetching image for ${title}:`, error);
      return null;
    }
  };



fetch(endpointUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
    },
    body: new URLSearchParams({ query }),
})
    .then((response) => response.json())
    .then(async (data) => {
        const bindings = data.results.bindings;

        if (bindings.length > 0) {
            // Map data and sort by release date
            const sortedMovies =await Promise.all(
                bindings.map(async (movie) => {
                  const wikipediaUrl = movie.wikipedia ? movie.wikipedia.value : null;
                  const image = wikipediaUrl ? await fetchImage(wikipediaUrl) : null;
        
                  return {
                    title: movie.movieLabel.value,
                    releaseDate: movie.releaseDate
                      ? new Date(movie.releaseDate.value)
                      : null,
                    wikipedia: wikipediaUrl,
                    image,
                  };
                })
              );

              sortedMovies.sort((a, b) => {
                if (!a.releaseDate) return 1; // Move unknown dates to the end
                if (!b.releaseDate) return -1;
                return a.releaseDate - b.releaseDate; // Ascending order
              });

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

            document.querySelector('.year-markers').innerHTML = yearMarkers
                .map((year) => `<span data-year="${year}">${year}</span>`)
                .join('');

           // Generate HTML for sorted movies as cards
           const movieList = sortedMovies.map((movie) => {
            const releaseYear = movie.releaseDate
                ? new Date(movie.releaseDate).getFullYear()
                : "Unknown";
            const wikipediaLink = movie.wikipedia
                ? `<a href="${movie.wikipedia}" target="_blank" class="text-blue-500 underline">Wikipedia</a>`
                : "No Link";

            const imageTag = movie.image
                ? `<img src="${movie.image}" alt="${movie.title}" width="200" height="200" >`
                : `<img src="https://via.placeholder.com/200" alt="Placeholder">`;

            return `
                <div class="movie-card" data-year="${releaseYear}">
                    <h3>${movie.title}</h3>
                    <div class="movie-image">
                    ${imageTag}
                    </div>
                    <p><strong>Release Date:</strong> ${releaseYear}</p>
                    <p><strong>More Info:</strong> ${wikipediaLink}</p>
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
