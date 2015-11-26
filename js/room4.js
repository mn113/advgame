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
		id: 4,
		name: "KSCUMM radio station",
		unlocked: true,
		scrollable: true,
		defaultScroll: [640,0]
	});
	M.curRoom = room;

	// Define the content:
	// Exits:
	var exit1 = new M.Exit({
		id: "exit1",
		dest: 3,
		width: "20px",
		height: "30px",
		classes: "up",
		visible: true,
		active:true
	}).placeAt([1035,110]);

	console.log("All objects initialised.");

	// Define the geometry of room2:
	room.walkboxes = {
			wb1: {points: [{x:974,y:158},{x:948,y:160},{x:1035,y:140},{x:1062,y:140}], scale: 0.5},
			wb2: {points: [{x:974,y:158},{x:948,y:160},{x:1073,y:173},{x:1110,y:172}], scale: 0.6},
			wb3: {points: [{x:921,y:212},{x:981,y:210},{x:1110,y:172},{x:1073,y:173}], scale: 0.7},
			wb4: {points: [{x:921,y:212},{x:981,y:210},{x:1156,y:256},{x:1096,y:256}], scale: 0.8},
			wb5: {points: [{x:1124,y:339},{x:1024,y:314},{x:1096,y:256},{x:1156,y:256}], scale: 0.9},
			wb6: {points: [{x:900,y:329},{x:900,y:339},{x:1124,y:339},{x:1024,y:314}], scale: 1},
			wb7: {points: [{x:900,y:329},{x:900,y:339},{x:113,y:339},{x:113,y:329}], scale: 1},
			wb8: {points: [{x:0,y:288},{x:0,y:339},{x:113,y:339},{x:113,y:288}], scale: 1},
			wb9: {points: [{x:113,y:288},{x:158,y:288},{x:158,y:304},{x:113,y:304}], scale: 1}
		};
	room.nodes = {
			1: {x: 966, y: 158, edges: [2]},	// edges are the other nodes this node can see
			2: {x: 1083, y: 172, edges: [1,3]},
			3: {x: 969, y: 209, edges: [2,4]},
			4: {x: 1111, y: 254, edges: [3,5]},
			5: {x: 1049, y: 320, edges: [4,6]},
			6: {x: 900, y: 334, edges: [5,7]},
			7: {x: 113, y: 334, edges: [6,8]},
			8: {x: 113, y: 295, edges: [7]}
	};
	room.baseline = 140;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2}
	};
	room.spawnPoints = {
		0: {x: 40, y: 300, face: 'ee'},
		1: {x: 1045, y: 140, face: 'ss'}
	};

	room.load(room._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
