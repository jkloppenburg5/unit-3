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

// Dropdown change event handler - updates visualization when new attribute is selected
function changeAttribute(attribute, csvData) { 
    // Update the global variable storing the currently expressed attribute
    expressed = attribute;  // This will be used by other functions to know which data to display

    // Recreate the color scale with the new attribute's data range
    var colorScale = makeColorScale(csvData, expressed);  // Generates a new scale based on the selected attribute's values

    // Recolor all geographic regions on the map
    var states = d3.selectAll(".state")  // Select all map regions (SVG paths with class 'state')
        .style("fill", function (d) {       // Update each state's fill color
            var value = d.properties[expressed];  // Get the current attribute value for this state
            
            // Conditional coloring:
            if (value) {  // If the region has data for this attribute
                return colorScale(d.properties[expressed]);  // Apply color from the new scale
            } else {  // For states with missing data
                return "#ccc";  // Use a default gray color
            }
});

    //Sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        //Sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //recolor bars
        .style("fill", function(d){            
            var value = d[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
    });    
    
};

// function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartWidth / n);
        })
        //size/resize bars
        .attr("height", function(d, i){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        //color/recolor bars
        .style("fill", function(d){            
            var value = d[expressed];            
            if(value) {                
                return colorScale(value);            
            } else {                
                return "#ccc";            
            }    
    });
};