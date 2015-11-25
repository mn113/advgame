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
		id: 3,
		name: "Zak's living room",
		unlocked: true,
		scrollable: true
	});
	M.curRoom = room;

	// Define the content:
	var cheese = new M.Item({id: "cheese", name: "Cheese"}).placeAt([200,250]);
	// Hidden items:
	var knife = new M.Item({id: "knife", name: "Small knife", visible: false});
	var key = new M.Item({id: "key", name: "Bone key", visible: false });
	// Characters:
	var pepper = new M.Character({
		id: "pepper",
		name: "Pepper",
		colour: "pink"
	}).placeAt([300,250]).face('ss');
	// Exits:
	var exit1 = new M.Exit({
		id: "exit1",
		dest: 2,
		width: "50px",
		height: "160px",
		classes: "left",
		visible: true,
		active:true
	}).placeAt([0,70]);
	var exit2 = new M.Exit({
		id: "exit2",
		dest: 4,
		width: "50px",
		height: "160px",
		classes: "right",
		visible: true,
		active:true
	}).placeAt([1230,70]);
	// Scenery:
	var catclock = new M.Scenery({
		id: "cat_clock_tail",
		name: "CCT",
		layer: "background",
		width: "36px",
		height: "14px",
		visible: true,
		onExamine: {
			0: function() {
				catclock.name = "Swiss cat clock";
			}
		}
	});

	console.log("All objects initialised.");

	// Define the geometry of room2:
	room.walkboxes = {
			wb1: {points: [{x:53,y:209}, {x:1226,y:209}, {x:1270,y:255}, {x:5,y:257}], scale: 1}
		};
	room.nodes = {};
	room.baseline = 178;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 2, dir: 'w', doormat: {x: 50, y: 235}},	// where entering player stands
		1: {dest: 4, dir: 'e', doormat: {x: 1185, y: 235}}
	};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	room.load(room._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
