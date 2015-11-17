/*jslint browser: true*/
/*global $, jQuery, alert, console*/
/*global MYGAME */

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype.afterLoad = function() {
		// Define the content of level0:
		// Define the content of level0:
		// Characters:
		var steve = new M.Player($("#steve"), "Steve", "yellow").placeAt([590,200]).face(180).setZIndex();
		M.player = steve;
		// Exits:
		var exit1 = new M.Exit($("#exit1"), "exit1", null, true, false).placeAt([608,196]);	// Visible but inactive

		console.log("All objects initialised.");
	};

	// Define the geometry of demo2room:
	var room = new M.Room(1, "Flatroom", true);
	room.load(M.Room.prototype.afterLoad);	// load() puts HTML entities into page, the callback wires them up
	room.walkboxes = {
			wb1: [{x:84,y:91}, {x:131,y:224}, {x:115,y:323}, {x:2,y:399}],
			wb2: [{x:84,y:91}, {x:131,y:224}, {x:282,y:232}, {x:343,y:209}, {x:340,y:141}],
			wb3: [{x:84,y:91}, {x:340,y:141}, {x:476,y:134}, {x:557,y:91}],
			wb4: [{x:2,y:399}, {x:115,y:323}, {x:286,y:323}, {x:638,y:399}],
			wb5: [{x:638,y:399}, {x:286,y:323}, {x:282,y:232}, {x:343,y:209}, {x:488,y:210}],
			wb6: [{x:638,y:399}, {x:488,y:210}, {x:476,y:134}, {x:557,y:91}]
		};
	room.nodes = {
			1: {x: 329, y: 134, edges: [2,3,4]},
			2: {x: 484, y: 126, edges: [1,5]},
			3: {x: 126, y: 212, edges: [1,4,6]},
			4: {x: 314, y: 221, edges: [1,3,5,7]},
			5: {x: 494, y: 214, edges: [2,4,7]},
			6: {x: 104, y: 329, edges: [3,7]},
			7: {x: 295, y: 328, edges: [4,5,6]}
		};
	room.exits = {};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	console.log("Room initialised.");

}(MYGAME, jQuery));


/*
84,91								557,91

					340,141	476,134
					343,209	488,210
	131,224	282,232
	115,323	286,323

2,399								638,399
*/
