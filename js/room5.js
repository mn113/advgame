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
		id: 5,
		name: "Hotel Lobby",
		unlocked: true,
		entry: M.rooms.previous,
		scrollable: true,
		monoscale: false
	});
	M.rooms.current = room;

	// Define the content:
	// Exits:
	var exit1 = new M.Exit({
		id: "exit1",
		dest: 4,
		width: 120,
		height: 220,
		visible: true,
		active: true
	}).placeAt([0,100]);
	var exit2 = new M.Exit({
		id: "exit2",
		dest: 0,
		width: 120,
		height: 220,
		visible: true,
		active: true
	}).placeAt([1080,100]);

	console.log("All objects initialised.");

	// Define the geometry of room1:
	room.walkboxes = {
			wb1: {points: [{x:48,y:399}, {x:145,y:299}, {x:958,y:299}, {x:1019,y:399}], scale: 1},
			wb2: {points: [{x:170,y:274}, {x:408,y:274}, {x:408,y:299}, {x:145,y:299}], scale: 0.9},
			wb3: {points: [{x:237,y:274}, {x:403,y:274}, {x:356,y:215}, {x:282,y:215}], scale: 0.8},
			wb4: {points: [{x:966,y:313}, {x:1019,y:399}, {x:1156,y:399}, {x:1127,y:313}], scale: 1}
		};
	room.nodes = {
			1: {x: 320, y: 274, edges: [2]},	// edges are the other nodes this node can see
			2: {x: 394, y: 299, edges: [1,3]},
			3: {x: 985, y: 337, edges: [2]}
		};
	room.baseline = 213;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2},
		1: {dest: 2}
	};
	room.spawnPoints = {
		0: {x: 300, y: 300, face: 'ss'}
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
