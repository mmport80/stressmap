
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




//**
//read csv and then pass thru functions to do stuff
function readCSVFile(filePath, anonF){
	d3.csv(filePath, function(error, parsedData) {
		anonF(parsedData);
		});
	}



//******************************************************************
//******************************************************************
//Permutations
//fixed x
function singleX(x,y) {

	//get conmunal variables up front
	var yLength = y.length;
	var yp = y.pop();
	var xKey = Object.keys(x)[0];

	//result to return
	var r = [];

	//grabs all keys - if y has multiple keys
	Object.keys(yp).forEach( function(key) {
		r[key] = yp[key];
		});

	//add x's info
	r[xKey] = x[xKey];

	//simple return condition
	if (yLength == 1) {
		return [r];
		}
	else {
		//return current result and grab another y
		return [r].concat(singleX(x,y.slice(0)));
		}
	}
function dualVectors(x,y) {
	//grab communal data up front
	var xLength = x.length;
	var xx = singleX(x.pop(),y.slice(0));

	//Simple return condition
	if (xLength == 1) {
		return xx;
		} 
	else {
		//return current result and grab next
		return xx.concat(dualVectors(x.slice(0),y.slice(0)));
		}
	}


//Generate [ ... {shockName: shock}, ...] style shocks
function firstFormat(shockName, lower, upper) {
	return generateShocks(lower, upper).map(
		function(value){
			rr = {};
			rr[shockName] = value;
			return rr;
			});
	}

//Generate [ ... {shockName: [shock1, shock2, ... shockn]} .. ]
function secondFormat(shockName, lower, upper) {
	rr = {};
	rr[shockName] = generateShocks(lower, upper);
	return rr;
	}


//******************************************************************
//Grabs data from VolKills.org
function getData(url){
	return $.ajax({ url: url, cache: true, async: true});
	}


//******************************************************************
//Round a number to two decimal places

function roundOne(x){
	return Math.round(x*10)/10;
	}


function roundTwo(x){
	return Math.round(x*100)/100;
	}

function roundThree(x){
	return Math.round(x*1000)/1000;
	}


//******************************************************************
//replace all
function replaceAll(find, replace, str) {
	return str.replace(new RegExp(find, 'g'), replace);
	}


//******************************************************************
//******************************************************************
//convert key:values to array
//Not currently required
function convertKeyValuesToArray(keyValues) {
	kvLength = keyValues.length;
	var r = keyValues.pop();
	var value = r[Object.keys(r)[0]];
	if (kvLength == 1) {
		return [value];
		}
	else {
		return [value].concat(convertKeyValuesToArray(keyValues));
		}
	}



