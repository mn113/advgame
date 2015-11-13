/*jslint browser: true*/
/*global $, jQuery, alert*/
/*global Player, Character, Item, FixedItem, Exit */

// Initialise characters:
var steve = new Player($("#steve"), "Steve", "yellow").placeAt([50,30]).face(90).setZIndex();
var pepper = new Character($("#pepper"), "Pepper", "red").placeAt([170,110]).face(90).setZIndex();
var john = new Character($("#john"), "John", "lightblue").placeAt([30,160]).face(180).setZIndex();
// Initialise stage items:
var bread = new Item($(".bread"), "bread").placeAt([30,70]);
var cheese = new Item($(".cheese"), "cheese").placeAt([50,170]);
// Initialise hidden items:
var knife = new Item($(".knife"), "knife", false);
var key = new Item($(".key"), "key", false);
var slicedbread = new Item($(".slicedbread"), "slicedbread", false);
var sandwich = new Item($(".sandwich"), "sandwich", false);
// Initialise scenery:
var lake = new FixedItem($(".lake"), "lake").placeAt([68,48]);
var door = new FixedItem($(".door"), "door").placeAt([100,-24]);		// Locked / Unlocked states ???
var chest = new FixedItem($(".chest.closed"), "chest").placeAt([140,30]);
// Initialise hidden scenery:
var openchest = new FixedItem($(".chest.open"), "openchest", false);	// Invisible
// Initialise exits:
var exit1 = new Exit($(".exit"), "exit1", null, true, false).placeAt([100,0]);	// Visible but inactive

console.log("All objects initialised.");

// All descriptions for entities in this level:
steve.descriptions = [
	"It's me.",
	"Not too shabby.",
	"I look good.",
	"I hope that isn't a spot coming up.",
	"Me."
];		// 5
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
		steve.say("It tastes pretty dry.");
		return false;
	},
	cheese: function() {
		steve.say("I could really do with a knife.");
		return false;
	},
	knife: function() {
		steve.getItem(slicedbread);
		bread.remove();
		// Set some flags
		steve.say("It cuts well.");
		return true;
	}
};
cheese.uses = {
	slicedbread: function() {
		steve.getItem(sandwich);
		cheese.remove();
		return true;		
	}
};
slicedbread.uses = {
	itself: function() {
		steve.say("A bread sandwich? No thanks!");
		return false;
	}
};
chest.uses = {
	itself: function() {
		chest.remove();
		openchest.visible = true;
		openchest.placeAt([140,30]);
		steve.getItem(knife);
		steve.say("There was a nice little knife inside!");
		return true;
	}
};
door.uses = {
	itself: function() {
		steve.say("It's locked.");
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

/*
-= POSSIBLE VERBS =-
* Examine
* Use / use with
* Talk to
* Pick up
Push / pull / move		(use)
Give					(use)

*/
