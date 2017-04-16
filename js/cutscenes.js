/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

// Script all the games cutscenes in here:
MYGAME.cutscenes = function(id) {
	var hotelier = MYGAME.entities.hotelier;
	var player = MYGAME.player;

	// Sleep function (FREEZES BROWSER, SO USE VERY SPARINGLY! Cutscenes ok.):
	function sleepFor(sleepDuration) {
		var end = new Date().getTime() + sleepDuration;
		while (new Date().getTime() < end) { /* do nothing */ }
	}

	function _endCutscene(delay) {
		setTimeout(function() {
			console.info("@", new Date().getTime(), 'Cutscene', id, 'completed.');
			MYGAME.dialogues.clearDead();
			// Re-enable input
			MYGAME.utils.ui.enableInput();
		}, delay);
	}

	// Disable input first
	MYGAME.utils.ui.disableInput();
	console.info("@", new Date().getTime(), 'Cutscene', id, 'started.');

	// Prepare generator controller:
	var sceneGen, cueSheet;
	function advance() {
		sceneGen.next();
	}

	// The cutscenes:
	switch (id) {
		case 1:
			//var room = id;	// full switch or not?
			cueSheet = function* () {
				hotelier.say("This is a cutscene.", advance); yield;
				player.say("I know.", advance); yield;
				hotelier.walkTo([400,300], 2, advance); yield;
				player.walkTo([450,320], 2, advance); yield;
				sleepFor(750);
				player.say("When will it end?", advance); yield;
				hotelier.say("God only knows.", advance); yield;
				_endCutscene(1000);
			};
			break;
			
		case 2:
			cueSheet = function* () {
				player.walkTo([500,350], 2, advance); yield;
				player.face('ss').say("SOUTH!", advance); yield;
				player.face('ww').say("WEST|STREET!", advance); yield;
				hotelier.say("YO!", advance); yield;
				player.face('nn').say("NORTH|IS|GREAT!", advance); yield;
				player.face('ee').say("EAST|RULES!", advance); yield;
				player.face('ss');
				_endCutscene(1000);
			};
			break;
		
		case 3:
			cueSheet = function* () {
				player.walkTo([500,370], 2, advance); yield;
				sleepFor(500);
				player.walkTo([600,320], 1, advance); yield;
				sleepFor(500);
				player.walkTo([400,350], 2, advance); yield;
				sleepFor(500);
				hotelier.face('ss').say("You maniac!", advance); yield;
				sleepFor(500);
				player.say("Whew!", advance); yield;
				_endCutscene(1000);
			};
			break;

		case 4:
			cueSheet = function* () {
				player.walkTo([550,370], 2, advance); yield;	// can no longer chain after walkTo
				player.face('ss', advance); yield;
				hotelier.walkTo([600,370], 1, advance); yield;
				hotelier.face('ww', advance); yield;
				sleepFor(500);
				hotelier.say("Here's the secret file.", advance); yield;
				player.reach('mid', 'ee', advance); yield;
				sleepFor(500);
				player.say("Thanks.", advance); yield;
				sleepFor(500);
				hotelier.walkTo([800,310], 1, advance); yield;
				_endCutscene(1000);
			};
			break;
	}	// end switch

	// Initiate scene and take first action:
	sceneGen = cueSheet();
	advance();
};
