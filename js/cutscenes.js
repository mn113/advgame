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
	switch (id) {
		case 1:
			var room = id;	// full switch or not?
			hotelier.say("This is a cutscene.", function() {
				player.say("I know.", function() {
					hotelier.walkTo([400,300], 2, function() {
						player.walkTo([450,320], 2, function() {
							setTimeout(function() {
								player.say("When will it end?", function() {
									hotelier.say("God only knows.", function() {
										_endCutscene(1000);
									});
								});
							}, 750);
						});
					});
				});
			});
			break;

		case 2:
			player.walkTo([500,350]);
			setTimeout(function() {
				player.face('ss').say("SOUTH!", function() {
					player.face('ww').say("WEST|STREET!", function() {
						hotelier.say("YO!");
						player.face('nn').say("NORTH|IS|GREAT!", function() {
							player.face('ee').say("EAST|RULES!", function() {
								player.face('ss');
								_endCutscene(1000);
							});
						});
					});
				});
			}, 500);
			break;

	}	// end switch
};
