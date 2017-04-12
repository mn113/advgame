// Dialogue use cases:
//
// 1. spontaneous & game-triggered			->	steve.say("My my, what was that?")							// OK
// 2. spontaneous & random (idle remarks)	->	steve.say("I like cheese.")
// 3. response to user interaction			->	steve.say("That doesn't seem to work.")						// OK
// 4. talking to a NPC						->	steve.say(line, person) -> dialogueWalker(person, line)		// OK
// 5. convo flows w/out choice				->	return only 1 response										// OK
// 5. NPC-initiated convo					->	player.talkTo with convos.active set						// OK
// 6. NPC solo remarks						->	NPC.say()
// 7. scripted NPC-NPC convo				->	NPC1.say(); NPC2.say()										// OK
// 8. multi-line monologue					->	steve.say() or NPC.say() handles it							// OK

// lookupDialogueChoices() -> displayChoices() -> clickLine() -> doNPCDialogue() -> lookupDialogueChoices()
// until [0] chosen or [null] response.

/*jslint browser: true*/
/*global $, jQuery, alert, console*/

// Find global namespace:
var MYGAME = MYGAME || {};	// "get it or set it"

MYGAME.dialogues = {
	/**
	* lookupDialogueChoices() - start or continue a conversation:
	* @param {Character Object} person
	* @param {Object} opts
	* @param {Boolean} is_icebreaker
	*/
	lookupDialogueChoices: function(person, opts, is_icebreaker) {	// Object, array, Bool
		console.log("lookupDialogueChoices(" + person.id + ', ' + opts + ', ' + is_icebreaker + ') called.' );
		var dia = MYGAME.dialogues;
		var p = dia[person.id];

		// Player initiated the convo, so current passive opts must be retrieved:
		if (is_icebreaker) {
			opts = person.convos.passive || [1];
		}
		console.info("Opts:", opts);
		// Prepare to choose a line:
		if (opts && opts !== null) {
			if (opts.length === 1) {
				// Make convo advance automatically:
				var soleOpt = opts[0];
				MYGAME.player.say(p[soleOpt].line, function() {	// Callback
					dia.doNPCDialogue(person, soleOpt);
				});
			}
			// 2 or more options returned:
			else {
				// Build choices object:
				var choices = {};
				var i;
				for (i = 0; i < opts.length; i++) {
					var cid = opts[i];
					choices[cid] = p[cid];
				}
				choices[999] = {
					line: dia.genericLine('nevermind')	// Player always has this get-out :)
				};

				// Present options onscreen:
				dia.displayChoices(person, choices);
			}
		}
		// Dead end returned (null opts):
		else {
			console.log("Null opts");
			return;
		}
	},

	/**
	* displayChoices() - onscreen dialogue chooser:
	* @param {Character Object} person
	* @param {Array} choices
	*/
	displayChoices: function(person, choices) {	// Object, Object
		console.log("displayChoices(" + person.id + ', ' + choices.keys + ") called." );

		// Clear out old choices, then show:
		var $wrapper = $("#displayChoices");
		$wrapper.html('');
		$wrapper.show();

		// Append new choices:
		var cid;
		for (cid in choices) {
			var choice = choices[cid];
			var $a = $("<a>");
			$a.addClass("diaChoice")
			  .attr("data-id", cid)
			  .attr("data-line", choice.line)
			  .html(choice.preLine || choice.line)		// preLine is optional
			  .appendTo($wrapper);
		}

		// Show and attach a delegated click handler:
		$("#displayChoices").on("click", ".diaChoice", {person: person}, function(event) {
			MYGAME.dialogues.clickLine(person, event.target);
		});
	},

	/**
	* clickLine() - what to do when a dialogue option is clicked by the player
	* @param {Character Object} person
	* @param {DOMElement} target
	*/
	clickLine: function(person, target) {
		console.info("clickLine(" + person.id + ", " + target + ") called.");

		var line = $(target).attr("data-line");
		var id = $(target).attr("data-id");

		// Take chooser away, trash all the lines:
		$("#displayChoices").hide().empty();

		// Say the line:
		MYGAME.player.say(line, function() {	// Callback
			// When done saying, continue the dialogue process:
			MYGAME.dialogues.doNPCDialogue(person, id);
		});

	},

	/**
	* doNPCDialogue() - fetch & handle conversation responses:
	* @param {Character Object} person
	* @param {int} id
	*/
	doNPCDialogue: function(person, nodeid) {
		console.info("doNPCDialogue(" + person.id + ', ' + nodeid + ') called.' );

		var dia = MYGAME.dialogues,
			p = dia[person.id],
			node = p[nodeid],
			num,
			lines,
			opts;
		if (nodeid === '999') {	// Player chose get-out
			console.warn("Player ended conversation");
			return;
		}
		if (!node.disabled) {
			if (node.permanent || node.count < node.limit) {	// Valid line of dialogue
				// Which number response to give?
				num = (node.count < node.limit) ? node.count : node.limit - 1;	// prevents num maxing out
				node.count += 1;

				// Use any string separators to make an array of sentences:
				lines = node.responses[num].split('|');
				// The NPC delivers the appropriate response:
				person.say(lines, function() {	// Callback
					// When done saying, continue the dialogue process:
					// Execute any functions found:
					if (typeof node.events[num] === 'function') {
						node.events[num]();
					}

					// Retrieve player's options for next step:
					if (node.options && node.options[num] !== null) {
						opts = node.options[num];
					}
					else {
						opts = null;
					}
					MYGAME.dialogues.lookupDialogueChoices(person, opts, false);
				});
			}
			else if (!node.permanent) {
				// Count reached limit, and line not permanent:
				node.disabled = true;
			}
		}
	},

	/**
	* pruneTree - delete a completed node of the dialogue tree
	* @param {Character Object} person
	* @param {int} node
	*/
	pruneTree: function(person, node) {
		delete MYGAME.dialogues[person][node];
	},

	/**
	* genericLine() - Talk using randomised synonyms
	* @param {string} key
	*/
	genericLine: function(key) {
		var synonyms = {
			yes: ["Yes.", "Okay.", "Sure.", "Uh-huh."],
			no: ["No.", "No way.", "Negative.", "Nein."],
			maybe: ["Maybe.", "Hmmm....", "I'll think about it.", "Perhaps...", "Let me see..."],
			thanks: ["Thanks.", "Thank you.", "Cheers.", "Ta very much."],
			hi: ["Hi.", "Hello.", "Hola.", "Hey.", "What's up?", "Howdy."],
			bye: ["Goodbye.", "Bye.", "Toodle-oo.", "See ya!", "Hasta la vista.", "Adios.", "Later.", "Do vstrechi."],
			man: ["man", "guy", "dude", "fella", "bro", "sir", "my man"],
			goaway: ["Go away.", "I'm busy.", "Please stop bothering me.", "Now is not a good time.", "Can we discuss this later?"],
			nevermind: ["Never mind.", "Forget it.", "Sorry, nothing."]
		};

		// Retrieve a random simile from the hash
		var terms = synonyms[key],
			term = terms[Math.floor(Math.random() * terms.length)];
		return term;
	},

	/**
	* idleRemark() - The random things player will mutter during idle moments:
	* @param {Character Object} person
	*/
	idleRemark: function(person) {},

	/**
	* clearDead() - remove dead dialogue DOM nodes:
	*/
	clearDead: function() {
		$("#dialogue").html('');
	}
};

// Whole game dialogue content:
// Build this structure from an Excel csv file:
MYGAME.dialogues.pepper = {
	1: {				// id
		line: "Hi, Pepper Potts.",	// what Steve says first
		count: 0,					// increment when used
		limit: 3,					// when count = limit, disable line
		disabled: false,
		permanent: true,			// never disable line if true
		responses: {
			0: "Hey you.",			// first time response
			1: MYGAME.dialogues.genericLine('hi'),		// second time response
			2: "What...|do...|you...|want?"			// all subsequent responses
		},
		events: {},					// functions that run when a response occurs (animation, items...)
		options: {			// ids available to Steve after this line
			0: [1],			// in general, don't return the same id (unless asking a persistent question)
			1: [1,2],
			2: [2,3]
		}
	},
	2: {
		line: "What's the time?",
		count: 0,
		limit: 2,
		disabled: false,
		permanent: false,
		responses: {
			0: "Beer o'clock!",
			1: MYGAME.dialogues.genericLine('goaway')
		},
		events: {1: function() {
			MYGAME.dialogues.pruneTree('pepper', 2);
		}},
		options: {
			0: [1,2,3],
			1: null
		}
	},
	3: {
		line: "What can you tell me about dairy?",
		count: 0,
		limit: 3,
		disabled: false,
		permanent: false,
		responses: {
			0: "Gorgonzola is nice.",
			1: "Belgian cheese is no Gouda.|LOL.",
			2: "Here, try this brie if you're so desperate."
		},
		events: {2: function() {
			MYGAME.player.getItem(cheese);
		}},
		options: {
			0: [1],
			1: [2],
			2: null
		}
	}
};
MYGAME.dialogues.john = {
	1: {
		line: "Hi, what's up?",
		count: 0,
		limit: 2,
		disabled: false,
		permanent: true,
		responses: {
			0: "So... hungry. So very... hungry."
		},
		events: {},
		options: {
			0: [1]
		}
	}
};
MYGAME.dialogues.hotelier = {
	1: {
		line: "There must be some kind of way out of here.",
		responses: {
			0: "Said the joker to the thief."
		},
		options: {
			0: [2]
		},
		events: {},
		count: 0,
		limit: 1,
		permanent: true,
		disabled: false
	},
	2: {
		line: "There's too much confusion.",
		responses: {
			0: "I can't get no relief.",
			1: "Enough already."
		},
		options: {
			0: [3],
			1: [5]
		},
		events: {},
		count: 0,
		limit: 2,
		permanent: true,
		disabled: false
	},
	3: {
		line: "Businessmen they drink my wine,",
		responses: {
			0: "Plowmen dig my earth."
		},
		options: {
			0: [4]
		},
		events: {},
		count: 0,
		limit: 1,
		permanent: true,
		disabled: false
	},
	4: {
		line: "None of them along the line,",
		responses: {
			0: "Know what any of it is worth."
		},
		events: {},
		options: {
			0: [2,5]
		},
		count: 0,
		limit: 1,
		permanent: true,
		disabled: false
	},
	5: {
		preLine: "(compliment her)",
		line: "That's a great song!",
		responses: {
			0: "Thanks!"
		},
		events: {},
		options: {
			0: null
		},
		count: 0,
		limit: 1,
		permanent: true,
		disabled: false
	}

};
