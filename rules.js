"use strict"

const FRENCH = "French"
const COALITION = "Coalition"

exports.roles = [ FRENCH, COALITION ]
exports.scenarios = [ "June 16-18", "June 15-18" ]

const map = require("./map")

var game = null
var view = null
var states = {}

const OPEN = 0
const TOWN = 1
const STREAM = 2

const HQ = 0
const INF = 1
const CAV = 2
const DET = 3

const first_hq = 0
const F_HQ_NAPOLEON = 0
const F_HQ_NEY = 1
const F_HQ_GROUCHY = 2
const A_HQ_WELLINGTON = 3
const P_HQ_BLUCHER = 4
const last_hq = 4

const first_french_corps = 5
const F_INF_CORPS_1 = 5
const F_INF_CORPS_2 = 6
const F_INF_CORPS_3 = 7
const F_INF_GD = 8
const F_CAV_GD = 9
const F_CAV_RES = 10
const F_INF_CORPS_4 = 11
const F_INF_CORPS_6 = 12
const last_french_corps = 12

const first_anglo_corps = 13
const A_INF_ORANGE = 13
const A_INF_WELLINGTON = 14
const A_INF_HILL_2 = 15
const A_CAV_UXBRIDGE = 16
const A_INF_HILL_1 = 17
const last_anglo_corps = 17

const first_prussian_corps = 18
const P_INF_ZIETHEN = 18
const P_INF_PIRCH = 19
const P_INF_THIELMANN = 20
const P_INF_BULOW = 21
const P_CAV_GNEISENAU = 22
const last_prussian_corps = 22
const last_corps = 22

const first_french_detachment = 23
const F_DET_1 = 23
const F_DET_2 = 24
const F_DET_GD = 25
const F_DET_RES_CAV = 26
const F_DET_GD_CAV = 27
const F_DET_BATTERY = 28
const last_french_detachment = 28

const first_anglo_detachment = 29
const A_DET_PERPONCHER = 29
const A_DET_KGL = 30
const A_DET_FREDERICK = 31
const A_DET_COLLAERT = 32
const last_anglo_detachment = 32

const first_prussian_detachment = 33
const P_DET_STEINMETZ = 33
const P_DET_PIRCH = 34
const P_DET_LUTZOW = 35
const P_DET_SOHR = 36
const P_DET_MARWITZ = 37
const P_DET_SCHWERIN = 38
const last_prussian_detachment = 38

const piece_count = 39

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

exports.setup = function (seed, scenario, options) {
	game = {
		seed,
		scenario,
		undo: [],
		log: [],
		active: FRENCH,
		pieces: new Array(piece_count).fill(0),
		flip: new Array(piece_count).fill(0),
		state: "setup",
	}

	game.pieces[F_HQ_NAPOLEON] = 1217
	game.pieces[F_INF_GD] = 1217
	game.pieces[F_HQ_GROUCHY] = 1621
	game.pieces[F_HQ_NEY] = 2218
	game.pieces[F_INF_CORPS_2] = 2218
	game.pieces[F_INF_CORPS_1] = 1617
	game.pieces[F_INF_CORPS_3] = 1721
	game.pieces[F_INF_CORPS_4] = 1221
	game.pieces[F_INF_CORPS_6] = 1117
	game.pieces[F_CAV_GD] = 2317
	game.pieces[F_CAV_RES] = 1822
	game.pieces[F_DET_1] = 1314

	game.pieces[A_HQ_WELLINGTON] = 2818
	game.flip[A_HQ_WELLINGTON] = 1 // battle mode
	game.pieces[A_INF_WELLINGTON] = 3715
	game.pieces[A_INF_ORANGE] = 3002
	game.pieces[A_INF_HILL_1] = 3
	game.pieces[A_CAV_UXBRIDGE] = 4
	game.pieces[A_DET_COLLAERT] = 1211
	game.pieces[A_DET_PERPONCHER] = 2618

	game.pieces[P_HQ_BLUCHER] = 2324
	game.pieces[P_CAV_GNEISENAU] = 2324
	game.flip[P_CAV_GNEISENAU] = 1 // battle
	game.pieces[P_INF_ZIETHEN] = 1922
	game.flip[P_INF_ZIETHEN] = 1 // battle
	game.pieces[P_INF_PIRCH] = 1928
	game.pieces[P_INF_THIELMANN] = 1737
	game.pieces[P_INF_BULOW] = 3
	game.pieces[P_DET_LUTZOW] = 1623

	return game
}

exports.view = function (state) {
	view = { ...state }
	return state
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

exports.view = function(state, player) {
	game = state

	view = { ...game, prompt: null }

	if (game.state === "game_over") {
		view.prompt = game.victory
	} else if (player !== game.active) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} \u2014 ${inactive}.`
	} else {
		view.actions = {}
		states[game.state].prompt()
		if (game.undo && game.undo.length > 0)
			view.actions.undo = 1
		else
			view.actions.undo = 0
	}

	return view;
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
