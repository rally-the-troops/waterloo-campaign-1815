"use strict"

const FRENCH = "French"
const COALITION = "Coalition"

exports.roles = [ FRENCH, COALITION ]
exports.scenarios = [ "June 16-18", "June 15-18" ]

const data = require("./data")

var game = null
var view = null
var states = {}

const OPEN = 0
const TOWN = 1
const STREAM = 2

const DET_OLD_GUARD = 25
const DET_GRAND_BATTERY = 28

const first_hq = 0
const last_hq = 4
const first_french_corps = 5
const last_french_corps = 12
const first_anglo_corps = 13
const last_anglo_corps = 17
const first_prussian_corps = 18
const last_prussian_corps = 22
const last_corps = 22
const first_french_detachment = 23
const last_french_detachment = 28
const first_anglo_detachment = 29
const last_anglo_detachment = 32
const first_prussian_detachment = 33
const last_prussian_detachment = 38
const piece_count = data.pieces.length

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

function setup_piece(side, name, hex, flip = 0) {
	let id = data.pieces.findIndex(pc => pc.side === side && pc.name === name)
	if (id < 0)
		throw new Error("INVALID PIECE NAME: " + name)
	game.pieces[id] = hex
	game.flip[id] = flip
}

exports.setup = function (seed, scenario, options) {
	game = {
		seed,
		scenario,
		undo: [],
		log: [],
		active: FRENCH,
		turn: 3,
		pieces: new Array(piece_count).fill(0),
		flip: new Array(piece_count).fill(0),
		remain: 0,
		state: "setup",
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

	return game
}

// === COMMON ===

exports.view = function (state, player) {
	view = {
		prompt: null,
		actions: null,
		log: game.log,
		pieces: game.pieces,
		flip: game.flip,
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
