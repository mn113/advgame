/*justnodes = [
	{x:70,y:40},
	{x:130,y:40},
	{x:60,y:50},
	{x:140,y:50},
	{x:60,y:110},
	{x:140,y:110},
	{x:70,y:120},
	{x:130,y:120},
	{x:140,y:150}
];
*/
nodes = {
	1: {x: 60, y: 50, edges: [2,5]},
	2: {x: 70, y: 40, edges: [1,3]},
	3: {x: 130, y: 40, edges: [2,4]},
	4: {x: 140, y: 50, edges: [3,8]},
	5: {x: 60, y: 110, edges: [1,6]},
	6: {x: 70, y: 120, edges: [5,7,9]},
	7: {x: 130, y: 120, edges: [6,8,9]},
	8: {x: 140, y: 110, edges: [4,7,9]},
	9: {x: 140, y: 150, edges: [6,7,8]}
};
// 12 34
// 56 78
//     9

// REALLY USEFUL DEBUGGING:
var canvas = document.createElement("canvas");
canvas.setAttribute("width", 200);
canvas.setAttribute("height", 200);
canvas.setAttribute("style", "position: absolute; x:0; y:0;");
document.getElementById("foreground").appendChild(canvas);
var ctx = canvas.getContext("2d");
//Then you can draw a point at (x,y) like this:
//ctx.fillRect(x,y,1,1);


function lineOfSight(p1, p2) {	// Point arrays e.g. [0,0]
	// Convert passed point objects to arrays:
	if (p1.hasOwnProperty('x') && p2.hasOwnProperty('x')) {
		p1 = [p1.x, p1.y];
		p2 = [p2.x, p2.y];
	}
	var dx = p2[0] - p1[0],
		dy = p2[1] - p1[1],
		dist = p2pDist(p1, p2),
		i;

	console.log(dist, "pixels to goal");
	ctx.fillStyle = "#000000";
	// Increment by roughly 1 pixel per loop:
	for (i = 1; i <= dist; i++) {
		var tx = p1[0] + (dx * i / dist),
			ty = p1[1] + (dy * i / dist);
		// Draw the point:
		ctx.fillRect(tx,ty,1,1);

		// Test (tx,ty):
		if (MYGAME.gridUtils.whichWalkbox([tx,ty]) === false) {
			console.log("failed LOS on pt", i, '@', tx, ',', ty);
			// Draw red blob where LOS failed:
			ctx.fillStyle = "#FF0000";
			ctx.fillRect(tx,ty,3,3);
			return false;
		}
	}
	// All 100 points passed:
	return true;
}
/*function visibleNodes(p1) {		// Array	// Superseded by nodes edges object
	vis = [];
	nodes.forEach(function(node) {
		if (lineOfSight(p1, node)) {
			vis.push(node);
		}
	});
	return vis;
}*/

/*function smoothPath(path) {		// Array
	var savedPath = path;
	// Loop through a copy of pathNodes as trios:
	for (i = 0; i < path.length - 2; i++) {
		var n1 = path[i],
			n2 = path[i+1],
			n3 = path[i+2];
		if (lineOfSight(n1,n3)) {
			// n2 superfluous
			savedPath[i+1] = null;
		}
	}
	// Now prune nulls:
	var shortPath = [];
	for (i = 0; i < savedPath.length; i++) {
		if (savedPath[i] !== null) shortPath.push(savedPath[i]);
	}
	return shortPath;
}*/

function nearestNode(p1) {	// Point array e.g. [0,0]	// FUNCTION COULD USE NODE MAP TO BE QUICKER
	var mindist = 1000000,
		nearest = null,
		idx;
	for (idx = 1; idx <= Object.keys(nodes).length; idx++) {
		var node = nodes[idx];
		var dx = Math.abs(node.x - p1[0]),
			dy = Math.abs(node.y - p1[1]),
			distsq = dx*dx + dy*dy;
		if (distsq < mindist) {
			mindist = distsq;
			nearest = idx;
		}
	}
	return nearest;
}

function p2pDist(p1, p2) {	// Point objects e.g. {x:0, y:0} or Arrays e.g. [0,0]
	// Convert passed point objects to arrays:
	if (p1.hasOwnProperty('x') && p2.hasOwnProperty('x')) {
		p1 = [p1.x, p1.y];
		p2 = [p2.x, p2.y];
	}
	var dx = Math.abs(p2[0] - p1[0]),
		dy = Math.abs(p2[1] - p1[1]);
	return Math.sqrt(dx*dx + dy*dy);
}

function breadthFirstSearch(startNode, finishNode) {	// Ints
	var frontier = [startNode],		// e.g. 1
		camefrom = {},
		current;
	camefrom[startNode] = null;

	while (frontier.length > 0) {
		current = frontier.shift();
		var n = nodes[current],
			i;
		for (i = 0; i < n.edges.length; i++) {
			var edge = n.edges[i];
			if (!camefrom[edge]) {
				frontier.push(edge);
				camefrom[edge] = current;
			}
		}
	}
	// Loop finished: every node now visited
	// Reconstruct path:
	var path = [finishNode];
	current = finishNode;
	while (current !== startNode) {
		current = camefrom[current];
		path.unshift(current);
	}
	return path;
}

// BFSearch(1,4)	->	[1,2,3,4]		// OK
// BFSearch(1,8)	->	[1,2,3,4,8]		// OK
// BFSearch(1,9)	->	[1,5,6,9]		// OK


// Pathfinding algorithm:
function pathFind(start, finish) {	// Point arrays e.g. [0,0]
	var fwb = MYGAME.gridUtils.whichWalkbox(finish),
		pwb = MYGAME.gridUtils.whichWalkbox(start);
	// Test for trivial (nodeless) solution:
	if (fwb === pwb || lineOfSight(steve.coords(), finish)) {	// LOS NOT WORKING
		player.walkTo(finish);
	}
	else {	//	No line-of-sight; BF pathfinding required:
		// Prelim tests:
		var nrNodeA = nearestNode(start),
			nrNodeZ = nearestNode(finish);
		// Get to destination in 2 hops:
		if (nrNodeA === nrNodeZ) {
			player.walkTo(nrNodeA);
			player.walkTo(finish);
			return;
		}
		// Get to destination in 3 hops:
		else if (nodes[nrNodeA].edges.indexOf(nrNodeZ) !== -1) {	// Can use LOS here if no node graph
			player.walkTo(nrNodeA);
			player.walkTo(nrNodeZ);
			player.walkTo(finish);
			return;
		}

		// More than 2 nodes required (proper big-boy algorithm):
		var path = breadthFirstSearch(nrNodeA, nrNodeZ),
			i;
		console.log(path);
		// Traverse:
		for (i = 0; i < path.length; i++) {
			player.walkTo(path[i]);
		}

		// Final line-of-sight hop required to reach click target:
		if (lineOfSight(player.coords(), finish)) {
			console.log("last hop!");
			player.walkTo(finish);
		}
		// If still not at finish, too bad. Hopefully we are cloesr.
	}
	return;
}
