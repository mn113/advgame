/*jslint browser: true*/
/*global $, jQuery, alert*/
/*global steve: true, pepper: true */

// Global namespace
var MYGAME = MYGAME || {};	// "get it or set it" --> NEEDS TO GO IN EACH FILE

MYGAME.config = {
	currentRoom: 'demo',
	currentGrid: 'demograph',
	chapter: 0,
	stage: 0,
	language: 'en'
};
MYGAME.state = {
	paused: false,
	gametime: 0		// count seconds elapsed
};
MYGAME.cursor = {mode: 'default'};
MYGAME.maps = {};

// NavMesh:	(TRANSPOSED)		0 = off-grid or blocked / 1 = valid standing spot
MYGAME.maps.demograph = new Graph([		// Sets graph up for A* algorithm
	[0,0,0,0,0,0,0,0,0,0],
	[0,1,1,1,1,1,1,1,0,0],
	[1,1,1,1,1,1,1,1,1,0],
	[1,1,1,0,0,1,1,1,1,1],
	[1,1,0,0,0,0,1,1,1,1],
	[1,1,0,0,0,0,1,1,1,1],
	[1,1,1,0,0,1,1,1,1,1],
	[0,1,1,1,1,1,1,0,0,0],
	[0,1,1,1,1,1,0,0,0,0],
	[0,0,1,1,1,0,0,0,0,0]
], { diagonal: true });

// Entities within the game (characters, items, scenery...) stored by id
MYGAME.entities = {test: null};

MYGAME.roomUtils = {
	fadeIn: function() {},
	fadeOut: function() {},
	loadRoom: function(room, startref) {},
	leave: function(dest) {
		console.log("You exited the room to", dest.id);
		steve.remove();
	},
	disableInput: function() {},
	enableInput: function() {}
	
};

MYGAME.gridUtils = {
	// Looks up the Boolean value for a tile in the binary NavMesh
	tileLookup: function(gridref) {
		var x = gridref[0],
			y = gridref[1];
		return MYGAME.maps.demograph.grid[x][y].isWall();		
	},

	// Returns all valid neighbour tiles of a given tile
	// CAN REPLACE THIS WITH Graph.neighbors() FROM ASTAR
	neighbours: function(gridref) {
		var r1 = gridref[0],
			c1 = gridref[1],
			r0 = r1 - 1,
			r2 = r1 + 1,
			c0 = c1 - 1,
			c2 = c1 + 1,
			// Compile the 8 neighbouring refs:
			allneighbs = [[r0,c0], [r0,c1], [r0,c2], [r1,c0], [r1,c2], [r2,c0], [r2,c1], [r2,c2]],
			validneighbs = [];

		//	console.log("Neighbours?:", allneighbs);
		var i;
		for (i = 0; i < allneighbs.length; i++) {
			var nb = allneighbs[i];
			if (MYGAME.gridUtils.tileLookup(nb, MYGAME.maps.demograph)) {	// valid tiles return 1
				validneighbs.push(nb);
			}
		}
		console.log("Valid:", validneighbs);
		return validneighbs;
	},

	// Checks if two tiles are adjacent:
	isAdjacent: function(ref1, ref2) {
		if (Math.abs(ref1[0] - ref2[0]) < 2) {			// x within 1
			if (Math.abs(ref1[1] - ref2[1]) < 2) {		// y within 1
				return true;
			}
		}
		return false;
	},

	// Lights up a single tile e.g. J4
	highlightTile: function(gridref) {
		var col = gridref[0],
			row = gridref[1];
		// Add highlighting div to DOM and position at gridref:
		$("<div class='highlight'>").appendTo("#background")
									.css("left", col * 20 + "px")
									.css("top", (row * 20) + 40 + "px");
	},

	// Loop through a list of tiles and highlight them all
	highlightTiles: function(list) {
		var i;
		for (i = 0; i < list.length; i++) {
			MYGAME.gridUtils.highlightTile(list[i]);
		}
	},

	// Remove all current tile highlights
	highlightsOff: function() {
		$("div.highlight").remove();
	},

	// Returns the 'base' coordinates of a DOM object:
	baseCoords: function(obj) {
		var hx = $(obj).position().left + 16,	// NEEDS TO HANDLE DIFFERENT SPRITE SIZES
			hy = $(obj).position().top + 44;	// + $obj.css("height") - 4
		return [hx,hy];
	},

	// Converts [x,y] coordinates to a grid reference:
	gridref: function(coords) {
		var gridx = Math.ceil(coords[0] / 20) - 1,
			gridy = Math.ceil(coords[1] / 20) - 1;
		return [gridx, gridy];
	},

	// Returns a random point on the stage (NOT NECESSARILY VALID YET):
	randomPoint: function() {
		var rndx = Math.random() * $("#foreground").width,
			rndy = Math.random() * $("#foreground").height;
		return [rndx, rndy];		
	},

	// Returns distance between two objects (closest edge each):
	dist: function(objA, objB) {
		// Get all edge coords:
		var a = objA.domNode.position(),
			b = objB.domNode.position();
		var ax1 = a.left,
			ax2 = ax1 + objA.domNode.width,
			bx1 = b.left,
			bx2 = bx1 + objB.domNode.width;
		var ay1 = a.top,
			ay2 = ay1 + objA.domNode.height,
			by1 = b.top,
			by2 = by1 + objB.domNode.height;

		// Find the difference in closest edges: (overlap case not considered important)
		var dx = (ax2 <= bx1) ? bx1 - ax2 : ax1 - bx2,
			dy = (ay2 <= by1) ? by1 - ay2 : ay1 - by2,
			dist = Math.sqrt(dx * dx + dy * dy);
		return dist;
	},

	pointIsInPoly: function(p, polygon) {
		var isInside = false;
		// Test all vertices to find max/min x & y for a bounding box:
		var minX = polygon[0].x, maxX = polygon[0].x;
		var minY = polygon[0].y, maxY = polygon[0].y;
		for (var n = 1; n < polygon.length; n++) {
			var q = polygon[n];
			minX = Math.min(q.x, minX);
			maxX = Math.max(q.x, maxX);
			minY = Math.min(q.y, minY);
			maxY = Math.max(q.y, maxY);
		}

		if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
			// Point outside bounding box
			return false;
		}

		// Clever part:
		var i = 0, j = polygon.length - 1;
		for (i, j; i < polygon.length; j = i++) {
			if ( (polygon[i].y > p.y) != (polygon[j].y > p.y) &&
					p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
				isInside = !isInside;
			}
		}

		return isInside;
	},

	whichWalkbox: function(point) {
		for (var wbname in level0.walkboxes) {
			var wb = level0.walkboxes[wbname],
				pxy = { x: point[0], y: point[1] };
			if (MYGAME.gridUtils.pointIsInPoly(pxy, wb)) {
				return wbname;
			}
		}
		// No match:
		return false;
	}

};

var level0 = {};
level0.walkboxes = {
	wb1: [{x:60,y:10}, {x:140,y:10}, {x:140,y:40}, {x:60,y:40}],
	wb2: [{x:140,y:10}, {x:200,y:50}, {x:200,y:90}, {x:140,y:150}],
	wb3: [{x:140,y:120}, {x:140,y:195}, {x:60,y:195}, {x:60,y:120}],
	wb4: [{x:60,y:10}, {x:60,y:195}, {x:20,y:150}, {x:20,y:40}],
	wb5: [{x:60,y:40}, {x:80,y:40}, {x:60,y:60}],
	wb6: [{x:120,y:40}, {x:140,y:40}, {x:140,y:60}],
	wb7: [{x:60,y:100}, {x:80,y:120}, {x:60,y:120}],
	wb8: [{x:120,y:120}, {x:140,y:120}, {x:140,y:100}]
}

MYGAME.UIUtils = {
	toolMode: function(mode) {
		if (mode) {
			// Sets the body css class to enable a custom cursor:
			$("body").removeClass().toggleClass(mode);
		}
		MYGAME.cursor.mode = mode || 'default';
	},
	inventory: {
		ttRefresh: function() {
			$("#inventory div div.item").tooltip({
				content: function() {
					return $(this).attr("id");
				},
				show: {
					delay: 750	// a reasonable delay makes dragging/dropping/sorting a lot easier
				},
				items: "div[id]",
				tooltipClass: "tt",
				track: true
			});
		}
	}
};


/**
* Path structure
* @constructor
* @param {array} from
* @param {array} to
* @param {Object} graph
*/
function Path(from, to, graph) {
	// Properties:
	this.from = from;
	this.to = to;
	this.graph = graph;
	this.nodes = [];	// Path will be stored here
	this.svgDeets ='';
	
	// Find the shortest path between two nodes by A* search:
	this.get = function() {
		var g = this.graph;
		// Perform A* search to find shortest path:
		var apath = astar.search(g, g.grid[from[0]][from[1]], g.grid[to[0]][to[1]],
							{ heuristic: astar.heuristics.diagonal, closest: true });

		// Add the starting node:
		var startnode = graph.grid[from[0]][from[1]];
		this.nodes = [startnode].concat(apath);

		return this;
	};
	// Perform line-of-sight smoothing on a node path:
	this.simplify = function() {
		var res, n1, n2, n3, oldlength = 0;
		// Iterate until the path gets no shorter:
		while (this.nodes.length !== oldlength) {
			oldlength = this.nodes.length;
			// Loop through node triplets in path:
			var i;
			for (i = 0; i < this.nodes.length - 2; i++) {
				// The 3 nodes to consider:
				n1 = this.nodes[i];
				n2 = this.nodes[i+1];
				n3 = this.nodes[i+2];		

				// 3-in-a-row vertically:
				if ((n1.x === n2.x && n2.x === n3.x) ||
				// 3-in-a-row horizontally:
					(n1.y === n2.y && n2.y === n3.y) ||
				// 3-in-a-row main diagonal up or down:
					(n1.y < n2.y && n2.y < n3.y && n1.x < n2.x && n2.x < n3.x) ||
					(n1.y > n2.y && n2.y > n3.y && n1.x > n2.x && n2.x > n3.x) ||
				// 3-in-a-row inverse diagonal up or down:
					(n1.y > n2.y && n2.y > n3.y && n1.x < n2.x && n2.x < n3.x) ||
					(n1.y < n2.y && n2.y < n3.y && n1.x > n2.x && n2.x > n3.x))
				{
					// Cut out middle node n2:
					this.nodes.splice(i+1, 1);	// this.nodes.length decreases by 1
				}
			}
		}
		return this;
	};
	// Highlight the nodes in the path:
	this.highlight = function() {
		// Highlight the waypoints (temporary):
		MYGAME.gridUtils.highlightsOff();
		var i;
		for (i = 0; i < this.nodes.length; i++) {
			var n = this.nodes[i];
			MYGAME.gridUtils.highlightTile([n.x, n.y]);
		}
		return this;
	};	
	// Embeds a simple (orthogonal) SVG path along a node path:
	this.makeSvg = function() {
		var deets = '';
		// Extract the coords of each node centre:
		var i;
		for (i = 0; i < this.nodes.length; i++) {
			var node = this.nodes[i],
				px = node.x * 20 + 10,
				py = node.y * 20 + 10,
				char = (i === 0) ? 'M' : 'L';
			// Compose svg path details string:
			deets += char + px + ',' + py + ' ';
		}
		// Insert the path details:
		$("#walkthisway").attr("d", deets);
		this.svgDeets = deets;
		
//		console.log("d:", deets);
		return this;
	};
	// Format path debug display:
	this.toString = function() {
		var res = '';
		var i;
		for (i = 0; i < this.nodes.length; i++) {
			res += '[' + this.nodes[i].x + ',' + this.nodes[i].y + ']';
			if (i < this.nodes.length - 1) {
				res += '->';	// omit arrow after final node
			}
		}
		console.log(res);
		return this;
	};
}


/**
* BaseObj structure
* @constructor
* @param {jQuery Object} domNode
* @param {string} name
*/
function BaseObj(domNode, name, visible) {
	// Essentials:
	this.name = name;				// Everything must have a name
	this.domNode = domNode;			// Everything must have a domNode
	this.id = domNode.attr("id");	// Everything must have an id
	if (visible === undefined) {
		visible = true;				// Everything is visible by default (debatable...)
	}
	this.visible = visible;
	this.giveable = false;
	this.anchorOffset = [0,0];		// Every sprite needs an anchor offset
	this.descriptions = [];			// Everything can have multiple descriptions
	this.looks = 0;					// Everything can be looked at 0 or more times
//	this.uses = {test: 0};				// (Hash of usable-with objects and their cases)
	
	// Store by id in entities hash:
	MYGAME.entities[this.id] = this;

	// Set visibility:
	if (!this.visible) {
		this.domNode.hide();
	}
	return this;
}
BaseObj.prototype.placeAt = function(coords) {
	this.domNode.css("left", coords[0] - this.anchorOffset[0]);		// Compensate for anchor point
	this.domNode.css("top", coords[1] - this.anchorOffset[1]);		// being inside sprite
	this.updateXY();
	// Update HTML visibility:
	if (this.visible) {
		this.domNode.show();
	}
	else {
		this.domNode.hide();
	}
	console.log(this.id, "placed @ [" + this.x + ', ' + this.y + "]");
	return this;
};
BaseObj.prototype.updateXY = function() {
	// Set sprite's anchor coords:
	this.x = this.domNode.position().left + this.anchorOffset[0];
	this.y = this.domNode.position().top + this.anchorOffset[1];
	return this;
};
BaseObj.prototype.gridref = function() {
	var gridx = Math.ceil(this.x / 20) - 1,
		gridy = Math.ceil(this.y / 20) - 1;
	return [gridx, gridy];	
};
BaseObj.prototype.setZIndex = function() {
	this.domNode.css("z-index", this.y);
	return this;
};
BaseObj.prototype.reportLoc = function() {
	console.log("I'm at " + this.x + ', ' + this.y + ': [' + this.gridref() + ']');
};
BaseObj.prototype.remove = function() {
	// From DOM:
	this.domNode.remove();

	// From Entities:
	delete MYGAME.entities[this];

	console.log(this.id, "removed.");
};


/**
* FixedItem structure
* @constructor
* @extends BaseObj
* @param {jQuery Object} domNode
* @param {string} name
*/
function FixedItem(domNode, name, visible) {
	BaseObj.call(this, domNode, name, visible);		// Create an object like this parent

	// FixedItem-specific properties:
	this.pickable = false;
}
// Inheritance: FixedItem extends BaseObj
FixedItem.prototype = Object.create(BaseObj.prototype, {
	// Options
});
FixedItem.prototype.constructor = FixedItem;


/**
* Item structure
* @constructor
* @extends FixedItem
* @param {jQuery Object} domNode
* @param {string} name
*/
function Item(domNode, name, visible) {
	FixedItem.call(this, domNode, name, visible);

	// Item-specific properties:
	this.giveable = true;
	this.anchorOffset = [16,28];	// corrects for 32x32 sprite
	this.pickable = true;
	this.pickedUp = false;
}
// Inheritance: Item extends FixedItem
Item.prototype = Object.create(FixedItem.prototype, {
	// Options
});
Item.prototype.constructor = Item;
Item.prototype.remove = function() {
	// Inventory check:
	var ininv = false,
		index = steve.inventory.indexOf(this.id);

	// From Inventory:
	if (index > -1) {
		ininv = true;
		steve.inventory.splice(index, 1);
	}
	// From DOM:
	if (ininv) {
		// Remove container div and item:
		this.domNode.parent("div").remove();	// NOT REMOVING
	}
	else {
		this.domNode.remove();
	}

	// From Entities:
	delete MYGAME.entities[this];

	console.log(this.id, "removed.");

	return index;
};
Item.prototype.toInventory = function(index) {
	// If no index passed, insert item at end:
	index = (index) ? index : steve.inventory.length - 1;
	console.log("Insert", this.id, '@', index);

	// Move the HTML element:
	var $newdiv = $("<div>");
	var $target = $("#inventory > div").eq(index);
	$target.after($newdiv);
	this.domNode.detach().appendTo($newdiv);

	// Flash it:
	$newdiv.addClass("flash");
	setTimeout(function() {
		$newdiv.removeClass("flash");
	}, 2000);

	// Redo tooltips:
	MYGAME.UIUtils.inventory.ttRefresh();

	// Move the logical element:
	steve.inventory.push(this.id);
	console.log(this.id, "to Inventory.");
};

/**
* Exit
* @constructor
* @extends BaseObj
* @param {jQuery Object} domNode
* @param {string} name
* @param {string} dest
* @param {Boolean} visible
* @param {Boolean} active
*/
function Exit(domNode, name, dest, visible, active) {
	BaseObj.call(this, domNode, name, visible);

	// Item-specific properties:
	this.dest = null;		// Another room id?
	this.active = true;		// Can it currently be used?
}
// Inheritance: Exit extends BaseObj
Exit.prototype = Object.create(BaseObj.prototype, {
	// Options
});
Exit.prototype.constructor = Exit;


/**
* Character structure
* @constructor
* @extends BaseObj
* @param {jQuery Object} domNode
* @param {string} name
* @param {string} colour
*/
function Character(domNode, name, colour, visible) {
	BaseObj.call(this, domNode, name, visible);

	// Character-specific properties:
	this.giveable = true;
	this.anchorOffset = [16,44];	// corrects for 32x48 sprite
	this.looks = 0;
	this.talks = 0;
	this.state = 0;		// advances as gameplay dictates
	this.textColour = colour;
}
// Inheritance: Character extends BaseObj
Character.prototype = Object.create(BaseObj.prototype, {
	// Options
});
Character.prototype.constructor = Character;
Character.prototype.say = function(sentences) {
	// Clear out previous lines:
	$("#dialogue").html('');

	// Got input?
	if (sentences) {
		// Put string input into array:
		if (typeof sentences === 'string') {
			sentences = [sentences];
		}

		var me = this;		// Store 'this' (me/Character) to pass to function below

		// Define loop:
		var i = 0;
		var loop = function() {
			var line = sentences[i],
				time = line.length * 70;
			// Add a new div to #dialogue instead of reusing:
			$("<div class='dia'>").appendTo($("#dialogue"))
								  .css("color", me.textColour)
								  .html(line).show()
								  .delay(time).fadeOut(1500);
			i++;
			// Not done? Initiate the next one:
			if (i < sentences.length) {
				setTimeout(loop, time);
			}
		};
		// Set first loop iteration going:
		loop();
	}
	return this;
};
Character.prototype.face = function(angle) {
	var dir;
	if (angle > 45 && angle < 135) { dir = 'ss'; }
	else if (angle < 45 && angle > -45) { dir = 'ee'; }
	else if (angle < -45 && angle > -135) { dir = 'nn'; }
	else if (angle > 135 || angle < -135) { dir = 'ww'; }
	// Give owner correct class:
	this.domNode.removeClass("nn ee ss ww").addClass(dir);
	
	return this;
};
Character.prototype.walkSvgPath = function(deets, steps) {
	// Create a <path> element in DOM:
	var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	// Assign the generated pathdata to it:
	p.setAttribute("d", deets);
	var svglen = p.getTotalLength(),
		speed =  (3 * steps);
//	console.log("Path length:", svglen, "Steps:", steps, "Speed:", speed);

	this.domNode.addClass("walking");
	var parent = this;	// upcoming functions will lose 'this' context

	// Set a timer to execute finishing code after 50 loops of setInterval:		// UGLY HACK
	var totalWalk = setTimeout(function() {
		parent.domNode.removeClass("walking");
		parent.reportLoc();
		MYGAME.gridUtils.highlightsOff();				
	}, 110 * speed);
	
	// Traverse path in 50 steps of 2%:
	var i = 0;
	var traversal = setInterval(function() {
		var pt1 = p.getPointAtLength(svglen * i / 100);
		var pt2 = p.getPointAtLength(svglen * (i+1) / 100);

		// Work out deltas, angle etc of current segment:
		var dx = pt2.x - pt1.x,
			dy = pt2.y - pt1.y,
			angle = (360 / 6.28) * Math.atan2(dy,dx);
		parent.face(angle);
		
		// Take a step:
		parent.domNode.animate({"left": pt1.x - 16, "top": pt1.y - 44}, speed, function() {
			// Update position:
			parent.updateXY();
		});
		// Increment:
		i += 2;
		// Break out of last loop:	// HE DOES THIS TOO SOON - BETTER TO TEST GRIDREF?
		if (i >= 99) {
			clearInterval(traversal);
		}
	}, speed);

	$("#walkthisway").hide();
	return this.gridref();
	// return success or failure?
	// if (I'm at my destination) return 1;
	// else return 0;
};
Character.prototype.walkTo = function(dest) {			// MAKE IT ACCEPT OBJECTS
	var point;
	if (dest.hasOwnProperty("id")) {
		// Object passed in:
		point = [dest.x, dest.y];
	}
	else {
		// Coords passed in:
		point = dest;
	}

	// Make path:
	var ppp = new Path(this.gridref(), MYGAME.gridUtils.gridref(point), MYGAME.maps.demograph);
	ppp.get();
	var ppl = ppp.nodes.length;
	ppp.simplify().toString().highlight().makeSvg();
	// Go walkies:
	this.walkSvgPath(ppp.svgDeets, ppl);
};


/**
* Player structure
* @constructor
* @extends Character
* @param {jQuery Object} domNode
* @param {string} name
* @param {string} colour
*/
function Player(domNode, name, colour, visible) {
	Character.call(this, domNode, name, colour, visible);

	// Player-specific properties:
	this.inventory = [];		// Hash of inventory item ids
}
// Inheritance: Player extends Character
Player.prototype = Object.create(Character.prototype, {
	// Options
});
Player.prototype.constructor = Player;
Player.prototype.examine = function(target) {
	if (target.hasOwnProperty('name') && target.name !== null) {
		// Don't run out of descriptions, even if we examine it 100 times:
		var last = target.descriptions.length - 1,
			num = target.looks <= last ? target.looks : last;
		// Describe the target out loud:
		this.say(target.descriptions[num]);
		target.looks += 1;
	}
	else {
		this.say("Nothing to see here.");	// Or just do nothing?
	}
};
Player.prototype.talkTo = function(character) {
	if (character.hasOwnProperty('name')) {
		dialogues.choicesFromOpts(character, null, true);
	}
};
Player.prototype.canUse = function(item1, item2) {
	var item2id = (item2) ? item2.id : 'itself';	// This string will be used for looking up in Item.uses

	// 2 items passed:
	if (item2id !== 'itself') {
		// Sort item1 & item2 alphabetically, to avoid doubling up on Item.uses:
		if (item1.id > item2.id) {
			var flip = this.canUse(item2, item1);
			return flip;
		}
	}

	// Use X with Y (or 'itself'), as per Item.uses definition:
	if (!($.isEmptyObject(item1.uses))) {
		if (item2id in item1.uses) {
			if (typeof item1.uses[item2id] === 'function') {
				return true;
			}
		}
		else {
			return false;
		}
	}
	else {
		return false;
	}
};
Player.prototype.use = function(item1, item2) {
	var item2id = (item2) ? item2.id : 'itself';	// This string will be used for looking up in Item.uses 

	// 2 items passed:
	if (item2id !== 'itself') {
		// Sort item1 & item2 alphabetically, to avoid doubling up on Item.uses:
		if (item1.id > item2.id) {
			var flip = this.use(item2, item1);
			return flip;
		}
	}

	// Use X with Y (or 'itself'), as per Item.uses definition:
	if (!($.isEmptyObject(item1.uses))) {
		if (item2id in item1.uses) {
			if (typeof item1.uses[item2id] === 'function') {		//
				// Execute:
				item1.uses[item2id]();		// WORKS FOR 'itself', cheese...
				return true;
			}
		}
		else {
			this.say("I can't use that here.");	
			return false;
		}
	}
	else {
		this.say("I can't use that for anything.");
		return false;
	}
};
Player.prototype.pickUp = function(item) {
	if (item.hasOwnProperty('name')) {
		// If we don't already have it:
		if (this.inventory.indexOf(item) === -1) {
			if (item.pickable) {
				item.toInventory();
				item.pickable = false;
//				item.pickedUp();		// ?
//				this.inventory.push(item.id);
				this.say("Got me some " + item.name);
			}
			else {
				this.say("I can't pick that up.");
			}
		}
	}
};
Player.prototype.getItem = function(item, index) {
	// If we don't already have it:
	if (this.inventory.indexOf(item) === -1) {
		// Add item to inventory:
//		this.inventory.push(item.id);
		item.toInventory(index);
		item.pickable = false;
		item.visible = true;
		item.domNode.show();
	}
};


// Handles action when an object is clicked on with a mode cursor:
function modedClick(targetObj) {

	switch ($("body").attr("class")) {
		case 'examine':
			steve.examine(targetObj);
			break;
		case 'talkto':
			steve.talkTo(targetObj);
			break;
		case 'pickup':
			steve.pickUp(targetObj);
			break;
		case 'use':
			steve.use(targetObj);
			break;
		default:
			break;
	}		

	// Unset mode & cursor:
	$("body").removeClass();
	MYGAME.cursor.mode = 'default';
}


// jQuery ready function:
$(function () {

	// Load level:
	$.getScript("js/level0.js", function(){
		console.log("Level0.js loaded but not necessarily executed.");
	});

	// Stage click handler:
	$("#foreground").on("click", function(event) {
		// What element was clicked? Set the target.
		var evxy = [event.clientX - 31, event.clientY - 91];	// accounts for #foreground's pos within viewport
		// Fix negative y clicks:
		if (evxy[1] < 0) {
			evxy[1] = 0;
		}
		// Get gridref:
		var gr = MYGAME.gridUtils.gridref(evxy),
			targetObj = null;		
		console.log("click @ ", evxy, event.target.id);
		console.log("click @ ", gr);

		console.log(MYGAME.gridUtils.whichWalkbox(evxy));
		
		// Check Entities list first:
		var ens = MYGAME.entities;
		if (event.target.id in ens) {
			// Found a match:, retrieve it:
			console.log("Clicked on", event.target.id, "(" + MYGAME.cursor.mode[0] + ")");
			targetObj = ens[event.target.id];
		}
		
		if (targetObj) {
			// If Steve NEAR targetObj, ok, otherwise walk to it first
			var dist = MYGAME.gridUtils.dist(steve, targetObj);
			if (dist > 30) {
				// Walk to it first:
				console.log("Not near enough. (dist: " + dist + ")");
				MYGAME.gridUtils.highlightTile(gr);
				steve.walkTo(evxy);
				return;		// Need to click again when nearer
			}
			else {
				// Act, depending on mode:
				modedClick(targetObj);
			}
		}
		else {
			// No specific object clicked, so just walk there:
			// Check if clicked spot is valid in NavMesh:
//			if (MYGAME.maps.demograph.grid[gr[0]][gr[1]].weight == '1') {
			if (!MYGAME.gridUtils.tileLookup(gr)) {		// if not wall...
				MYGAME.gridUtils.highlightTile(gr);
				steve.walkTo(evxy);
				return;
			}
		}	
	});

	// Inventory click handler:
	$("#inventory").on("click", function(event) {
		
		// What element was clicked? Set the target.
		var targetObj;

		// Check Entities list:
		var ens = MYGAME.entities;
		if (event.target.id in ens) {
			// Found a match:, retrieve it:
			console.log("Clicked on", event.target.id, "(" + MYGAME.cursor.mode[0] + ")");
			targetObj = ens[event.target.id];
		}
		
		// Act, depending on mode:
		modedClick(targetObj);
	});
	
	// Room exits click handler:
	$(".exit").on("click", function(event) {
		var exit;

		// Check Entities list:
		var ens = MYGAME.entities;
		if (event.target.id in ens) {
			// Found a match:, retrieve it:
			exit = ens[event.target.id];
		}
		if (exit.visible && exit.active) {
			MYGAME.roomUtils.leave(exit);
		}
	});

	// ToolMenu click handler:
	$("#toolMenu li").on("click", function(event) {
		// Extract the chosen mode from HTML:
		var mode = $(event.target).parent("li").attr("name");
		// Set the mode:
		MYGAME.UIUtils.toolMode(mode);
	});

	//jQuery UI block:
	{
		// Set up sortable inventory:
		$("#inventory").sortable({
			helper: "clone",
			start: function(event, ui) {
				console.log("Reordering...");// item", $(ui.item[0]).children().attr("id"));
			}
		});

		// Droppables in the field + inventory:
		$("#foreground div, #inventory .item").droppable({
			hoverClass: "drop-hover",		// USE CLASS FOR AN ICON
			drop: function(event, ui) {
				// Lookup dragged item in Entities:
				var dragid = $(ui.draggable[0]).children().attr("id"),
					item = MYGAME.entities[dragid];
				// Lookup drop target in Entities:
				var dropid = this.id,
					target = MYGAME.entities[dropid];
				console.log(item, target);

				// Test if drop is valid:
				if (item && target && item.giveable) {
					// See if they fail to combine:
					if (!steve.canUse(item, target)) {
						console.log("No drop, reverting (2).");
					}
					else {
						// SUCCESS:
						steve.use(item, target);
						// Refresh inventory in case of item deletion:
						$("#inventory").sortable("refresh");
						// Delete helper?
						console.log("Dropped", item.id, "on", target.id);
					}
				}
				else {
					console.log("No drop, reverting (1).");
				}
			}
		});

		// Inventory Tooltips:
		MYGAME.UIUtils.inventory.ttRefresh();

	}	// end jQuery UI block

}); // end jQuery function

/**********/
/*! INPUT */
/**********/
// Register keypress events on the whole document
// From: http://www.marcofolio.net/webdesign/advanced_keypress_navigation_with_jquery.html
$(document).keydown(function(e) {			// keydown is Safari-compatible; keypress allows holding a key to send continuous events
	MYGAME.UIUtils.toolMode(null);
	
	if (e.keyCode === 69) {											// press 'e'
		MYGAME.UIUtils.toolMode('examine');			
	}
	else if (e.keyCode === 84) {									// press 't'
		MYGAME.UIUtils.toolMode('talkto');			
	}
	else if (e.keyCode === 80) {									// press 'p'
		MYGAME.UIUtils.toolMode('pickup');
	}		
	else if (e.keyCode === 85) {									// press 'u'
		MYGAME.UIUtils.toolMode('use');			
	}
	else if (e.keyCode === 68) {									// press 'd'
		// Toggle debug state:
		$("body").toggleClass("debug");
	}
	else {															// any other keypress
		$("body").removeClass();	// unset all modes
		MYGAME.cursor.mode = 'default';
	}

//	if (e.keyCode == 32) {									// press 'space'
//		if (game.state == 'running') pause();				// pause/unpause
//		else if (game.state == 'paused') unpause();
//	}

	$('#keypress').html(e.keyCode);		// Show onscreen
});
