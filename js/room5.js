/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype._afterLoad = function() {
		// All descriptions for entities in this level:
		cheese.descriptions = [
			"Strange to find a half-eaten brie here.",
			"It looks fresh and tasty.",
			"Would be nice on a baguette. With grapes.",
			"It's yellow and smelly."
		];	// 4
		desk.descriptions = [
			"It's the hotel's front desk",
			"It's made of wood.",
			"It's the desk where guests check in."
		];	// 3
	};

	// Create the Room object:
	var room = new M.Room({
		id: 5,
		name: "Hotel Lobby",
		unlocked: true,
		entry: M.rooms.previous,
		scrollable: true,
		monoscale: false
	});
	M.rooms.current = room;

	// Define the content:
	// Exits:
	var exit1 = new M.Exit({
		id: "exit1",
		dest: 4,
		width: 120,
		height: 220,
		direction: "left",
		visible: true,
		active: true
	}).placeAt([0,100]);
	var exit2 = new M.Exit({
		id: "exit2",
		dest: 6,
		width: 120,
		height: 220,
		direction: "right",
		visible: true,
		active: true
	}).placeAt([1080,100]);
	var exit3 = new M.Exit({
		id: "exit3",
		dest: 7,
		width: 115,
		height: 116,
		direction: "up",
		visible: true,
		active: true
	}).placeAt([930,0]);
	
	// NPCs:
	var hotelier = new M.Character({
		id: "hotelier",
		name: "Hotel Manager",
		colour: "red",
		subparts: ["eyes", "mouth", "brows"],
		facing: "nn"
	}).placeAt([550,280]);
	
	// Scenery:
	var desk = new M.Scenery({
		id: "desk",
		name: "Front desk",
		clickable: false
	});
	
	// Items:	INSTANTIATE WITH LOOP?
	var keys = new M.Item({id: "keys", name: "keys"});
	var bell = new M.Item({id: "bell", name: "bell"});
	var guestbook = new M.Item({id: "guestbook", name: "guestbook"});
	var phone = new M.Item({id: "phone", name: "phone"});
	var plant = new M.Item({
		id: "plant",
		name: "plant",
		onExamine: {
			0: function() {
				console.log('changed plant.name');
				plant.name = "topiarised plant";
			}
		}
	});
	var cheese = new M.Item({
		id: "cheese",
		name: "Cheese"
	}).placeAt([200,250]);

	console.log("All objects initialised.");

	// Define the geometry of room5:
	room.walkboxes = {
			wb1: {points: [{x:48,y:399}, {x:145,y:299}, {x:958,y:299}, {x:1019,y:399}], scale: 1},
			wb2: {points: [{x:170,y:274}, {x:408,y:274}, {x:408,y:299}, {x:145,y:299}], scale: 0.9},
			wb3: {points: [{x:237,y:274}, {x:403,y:274}, {x:356,y:215}, {x:282,y:215}], scale: 0.8},
			wb4: {points: [{x:710,y:299}, {x:816,y:182}, {x:925,y:116}, {x:1014,y:116}, {x:843,y:299}], scale: 0.9},
			wb5: {points: [{x:966,y:313}, {x:1019,y:399}, {x:1156,y:399}, {x:1127,y:313}], scale: 1}
		};
	room.nodes = {
			1: {x: 320, y: 274, edges: [2]},	// edges are the other nodes this node can see
			2: {x: 394, y: 299, edges: [1,3,4]},
			3: {x: 780, y: 299, edges: [2,4]},
			4: {x: 985, y: 337, edges: [2,3]}
		};
//	room.exits = {
//		0: {dest: 4},
//		1: {dest: 6},
//		2: {dest: 7}
//	};
	room.spawnPoints = {
		4: {x: 150, y: 320, face: 'ee'},
		6: {x: 900, y: 320, face: 'ww'},
		7: {x: 700, y: 200, face: 'ss'}
	};

	room.load(M.Room.prototype._afterLoad);	// load() puts HTML entities into page, the callback wires them up

	console.log(M);
	console.log("Room initialised.");

	// Create SVG paths (for debug use):
	M.utils.grid.walkboxes2svg();
	// Reload SVG wrapper to hack browser to display dynamically-inserted elements:
	$("#svgwrap").html($("#svgwrap").html());

}(MYGAME, jQuery));
