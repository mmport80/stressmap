/*
    Stress Map Javascript example
    Copyright (C) 2014 John Orford

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
//convert limits plus number of factors to array
function convertAxisToShocks(axis, numberOfFactors){
	
	upper = axis.upper;
	lower = axis.lower;
	
	requestLimit = 256;

	//8 is a sane(ish) max?
	divisor = Math.min(
			Math.floor(
				//refer to parent stress map object and get number of shocks
				Math.pow(requestLimit,1/numberOfFactors) - 1
				)
			, 7);

	difference = upper - lower;

	step = difference / divisor;

	shocks2 = _.range(lower,upper+0.000000000001,step);

	return shocks2;
	}

function textUnderScorify(text){
		if (text == null) {
			return "";
			}
		else{
			return text.replace(" ","_");
			}
		}

function GenericGraph(numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxisInput) {
	//link the names of the axes here to the PLs coming from the instrument repricings
	this.margin = {top: 40, right: 40, bottom: 80, left: 55};
	
	this.width = 400;
	this.totalWidth = this.width + this.margin.left + this.margin.right;
	
	this.totalHeight = this.height + this.margin.top + this.margin.bottom;
	
	
	this.xAxisText = xAxisInput.riskFactor;
	this.xAxisTextUnderscored = textUnderScorify(this.xAxisText);
	
	this.squares;
	this.circles;
	
	this.threshold = threshold;
	this.numberOfFactors = numberOfFactors;
	
	this.xShocksArray = convertAxisToShocks(xAxisInput, numberOfFactors);
	
	this.x = d3	.scale	
			.linear()
			.domain([ Math.min.apply(null,this.xShocksArray),Math.max.apply(null,this.xShocksArray) ])
			.range([ 0, this.width ]);
	
	var _this = this;
	
	this.formatXLabel = function(d){
		if (d == _this.x.domain()[1] ){
			return roundOne(d * 100) + "%";
			}
		else {
			return roundOne(d * 100);
			}
		}
	
	this.xAxis = d3	.svg
			.axis()
			.scale(this.x)
			.orient("bottom")
			.tickValues(this.xShocksArray)
			//.ticks(this.xShocksArray.length)
			.tickFormat( this.formatXLabel );
	
	
	
	
	this.squareWidth = 40 * 8/this.xShocksArray.length;
	
	this.totalMarketValue = totalMarketValue;
	this.positionCountTotal = positionCountTotal;
	
	this.px = new PLs()
	

	//replace spaces with underscores
	this.removeAllPls = function(){
		d3	.select("#Squares"+_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored)
			.selectAll("rect")
			.remove();
		}
		
	this.removeAllCircles = function(){
		d3	.select("#Circles"+_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored)
	    		.selectAll("circle")
			.remove();
		}
		
	this.removeGraph = function(){
		d3	.select("#"+_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored)
			.remove();
		}
		
	this.origAppendPL = function(pL){
		plCalcCount = plCalcCount + 1;		
		updatePercentageComplete();
		this.appendPL(pL);
		}
		
	this.setUpXAxis = function(svgContainer){
		svgContainer.append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate(" + (_this.margin.left  + (_this.squareWidth * 0.5)) + "," + (_this.margin.top + _this.height + _this.squareWidth  ) + ")")
			.call(_this.xAxis);
			
		svgContainer	.append("text")     
				.text(_this.xAxisText)
				.attr("x", _this.width)
		        	.attr("y", _this.margin.top + _this.height+_this.squareWidth+50);
		}
		
	this.setUpYAxis = function(svgContainer){
		svgContainer.append("g")
			.attr("class", "yAxis")
			.attr("transform", "translate(" + (_this.margin.left) + "," + (_this.margin.top + (_this.squareWidth / 2)) + ")")
			.call(_this.yAxis);
			
		//label for equity shock axis
		svgContainer	.append("text")     
				.text(_this.yAxisText)
				.attr("x", _this.margin.left-10)
		        	.attr("y", 15 );
		}
		
	this.generalSetup = function(){
		//general setup
		svgContainer = d3	.select("#graphs")
					.append("svg")
					.attr("width", "100%")
					//.attr("width", _this.totalWidth+80)
					.attr("height", _this.totalHeight+80)
					.attr("id",_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored)
					//.call(_this.zoom)
					;
					
	     	_this.drawOrigin(svgContainer);
		
		svgContainer	.append("g")
				.attr("id","Squares"+_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored);
	
		_this.squares = d3	.select("#Squares"+_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored)
					.selectAll("rect");
	
		_this.circles = svgContainer	.append("g")
						.attr("id","Circles"+_this.xAxisTextUnderscored+"_"+_this.yAxisTextUnderscored)
						//unsure what this does...
						.attr("transform","translate(0,0)")
      						.selectAll("circle");
	     	
	     	//if no stress scenarios then
		//read file
		//otherwise use curent stress scenarios
		_this.appendStressCircles(historicalStressScenarios);
		
		return svgContainer;
		}
	
	//for 2d
	this.opacitySteps = 1/_this.numberOfFactors/_this.numberOfFactors/_this.positionCountTotal;
	
	//add red pnl squares
	this.appendSquares = function(pls){
		//this is the problem
		_this.squares
			//array of objects, [ ..., {xshock, yshock, count}, ... ]
			.data(pls)
			.enter()
			.append("rect")
			//tweaked in order to align with axes	
			.attr("transform", "translate(" + (_this.margin.left) + "," + (_this.margin.top) + ")")
			//Sync with shocks used in graph
			.attr("x", function (d) { return _this.x(d.xShock); })
			.attr("y", _this.dimensionSpecificYAxis)
			.attr("width", _this.squareWidth)
			.attr("height", _this.squareWidth)
			.attr("rx", 1)
      			.attr("ry", 1)
			.attr("class",function (d){
					if (d.count > 0) {
						return "redx";
						}; 
					}
				)
      			.attr("style",
      				function (d) { 
      					//scale based on resolution
      					//max possible is 16 for 4 risk factors
      					if (d.count > 0) {
      						return "fill-opacity: " + (d.count * _this.opacitySteps);
      						} ; 
      					}
      				)
			.append("title")
			//Sync with shocks used in graph
			.text( _this.dimensionSpecificToolTip );
		}
	
	this.appendStressCircles = function(scenarios){
		var data2 = _this.circles	.data(scenarios)
						.enter()
						.append("circle");

		data2	//tweaked in order to align with axes	
			.attr("transform", "translate(" + (_this.margin.left+_this.squareWidth/2) + "," + (_this.margin.top+_this.squareWidth/2) + ")")
			.attr("cx", function (d) { return _this.x(+d[_this.xAxisText]);	} )
			.attr("cy", _this.dimensionSpecificStressYAxis  )
			.attr("r", _this.squareWidth/3)
			.append("title")
			.text(function(d) { return d.description+" ("+d.start_date+"-"+d.end_date + ")"});
		}
	}
	
	

//******************************************************************
//******************************************************************
//create graph
//need 1d graph - default y to 0 or something...  try to avoid the nan
function GraphTwoD(numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxisInput, yAxisInput){
	//
	this.height = 400;

	//generate dynamically
	this.yShocksArray = convertAxisToShocks(yAxisInput, numberOfFactors);

	GenericGraph.call(this, numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxisInput);
	
	//link the names of the axes here to the PLs coming from the instrument repricings
	var _this = this;
	
	this.yAxisText = yAxisInput.riskFactor;
	this.yAxisTextUnderscored = textUnderScorify(this.yAxisText);
		
	this.y = d3	.scale
			.linear()
			.domain([Math.min.apply(null,this.yShocksArray),Math.max.apply(null,this.yShocksArray)]	)
			.range([ this.height, 0 ]);
	
	this.formatYLabel = function(d){
		if (d == _this.y.domain()[1] ){
			return roundOne(d * 100) + "%";
			}
		else {
			return roundOne(d * 100);
			}
		}
		
	this.yAxis = d3	.svg
			.axis()
			.scale(this.y)
			.orient("left")
			.tickValues(this.yShocksArray)
			//.ticks(this.yShocksArray.length)
			.tickFormat( this.formatYLabel );
	
	this.dimensionSpecificToolTip = function(d) {
		return "Frequency shock breaches threshold: " + d.count;
		};
		
	this.dimensionSpecificYAxis = function(d) {
		return _this.y(d.yShock); 
		};
		
	this.dimensionSpecificStressYAxis = function(d) {
		return _this.y(+d[_this.yAxisText]);
		};
	
	//loop through every cell
	//filter out pls for each cell
	//count number of pls below threshold
	//update colour of cell
	this.countPLsByCell = function(){
		//reduce this
		//array of objects [..., {pl, shock:{u:09, v: 98, i= 87, d = 17}}, ...]
		//to
		//array of objects, [ ..., {xshock, yshock, count}, ... ]
		shocksWithCounts = [];
		
		//console.log("threshold: "+_this.threshold * Math.abs(_this.totalMarketValue), _this.threshold, Math.abs(_this.totalMarketValue));
		
		
		shocksWithCounts = _this.xShocksArray.reduce(function(p, xShock){
			return p.concat(
				_this.yShocksArray.map(function(yShock){
					count = {};
					
					
					count = {count: _this.px.pls.filter(function(pl){
					
						//console.log("pl: "+pl.pl, "Threshold: "+_this.threshold * Math.abs(_this.totalMarketValue))
					
						return 	(pl.shock[_this.xAxisText] == xShock) && 
							(pl.shock[_this.yAxisText] == yShock) &&
							(pl.pl < _this.threshold * Math.abs(_this.totalMarketValue)) //gotta fix this - should be threshold * totalmarket value
						}).length,
						xShock: xShock,
						yShock: yShock};	
					//collect into array
					return count;
					})
				);
			}, []);
		//get array collection above and call append squares
		_this.removeAllPls();
		
		
		_this.appendSquares(shocksWithCounts);
		}
	
	//redraw after change in number of factors (and therefore square length
	this.drawOrigin = function(svgContainer){
		zeroX =	_this.x((( 	_.min(_this.xShocksArray.filter(function (x) {return x >= 0;}))
					+
					_.max(_this.xShocksArray.filter(function (x) {return x <= 0;}))
					
				)) / 2);
		
		zeroY =	_this.y((( 	_.min(_this.yShocksArray.filter(function (y) {return y >= 0;}))
					+
					_.max(_this.yShocksArray.filter(function (y) {return y <= 0;}))
					
				) ) / 2);
		
		svgContainer = svgContainer	.append("g")
		      				.attr("transform","translate("+(_this.margin.left)+","+(_this.margin.top)+")")	;
		      	
		//y axis line
		svgContainer.append("line")
			.attr("x1",zeroX+_this.squareWidth/2)
			.attr("y1",0)
			.attr("x2",zeroX+_this.squareWidth/2)
			.attr("y2",(_this.height+_this.squareWidth))
			.attr("class","blackZeroLine")
		
		//x axis line
		svgContainer.append("line")
			.attr("x1",0)
			.attr("y1",zeroY+_this.squareWidth/2)
			.attr("x2",_this.width+_this.squareWidth)
			.attr("y2",zeroY+_this.squareWidth/2)
			.attr("class","blackZeroLine");
		}
	
	this.zoom = d3.behavior	.zoom()
				.x(this.x)
				.y(this.y)
				.scaleExtent([1, 10])
				.on("zoom", this.zoomed );
		
	//On change, send new dimensions to stress_map
	//Remove fixed axes
	//Add labels showing shocks on each square
	//
	this.zoomed = function() {
		svg.select(".xAxis").call(xAxis);
		svg.select(".yAxis").call(yAxis);
		}
	
	//All the basics and probably (too much) more
	this.setUpGraph = function(){
		svgContainer = _this.generalSetup();
	     	
	     	_this.setUpYAxis(svgContainer);
	     
    		_this.setUpXAxis(svgContainer);
    		
		}
	}
	
//******************************************************************
//******************************************************************

function GraphOneD(numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxisInput){
	//height controls:
	//svg height
	//x axis
	//
	
	this.height = 0;
	
	GenericGraph.call(this, numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxisInput);
	
	//generate dynamically
	this.yAxisTextUnderscored = "";
	
	this.dimensionSpecificYAxis = 0;
	
	this.dimensionSpecificToolTip = function(d) { 
		return "Frequency shock breached threshold: " + d.count;
		}
		
	this.dimensionSpecificStressYAxis = function(d) {
		return 0;
		};
		
	//link the names of the axes here to the PLs coming from the instrument repricings
	var _this = this;

	this.countPLsByCell = function(){
		//reduce this
		//array of objects [..., {pl, shock:{u:09, v: 98, i= 87, d = 17}}, ...]
		//to
		//array of objects, [ ..., {xshock, yshock, count}, ... ]
		
		shocksWithCounts = [];
		shocksWithCounts = _this.xShocksArray.map(function(xShock){
					count = {};
					//console.log(_this.threshold);
					//console.log(_this.totalMarketValue);
					//console.log(_this.px.pls);
					count = {
						count: _this.px.pls.filter(function(pl){
				
						return 	(pl.shock[_this.xAxisText] == xShock) && 
							(pl.pl < _this.threshold * Math.abs(_this.totalMarketValue))
						}).length,
						xShock: xShock
						};	
				//collect into array
					return count;
					});
		//get array collection above and call append squares
		
		
		//console.log(shocksWithCounts);
		
		_this.removeAllPls();
		
		_this.appendSquares(shocksWithCounts);
		}

	//redraw after change in number of factors (and therefore square length
	this.drawOrigin = function(svgContainer){
		zeroX =	_this.x((( 	_.min(_this.xShocksArray.filter(function (x) {return x >= 0;}))
					+
					_.max(_this.xShocksArray.filter(function (x) {return x <= 0;}))
					
				)) / 2);
		
		
		svgContainer = svgContainer	.append("g")
		      				.attr("transform","translate("+(_this.margin.left)+","+(_this.margin.top)+")")	;
		      	
		//y axis line
		svgContainer.append("line")
			.attr("x1",zeroX+_this.squareWidth/2)
			.attr("y1",0)
			.attr("x2",zeroX+_this.squareWidth/2)
			.attr("y2",(_this.height+_this.squareWidth))
			.attr("class",".blackZeroLine");
		
		}

	//All the basics and probably (too much) more
	this.setUpGraph = function(){	
		//split x and y axis setup; 1d setup will only call x axis
		//split out everything not related to axis work
		
		//console.log("gygy");
		_this.generalSetup();
		
		
		
    		_this.setUpXAxis(svgContainer);
    		
		}
	
	}
