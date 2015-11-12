// Dialogue use cases:
//
// 1. spontaneous & game-triggered			->	steve.say("My my, what was that?")
// 2. spontaneous & random (idle remarks)	->	steve.say("I like cheese.")
// 3. response to user interaction 			-> 	steve.say("That doesn't seem to work.")
// 4. talking to a NPC						->	steve.say(line, person) -> dialogueWalker(person, line)
// 5. NPC-initiated convo					->	(you start the dialogue after NPC.say())
// 6. NPC solo remarks						->	NPC.say()
// 7. scripted NPC-NPC convo				->	NPC1.say(); NPC2.say()

/*global
steve: true, pepper: true, MYGAME: true
*/

// Shortcut
//var steve = MYGAME.entities.steve;

// Build this structure from an Excel csv file:
var dialogues = {
	pepper: {
		1: {				// id
			line: "Hi, Pepper Potts.",	// what Steve says first
			count: 0,					// increment when used
			limit: 3,					// when count = limit, disable line
			disabled: false,
			permanent: true,			// never disable line if true
			responses: {
				0: "Hey you.",			// first time response
				1: generic('hi'),		// second time response
				2: "Leave me alone."	// all subsequent responses
			},
			events: {},					// functions that run when a response occurs (animation, items...)
			options: {			// ids available to Steve after this line
				0: [2],			// in general, don't return the same id (unless asking a persistent question)
				1: [2],
				2: [2,3]
			}
		},
		2: {
			line: "What's the time?",
			count: 0,
			limit: 2,
			disabled: false,
			permanent: false,
			responses: {0: "Beer o'clock!", 1: generic('no')},
			events: {1: function() {
				steve.getItem(knife);
			}},
			options: null
		},
		3: {
			line: "What can you tell me about cheese?",
			count: 0,
			limit: 2,
			disabled: false,
			permanent: false,
			responses: {
				0: "Gorgonzola is nice.",
				1: "Belgian cheese is no Gouda."
			},
			events: {1: function() {
				pepper.walkTo([30,30]);
			}},
			options: {
				0: [1],
				1: [2]
			}
		}
	},
	john: {
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
	}
};

/**
* dialogueChooser() - start or continue a conversation:
* @param {Character Object} person
* @param {Objects} opts
* @param {Boolean} is_icebreaker
*/
function dialogueChooser(person, opts, is_icebreaker) {	// Object, array, Bool
	var p = dialogues[person.id];
	
	// Steve starts the convo:
	if (is_icebreaker) {
		opts = person.convos || [1];	// dialogue options stored on the Character and updated as story requires
	}
	// Prepare to choose a line:
	if (opts) {
		// Build choices object:
		var choices = {};
		var i;
		for (i = 0; i < opts.length; i++) {
			var id = opts[i];
			choices[id] = p[id].line;
		}
		choices[9999] = "Never mind.";		// Steve always has this get-out :)
		console.log(choices);
		
		// Present options onscreen:
		displayChoices(person, choices);
		// selecting a choice fires the function dialogueWalker(sel);
	}
	// Dead end returned (null opts):
	else {
		steve.say("Ok.");
		return;
	}
	
}
 
/**
* displayChoices() - onscreen dialogue chooser:
* @param {Character Object} person
* @param {Array} choices
*/
function displayChoices(person, choices) {	// Object, Object
	var $wrapper = $("#displayChoices");
	// Clear out wrapper first:
	$wrapper.html('');

	// Append choices:
	var id;
	for (id in choices) {
		$("<a>").addClass("diaChoice")
				.attr("data-id", id)
				.html(choices[id])
				.appendTo($wrapper);
	}

	// Show and attach link click handler:
	$wrapper.show()
			.click(function(event) {
				// Take chooser away, trash all the lines:
				$(".diaChoice").remove();
				$wrapper.hide();

				// Continue dialogue process:
				dialogueFinder(person, $(event.target).attr("data-id"));
	});
}

/**
* dialogueFinder() - fetch & handle conversation responses:
* @param {Character Object} person
* @param {int} id
*/
function dialogueFinder(person, id) {		// Object, Int
	var p = dialogues[person.id],
		d = p[id],
		opts;
	if (id === 9999) {	// Steve chose get-out
		return;
	}
	if (!d.disabled) {
		if (d.permanent || d.count < d.limit) {		// Valid line
			// Which number response to give?
			var num = d.count < d.limit ? d.count : d.limit - 1;	// prevents num maxing out

			// The NPC replies:
			person.say(d.responses[num]);

			// Execute any functions found:
			if (num in d.events) {
				d.events[num]();
			}

			// Retrieve options for next step:
			if (d.options && num in d.options) {
				opts = d.options[num];
			}
			else {
				opts = null;
			}

			// Mark line as visited:
			d.count += 1;
		}
		else if (!d.permanent) {
			// Count reached limit, and line not permanent:
			d.disabled = true;
		}
	}
	else {
		// line is disabled
		console.log("Nothing.");
		steve.say("Nothing.");
	}
	// Process options:
	dialogueChooser(person, opts, false);
}

// dialogueChooser() -> displayChoices() -> dialogueFinder() -> dialogueChooser()
// until [0] chosen or [null] response.


/**
* generic() - Talk using randomised synonyms
* @param {string} key
*/
function generic(key) {
	var synonyms = {
		yes: ["Yes.", "Okay.", "Sure.", "Uh-huh."],
		no: ["No.", "No way.", "Negative.", "Nein."],
		maybe: ["Maybe.", "Hmmm....", "I'll think about it.", "Perhaps...", "Let me see..."],
		thanks: ["Thanks.", "Thank you.", "Cheers.", "Ta very much."],
		hi: ["Hi.", "Hello.", "Hola.", "Hey.", "What's up?", "Howdy."],
		bye: ["Goodbye.", "Bye.", "Toodle-oo.", "See ya!", "Hasta la vista.", "Adios.", "Do vstrechi."],
		man: ["man", "guy", "dude", "fella", "bro", "sir", "my man"]
	};
	
	// Retrieve a random simile from the hash
	var terms = synonyms[key],
		term = terms[Math.floor(Math.random() * terms.length)];
	return term;
}
function idleRemark() {}
