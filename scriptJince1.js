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

// Wikipedia API base URL
const wikipediaApiUrl = "https://en.wikipedia.org/w/api.php"; 

// Function to fetch image for a given Wikipedia title
const fetchImage = async (wikipediaUrl) => {
  if (!wikipediaUrl) return null;

  // Extract Wikipedia title from the URL
  const title = wikipediaUrl.split("/").pop();
  const url = `${wikipediaApiUrl}?action=query&prop=pageimages&titles=${title}&format=json&pithumbsize=300&origin=*`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    return pages[pageId].thumbnail ? pages[pageId].thumbnail.source : null;
  } catch (error) {
    console.error(`Error fetching image for ${title}:`, error);
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
  body: new URLSearchParams({ query }),
})
  .then((response) => response.json())
  .then(async (data) => {
    const bindings = data.results.bindings;

    if (bindings.length > 0) {
      // Map data and sort by release date
      const sortedMovies = await Promise.all(
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
        const releaseDate = movie.releaseDate
          ? movie.releaseDate.toDateString()
          : "Unknown";
        const wikipediaLink = movie.wikipedia
          ? `<a href="${movie.wikipedia}" target="_blank" class="text-blue-500 underline">Wikipedia</a>`
          : "No Link";
        const imageTag = movie.image
          ? `<img src="${movie.image}" alt="${movie.title}" class="movie-image mb-4"/>`
          : "";

        return `
          <div class="movie-card bg-white rounded-lg shadow-md p-4 m-4 max-w-xs">
            ${imageTag}
            <h3 class="text-lg font-bold">${movie.title}</h3>
            <p class="text-gray-700"><strong>Release Date:</strong> ${releaseDate}</p>
            <p><strong>More Info:</strong> ${wikipediaLink}</p>
          </div>
        `;
      });

      // Update the DOM with sorted movies
      document.getElementById("movie-details").innerHTML = movieList.join("");
    } else {
      document.getElementById("movie-details").innerHTML =
        "<p>No Malayalam movies found.</p>";
    }
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
    document.getElementById("movie-details").innerHTML =
      "<p>Error loading data.</p>";
  });