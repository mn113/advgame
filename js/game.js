/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Global scoping / namespacing function:
var MYGAME = (function($) {
	var config = {
		chapter: 0,
		stage: 0,
		language: 'en'
	};
	var state = {
		cursor: {mode: 'default'},
		paused: false,
		gametime: 0		// count seconds elapsed
	};
	this.doordirs = {
		'n': 90,
		'e': 180,
		's': -90,
		'w': 0
	};	// constant
	this.rooms = [0,1];	// filled by external files
	this.prevRoom;		// previous room id
	this.curRoom;		// current room object
	this.player = null;
	// Entities within the game (characters, items, scenery...) stored by id
	this.entities = {};
	this.dialogues = {};		// Filled by external file
	this.npcs = {};
	this.progress = {};

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
				$("body").removeClass();
				MYGAME.state.cursor.mode = 'default';
			}
		},
		grid: {
			// Looks up the Boolean value for a tile in the binary NavMesh
			tileLookup: function(gridref) {
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
			// Returns a random point on the stage (NOT NECESSARILY VALID YET):
			randomPoint: function() {
				var rndx = Math.random() * $("#foreground").width,
					rndy = Math.random() * $("#foreground").height;
				return [rndx, rndy];
			},
			// Returns distance between two objects (closest edge each):
			dist: function(objA, objB) {
				// Get all edge coords:
				var a = objA.domNode.position(),
					b = objB.domNode.position();
				var ax1 = a.left,
					ax2 = ax1 + objA.domNode.width,
					bx1 = b.left,
					bx2 = bx1 + objB.domNode.width;
				var ay1 = a.top,
					ay2 = ay1 + objA.domNode.height,
					by1 = b.top,
					by2 = by1 + objB.domNode.height;

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
					var wb = curRoom.walkboxes[wbname],
						pxy = { x: point[0], y: point[1] };
					if (MYGAME.utils.grid.pointIsInPoly(pxy, wb)) {
						return wbname;
					}
				}
				// No match:
				return false;
			}
		},
		pathfinding: {
			// Point to point distance calculation:
			p2pDist: function(p1, p2) {	// Point objects e.g. {x:0, y:0} or Arrays e.g. [0,0]
				// Convert passed point objects to arrays:
				if (p1.hasOwnProperty('x') && p2.hasOwnProperty('x')) {
					p1 = [p1.x, p1.y];
					p2 = [p2.x, p2.y];
				}
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
				var frontier = [startNode],		// e.g. 1
					camefrom = {},
					current;
				camefrom[startNode] = null;

				while (frontier.length > 0) {
					current = frontier.shift();
					var n = room.nodes[current],
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
			},
			// Pathfinding algorithm:
			pathFind: function(start, finish, room) {	// Point arrays e.g. [0,0]
//				console.log("pf", room);
				var player = MYGAME.player;
				var fwb = utils.grid.whichWalkbox(finish),
					pwb = utils.grid.whichWalkbox(start);
				// Test for trivial (nodeless) solution:
				if (fwb === pwb || utils.pf.lineOfSight(start, finish)) {
					player.walkTo(finish);
				}
				else {	//	No line-of-sight; BF pathfinding required:
					// Prelim tests:
					var nrNodeA = utils.pf.nearestNode(start, room),
						nrNodeZ = utils.pf.nearestNode(finish, room);
					// Get to destination in 2 hops:
					if (nrNodeA === nrNodeZ) {
						player.walkTo(nrNodeA);
						player.walkTo(finish);
						return;
					}
					// Get to destination in 3 hops:
					else if (room.nodes[nrNodeA].edges.indexOf(nrNodeZ) !== -1) {
						player.walkTo(nrNodeA);
						player.walkTo(nrNodeZ);
						player.walkTo(finish);
						return;
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

					// Traverse all coords of new fancy path:
					for (i = 1; i < shortPath.length; i++) {
						player.walkTo(shortPath[i]);
					}
					// If still not at finish, too bad. Hopefully we are cloesr.
				}
				return;
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
					$fg = $("#foreground"),
					bottom = parseInt($fg.css("height"));
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
				if (MYGAME.rooms[dest] !== 'undefined') {
					// Set current room as previous:
					MYGAME.prevRoom = MYGAME.curRoom;
					// Unload:
					MYGAME.curRoom.unload();
					// Set new current room:
					MYGAME.curRoom = MYGAME.room[dest];
					setTimeout(function() {
						utils.misc.loadScript("room" + dest);	// Script includes Room loading
					}, 1000);
				}
			},
			// Scroll the screen left or right by some amount:
			scrollX: function(dir, amount) {		// e.g. "L", 50
				var $bg = $("#background"),
					$fg = $("#foreground"),
					$svg = $("#pathsvg"),
					// Note: CSS left becomes negative as we scroll. Multiplying it by -1 makes the maths saner.
					bgPos = -1 * parseInt($bg.position().left),
					min = 0,
					max = parseInt($bg.css("width")) - 640;
				// Check if scroll possible first:
				if ((dir === 'L' && bgPos - 5 < min) || (dir == 'R' && bgPos + 5 > max)) {
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
					bgPos = -1 * parseInt($bg.position().left);
					if ((dir === 'L' && bgPos - 10 < min) || (dir == 'R' && bgPos + 10 > max)) {
						break;
					}
				}
				console.log("BG @", bgPos);
				return;
			},
			// Scroll the screen to a particular spot e.g. [0,0]:
			scrollTo: function(origin) {
				// TODO
			},
			// Run this when player is moving about to decide when scrolling is necessary:
			scrollDecide(point) {
				var $bg = $("#background"),
					$gbox = $("#gamebox"),
					// Note: CSS left becomes negative as we scroll. Multiplying it by -1 makes the maths saner.
					bgPos = -1 * parseInt($bg.position().left),
					min = 0,
					max = parseInt($bg.css("width")) - 640;

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
				if (typeof(Storage) !== "undefined") {
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
			chooseSavedGame() {
				// Access browser storage:
				for (var thing in localStorage) {
					// Build a basic chooser:
					var $a = $("<a>").html(thing);
					$a.appendTo("#displayChoices");
					$a.on("click", function() {
						// Load the savegame with the clicked timestamp:
						utils.session.loadGame($(this).html());
						// Clean up:
						$("#displayChoices").html('');
						return;
					})
				}
			}
		}
	};
	utils.pf = utils.pathfinding;	// shorthand

	// OBJECT CONSTRUCTORS & METHODS FOLLOW:

	/**
	* Room structure
	* @constructor
	* @param {int} id
	* @param {string} name
	* @param {Boolean} unlocked
	*/
	function Room(options) {	// (id, name, unlocked, scrollable, entry)
		// Essentials:
		this.id = options.id || null;
		this.name = options.name || null;
		this.unlocked = options.unlocked || false;		// whether room has been unlocked yet
		this.scrollable = options.scrollable || false;
		this.entry = options.entry || 0;				// determines where player will appear
		this.filename = "room" + this.id + ".html";			// needed for loading room HTML
//		this.background = '';					// image file url?
//		this.walkboxes;		// loaded from file after construction
//		this.nodes;			// loaded from file after construction
//		this.exits;			// loaded from file after construction
//		this.entities;		// loaded from file after construction

		// Store by id in rooms hash:
		MYGAME.rooms[this.id] = this;

		return this;
	}
	Room.prototype.load = function(callback) {
		var me = this;
		$("#gamebox").addClass("room" + this.id);
		// Fetch and append level-specific elements to HTML:
		$("#gamebox #background").load(this.filename + " #background *");
		$("#gamebox #foreground").load(this.filename + " #foreground *");
		$("#gamebox #pathsvg").load(this.filename + " #pathsvg *", function(response, status, xhr) {
			if (status === "success") {
				console.log("Room", me.id, "loaded.");
				me.fadeIn();
				me.announce();

				// Continue the loading in room.js (after a short wait - ensures DOM ready):
				if (callback && typeof callback === "function") {
					setTimeout(callback, 500);
				}
			}
		});
		setTimeout(function() {
			// Get player's doormat data for the entry used:
			var ent = me.exits[me.entry],	// EXITS NOT AVAILABLE UNTIL AFTER CALLBACK
				doormat = ent.doormat,
				doordir = ent.dir,
				playdir = MYGAME.doordirs[doordir];
			// Place player into room:
			MYGAME.player.placeAt([doormat.x, doormat.y]).face(playdir);
		}, 2000);
	};
	Room.prototype.unload = function() {
		var me = this;
		this.fadeToBlack();
		setTimeout(function() {
			$("#gamebox").removeClass("room" + me.id);
			// Remove level-specific elements from HTML:
			$("#foreground *").not("#steve, #argyle_guy").remove();	// REDUNDANT
			$("#background *").remove();
			$("#pathsvg *").remove();
		}, 2000);
		return this;
	};
	Room.prototype.fadeIn = function() {
		$("#blackout").show().fadeOut(3000);
		return this;
	};
	Room.prototype.fadeToBlack = function() {
		$("#blackout").fadeIn(2000);
		return this;
	};
	Room.prototype.announce = function() {
		// Put Room name briefly on screen
		$(".announce").html(this.name).show().delay(1500).fadeOut(2000);
		return this;
	};


	/**
	* _BaseObj structure
	* @constructor
	* @param {jQuery Object} domNode
	* @param {string} name
	* @param {Boolean} visible
	*/
	function _BaseObj(domNode, name, visible) {
		// Essentials:
		this.name = name;				// Everything must have a name
		this.domNode = domNode;			// Everything must have a domNode
		this.id = domNode.attr("id");	// Everything must have an id
		if (visible === undefined) {
			visible = true;				// Everything is visible by default (debatable...)
		}
		this.visible = visible;
		this.x = 0;
		this.y = 0;
		this.z = 0;

		this.giveable = false;
		this.anchorOffset = [0,0];		// Every sprite needs an anchor offset
		this.descriptions = [];			// Everything can have multiple descriptions
		this.looksCtr = 0;					// Everything can be looked at 0 or more times

		// Store by id in entities hash:
		MYGAME.entities[this.id] = this;

		// Set visibility:
		if (!this.visible) {
			this.domNode.hide();
		}
		return this;
	}
	_BaseObj.prototype.placeAt = function(coords) {
		this.domNode.css("left", coords[0] - this.anchorOffset[0]);		// Compensate for anchor point
		this.domNode.css("top", coords[1] - this.anchorOffset[1]);		// being inside sprite
		this.updateXYZ();
		// Update HTML visibility:
		if (this.visible) {
			this.domNode.show();
		}
		else {
			this.domNode.hide();
		}
		console.log(this.id, "placed @ [" + this.x + ', ' + this.y + "]");
		return this;
	};
	_BaseObj.prototype.updateXYZ = function() {
		// Set sprite's anchor coords:
		this.x = this.domNode.position().left + this.anchorOffset[0];
		this.y = this.domNode.position().top + this.anchorOffset[1];
		// Set Z-index (same as Y-coord except in non-flat locations:
		this.z = this.y;
		this.domNode.css("z-index", this.z);
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
		console.log("I'm at (" + this.x + ', ' + this.y + '), Z-' + this.z);
	};
	_BaseObj.prototype.remove = function() {
		// From DOM:
		this.domNode.remove();

		// From Entities:
		delete MYGAME.entities[this];

		console.log(this.id, "removed.");
	};


	/**
	* Exit
	* @constructor
	* @extends _BaseObj
	* @param {jQuery Object} domNode
	* @param {string} name
	* @param {string} dest
	* @param {Boolean} visible
	* @param {Boolean} active
	*/
	function Exit(options) {	// (domNode, name, dest, visible, active)
		_BaseObj.call(this, options.domNode, options.name, options.visible);

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
	* FixedItem structure
	* @constructor
	* @extends _BaseObj
	* @param {jQuery Object} domNode
	* @param {string} name
	*/
	function FixedItem(domNode, name, visible) {
		_BaseObj.call(this, domNode, name, visible);		// Create an object like this parent

		// FixedItem-specific properties:
		this.pickable = false;
	}
	// Inheritance: FixedItem extends _BaseObj
	FixedItem.prototype = Object.create(_BaseObj.prototype, {
		// Options
	});
	FixedItem.prototype.constructor = FixedItem;


	/**
	* Item structure
	* @constructor
	* @extends FixedItem
	* @param {jQuery Object} domNode
	* @param {string} name
	*/
	function Item(domNode, name, visible) {
		FixedItem.call(this, domNode, name, visible);

		// Item-specific properties:
		this.giveable = true;
		this.anchorOffset = [16,28];	// corrects for 32x32 sprite
		this.pickable = true;
		this.pickedUp = false;
	}
	// Inheritance: Item extends FixedItem
	Item.prototype = Object.create(FixedItem.prototype, {
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
			this.domNode.parent("div").remove();	// NOT REMOVING
		}
		else {
			this.domNode.remove();
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
		this.domNode.detach().appendTo($newdiv);

		// Flash it:
		$newdiv.addClass("flash");
		setTimeout(function() {
			$newdiv.removeClass("flash");
		}, 2000);

		// Redo tooltips:
		MYGAME.utils.ui.ttRefresh();

		// Move the logical element:
		MYGAME.player.inventory.push(this.id);
		console.log(this.id, "to Inventory.");
	};


	/**
	* Character structure
	* @constructor
	* @extends _BaseObj
	* @param {jQuery Object} domNode
	* @param {string} name
	* @param {string} colour
	*/
	function Character(domNode, name, colour, visible) {
		_BaseObj.call(this, domNode, name, visible);

		// Character-specific properties:
		this.giveable = true;
		this.anchorOffset = [16,44];	// corrects for 32x48 sprite
		this.looksCtr = 0;
		this.talksCtr = 0;
		this.state = 0;					// advances as gameplay dictates
		this.textColour = colour;
	}
	// Inheritance: Character extends _BaseObj
	Character.prototype = Object.create(_BaseObj.prototype, {
		// Options
	});
	Character.prototype.constructor = Character;
	Character.prototype.say = function(sentences) {
		// Clear out previous lines:
		$("#dialogue").html('');

		// Got input?
		if (sentences) {
			// Put string input into array:
			if (typeof sentences === 'string') {
				sentences = [sentences];
			}

			var me = this;		// Store 'this' (me/Character) to pass to function below

			// Define loop:
			var i = 0;
			var loop = function() {
				var line = sentences[i],
					time = line.length * 70;
				// Add a new div to #dialogue instead of reusing:
				$("<div class='dia'>").appendTo($("#dialogue"))
									  .css("color", me.textColour)
									  .html(line).show()
									  .delay(time).fadeOut(1500);
				i++;
				// Not done? Initiate the next one:
				if (i < sentences.length) {
					setTimeout(loop, time);
				}
			};
			// Set first loop iteration going:
			loop();
		}
		return this;
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
		this.domNode.removeClass("nn ee ss ww").addClass(dir);

		return this;
	};
	Character.prototype.walkSvgPath = function(deets, steps) {
		// Create a <path> element in DOM:
		var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		// Assign the generated pathdata to it:
		p.setAttribute("d", deets);
		var svglen = p.getTotalLength(),
			speed =  (3 * steps);
	//	console.log("Path length:", svglen, "Steps:", steps, "Speed:", speed);

		this.domNode.addClass("walking");
		var parent = this;	// upcoming functions will lose 'this' context

		// Set a timer to execute finishing code after 50 loops of setInterval:		// UGLY HACK
		var totalWalk = setTimeout(function() {
			parent.domNode.removeClass("walking");
			parent.reportLoc();
			MYGAME.utils.grid.highlightsOff();
		}, 110 * speed);

		// Traverse path in 50 steps of 2%:
		var i = 0;
		var traversal = setInterval(function() {
			var pt1 = p.getPointAtLength(svglen * i / 100);
			var pt2 = p.getPointAtLength(svglen * (i+1) / 100);

			// Work out deltas, angle etc of current segment:
			var dx = pt2.x - pt1.x,
				dy = pt2.y - pt1.y,
				angle = (360 / 6.28) * Math.atan2(dy,dx);
			parent.face(angle);

			// Take a step:
			parent.domNode.animate({"left": pt1.x - 16, "top": pt1.y - 44}, speed, 'linear', function() {
				// Update position:
				parent.updateXYZ();
			});
			// Increment:
			i += 2;
			// Break out of last loop:	// HE DOES THIS TOO SOON - BETTER TO TEST GRIDREF?
			if (i >= 99) {
				clearInterval(traversal);
			}
		}, speed);

		$("#walkthisway").hide();
		return this.gridref();
		// return success or failure?
		// if (I'm at my destination) return 1;
		// else return 0;
	};
	Character.prototype.walkTo = function(dest) {
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
		this.directWalkTo(point);
	};
	Character.prototype.directWalkTo = function(point) {
		var dist = utils.pf.p2pDist([this.x, this.y], point),	// CALCULATED TOO EARLY - NEEDS DOING AT EVERY STEP
			time = dist * 10,
			dx = point[0] - this.x,
			dy = point[1] - this.y,
			angle = (360 / 6.28) * Math.atan2(dy,dx),
			me = this;
		me.face(angle);

		// Keep his coords up-to-date as he goes:
		var walkInterval = setInterval(function() {
			me.updateXYZ();
		},100);

		// Draw a dot:
		MYGAME.ctx.clearRect(0,0,640,400);
		MYGAME.ctx.fillStyle = "#FFFF00";
		MYGAME.ctx.fillRect(point[0],point[1],3,3);

		console.log(dist, time, point);
		this.domNode.addClass("walking")
					.animate({
						"left": point[0] - me.anchorOffset[0],
						"top": point[1] - me.anchorOffset[1]},
						time,
						'linear',
						function onComplete() {
							var q = $(this).queue();
							console.log(q.length, q);
							if (q.length < 2) {
								$(this).removeClass("walking");	// only stop CSS animation after last queue item
								clearInterval(walkInterval);
							}
//							me.face('ss');
							me.updateXYZ();
							me.reportLoc();
						});
	};


	/**
	* Player structure
	* @constructor
	* @extends Character
	* @param {jQuery Object} domNode
	* @param {string} name
	* @param {string} colour
	*/
	function Player(domNode, name, colour, visible) {
		Character.call(this, domNode, name, colour, visible);

		// Player-specific properties:
		this.inventory = [];			// Hash of inventory item ids
		this.anchorOffset = [40,160];	// offset for argyle_guy (40x88)
	}
	// Inheritance: Player extends Character
	Player.prototype = Object.create(Character.prototype, {
		// Options
	});
	Player.prototype.constructor = Player;
	Player.prototype.examine = function(target) {
		if (target.hasOwnProperty('name') && target.name !== null) {
			// Don't run out of descriptions, even if we examine it 100 times:
			var last = target.descriptions.length - 1,
				num = target.looks <= last ? target.looks : last;
			// Describe the target out loud:
			this.say(target.descriptions[num]);
			target.looks += 1;
		}
		else {
			this.say("Nothing to see here.");	// Or just do nothing?
		}
	};
	Player.prototype.talkTo = function(character) {
		if (character.hasOwnProperty('name')) {
			dialogues.choicesFromOpts(character, null, true);
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
			item.domNode.show();
		}
	};


	// Droppables in the field + inventory:
	function _createDroppables() {
		$("#foreground div, #inventory .item").droppable({
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
	function fgClickHandler(event) {
		// Make sure game setup is complete:
		if (this.curRoom !== null && this.player !== null) {
			// Where was clicked? Set the target (Take parent element's offset into account!)
			var fgOffset = $("#foreground").offset();
			var evxy = [event.pageX - fgOffset.left, event.pageY - fgOffset.top];
			var targetObj = null;

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
				// If Steve NEAR targetObj, ok, otherwise walk to it first
				var dist = utils.grid.dist(this.player, targetObj);
				if (dist > 30) {
					// Walk to it first:
					console.log("Not near enough. (dist: " + dist + ")");
					this.player.stop().walkTo(evxy);
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
				this.player.domNode.stop(true);
				utils.pf.pathFind(this.player.coords(), evxy, this.curRoom);
			}
		}
	}

	function init(room) {
		// Try to load first room:
		utils.misc.loadScript('room' + room);	// no jQ needed

		var game = this;
		setTimeout(function() {
			// Initialise the player [MOST IMPORTANT!]:
	//		game.player = new Player($("#steve"), "Steve", "yellow");
			game.player = new Player($("#argyle_guy"), "Argyle Guy", "blue");
			_createDroppables();
			// Tooltips:
			MYGAME.utils.ui.ttRefresh();
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
		ctx: this.ctx,
		doordirs: this.doordirs,
		// Declared as vars (var a = ):
		state: state,
		utils: utils,
		// Declared as functions:
		init: init,
		fgClickHandler: fgClickHandler,
		// Constructors:
		Room: Room,
		Player: Player,
		Character: Character,
		Item: Item,
		FixedItem: FixedItem,
		Exit: Exit
	};
}(jQuery));	// end global scoping / namespacing function

MYGAME.init(3);


// jQuery ready function:
$(function () {

	// Stage click handler:
	$("#foreground").on("click", function(event) {
		MYGAME.fgClickHandler(event);
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
		
		// Act, depending on mode:
		MYGAME.utils.ui.modedClick(targetObj);
	});

	// ToolMenu click handler:
	$("#toolMenu li").on("click", function(event) {
		// Extract the chosen mode from HTML:
		var mode = $(event.target).parent("li").attr("name");
		// Set the mode:
		MYGAME.utils.ui.toolMode(mode);
	});

	//jQuery UI block:
	{
		// Set up sortable inventory:
		$("#inventory").sortable({
			helper: "clone",
			start: function(event, ui) {
				console.log("Reordering...");// item", $(ui.item[0]).children().attr("id"));
			}
		});


	}	// end jQuery UI block

}); // end jQuery function

/**********/
/*! INPUT */
/**********/
// Register keypress events on the whole document
// From: http://www.marcofolio.net/webdesign/advanced_keypress_navigation_with_jquery.html
$(document).keydown(function(e) {			// keydown is Safari-compatible; keypress allows holding a key to send continuous events
	MYGAME.utils.ui.toolMode(null);
	
	if (e.keyCode === 69) {											// press 'e'
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
	else if (e.keyCode === 37) {									// press 'left'
		MYGAME.utils.room.scrollX("L", 20);
	}
	else if (e.keyCode === 39) {									// press 'right'
		MYGAME.utils.room.scrollX("R", 20);
	}
	else if (e.keyCode >= 48 && e.keyCode <= 57) {					// press '0-9'
		// Change room:
		MYGAME.utils.room.change(e.keyCode - 48);
	}
	else if (e.keyCode === 116) {									// press 'F5'
		MYGAME.utils.session.saveGame();
	}
	else if (e.keyCode === 117) {									// press 'F6'
		MYGAME.utils.session.chooseSavedGame();
	}
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
$(document).on("mousemove", "#foreground", function(e) {
	$("#mousexy").html(e.offsetX + ', ' + e.offsetY);
});
