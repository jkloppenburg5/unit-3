(function(){
    
    /////////// CONFIGURATION CONSTRAINTS //////////
    // const width = 800; // Set map width in pixels
    // const height = 600; // Set map height in pixels
    const attrArray = ["AbductionRate","CrimeRate","EstPopOver18","MurderRate","SecPercep","State","adm1_code"]; // Define which CSV columns to transfer to GeoJSON properties
    const attrLabels = { // Define useful data labels
        "State": "State",
        "adm1_code": "Admin Code",
        "EstPopOver18": "Estimated Population Over 18",
        "MurderRate": "Murder Rate (per 100k)",
        "AbductionRate": "Abduction Rate (per 100k)", 
        "CrimeRate": "Total Crime Rate (per 100k)",
        "SecPercep": "Perceived Insecurity Index"
    };
    const topojsonObjectName = "mexicoStates2"; // Name of TopoJSON object containing states
    let expressed = "AbductionRate"; // Currently visualized attribute

    ////////// MAIN MAP SETUP FUNCTION ////////// 
    function setMap() {
        const mapWidth = window.innerWidth * 0.425, mapHeight = 460; // Map frame dimensions
        const map = initMap(mapWidth, mapHeight); // Create SVG container
        const projection = initProjection(mapWidth, mapHeight); // Set up map projection
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
            // .scale(1512.78) // Set projection scale factor, as per https://uwcart.github.io/d3-projection-demo/
            .scale(1200) // Set projection scale factor, as per https://uwcart.github.io/d3-projection-demo/
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
            if (csvMatch) {
                state.properties.State = csvMatch.State; 
                attrArray.forEach(attr => {
                    state.properties[attr] = parseFloat(csvMatch[attr]) || csvMatch[attr];
                });
            }
        });

        console.log("Converted GeoJSON:", geoData); // Log converted GeoJSON

        return geoData; // Newly enhanced GeoJSON now with CSV data
    }
    
    /////////// VISUALIZATION FUNCTIONS //////////
    function getColorScheme() {
        return [                // Returns an array of color hex codes for choropleth
            "#edf8e9",          // Lightest color for lowest values
            "#bae4b3",          // 
            "#74c476",          // Middle color for median values
            "#31a354",          // 
            "#006d2c"           // Darkest color for highest values
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
            "#edf8e9",          // Lightest color for lowest values
            "#bae4b3",          // 
            "#74c476",          // Middle color for median values
            "#31a354",          // 
            "#006d2c"           // Darkest color for highest values
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
     * Creates coordinated bar chart synced with choropleth map
     * @param {Array} csvData - State stats matching map data
     * @param {d3.scale} colorScale - Map's color scale for consistency
     */
    function setChart(csvData, colorScale){ 
        let currentHighlight = null; // Track active highlight
        const chartWidth = window.innerWidth * 0.5,  // 42.5% width (map uses remainder)
            chartHeight = 460;                       // Matches map height
        
        let chart = d3.select("body")                  // Targets document body
            .append("svg")                             // Adds SVG as body's last child
            .attr("width", chartWidth)                 // Viewport width in px
            .attr("height", chartHeight)               // Viewport height in px
            .attr("class", "chart");                   // Enables CSS/D3 selections

        // let yScale = d3.scaleLinear()                  // Create the y vertical scale
        //     .range([chartHeight, 0])                   // Output min and max, the [0,0] coordinate of the SVG is its upper-left corner.
        //     .domain([                                  // Input min and max
        //         0, // Minimum baseline (0 for bar charts)
        //         d3.max(csvData, d => +d[expressed]) // Dynamic max from my data
        //     ]);
        
        let yScale = d3.scaleLinear() // Create the y vertical scale
            .range([0, chartHeight])  // Output min and max, the [0,0] coordinate of the SVG is its upper-left corner.
            .domain([  // Input min and max
                0, // Minimum baseline (0 for bar charts)
                d3.max(csvData, d => { // Dynamic max from my data
                    // Safely parse the value, default to 0 if invalid
                    const val = parseFloat(d[expressed]);
                    console.log("Max value:", d3.max(csvData, d => parseFloat(d[expressed])));
                    return isNaN(val) ? 0 : val;
                }) * 1.05 // Add 5% padding
            ]);

        let bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.state;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / csvData.length);
            })
            // .attr("height", 460)
            // .attr("y", 0);

            //             SVG Coordinate System (0,0 at top-left)
            // ┌───────────────────────┐
            // │                       │ ← y=0 (top edge)
            // │    █ (y position)     │
            // │    █                  │
            // │    █                  │ ← height (data value in pixels)
            // │    █                  │
            // │_______________________│ ← y=chartHeight (bottom edge)

            .attr("height", function(d){ // In SVG, height is always the downward extension from the specified y-position
                return yScale(parseFloat(d[expressed])); // Represents the data value converted to pixel height, the vertical length of each bar.
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])); // Sets the vertical starting position of each bar. Positions bars from the bottom up (SVG coordinates start at top-left).
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });
          
            bars.on("mouseover", function(event, d) {
                // Clear any pending resets
                d3.select(this).interrupt();
                d3.selectAll(".state").interrupt();
                
                // Store current selection
                currentHighlight = d.adm1_code;
                
                // Highlight the bar
                d3.select(this)
                    .style("stroke", "#000")
                    .style("stroke-width", "2px");
                
                // Highlight corresponding state on map
                const stateClass = d.adm1_code.replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                const statePath = d3.select(`.state.${stateClass}`);
                
                console.log("Highlighting:", stateClass, "Element:", statePath.node());
                
                statePath
                    .style("stroke", "#000")
                    .style("stroke-width", "2px");
                
                // Add state name to map
                d3.select(".map").selectAll(".state-name-label").remove();
                d3.select(".map").append("text")
                    .attr("class", "state-name-label")
                    .attr("x", "50%")
                    .attr("y", 30)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("font-weight", "bold")
                    .style("fill", "#333")
                    .text(d.State);
                
                // Dim other bars
                d3.selectAll(".bars")
                    .style("opacity", 0.3);
                d3.select(this)
                    .style("opacity", 1);
                
            }).on("mouseout", function(event, d) {
                // Only reset if this is still the current highlight
                if (currentHighlight === d.adm1_code) {
                    resetHighlights();
                }
            });
            
            function resetHighlights() {
                // Reset bars
                d3.selectAll(".bars")
                    .style("opacity", 1)
                    .style("stroke", null)
                    .style("stroke-width", null);
                
                // Reset states
                d3.selectAll(".state")
                    .style("stroke", function() {
                        return d3.select(this).classed("original-stroke") ? 
                               "rgba(0, 0, 0, 0.538)" : null;
                    })
                    .style("stroke-width", function() {
                        return d3.select(this).classed("original-stroke") ? 
                               "0.5px" : null;
                    });
                
                // Remove label
                d3.select(".map").selectAll(".state-name-label").remove();
                currentHighlight = null;
            }
            
            function drawStates(map, geoData, path, colorScale) {
                map.selectAll(".state")
                    .data(geoData.features)
                    .enter()
                    .append("path")
                    .attr("class", d => `state ${d.properties.adm1_code} original-stroke`)
                    .attr("d", path)
                    .style("fill", d => colorScale(d.properties[expressed]))
                    .style("stroke", "rgba(0,0,0,0.538)")
                    .style("stroke-width", "0.5px");
            }


        let numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", "number-label") // Simplified class
            .attr("text-anchor", "middle")
            .attr("x", function(d, i) {
                const barWidth = chartWidth / csvData.length;
                return i * barWidth + barWidth / 2; // Perfect center of bar
            })
            .attr("y", function(d) {
                return chartHeight - yScale(parseFloat(d[expressed])) - 15; // 15px above bar, works for values of zero.
            })
            .style("font-size", "10px") // Explicit small size
            .style("fill", "#333") // Darker color for readability
            // .attr("transform", "rotate(-45)")
            .attr("dy", "1em") // Adjust vertical offset
            .text(d => d[expressed]);
            
        let chartTitle = chart.append("text")
            .attr("text-anchor", "middle")    
            .attr("x", chartWidth / 2)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(attrLabels[expressed]); // Just show the label without data values

        // //create vertical axis generator
        // var yAxis = d3.axisLeft()
        // .scale(yScale);

        // //place axis
        // var axis = chart.append("g")
        //     .attr("class", "axis")
        //     .attr("transform", translate)
        //     .call(yAxis);
            
    };








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
        setChart(csvData, colorScale); // Create coordinated bar chart
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
                const stateClass = d.properties.adm1_code
                    .replace(/\s+/g, "-")    // Replace spaces with hyphens
                    .replace(/[^\w-]/g, "")  // Remove special chars
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