window.onload = setMap; // Execute setMap when window finishes loading

function setMap() {
    const width = 800; // Set map width in pixels
    const height = 600; // Set map height in pixels
    
    const map = d3.select("body") // Select the HTML body
        .append("svg") // Create an SVG element
        .attr("class", "map") // Assign CSS class for styling
        .attr("width", width) // Set SVG width
        .attr("height", height) // Set SVG height

        const projection = d3.geoConicEqualArea() // Create conic equal-area projection, as per https://projectionwizard.org/    
        .center([7.27, 21.58]) // Set projection center [longitude, latitude]
        .rotate([108.27, -2.97, 0]) // Rotate projection [x, y, z]
        .parallels([20.41, 59.94]) // Set standard (horizontal) parallels
        .scale(1512.78) // Set projection scale factor, as per https://uwcart.github.io/d3-projection-demo/
        .translate([width / 2, height / 2]); // Center projection in SVG
    
    var promises = [ // Array of data loading promises
        d3.csv("data/mxStateStats.csv"), // Load CSV data
        d3.json("data/mxStatePoly.topojson") // Load TopoJSON data
    ];
    
    Promise.all(promises) // Wait for all data to load
        .then(callback) // Process data when loaded
        .catch(error => { // Handle errors
            console.error("Error loading files:", error); // Log any loading errors
        });

    function callback(data) { // Process loaded data
        var csvData = data[0]; // First item is CSV data
        var mexicoPoly = data[1]; // Second item is TopoJSON
        console.log("TopoJSON objects:", Object.keys(mexicoPoly.objects)); // Log available objects
        
        console.log("CSV Data:", csvData); // Log CSV data for inspection
        console.log("Raw TopoJSON:", mexicoPoly); // Log raw TopoJSON

        // Use the correct object name - double-check if I update .shp files in Mapshaper!
        var objectName = "mexicoStates2"; // Name of TopoJSON object containing states
        if (!mexicoPoly.objects[objectName]) { // Check if object exists
            console.error(`Object '${objectName}' not found in TopoJSON`); // Log error if missing
            return; // Exit if data is invalid
        }

        var mexicoStates = topojson.feature(mexicoPoly, mexicoPoly.objects[objectName]); // Convert TopoJSON to GeoJSON
        console.log("Converted GeoJSON:", mexicoStates); // Log converted GeoJSON
        console.log("Full first feature:", mexicoStates.features[0]); // Inspect first state's data
        console.log("9th feature:", mexicoStates.features[8]); // Inspect ninth state's data

        createMap(csvData, mexicoStates, map, width, height, projection); // Create the map visualization
    }
}

function createMap(csvData, mexicoStates, map, width, height, projection) {
    const path = d3.geoPath().projection(projection); // Create geographic path generator with specified projection

    // 1. FIRST add background (bottom layer)
    map.append("path") // Add path element to SVG
        .datum({type: "Sphere"}) // Bind sphere data (full globe background)
        .attr("class", "gratBackground") // Set CSS class for styling
        .attr("d", path); // Generate path data using projection

    // 2. THEN add graticule lines
    const graticule = d3.geoGraticule().step([10, 10]); // Create graticule generator with 10° intervals
    map.append("path") // Add path element for graticule
        .datum(graticule) // Bind graticule data
        .attr("class", "graticule") // Set CSS class for styling
        .attr("d", path); // Generate path data using projection
    
    // 3. LAST draw all states (middle layer)
    map.selectAll(".state") // Select all state elements (empty selection initially)
        .data(mexicoStates.features) // Bind GeoJSON features array to selection
        .enter() // Get enter selection for new data
        .append("path") // Append path for each state feature
        .attr("class", function(d){
            return "state " + d.properties.name; // Set class combining "state" with state name
        })
        .attr("d", path); // Generate path data using projection
}