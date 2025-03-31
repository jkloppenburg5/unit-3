(function(){
    
    /////////// CONFIGURATION CONSTRAINTS //////////
    const width = 800; // Set map width in pixels
    const height = 600; // Set map height in pixels
    const attrArray = ["AbductionRate","CrimeRate","EstPopOver18","MurderRate","SecPercep","State","adm1_code"]; // Define which CSV columns to transfer to GeoJSON properties
    const topojsonObjectName = "mexicoStates2"; // Name of TopoJSON object containing states
    let expressed = "MurderRate"; // Currently visualized attribute

    ////////// MAIN MAP SETUP FUNCTION ////////// 
    function setMap() {
        // Initialize map visualization pipeline:
        const map = initMap(width, height); // Create SVG container
        const projection = initProjection(width, height); // Set up map projection
        loadData(map, projection); // Load and process data
    }

    /////////// INITIALIZATION FUNCTIONS //////////
    function initMap(width,height){ // Creates and configures the SVG map container
        return d3.select("body") // Select the HTML body, @returns {object} D3 SVG selection
            .append("svg") // Create an SVG element
            .attr("class", "map") // Assign CSS class for styling
            .attr("width", width) // Set SVG width
            .attr("height", height) // Set SVG height
    }

    function initProjection(width, height) { // Configures the geographic projection for the map
        return d3.geoConicEqualArea() // @returns {object} D3 geographic projection, conic equal-area projection, as per https://projectionwizard.org/ 
            .center([7.27, 21.58]) // Set projection center [longitude, latitude]
            .rotate([108.27, -2.97, 0]) // Rotate projection [x, y, z]
            .parallels([20.41, 59.94]) // Set standard (horizontal) parallels
            .scale(1512.78) // Set projection scale factor, as per https://uwcart.github.io/d3-projection-demo/
            .translate([width / 2, height / 2]); // Center projection in SVG
    }

    /////////// DATA PROCESSING FUNCTIONS //////////
    /**
     * Loads and processes all required data files
     * @param {object} map - D3 SVG selection
     * @param {object} projection - D3 geographic projection
     */
    function loadData(map, projection) { // Load both datasets in parallel
        Promise.all([ // JavaScript method that takes an array of promises and returns a single promise that resolves when all input promises resolve and rejects if any input promise rejects.
            d3.csv("data/mxStateStats.csv"), // Statistical data
            d3.json("data/mxStatePoly.topojson") // Geographic data
        ])
        .then(([csvData, topoData]) => {
            console.log("CSV Data:", csvData); // Log CSV data
            const geoData = processGeoJSON(topoData, topojsonObjectName); // Passing the data to a processing function (variable?). No conversion happens here yet.
            const joinedData = joinData(geoData, csvData, attrArray); // Merge datasets
            renderMap(map, joinedData, csvData, projection); // Draw visualization
        })
        .catch(handleError); // Handle and loading errors
    }
    
    /**
     * Converts TopoJSON to GeoJSON and validates structure
     * @param {object} topoData - Raw TopoJSON data
     * @param {string} objectName - Key for geographic features
     * @returns {object} GeoJSON FeatureCollection
     * @throws {Error} If requested object isn't found
     */
    function processGeoJSON(topoData, objectName) {
        console.log("TopoJSON objects:", Object.keys(topoData.objects)); // Log available objects

        if (!topoData.objects[objectName]) throw new Error(`TopoJSON object "${objectName}" not found!`); // Check if we have the correct object from the TopoJSON file (mxStatePoly)
        return topojson.feature(topoData, topoData.objects[objectName]); // Convert to GeoJSON feature collection
    }
   
    /**
     * Joins CSV data to GeoJSON features using adm1_code as key
     * @param {object} geoData - GeoJSON FeatureCollection
     * @param {Array} csvData - CSV rows with statistical data
     * @param {Array} attrArray - Attributes to transfer from CSV
     * @returns {object} Enhanced GeoJSON with CSV data
     */
    function joinData(geoData, csvData, attrArray) {
        geoData.features.forEach(state => { // Iterate through each feature in the collection
            console.log(`${state.properties.adm1_code}: ${state.properties.name}`); // Log adm1_code against state name
        });

        geoData.features.forEach(state => { // For each geographic feature (state/province) in the GeoJSON:
            const csvMatch = csvData.find(row => row.adm1_code === state.properties.adm1_code); // Try to find matching CSV row using admin code as key
            if (csvMatch) attrArray.forEach(attr => { // If CSV data exists for this geographic feature...
                state.properties[attr] = parseFloat(csvMatch[attr]) || csvMatch[attr]; // For each attribute we want to merge from CSV, convert numeric fields to numbers, keep strings as-is
            });
        });

        console.log("Converted GeoJSON:", geoData); // Log converted GeoJSON

        return geoData; // Newly enhanced GeoJSON now with CSV data
    }
    
    /////////// VISUALIZATION FUNCTIONS //////////
    function getColorScheme() {
        return [                         // Returns an array of color hex codes for choropleth
            "#D4B9DA", // light purple   // Lightest color for lowest values
            "#C994C7",                   // 
            "#DF65B0", // medium pink    // Middle color for median values
            "#DD1C77", // dark pink      // 
            "#980043"  // burgundy       // Darkest color for highest values
        ];
    }
    
    /* Modern, streamlined approach
    // function makeColorScale(data, attribute) {
    //     return d3.scaleQuantile()        // Create a quantile scale (divides data into equal-sized bins)
    //         .range(getColorScheme())     // Assign our color scheme to the scale's output range
    //         .domain(data.map(d => parseFloat(d[attribute]))); // Convert CSV strings to numbers for domain   
    // }
    */

    function makeColorScale(data, attribute) {
        var colorClasses = [               // Array of hex color codes:
            "#D4B9DA", // light purple    // - Lightest color (lowest values)
            "#C994C7",                    // 
            "#DF65B0", // medium pink     // - Middle colors
            "#DD1C77", // dark pink       // 
            "#980043"  // burgundy        // - Darkest color (highest values)
        ];
    
        var domainArray = [];              // Initialize empty array to store numeric values
        for (var i = 0; i < data.length; i++) {  // Loop through each row in the CSV data
            var val = parseFloat(data[i][attribute]); // Convert the attribute value from string to number e.g., parse "12.5" → 12.5
            if (!isNaN(val)) {             // Validate the conversion was successful (filters out NaN/undefined), only proceed if we got a valid number
                domainArray.push(val);     // Add the numeric value to our domain array
            }
        }
    
        var colorScale = d3.scaleQuantile() // Creates a scale that divides data into equal-sized bins
            .range(colorClasses)           // Assigns our color gradient to the output
            .domain(domainArray);          // Sets the input data range (processed values)
    
        return colorScale; // Return the configured scaleNow ready to use like: colorScale(42) → returns a color
    }

    /**
     * Renders the complete map visualization
     * @param {object} map - D3 SVG selection
     * @param {object} geoData - Processed GeoJSON data
     * @param {object} projection - D3 geographic projection
     */
    function renderMap(map, geoData, csvData, projection) { // Renders the complete map visualization
        const path = d3.geoPath().projection(projection); // Path generator
        const colorScale = makeColorScale(csvData, expressed); // Generate color scale from data
        setGraticule(map, path);      // Add reference grid
        drawStates(map, geoData, path, colorScale); // Draw state polygons
    }

    /**
     * Adds graticule (latitude/longitude grid) to map
     * @param {object} map - D3 SVG selection
     * @param {function} path - D3 geographic path generator
     */
    function setGraticule(map, path) { // Adding a graticule
                
        // Background sphere (shows oceans)
        map.append("path")               // Create new SVG path element
            .datum({type: "Sphere"})    // Bind sphere geometry data (full map background)
            .attr("class", "gratBackground")  // Apply CSS class for styling (typically light blue)
            .attr("d", path);           // Generate path using the projection (fills viewport)
    
        // Latitude/longitude grid lines
        map.append("path")               // Create another SVG path element
            .datum(d3.geoGraticule()    // Generate graticule (grid) geometry
                .step([10, 10]))         // Set grid interval (10° latitude/longitude)
            .attr("class", "graticule")  // Apply CSS class (typically thin gray lines)
            .attr("d", path);            // Generate path using the same projection
    }
    
     /**
     * Draws all state polygons on the map
     * @param {object} map - D3 SVG selection
     * @param {object} geoData - Processed GeoJSON data
     * @param {function} path - D3 geographic path generator
     */
    function drawStates(map, geoData, path, colorScale) { // Creates SVG path elements for each geographic feature (state) in a D3 map visualization
        map.selectAll(".state") // Select all existing '.state' elements (empty selection on initial run) 
            .data(geoData.features) // Bind GeoJSON features array to DOM elements (data-join)
            .enter() // Create new elements for unmatched data (enter selection)
            .append("path") // Append SVG path element for each new feature
            .attr("class", d => {
                const stateClass = d.properties.name
                    .replace(/\s+/g, "-")    // Replace spaces with hyphens
                    .replace(/[^\w-]/g, "")  // Remove special chars
                    .toLowerCase();          // Optional: convert to lowercase
                
                return `state ${stateClass}`; // Returns "state mexico-city" etc.
            })
            // .attr("class", d => `state ${d.properties.name.replace(/\s+/g, "-")}`) // Set CSS class with Feature Name as class
            .attr("d", path) // Converts GeoJSON coordinates to SVG path commands, applies projection transofrmation
            .style("fill", d => {     // Apply choropleth coloring:
                const value = d.properties[expressed]; // Get current attribute value
                return value ? colorScale(value) : "#ccc"; // Use color scale or default gray
            });
    }
    
    function handleError(error) {
        console.error("Error loading data:", error);
        d3.select("body").append("div")
            .attr("class", "error")
            .text("Failed to load data. Check console for details.");
    }

       window.onload = setMap; // Execute setMap when window finishes loading
})();