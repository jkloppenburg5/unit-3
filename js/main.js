window.onload = setMap; //

function setMap(){ //
    var promises = [ // This array holds promises for loading the CSV and TopoJSON files.
        d3.csv("data/mxStateStats.csv"),
        d3.json("data/mxStatepoly.topojson")
    ];
    Promise.all(promises).then(callback);

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
    // Set up SVG container
    var width = 800, height = 600;
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a projection
    var projection = d3.geoMercator()
        .fitSize([width, height], mexicoStates);

    // Create a path generator
    var path = d3.geoPath()
        .projection(projection);

    // Draw the map
    svg.selectAll("path")
        .data(mexicoStates.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "steelblue")
        .attr("stroke", "white");
}