let progress = document.querySelector('.progress');
let movieCards;
let playInterval;

function playTimeline() {
    let width = 0;
    clearInterval(playInterval);
    playInterval = setInterval(() => {
        if (width >= 100) {
            clearInterval(playInterval);
        } else {
            width += 20;
            progress.style.width = `${width}%`;
        }
    }, 1000);
}

function filterTimeline() {
    let filterValue = document.getElementById('filterYear').value.trim();
    let movieCards = document.querySelectorAll('.movie-card');

    movieCards.forEach(card => {
        let cardYear = card.getAttribute('data-year');
        if (filterValue && !cardYear.includes(filterValue)) {
            card.style.display = 'none';
        } else {
            card.style.display = 'block';
        }
    });
}

// SPARQL query to fetch Malayalam movies with additional details
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
}

LIMIT 100
`; 

// Wikidata endpoint URL
const endpointUrl = "https://query.wikidata.org/sparql";

const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php"; 

// Function to fetch image for a given Wikipedia title
const fetchImage = async (wikipediaUrl) => {
  if (!wikipediaUrl) return null;

  // Extract Wikipedia title from the URL
  const title = wikipediaUrl.split("/").pop();
  const url = `${wikipediaApiUrl}?action=query&format=json&prop=pageimages|images&titles=Anarkali (1966 film)&formatversion=2&piprop=thumbnail|name|original&pithumbsize=300&origin=*`;

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

// Fetch data from Wikidata
fetch(endpointUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
    },
    body: new URLSearchParams({ query })
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

            // Update the DOM with sorted movies
            document.getElementById("movie-details").innerHTML = movieList.join("");

            // After the movies are loaded, reinitialize the movie cards
            movieCards = document.querySelectorAll('.movie-card');
        } else {
            document.getElementById("movie-details").innerHTML = "<p>No Malayalam movies found.</p>";
        }
    })
    .catch((error) => {
        console.error("Error fetching data:", error);
        document.getElementById("movie-details").innerHTML = "<p>Error loading data.</p>";
    });
