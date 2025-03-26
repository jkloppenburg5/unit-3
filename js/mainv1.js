window.onload = setMap; //

function setMap(){ //
    var promises = [ // This array holds promises for loading the CSV and TopoJSON files.
        d3.csv("data/mxStateStats.csv"),
        d3.json("data/mxStatePoly.topojson")  // ← Verify this path
            // .then(function(data) {
            // console.log("Data loaded:", data); // Check if this logs
            // })
            // .catch(function(error) {
            // console.error("Error loading file:", error); // This will show fetch errors
            // })
    ];
    
    Promise.all(promises)
        .then(callback)
        .catch(error => console.error("Error loading files:", error));

    function callback(data){
        var csvData = data[0];
        var mexicoPoly = data[1];
        console.log(csvData);
        console.log(mexicoPoly);    

        //translate europe TopoJSON
        var mexicoStates = topojson.feature(mexicoPoly, mexicoPoly.objects.mexicanStates1);
        // var mexicoStates = topojson.feature(topoJsonData, topoJsonData.objects.mexicanStates1);

        //examine the results
        console.log(mexicoStates);

        // Call a function to create the map
        createMap(csvData, mexicoStates);
    }
};

function createMap(csvData, mexicoStates) {
    var width = 800, height = 600; // Map frame dimensions
    var svg = d3.select("body") // Set up SVG container
        .append("svg")
        .attr("class","map")
        .attr("width", width)
        .attr("height", height);

    // Create a projection
    var projection = d3.geoMercator()
        .fitSize([width, height], mexicoStates);

    // Create a path generator
    var path = d3.geoPath()
        .projection(projection);

    // Draw the map
    svg.selectAll("path.state")
        .data(mexicoStates.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "steelblue")
        .attr("stroke", "white");
    
}