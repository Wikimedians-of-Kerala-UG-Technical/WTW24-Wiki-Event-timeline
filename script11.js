document.addEventListener("DOMContentLoaded", function () {
    // URL of the Wikidata SPARQL endpoint
    const sparqlEndpoint = "https://query.wikidata.org/sparql";
    
    // SPARQL query to fetch historical events
    const query = `
    SELECT ?event ?eventLabel ?date ?image WHERE {
        ?event wdt:P31 wd:Q1190556;  # Instance of event
              wdt:P585 ?date.     # The date of the event
        OPTIONAL { ?event wdt:P18 ?image. }  # Image of the event
        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    ORDER BY ?date
    LIMIT 10
    `;

    // Query parameters for Wikidata API
    const params = {
        query: query,
        format: 'json'
    };

    // Fetch the data from Wikidata API
    fetch(sparqlEndpoint + "?query=" + encodeURIComponent(query) + "&format=json", {
        method: "GET",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Accept": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        const events = data.results.bindings;
        const timeline = document.getElementById("timeline");

        // Iterate through the events and render them on the timeline
        events.forEach(event => {
            const eventDiv = document.createElement("div");
            eventDiv.classList.add("event");

            // Event dot
            const dot = document.createElement("div");
            dot.classList.add("dot");

            // Event details
            const label = document.createElement("div");
            label.classList.add("label");
            label.innerText = event.eventLabel.value;

            const date = document.createElement("div");
            date.classList.add("date");
            date.innerText = new Date(event.date.value).toLocaleDateString();

            // Event image (optional)
            const image = event.image ? document.createElement("img") : null;
            if (image) {
                image.src = event.image.value;
                image.alt = event.eventLabel.value;
            }

            // Append the elements to the event div
            eventDiv.appendChild(dot);
            eventDiv.appendChild(label);
            eventDiv.appendChild(date);
            if (image) {
                eventDiv.appendChild(image);
            }

            // Append the event div to the timeline
            timeline.appendChild(eventDiv);
        });
    })
    .catch(error => {
        console.error("Error fetching data:", error);
    });
});
