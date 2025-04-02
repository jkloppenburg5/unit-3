(function(){
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
        
        let promises = [ // Array of data loading promises
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

            mexicoStates.features.forEach(function(state) {
                console.log(`${state.properties.adm1_code}: ${state.properties.name}`); // Log adm1_code + name for each state
            });

            // (Not hardened academic version) Variables for the Data Join
            const attrArray = ["AbductionRate","CrimeRate","EstPopOver18","MurderRate","SecPercep","State","adm1_code"]; // Define which CSV columns to transfer to GeoJSON properties

            for (var i = 0; i < csvData.length; i++) {  // Iterate through each CSV row to assign values to GeoJSON states and connect CSV rows to GeoJSON features
                // Get current CSV row and its unique identifier
                var currentState = csvData[i];  // Current state's data from CSV
                var csvKey = currentState.adm1_code;  // Unique ID (e.g., "MEX-2717")
            
                // GeoJSON matching loop - finds corresponding feature
                for (var a = 0; a < mexicoStates.features.length; a++) { // Loop through every feature (state polygon) in the GeoJSON dataset
                    // Access current GeoJSON feature and its properties
                    var geojsonFeature = mexicoStates.features[a]; // Single state polygon
                    var geojsonProps = geojsonFeature.properties;  // Property storage object
                    var geojsonKey = geojsonProps.adm1_code;  // GeoJSON's unique ID
            
                    // Core matching logic - links CSV row to GeoJSON feature
                    if (geojsonKey === csvKey) {  // When IDs match:
                        
                        // Transfer all specified attributes from CSV to GeoJSON
                        attrArray.forEach(function(attr) { // Iterates through each attribute name
                            var val = (attr === "State" || attr === "adm1_code") // Preserve strings for text fields, convert others to numbers
                                ? currentState[attr]  // Keep strings as-is
                                : parseFloat(currentState[attr]); // Convert values to number type
                            
                            geojsonProps[attr] = val;  // Store in GeoJSON properties
                        });
                        break; // Optimization: Stop searching after finding match
                    };
                }
            };

            // // Hardened version of the above
            // // 1. First validate your datasets
            // if (!mexicoStates?.features || !Array.isArray(mexicoStates.features)) {
            //     throw new Error("Invalid GeoJSON structure - missing features array");
            // }

            // if (!csvData || !Array.isArray(csvData)) {
            //     throw new Error("CSV data not loaded or invalid");
            // }

            // // 2. Define attributes (now with type hints)
            // const attrArray = [
            //     { name: "AbductionRate", type: "number" },
            //     { name: "CrimeRate", type: "number" },
            //     { name: "EstPopOver18", type: "number" },
            //     { name: "MurderRate", type: "number" }, 
            //     { name: "SecPercep", type: "number" },
            //     { name: "State", type: "string" },
            //     { name: "adm1_code", type: "string" }
            // ];

            // // 3. Data joining with robust error handling
            // let matchCount = 0;

            // csvData.forEach(currentState => {
            //     try {
            //         const csvKey = currentState?.adm1_code;
            //         if (!csvKey) {
            //             console.warn("Skipping row with missing adm1_code:", currentState);
            //             return;
            //         }

            //         const matchedFeature = mexicoStates.features.find(f => {
            //             const geoKey = f?.properties?.adm1_code;
            //             return geoKey === csvKey;
            //         });

            //         if (matchedFeature) {
            //             attrArray.forEach(({ name, type }) => {
            //                 const rawValue = currentState[name];
                            
            //                 if (rawValue === undefined) {
            //                     console.warn(`Missing ${name} for ${csvKey}`);
            //                     return;
            //                 }

            //                 matchedFeature.properties[name] = type === "number" 
            //                     ? Number(rawValue) 
            //                     : String(rawValue);
            //             });
            //             matchCount++;
            //         } else {
            //             console.warn("No GeoJSON match for:", csvKey);
            //         }
            //     } catch (error) {
            //         console.error("Error processing state:", currentState, error);
            //     }
            // });

            // console.log(`Successfully matched ${matchCount}/${csvData.length} states`);

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
})
