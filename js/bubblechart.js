// Add all scripts to the JS folder

window.onload = function(){ // execute script when the window is loaded
    var w = 900, h = 500;  //SVG dimension variables

    var container = d3.select("body")  //This selects the HTML <body> element from the DOM and returns it to the variable container.
        .append("svg")  //Adding a new svg to the <body>
        .attr("width", w)  //Assign the width
        .attr("height", h)  //Assign the height
        .attr("class", container)  //Always assign a class (as the block name) for styling and future selection
        .style("background-color", "rgba(0,0,0,0.2)"); //only put a semicolon at the end of the block!
    
    var title = container.append("text") // Append a <text> element to the SVG container
        .attr("class", "title") // Assign a class for styling in CSS
        .attr("text-anchor", "middle") // Center the text horizontally, this centers the text horizontally around the x position (450 in this case)
        .attr("x", 450) // Set the x-position of the text
        .attr("y", 30) // Set the y-position of the text
        .text("City Populations"); // Set the text content

    var innerRect = container.append("rect") //put a new rect in the svg
        .datum(400)  //a single value is a DATUM
        .attr("width", function(d){return d * 2}) //rectangle width, d * 2 is 400 * 2 = 800 is returned.
        .attr("height", function(d){return d}) //rectangle height, d = 400, so 400 is returned.
        .attr("class", "innerRect")  //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis, this positions the text 30 pixels from the top of the SVG container.
        .style("fill", "#FFFFFF"); //fill color
    
    var cityPop = [ //complex array
        { city: 'Madison', population: 233209 },
        { city: 'Milwaukee', population: 594833 },
        { city: 'Green Bay', population: 104057 },
        { city: 'Superior', population: 27244 }
    ];

    var x = d3.scaleLinear() //create the x horizontal scale
        .range([90, 750]) //output min and max, the [0,0] coordinate of the SVG is its upper-left corner
        .domain([0, 3]); //input min and max

    var minPop = d3.min(cityPop, function(d){ //find the minimum value of the array
        return d.population; //return population data for each item in the array
    });

    var maxPop = d3.max(cityPop, function(d){ //find the maximum value of the array
        return d.population; //return population data for each item in the array
    }); 

    var color = d3.scaleLinear() //color scale generator 
        .range([ //"Visual Space"
            "#FDBE85", //From one color
            "#D94701"  //...to another
    ])
    .domain([  //"Data Space"
        minPop, 
        maxPop  
    ]);

    var y = d3.scaleLinear() //create the y vertical scale
        //Specify the minimum and maximum values that the scale will output. These values are typically used to map the input domain to a specific range of output values, such as positions on an SVG canvas.       
        //The [0,0] coordinate of the SVG is its upper-left corner.
        .range([450,50])  // while the range is the "visual space," 440: is 440 pixels from the top of the SVG container, 95: is 95 pixels from the top of the SVG container.  
        .domain([0,700000]) //Domain is the "data space"
    
    var circles = container.selectAll(".circles") //this binds the dataArray to the "empty" selection, since there are no .circles elements yet
        .data(cityPop) //here we feed in an array, e.g., bind an array to a selection above
        .enter() //this creates a placeholder for each data point that doesn’t yet have a corresponding DOM element.  In this case, it creates placeholders for all four cities.
        .append("circle") //add a circle for each datum, this appends an SVG <circle> element for each data point.
        .attr("class", "circles") //this assigns the class "circles" to each circle.
        .attr("id", function(d){ //Sets the id of each circle to the city name (e.g., Madison, Milwaukee, etc.). This can be useful for styling or selecting specific circles later.
            return d.city; // What happens if not returned? The circles would still be created and positioned correctly, but they would lack unique identifiers.  You wouldn’t be able to easily target specific circles for styling or interaction.
        })
        .attr("r", function(d,i){ //setting the circle radius as a function of some data 'd' for a give circle in the index 'i'
            var area = d.population * 0.01 //Scales the population to a smaller value to make the circle sizes manageable.
            return Math.sqrt(area/Math.PI); //Converts the area into a radius using the formula for the area of a circle (A = πr²).
        })
        .attr("cx", function(d,i){ //This sets the cx (center x-coordinate) or horizontal position of each circle. 
            return x(i) //use the scale generator with the index to place each circle horizontally
        })
        .attr("cy", function(d){ //this sets the cy (center y-coordinate) of each circle. 
            return y(d.population); //Pass d.population to the scaler above (y(d.population)), so it calculates the corresponding vertical position (cy) for a given population value.
        })
        .style("fill", function(d, i){ //add a fill based on the color scale generator
            return color(d.population); //This returns the color generated by the color scale for the given population value.
        })
        .style("stroke", "#000"); //black circle stroke

    var yAxis = d3.axisLeft(y); //Create y-axis "generator," creates a left-oriented y-axis using the y scale.

    var axis = container.append("g") //Create a <g> element for the axis
        .attr("class", "axis") //Assigns a class (axis) to the group for styling purposes (e.g., using CSS).
        .attr("transform", "translate(50, 0)") //Move the axis 50px to the right, soit's visible in the SVG
        .call(yAxis); //Calls the y-axis generator (yAxis) to render the axis inside the <g> element.
    
    var labels = container.selectAll(".labels") // Select all elements with class "labels" (initially empty)
        .data(cityPop) // Bind the cityPop data array to the selection
        .enter() // Create placeholders for new data points
        .append("text") // Append a <text> element for each new data point
        .attr("class", "labels") // Assign the class "labels" to each <text> element
        .attr("text-anchor", "left") // Align the text to the left
        .attr("y", function(d) {
            return y(d.population) + 0; // Set the vertical position of the text
        });
    
    var firstLine = labels.append("tspan") // Append a <tspan> element to each label
        .attr("class","firstLine") // Assign the class "firstLine" to each <tspan>
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; //horizontal position to the right of each circle
        })
        .text(function(d){
            return d.city; // Set the text content to the city name
        });
    
    var format = d3.format(","); // Format specifier returns a generator function, which can then be passed a value to format, in this case population values with a comma

    var secondLine = labels.append("tspan") // Append a <tspan> element to each label
        .attr("class","secondLine") // Assign the class "secondLine" to each <tspan>
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; //horizontal position to the right of each circle
        })
        .attr("dy","15") // Vertical offset for the second line so it doesn't overlap the top line.
        .text(function(d){
            return "Pop. " + format(d.population); // Set the text content to the city population
        });

};
