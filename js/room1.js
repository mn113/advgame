/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype._afterLoad = function() {
		//
	};

	// Create the Room object:
	var room = new M.Room({
		id: 1,
		name: "Flatroom",
		unlocked: true,
		entry: M.prevRoom
	});
	M.curRoom = room;

	// Define the content:
	// Exits:
	var exit1 = new M.Exit({
		domNode: $("#exit1"),
		id: "exit1",
		dest: 0,
		visible: true,
		active: true
	}).placeAt([608,196]);

	console.log("All objects initialised.");

	// Define the geometry of room1:
	room.walkboxes = {
			wb1: {points: [{x:84,y:91}, {x:131,y:224}, {x:115,y:323}, {x:2,y:399}], scale: 1},
			wb2: {points: [{x:84,y:91}, {x:131,y:224}, {x:282,y:232}, {x:343,y:209}, {x:340,y:141}], scale: 1},
			wb3: {points: [{x:84,y:91}, {x:340,y:141}, {x:476,y:134}, {x:557,y:91}], scale: 1},
			wb4: {points: [{x:2,y:399}, {x:115,y:323}, {x:286,y:323}, {x:638,y:399}], scale: 1},
			wb5: {points: [{x:638,y:399}, {x:286,y:323}, {x:282,y:232}, {x:343,y:209}, {x:488,y:210}], scale: 1},
			wb6: {points: [{x:638,y:399}, {x:488,y:210}, {x:476,y:134}, {x:557,y:91}], scale: 1}
		};
	room.nodes = {
			1: {x: 329, y: 134, edges: [2,3,4]},	// edges are the other nodes this node can see
			2: {x: 484, y: 126, edges: [1,5]},
			3: {x: 126, y: 212, edges: [1,4,6]},
			4: {x: 314, y: 221, edges: [1,3,5,7]},
			5: {x: 494, y: 214, edges: [2,4,7]},
			6: {x: 104, y: 329, edges: [3,7]},
			7: {x: 295, y: 328, edges: [4,5,6]}
		};
	room.baseline = 93;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2}
	};
	room.spawnPoints = {
		0: {x: 300, y: 200, face: 'ww'},
	};

	room.load(M.Room.prototype._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log(M);
	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));


/*
84,91								557,91

					340,141	476,134
					343,209	488,210
	131,224	282,232
	115,323	286,323

2,399								638,399
*/
