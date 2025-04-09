(function(){
    
    /////////// CONFIGURATION CONSTRAINTS //////////
    const attrArray = ["AbductionRate","CrimeRate","EstPopOver18","MurderRate","SecPercep"]; // Define which CSV columns to transfer to GeoJSON properties
    const attrLabels = { // Define useful data labels
        "EstPopOver18": "Estimated Population Over 18",
        "MurderRate": "Murder Rate (per 100k)",
        "AbductionRate": "Abduction Rate (per 100k)", 
        "CrimeRate": "Total Crime Rate (per 100k)",
        "SecPercep": "Perceived Insecurity Index"
    };
    const topojsonObjectName = "mexicoStates2"; // Name of TopoJSON object containing states
    let expressed = "AbductionRate"; // Currently visualized attribute
    const chartWidth = window.innerWidth * 0.5;    // 42.5% width (map uses remainder)
    const chartHeight = 460;                         // Matches map height
    const leftMargin = 25; // Just adding left margin
    const yScale = d3.scaleLinear().range([chartHeight,0]); // Initialize with range
    window.onload = setMap; // Execute setMap when window finishes loading

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
        let currentHighlight = null;                   // Track active highlight
        
        let chart = d3.select("body")                  // Targets document body
            .append("svg")                             // Adds SVG as body's last child
            .attr("width", chartWidth)                 // Viewport width in px
            .attr("height", chartHeight)               // Viewport height in px
            .attr("class", "chart");                   // Enables CSS/D3 selections
        
        // Configure the yScale (already declared globally)
        yScale.domain([0, d3.max(csvData, d => {
            const val = parseFloat(d[expressed]);
            return isNaN(val) ? 0 : val;
        }) * 1.05]);

        // Add y-axis to left side
        chart.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${leftMargin},0)`)
            .call(d3.axisLeft(yScale));

        // Create bars for each data point
        let bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort((a,b) => b[expressed]-a[expressed]) // Sort descending
            .attr("class", d => "bar " + d.adm1_code)    // Assign class
            .attr("width", (chartWidth - leftMargin) / csvData.length - 1);
            // .on("mouseover",function(event, d){
            //     highlight(d); // Because in the CSV, the adm1_code is at the root level, not in root/properties like the GeoJSON
            // });

        // Bar hover interactions
        bars.on("mouseover", function(event, d) {
            currentHighlight = d.adm1_code;          // Track active state
            d3.select(this)                          // Highlight bar
                .style("stroke", "#000")
                .style("stroke-width", "2px");
            
            // Highlight corresponding map state
            const stateClass = d.adm1_code.replace(/\s+/g, "-").replace(/[^\w-]/g, "");
            d3.select(`.state.${stateClass}`)
                .style("stroke", "#000")
                .style("stroke-width", "2px");
            
            // Add state name label to map
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
            d3.selectAll(".bar").style("opacity", 0.3);
            d3.select(this).style("opacity", 1);
            
        }).on("mouseout", function(event, d) {
            if (currentHighlight === d.adm1_code) {  // Only reset if still active
                resetHighlights();
            }
        });
        
        function resetHighlights() {
            // Restore default bar styles
            d3.selectAll(".bar")
                .style("opacity", 1)
                .style("stroke", null)
                .style("stroke-width", null);
            
            // Restore default map state styles
            d3.selectAll(".state")
                .style("stroke", function() {
                    return d3.select(this).classed("original-stroke") ? 
                        "rgba(0, 0, 0, 0.538)" : null;
                })
                .style("stroke-width", function() {
                    return d3.select(this).classed("original-stroke") ? 
                        "0.5px" : null;
                });
            
            // Remove state name label
            d3.select(".map").selectAll(".state-name-label").remove();
            currentHighlight = null;
        }
            
        // Special hover rects for zero-value bars
        bars.filter(d => parseFloat(d[expressed]) === 0)
        .each(function(d) {
            const hoverRect = chart.append("rect")
                .attr("class", "zero-hover")
                .attr("x", d3.select(this).attr("x"))    // Match bar position
                .attr("y", chartHeight - 20)             // Position at bottom
                .attr("width", d3.select(this).attr("width")) // Match bar width
                .attr("height", 20)                      // Fixed height
                .style("opacity", 0)                     // Invisible
                .style("pointer-events", "all")           // But interactive
                .on("mouseover", function(event) {       // Same as bar hover
                    const stateClass = d.adm1_code.replace(/\s+/g, "-").replace(/[^\w-]/g, "");
                    currentHighlight = d.adm1_code;
                    d3.select(`.state.${stateClass}`)
                        .style("stroke", "#000")
                        .style("stroke-width", "2px");
                    d3.select(".map").append("text")
                        .attr("class", "state-name-label")
                        .attr("x", "50%")
                        .attr("y", 30)
                        .text(d.State);
                })
                .on("mouseout", function() {
                    if (currentHighlight === d.adm1_code) {
                        resetHighlights();
                    }
                });
        });
    
        // Use update function
        updateChart(bars, csvData.length, colorScale);

        // Add chart title
        chart.append("text")
            .attr("text-anchor", "middle")    
            .attr("x", leftMargin + (chartWidth - leftMargin) / 2)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(attrLabels[expressed]);   
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
        createDropdown(csvData);
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
            // .on("mouseover",function(event, d){
            //     highlight(d.properties);
            // });
    }
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        // Adding an element to the DOM for the menu
        let dropdown = d3.select("body") // Creating a variable called Dropdown to hold Select element
            .append("select") // Add a Select element to the Body
            .attr("class", "dropdown") // Assigna class for CSS
            .on("change", function(){ // Listen for a "change" interaction on the <select> element
                changeAttribute(this.value, csvData) // Parameters: value of the <select> element (referenced by this) which holds the attribute selected by the user, and csvData
            });

        //Add initial menu option
        let titleOption = dropdown.append("option") // Block creates an <option> element with no value attribute 
            .attr("class", "titleOption")                   // Assign a class for CSS
            .attr("disabled", "true")                       // Disable it from being accidentially selected
            .text("Select Attribute");                      // Instructional text to serve as an affordance alerting users that they should interact with the dropdown menu 

        // Add attribute name options to dropdown menu
        let attrOptions = dropdown.selectAll("attrOptions") // Select all potential option elements (initially empty)
            .data(attrArray)                                // Bind the array of attribute names to the selection
            .enter()                                       // Get the enter selection (data without elements)
            .append("option")                              // Append an <option> element for each new data point
            .attr("value", function(d){ return d })        // Set the option's value attribute to the attribute name
            .text(function(d){ return attrLabels[d] || d;  // Use the friendly label if available, fallback to raw name});  
            });
    };

    function changeAttribute(attribute, csvData) { 
        // Update the global variable storing the currently expressed attribute
        expressed = attribute;  // This will be used by other functions to know which data to display
    
        // Recreate the color scale with the new attribute's data range
        const colorScale = makeColorScale(csvData, expressed);  // Generates a new scale based on the selected attribute's values
    
        // Update y-scale domain for new attribute
        yScale.domain([0, d3.max(csvData, d => {const val = parseFloat(d[expressed]);return isNaN(val) ? 0 : val;}) * 1.05]);
    
        // Recolor all geographic regions on the map
        d3.selectAll(".state")
            .style("fill", function (d) {
                const value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
        });

        // Update chart
        const bars = d3.selectAll(".bar")
            .sort((a, b) => b[expressed] - a[expressed]);

        updateChart(bars, csvData.length, colorScale);

        // Update chart title
        d3.select(".chartTitle").text(attrLabels[expressed]);
    };

    function updateChart(bars, numBars, colorScale) {
        //    SVG Coordinate System (0,0 at top-left)
        // ┌───────────────────────┐
        // │                       │ ← y=0 (top edge)
        // │    █ (y position)     │
        // │    █                  │
        // │    █                  │ ← height (data value in pixels)
        // │    █                  │
        // │_______________________│ ← y=chartHeight (bottom edge)

        // Position bars based on new sort order
        // bars.attr("x", (d, i) => i * (chartWidth / numBars))
        //     // Resize bars
        //     .attr("height", d => yScale(parseFloat(d[expressed])))
        //     // Reposition bars vertically
        //     .attr("y", d => chartHeight - yScale(parseFloat(d[expressed])))
        //     // Recolor bars
        //     .style("fill", d => {
        //         const value = d[expressed];
        //         return value ? colorScale(value) : "#ccc";
        //     });
        
        // Update bars (positioned with left margin)
        bars.attr("x", (d, i) => i * ((chartWidth - leftMargin) / numBars) + leftMargin)
            // Height from bottom minus scaled position
            .attr("height", d => chartHeight - yScale(parseFloat(d[expressed])))
            // Position from top using scaled value
            .attr("y", d => yScale(parseFloat(d[expressed])))
            .style("fill", d => colorScale(d[expressed]));
        
        // Update y-axis
        d3.select(".y-axis").call(d3.axisLeft(yScale));

    }

    // //function to highlight enumeration units and bars
    // function highlight(props){ //props is the properties object of the selected element from the GeoJSON data or the attributes object from the CSV data
    //     //change stroke
    //     var selected = d3.selectAll("." + props.adm1_code) // Props.adm1_code is dynamically inserted (e.g., if adm1_code = "MEX-01", the selector becomes ".MEX-01").  Combined, it selects all elements with the class MEX-01.
    //         .style("stroke", "blue")
    //         .style("stroke-width", "2");
    // };

    // function highlight(props) {
    //     // Ensure props exists and has adm1_code
    //     if (!props || !props.adm1_code) {
    //         console.warn("Invalid properties object:", props);
    //         return;
    //     }
        
        // // Reset all highlights first
        // d3.selectAll(".state, .bar")
        //     .style("stroke", null)
        //     .style("stroke-width", null);
    
    //     // Apply highlight to matching elements
    //     const selector = "." + props.adm1_code.replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    //     d3.selectAll(selector)
    //         .style("stroke", "blue")
    //         .style("stroke-width", "2");
    // }
    
    function handleError(error) {
        console.error("Error loading data:", error);
        d3.select("body").append("div")
            .attr("class", "error")
            .text("Failed to load data. Check console for details.");
    }

})();