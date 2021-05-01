import GPEasy from './gpeasy.js'

export default class Guido {
    addItems(points){
	this.inputPoints = points;

	var itemPoints = points
	    .map(i => { return [ i.lng, i.lat, 0, 0 ] })
	    .flat();
	this.points = itemPoints;
	return this
    }
    addPath(path){
	var pathPoints = decodePolyline(path).map(p => { return  { lat: p[0], lng: p[1] } });
	var pathLegs = []; for (var p = 1; p < pathPoints.length; p++) { pathLegs.push([ pathPoints[p-1], pathPoints[p] ]) }

	pathPoints.forEach((p, i) => {
	    var a = [p.lng, p.lat];
	    var b = i ? [pathPoints[i-1].lng, pathPoints[i-1].lat] : a;
	    var along = i ? pathPoints[i-1].along : 0;
	    p.along = i ?
		earth_distance(a, b) + along
		: 0;
	})

	console.log(pathPoints);
	
	pathLegs = pathLegs.flat(2)
	    .map(p => [p.lng, p.lat])
	    .flat()

	this.legs = pathLegs;
	this.path = pathPoints;

	return this
    }
    
    calcMatrix(vs, dfs){
	var gpeasy = new GPEasy()
	    .outputSize(this.legs.length / 4, this.points.length / 4)
	    .createProgram(vs, dfs);

	gpeasy.addVariable('legs_data',   new Float32Array(this.legs));
	gpeasy.addVariable('points_data', new Float32Array(this.points));

	gpeasy.addVariable('legs_dimensions',   this.legs.length / 4, 1);
	gpeasy.addVariable('points_dimensions', this.points.length / 4, 1);

	var results = gpeasy.calc({ raw: false, fold: true });
	this.distanceMatrix = results;
	return this;
    }

    calcDistances(){
	var results = this.distanceMatrix;

	var inputPoints = this.inputPoints;
	var distances = results.map((l, i) => {
	    // find minimum distance for all legs
	    var min = Math.min(...l);
	    // get the index
	    var idx = l.indexOf(min)
	    // get the 4 points coordinates for the leg
	    var ln = this.legs.slice(idx * 4 , idx * 4 + 4);
	    // get the 2 point coordinates for the point
	    var pt = this.points.slice(i * 4, i * 4 + 2)
	    // calculate the distance to the segment (this is not necessary - just as comparison with GPU calculation) 
	    var b = distance_to_segment(pt, ln.slice(0, 2), ln.slice(2, 4));

	    return {
		along: this.path[idx].along + b.along,
		closestPoint: { lng: b.point[0], lat: b.point[1] },
		distance: min,
		bearing: b.bearing,
		idx: idx,
		leg: this.path[idx],
		inputPoint: inputPoints[i],
	    };
	});

	this.distances = distances.sort((a, b) => a.along - b.along);

	return this;
    }
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] }

function radians(d){ return d * (Math.PI / 180) }

const earthRadius = 6371008.8;

function earth_distance(a, b){
    var dLat = radians(b[1] - a[1]);
    var dLon = radians(b[0] - a[0]);

    var lat1 = radians(a[1]);
    var lat2 = radians(b[1]);

    var a = Math.pow(Math.sin(dLat / 2), 2) +
          Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);

    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * earthRadius;    
}

function distance_to_segment(p, a, b) {
    const v = [b[0] - a[0],  b[1] - a[1]];
    const w = [p[0] - a[0],  p[1] - a[1]];

    const c1 = dot(w, v);
    var res;
    
    if (c1 <=  0) {
	return {
	    distance: earth_distance(p, a),
	    point: a,
	    along: 0,
	    bearing: bearing(p, a)
	}
    }

    const c2 = dot(v, v);
    if (c2 <= c1) {
	return {
	    distance: earth_distance(p, b),
	    point: b,
	    along: earth_distance(a, b),
	    bearing: bearing(p, b)
	}
    }

    const b2 = c1 / c2;
    const Pb = [a[0] + (b2 * v[0]), a[1] + (b2 * v[1])];

    // distance, closest point
    return {
	distance: earth_distance(p, Pb),
	point: Pb,
	along: earth_distance(a, Pb),
	bearing: bearing(p, Pb)
    }
}

// ---------------------------------------------
// from https://github.com/mapbox/polyline
// ---------------------------------------------
var decodePolyline = function(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, Number.isInteger(precision) ? precision : 5);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.

    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
};


var deg2rad = function(degrees) { return degrees * Math.PI / 180 }
var rad2deg = function(radians) { return radians * 180 / Math.PI }

// from https://github.com/Turfjs/turf/blob/master/packages/turf-bearing/index.ts

function bearing(pa, pb) {
    
    const lon1 = deg2rad(pa[0]);
    const lon2 = deg2rad(pb[0]);
    const lat1 = deg2rad(pa[1]);
    const lat2 = deg2rad(pb[1]);

    const a = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const b =
	  Math.cos(lat1) * Math.sin(lat2) -
	  Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    
    return rad2deg(Math.atan2(a, b));
}

    
