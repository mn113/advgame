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
		id: 6,
		name: "Hotel Kitchen",
		unlocked: true,
		entry: M.rooms.previous,
		scrollable: true,
		monoscale: true
	});
	M.rooms.current = room;

	// Define the content:
	// Exits:
	var exit1 = new M.Exit({
		id: "exit1",
		dest: 5,
		width: 120,
		height: 220,
		direction: "left",
		visible: true,
		active: true
	}).placeAt([0,100]);
	var exit1 = new M.Exit({
		id: "exit2",
		dest: 8,
		width: 120,
		height: 220,
		direction: "right",
		visible: true,
		active: false
	}).placeAt([680,100]);
	
	// NPCs:
	var hotelier = new M.Character({
		id: "hotelier",
		name: "Hotel Manager",
		colour: "red",
		subparts: ["eyes", "mouth", "brows"],
		facing: "ss"
	}).placeAt([500,200]);
	
	// Scenery:
	var crates = new M.Scenery({
		id: "crates",
		name: "Crates",
		layer: "midground"
	});
	var table = new M.Scenery({
		id: "kitchen-table",
		name: "Table",
		layer: "midground"
	});
	
	// Items:	INSTANTIATE WITH LOOP?
	console.log("All objects initialised.");

	// Define the geometry of room5:
	room.walkboxes = {
			wb1: {points: [{x:120,y:306}, {x:684,y:306}, {x:764,y:382}, {x:50,y:382}], scale: 1}
		};
	room.nodes = {};
	room.baseline = 306;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 5}
	};
	room.spawnPoints = {
		5: {x: 150, y: 310, face: 'ee'}
	};

	room.load(M.Room.prototype._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log(M);
	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
