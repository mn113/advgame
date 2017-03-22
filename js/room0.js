/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

(function(M, $) {
	// Define callback function for Room.load():
	M.Room.prototype.afterLoad = function() {
		// Define the content:
		// Exits:
		var exit1 = new M.Exit({
			domNode: $("#exit1"),
			id: "exit1",
			dest: 1,
			visible: true,
			active: true
		}).placeAt([100,15]);
		// Characters:
		var pepper = new M.Character($("#pepper"), "Pepper", "red").placeAt([170,110]).face('ss');
		var john = new M.Character($("#john"), "John", "lightblue").placeAt([30,160]).face('ww');
		// Stage items:
		var bread = new M.Item($(".bread"), "bread").placeAt([30,70]);
		var cheese = new M.Item($(".cheese"), "cheese").placeAt([50,170]);
		// Inventory items:
		var chicken = new M.Item($(".chicken"), "chicken", true);
		M.player.inventory.push(chicken.id);
		// Hidden items:
		var knife = new M.Item($(".knife"), "knife", false);
		var key = new M.Item($(".key"), "key", false);
		var slicedbread = new M.Item($(".slicedbread"), "slicedbread", false);
		var sandwich = new M.Item($(".sandwich"), "sandwich", false);
		// Scenery:
		var lake = new M.FixedItem($(".lake"), "lake").placeAt([68,48]);
		var door = new M.FixedItem($(".door"), "door").placeAt([100,-24]);		// Locked / Unlocked states ???
		var chest = new M.FixedItem($(".chest.closed"), "chest").placeAt([140,30]);
		// Hidden scenery:
		var openchest = new M.FixedItem($(".chest.open"), "openchest", false);	// Invisible

		console.log("All objects initialised.");

		// All descriptions for entities in this level:
		pepper.descriptions = [
			"She's a smartly dressed blonde woman.",
			"She's Robert Downey Jr's assistant in that movie.",
			"I'd better not objectify her any longer."
		];		// 3

		bread.descriptions = [
			"Looks like a loaf of bread.",
			"A slice has been cut off.",
			"I'd say this sourdough is about 2 days old.",
			"Bread, bread, glorious bread."
		];		// 4
		cheese.descriptions = [
			"Strange to find a half-eaten brie here.",
			"It looks fresh and tasty",
			"Would be nice on a baguette. With grapes.",
			"It's yellow and smelly."
		];		// 4
		knife.descriptions = [
			"It's a knife.",
			"You call that a knife? THIS is a knife!"
		];		// 2
		key.descriptions = [
			"A key with a skull on it. Not creepy at all.",
			"It's a bony key.",
			"The key to some door?"
		];			// 3
		slicedbread.descriptions = [
			"I sliced it 12mm thick.",
			"Soft with great crumb structure.",
			"It's the best thing since... I don't know what!"
		];	// 3
		sandwich.descriptions = [
			"Brie on bread. A Frenchman's wet dream.",
			"It looks so good.",
			"This would fill a hole nicely, if I was hungry."
		];		// 3

		lake.descriptions = [
			"That lake looks deep.",
			"I'm not a strong swimmer.",
			"I think I see a shopping trolley down there.",
			"Reminds me of that crappy movie, The Lake House."
		];			// 4
		chest.descriptions = [
			"It's an ancient looking treasure chest.",
			"It's locked.",
			"There's a keyhole.",
			"I wonder what's inside."
		];		// 4
		openchest.descriptions = [
			"An open chest."
		];	// 1
		door.descriptions = [
			"A very sturdy looking wooden door.",
			"It's locked."
		];			// 2

		console.log("Descriptions loaded.");

		// All uses for entities in this level:
		// All definitions to be made with alphabetically earlier element parent of alphabetically later ('itself' excepted)

		bread.uses = {
			itself: function() {
				M.player.say("It tastes pretty dry.");
				return false;
			},
			cheese: function() {
				M.player.say("I could really do with a knife.");
				return false;
			},
			knife: function() {
				var invpos = bread.remove();
				M.player.getItem(slicedbread, invpos);
				// Set some flags?
				M.player.say("It cuts well.");
				return true;
			}
		};
		cheese.uses = {
			slicedbread: function() {
				M.player.getItem(sandwich, cheese.remove());
				return true;
			}
		};
		slicedbread.uses = {
			itself: function() {
				M.player.say("A bread sandwich? No thanks!");
				return false;
			}
		};
		chest.uses = {
			itself: function() {
				chest.remove();
				openchest.visible = true;
				openchest.placeAt([140,30]);
				M.player.getItem(knife);
				M.player.say("There was a nice little knife inside!");
				return true;
			}
		};
		door.uses = {
			itself: function() {
				M.player.say("It's locked.");
				return false;
			},
			key: function() {
				door.remove();		// Door blocks exit; unlocking it removes it
				key.remove();
				return true;
			}
		};
		john.uses = {
			sandwich: function() {
				john.say("Oh! Thank you so much!");
				sandwich.remove();
				john.walkTo([90,160]);
				key.visible = true;
				key.placeAt([john.x, john.y]);
			}
		};

		console.log("Uses loaded.");
	};

	// Define the geometry of room0:
	var room = new M.Room({
		id: 0,
		name: "Grassy Knoll",
		unlocked: true,
		entry: M.rooms.previous
	});
	M.rooms.current = room;
	room.walkboxes = {
			wb1: {points: [{x:60,y:10}, {x:140,y:10}, {x:140,y:40}, {x:60,y:40}], scale: 1},
			wb2: {points: [{x:140,y:10}, {x:200,y:50}, {x:200,y:90}, {x:140,y:150}], scale: 1},
			wb3: {points: [{x:140,y:120}, {x:140,y:195}, {x:60,y:195}, {x:60,y:120}], scale: 1},
			wb4: {points: [{x:60,y:10}, {x:60,y:195}, {x:20,y:150}, {x:20,y:40}], scale: 1},
			wb5: {points: [{x:60,y:40}, {x:80,y:40}, {x:60,y:60}], scale: 1},
			wb6: {points: [{x:120,y:40}, {x:140,y:40}, {x:140,y:60}], scale: 1},
			wb7: {points: [{x:60,y:100}, {x:80,y:120}, {x:60,y:120}], scale: 1},
			wb8: {points: [{x:120,y:120}, {x:140,y:120}, {x:140,y:100}], scale: 1}
		};
	room.nodes = {
			1: {x: 60, y: 50, edges: [2,5]},
			2: {x: 70, y: 40, edges: [1,3]},
			3: {x: 130, y: 40, edges: [2,4]},
			4: {x: 140, y: 50, edges: [3,8]},
			5: {x: 60, y: 110, edges: [1,6]},
			6: {x: 70, y: 120, edges: [5,7,9]},
			7: {x: 130, y: 120, edges: [6,8,9]},
			8: {x: 140, y: 110, edges: [4,7,9]},
			9: {x: 140, y: 150, edges: [6,7,8]}
		};
	room.baseline = 0;	// pixels from top that walkable area starts
	room.exits = {
		0: {dest: 1, dir: 'n', doormat: {x: 110, y: 25}}	// where entering player stands
	};
	room.entities = {};	// Could store fixed items and default items/characters in this object

	room.load(M.Room.prototype.afterLoad);	// load() puts HTML entities into page, the callback wires them up

	// Draw baseline:
	M.ctx.clearRect(0,0,640,400);
	M.ctx.strokeStyle="#FFFFFF";
	M.ctx.strokeRect(0,0,640,room.baseline);

	console.log("Room initialised.");

}(MYGAME, jQuery));
