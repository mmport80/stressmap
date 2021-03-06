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

function copyObject(o){
		newO = {};
		jQuery.extend(newO, o);
		return newO;
		}

function StressMap(defaultStressScenarioFile, defaultPortfolioFile, threshold) {

	this.defaultStressScenarioFile = defaultStressScenarioFile;
	this.defaultPortfolioFile = defaultPortfolioFile;
	this.threshold = threshold;

	//global file name or data?
	//global data means no need to reread file
	//but global data means need to block until file read
	//maybe do both...
	//update data once you have it, and try to use it
	var historicalStressFile;
	var historicalStressScenarios;
	
	var positions;
	var positionObjects;
	var graphs;
	var shocks;
	var historicalStressScenarios;
	
	var axes;
	
	var totalMarketValue;
	var positionCountTotal;
	
	var px;
	
	var _this = this;
	
	//init
	this.init = function(){
		_this.px = new PLs();
		
		//initial processing of positions
		processPositionFunction = function(positions){ 
			
			_this.positions = positions;
			//parse stress
			processStressScenarioFunction = function(historicalStressScenarios){
				
				_this.historicalStressScenarios = historicalStressScenarios;
				
				//get total market value
				_this.totalMarketValue = _this.getTotalMarketValue(_this.positions);
				//get total no of positions
				_this.positionCountTotal = _this.getPositionCountTotal(_this.positions);
				
				//get factors + create axes objects
				_this.axes = _this.getAxes(_this.positions, _this.historicalStressScenarios);
				
				//console.log(_this.axes);
				
				numberOfFactors = Object.keys(_this.axes).length;
				
				_this.drawAxesInHTML(copyObject(_this.axes));
				
				//generate permutations
				//pass defaults
				_this.shocks = _this.getShocks( copyObject(_this.axes) , numberOfFactors)
						.reduce(
							function( previous, current ) {
								return dualVectors(current, previous);
								}
							);
				
				_this.graphs = _this.getGraphs( _this.totalMarketValue, _this.positionCountTotal, copyObject(_this.axes), _this.historicalStressScenarios, _this.threshold, numberOfFactors );
				
				_this.processPositions(_this.positions, _this.shocks);
				};
			//process stress file
			readCSVFile(_this.defaultStressScenarioFile, processStressScenarioFunction);
			};
		//process position file
		readCSVFile(_this.defaultPortfolioFile, processPositionFunction);
		}

	this.plCalcCount = 0;
	
	this.updatePercentageComplete = function(){
		//output
		_this.plCalcCount = _this.plCalcCount + 1;
		
		//no of factors
		noOfFactors = Object.keys(_this.graphs[0].px.pls[0].shock).length;
		//no of shocks
		noOfShocksPerFactor = _this.graphs[0].xShocksArray.length;
		//(factors^shocks)*no of positions
		totalNoOfShocks = Math.pow(noOfShocksPerFactor, noOfFactors) * _this.graphs[0].positionCountTotal;
		
		percentageComplete = Math.round( 100 * ( _this.plCalcCount ) / totalNoOfShocks );
		
		d3	.select("title")
			//pls calc'ed so far  / total number of pls to be calced * number of positions
			.text( percentageComplete + "% - Stress Map - Portfolio stress testing" );
		}

	this.drawAxesInHTML = function(axes){
		axis = _this.popObject(axes);	
	
		sortable2Container = d3	.select("#sortable2");

		underscoredRF = axis.riskFactor.replace(" ","_");

		//figure out where this risk factor is in the grand scheme of things
		currentRiskFactors = [];
		$( "span[id$='risk_factor']" ).each(
			function (i,d) {
				currentRiskFactors.push(d.textContent)
				}
			);



		//container div
		sortable2Container	.append("span")
					.attr("id",underscoredRF)
					.attr("class","riskFactor")
					.style("display","table-row");


		sortable2Container	.select("#"+underscoredRF)
					.append("span")
					.attr("class","icon-sortable")
					.html("&#9650; <br /> &#9660;")
					.style("float","left");

		//description of risk factor
		sortable2Container	.select("#"+underscoredRF)
					.append("span")
					.attr("id","risk_factor")
					.attr("class",underscoredRF)
					.text(axis.riskFactor)
					.style("float","left");
				
		//disable link
		sortable2Container	.select("#"+underscoredRF)
					.append("a")
					.attr("id",underscoredRF+"_disable")
					.style("float","right")
					.text("[Disable]")
					.attr("onclick","s.disableFactor('"+axis.riskFactor+"');");
		//enable link
		sortable2Container	.select("#"+underscoredRF)
					.append("a")
					.attr("id",underscoredRF+"_enable")
					.style("float","right")
					.style("display","none")
					.text("[Enable ]")
					.attr("onclick","s.enableFactor('"+axis.riskFactor+"');");
		//upper bound
		sortable2Container	.select("#"+underscoredRF)
					.append("input")
					.attr("id",underscoredRF+"_upper")
					.attr("step",0.01)
					.attr("value",axis.upper)
					.attr("style","width: 55px")
					.style("float","right")
					.attr("onchange","s.setAxisLimit('"+axis.riskFactor+"', +this.value, 'upper');");
		//lower bound
		sortable2Container	.select("#"+underscoredRF)
					.append("input")
					.attr("id",underscoredRF+"_lower")
					.attr("step",0.01)
					.attr("value",axis.lower)
					.attr("style","width: 55px")
					.style("float","right")
					.attr("onchange","s.setAxisLimit('"+axis.riskFactor+"', +this.value, 'lower');");
		
		_this.groupFactors();
		
		//package into an array and return
		if (Object.keys(axes).length > 0) {
			_this.drawAxesInHTML(axes);
			}
	
		}
	

	this.getDefaultLimits = function(historicalStressScenarios, riskFactor){
		rr = {
			upper: +_.max(historicalStressScenarios, function(scenario){return +scenario[riskFactor];})[riskFactor],
			lower: +_.min(historicalStressScenarios, function(scenario){return +scenario[riskFactor];})[riskFactor]
			};
		return rr;
		}
	
	//need to be used before graphs are created
	//store info in instrument objects?
	//create objects first? then get factor info directly from them?
	
	//if stress scenarios are not provided, then
	//look for object specifying limits
	this.getAxes = function(positions, historicalStressScenarios) {
		c = {};
		return positions
			.filter( function(position) {
				//ignore domestic cash positions
				return position.exposure != 'cash';
				})
			.reduce( function(b, position) {
				//array of axis objects
				reduceAxisNamesFunction = function(b, axis_name) {
					//defaults
					//get defaults from historical stress scenarios...
					
					//when historical stress is present
					
					b[axis_name] = _this.getDefaultLimits(historicalStressScenarios, axis_name);
					
					return b; 
					};
			
				if (position.exposure == 'option') {
					return  ["Underlying Price","Volatility Rate","Interest Rate","Dividend Yield"].reduce( reduceAxisNamesFunction, c);
					}
				else if (position.exposure == 'equity'){
					return ["Underlying Price"].reduce( reduceAxisNamesFunction, c);
					}
				else if (position.exposure == 'bond'){
					//console.log("Interest Rate","Z Spread");
					return ["Interest Rate","Z Spread"].reduce( reduceAxisNamesFunction, c);
					}
				else if (position.exposure == 'frn'){
					//console.log("Interest Rate","Z Spread");
					return ["Interest Rate","Z Spread"].reduce( reduceAxisNamesFunction, c);
					}
				else if (position.exposure == 'cds'){
					return ["Interest Rate","Z Spread"].reduce( reduceAxisNamesFunction, c);
					}
				else if (position.exposure == 'swap'){
					return ["Interest Rate"].reduce( reduceAxisNamesFunction, c);
					}
				//cash filtered out above
				
				//initial empty object variable {}
				}, {});
		}
	
	this.processPositions = function(positions, shocks){
		//evaluate
		_this.positionObjects = positions.reduce( function(p, position) {
			var expiry_date = new Date(position.expiry_date+" UTC");
			var effective_date = new Date(position.effective_date+" UTC");
			var maturity_date = new Date(position.maturity_date+" UTC");
			var start_date = new Date(position.start_date+" UTC");
			
			shockLoop3 = function(pos, shocks, stressMap){
				shocks.forEach( function(shock){
					pos.value(shock, stressMap)
					});
				};
			
			
			//calibrate if necessary
			//cycle through shocks
			//deposit PLs onto graphs	
			if (position.exposure == 'cds') {
				//incorporate a constructor to calibrate as object is created?
				//market value is unit price or position value??
				pos = new Cds(	+position.quantity,
						effective_date,
						+position.market_value,
						maturity_date,
						+position.face,
						+position.rate_1m,
						+position.rate_3m,
						+position.rate_6m,
						+position.rate_1y,
						+position.rate_2y,
						+position.rate_3y,
						+position.rate_5y,
						+position.rate_7y,
						+position.rate_10y,
						+position.rate_20y,
						+position.rate_30y,
						+position.spread			);
				//calibrate then shock and revalue
				//calibration and shocking needs to be done on one process
				//should work
				pos.calibrate(shockLoop3, shocks, _this);
				}
			else if (position.exposure == 'option') {
				//incorporate a constructor to calibrate as object is created?
				//market value is unit price or position value??
				pos = new Option(	+position.quantity,
							effective_date,
							+position.strike_price,
							expiry_date,
							position.put_or_call,
							+position.underlying_price,
							+position.market_value,
							+position.dividend_yield,
							+position.rate_1y,
							position.style			);
				//calibrate then shock and revalue
				//calibration and shocking needs to be done on one process
				//should work
				pos.calibrate(shockLoop3, shocks, _this);
				}
			else if (position.exposure == 'swap') {
				pos = new Swap(	+position.quantity,
						effective_date,
						+position.market_value,
						maturity_date,
						+position.face,
						+position.rate_1m,
						+position.rate_3m,
						+position.rate_6m,
						+position.rate_1y,
						+position.rate_2y,
						+position.rate_3y,
						+position.rate_5y,
						+position.rate_7y,
						+position.rate_10y,
						+position.rate_20y,
						+position.rate_30y,
						+position.coupon,
						position.fixed_frequency,
						+position.ref_rate_1m,
						+position.ref_rate_3m,
						+position.ref_rate_6m,
						+position.ref_rate_1y,
						+position.ref_rate_2y,
						+position.ref_rate_3y,
						+position.ref_rate_5y,
						+position.ref_rate_7y,
						+position.ref_rate_10y,
						+position.ref_rate_20y,
						+position.ref_rate_30y,
						+position.spread,
						position.floating_frequency,
						start_date );
				//shock and revalue
				//only shock relevant variables?
				pos.calibrate(shockLoop3, shocks, _this);
				}
			else if (position.exposure == 'frn') {
				pos = new FloatingRateNote(	+position.quantity,
								effective_date,
								+position.market_value,
								maturity_date,
								+position.face,
								+position.rate_1m,
								+position.rate_3m,
								+position.rate_6m,
								+position.rate_1y,
								+position.rate_2y,
								+position.rate_3y,
								+position.rate_5y,
								+position.rate_7y,
								+position.rate_10y,
								+position.rate_20y,
								+position.rate_30y,
								+position.ref_rate_1m,
								+position.ref_rate_3m,
								+position.ref_rate_6m,
								+position.ref_rate_1y,
								+position.ref_rate_2y,
								+position.ref_rate_3y,
								+position.ref_rate_5y,
								+position.ref_rate_7y,
								+position.ref_rate_10y,
								+position.ref_rate_20y,
								+position.ref_rate_30y,
								+position.spread,
								position.payment_frequency,
								+position.current_floating_rate );
				//shock and revalue
				//only shock relevant variables?
				pos.calibrate(shockLoop3, shocks, _this);
				}
			else if (position.exposure == 'bond') {
				pos = new Bond(	+position.quantity,
						effective_date,
						+position.market_value,
						maturity_date,
						+position.face,
						+position.rate_1m,
						+position.rate_3m,
						+position.rate_6m,
						+position.rate_1y,
						+position.rate_2y,
						+position.rate_3y,
						+position.rate_5y,
						+position.rate_7y,
						+position.rate_10y,
						+position.rate_20y,
						+position.rate_30y,
						+position.coupon,
						position.payment_frequency );
				//shock and revalue
				//only shock relevant variables?
				pos.calibrate(shockLoop3, shocks, _this);
				}
			else if (position.exposure == 'equity') {
				pos = new Equity(+position.quantity,+position.underlying_price,+position.market_value);
				//shock and revalue
				//only shock relevant variables?
				shockLoop3(pos, shocks, _this);
				}
			else if (position.exposure == 'cash') {
				pos = new Cash(+position.quantity,+position.market_value);
				//shock and revalue
				//only shock relevant variables?
				shockLoop3(pos, shocks, _this);
				}
				
			return p.concat(pos);
			}, []);
			
		}


	this.getShocks = function(axes, numberOfFactors) {
		axis = _this.popObject(axes);
		//each factor in the right format
		//[{underlying_price: 0.01},...,{underlying_price: 0.03}]
		ff = convertAxisToShocks(axis, numberOfFactors).map(
			function(value){
				rr = {};
				rr[axis.riskFactor] = value;
				return rr;
				}
			);
		
		//package into an array and return
		if (Object.keys(axes).length == 0) {
			return [ff];
			}
		else {
			return [ff].concat(_this.getShocks(axes, numberOfFactors));
			}
		}


	this.getTotalMarketValue = function(positions) {
		return positions.reduce(
			function( runningTotal, position ) {
				return runningTotal + (+position.quantity * +position.market_value);
				}
			//initial value
			, 0 );
		}
		
	this.getPositionCountTotal = function(positions) {
		return positions.reduce(
			function( runningTotal, position ) {
				return runningTotal + 1;
				}
			//initial value
			, 0 );
		}
		
	//******************************************************************
	//**graph setup
	//input list of graphs
	//set stressmap object
	
	
	this.popObject = function(obj){
		key = Object.keys(obj)[0];
		poppedObj = obj[key];
		poppedObj.riskFactor = key;
		delete obj[key];
		
		return poppedObj;
		}
	
	this.getGraphs = function(totalMarketValue, positionCountTotal, axes, historicalStressScenarios, threshold, numberOfFactors){
		
		//risk factor plus shock limits
		if (Object.keys(axes).length == 1) {
			xAxis = this.popObject(axes);
			yAxis = null;
			}
		else {
			yAxis = this.popObject(axes);
			xAxis = this.popObject(axes);		
			}
		
		//if no second shock, then one create dimensional graph
		if (yAxis == null) {
			//shock contains risk_factor and shock limits
			graph = new GraphOneD( numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxis );
			}
		else {
			graph = new GraphTwoD( numberOfFactors, threshold, totalMarketValue, positionCountTotal, historicalStressScenarios, xAxis, yAxis );
			}
			
		//use a constructor instead?
		graph.setUpGraph();
		
		//if all shocks have been popped
		if (Object.keys(axes).length == 0){
			//set stress map object's graph list to result
			return [graph];
			}
		else {
			return [graph].concat(
				_this.getGraphs(totalMarketValue, positionCountTotal, axes, historicalStressScenarios, threshold, numberOfFactors)
				);
			}
		}
	
	//**interactions
	//** 1
	this.setPortfolio = function(portfolioFile){
		_this.abortAllAjaxRequests();
		_this.positionObjects = [];
	
		_this.plCalcCount = 0;
	
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			var uploadFile = portfolioFile;
			var reader = new window.FileReader();
		
			reader.onload = function(){
				_this.positions = d3.csv.parse(reader.result);
				
				d3	.select("#sortable2").selectAll("span.riskFactor").remove();
				d3	.select("#sortable2").selectAll("span.riskFactor_disabled").remove();
				d3	.select("#graphs").selectAll("svg").remove();
				
				//get total market value
				_this.totalMarketValue = _this.getTotalMarketValue(_this.positions);
				//get total no of positions
				_this.positionCountTotal = _this.getPositionCountTotal(_this.positions);
			
				//console.log(_this.positions);
			
				_this.axes = new Array();
			
				//get factors + create axes objects
				_this.axes = _this.getAxes(_this.positions, _this.historicalStressScenarios);
			
				//console.log(_this.axes);
				
				numberOfFactors = Object.keys(_this.axes).length;
			
				_this.drawAxesInHTML(copyObject(_this.axes));
			
				//generate permutations
				//pass defaults
				_this.shocks = _this.getShocks( copyObject(_this.axes) , numberOfFactors)
						.reduce(
							function( previous, current ) {
								return dualVectors(current, previous);
								}
							);
			
				_this.graphs = _this.getGraphs( _this.totalMarketValue, _this.positionCountTotal, copyObject(_this.axes), _this.historicalStressScenarios, _this.threshold, numberOfFactors );
			
				_this.processPositions(_this.positions, _this.shocks);
				
				//kicking off init overwrites positions to using to default file
				//need to tailor everything in init for this specific run
					
				};
			reader.readAsText(uploadFile);
			}
		else {
			alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
			}
		}

	//issue when aborting while no promises outstanding
	this.abortAllAjaxRequests = function(){
		_this.positionObjects.forEach(function(pos){
			if (pos.promises != null){	
				pos.promises.forEach(function(promise){
					promise.abort();
					});
				}
			});
		
		}

	//** 2
	this.setAxisLimit = function(riskFactor, limit, upperOrLower){
		_this.abortAllAjaxRequests();
		
		_this.plCalcCount = 0;
		
		d3	.select("#graphs").selectAll("svg").remove();
		
		_this.axes[riskFactor][upperOrLower] = limit;
		
		numberOfFactors = Object.keys(_this.axes).length;
		
		//generate permutations
		//pass defaults
		_this.shocks = _this.getShocks( copyObject(_this.axes) , numberOfFactors)
				.reduce(
					function( previous, current ) {
						return dualVectors(current, previous);
						}
					);
		
		_this.graphs = _this.getGraphs( _this.totalMarketValue, _this.positionCountTotal, copyObject(_this.axes), _this.historicalStressScenarios, _this.threshold, numberOfFactors );
		
		_this.processPositions(_this.positions, _this.shocks);
		
		//update shocks
		//reset pl count etc
		//process positions - i.e. regen PLS
		//wipe graphs
		//draw
		}

	//** 3
	this.disableFactor = function(factorToBeDisabled){
		//update shocks (i.e. remove risk factor)
		//reset pl count etc
		//process positions - i.e. regen PLS (higher res with fewer shocks)
		//wipe graphs
		//draw
	
		underscoredRF = factorToBeDisabled.replace(" ","_");
	
		_this.abortAllAjaxRequests();
		_this.positionObjects = [];
	
		delete _this.axes[factorToBeDisabled];
		
		d3.select("#"+underscoredRF+"_disable").style("display", "none");
		d3.select("#"+underscoredRF+"_enable").style("float", "right");
		d3.select("#"+underscoredRF+"_enable").style("display", "");
		
		d3.select("#"+underscoredRF+"_lower").attr("disabled", "true");
		d3.select("#"+underscoredRF+"_upper").attr("disabled", "true");
		
		d3.select("#"+underscoredRF).attr("class", "riskFactor_disabled");
	
		d3.select("."+underscoredRF).attr("id", "risk_factor_disabled");
	
		_this.groupFactors();
	
		//disable limit inputs
	
		_this.plCalcCount = 0;
		_this.px = new PLs();
		
		d3	.select("#graphs").selectAll("svg").remove();
		
		
		numberOfFactors = Object.keys(_this.axes).length;
		
		//generate permutations
		//pass defaults
		_this.shocks = _this.getShocks( copyObject(_this.axes) , numberOfFactors)
				.reduce(
					function( previous, current ) {
						return dualVectors(current, previous);
						}
					);
		
		_this.graphs = _this.getGraphs( _this.totalMarketValue, _this.positionCountTotal, copyObject(_this.axes), _this.historicalStressScenarios, _this.threshold, numberOfFactors );
		
		_this.processPositions(_this.positions, _this.shocks);
		}
	
	//1) enable specific factor
	//2) read limits from input fields
	this.enableFactor = function(factorToBeEnabled){
	
		//update shocks (i.e. remove risk factor)
		//reset pl count etc
		//process positions - i.e. regen PLS (higher res with fewer shocks)
		//wipe graphs
		//draw
		
		underscoredRF = factorToBeEnabled.replace(" ","_");
		
		_this.abortAllAjaxRequests();
		_this.positionObjects = [];
		
		_this.plCalcCount = 0;
		_this.px = new PLs();
		
		numberOfFactors = Object.keys(_this.axes).length;
		
		d3.selectAll("#"+underscoredRF+"_enable").style("display", "none");
		d3.selectAll("#"+underscoredRF+"_disable").style("display", "block");
		
		d3.select("#"+underscoredRF+"_lower").attr("disabled", null);
		d3.select("#"+underscoredRF+"_upper").attr("disabled", null);
		
		d3.select("#"+underscoredRF).attr("class", "riskFactor");
		
		d3.select("."+underscoredRF).attr("id", "risk_factor");
		
		_this.groupFactors();
		
		riskFactors = [];
		
		//read risk factors but ignore currently disabled ones
		
		$( "span[id$='risk_factor']" ).each(
			function (i,d) {
				riskFactors.push(d.textContent)
				}
			);
		
		reduceAxisNamesFunction = function(b, axis_name) {
			b[axis_name] = s.axes[axis_name];
			return b; 
			};
			
		_this.axes =  riskFactors.reduce( reduceAxisNamesFunction, {});
		
		lower = d3.select("#"+underscoredRF+"_lower")[0][0].value;
		upper = d3.select("#"+underscoredRF+"_upper")[0][0].value;
		_this.axes[factorToBeEnabled] = {riskFactor: factorToBeEnabled, lower: +lower, upper: +upper};
		
		d3.select("#graphs").selectAll("svg").remove();
		
		numberOfFactors = Object.keys(_this.axes).length;
	
		_this.shocks = _this.getShocks( copyObject(_this.axes) , numberOfFactors)
				.reduce(
					function( previous, current ) {
						return dualVectors(current, previous);
						}
					);
	
		_this.graphs = _this.getGraphs( _this.totalMarketValue, _this.positionCountTotal, copyObject(_this.axes), _this.historicalStressScenarios, _this.threshold, numberOfFactors );
	
		_this.processPositions(_this.positions, _this.shocks);
		}
		
	//** 4
	this.setThreshold = function(threshold){
		//refresh gui
		d3	.select("#thresholdPercentage")
			.text(Math.round(-threshold*100));
		
		//
		_this.threshold = threshold;
		
		_this.graphs.forEach(function(graph){
			//set threshold
			graph.threshold = threshold;
			//wipe graphs
			//draw
			graph.countPLsByCell();
			});
		}

	this.groupFactors = function(){
		//group enabled factors by graph
		//need to add logic when enabling and disabling factors
		binary = function(i){
			
			return Math.floor( i / 2 ) % 2 == 0 ? "riskFactor grey" : "riskFactor";
			}
			
		d3.selectAll(".riskFactor").attr("class",function(i,d){ return binary(d) });
		
		}

	//** 5
	//have a seperate pl store
	//when this is changed as calculations are being made, the graph doesn't update
	//only updates after the threshold changes
	this.setFactorOrder = function(){
		
		_this.groupFactors();
		
		//get new order of factors
		//wipe
		//draw
		
		riskFactors = [];
		
		$( "span[id$='risk_factor']" ).each(
			function (i,d) {
				riskFactors.push(d.textContent);
				}
			);

		reduceAxisNamesFunction = function(b, axis_name) {
			b[axis_name] = s.axes[axis_name];
			return b; 
			};
		
		_this.axes =  riskFactors.reduce( reduceAxisNamesFunction, {});
		
		d3.select("#graphs").selectAll("svg").remove();
		
		numberOfFactors = Object.keys(_this.axes).length;
	
		_this.graphs = _this.getGraphs( _this.totalMarketValue, _this.positionCountTotal, copyObject(_this.axes), _this.historicalStressScenarios, _this.threshold, numberOfFactors );
	
		_this.graphs.forEach(function(graph){
			//update PLs
			graph.px = _this.px;
			//wipe graphs
			//draw
			graph.countPLsByCell();
			});
		}

	//** 6
	this.setHistoricalStress = function(stressFile){
		//read csv
		//get new circles
		//wipe
		//draw
		
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			var uploadFile = stressFile;
			var reader = new window.FileReader();
		
			reader.onload = function(){
				_this.historicalStressScenarios = d3.csv.parse(reader.result);
				
				_this.graphs.forEach(function(graph){
					graph.removeAllCircles();
					graph.historicalStressScenarios = historicalStressScenarios;
					graph.appendStressCircles(_this.historicalStressScenarios);
					//reconfigure axes to ensure that all stress scenarios are encompassed
					});
				};
			reader.readAsText(uploadFile);
			}
		else {
			alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
			}
		}
	
	
	
	
	//**Refresh functionality
	this.wipeGraphs = function(){
		_this.graphs.forEach( function(graph) {
			graph.removeGraph();		
			});
		gx = [];
		}
	//**Draw GUI forms
		
	}


//

	
	
