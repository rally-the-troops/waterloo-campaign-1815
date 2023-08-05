"use strict"

const FRENCH = "French"
const COALITION = "Coalition"

const P1 = FRENCH
const P2 = COALITION

exports.roles = [ P1, P2 ]

exports.scenarios = [ "June 16-18", "June 15-18" ]

const data = require("./data")

var game = null
var view = null
var states = {}

const OPEN = 0
const TOWN = 1
const STREAM = 2

const OLD_GUARD = 25
const GRAND_BATTERY = 28

function make_piece_list(f) {
	let list = []
	for (let p = 0; p < data.pieces.length; ++p)
		if (f(data.pieces[p]))
			list.push(p)
	return list
}

const p1_hqs = make_piece_list(p => p.side === P1 && p.type === "hq")
const p2_hqs = make_piece_list(p => p.side !== P1 && p.type === "hq")
const p1_cav = make_piece_list(p => p.side === P1 && p.type === "cav")
const p2_cav = make_piece_list(p => p.side !== P1 && p.type === "cav")
const p1_inf = make_piece_list(p => p.side === P1 && p.type === "inf")
const p2_inf = make_piece_list(p => p.side !== P1 && p.type === "inf")
const p1_det = make_piece_list(p => p.side === P1 && p.type === "det")
const p2_det = make_piece_list(p => p.side !== P1 && p.type === "det")
const p1_corps = make_piece_list(p => p.side === P1 && (p.type === "inf" || p.type === "cav"))
const p2_corps = make_piece_list(p => p.side !== P1 && (p.type === "inf" || p.type === "cav"))
const p1_units = make_piece_list(p => p.side === P1 && (p.type === "inf" || p.type === "cav" || p.type === "det"))
const p2_units = make_piece_list(p => p.side !== P1 && (p.type === "inf" || p.type === "cav" || p.type === "det"))

function friendly_hqs() { return (game.active === P1) ? p1_hqs : p2_hqs }
function enemy_hqs() { return (game.active !== P1) ? p1_hqs : p2_hqs }
function friendly_cavalry_corps() { return (game.active === P1) ? p1_cav : p2_cav }
function enemy_cavalry_corps() { return (game.active !== P1) ? p1_cav : p2_cavalry_corps }
function friendly_infantry_corps() { return (game.active === P1) ? p1_inf : p2_inf }
function enemy_infantry_corps() { return (game.active !== P1) ? p1_inf : p2_inf }
function friendly_detachments() { return (game.active === P1) ? p1_det : p2_det }
function enemy_detachments() { return (game.active !== P1) ? p1_det : p2_det }
function friendly_corps() { return (game.active === P1) ? p1_corps : p2_corps }
function enemy_corps() { return (game.active !== P1) ? p1_corps : p2_corps }
function friendly_units() { return (game.active === P1) ? p1_units : p2_units }
function enemy_units() { return (game.active !== P1) ? p1_units : p2_units }

function set_piece_hex(p, hex) {
	game.hex[p] = hex
}

function set_piece_mode(p, mode) {
	game.mode[p] = mode
}

function piece_hex(p) {
	return game.hex[p]
}

function piece_mode(p) {
	return game.mode[p]
}

// === ZONE OF CONTROL / INFLUENCE ===

var zoc_valid = false
var p1_zoc = new Array(data.map.rows * 100).fill(0)
var p1_zoi = new Array(data.map.rows * 100).fill(0)
var p2_zoc = new Array(data.map.rows * 100).fill(0)
var p2_zoi = new Array(data.map.rows * 100).fill(0)

function is_friendly_zoc(x) { return game.active === P1 ? p1_zoc[x] : p2_zoc[x] }
function is_friendly_zoi(x) { return game.active === P1 ? p1_zoi[x] : p2_zoi[x] }
function is_enemy_zoc(x) { return game.active !== P1 ? p1_zoc[x] : p2_zoc[x] }
function is_enemy_zoi(x) { return game.active !== P1 ? p1_zoi[x] : p2_zoi[x] }

function update_zoc_imp(zoc, zoi, units) {
	zoc.fill(0)
	zoi.fill(0)
	for (let p of units) {
		for_each_adjacent(piece_hex(p), x => {
			// TODO: river
			zoc[x - 1000] = 1
			for_each_adjacent(x, y => {
				// TODO: bridge
				zoi[y - 1000] = 1
			})
		})
	}
}

function update_zoc() {
	if (!zoc_valid) {
		zoc_valid = true
		update_zoc_imp(p1_zoc, p1_zoi, p1_units)
		update_zoc_imp(p2_zoc, p2_zoi, p2_units)
	}
}

function is_not_in_enemy_zoc_or_zoi(p) {
	let x = piece_hex(p)
	return !is_enemy_zoc(x) && !is_enemy_zoi(x)
}

function is_map_hex(row, col) {
	return row >= 10 && row <= 40 && col >= 0 && col <= 41
}

function calc_distance(a, b) {
	let ac = a % 100
	let bc = b % 100
	let ay = a / 100 | 0
	let by = b / 100 | 0
	let ax = ac - (ay >> 1)
	let bx = bc - (by >> 1)
	let az = -ax - ay
	let bz = -bx - by
	return max(abs(bx-ax), abs(by-ay), abs(bz-az))
}

function for_each_adjacent(hex, fn) {
	let row = hex / 10 | 0
	let col = hex % 10
	if (col < 41)
		fn(hex + 1)
	if (col > 0)
		fn(hex - 1)
	if (row & 1) {
		if (row < 40) {
			if (col < 41)
				fn(hex + 101)
			fn(hex + 100)
		}
		if (row > 10) {
			fn(hex - 100)
			if (col < 41)
				fn(hex - 99)
		}
	} else {
		if (row < 40) {
			fn(hex + 100)
			if (col > 0)
				fn(hex + 99)
		}
		if (row > 10) {
			if (col > 0)
				fn(hex - 101)
			fn(hex - 100)
		}
	}
}

function prompt(str) {
	view.prompt = str
}

// === === COMMAND PHASE === ===

function goto_command_phase() {
	log("Command Phase")
	log("")
	goto_hq_placement_step()
}

function goto_hq_placement_step() {
	game.active = P1
	game.state = "hq_placement_step"
}

function goto_blown_unit_return_step() {
	game.active = P1
	game.state = "blown_unit_return_step"
	game.count = 2
}

function end_blown_unit_return_step() {
	if (game.active === P1) {
		game.active = P2
		game.count = 2
	} else {
		goto_cavalry_corps_recovery_step()
	}
}

function goto_cavalry_corps_recovery_step() {
	game.active = P1
	game.state = "cavalry_corps_recovery_step"
	resume_cavalry_corps_recovery_step()
}

function resume_cavalry_corps_recovery_step() {
	update_zoc()
	for (let p of friendly_cavalry_corps())
		if (is_not_in_enemy_zoc_or_zoi(p))
			return
	end_cavalry_corps_recovery_step()
}

function end_cavalry_corps_recovery_step() {
	if (game.active === P1) {
		game.active = P2
		resume_cavalry_corps_recovery_step()
	} else {
		goto_detachment_placement_step()
	}
}

function goto_detachment_placement_step() {
	game.active = P1
	game.state = "detachment_placement_step"
	game.count = 0
}

function end_detachment_placement_step() {
	if (game.active === P1) {
		game.active = P2
		game.count = 0
	} else {
		goto_detachment_recall_step()
	}
}

function goto_detachment_recall_step() {
	game.active = P1
	game.state = "detachment_recall_step"
}

function end_detachment_recall_step() {
	if (game.active === P1) {
		game.active = P2
	} else {
		goto_british_line_of_communication_angst()
	}
}

function goto_british_line_of_communication_angst() {
	game.active = P2
	game.state = "british_line_of_communication_angst"
}

/*

command phase:

	remove hq
	place hq
	return up to 2 blown corps
	flip exhausted cav to fresh (move to organization?)
	place 1 detachment per hq
	recall all, some, or no detachments
	angst: substitute Hill unit

organization
	advance formation: flip infantry corps to advance
	battle formation: flip infantry corps to battle
	alternate withdrawal: retreat or pass (3 remain)

movement
	alternate corps movement: move corps or pass

attack
	alternate corps to attack in zoc or pass

end phase
	if last turn - victory
	recall french grand battery
	new turn

*/


// === A: HQ PLACEMENT STEP ===


states.hq_placement_step = {
	prompt() {
		prompt("HQ Placement")
	},
}

states.setup = {
	prompt() {
	},
}

states.edit_town = {
	prompt() {
		view.roads = data.map.roads
	},
}

// === SETUP ===

function setup_piece(side, name, hex, mode = 0) {
	let id = data.pieces.findIndex(pc => pc.side === side && pc.name === name)
	if (id < 0)
		throw new Error("INVALID PIECE NAME: " + name)
	set_piece_hex(id, hex)
	set_piece_mode(id, mode)
}

exports.setup = function (seed, scenario, options) {
	game = {
		seed,
		scenario,
		undo: [],
		log: [],
		active: P1,
		state: null,
		turn: 3,
		pieces: new Array(piece_count).fill(0),
		mode: new Array(piece_count).fill(0),
		remain: 0,
	}

	setup("French", "Napoleon HQ", 1217)
	setup("French", "Guard Corps (Drouot)", 1217)
	setup("French", "Grouchy HQ", 1621)
	setup("French", "Ney HQ", 2218)
	setup("French", "II Corps (Reille)", 2218)
	setup("French", "I Corps (d'Erlon)", 1617)
	setup("French", "III Corps (Vandamme)", 1721)
	setup("French", "IV Corps (Gerard)", 1221)
	setup("French", "VI Corps (Lobau)", 1117)
	setup("French", "Guard Cav Corps (Guyot)", 2317)
	setup("French", "Res Cav Corps (Grouchy)", 1822)
	setup("French", "I Detachment (Jacquinot)", 1314)

	setup("Anglo", "Wellington HQ", 2818, 1)
	setup("Anglo", "Reserve Corps (Wellington)", 3715)
	setup("Anglo", "I Corps (Orange)", 3002)
	setup("Anglo", "II Corps (Hill*)", 3)
	setup("Anglo", "Cav Corps (Uxbridge)", 4)
	setup("Anglo", "Cav Detachment (Collaert)", 1211)
	setup("Anglo", "I Detachment (Perponcher)", 2618)

	setup("Prussian", "Blucher HQ", 2324)
	setup("Prussian", "Cav Corps (Gneisenau)", 2324, 1)
	setup("Prussian", "I Corps (Ziethen)", 1922, 1)
	setup("Prussian", "II Corps (Pirch)", 1928)
	setup("Prussian", "III Corps (Thielmann)", 1737)
	setup("Prussian", "IV Corps (Bulow)", 3)
	setup("Prussian", "I Detachment (Lutzow)", 1623)

	goto_command_phase()

	return game
}

// === COMMON ===

exports.view = function (state, player) {
	view = {
		prompt: null,
		actions: null,
		log: game.log,
		hex: game.hex,
		mode: game.mode,
	}

	if (game.state === "game_over") {
		view.prompt = game.victory
	} else if (game.active !== player) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} \u2014 ${inactive}.`
	} else {
		view.actions = {}
		view.who = game.who
		if (states[game.state])
			states[game.state].prompt(current)
		else
			view.prompt = "Unknown state: " + game.state
		if (view.actions.undo === undefined) {
			if (game.undo && game.undo.length > 0)
				view.actions.undo = 1
			else
				view.actions.undo = 0
		}
	}

	return view
}

exports.action = function (state, player, action, arg) {
	game = state
	let S = states[game.state]
	if (action in S)
		S[action](arg, player)
	else if (action === "undo" && game.undo && game.undo.length > 0)
		pop_undo()
	else
		throw new Error("Invalid action: " + action)
	return game
}

exports.resign = function (state, player) {
	game = state
	if (game.state !== 'game_over') {
		if (player === RED)
			goto_game_over(BLUE, RED + " resigned.")
		if (player === BLUE)
			goto_game_over(RED, BLUE + " resigned.")
	}
	return game
}

// === COMMON LIBRARY ===

function log(msg) {
	game.log.push(msg)
}

function clear_undo() {
	game.undo.length = 0
}

function push_undo() {
	let copy = {}
	for (let k in game) {
		let v = game[k]
		if (k === "undo")
			continue
		else if (k === "log")
			v = v.length
		else if (typeof v === "object" && v !== null)
			v = object_copy(v)
		copy[k] = v
	}
	game.undo.push(copy)
}

function pop_undo() {
	let save_log = game.log
	let save_undo = game.undo
	game = save_undo.pop()
	save_log.length = game.log
	game.log = save_log
	game.undo = save_undo
}

function random(range) {
	// An MLCG using integer arithmetic with doubles.
	// https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
	// m = 2**35 − 31
	return (game.seed = game.seed * 200105 % 34359738337) % range
}

// Fast deep copy for objects without cycles
function object_copy(original) {
	if (Array.isArray(original)) {
		let n = original.length
		let copy = new Array(n)
		for (let i = 0; i < n; ++i) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = object_copy(v)
			else
				copy[i] = v
		}
		return copy
	} else {
		let copy = {}
		for (let i in original) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = object_copy(v)
			else
				copy[i] = v
		}
		return copy
	}
}
