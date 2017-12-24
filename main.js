// svg parameters
//--Create a brush to select multiple elements and display them in the table
//--Then while hovering over the table mark them in the plot

var svgHeight = 200;
var svgWidth = 500;

var dataD = [];

padding = {"bottom" : 40, "top" : 10, "right": 10, "left" :40};
paddingAxis = {"bottom": 15, "left": 15};

// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function() {  
	return this.each(function(){
	this.parentNode.appendChild(this);
	});
};

d3.selection.prototype.moveToBack = function() {  
	return this.each(function() { 
	var firstChild = this.parentNode.firstChild; 
	if (firstChild) { 
			this.parentNode.insertBefore(this, firstChild); 
		} 
	});
};

// Creating the table
var table = d3.select("#tableDiv").append("table").attr("id", "safetyTable");
var thead = table.append("thead");
var tbody = table.append("tbody");

// clickCount for rotating over colors in selection
var clickCount = 0;
var numColor = 8;
var clickColorScale = d3.scaleQuantize().domain([0,numColor]).range(['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99']);

d3.csv("airline-safety.csv", function(error, data) { 
	if(error) throw error;

	console.log("d=" + data);
	dataD = data;

	// Array for header of the table
	header = Object.keys(data[0]);

	//Creating the header of the table
	thead.append("tr").selectAll("th")
		.data(header)
		.enter()
		.append("th")
		.text(function(d){
			return d;
		});


	//svgPlotIFF -> svgPlot Incidents, Fatal accidents, Fatalities
	var svg = d3.select("#scatterplot1").append("svg").attr("id", "svgPlotIFF")
		.attr("height", svgHeight)
		.attr("width", svgWidth);

	var xExtent = d3.extent(data, function(d) { return parseInt(d.incidents_85_99) } );
	var yExtent = d3.extent(data, function(d) { return parseInt(d.fatal_accidents_85_99) } );
	var rExtent = d3.extent(data, function(d) {return parseInt(d.fatalities_85_99) } );
	var extent = d3.extent(data, function(d) { return parseInt(d.incidents_85_99) } )
	console.log("xExtent= " + xExtent + ", yExtent= " + yExtent);
	console.log("Extent =" + extent);

	var xScale = d3.scaleLinear().domain([xExtent[0], xExtent[1]]).range([0+padding.left, svgWidth-padding.right]);
	var yScale = d3.scaleLinear().domain([yExtent[0], yExtent[1]]).range([svgHeight-padding.bottom, 0+padding.top]);
	var rScale = d3.scaleSqrt().domain([rExtent[0], rExtent[1]]).range([4,10]);
	var colorScale = d3.scaleLinear().domain([rExtent[0], rExtent[1]]).range(['#fee5d9', '#a50f15']);

	var brush = d3.brush()
		.on("start", brushStart)
		.on("brush", brushMove)
		.on("end", brushEnd);
	
	d3.select("#svgPlotIFF").append("g").attr("class", "brush").call(brush);

	// incidents vs fatalities , with radius size and color corresponding to the number of fatalities
	// To do -> create a brushing and resizeing of the axis for each of the points
	d3.select("#svgPlotIFF").selectAll("empty")
		.data(data)
		.enter()
		.append("g")
		.append("circle")
		.attr("class", function(d,i) {
			var classStr = "circle_" + i;
			return classStr;
		})
		// circle1 class is used to reset the colors in brusend1 on no selection
		.classed("circle1", true)
		.attr("cx", function(d) {
			return xScale(d.incidents_85_99);
		})
		.attr("cy", function(d) {
			return yScale(d.fatal_accidents_85_99);
		})
		.attr("r", function(d) {
			return rScale(d.fatalities_85_99);
		})
		.attr("fill", function(d) {
			return colorScale(d.fatalities_85_99);
		})
		.attr("stroke", "white")
		.attr("stroke-width", "1")
		.on("click", mouseClick)
		.on("mouseover", mouseOver)
		.on("mousemove", mouseMove)
		.on("mouseout", mouseOut);

		// Axis
		var xAxis = d3.axisBottom().scale(xScale).ticks(5);
		d3.select("#svgPlotIFF").append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate ( 0 " + (svgHeight - padding.bottom) + " ) " )
			.call(xAxis);

		d3.select("#svgPlotIFF").append("g")
			.attr("id", "xLabel")
			.append("text")
			.attr("x", padding.left+(svgWidth-padding.left-padding.right)/2 )
			.attr("y", (svgHeight-paddingAxis.bottom) )
			.attr("font-size", "10")
			.text("Incidents_85_99")

		var yAxis = d3.axisLeft().scale(yScale).ticks(5);
		d3.select("#svgPlotIFF").append("g")
			.attr("class", "yAxis")
			.attr("transform", "translate (" + padding.left + " 0)" )
			.call(yAxis);

		d3.select("#svgPlotIFF").append("g")
			.attr("id", "yLabel")
			.append("text")
			.attr("x", paddingAxis.left)
			.attr("y", svgHeight/2 )
			.attr("transform" , "rotate (-90 " + paddingAxis.left + ", " + (svgHeight/2) + ")" )
			.attr("font-size", "10")
			.text("Fatal Accidents");

	// mouseclick
	function mouseClick(d, i) {
		// Create table for selected circle
		console.log("table d=" + d + ", header= " + header);

		// cant use 'd' directly in data, so clickData is created
		var clickData = d;
		//debugger;
		var cells = tbody.append("tr").attr("class", "rowSeen")
			// border color of table same as the selected color on clicking
			.style("border", function() {
				return ("10px solid " + clickColorScale(clickCount));
			})
			//.style("border-top-width", "10px")
			.selectAll("td")
			.data(function(clickData) {
				// header.map ==> creates a map for all the keys such that each key is the column, and the value
				// for each key is stored in the value. Creates a data element with 4 objects.
				return header.map(function(column) {
					return {column: column, value: d[column]};
				})
			})
			.enter()
			.append("td")
			// here the 'd' is the data that we created from each row in the data element.
			.text(function(d) {
				return d.value;
			})
			.style("background-color", function(d) {
				if (d.column=="fatalities_85_99" || d.column=="fatalities_00_14") {
					return colorScale(d.value);
				} else { 
					return "white";
				}
			});

		// Once you click the color will remain as blue
		var selClass = ".circle_" + i;
		// ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99']
		d3.selectAll(selClass).attr("fill", function() {
			return clickColorScale(clickCount);
		});
		if (clickCount < numColor ){
			clickCount = clickCount + 1;
		} else if (clickCount >= numColor ) {
			clickCount = 0;
		}
	}


	// function mouseOver and mouseOut
	function mouseOver(d, i) {
		console.log("MouseOver" + ", this= " + this);
		//console.log("this= ", this );	
		//debugger;
		svg.append("g")
			.attr("class", "cLabel")
			.append("text")
			.attr("x", (this.cx.baseVal.value + 5) )
			.attr("y", this.cy.baseVal.value)
			.text(Math.round(xScale.invert(this.cx.baseVal.value)) + " , " + Math.round(yScale.invert(this.cy.baseVal.value)) + " , " + this.__data__.fatalities_85_99 + ", " + this.__data__.airline );

		// Highlighting the selected circle
		var classSel = "."+ this.className.baseVal;
		d3.selectAll(classSel).classed("highlight", true);
		d3.selectAll(classSel).moveToFront(); // Not working yet

	}

	function mouseMove() {
		console.log("mouseMove" + " , this= " + this);
	}

	function mouseOut() {
		console.log("MouseOut" + ", this= " + this);
		d3.selectAll(".cLabel").remove();
		d3.selectAll(".highlight").classed("highlight", false);
	}


	var idleTimeout, 
			idleDelay=350;

	// Need to be inside the csv call, for preserving the scope of xExtent and yExtent
	var prevBrushSelection ;
	function brushStart() {
		if (prevBrushSelection != this) {
			// CLear the previous brush
			d3.select(prevBrushSelection).call(brush.move, null);
			prevBrushSelection = this;
		}
	}

	function brushMove() {
		// Select all the circles in the brush
		//This gives the x0 y0, x1 y1 of the brush
		var e = d3.brushSelection(this);
		console.log("-----brushMove--------");
		d3.selectAll("circle").classed("hidden", function(d) {
			console.log("d =" + d + ", e= " + e);
			return ( e[0][0]  <= xScale(d.incidents_85_99) && e[1][0] >= xScale(d.incidents_85_99) 
			&& e[0][1] <= yScale(d.fatal_accidents_85_99) && e[1][1] >= yScale(d.fatal_accidents_85_99) 
			);
		});

		// Create a table of all the selected circles
		var tableSel = d3.selectAll(".hidden");
		//debugger;
	}

	function brushEnd() {
		// This is activated on double clicking null on svg
		console.log("---- Brush End -------");
		var e = d3.brushSelection(this);
		//Deselecting all the circles on no selection
		if(e == null ) {
			d3.selectAll("circle").classed("hidden", false);
		}
		
	}

	function idled() {
		idleTimeout = null;
	}

	function zoom1() {
		//console.log("this in zoom= " + this);
		//debugger;
		var t = svg.transition().duration(750);
		svg.select(".xAxis").transition(t).call(xAxis);
		svg.select(".yAxis").transition(t).call(yAxis);

		svg.selectAll("circle").transition(t)
			.attr("cx", function(d) {
				if (xScale(d.incidents_85_99) >= padding.left && yScale(d.fatal_accidents_85_99) <= svgHeight-padding.bottom) {
					console.log("cx= " + xScale(d.incidents_85_99) );
					return xScale(d.incidents_85_99);
				}
			})
			.attr("cy", function(d) {
				if (xScale(d.incidents_85_99) >= padding.left && yScale(d.fatal_accidents_85_99) <= svgHeight-padding.bottom) {
					//console.log("cy= " + yScale(d.fatal_accidents_85_99) );
					return yScale(d.fatal_accidents_85_99);
				}
			})
			.attr("r", function(d) {
				if ((xScale(d.incidents_85_99) >= padding.left && yScale(d.fatal_accidents_85_99) <= svgHeight-padding.bottom) ) {
					return rScale(d.fatalities_85_99);
				} else {
					return 0;
				}
				
			});
		//debugger;
		//svg.select(".brush").call(brush.move, null);
	}

});


// ------------------ Plot 2 --------------------- //

d3.csv("airline-safety.csv", function(error, data) { 
	if(error) throw error;

	console.log("d=" + data);
	dataD = data;


	//svgPlotIFF -> svgPlot Incidents, Fatal accidents, Fatalities
	var svg2 = d3.select("#scatterplot2").append("svg").attr("id", "svgPlotIFF2")
		.attr("height", svgHeight)
		.attr("width", svgWidth);

	var xExtent = d3.extent(data, function(d) { return parseInt(d.incidents_00_14) } );
	var yExtent = d3.extent(data, function(d) { return parseInt(d.fatal_accidents_00_14) } );
	// Since the extent of 85_99 is the most, we are choosing that for radius and color for second plot too
	var rExtent = d3.extent(data, function(d) {return parseInt(d.fatalities_85_99) } );
	var extent = d3.extent(data, function(d) { return parseInt(d.incidents_00_14) } )
	console.log("xExtent= " + xExtent + ", yExtent= " + yExtent);
	console.log("Extent =" + extent);

	var xScale = d3.scaleLinear().domain([xExtent[0], xExtent[1]]).range([0+padding.left, svgWidth-padding.right]);
	var yScale = d3.scaleLinear().domain([yExtent[0], yExtent[1]]).range([svgHeight-padding.bottom, 0+padding.top]);
	var rScale = d3.scaleSqrt().domain([rExtent[0], rExtent[1]]).range([4,10]);
	var colorScale = d3.scaleLinear().domain([rExtent[0], rExtent[1]]).range(['#fee5d9', '#a50f15']);

	var brush = d3.brush().on("end", brushend);
	
	d3.select("#svgPlotIFF2").append("g").attr("class", "brush").call(brush);

	// incidents vs fatalities , with radius size and color corresponding to the number of fatalities
	// To do -> create a brushing and resizeing of the axis for each of the points
	d3.select("#svgPlotIFF2").selectAll("empty")
		.data(data)
		.enter()
		.append("g")
		.append("circle")
		.attr("class", function(d,i) {
			var classStr = "circle_"+ i;
			return classStr;
		})
		// circle2 class is used to reset the colors on no selection in brushend1
		.classed("circle2", true)
		.attr("cx", function(d) {
			return xScale(d.incidents_00_14);
		})
		.attr("cy", function(d) {
			return yScale(d.fatal_accidents_00_14);
		})
		.attr("r", function(d) {
			return rScale(d.fatalities_00_14);
		})
		.attr("fill", function(d) {
			return colorScale(d.fatalities_00_14);
		})
		.attr("stroke", "white")
		.attr("stroke-width", "1")
		.on("click", mouseClick)
		.on("mouseover", mouseOver)
		.on("mousemove", mouseMove)
		.on("mouseout", mouseOut);

		// Axis
		var xAxis = d3.axisBottom().scale(xScale).ticks(5);
		d3.select("#svgPlotIFF2").append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate ( 0 " + (svgHeight - padding.bottom) + " ) " )
			.call(xAxis);

		d3.select("#svgPlotIFF2").append("g")
			.attr("id", "xLabel")
			.append("text")
			.attr("x", padding.left+(svgWidth-padding.left-padding.right)/2 )
			.attr("y", (svgHeight-paddingAxis.bottom) )
			.attr("font-size", "10")
			.text("Incidents_00_14")

		var yAxis = d3.axisLeft().scale(yScale).ticks(5);
		d3.select("#svgPlotIFF2").append("g")
			.attr("class", "yAxis")
			.attr("transform", "translate (" + padding.left + " 0)" )
			.call(yAxis);

		d3.select("#svgPlotIFF2").append("g")
			.attr("id", "yLabel")
			.append("text")
			.attr("x", paddingAxis.left)
			.attr("y", svgHeight/2 )
			.attr("transform" , "rotate (-90 " + paddingAxis.left + ", " + (svgHeight/2) + ")" )
			.attr("font-size", "10")
			.text("Fatal Accidents");

	// mouseClick
	function mouseClick (d, i) {
		// Create table for selected circle
		console.log("table d=" + d + ", header= " + header);
		// cant use 'd' directly in data, so clickData is created
		var clickData = d;
		//debugger;
		var cells = tbody.append("tr").attr("class", "rowSeen")
			// border color of table same as the selected color on clicking
			.style("border", function() {
				return ("10px solid " + clickColorScale(clickCount));
			})
			//.style("border-top-width", "10px")
			.selectAll("td")
			.data(function(clickData) {
				// header.map ==> creates a map for all the keys such that each key is the column, and the value
				// for each key is stored in the value. Creates a data element with 4 objects.
				return header.map(function(column) {
					return {column: column, value: d[column]};
				})
			})
			.enter()
			.append("td")
			// here the 'd' is the data that we created from each row in the data element.
			.text(function(d) {
				return d.value;
			})
			.style("background-color", function(d) {
				if (d.column=="fatalities_00_14" || d.column=="fatalities_85_99") {
					return colorScale(d.value);
				} else { 
					return "white";
				}
			});

		// Once you click the color will remain as blue
		var selClass = ".circle_" + i;
		// ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99']
		d3.selectAll(selClass).attr("fill", function() {
			return clickColorScale(clickCount);
		});
		if (clickCount < numColor ){
			clickCount = clickCount + 1;
		} else if (clickCount >= numColor ) {
			clickCount = 0;
		}
	}
	// function mouseOver and mouseOut
	function mouseOver() {
		console.log("MouseOver" + ", this= " + this);
		//console.log("this= ", this );	
		//debugger;
		svg2.append("g")
			.attr("class", "cLabel")
			.append("text")
			.attr("x", (this.cx.baseVal.value + 5) )
			.attr("y", this.cy.baseVal.value)
			.text(Math.round(xScale.invert(this.cx.baseVal.value)) + " , " + Math.round(yScale.invert(this.cy.baseVal.value)) + " , " + this.__data__.fatalities_00_14 + ", " + this.__data__.airline );

		// Highlighting the selected circle
		var classSel = "."+ this.className.baseVal;
		d3.selectAll(classSel).classed("highlight", true);
		d3.selectAll(classSel).moveToFront(); // Not working yet
	}

	function mouseMove() {
		console.log("mouseMove" + " , this= " + this);
	}

	function mouseOut() {
		console.log("MouseOut" + ", this= " + this);
		d3.selectAll(".cLabel").remove();
		d3.selectAll(".highlight").classed("highlight", false);
	}


	var idleTimeout, 
			idleDelay=350;

	// function brushend
	// Need to be inside the csv call, for preserving the scope of xExtent and yExtent
	function brushend() {
		if(!d3.event.sourceEvent) return;
		eventt = d3.event.sourceEvent;
		//console.log ("eventt= " + eventt);
		//debugger;
		s = d3.event.selection;
		if (!s) {
			if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
			console.log ("No Selection");
			//console.log("xExtent= " + xExtent);
			
			// Going back to original domain when nothing is selected
			xScale.domain(xExtent);
			yScale.domain(yExtent);
		} else {
			//console.log("s= " + s +", s[0]= " + s[0] + ", s[1]= " + s[1] + " , this= " + this);
			var x0 = xScale.invert(s[0][0]);
			var y0 = yScale.invert(s[0][1]);
		
			var x1 = xScale.invert(s[1][0]);
			var y1 = yScale.invert(s[1][1]);
		
			//console.log("x0= " + x0 + ", x1= " + x1 + ", y0= " + y0 + ", y1= " + y1);
		
			// New domain after brushing to zoom in to these points
			xScale.domain([x0, x1]);
			yScale.domain([y1, y0]);
			svg2.select(".brush").call(brush.move, null);
		}

		// Zoom to the new domain
		zoom();
		//debugger;

		// check https://github.com/d3/d3-brush/issues/10 
		// and https://github.com/d3/d3-brush/issues/9
		// example https://bl.ocks.org/mbostock/f48fcdb929a620ed97877e4678ab15e6
		// brush events https://bl.ocks.org/mbostock/15a9eecf0b29db92f12ca823cfbbce0a

	}

	function idled() {
		idleTimeout = null;
	}

	function zoom() {
		//console.log("this in zoom= " + this);
		//debugger;
		var t = svg2.transition().duration(750);
		svg2.select(".xAxis").transition(t).call(xAxis);
		svg2.select(".yAxis").transition(t).call(yAxis);

		svg2.selectAll("circle").transition(t)
			.attr("cx", function(d) {
				if (xScale(d.incidents_00_14) >= padding.left && yScale(d.fatal_accidents_00_14) <= svgHeight-padding.bottom) {
					console.log("cx= " + xScale(d.incidents_00_14) );
					return xScale(d.incidents_00_14);
				}
			})
			.attr("cy", function(d) {
				if (xScale(d.incidents_00_14) >= padding.left && yScale(d.fatal_accidents_00_14) <= svgHeight-padding.bottom) {
					//console.log("cy= " + yScale(d.fatal_accidents_00_14) );
					return yScale(d.fatal_accidents_00_14);
				}
			})
			.attr("r", function(d) {
				if ((xScale(d.incidents_00_14) >= padding.left && yScale(d.fatal_accidents_00_14) <= svgHeight-padding.bottom) ) {
					return rScale(d.fatalities_00_14);
				} else {
					return 0;
				}
				
			});
		//debugger;
		//svg.select(".brush").call(brush.move, null);
	}

});

//function reset() {
//	d3.csv("airline-safety.csv", function(error, data) { 
//		if(error) throw error;
//		var rExtent = d3.extent(data, function(d) {return parseInt(d.fatalities_85_99) } );
//		var colorScale = d3.scaleLinear().domain([rExtent[0], rExtent[1]]).range(['#fee5d9', '#a50f15']);
//
//		// Remove the color for all the selected circles
//		d3.selectAll(".circle2")
//			.attr("fill", function(d) {
//				// Since the data is bound to the circles we can reset them here
//				return colorScale(d.fatalities_00_14);
//			});
//		
//		// Reset the color 
//		d3.selectAll(".circle1")
//			.attr("fill", function(d) {
//				return colorScale(d.fatalities_85_99);
//			});
//
//		// Remove all the rows from the table
//		d3.selectAll(".rowSeen").remove();
//	});
//};
