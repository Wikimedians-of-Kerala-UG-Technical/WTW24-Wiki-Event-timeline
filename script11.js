document.addEventListener("DOMContentLoaded", function () {
    // URL of the Wikidata SPARQL endpoint
    const sparqlEndpoint = "https://query.wikidata.org/sparql";

    // SPARQL query to fetch historical events
    const query = `
    SELECT ?event ?eventLabel ?date WHERE {
        ?event wdt:P31 wd:Q1190556;  # Instance of event
              wdt:P585 ?date.     # The date of the event
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

        // Create and store event elements dynamically
        const eventElements = [];
        events.forEach((event, index) => {
            const eventDiv = document.createElement("div");
            eventDiv.classList.add("event");

            // Event position on the timeline
            const eventDate = new Date(event.date.value);
            const position = (eventDate.getFullYear() - 1900) * 20;  // Scale years to position

            eventDiv.style.left = `${position}px`;

            // Add event label and date
            const label = document.createElement("div");
            label.classList.add("label");
            label.innerText = event.eventLabel.value;

            const date = document.createElement("div");
            date.classList.add("date");
            date.innerText = eventDate.toLocaleDateString();

            // Append elements
            eventDiv.appendChild(label);
            eventDiv.appendChild(date);
            timeline.appendChild(eventDiv);

            eventElements.push(eventDiv);
        });

        // Play button logic
        const playButton = document.getElementById("playButton");
        let currentEventIndex = 0;

        // Play animation for each event
        playButton.addEventListener("click", function () {
            if (currentEventIndex < eventElements.length) {
                const event = eventElements[currentEventIndex];
                event.style.transform = "translateX(600px)"; // Move the event across the timeline

                // After 3 seconds (the duration of the animation), move to the next event
                setTimeout(() => {
                    currentEventIndex++;
                    if (currentEventIndex < eventElements.length) {
                        playButton.innerText = "Play Next Event";
                    }
                }, 3000); // 3 seconds to animate each event
            } else {
                playButton.innerText = "Timeline Complete";
            }
        });
    })
    .catch(error => {
        console.error("Error fetching data:", error);
    });
});
