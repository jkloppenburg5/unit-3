window.onload = setMap;

function setMap() {
    var promises = [
        d3.csv("data/mxStateStats.csv"),
        d3.json("data/mxStatePoly.topojson")
    ];
    
    Promise.all(promises)
        .then(callback)
        .catch(error => {
            console.error("Error loading files:", error);
            // Add more detailed error logging:
            if (error instanceof TypeError && error.message.includes('objects')) {
                console.error("TopoJSON structure issue - verify 'objects' property exists");
            }
        });

    function callback(data) {
        var csvData = data[0];
        var mexicoPoly = data[1];
        
        console.log("CSV Data:", csvData);
        console.log("Raw TopoJSON:", mexicoPoly);
        
        // Verify the TopoJSON structure
        if (!mexicoPoly || !mexicoPoly.objects) {
            console.error("Invalid TopoJSON structure - missing 'objects' property");
            return;
        }

        // Log available object names
        console.log("Available TopoJSON objects:", Object.keys(mexicoPoly.objects));
        
        // Use the correct object name (change if different in your file)
        var objectName = "mexicanStates1"; // Update this if your object has a different name
        if (!mexicoPoly.objects[objectName]) {
            console.error(`Object '${objectName}' not found in TopoJSON`);
            return;
        }

        var mexicoStates = topojson.feature(mexicoPoly, mexicoPoly.objects[objectName]);
        console.log("Converted GeoJSON:", mexicoStates);

        // Log all states to check for missing data
        console.log("List of Mexican states in GeoJSON:");
        mexicoStates.features.forEach((state, index) => {
            console.log(
                `${index + 1}. ${state.properties.name || "Unnamed feature"}`,
                state
            );
        });

        createMap(csvData, mexicoStates);
    }
}

function createMap(csvData, mexicoStates) {
    var width = 800, height = 600;
    var svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("border", "2px solid #333")  // Solid border
        .style("border-radius", "4px")      // Optional: Rounded corners
        .style("background", "#f5f5f5");    // Light gray background;

    var projection = d3.geoConicEqualArea() // As per advice from https://projectionwizard.org/    
        .center([-100,24])
        .parallels([12,28])
        .rotate([15, 33, -2])
        .scale(1250)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath().projection(projection);

    // 2. Draw graticule (bottom layer)
    svg.append("path")
        .datum(d3.geoGraticule())
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#ddd");

    // 3. Draw all states (middle layer)
    svg.selectAll(".state")
        .data(mexicoStates.features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", path)
        .attr("fill", "steelblue")
        .attr("stroke", "white");

    // 4. Debug: Force Sonora to render on top (red)
    // const sonora = mexicoStates.features[0]; // Confirm index
    // svg.append("path")
    //     .datum(sonora)
    //     .attr("d", path)
    //     .attr("fill", "rgba(255, 0, 0, 0.5)")  // Semi-transparent red
    //     .attr("stroke", "darkred");
}