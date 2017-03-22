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
		id: 2,
		name: "Zak's bedroom",
		unlocked: true
	});
	M.rooms.current = room;

	// Define the content:
	var cheese = new M.Item({
		id: "cheese",
		name: "Cheese",
		onExamine: {
			0: function() {
				console.log('changed cheese.name');
				cheese.name = "Smelly swiss cheese";
			}
		}
	}).placeAt([400,190]);
	// Exits:
	var exit1 = new M.Exit({
		id: "exit1",
		dest: 3,
		width: "50px",
		height: "140px",
		classes: "right",
		visible: true,
		active:true
	}).placeAt([590,70]);
	// Characters:
	var malin = new M.Character({
		id: "malin",
		name: "Malin",
		colour: "pink",
		anchorOffset: [27,170],
		anchorOffsetDefault: [27,170],
		convos: {
			active: [1],
			passive: [1,5]
		}
	}).placeAt([400,250]).face('ss');
	// Scenery:
	var catclock = new M.Scenery({
		id: "cat_clock_tail",
		name: "CCT",
		layer: "midground",
		width: "18px",
		height: "14px",
		visible: true,
		onExamine: {
			0: function() {
				console.log('changed catclock.name');
				catclock.name = "Swiss cat clock";
			}
		}
	});
	var bed = new M.Scenery({
		id: "bed",
		name: "Bed",
		layer: "midground",
		clickable: false
	});

	console.log("All objects initialised.");

	// Define the geometry of room2:
	room.walkboxes = {
			wb1: {points: [{x:249,y:257}, {x:282,y:197}, {x:576,y:197}, {x:639,y:257}], scale: 1},
			wb2: {points: [{x:129,y:178}, {x:287,y:178}, {x:263,y:226}, {x:89,y:226}], scale: 1}
		};
	room.nodes = {
			1: {x: 283, y: 196, edges: [1]}	// edges are the other nodes this node can see
		};
	room.baseline = 178;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 3}
	};
	room.spawnPoints = {0: {x: 585, y: 215, face: 'ww'}};

	room.load(room._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log("Room initialised.");

	// All descriptions for entities in this level:
	cheese.descriptions = [
		"Strange to find a half-eaten brie here.",
		"It looks fresh and tasty",
		"Would be nice on a baguette. With grapes.",
		"It's yellow and smelly."
	];		// 4
	catclock.descriptions = [
		"Tick, tock."
	];		// 1

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
