/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Global scoping / namespacing function:
var MYGAME = (function($) {
	this.config = {
		chapter: 0,
		stage: 0,
		language: 'en'
	};
	this.state = {
		cursor: {mode: 'default'},
		paused: false,
		gametime: 0		// count seconds elapsed
	};
	this.doordirs = {
		'n': 90,
		'e': 180,
		's': -90,
		'w': 0
	};		// constant
	this.rooms = [];			// filled by external files
	this.prevRoom = null;		// previous room id
	this.curRoom = null;		// current room object
	this.player = null;
	// Entities within the game (characters, items, scenery...) stored by id
	this.entities = {};
	this.npcs = {};
	this.progress = {};
	this.dialogues = {};		// Filled by external file
	this.commandObj = {
		verb: null,
		noun1: null,
		noun2: null
	};

	// REALLY USEFUL DEBUGGING CANVAS:
	this.canvas = document.createElement("canvas");
	this.canvas.setAttribute("width", 640);
	this.canvas.setAttribute("height", 400);
	document.getElementById("gamebox").appendChild(this.canvas);
	this.ctx = this.canvas.getContext("2d");
	// Then you can draw a point at (x,y) like this: ctx.fillRect(x,y,1,1);
	
	// All utility functions:
	var utils = {
		ui: {
			// Refresh tooltips (needed when item added):
			ttRefresh: function() {
				$("div.item").tooltip({	// NOT WORKING IN FG
					items: "div[id]",
					content: function() {
						return $(this).attr("id");
					},
					show: {
						delay: 750	// a reasonable delay makes dragging/dropping/sorting a lot easier
					},
					tooltipClass: "tt",
					track: true
				});
			},
			// Switches body class to reflect mode:
			toolMode: function(mode) {
				if (mode) {
					// Sets the body css class to enable a custom cursor:
					$("body").removeClass().toggleClass(mode);
				}
				MYGAME.state.cursor.mode = mode || 'default';

				// Select the verb box:
				var $verbs = $("#toolMenu2 li");
				var $verb = $verbs.filter($("#"+mode));
				$verbs.removeClass("selected");
				$verb.addClass("selected");

				utils.ui.addToCommand('verb', $verb.html());
			},
			// Handles action when an object is clicked on with a mode cursor:
			modedClick: function(targetObj) {
				switch ($("body").attr("class")) {
					case 'examine':
						MYGAME.player.examine(targetObj);
						break;
					case 'talkto':
						MYGAME.player.talkTo(targetObj);
						break;
					case 'pickup':
						MYGAME.player.pickUp(targetObj);
						break;
					case 'use':
						MYGAME.player.use(targetObj);
						break;
					default:
						break;
				}
				// Unset mode & cursor:
				utils.ui.toolMode();
			},
			// Adds a verb or noun to the command object:
			addToCommand: function(type, value) {
				// Fetch commandObj:
				var c = MYGAME.commandObj,
					command = '';

				// Process input:
				if (type === 'verb') {
					c.verb = value;
				}
				else if (type === 'item' || type === 'scenery' || type === 'character') {
					if (!c.noun1) {
						c.noun1 = value;
					}
					else if (c.noun1 && !c.noun2) {
						c.noun2 = value;
					}
				}

				utils.ui.showCommand();

				return this;
			},
			// Displays/refreshed the onscreen command line:
			showCommand: function() {
				// Fetch commandObj:
				var c = MYGAME.commandObj,
					command = '';

				// Add prepositions:
				if (c.verb === 'use' && c.noun1 && c.noun2) {
					command = "Use " + c.noun1 + " with " + c.noun2;
				}
				else if (c.verb === 'give' && c.noun1 && c.noun2) {
					command = "Give " + c.noun1 + " to " + c.noun2;
				}
				else if (c.verb && c.noun1) {
					command = c.verb + " " + c.noun1;
				}
				else if (c.verb) {
					command = c.verb;
				}

				// Display current command:
				$("#command").html(command);

				return this;
			},
			// Resets one or all parts of the command object:
			resetCommand: function(part) {
				// Fetch commandObj:
				var c = MYGAME.commandObj;

				if (part === 'noun') {
					if (!c.noun2) {
						c.noun1 = null;
					}
					c.noun2 = null;
				}
				else if (part === 'verb') {
					c.verb = null;
				}
				else {
					// Reset all:
					c.verb = null;
					c.noun1 = null;
					c.noun2 = null;
					// Empty the command line:
					$("#command").html('');
					return this;
				}

				// Display modified command line:
				utils.ui.showCommand();

				return this;
			},
			// Try to execute the current command:
			executeCommand: function() {		// UNTESTED
				// Fetch commandObj:
				var c = MYGAME.commandObj,
					ens = MYGAME.entities,
					obj1, obj2;

				// Sanity check:
				if (!c.verb || !c.noun1) { return false; }

				// Look up nouns:
				if (ens.hasOwnProperty(c.noun1)) {
					obj1 = ens[c.noun1];
				}
				if (c.noun2 && ens.hasOwnProperty(c.noun2)) {
					obj2 = ens[c.noun2];
				}

				// Act:
				if (obj2) {
					if (c.verb === 'Use' || (c.verb === 'Give' && obj2.type === 'character')) {
						MYGAME.player.use(obj1, obj2, true);
					}
				}
				else {
					if (c.verb === 'Talk to' && obj1.type === 'character') {
						MYGAME.player.talkTo(obj1);
					}
					else if (c.verb === 'Use') {
						MYGAME.player.use(obj1, 'itself', true);
					}
					else if (c.verb === 'Pick up') {
						MYGAME.player.pickUp(obj1);
					}
					else if (c.verb === 'Examine') {
						MYGAME.player.examine(obj1);
					}
					else if (c.verb === 'Walk to') {
						MYGAME.player.walkTo(obj1);
					}
				}

				utils.ui.resetCommand('all');
			},
			//
			selectVerb: function(verb) {

			}
		},
		grid: {
			// Looks up the Boolean value for a tile in the binary NavMesh
/*			tileLookup: function(gridref) {
				var x = gridref[0],
					y = gridref[1];
				return MYGAME.maps.demograph.grid[x][y].isWall();
			},
			// Returns all valid neighbour tiles of a given tile
			// CAN REPLACE THIS WITH Graph.neighbors() FROM ASTAR
			neighbours: function(gridref) {
				var r1 = gridref[0],
					c1 = gridref[1],
					r0 = r1 - 1,
					r2 = r1 + 1,
					c0 = c1 - 1,
					c2 = c1 + 1,
					// Compile the 8 neighbouring refs:
					allneighbs = [[r0,c0], [r0,c1], [r0,c2], [r1,c0], [r1,c2], [r2,c0], [r2,c1], [r2,c2]],
					validneighbs = [];

				//	console.log("Neighbours?:", allneighbs);
				var i;
				for (i = 0; i < allneighbs.length; i++) {
					var nb = allneighbs[i];
					if (MYGAME.utils.grid.tileLookup(nb, MYGAME.maps.demograph)) {	// valid tiles return 1
						validneighbs.push(nb);
					}
				}
				console.log("Valid:", validneighbs);
				return validneighbs;
			},
			// Checks if two tiles are adjacent:
			isAdjacent: function(ref1, ref2) {
				if (Math.abs(ref1[0] - ref2[0]) < 2) {			// x within 1
					if (Math.abs(ref1[1] - ref2[1]) < 2) {		// y within 1
						return true;
					}
				}
				return false;
			},
			// Lights up a single tile e.g. J4
			highlightTile: function(gridref) {
				var col = gridref[0],
					row = gridref[1];
				// Add highlighting div to DOM and position at gridref:
				$("<div class='highlight'>").appendTo("#background")
											.css("left", col * 20 + "px")
											.css("top", (row * 20) + 40 + "px");
			},
			// Loop through a list of tiles and highlight them all
			highlightTiles: function(list) {
				var i;
				for (i = 0; i < list.length; i++) {
					MYGAME.utils.grid.highlightTile(list[i]);
				}
			},
			// Remove all current tile highlights
			highlightsOff: function() {
				$("div.highlight").remove();
			},
			// Returns the 'base' coordinates of a DOM object:
			baseCoords: function(obj) {
				var hx = $(obj).position().left + 16,	// NEEDS TO HANDLE DIFFERENT SPRITE SIZES
					hy = $(obj).position().top + 44;	// + $obj.css("height") - 4
				return [hx,hy];
			},
			// Converts [x,y] coordinates to a grid reference:
			gridref: function(coords) {
				var gridx = Math.ceil(coords[0] / 20) - 1,
					gridy = Math.ceil(coords[1] / 20) - 1;
				return [gridx, gridy];
			},
*/			// Returns a random point on the stage (NOT NECESSARILY VALID YET):
			randomPoint: function() {
				var rndx = Math.random() * $("#midground").width,
					rndy = Math.random() * $("#midground").height;
				return [rndx, rndy];
			},
			// Returns distance between two objects (closest edge each):
			dist: function(objA, objB) {
				// Get all edge coords:
				var a = objA.jqDomNode.position(),
					b = objB.jqDomNode.position();
				var ax1 = a.left,
					ax2 = ax1 + objA.jqDomNode.width,
					bx1 = b.left,
					bx2 = bx1 + objB.jqDomNode.width;
				var ay1 = a.top,
					ay2 = ay1 + objA.jqDomNode.height,
					by1 = b.top,
					by2 = by1 + objB.jqDomNode.height;

				// Find the difference in closest edges: (overlap case not considered important)
				var dx = (ax2 <= bx1) ? bx1 - ax2 : ax1 - bx2,
					dy = (ay2 <= by1) ? by1 - ay2 : ay1 - by2,
					dist = Math.sqrt(dx * dx + dy * dy);
				return dist;
			},
			// Third-party imported function; returns true if point p lies inside a polygon:
			pointIsInPoly: function(p, polygon) {	// Point object e.g. {x:0, y:0}; polygon as array of points
				var isInside = false;
				// Test all vertices to find max/min x & y for a bounding box:
				var minX = polygon[0].x, maxX = polygon[0].x,
					minY = polygon[0].y, maxY = polygon[0].y,
					n;
				for (n = 1; n < polygon.length; n++) {
					var q = polygon[n];
					minX = Math.min(q.x, minX);
					maxX = Math.max(q.x, maxX);
					minY = Math.min(q.y, minY);
					maxY = Math.max(q.y, maxY);
				}

				if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
					// Point outside bounding box
					return false;
				}

				// Clever part:
				var i = 0, j = polygon.length - 1;
				for (i, j; i < polygon.length; j = i++) {
					if ( (polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
							p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
						isInside = !isInside;
					}
				}

				return isInside;
			},
			// Checks all walkboxes to see which (if any) a point lies in:
			whichWalkbox: function(point) {		// Point array e.g. [0,0]
				var wbname,
					curRoom = MYGAME.curRoom;
				for (wbname in curRoom.walkboxes) {
					// Extract the points array from the walkboxes member:
					var polygon = curRoom.walkboxes[wbname].points,
						// Convert our point to {x,y}
						pxy = { x: point[0], y: point[1] };
					if (MYGAME.utils.grid.pointIsInPoly(pxy, polygon)) {
						return wbname;
					}
				}
				// If no match:
				return false;
			},
			// Prepare SVG details attribute from walkbox coordinates object:
			walkboxes2svg: function() {
				// First up are the paths:
				var walkboxes = MYGAME.curRoom.walkboxes;
				var deets, wb, pts, pt, p;
				for (wb in walkboxes) {
					deets = "M";
					pts = walkboxes[wb].points;
					// Build the string point by point:
					for (pt in pts) {
						p = pts[pt];
						deets += p.x + ' ' + p.y;
						deets += ",L";
					}
					// Replace final ,L with Z:
					deets = deets.substring(0, deets.length - 2);
					deets += "Z";
					console.log(wb, deets);
					// Stick the SVG path into the HTML:
					$("<path>").attr("id", wb)
							   .attr("d", deets)
							   .appendTo("#pathsvg");
				}

				// Next up are the nodes (a bit simpler):
				var nodes = MYGAME.curRoom.nodes;
				var nid, n;
				for (nid in nodes) {
					n = nodes[nid];
					// Stick the SVG path into the HTML:
					$("<circle>").attr("id", "node" + nid)
								 .attr("cx", n.x)
								 .attr("cy", n.y)
								 .attr("r", 3)
								 .appendTo("#pathsvg");
				}
				return;
			},
			// Looks up the walkbox scale value at any given point:
			scaleAtPoint: function(point) {
				var wbname = utils.grid.whichWalkbox(point);
				var wb = MYGAME.curRoom.walkboxes[wbname];
				return wb.scale;
			}
		},
		pathfinding: {
			// Converts a node (e.g. 1) to a point array e.g. [0,0]:
			node2point: function(node) {
				var room = MYGAME.curRoom;
				return [room.nodes[node].x, room.nodes[node].y];
			},
			// Point to point distance calculation:
			p2pDist: function(p1, p2) {	// Point objects e.g. {x:0, y:0} or Arrays e.g. [0,0] or Nodes
				// Convert passed point objects to arrays:
				if (p1.hasOwnProperty('x')) {
					p1 = [p1.x, p1.y];
				}
				if (p2.hasOwnProperty('x')) {
					p2 = [p2.x, p2.y];
				}
				// Convert nodes to arrays:
				if (typeof p1 === 'number') {
					p1 = utils.pf.node2point(p1);
				}
				if (typeof p2 === 'number') {
					p2 = utils.pf.node2point(p2);
				}

				// Calculate Euclidean distance:
				var dx = Math.abs(p2[0] - p1[0]),
					dy = Math.abs(p2[1] - p1[1]);
				return Math.sqrt(dx*dx + dy*dy);
			},
			// Returns true if two points have line-of-sight connection:
			lineOfSight: function(p1, p2) {	// Point arrays e.g. [0,0]
				// Convert passed point objects to arrays:
				if (p1.hasOwnProperty('x') && p2.hasOwnProperty('x')) {
					p1 = [p1.x, p1.y];
					p2 = [p2.x, p2.y];
				}
				var dx = p2[0] - p1[0],
					dy = p2[1] - p1[1],
					dist = utils.pf.p2pDist(p1, p2),
					i;

				var ctx = MYGAME.ctx;
//				console.log(dist, "pixels to goal");
				ctx.fillStyle = "#000000";
				// Increment by roughly 1 pixel per loop:
				for (i = 1; i <= dist; i++) {
					var tx = p1[0] + (dx * i / dist),
						ty = p1[1] + (dy * i / dist);
					// Draw the point:
					ctx.fillRect(tx,ty,1,1);

					// Test (tx,ty):
					if (utils.grid.whichWalkbox([tx,ty]) === false) {
						console.log("failed LOS on pt", i, '@', tx, ',', ty);
						// Draw red blob where LOS failed:
						ctx.fillStyle = "#FF0000";
						ctx.fillRect(tx,ty,3,3);
						return false;
					}
				}
				// All 100 points passed:
				return true;
			},
			// Returns the nearest node to a point:
			nearestNode: function(p1, room) {	// Point array e.g. [0,0]	// FUNCTION COULD USE NODE MAP TO BE QUICKER
//				console.log("nn", room);
				var mindist = 1000000,
					nearest = null,
					idx;
				for (idx = 1; idx <= Object.keys(room.nodes).length; idx++) {
					var node = room.nodes[idx];
					var dx = Math.abs(node.x - p1[0]),
						dy = Math.abs(node.y - p1[1]),
						distsq = dx*dx + dy*dy;
					if (distsq < mindist) {
						mindist = distsq;
						nearest = idx;
					}
				}
				return nearest;
			},
			// Search algorithm checks all nodes in nodelist from start until finish is found:
			breadthFirstSearch: function(startNode, finishNode, room) {	// Ints
				var frontier = [startNode],		// a queue, i.e. add to the back, take from the front
					camefrom = {},
					current;
				camefrom[startNode] = null;

//				console.log("Room nodes:", room.nodes);

				// Visit all nodes:
				while (frontier.length > 0) {
					current = frontier.shift();
					var n = room.nodes[current],
						i;
//					console.log("Current:", current, "n:", n);
					for (i = 0; i < n.edges.length; i++) {
						var edge = n.edges[i];
//						console.log("i:", i, "edge:", edge);
						if (!camefrom[edge]) {
							// Expand the frontier to non-visited nodes:
							frontier.push(edge);
							camefrom[edge] = current;
						}
//						console.log("camefrom:", camefrom);
					}
				}
				// Loop finished: every node now visited.
				// Reconstruct path:
				var path = [finishNode];
				current = finishNode;
				while (current !== startNode) {
					current = camefrom[current];
					path.unshift(current);
				}
				return path;
			},
			// Pathfinding algorithm:
			pathFind: function(start, finish, room) {	// Point arrays e.g. [0,0]
//				console.log("pf", room);
				var player = MYGAME.player;
				var fwb = utils.grid.whichWalkbox(finish),
					pwb = utils.grid.whichWalkbox(start),
					dist;
				// Test for trivial (nodeless) solution:
				if (fwb === pwb || utils.pf.lineOfSight(start, finish)) {
					dist = utils.pf.p2pDist(start, finish);
					player.walkTo(finish, dist);
					return false;
				}
				else {	//	No line-of-sight; BF pathfinding required:
					// Prelim tests:
					var nrNodeA = utils.pf.nearestNode(start, room),
						nrNodeZ = utils.pf.nearestNode(finish, room),
						dist1 = utils.pf.p2pDist(start, nrNodeA),
						dist2 = utils.pf.p2pDist(nrNodeZ, finish);
					// Get to destination in 2 hops:
					if (nrNodeA === nrNodeZ) {
						player.walkTo(nrNodeA, dist1);
						player.walkTo(finish, dist2);
						return false;
					}

					// More than 2 nodes required (proper big-boy algorithm):
					var path = utils.pf.breadthFirstSearch(nrNodeA, nrNodeZ, room); // path returned is just nodes, e.g. [1,3,5]
					var pl = path.length;
					var i;
					console.log(1, path);

					// Convert path of nodes to path of coords:
					for (i = 0; i < pl; i++) {
						var node = path[i];
						path[i] = [room.nodes[node].x, room.nodes[node].y];
					}
					console.log(2, path.toString());

					// Mark any redundant nodes from the start:
					for (i = 0; i < pl - 1; i++) {
						var nextNode = path[i+1];
						// If we see next node, null this one:
						if (utils.pf.lineOfSight(start, nextNode)) {
							path[i] = null;
						}
					}
					// Mark any redundant nodes from the end:
					for (i = pl - 1; i > 0; i--) {
						var prevNode = path[i-1];
						// If we see previous node, null this one:
						if (prevNode !== null && utils.pf.lineOfSight(finish, prevNode)) {
							path[i] = null;
						}
					}
					console.log(3, path.toString());

					// Now prune nulls:
					var shortPath = [];
					for (i = 0; i < pl; i++) {
						if (path[i] !== null) { shortPath.push(path[i]); }
					}
					console.log(4, shortPath.toString());

					// Add on start and end coords:
					shortPath.unshift(player.coords());
					shortPath.push(finish);
					console.log(5, shortPath.toString());

					return shortPath;
				}
			},
			// Smooth out a path by removing middle nodes from straight sections:	// BAD ALGO
			/*smoothPath: function(path) {		// Array
				var savedPath = $.extend({}, path);		// Clone path by value (shallow copy)
				var i;
				// Loop through a copy of pathNodes as trios:
				for (i = 0; i < path.length - 2; i++) {
					var n1 = path[i],
						n2 = path[i+1],
						n3 = path[i+2];
					if (utils.pf.lineOfSight(n1,n3)) {
						// point n2 superfluous; set to null:
						savedPath[i+1] = null;
					}
				}
				// Now prune nulls:
				var shortPath = [];
				for (i = 0; i < savedPath.length; i++) {
					if (savedPath[i] !== null) { shortPath.push(savedPath[i]); }
				}
				return shortPath;
			}*/
			// Puts high or wall clicks down into the appropriate walkbox:
			correctY: function(point) {	// Point array e.g. [0,0]
				var newpoint = point,
					$fg = $("#midground"),
					bottom = parseInt($fg.css("height"), 10);
				// Increase Y incrementally:
				while (newpoint[1] < bottom) {
					newpoint[1] += 5;
					if ( utils.grid.whichWalkbox(newpoint) !== false ) { return newpoint; }
				}
				// Reset and decrease Y incrementally;
				newpoint = point;
				while (newpoint[1] > MYGAME.curRoom.baseline) {
					newpoint[1] -= 5;
					if ( utils.grid.whichWalkbox(newpoint) !== false ) { return newpoint; }
				}
				// No valid walkbox found by Y-increase
				// WHAT ABOUT SEARCHING ACROSS?
				return false;
			}
		},
		room: {
			// Switch to another room:
			change: function(dest) {	// Int
				var current = MYGAME.curRoom;
				console.warn("Moving from room", current.id, "to", dest);
				// Set current room as previous:
				MYGAME.prevRoom = current;
				// Unload:
				current.unload();	// NOT QUICK ENOUGH

				// Check if dest in rooms:
				if (typeof MYGAME.rooms[dest] === 'object' ) {
					// Load room from existing record:
					current = MYGAME.rooms[dest];
					var newroom = new MYGAME.Room(current);	// All saved properties are passed into the constructor
					newroom.load();

					// Add room's entities back in, after a delay:
					setTimeout(function() {
						newroom.populate();
					}, 1500);
				}
				else {
					// Load from file:
					setTimeout(function() {
						utils.misc.loadScript("room" + dest);	// Script includes Room loading
					}, 1500);
				}
			},
			// Scroll the screen left or right by some amount:
			scrollX: function(dir, amount) {		// e.g. "L", 50
				var $bg = $("#background"),
					$fg = $("#midground"),
					$svg = $("#pathsvg"),
					// Note: CSS left becomes negative as we scroll. Multiplying it by -1 makes the maths saner.
					bgPos = -1 * parseInt($bg.position().left, 10),
					min = 0,
					max = parseInt($bg.css("width"), 10) - 640;
				// Check if scroll possible first:
				if ((dir === 'L' && bgPos - 5 < min) || (dir === 'R' && bgPos + 5 > max)) {
					console.log("Cannot scroll out-of-bounds.");
					return;
				}

				var delta;
				if (dir === 'L') { delta = '+=5px'; }
				else if (dir === 'R') { delta = '-=5px'; }

				// Scroll incrementally:
				var scrolledpx = 0;
				while (scrolledpx < amount) {
					$bg.animate({"left": delta}, 10, 'linear');
					$fg.animate({"left": delta}, 10, 'linear');
					$svg.animate({"left": delta}, 10, 'linear');
					scrolledpx += 5;
					// Are we too close to left or right limit?:
					bgPos = -1 * parseInt($bg.position().left, 10);
					if ((dir === 'L' && bgPos - 10 < min) || (dir === 'R' && bgPos + 10 > max)) {
						break;
					}
				}
				console.log("BG @", bgPos);
				return;
			},
			// Scroll the screen to a particular spot e.g. [0,0]:
			scrollTo: function(origin) {
				var $layers = $("#background, #midground, #foreground, #pathsvg");
				$layers.css({"left": -1 * origin[0], "top": -1 * origin[1]});
			},
			// Run this when player is moving about to decide when scrolling is necessary:
			scrollDecide: function(point) {
				var $bg = $("#background"),
					$gbox = $("#gamebox"),
					// Note: CSS left becomes negative as we scroll. Multiplying it by -1 makes the maths saner.
					bgPos = -1 * parseInt($bg.position().left, 10),
					min = 0,
					max = parseInt($bg.css("width"), 10) - 640;

				// Do not scroll if player will end up offscreen:
				if (Math.abs(MYGAME.player.x - point[0]) > 480) {
					return;
				}

				// Scroll if click not central:
				console.log(point[0] - bgPos + "px relative to gamebox.");
				if (point[0] - bgPos < 160 && bgPos > min) {		// click in first quarter of viewport
					utils.room.scrollX("L", 160);
				}
				else if (point[0] - bgPos > 480 && bgPos < max) {	// click in final quarter of viewport
					utils.room.scrollX("R", 160);
				}
			}
		},
		misc: {
			disableInput: function() {},
			enableInput: function() {},
			loadScript: function(name) {
				console.warn("Fetching script", name + ".js");
				var script= document.createElement('script');
			   script.type= 'text/javascript';
			   script.src= '/js/' + name + '.js';
			   script.async = true;
			   document.body.appendChild(script);
			}
		},
		session: {
			// Save the state of the game to browser storage:
			saveGame: function() {
				// Check for localStorage:
				if (typeof Storage !== "undefined") {
					var s = MYGAME.state,
						n = MYGAME.npcs,
						i = MYGAME.player.inventory,
						p = MYGAME.progress,
						e = MYGAME.entities,
						r = MYGAME.rooms;
					var ts = new Date();
					var saveObj = JSON.stringify([s,n,i,p,e,r]);
					console.log(saveObj);
					// Save:
					localStorage.setItem("SavedGame" + ts, saveObj);
					console.log("Game saved at", ts);
				}
				else {
					console.log("No Web Storage support.");
				}
			},
			// Restore a saved game stored in browser storage:
			loadGame: function(ts) {
				var loadObj = JSON.parse(localStorage.getItem(ts));
				// Restore all data:
				MYGAME.state = loadObj[0];
				MYGAME.npcs = loadObj[1];
				MYGAME.player.inventory = loadObj[2];
				MYGAME.progress = loadObj[3];
				MYGAME.entities = loadObj[4];
				MYGAME.rooms = loadObj[5];
				// Further loading code...
				console.log("Game loaded.");
			},
			// Present dialog for user to select a previously saved game to load:
			chooseSavedGame: function() {
				var thing;
				// Access browser storage:
				for (thing in localStorage) {
					// Build a basic chooser:
					var $a = $("<a>").html(thing);
					$a.appendTo("#displayChoices");
				}
				$("#displayChoices").on("click", "a", function() {
					// Load the savegame with the clicked timestamp:
					utils.session.loadGame($(this).html());
					// Clean up:
					$("#displayChoices").html('');
					return;
				});
			}
		}
	};
	utils.pf = utils.pathfinding;	// shorthand

	// OBJECT CONSTRUCTORS & METHODS FOLLOW:

	/**
	* Room structure
	* @constructor
	* @param {int}		options.id
	* @param {string}	options.name
	* @param {Boolean}	options.unlocked
	* @param {Boolean}	options.scrollable
	* @param {int}		options.entry
	*/
	function Room(options) {	// (id, name, unlocked, scrollable, entry)
		// Essentials:
		this.id = options.id || null;
		this.name = options.name || null;
		this.entry = options.entry || 0;				// determines where player will appear
		this.unlocked = options.unlocked || false;		// whether room has been unlocked yet
		this.filename = options.filename || "room" + this.id + ".html";	// needed for loading room's static HTML
		this.entities = options.entities || {};
		this.scrollable = options.scrollable || false;
		this.defaultScroll = options.defaultScroll || [0,0];
		this.monoscale = (typeof options.monoscale === "undefined") ? true : options.monoscale;	// Monoscale unless declared

		this.spawnPoints = options.spawnPoints || {};
		this.exits = options.exits || {};			// loaded from file the first time
		this.nodes = options.nodes || {};			// loaded from file the first time
		this.walkboxes = options.walkboxes || {};	// loaded from file the first time
		this.baseline = options.baseline || {};		// loaded from file the first time

		// Store by id in rooms hash:
		MYGAME.rooms[this.id] = this;

		return this;
	}
	Room.prototype.load = function(_callback) {
		var me = this;
		$("#gamebox").addClass("room" + this.id);
		// Fetch and append level-specific elements to HTML:
		$("#gamebox #foreground").load(this.filename + " #foreground *");
		$("#gamebox #background").load(this.filename + " #background *", function(response, status, xhr) {
			if (status === "success") {
				console.info("Room", me.id, "loaded.");
				console.info(me);
				utils.room.scrollTo(me.defaultScroll);
				me.fadeIn();
				me.announce();

				// Continue the loading in room.js (after a short wait - ensures DOM ready):
				if (_callback && typeof _callback === "function") {
					setTimeout(_callback, 500);
				}
			}
		});
		setTimeout(this.spawnPlayer.bind(this), 1000);
	};
	Room.prototype.unload = function() {
		var me = this;
		this.fadeToBlack();
		setTimeout(function() {
			$("#gamebox").removeClass("room" + me.id);
			// Remove level-specific elements from HTML:
			$("#background *").remove();
			$("#midground *").not("#steve, #argyle_guy").remove();	// REDUNDANT
			$("#foreground *").remove();
			$("#pathsvg *").remove();
			console.info("@", new Date().getTime(), 'unload() completed for Room', this.id);
		}, 800);
		return this;
	};
	Room.prototype.fadeIn = function() {
		$("#blackout").show().fadeOut(2000);
		return this;
	};
	Room.prototype.fadeToBlack = function() {
		$("#blackout").fadeIn(1000);
		return this;
	};
	Room.prototype.announce = function() {
		// Put Room name briefly on screen
		$(".announce").html(this.name).show().delay(1500).fadeOut(2000);
		return this;
	};
	Room.prototype.populate = function() {
		// Loop through all entities and recreate their HTML, attach jqDomNodes:
		var eid, ent;
		for (eid in this.entitites) {
			ent = this.entities[eid];
			ent.createHTML();
		}
	};
	Room.prototype.spawnPlayer = function() {
		var player = MYGAME.player;
		// Get player's spawn data for the entry used:
		var spawnPt = this.spawnPoints[this.entry];
		// Place player into room:
		if (typeof spawnPt !== "undefined") {
			player.placeAt([spawnPt.x, spawnPt.y]).face(spawnPt.face).show();
		}
		else {	// Default placement if data missing:
			player.placeAt([300,200]).face('ss').show();
		}

		// Fix updateXYZ() setting correct position too soon bug:
		setTimeout(function() {
			player.updateXYZ();
		}, 200);
	};


	/**
	* _BaseObj structure
	* @constructor
	* @param {string} id
	* @param {string} name
	* @param {string} type
	* @param {string} layer
	* @param {Boolean} visible
	*/
	function _BaseObj(options) {	// (id, name, type, layer, width, height, visible)
		// Essentials:
		this.id = options.id;									// Everything must have an id
		this.name = options.name;								// Everything must have a name
		this.type = options.type;
		this.layer = options.layer;
		this.width = options.width || null;
		this.height = options.height || null;
		this.scale = options.scale || 1;
		this.visible = (typeof options.visible === "undefined") ? true : options.visible; // Visible unless declared
		this.looksCtr = options.looksCtr || 0;					// Everything can be looked at 0 or more times
		this.anchorOffset = options.anchorOffset || [0,0];		// Every sprite needs an anchor offset
		this.anchorOffsetDefault = options.anchorOffsetDefault || [0,0];
		this.x = options.x || 0;								// Everything must have coordinates
		this.y = options.y || 0;
		this.z = options.z || 0;
		this.giveable = false;
		this.classes = options.classes || null;
		this.clickable = options.clickable || null;
		this.descriptions = options.descriptions || null;
		this.onExamine = options.onExamine || null;
		this.uses = options.uses || null;

		this.createHTML();	// Sets up the jqDomNode, adds classes, css, etc.

		// Store by id in entities hash:
		MYGAME.entities[this.id] = this;
		MYGAME.curRoom.entities[this.id] = this;	// WHICH ONE SHALL I USE DEFINITIVELY?

		return this;
	}
	_BaseObj.prototype.createHTML = function() {
		// Create an interactive HTML element on the appropriate layer:
		this.jqDomNode = $("<div>", {'id': this.id, 'class': this.type}).addClass("scale10").appendTo("#"+this.layer);
		console.log("@", new Date().getTime(), 'HTML created for', this.id);

		// Add any extra classes:
		if (this.classes) { this.jqDomNode.addClass(this.classes); }
		// Set a class if not clickable:
		if (this.clickable === false) { this.jqDomNode.addClass("dead"); }
		// Set a non-default width & height, if defined:
		if (this.width) {this.jqDomNode.css("width", this.width);}
		if (this.height) {this.jqDomNode.css("height", this.height);}
		// Set visibility:
		if (!this.visible) { this.jqDomNode.hide(); }

		return this;
	};
	_BaseObj.prototype.placeAt = function(coords) {
//		console.log("@", new Date().getTime(), 'placeAt() called for', this.id);
		this.jqDomNode.css("left", coords[0] - this.anchorOffset[0]);		// Compensate for anchor point
		this.jqDomNode.css("top", coords[1] - this.anchorOffset[1]);		// being inside sprite
		this.updateXYZ();
		// Update HTML visibility:
		if (this.visible) {
			this.jqDomNode.show();
		}
		else {
			this.jqDomNode.hide();
		}
//		this.reportLoc();
		return this;
	};
	_BaseObj.prototype.updateXYZ = function() {
//		console.log("@", new Date().getTime(), 'updateXYZ() called for', this.id);
		// Set sprite's anchor coords:
		this.x = this.jqDomNode.position().left + this.anchorOffset[0];		// Object's own x & y are INSIDE the div
		this.y = this.jqDomNode.position().top + this.anchorOffset[1];
		// Set Z-index (same as Y-coord except in non-flat locations):
		this.z = this.y;
		this.jqDomNode.css("z-index", this.z);
		return this;
	};
	_BaseObj.prototype.coords = function() {
		return [this.x, this.y];
	};
	_BaseObj.prototype.gridref = function() {
		var gridx = Math.ceil(this.x / 20) - 1,
			gridy = Math.ceil(this.y / 20) - 1;
		return [gridx, gridy];
	};
	_BaseObj.prototype.reportLoc = function() {
		console.info(this.id + ": I'm at (" + this.x + ', ' + this.y + '), Z-' + this.z + ", scale " + this.scale + ", visibility " + this.visible);
	};
	_BaseObj.prototype.remove = function() {
		// From DOM:
		this.jqDomNode.remove();

		// From Entities:
		delete MYGAME.entities[this];

		console.log(this.id, "removed.");
	};
	_BaseObj.prototype.hide = function() {
		this.jqDomNode.hide();
		this.visible = false;
		return this;
	};
	_BaseObj.prototype.show = function() {
		this.jqDomNode.show();
		this.visible = true;
		return this;
	};
	_BaseObj.prototype.save = function() {
		//
		return this;
	};
	_BaseObj.prototype.scaleBy = function(multiplier) {
		var mult = parseFloat(multiplier, 10).toFixed(1);
		if (mult > 0 && mult <= 1) {
			this.scale = mult;
//			console.log("Scaling to", mult);
			// Calculate & apply scaling classname:
			var intscale = Math.ceil(mult*10);
			var newclass = (intscale <= 9) ? "scale0" : "scale";
			newclass += intscale;
			this.jqDomNode.removeClass("scale05 scale06 scale07 scale08 scale09 scale10").addClass(newclass);

			// Adjust my anchorOffset:
			this.anchorOffset[0] = mult * this.anchorOffsetDefault[0];
			this.anchorOffset[1] = mult * this.anchorOffsetDefault[1];
//			console.log("My offset at this scale:", this.anchorOffset);
		}
//		this.updateXYZ();
		this.reportLoc();
		return this;
	};


	/**
	* Exit
	* @constructor
	* @extends _BaseObj
	* @param {string} options.id
	* @param {string} options.name
	* @param {string} options.dest
	* @param {Boolean} options.visible
	* @param {Boolean} options.active
	*/
	function Exit(options) {	// (id, name, type, dest, width, height, visible, active)
		options.type = 'exit';
		options.layer = 'midground';
		_BaseObj.call(this, options);

		// Item-specific properties:
		this.dest = options.dest || null;		// Another room id
		this.active = options.active || true;	// Can it currently be used?
	}
	// Inheritance: Exit extends _BaseObj
	Exit.prototype = Object.create(_BaseObj.prototype, {
		// Options
	});
	Exit.prototype.constructor = Exit;


	/**
	* Scenery structure
	* @constructor
	* @extends _BaseObj
	* @param {string} id
	* @param {string} name
	* @param {string} layer
	* @param {Boolean} visible
	*/
	function Scenery(options) {		// (id, name, layer, width, height, visible)
		options.type = 'scenery';
		_BaseObj.call(this, options);

		// Scenery-specific properties:
		this.pickable = false;
	}
	// Inheritance: Scenery extends _BaseObj
	Scenery.prototype = Object.create(_BaseObj.prototype, {
		// Options
	});
	Scenery.prototype.constructor = Scenery;


	/**
	* Item structure
	* @constructor
	* @extends _BaseObj
	* @param {string} id
	* @param {string} name
	* @param {Boolean} visible
	*/
	function Item(options) {	// (id, name, visible)
		options.type = 'item';
		options.layer = 'midground';
		_BaseObj.call(this, options);

		// Item-specific properties:
		this.giveable = true;
		this.anchorOffset = [16,28];	// corrects for 32x32 sprite
		this.anchorOffsetDefault = [16,28];
		this.pickable = true;
		this.pickedUp = false;
	}
	// Inheritance: Item extends _BaseObj
	Item.prototype = Object.create(_BaseObj.prototype, {
		// Options
	});
	Item.prototype.constructor = Item;
	Item.prototype.remove = function() {
		// Inventory check:
		var ininv = false,
			index = MYGAME.player.inventory.indexOf(this.id);

		// From Inventory:
		if (index > -1) {
			ininv = true;
			MYGAME.player.inventory.splice(index, 1);
		}
		// From DOM:
		if (ininv) {
			// Remove container div and item:
			this.jqDomNode.parent("div").remove();	// NOT REMOVING
		}
		else {
			this.jqDomNode.remove();
		}

		// From Entities:
		delete MYGAME.entities[this];

		console.log(this.id, "removed.");

		return index;
	};
	Item.prototype.toInventory = function(index) {
		// If no index passed, insert item at end:
		index = index || MYGAME.player.inventory.length - 1;
		console.log("Insert", this.id, '@', index);

		// Move the HTML element:
		var $newdiv = $("<div>");
		var $target = $("#inventory > div").eq(index);
		$target.after($newdiv);
		this.jqDomNode.detach().appendTo($newdiv);

		// Flash it:
		$newdiv.addClass("flash");
		setTimeout(function() {
			$newdiv.removeClass("flash");
		}, 2000);

		// Redo tooltips:
//		MYGAME.utils.ui.ttRefresh();

		// Move the logical element:
		MYGAME.player.inventory.push(this.id);
		console.log(this.id, "to Inventory.");
	};


	/**
	* Character structure
	* @constructor
	* @extends _BaseObj
	* @param {string} options.id
	* @param {string} name
	* @param {string} colour
	* @param {Boolean} optinos.visible
	*/
	function Character(options) {	// (id, name, type, colour, layer, visible)
		options.type = 'character';
		options.layer = 'midground';
		_BaseObj.call(this, options);

		// Character-specific properties:
		this.giveable = true;
		this.anchorOffset = [16,44];	// corrects for 32x48 sprite
		this.anchorOffsetDefault = [16,44];
		this.textColour = options.colour;
		this.talksCtr = 0;
		this.convos = [];
		this.state = 0;					// advances as gameplay dictates
		this.walkData = [];
	}
	// Inheritance: Character extends _BaseObj
	Character.prototype = Object.create(_BaseObj.prototype, {
		// Options
	});
	Character.prototype.constructor = Character;
	Character.prototype.say = function(sentences, _callback) {	// Array or string
		// Wait for previous lines to finish:

		// Clear out previous lines:
		$("#dialogue").html('');

		// Got input?
		if (sentences) {
			// Put string input into array:
			if (typeof sentences === 'string') {
				sentences = [sentences];
			}

//			var me = this;		// Store 'this' (me/Character) to pass to function below

			// Set first timed sayLoop iteration going:
			this._sayLoop(sentences, 0);

			// Activate callback after waiting (roughly) for all the talking to finish:
			if (_callback && typeof _callback === "function") {
				setTimeout(_callback, 100 * sentences[0].length * sentences.length);
			}
		}
		return this;
	};
	Character.prototype._sayLoop = function(sentences, i) {
		var line, duration, top, left, right;
		console.log("loop", i);

		// Figure out optimal duration and positioning of dialogue line:
		line = sentences[i];
		duration = line.length * 100;
		top = Math.max(0, (this.y - 200));		// NOT VERY SCIENTIFIC DIALOGUE POSITIONING
		left = Math.max(0, (this.x - 100));			// prevent offscreen text
		right = Math.min(640, (this.x + 100));		// prevent offscreen text
		left = Math.min(left, right);

		// Add a new text div to #dialogue:
		$("<div class='dia'>").appendTo($("#dialogue"))
							  .css("color", this.textColour)
							  .css("top", top)
							  .css("left", left)
							  .html(line).show()
							  .delay(duration).fadeOut(1500);
		i++;
		// Not done? Initiate the next one:
		if (i < sentences.length) {
			setTimeout(this._sayLoop(sentences, i), duration);
		}
	};
	Character.prototype.face = function(angle) {
		// Allow cardinal directions to be passed:
		var dir = angle;
		if (typeof angle === 'number') {
			if (angle > 45 && angle < 135) { dir = 'ss'; }
			else if (angle < 45 && angle > -45) { dir = 'ee'; }
			else if (angle < -45 && angle > -135) { dir = 'nn'; }
			else if (angle > 135 || angle < -135) { dir = 'ww'; }
		}
		// Give owner the correct class:
		this.jqDomNode.removeClass("nn ee ss ww").addClass(dir);

		return this;
	};
	Character.prototype.walkPath = function(path) {
		// Compute distance of each path segment:
		var distances = [],
			i;
		for (i = 0; i < path.length - 1; i++) {
			var d = utils.pf.p2pDist(path[i], path[i+1]);
			distances.push(d);
		}
		console.log(6, distances);	// OK

		// Traverse all coords of new fancy path:
		for (i = 1; i < path.length; i++) {
			this.walkTo(path[i], distances[i-1]);
		}
		// If still not at finish, too bad. Hopefully we are cloesr.
		return this;
	};
	Character.prototype.walkTo = function(dest, distance) {
		if (!dest) { return; }

		if (!distance) {
			distance = utils.pf.p2pDist(this, dest);
		}

		var room = MYGAME.curRoom,
			point;
		if (dest.hasOwnProperty("id")) {
			// Object passed in:
			point = [dest.x, dest.y];
		}
		else if (typeof dest === "number") {
			// Node passed in:
			var dnode = room.nodes[dest];
			point = [dnode.x, dnode.y];
		}
		else {
			// Simple coords array passed in:
			point = dest;
		}

		// Already there! check:
		if (this.coords() === point) { return; }

		console.log("Walk to:", point);
		// Is scrolling necessary?
		if (room.scrollable) {
			utils.room.scrollDecide(point);
		}
		this._directWalkTo(point, distance);
	};
	Character.prototype._directWalkTo = function(point, distance) {
		// Draw a dot at dest:
		MYGAME.ctx.clearRect(0,0,640,400);
		MYGAME.ctx.fillStyle = "#FFFF00";
		MYGAME.ctx.fillRect(point[0],point[1],3,3);

		// Will this walk change player scale from start to finish?
		var ptscale = utils.grid.scaleAtPoint(point);
		var monoscale = (this.scale === ptscale) ? true : false;
		if (monoscale) { console.log("MONOSCALE!"); }

		// Start walking, boots!
		var me = this;
		var duration = distance * 8;
		var el_dest = [point[0] - me.anchorOffsetDefault[0], point[1] - me.anchorOffsetDefault[1]];
		this.jqDomNode.addClass("walking")
						.queue("walk", function(next) {
							console.warn("Animation queued with duration", duration);
							var isMonoscaleRoom = MYGAME.curRoom.monoscale;

							$(this).animate(
							{
								"left": el_dest[0],
								"top": el_dest[1]
							},
							{
								duration: duration,
								queue: "walk",
								easing: "linear",
								start: function() {
//									me.jqDomNode.addClass("walking");
									var dx = point[0] - me.x,
										dy = point[1] - me.y,
										angle = (360 / 6.28) * Math.atan2(dy,dx);
									me.face(angle);
									console.info("Starting animation with dest:", point, "d:", distance.toFixed(3), "t:", duration.toFixed(3), "angle:", angle.toFixed(3));
								},
								progress: function() {
									// Do something hundreds of times per animation
									console.log("progress");
									me.updateXYZ();
									if (!isMonoscaleRoom) {
										// Scale sprite:
										var wbname = utils.grid.whichWalkbox([me.x, me.y]);
										var wb = MYGAME.curRoom.walkboxes[wbname];
										console.log(wbname + ", scale: " + wb.scale);
										if (wb.scale && wb.scale !== me.scale) {
											me.scaleBy(wb.scale);
										}
									}
								},
								complete: function() {
									me.reportLoc();
									var q = $(this).queue("walk");
									if (q.length < 1 && !$(this).is(':animated')) {
										me.jqDomNode.removeClass("walking");	// only stop after last queue item
										console.warn("Stopped animating.");
										return;
									}
								}
							});
							// Continue:
							next();
						});
		if (!this.jqDomNode.is(":animated")) {
			this.jqDomNode.dequeue("walk");	// Starts animation
		}
		return this;
	};


	/**
	* Player structure
	* @constructor
	* @extends Character
	* @param {string} options.id
	* @param {string} options.name
	* @param {string} options.colour
	*/
	function Player(options) {	// (id, name, colour, visible)
		Character.call(this, options);

		// Player-specific properties:
		this.inventory = [];			// Hash of inventory item ids
		this.anchorOffset = [40,170];	// offset for argyle_guy (40x88)
		this.anchorOffsetDefault = [40,170];
	}
	// Inheritance: Player extends Character
	Player.prototype = Object.create(Character.prototype, {
		// Options
	});
	Player.prototype.constructor = Player;
	Player.prototype.examine = function(target) {
		if (target.hasOwnProperty('name') && target.name !== null) {
			if (typeof target.descriptions !== 'undefined') {
				// Take care of numbers:
				// Don't run out of descriptions, even if we examine it 100 times:
				var finalGo = Math.max(0, target.descriptions.length - 1);
				var thisGo = (target.looksCtr <= finalGo) ? target.looksCtr : finalGo;
				target.looksCtr += 1;

				// Describe the target out loud (if description exists):
				if (target.descriptions[thisGo]) {
					this.say(target.descriptions[thisGo]);
				}

				// Take any attached onExamine actions:
				if (target.onExamine && typeof target.onExamine[thisGo] === 'function') {
					target.onExamine[thisGo]();
				}
				return;
			}
		}
		this.say("Nothing to see here.");	// Or confused animation...
		return;
	};
	Player.prototype.talkTo = function(character) {
		if (character.hasOwnProperty('name')) {
			MYGAME.dialogues.choicesFromOpts(character, null, true);
		}
	};
//	Player.prototype.canUse = function(item1, item2) {
/*		var item2id = (item2) ? item2.id : 'itself';	// This string will be used for looking up in Item.uses

		// 2 items passed:
//		if (item2id !== 'itself') {
//			// Sort item1 & item2 alphabetically, to avoid doubling up on Item.uses:
//			if (item1.id > item2.id) {
//				var flip = this.canUse(item2, item1);
//				return flip;
//			}
//		}

		// Use X with Y (or 'itself'), as per Item.uses definition:
//		if (!($.isEmptyObject(item1.uses))) {
//			if (item1.uses.hasOwnProperty(item2id)) {
//				if (typeof item1.uses[item2id] === 'function') {
//					return true;
//				}
//			}
//			else {
//				return false;
//			}
//		}
//		else {
//			return false;
//		}
//	};
*/
	Player.prototype.use = function(item1, item2, goThrough) {
		var item2id = (item2) ? item2.id : 'itself';	// This string will be used for looking up in Item.uses
		goThrough = goThrough || true;					// True: go through with usage. False: just test usability.

		// 2 items passed:
		if (item2id !== 'itself') {
			// Sort item1 & item2 alphabetically, to avoid doubling up on Item.uses:
			if (item1.id > item2.id) {
				var flip = this.use(item2, item1);
				return flip;
			}
		}

		// Use X with Y (or 'itself'), as per Item.uses definition:
		if (!($.isEmptyObject(item1.uses))) {
			if (item1.uses.hasOwnProperty(item2id)) {
				if (typeof item1.uses[item2id] === 'function') {		//
					if (goThrough) {
						// Execute:
						item1.uses[item2id]();		// WORKS FOR 'itself', cheese...
					}
					return true;
				}
			}
			else {
				if (goThrough) {
					this.say("I can't use that here.");
				}
				return false;
			}
		}
		else {
			if (goThrough) {
				this.say("I can't use that for anything.");
			}
			return false;
		}
	};
	Player.prototype.pickUp = function(item) {
		if (item.hasOwnProperty('name')) {
			// If we don't already have it:
			if (this.inventory.indexOf(item) === -1) {
				if (item.pickable) {
					item.toInventory();
					item.pickable = false;
					this.say("Picked up", item.name);
				}
				else {
					this.say("I can't pick that up.");
				}
			}
		}
	};
	Player.prototype.getItem = function(item, index) {
		// If we don't already have it:
		if (this.inventory.indexOf(item) === -1) {
			// Add item to inventory:
			item.toInventory(index);
			item.pickable = false;
			item.visible = true;
			item.jqDomNode.show();
		}
	};


	// Droppables in the field + inventory:
	function _createDroppables() {
		$(".item, .character").droppable({
			hoverClass: "drop-hover",		// USE CLASS FOR AN ICON?
			drop: function(event, ui) {
				// Lookup dragged item in Entities:
				var dragid = $(ui.draggable[0]).children().attr("id"),
					item = MYGAME.entities[dragid];
				// Lookup drop target in Entities:
				var dropid = this.id,
					target = MYGAME.entities[dropid];
				console.log(item, target);

				// Test if drop is valid:
				if (item && target && item.giveable) {
					// See if they fail to combine:
					if (!MYGAME.player.use(item, target, false)) {
						console.log("No drop, reverting (2).");
					}
					else {
						// SUCCESS:
						MYGAME.player.use(item, target);
						// Refresh inventory in case of item deletion:
						$("#inventory").sortable("refresh");
						// Delete helper?
						console.log("Dropped", item.id, "on", target.id);
					}
				}
				else {
					console.log("No drop, reverting (1).");
				}
			}
		});
	}

	// Process clicks in game area:
	function entityClickHandler(event) {
		// Make sure game setup is complete:
		if (this.curRoom !== null && this.player !== null) {
			// Where was clicked? Set the target (Take parent element's offset into account!)
			var fgOffset = $("#midground").offset();
			var evxy = [event.pageX - fgOffset.left, event.pageY - fgOffset.top];
			var targetObj = null;
			var path;

			// Fix negative y clicks:
			if (evxy[1] < this.curRoom.baseline) {
				evxy[1] = this.curRoom.baseline;
			}
			console.log("click @", evxy, event.target.id);

			// Check for an object:
			// Check Entities list first:
			if (this.entities.hasOwnProperty(event.target.id)) {
				// Found a match:, retrieve it:
				console.log("Clicked on", event.target.id, "(" + this.state.cursor.mode[0] + ")");
				targetObj = this.entities[event.target.id];
			}

			if (targetObj) {
				// Build command line:
				if (!MYGAME.commandObj.verb) {
					utils.ui.addToCommand('verb', 'Walk to');
				}
				utils.ui.addToCommand('item', targetObj.name);

				// If Steve NEAR targetObj, ok, otherwise walk to it first
				var dist = utils.grid.dist(this.player, targetObj);
				if (dist > 30) {
					// Walk to it first:
					console.log("Not near enough. (dist: " + dist + ")");
					MYGAME.player.jqDomNode.stop("walk", true, false);
					path = utils.pf.pathFind(MYGAME.player.coords(), evxy, MYGAME.curRoom);
					if (path) { MYGAME.player.walkPath(path); }

					return;		// Will need to click targetObj again when nearer...
				}
				// Handle an exit when clicked:
				if (targetObj.hasOwnProperty("dest")) {
					var exit = targetObj;
					if (exit.visible && exit.active) {
						utils.room.change(exit.dest);
					}
				}
				else {
					// Act, depending on mode:
					utils.ui.modedClick(targetObj);
				}
			}
			else {	// No object clicked:
				// Clear command line:
				utils.ui.resetCommand('all');

				var wb = utils.grid.whichWalkbox(evxy);
				console.log("Walkbox", wb);
				// Try to fix click outside walkboxes:
				if (!wb) {
					evxy = utils.pf.correctY(evxy);
					console.log("New evxy:", evxy);
					if (!evxy) {
						// Invalid click
						console.log("Couldn't validate click.");
						return;
					}
				}
				// No specific object clicked, so just walk to the point:
				MYGAME.player.jqDomNode.stop("walk", true, false);
				path = utils.pf.pathFind(MYGAME.player.coords(), evxy, MYGAME.curRoom);
				if (path) { MYGAME.player.walkPath(path); }
			}
		}
	}

	function init(room) {
		// Try to load first room:
		utils.misc.loadScript('room' + room);	// no jQ needed

		var game = this;
		setTimeout(function() {
			// Initialise the player [MOST IMPORTANT!]:
			game.player = new Player({
				id: "argyle_guy",
				name: "Argyle Guy",
				colour: "#f99",
				visible: false		// invisible until placed via Room.load()
			});
			_createDroppables();
			// Tooltips:
//			MYGAME.utils.ui.ttRefresh();

			// jQuery ready function:
			$(document).ready(function() {

				// Stage click handler:
				$("#midground").on("click", function(event) {
					MYGAME.entityClickHandler(event);
				});

				// Item hover handler:
				$(".item, .scenery, .character").on("mouseenter", function(event) {
					MYGAME.utils.ui.addToCommand('item', event.target.name);
				}).on("mouseleave", function() {
					MYGAME.utils.ui.resetCommand('noun');
				});

				// Inventory click handler:
				$("#inventory").on("click", ".item", function(event) {

					// What element was clicked? Set the target.
					var targetObj;

					// Check Entities list:
					var ens = MYGAME.entities;
					if (ens.hasOwnProperty(event.target.id)) {
						// Found a match:, retrieve it:
						console.log("Clicked on", event.target.id, "(" + MYGAME.state.cursor.mode[0] + ")");
						targetObj = ens[event.target.id];
					}
					// Build command line:
					MYGAME.utils.ui.addToCommand('item', targetObj.name);

					// Act, depending on mode:
					MYGAME.utils.ui.modedClick(targetObj);
				});

				// Set up sortable inventory:
				$("#inventory").sortable({
					helper: "clone",
					start: function(event, ui) {
						console.log("Reordering...");// item", $(ui.item[0]).children().attr("id"));
					}
				});

				// ToolMenu click handler:
				$("#toolMenu2 li").on("click", function(event) {
					// Extract the chosen mode from HTML, and set:
					MYGAME.utils.ui.toolMode($(event.target).attr("id"));
					// Alter command line:
					MYGAME.utils.ui.resetCommand('verb');
					MYGAME.utils.ui.addToCommand('verb', $(event.target).html());

				});

				// Command line clickable:
				$("#command").on("click", function() {
					MYGAME.utils.ui.executeCommand();
				});

				/* INPUT */
				// Register keypress events on the whole document:
				$(document).keydown(function(e) {	// keydown is Safari-compatible; keypress allows holding a key to send continuous events
					MYGAME.utils.ui.toolMode(null);

					if (e.keyCode === 87) {											// press 'w'
						MYGAME.utils.ui.toolMode('walkto');
					}
					else if (e.keyCode === 69) {									// press 'e'
						MYGAME.utils.ui.toolMode('examine');
					}
					else if (e.keyCode === 84) {									// press 't'
						MYGAME.utils.ui.toolMode('talkto');
					}
					else if (e.keyCode === 80) {									// press 'p'
						MYGAME.utils.ui.toolMode('pickup');
					}
					else if (e.keyCode === 85) {									// press 'u'
						MYGAME.utils.ui.toolMode('use');
					}
/***************************************************************************************************/
					else if (e.keyCode === 90) {									// press 'z'
						MYGAME.player.scaleBy(0.5);
					}
					else if (e.keyCode === 88) {									// press 'x'
						MYGAME.player.scaleBy(0.6);
					}
					else if (e.keyCode === 67) {									// press 'c'
						MYGAME.player.scaleBy(0.7);
					}
					else if (e.keyCode === 86) {									// press 'v'
						MYGAME.player.scaleBy(0.8);
					}
					else if (e.keyCode === 66) {									// press 'b'
						MYGAME.player.scaleBy(0.9);
					}
					else if (e.keyCode === 78) {									// press 'n'
						MYGAME.player.scaleBy(1);
					}
/***************************************************************************************************/
					else if (e.keyCode === 68) {									// press 'd'
						// Toggle debug state:
						$("body").toggleClass("debug");
					}
					else if (e.keyCode === 67) {									// press 'c'
						// Toggle canvas layer:
						$("canvas").toggle();
					}
					else if (e.keyCode === 83) {									// press 's'
						// Toggle SVG layer:
						$("svg").toggle();
					}
/***************************************************************************************************/
					else if (e.keyCode === 37) {									// press 'left'
						MYGAME.utils.room.scrollX("L", 20);
					}
					else if (e.keyCode === 39) {									// press 'right'
						MYGAME.utils.room.scrollX("R", 20);
					}
/***************************************************************************************************/
					else if (e.keyCode >= 48 && e.keyCode <= 57) {					// press '0-9'
						// Change room:
						MYGAME.utils.room.change(e.keyCode - 48);
					}
/***************************************************************************************************/
					else if (e.keyCode === 116) {									// press 'F5'
						MYGAME.utils.session.saveGame();
					}
					else if (e.keyCode === 117) {									// press 'F6'
						MYGAME.utils.session.chooseSavedGame();
					}
/***************************************************************************************************/
					else {															// any other keypress
						$("body").removeClass();	// unset all modes
						MYGAME.state.cursor.mode = 'default';
					}

				//	if (e.keyCode == 32) {											// press 'space'
				//		if (game.state == 'running') pause();						// pause/unpause
				//		else if (game.state == 'paused') unpause();
				//	}

					$('#keypress').html(e.keyCode);		// Show onscreen
				});
				// Display mouse coordinates:
				$(document).on("mousemove", "#midground", function(e) {
					$("#mousexy").html(e.offsetX + ', ' + e.offsetY);
				});
			}); // end jQuery function

		}, 1000);		// BIT OF A HACK TO MAKE SURE DOM FILLED FIRST
	}

	// Expose public handles:
	return {
		// Declared as properties (this.prop = ):
		player: this.player,
		dialogues: this.dialogues,
		entities: this.entities,
		curRoom: this.curRoom,
		rooms: this.rooms,
		canvas: this.canvas,
		doordirs: this.doordirs,
		ctx: this.ctx,
		state: this.state,
		commandObj: this.commandObj,
		// Declared as vars (var a = ):
		utils: utils,
		// Declared as functions:
		init: init,
		entityClickHandler: entityClickHandler,
		// Constructors:
		Room: Room,
		Exit: Exit,
		Scenery: Scenery,
		Item: Item,
		Character: Character,
		Player: Player
	};
}(jQuery));	// end global scoping / namespacing function

MYGAME.init(1);
window.intervals = 0;
