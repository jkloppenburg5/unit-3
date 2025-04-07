(function(){
    
    /////////// CONFIGURATION CONSTRAINTS //////////
    const attrArray = ["AbductionRate","CrimeRate","EstPopOver18","MurderRate","SecPercep","State","adm1_code"];
    const attrLabels = {
        "State": "State",
        "adm1_code": "Admin Code",
        "EstPopOver18": "Est. Population Over 18 (in millions)",
        "MurderRate": "Murder Rate (per 100k)",
        "AbductionRate": "Abduction Rate (per 100k)", 
        "CrimeRate": "Total Crime Rate (per 100k)",
        "SecPercep": "Perceived Insecurity Index"
    };
    const topojsonObjectName = "mexicoStates2";
    let expressed = "AbductionRate";

    // Chart dimensions
    const chartWidth = window.innerWidth * 0.5,
        chartHeight = 460;   

    // Global yScale
    let yScale = d3.scaleLinear();

    ////////// MAIN MAP SETUP FUNCTION ////////// 
    function setMap() {
        const mapWidth = window.innerWidth * 0.425, mapHeight = 460;
        const map = initMap(mapWidth, mapHeight);
        const projection = initProjection(mapWidth, mapHeight);
        loadData(map, projection);
    }
    
    /////////// INITIALIZATION FUNCTIONS //////////
    function initMap(width,height){
        return d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
    }

    function initProjection(width, height) {
        return d3.geoConicEqualArea()
            .center([7.27, 21.58])
            .rotate([108.27, -2.97, 0])
            .parallels([20.41, 59.94])
            .scale(1200)
            .translate([width / 2, height / 2]);
    }

    /////////// DATA PROCESSING FUNCTIONS //////////
    function loadData(map, projection) {
        Promise.all([
            d3.csv("data/mxStateStats.csv"),
            d3.json("data/mxStatePoly.topojson")
        ])
        .then(([csvData, topoData]) => {
            const geoData = processGeoJSON(topoData, topojsonObjectName);
            const joinedData = joinData(geoData, csvData, attrArray);
            renderMap(map, joinedData, csvData, projection);
        })
        .catch(handleError);
    }
    
    function processGeoJSON(topoData, objectName) {
        if (!topoData.objects[objectName]) throw new Error(`TopoJSON object "${objectName}" not found!`);
        return topojson.feature(topoData, topoData.objects[objectName]);
    }
   
    function joinData(geoData, csvData, attrArray) {
        geoData.features.forEach(state => {
            const csvMatch = csvData.find(row => row.adm1_code === state.properties.adm1_code);
            if (csvMatch) {
                state.properties.State = csvMatch.State; 
                attrArray.forEach(attr => {
                    state.properties[attr] = parseFloat(csvMatch[attr]) || csvMatch[attr];
                });
            }
        });

        return geoData;
    }
    
    /////////// VISUALIZATION FUNCTIONS //////////
    function makeColorScale(data, attribute) {
        var colorClasses = [
            "#edf8e9",
            "#bae4b3",
            "#74c476",
            "#31a354",
            "#006d2c"
        ];
    
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][attribute]);
            if (!isNaN(val)) {
                domainArray.push(val);
            }
        }
    
        var colorScale = d3.scaleQuantile()
            .range(colorClasses)
            .domain(domainArray);
    
        return colorScale;
    }

    function setChart(csvData, colorScale) {
        let currentHighlight = null;
        
        // No margins
        const innerWidth = chartWidth;
        
        // Update yScale
        yScale.range([chartHeight, 0])
            .domain([0, d3.max(csvData, d => parseFloat(d[expressed])) * 1.1]);
        
        // Create SVG container
        let chartContainer = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .style("overflow", "visible")
            .attr("class", "chart");
        
        // Create chart group
        let chart = chartContainer.append("g");

        // Bar width calculation
        const barWidth = innerWidth / csvData.length;     

        // Create bars
        let bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .attr("class", "bars")
            .attr("width", barWidth * 0.98)
            .attr("x", (d,i) => i * barWidth)
            .attr("height", d => {
                const value = parseFloat(d[expressed]) || 0;
                return Math.max(0, yScale(0) - yScale(value));
            })
            .attr("y", d => {
                const value = parseFloat(d[expressed]) || 0;
                return yScale(value);
            })
            .style("fill", d => colorScale(d[expressed]));

        // Bar hover interactions
        bars.on("mouseover", function(event, d) {
            currentHighlight = d.adm1_code;
            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", "2px");
            
            const stateClass = d.adm1_code.replace(/\s+/g, "-").replace(/[^\w-]/g, "");
            d3.select(`.state.${stateClass}`)
                .style("stroke", "#000")
                .style("stroke-width", "2px");
            
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
            
            d3.selectAll(".bars").style("opacity", 0.3);
            d3.select(this).style("opacity", 1);
            
        }).on("mouseout", function(event, d) {
            if (currentHighlight === d.adm1_code) {
                resetHighlights();
            }
        });
        
        function resetHighlights() {
            d3.selectAll(".bars")
                .style("opacity", 1)
                .style("stroke", null)
                .style("stroke-width", null);
            
            d3.selectAll(".state")
                .style("stroke", function() {
                    return d3.select(this).classed("original-stroke") ? 
                        "rgba(0, 0, 0, 0.538)" : null;
                })
                .style("stroke-width", function() {
                    return d3.select(this).classed("original-stroke") ? 
                        "0.5px" : null;
                });
            
            d3.select(".map").selectAll(".state-name-label").remove();
            currentHighlight = null;
        }

        // Special hover rects for zero-value bars
        bars.filter(d => parseFloat(d[expressed]) === 0)
        .each(function(d) {
            const hoverRect = chart.append("rect")
                .attr("class", "zero-hover")
                .attr("x", d3.select(this).attr("x"))
                .attr("y", chartHeight - 20)
                .attr("width", d3.select(this).attr("width"))
                .attr("height", 20)
                .style("opacity", 0)
                .style("pointer-events", "all")
                .on("mouseover", function(event) {
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

        // Add chart title
        d3.select(".chartTitle").remove();
        chart.append("text")
            .attr("class", "chartTitle")
            .attr("text-anchor", "middle")    
            .attr("x", innerWidth / 2)
            .attr("y", 20)
            .text(attrLabels[expressed]);
        
        updateChart(bars, csvData.length, colorScale);
    };

    function renderMap(map, geoData, csvData, projection) {
        const path = d3.geoPath().projection(projection);
        const colorScale = makeColorScale(csvData, expressed);
        setGraticule(map, path);
        drawStates(map, geoData, path, colorScale);
        setChart(csvData, colorScale);
        createDropdown(csvData);
    }

    function setGraticule(map, path) {                
        map.append("path")
            .datum({type: "Sphere"})
            .attr("class", "gratBackground")
            .attr("d", path);
    
        map.append("path")
            .datum(d3.geoGraticule()
                .step([10, 10]))
            .attr("class", "graticule")
            .attr("d", path);
    }
    
    function drawStates(map, geoData, path, colorScale) {
        map.selectAll(".state")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("class", d => {
                const stateClass = d.properties.adm1_code
                    .replace(/\s+/g, "-")
                    .replace(/[^\w-]/g, "")
                return `state ${stateClass}`;
            })
            .attr("d", path)
            .style("fill", d => {
                const value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
            });
    }   
    
    function createDropdown(csvData){
        let dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        let titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        let attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return attrLabels[d] || d;  
            });
    };

    function changeAttribute(attribute, csvData, bars) { 
        expressed = attribute;
    
        d3.select(".chartTitle")
            .text(attrLabels[expressed]);
    
        const colorScale = makeColorScale(csvData, expressed);
    
        yScale.domain([0, d3.max(csvData, d => {
            const val = parseFloat(d[expressed]);
            return isNaN(val) ? 0 : val * 1.05;
        })]);
    
        // Removed y-axis related code
    
        d3.selectAll(".bars")
            .sort((a,b) => b[expressed] - a[expressed])
            .transition()
            .duration(500)
            .attr("x", (d,i) => i * (chartWidth / csvData.length))
            .attr("height", d => chartHeight - yScale(parseFloat(d[expressed])))
            .attr("y", d => yScale(parseFloat(d[expressed])))
            .style("fill", d => colorScale(d[expressed]));
    
        d3.selectAll(".state")
            .transition()
            .duration(500)
            .style("fill", d => {
                const value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
            });
        
        updateChart(bars, csvData.length, colorScale);
    }

    function updateChart(bars, n, colorScale) {
        const innerWidth = chartWidth;
        const barWidth = innerWidth / n * 0.98;
        const bottomPosition = yScale(0);
    
        bars.attr("x", (d,i) => i * (innerWidth / n))
            .attr("width", barWidth)
            .attr("height", d => {
                const value = parseFloat(d[expressed]) || 0;
                return bottomPosition - yScale(value);
            })
            .attr("y", d => yScale(parseFloat(d[expressed]) || 0))
            .style("fill", d => colorScale(d[expressed]));
    };

    function handleError(error) {
        console.error("Error loading data:", error);
        d3.select("body").append("div")
            .attr("class", "error")
            .text("Failed to load data. Check console for details.");
    }

    window.onload = setMap;
})();