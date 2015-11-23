/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype._afterLoad = function() {
		M.player.inventory.push("chicken");
	};

 	// Create the Room object:
	var room = new M.Room({
		id: 3,
		name: "Zak's living room",
		unlocked: true,
		scrollable: true
	});
	M.curRoom = room;

	// Define the content:
	var cheese = new M.Item("cheese", "Cheese").placeAt([200,250]);
	// Inventory items:
	var chicken = new M.Item("chicken", "chicken", true);
	// Hidden items:
	var knife = new M.Item("knife", "knife", false);
	var key = new M.Item("key", "key", false);
	// Characters:
	var pepper = new M.Character({
		id: "pepper",
		name: "Pepper",
		colour: "pink"
	}).placeAt([300,250]).face('ss');
	// Exits:
	var exit1 = new M.Exit({
		domNode: $("#exit1"),
		id: "exit1",
		dest: 3,
		visible: true,
		active:true
	}).placeAt([0,200]);
	var exit2 = new M.Exit({
		domNode: $("#exit2"),
		id: "exit2",
		dest: 4,
		visible: true,
		active:true
	}).placeAt([1240,200]);

	console.log("All objects initialised.");

	// Define the geometry of room2:
	room.walkboxes = {
			wb1: {points: [{x:53,y:213}, {x:1226,y:213}, {x:1270,y:255}, {x:5,y:257}], scale: 1}
		};
	room.nodes = {};
	room.baseline = 178;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2, dir: 'w', doormat: {x: 50, y: 235}},	// where entering player stands
		1: {dest: 3, dir: 'e', doormat: {x: 1185, y: 235}}
	};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	room.load(room._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log(M);
	console.log("Room initialised.");

}(MYGAME, jQuery));
