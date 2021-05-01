import GPEasy from './gpeasy.js'

// -------------------------
// Claudio deConto
// 335 727 5718
// -------------------------

$(function(){
    Promise.all([
	axios.get('/directions.json'),
	axios.get('/items.json'),
	axios.get('/shaders/vert.glsl'),
	axios.get('/shaders/minima.glsl'),	
    ]).then(r => {
	var vs =  r[2].data;
	var dfs = r[3].data;

	console.time('distances calc')
	
	var itemPoints = r[1].data.results
	    .map(i => { return [ i.lng, i.lat, 0, 0 ] })
	    .flat();

	var pathPoints = polyline.decode(r[0].data.route.paths[0].points).map(p => { return  { lat: p[0], lng: p[1] } });
	var pathLegs = []; for (var p = 1; p < pathPoints.length; p++) { pathLegs.push([ pathPoints[p-1], pathPoints[p] ]) }

	pathLegs = pathLegs.flat(2)
	    .map(p => [p.lng, p.lat])
	    .flat()

	var itemPoints = r[1].data.results
	    .map(i => { return [ i.lng, i.lat, 0, 0 ] })
	    .flat();

	var gpeasy = new GPEasy()
	    .outputSize(6, itemPoints.length / 4)
	    .createProgram(vs, dfs);
	
	gpeasy.addVariable('legs_data',   new Float32Array(pathLegs));
	gpeasy.addVariable('points_data', new Float32Array(itemPoints));
	gpeasy.addVariable('legs_dimensions',   pathLegs.length / 4, 1);
	gpeasy.addVariable('points_dimensions', itemPoints.length / 4, 1);

	var distances = gpeasy.calc({ raw: false, fold: true });

	console.timeEnd('distances calc')

	var fields = ['distance', 'lng', 'lat', 'leg', 'pos', 'bearing'];
	distances = distances.map(
	    (d, i) => {
		var h = {}
		fields.forEach((f, i) => h[f] = d[i])
		h = Object.assign(h, r[1].data.results[i]);
		return h
	    }
	).sort((a, b) => {
	    return a.leg - b.leg || a.pos - b.pos || a.distance - b.distance;
	});
	axios.post('distances', distances)
	    .then(d => console.log(d.data))
	    .catch(e => console.log(e))
	
    }).catch(e => console.log(e))
})
