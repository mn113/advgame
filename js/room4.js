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
	}).placeAt([900,110]);

	console.log("All objects initialised.");

	// Define the geometry of room2:
	room.walkboxes = {
			wb1: {points: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}], scale: 1}
		};
	room.nodes = {};
	room.baseline = 140;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2}	// where entering player stands
	};
	room.spawnPoints = {0: {x: 900, y: 110, face: 'ss'}};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	room.load(room._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
