// Dialogue use cases:
//
// 1. spontaneous & game-triggered			->	steve.say("My my, what was that?")
// 2. spontaneous & random (idle remarks)	->	steve.say("I like cheese.")
// 3. response to user interaction 			-> 	steve.say("That doesn't seem to work.")
// 4. talking to a NPC						->	steve.say(line, person) -> dialogueWalker(person, line)
// 5. NPC-initiated convo					->	(you start the dialogue after NPC.say())
// 6. NPC solo remarks						->	NPC.say()
// 7. scripted NPC-NPC convo				->	NPC1.say(); NPC2.say()
// 8. multi-line monologue					->	steve.say() or NPC.say() handles it

/*global
steve: true, pepper: true, MYGAME: true
*/

var dialogues = {
	/**
	* dialogueChooser() - start or continue a conversation:
	* @param {Character Object} person
	* @param {Objects} opts
	* @param {Boolean} is_icebreaker
	*/
	choicesFromOpts: function(person, opts, is_icebreaker) {	// Object, array, Bool
		console.log("choicesFromOpts(" + person.id + ', ' + opts + ', ' + is_icebreaker + ') called.' );
		var p = dialogues[person.id];

		// Steve starts the convo:
		if (is_icebreaker) {
			opts = person.convos || [1];	// valid convos stored on the Character and updated as story requires
		}
		// Prepare to choose a line:
		if (opts && opts !== null) {
			// Build choices object:
			var choices = {};
			var i;
			for (i = 0; i < opts.length; i++) {
				var id = opts[i];
				choices[id] = p[id].line;
			}
			choices[9999] = dialogues.generic('nevermind');		// Steve always has this get-out :)
//			console.log(choices);

			// Present options onscreen:
			dialogues.displayChoices(person, choices);
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
		console.log("displayChoices(" + person.id + ', ' + choices + ') called.' );

		var $wrapper = $("#displayChoices");
		// Clear out wrapper first:
		$wrapper.html('');

		// Append choices:
		var id;
		for (id in choices) {
			var $a = $("<a>");
			$a.addClass("diaChoice")
			  .attr("data-id", id)
			  .html(choices[id])
			  .appendTo($wrapper);
		}

		// Show and attach link click handler:
		$wrapper.show();
		$(".diaChoice").on('click', function(event) {			// IS THIS WHAT's MULTI-CALLING?
			console.log("clicked", event.target);

			// Take chooser away, trash all the lines:
			$(".diaChoice").remove();
			$wrapper.hide();

			// Continue dialogue process:
			dialogues.getOpts(person, $(event.target).attr("data-id"));
		});
	},

	/**
	* dialogueFinder() - fetch & handle conversation responses:
	* @param {Character Object} person
	* @param {int} id
	*/
	getOpts: function(person, node) {		// Object, Int
		console.log("getOpts(" + person.id + ', ' + node + ') called.' );

		var p = dialogues[person.id],
			d = p[node],
			opts,
			num;
		if (node === '9999') {	// Steve chose get-out
			console.log("Player ended conversation");
			return;
		}
		if (!d.disabled) {
			if (d.permanent || d.count < d.limit) {		// Valid line
				// Which number response to give?
				num = d.count < d.limit ? d.count : d.limit - 1;	// prevents num maxing out

				// The NPC gives the appropriate response:
				console.log("Num:", num);
				person.say(d.responses[num]);

				// Execute any functions found:
				if (typeof d.events[num] === 'function') {
					d.events[num]();
				}

				// Retrieve options for next step:
				if (d.options && d.options[num] !== null) {
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
		}
		// Process options:
		dialogues.choicesFromOpts(person, opts, false);
	},

	/**
	* pruneTree - delete a completed node of the dialogue tree
	* @param {Character Object} person
	* @param {int} node
	*/
	pruneTree: function(person, node) {
		delete dialogues[person][node];
	},

	/**
	* generic() - Talk using randomised synonyms
	* @param {string} key
	*/
	generic: function(key) {
		var synonyms = {
			yes: ["Yes.", "Okay.", "Sure.", "Uh-huh."],
			no: ["No.", "No way.", "Negative.", "Nein."],
			maybe: ["Maybe.", "Hmmm....", "I'll think about it.", "Perhaps...", "Let me see..."],
			thanks: ["Thanks.", "Thank you.", "Cheers.", "Ta very much."],
			hi: ["Hi.", "Hello.", "Hola.", "Hey.", "What's up?", "Howdy."],
			bye: ["Goodbye.", "Bye.", "Toodle-oo.", "See ya!", "Hasta la vista.", "Adios.", "Later.", "Do vstrechi."],
			man: ["man", "guy", "dude", "fella", "bro", "sir", "my man"],
			goaway: ["Go away.", "I'm busy.", "Please stop bothering me.", "Now is not a good time.", "Can we discuss this later?"],
			nevermind: ["Never mind.", "Whatever.", "Er, nothing.", "Excuse me.", "Sorry, nothing."]
		};

		// Retrieve a random simile from the hash
		var terms = synonyms[key],
			term = terms[Math.floor(Math.random() * terms.length)];
		return term;
	},

	idelRemark: function() {}
};

// choicesFromOpts() -> displayChoices() -> getOpts() -> choicesFromOpts()
// until [0] chosen or [null] response.

// Build this structure from an Excel csv file:
//var dialogues = {
dialogues.pepper = {
	1: {				// id
		line: "Hi, Pepper Potts.",	// what Steve says first
		count: 0,					// increment when used
		limit: 3,					// when count = limit, disable line
		disabled: false,
		permanent: true,			// never disable line if true
		responses: {
			0: "Hey you.",			// first time response
			1: dialogues.generic('hi'),		// second time response
			2: "What do you want?"	// all subsequent responses
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
			1: dialogues.generic('goaway')
		},
		events: {1: function() {
			dialogues.pruneTree('pepper', 2);
		}},
		options: null
	},
	3: {
		line: "What can you tell me about dairy?",
		count: 0,
		limit: 3,
		disabled: false,
		permanent: false,
		responses: {
			0: "Gorgonzola is nice.",
			1: "Belgian cheese is no Gouda.",
			2: "Here, try this brie if you're so desperate."
		},
		events: {2: function() {
			steve.getItem(cheese);
		}},
		options: {
			0: [1],
			1: [2],
			2: null
		}
	}
};
dialogues.john = {
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
//};

