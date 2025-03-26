window.onload = setMap;

function setMap() {
    // Map frame dimensions
    const width = 800;
    const height = 600;
    
    const map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)

        const projection = d3.geoConicEqualArea() // As per advice from https://projectionwizard.org/    
        .center([7.27, 21.58])
        .rotate([108.27, -2.97, 0])
        .parallels([20.41, 59.94])
        .scale(1512.78)
        .translate([width / 2, height / 2]);
    
    var promises = [
        d3.csv("data/mxStateStats.csv"),
        d3.json("data/mxStatePoly.topojson")
    ];
    
    Promise.all(promises)
        .then(callback)
        .catch(error => {
            console.error("Error loading files:", error);
        });

    function callback(data) {
        var csvData = data[0];
        var mexicoPoly = data[1];
        console.log("TopoJSON objects:", Object.keys(mexicoPoly.objects));
        
        console.log("CSV Data:", csvData);
        console.log("Raw TopoJSON:", mexicoPoly);

        // Use the correct object name (change if different in your file)
        var objectName = "mexicoStates2"; // Update this if your object has a different name
        if (!mexicoPoly.objects[objectName]) {
            console.error(`Object '${objectName}' not found in TopoJSON`);
            return;
        }

        var mexicoStates = topojson.feature(mexicoPoly, mexicoPoly.objects[objectName]);
        console.log("Converted GeoJSON:", mexicoStates);
        console.log("Full first feature:", mexicoStates.features[0]); // Inspect entire feature
        console.log("9th feature:", mexicoStates.features[8]); // Inspect entire feature

        createMap(csvData, mexicoStates, map, width, height, projection);
    }
}

function createMap(csvData, mexicoStates, map, width, height, projection) {
    const path = d3.geoPath().projection(projection);

    // 1. FIRST add background (bottom layer)
    map.append("path")
        .datum({type: "Sphere"}) // Full globe background
        .attr("class", "gratBackground")
        .attr("d", path);

    // 2. THEN add graticule lines
    const graticule = d3.geoGraticule().step([10, 10]);
    map.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path);
    
    // 3. Draw all states (middle layer)
    map.selectAll(".state")
        .data(mexicoStates.features)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "state " + d.properties.name;
        })
        .attr("d", path)

}