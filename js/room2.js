/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype.afterLoad = function() {
		// Define the content:
		// Characters:
		// Exits:

		console.log("All objects initialised.");
	};

	// Create the Room object:
	var room = new M.Room({
		id: 2,
		name: "Zak's bedroom",
		unlocked: true
	});
	M.curRoom = room;
	// Define the geometry of room2:
	room.walkboxes = {
			wb1: {points: [{x:249,y:257}, {x:282,y:197}, {x:576,y:197}, {x:639,y:257}], scale: 1},
			wb2: {points: [{x:129,y:178}, {x:287,y:178}, {x:263,y:226}, {x:89,y:226}], scale: 1}
		};
	room.nodes = {
			1: {x: 283, y: 196, edges: [1]}
		};
	room.baseline = 178;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 3, dir: 'e', doormat: {x: 585, y: 215}}	// where entering player stands
	};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	room.load(room.afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log(M);
	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
