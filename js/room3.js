/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype.afterLoad = function() {
		// Define the content:
		var cheese = new M.Item($(".cheese"), "cheese").placeAt([200,250]);
		// Characters:
		// Exits:

		console.log("All objects initialised.");
	};

	// Create the Room object:
	var room = new M.Room({
		id: 3,
		name: "Zak's living room",
		unlocked: true,
		scrollable: true
	});
	M.curRoom = room;
	// Define the geometry of room2:
	room.walkboxes = {
			wb1: [{x:53,y:213}, {x:1226,y:213}, {x:1270,y:255}, {x:5,y:257}]
		};
	room.nodes = {};
	room.baseline = 178;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2, dir: 'w', doormat: {x: 50, y: 235}},	// where entering player stands
		1: {dest: 3, dir: 'e', doormat: {x: 1185, y: 235}}
	};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	room.load(room.afterLoad);	// load() puts HTML entities into page, the callback wires them up

	var s = JSON.stringify(M.rooms);
	console.log(s);
	var o = JSON.parse(s);
	console.log(o);

	console.log(M);
	console.log("Room initialised.");

}(MYGAME, jQuery));