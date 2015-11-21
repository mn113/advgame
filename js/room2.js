/*jslint browser: true*/
/*global $, jQuery, alert, console*/
/*global MYGAME */

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
	var room = new M.Room(2, "Zak's bedroom", true);
	M.curRoom = room;
	// Define the geometry of room2:
	room.walkboxes = {
			wb1: [{x:249,y:257}, {x:282,y:197}, {x:576,y:197}, {x:639,y:257}],
			wb2: [{x:129,y:178}, {x:287,y:178}, {x:263,y:226}, {x:89,y:226}]
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

}(MYGAME, jQuery));
