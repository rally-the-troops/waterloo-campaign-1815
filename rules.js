"use strict"

const FRENCH = "French"
const COALITION = "Coalition"

const P1 = FRENCH
const P2 = COALITION

exports.roles = [ P1, P2 ]

exports.scenarios = [ "June 16", "June 15", "June 15 (no special rules)" ]

const data = require("./data")

const { max, abs } = Math

const last_hex = 1000 + (data.map.rows - 1) * 100 + (data.map.cols - 1)

var game = null
var view = null
var states = {}

const ELIMINATED = 0
const AVAILABLE_P1 = 100
const AVAILABLE_P2 = 101

const ENTRY_A = 4006
const ENTRY_B = 4015
const ENTRY_C = 4025
const ENTRY_D1 = 1017
const ENTRY_D2 = 1018

const OFFMAP_A = 4106
const OFFMAP_B = 4115
const OFFMAP_C = 4125
const OFFMAP_D = 917

const NAPOLEON_HQ = data.pieces.findIndex(pc => pc.name === "Napoleon HQ")
const OLD_GUARD = data.pieces.findIndex(pc => pc.name === "Old Guard")
const GRAND_BATTERY = data.pieces.findIndex(pc => pc.name === "Grand Battery")
const HILL_1 = data.pieces.findIndex(pc => pc.name === "II Corps (Hill*)")
const HILL_2 = data.pieces.findIndex(pc => pc.name === "II Corps (Hill**)")

const brussels_couillet_road_x3 = []
for (let a of data.map.brussels_couillet_road) {
	set_add(brussels_couillet_road_x3, a)
	for_each_adjacent(a, (b) => {
		set_add(brussels_couillet_road_x3, b)
		for_each_adjacent(b, (c) => {
			set_add(brussels_couillet_road_x3, c)
			for_each_adjacent(c, (d) => {
				set_add(brussels_couillet_road_x3, d)
			})
		})
	})
}

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
	zoc_valid = false
	game.pieces[p] &= 1
	game.pieces[p] |= hex << 1
}

function set_piece_mode(p, mode) {
	game.pieces[p] &= ~1
	game.pieces[p] |= mode
}

function piece_hex(p) {
	return game.pieces[p] >> 1
}

function piece_mode(p) {
	return game.pieces[p] & 1
}

function piece_is_cavalry(p) {
	return data.pieces[p].type === "cav"
}

function piece_is_infantry(p) {
	return data.pieces[p].type === "inf"
}

function piece_movement_allowance(p) {
	if (piece_mode(p))
		return data.pieces[p].mp2
	return data.pieces[p].mp1
}

function piece_command_range(p) {
	if (piece_mode(p))
		return data.pieces[p].range2
	return data.pieces[p].range1
}

function pieces_are_same_side(a, b) {
	return data.pieces[a].side === data.pieces[b].side
}

function is_empty_hex(x) {
	for (let p = 0; p < data.pieces.length; ++p)
		if (piece_hex(p) === x)
			return false
	return true
}

function hex_has_any_piece(x, list) {
	for (let p of list)
		if (piece_hex(p) === x)
			return true
	return false
}

function piece_is_in_zoc_of_hex(p, x) {
	let y = piece_hex(p)
	if (is_map_hex(y) && calc_distance(x, y) === 1)
		return !is_river(x, y)
	return false
}

const data_rivers = []
const data_bridges = []
const data_road_hexsides = []

for (let [a, b] of data.map.rivers) {
	set_add(data_rivers, a * 10000 + b)
	set_add(data_rivers, b * 10000 + a)
}

for (let [a, b] of data.map.bridges) {
	set_delete(data_rivers, a * 10000 + b)
	set_delete(data_rivers, b * 10000 + a)
	set_add(data_bridges, a * 10000 + b)
	set_add(data_bridges, b * 10000 + a)
}

function is_river(a, b) {
	return set_has(data_rivers, a * 10000 + b)
}

function is_bridge(a, b) {
	return set_has(data_bridges, a * 10000 + b)
}

function is_road_hexside(a, b) {
	return set_has(data_road_hexsides, a * 10000 + b)
}

function is_stream_hex(x) {
	return set_has(data.map.streams, x)
}

const data_roads = []
for (let row = 0; row < data.map.rows; ++row) {
	for (let col = 0; col < data.map.cols; ++col) {
		let x = 1000 + row * 100 + col
		data_roads[x-1000] = []
	}
}

function make_road(id, road, i, d) {
	let list = []
	while (i >= 0 && i < road.length) {
		list.push(road[i])
		i += d
	}
	return list
}

for (let road_id = 0; road_id < data.map.roads.length; ++road_id) {
	let road = data.map.roads[road_id]
	for (let k = 0; k < road.length; ++k) {
		if (k > 0) {
			let a = road[k-1]
			let b = road[k]
			set_add(data_road_hexsides, a * 10000 + b)
			set_add(data_road_hexsides, b * 10000 + a)
		}
		data_roads[road[k]-1000].push([road_id, k])
	}
}

function is_road_hex(x) {
	return data_roads[x-1000].length > 0
}

// === ZONE OF CONTROL / INFLUENCE ===

var zoc_valid = false
var zoc_cache = new Array(data.map.rows * 100).fill(0)

// ANY_ZOC=1, CAV_ZOC=2, ANY_ZOI=4, CAV_ZOI=8

function is_p1_zoc(x) { return zoc_cache[x-1000] & (1|2) }
function is_p1_cav_zoc(x) { return zoc_cache[x-1000] & (2) }
function is_p1_zoc_or_zoi(x) { return zoc_cache[x-1000] & (1|2|4) }
function is_p1_zoc_or_cav_zoi(x) { return zoc_cache[x-1000] & (1|2|8) }

function is_p2_zoc(x) { return zoc_cache[x-1000] & (16|32) }
function is_p2_cav_zoc(x) { return zoc_cache[x-1000] & (32) }
function is_p2_zoc_or_zoi(x) { return zoc_cache[x-1000] & (16|32|64) }
function is_p2_zoc_or_cav_zoi(x) { return zoc_cache[x-1000] & (16|32|128) }

function is_friendly_zoc(x) { return game.active === P1 ? is_p1_zoc(x) : is_p2_zoc(x) }
function is_friendly_zoc_or_zoi(x) { return game.active === P1 ? is_p1_zoc_or_zoi(x) : is_p2_zoc_or_zoi(x) }

function is_enemy_zoc(x) { return game.active !== P1 ? is_p1_zoc(x) : is_p2_zoc(x) }
function is_enemy_cav_zoc(x) { return game.active !== P1 ? is_p1_cav_zoc(x) : is_p2_cav_zoc(x) }
function is_enemy_zoc_or_cav_zoi(x) { return game.active !== P1 ? is_p1_zoc_or_cav_zoi(x) : is_p2_zoc_or_cav_zoi(x) }
function is_enemy_zoc_or_zoi(x) { return game.active !== P1 ? is_p1_zoc_or_zoi(x) : is_p2_zoc_or_zoi(x) }

function update_zoc_imp(zoc, zoi, units) {
	for (let p of units) {
		let a = piece_hex(p)
		zoc_cache[a - 1000] |= zoc
		for_each_adjacent(a, b => {
			if (!is_river(a, b)) {
				zoc_cache[b - 1000] |= zoc
				if (zoi) {
					for_each_adjacent(b, c => {
						if (!is_bridge(b, c))
							zoc_cache[c - 1000] |= zoi
					})
				}
			}
		})
	}
}

function update_zoc() {
	if (!zoc_valid) {
		zoc_valid = true
		zoc_cache.fill(0)
		update_zoc_imp(1|2, 4|8, p1_cav)
		update_zoc_imp(1, 4, p1_inf)
		update_zoc_imp(1, 0, p1_det)
		update_zoc_imp(16|32, 64|128, p2_cav)
		update_zoc_imp(16, 64, p2_inf)
		update_zoc_imp(16, 0, p2_det)
	}
}

function piece_is_not_in_enemy_zoc_or_zoi(p) {
	let x = piece_hex(p)
	return is_map_hex(x) && !is_enemy_zoc_or_zoi(x)
}

function piece_is_not_in_enemy_zoc(p) {
	let x = piece_hex(p)
	return is_map_hex(x) && !is_enemy_zoc(x)
}

function piece_is_not_in_enemy_cav_zoc(p) {
	let x = piece_hex(p)
	return is_map_hex(x) && !is_enemy_cav_zoc(x)
}

function piece_is_in_enemy_zoc(p) {
	let x = piece_hex(p)
	return is_map_hex(x) && is_enemy_zoc(x)
}

function piece_is_on_map(p) {
	let x = piece_hex(p)
	return is_map_hex(x)
}

function is_map_hex(x) {
	if (x >= 1000 && x <= last_hex)
		return x % 100 <= 41
	return false
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
	let row = hex / 100 | 0
	let col = hex % 100
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

function set_next_player() {
	game.active = (game.active === P1) ? P2 : P1
}

function prompt(str) {
	view.prompt = str
}

// === SEQUENCE OF PLAY ===

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

// === === COMMAND PHASE === ===

function goto_command_phase() {
	log("Command Phase")
	log("")
	goto_hq_placement_step()
}

// === A: HQ PLACEMENT STEP ===

function goto_hq_placement_step() {
	game.active = P1
	game.state = "place_hq"
	for (let p of p1_hqs) {
		set_piece_hex(p, AVAILABLE_P1)
		set_piece_mode(p, 0)
	}
	for (let p of p2_hqs) {
		set_piece_hex(p, AVAILABLE_P2)
		set_piece_mode(p, 0)
	}
}

function end_hq_placement_step() {
	if (game.active === P1)
		game.active = P2
	else
		goto_blown_unit_return_step()
}

states.place_hq = {
	prompt() {
		prompt("HQ Placement Step.")
		let done = true
		for (let p of friendly_hqs()) {
			gen_action_piece(p)
			if (!piece_is_on_map(p))
				done = false
		}
		if (done)
			view.actions.next = 1
	},
	piece(p) {
		if (piece_is_on_map(p)) {
			set_piece_mode(p, 1 - piece_mode(p))
		} else {
			push_undo()
			game.who = p
			game.state = "place_hq_where"
		}
	},
	next() {
		end_hq_placement_step()
	},
}

function gen_place_hq(from, here, n) {
	for_each_adjacent(here, next => {
		if (calc_distance(next, from) <= calc_distance(here, from))
			return
		if (n > 1)
			gen_place_hq(from, next, n - 1)
		// TODO RULES: as the crow flies or must trace path?
		if (is_enemy_zoc_or_zoi(next) || hex_has_any_piece(next, friendly_hqs()))
			return
		gen_action_hex(next)
	})
}

states.place_hq_where = {
	prompt() {
		prompt("HQ Placement Step.")
		gen_action_piece(game.who)
		view.actions.normal = piece_mode(game.who) ? 1 : 0
		view.actions.battle = piece_mode(game.who) ? 0 : 1

		update_zoc()

		// within 3 of any unit
		for (let p of friendly_units()) {
			let x = piece_hex(p)
			if (is_map_hex(x) && pieces_are_same_side(p, game.who)) {
				if (!is_enemy_zoc_or_zoi(x) && !hex_has_any_piece(x, friendly_hqs()))
					gen_action_hex(x)
				gen_place_hq(x, x, 3)
			}
		}

		// if not possible, within 3 of a brussels to couillet road hex
		if (!view.actions.hex) {
			for (let x of brussels_couillet_road_x3) {
				if (is_empty_hex(x))
					gen_action_hex(x)
			}
		}
	},
	piece(p) {
		pop_undo()
	},
	hex(x) {
		set_piece_hex(game.who, x)
		game.who = -1
		game.state = "place_hq"
	},
}

// === B: BLOWN UNIT RETURN STEP ===

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

states.blown_unit_return_step = {
	prompt() {
		prompt("Blown Unit Return Step.")
		view.actions.next = 1
	},
	next() {
		end_blown_unit_return_step()
	},
}

// === C: CAVALRY CORPS RECOVERY STEP ===

// TODO: automated?

function goto_cavalry_corps_recovery_step() {
	game.active = P1
	game.state = "cavalry_corps_recovery_step"
	resume_cavalry_corps_recovery_step()
}

function resume_cavalry_corps_recovery_step() {
	update_zoc()
	for (let p of friendly_cavalry_corps())
		if (piece_mode(p) && piece_is_not_in_enemy_zoc_or_zoi(p))
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

states.cavalry_corps_recovery_step = {
	prompt() {
		prompt("Cavalry Corps Recovery Step.")
		for (let p of friendly_cavalry_corps())
			if (piece_mode(p) && piece_is_not_in_enemy_zoc_or_zoi(p))
				gen_action_piece(p)
	},
	piece(p) {
		set_piece_mode(p, 0)
		resume_cavalry_corps_recovery_step()
	},
}

// === D: DETACHMENT PLACEMENT STEP ===

function goto_detachment_placement_step() {
	game.active = P1
	begin_detachment_placement_step()
}

function begin_detachment_placement_step() {
	game.count = 0
	for (let p of friendly_hqs())
		game.count |= (1 << p)
	resume_detachment_placement_step()
}

function resume_detachment_placement_step() {
	game.state = "place_detachment_hq"
	// TODO: no available detachments
	if (game.count === 0)
		end_detachment_placement_step()
}

function end_detachment_placement_step() {
	if (game.active === P1) {
		game.active = P2
		begin_detachment_placement_step()
	} else {
		goto_detachment_recall_step()
	}
}

states.place_detachment_hq = {
	prompt() {
		prompt("Place Detachment: Select HQ.")
		for (let p of friendly_hqs())
			if (game.count & (1 << p))
				gen_action_piece(p)
		view.actions.pass = 1
	},
	piece(p) {
		push_undo()
		game.target = p
		game.count ^= (1 << p)
		game.state = "place_detachment_who"
	},
	pass() {
		end_detachment_placement_step()
	},
}

states.place_detachment_who = {
	prompt() {
		prompt("Place Detachment: Select detachment to place.")
		gen_action_piece(game.target)
		for (let p of friendly_detachments()) {
			let x = piece_hex(p)
			if (x === AVAILABLE_P1 || x === AVAILABLE_P2) {
				if (pieces_are_same_side(p, game.target)) {
					// SPECIAL: french grand battery and old guard
					if (p === GRAND_BATTERY || p === OLD_GUARD) {
						if (game.target === NAPOLEON_HQ && piece_mode(NAPOLEON_HQ))
							gen_action_piece(p)
					} else {
						gen_action_piece(p)
					}
				}
			}
		}
	},
	piece(p) {
		if (p === game.target) {
			pop_undo()
			return
		}
		game.who = p
		game.state = "place_detachment_where"
	},
	next() {
		end_detachment_placement_step()
	},
}

states.place_detachment_where = {
	prompt() {
		prompt("Place Detachment: ...")
		gen_action_piece(game.who)

		if (game.who === GRAND_BATTERY) {
			return
		}

		if (game.who === OLD_GUARD) {
			return
		}

		update_zoc()
		move_seen.fill(0)

		search_detachment(piece_hex(game.target), piece_command_range(game.target))
		if (!piece_mode(game.target))
			search_detachment_road(piece_hex(game.target), piece_command_range(game.target) * 2)

		for (let p of data.pieces[game.who].parent)
			if (piece_is_on_map(p))
				search_detachment(piece_hex(p), 4)

		for (let row = 0; row < data.map.rows; ++row) {
			for (let col = 0; col < data.map.cols; ++col) {
				let x = 1000 + row * 100 + col
				if (
					move_seen[x-1000] &&
					!is_friendly_zoc_or_zoi(x) &&
					!hex_has_any_piece(x, friendly_detachments())
				)
					gen_action_hex(x)
			}
		}
	},
	piece(p) {
		game.who = -1
		game.state = "place_detachment_who"
	},
	hex(x) {
		set_piece_hex(game.who, x)
		game.target = -1
		game.who = -1
		resume_detachment_placement_step()
	},
	next() {
		end_detachment_placement_step()
	},
}

// === E: DETACHMENT RECALL STEP ===

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

states.detachment_recall_step = {
	prompt() {
		prompt("Detachment Recall Step.")

		for (let p of friendly_detachments())
			if (piece_is_on_map(p))
				gen_action_piece(p)

		view.actions.pass = 1
	},
	piece(p) {
		push_undo()
		if (game.active === P1)
			set_piece_hex(p, AVAILABLE_P1)
		else
			set_piece_hex(p, AVAILABLE_P2)
	},
	pass() {
		end_detachment_recall_step()
	},
}

function goto_british_line_of_communication_angst() {
	game.active = P2
	game.state = "british_line_of_communication_angst_1"
	// TODO
	goto_advance_formation()
}

states.british_line_of_communication_angst_1 = {
	prompt() {
		prompt("British Line of Communication Angst.")
		gen_action_piece(HILL_1)
	},
	piece(p) {
		set_piece_hex(HILL_2, piece_hex(HILL_1))
		set_piece_mode(HILL_2, piece_mode(HILL_1))
		set_piece_hex(HILL_1, 0)
		set_piece_mode(HILL_1, 0)
		goto_advance_formation()
	},
}

states.british_line_of_communication_angst_2 = {
	prompt() {
		prompt("British Line of Communication Angst.")
		gen_action_piece(HILL_2)
	},
	piece(p) {
		set_piece_hex(HILL_1, piece_hex(HILL_2))
		set_piece_mode(HILL_1, piece_mode(HILL_2))
		set_piece_hex(HILL_2, 0)
		set_piece_mode(HILL_2, 0)
		goto_advance_formation()
	},
}

// === === ORGANIZATION PHASE === ===

// === F: ADVANCE FORMATION ===
// === G: BATTLE FORMATION ===

// TODO: automated?

function goto_advance_formation() {
	game.active = P1
	resume_advance_formation()
}

function resume_advance_formation() {
	game.state = "advance_formation"
	update_zoc()
	for (let p of friendly_infantry_corps())
		if (piece_mode(p) && piece_is_not_in_enemy_zoc(p))
			return
	resume_battle_formation()
}

function resume_battle_formation() {
	game.state = "battle_formation"
	update_zoc()
	for (let p of friendly_infantry_corps())
		if (!piece_mode(p) && piece_is_in_enemy_zoc(p))
			return
	end_battle_formation()
}

function end_battle_formation() {
	if (game.active === P1) {
		game.active = P2
		resume_advance_formation()
	} else {
		goto_withdrawal()
	}
}

states.advance_formation = {
	prompt() {
		prompt("Advance Formation.")
		update_zoc()
		for (let p of friendly_infantry_corps())
			if (!piece_mode(p) && piece_is_not_in_enemy_zoc(p))
				gen_action_piece(p)
	},
	piece(p) {
		set_piece_mode(p, 0)
		resume_advance_formation()
	},
}

states.battle_formation = {
	prompt() {
		prompt("Battle Formation.")
		update_zoc()
		for (let p of friendly_infantry_corps())
			if (piece_mode(p) && piece_is_in_enemy_zoc(p))
				gen_action_piece(p)
	},
	piece(p) {
		set_piece_mode(p, 0)
		resume_battle_formation()
	},
}

// === H: WITHDRAWAL ===

function goto_withdrawal() {
	game.active = P1
	game.state = "withdrawal"
	game.remain = 0
}

/*
function resume_withdrawal() {
	game.state = "withdrawal"
	update_zoc()
	for (let p of friendly_corps())
		if (piece_is_in_enemy_zoc(p))
			return
	withdrawal_pass()
}
*/

function next_withdrawal() {
	game.state = "withdrawal"
	if (game.remain === 0)
		set_next_player()
	else if (--game.remain === 0)
		end_withdrawal()
}

function end_withdrawal() {
	goto_movement_phase()
}

states.withdrawal = {
	prompt() {
		prompt("Withdrawal.")

		update_zoc()

		for (let p of friendly_corps())
			if (piece_is_in_enemy_zoc(p))
				gen_action_piece(p)

		view.actions.pass = 1
	},
	piece(p) {
		push_undo()
		game.who = p
		game.state = "withdrawal_to"
	},
	pass() {
		clear_undo()
		if (game.remain > 0) {
			end_withdrawal()
		} else {
			set_next_player()
			game.remain = 3
		}
	},
}

function blow_unit(p, n) {
	log("Blown unit " + p)
	set_piece_hex(p, game.turn + n)
	set_piece_mode(p, 0)
}

states.withdrawal_to = {
	prompt() {
		prompt("Withdrawal to.")

		update_zoc()

		let list = search_withdrawal(piece_hex(game.who))
		if (list.length > 0)
			view.actions.hex = list
		else
			view.actions.blow = 1

		gen_action_piece(game.who)
	},
	piece(p) {
		pop_undo()
	},
	blow() {
		blow_unit(game.who, 2)
		game.who = -1
		next_withdrawal()
	},
	hex(x) {
		set_piece_hex(game.who, x)
		game.who = -1
		next_withdrawal()
	},
}

// === === MOVEMENT PHASE === ===

function goto_movement_phase() {
	log("")
	log("Movement Phase")
	log("")
	game.active = P1
	game.state = "movement"
	game.remain = 0
}

function next_movement() {
	game.state = "movement"
	if (game.remain === 0)
		set_next_player()
	else if (--game.remain === 0)
		end_movement()
}

function end_movement() {
	goto_attack_phase()
}

states.movement = {
	prompt() {
		prompt("Movement.")

		update_zoc()

		for (let p of friendly_cavalry_corps())
			if (piece_is_not_in_enemy_cav_zoc(p))
				gen_action_piece(p)

		for (let p of friendly_infantry_corps())
			if (piece_is_not_in_enemy_zoc(p))
				gen_action_piece(p)

		view.actions.pass = 1
	},
	piece(p) {
		push_undo()
		game.who = p
		game.state = "movement_to"
	},
	pass() {
		clear_undo()
		if (game.remain > 0) {
			end_movement()
		} else {
			set_next_player()
			game.remain = roll_die()
		}
	},
}

states.movement_to = {
	prompt() {
		prompt("Move " + data.pieces[game.who].name + ".")

		update_zoc()
		search_move(game.who)

		for (let row = 0; row < data.map.rows; ++row) {
			for (let col = 0; col < data.map.cols; ++col) {
				let x = 1000 + row * 100 + col
				let m = move_seen[x-1000]
				if (m & 1) {
					if (m & 2)
						gen_action_hex(x)
					else
						gen_action_stop_hex(x)
				}
			}
		}

		gen_action_piece(game.who)
	},
	piece(p) {
		pop_undo()
	},
	stop_hex(x) {
		this.hex(x)
	},
	hex(x) {
		update_zoc()
		search_move(game.who)

		set_piece_hex(game.who, x)

		// must flip (stream without road, or enter zoc)
		if (!(move_seen[x-1000] & 2))
			set_piece_mode(game.who, 1)

		// flip all enemy inf in zoc
		for (let p of enemy_infantry_corps())
			if (piece_is_in_zoc_of_hex(p, x))
				set_piece_mode(p, 1)

		game.who = -1
		//game.state = "movement"
		next_movement()
	},
}

function can_move_into(here, next, hq_hex, hq_range, is_cav) {
	// can't go off-map
	if (!is_map_hex(next))
		return false

	// must stay within command hq's range or move closer
	let here_dist = calc_distance(here, hq_hex)
	let next_dist = calc_distance(next, hq_hex)
	if (here_dist > hq_range) {
		if (next_dist >= here_dist)
			return false
	} else {
		if (next_dist > hq_range)
			return false
	}

	// can't cross river
	if (is_river(here, next))
		return false

	// can't enter hex with another corps
	if (hex_has_any_piece(next, p1_corps))
		return false
	if (hex_has_any_piece(next, p2_corps))
		return false

	// can't enter hex with enemy detachment
	if (hex_has_any_piece(next, enemy_detachments()))
		return false

	if (is_cav) {
		// Cavalry beginning move in Infantry ZoC may only move to empty hex not in ZoC
		// TODO: starting in detachment zoc?
		if (is_enemy_zoc(here) && (is_enemy_zoc(next) || !is_empty_hex(next)))
			return false
	}

	return true
}

function must_stop_zoc_zoi(here, next, is_cav) {
	if (is_cav && is_enemy_zoc_or_cav_zoi(next))
		return true
	if (!is_cav && is_enemy_zoc_or_zoi(next))
		return true
	return false
}

function must_stop_stream(here, next) {
	if (is_stream_hex(next) && !is_road_hexside(here, next))
		return true
	return false
}

function must_flip_zoc(here, next, is_cav) {
	if (!is_cav && is_enemy_zoc(next))
		return true
	return false
}

const move_seen = new Array(last_hex - 999).fill(0)
const move_cost = new Array(last_hex - 999).fill(0)

function search_move(p) {
	move_seen.fill(0)
	let x = piece_hex(p)
	let m = piece_movement_allowance(p)
	for (let hq of data.pieces[p].hq) {
		let hq_hex = piece_hex(hq)
		if (is_map_hex(hq_hex)) {
			search_move_offroad(x, m, hq_hex, piece_command_range(hq), piece_is_cavalry(p))
			if (!(piece_is_infantry(game.who) && piece_mode(game.who)))
				if (is_road_hex(x))
					search_move_road(x, m * 2, hq_hex, piece_command_range(hq), piece_is_cavalry(p))
		}
	}
}

function can_trace_detachment(here, next) {
	if (is_enemy_zoc_or_zoi(next))
		return false
	// TODO RULES - rivers block detachment placement?
	if (is_river(here, next))
		return false
	return true
}

function search_detachment(start, range) {
	move_cost.fill(0)
	move_cost[start-1000] = range
	move_seen[start-1000] = 1
	let queue = [ start ]
	while (queue.length > 0) {
		let here = queue.shift()
		for_each_adjacent(here, next => {
			if (can_trace_detachment(here, next)) {
				let range = move_cost[here-1000] - 1
				move_seen[next-1000] = 1
				if (range > move_cost[next-1000]) {
					move_cost[next-1000] = range
					queue.push(next)
				}
			}
		})
	}
}

function search_detachment_road(start, range) {
	// TODO
}

function search_move_offroad(start, ma, hq_hex, hq_range, is_cav) {
	move_cost.fill(0)
	move_cost[start-1000] = ma
	let queue = [ start ]
	while (queue.length > 0) {
		let here = queue.shift()
		for_each_adjacent(here, next => {
			if (can_move_into(here, next, hq_hex, hq_range, is_cav)) {
				let mp = move_cost[here-1000] - 1
				move_seen[next-1000] |= 1
				if (!must_stop_stream(here, next) && !must_flip_zoc(here, next, is_cav))
					move_seen[next-1000] |= 2
				else
					mp = 0
				if (must_stop_zoc_zoi(here, next, is_cav))
					mp = 0
				if (mp > move_cost[next-1000]) {
					move_cost[next-1000] = mp
					queue.push(next)
				}
			}
		})
	}
}

function search_move_road(start, ma, hq_hex, hq_range, is_cav) {
	move_cost.fill(0)
	move_cost[start-1000] = ma
	let queue = [ start ]
	while (queue.length > 0) {
		let here = queue.shift()
		let mp = move_cost[here-1000]
		// console.log("MOVE", here, mp)
		for (let [road_id, k] of data_roads[here-1000]) {
			let road = data.map.roads[road_id]
			if (k + 1 < road.length)
				search_move_road_segment(queue, road, k, 1, hq_hex, hq_range, is_cav)
			if (k > 0)
				search_move_road_segment(queue, road, k, -1, hq_hex, hq_range, is_cav)
		}
	}
}

function search_move_road_segment(queue, road, cur, dir, hq_hex, hq_range, is_cav) {
	let here = road[cur]
	let mp = move_cost[here-1000]
	cur += dir
	while (mp > 0 && cur >= 0 && cur < road.length) {
		let next = road[cur]
		if (!can_move_into(here, next, hq_hex, hq_range, is_cav))
			break
		move_seen[next-1000] |= 1
		if (!must_flip_zoc(here, next, is_cav))
			move_seen[next-1000] |= 2
		if (must_stop_zoc_zoi(here, next, is_cav))
			return
		here = next
		cur += dir
		mp --
	}
	if (mp > move_cost[here-1000]) {
		move_cost[here-1000] = mp
		queue.push(here)
	}
}

function search_withdrawal(here) {
	// Withdraw from ANY enemy unit.
	let result = []
	for_each_adjacent(here, from => {
		if (hex_has_any_piece(from, enemy_units()))
			search_retreat(result, here, from, 3)
	})
	return result
}

function search_retreat(result, here, from, n) {
	for_each_adjacent(here, next => {
		// must move further away
		if (calc_distance(next, from) <= calc_distance(here, from))
			return

		// can't enter zoc
		if (is_enemy_zoc(next))
			return

		// can't enter hex with another corps or enemy detachment
		if (hex_has_any_piece(next, p1_corps))
			return
		if (hex_has_any_piece(next, p2_corps))
			return
		if (hex_has_any_piece(next, enemy_detachments()))
			return

		// can't cross river
		if (is_river(here, next))
			return

		if (n > 1)
			search_retreat(result, next, from, n - 1)
		else
			set_add(result, next)
	})
}

// === === ATTACK PHASE === ===

function goto_attack_phase() {
	log("")
	log("Attack Phase")
	log("")
	game.active = P1
	game.state = "attack"
	game.remain = 0
}

states.attack = {
	prompt() {
		prompt("Attack!")
		update_zoc()
		for (let p of friendly_corps())
			if (piece_is_in_enemy_zoc(p))
				gen_action_piece(p)
		view.actions.pass = 1
	},
	piece(p) {
		push_undo()
		game.who = p
		game.state = "attack_who"
	},
	pass() {
	},
}

states.attack_who = {
	prompt() {
		prompt("Attack!")
		let here = piece_hex(game.who)
		for (let p of enemy_units())
			if (piece_is_in_zoc_of_hex(p, here))
				gen_action_piece(p)
		gen_action_piece(game.who)
	},
	piece(p) {
		if (p === game.who) {
			pop_undo()
			return
		}
		log("Attacked " + p)
		game.target = p
		game.state = "attack_support"
		game.count = 0
	},
}

states.attack_support = {
	prompt() {
		prompt("Attack - add supporting stars!")
		view.actions.next = 1
	},
	piece(p) {
	},
	next() {
		game.state = "defend_support"
	},
}

states.defend_support = {
	prompt() {
		prompt("Defend - add supporting stars!")
		view.actions.next = 1
	},
	piece(p) {
	},
	next() {
		roll_attack()
	},
}

function roll_attack() {
}

// add stars
// _may_ spend fresh cav to add support from stars

// === SETUP ===

function setup_piece(side, name, hex, mode = 0) {
	let id = data.pieces.findIndex(pc => pc.side === side && pc.name === name)
	if (id < 0)
		throw new Error("INVALID PIECE NAME: " + name)
	set_piece_hex(id, hex)
	set_piece_mode(id, mode)
}

function setup_june_15() {
	game.turn = 1

	setup_piece("French", "Napoleon HQ", 1017)
	setup_piece("French", "II Corps (Reille)", 1)
	setup_piece("French", "I Corps (d'Erlon)", 1)
	setup_piece("French", "III Corps (Vandamme)", 1)
	setup_piece("French", "VI Corps (Lobau)", 1)
	setup_piece("French", "Guard Corps (Drouot)", 1)
	setup_piece("French", "Guard Cav Corps (Guyot)", 1)
	setup_piece("French", "Res Cav Corps (Grouchy)", 1)
	setup_piece("French", "IV Corps (Gerard)", 1)
	setup_piece("French", "Grouchy HQ", 2)
	setup_piece("French", "Ney HQ", 2)

	setup_piece("Anglo", "Wellington HQ", 3715)
	setup_piece("Anglo", "Reserve Corps (Wellington)", 3715)
	setup_piece("Anglo", "I Corps (Orange)", 3002)
	setup_piece("Anglo", "II Corps (Hill*)", 3)
	setup_piece("Anglo", "Cav Corps (Uxbridge)", 4)
	setup_piece("Anglo", "Cav Detachment (Collaert)", 1211)
	setup_piece("Anglo", "I Detachment (Perponcher)", 2618)

	setup_piece("Prussian", "Blucher HQ", 1737)
	setup_piece("Prussian", "Cav Corps (Gneisenau)", 1737)
	setup_piece("Prussian", "I Corps (Ziethen)", 1716)
	setup_piece("Prussian", "II Corps (Pirch)", 2840)
	setup_piece("Prussian", "III Corps (Thielmann)", 1340)
	setup_piece("Prussian", "IV Corps (Bulow)", 3)
	setup_piece("Prussian", "I Detachment (Steinmetz)", 1215)
	setup_piece("Prussian", "I Detachment (Pirch)", 1217)
	setup_piece("Prussian", "I Detachment (Lutzow)", 1221)

	goto_movement_phase()
}

function setup_june_16() {
	game.turn = 3

	setup_piece("French", "Napoleon HQ", 1217)
	setup_piece("French", "Guard Corps (Drouot)", 1217)
	setup_piece("French", "Grouchy HQ", 1621)
	setup_piece("French", "Ney HQ", 2218)
	setup_piece("French", "II Corps (Reille)", 2218)
	setup_piece("French", "I Corps (d'Erlon)", 1617)
	setup_piece("French", "III Corps (Vandamme)", 1721)
	setup_piece("French", "IV Corps (Gerard)", 1221)
	setup_piece("French", "VI Corps (Lobau)", 1117)
	setup_piece("French", "Guard Cav Corps (Guyot)", 2317)
	setup_piece("French", "Res Cav Corps (Grouchy)", 1822)
	setup_piece("French", "I Detachment (Jacquinot)", 1314)

	setup_piece("Anglo", "Wellington HQ", 2818, 1)
	setup_piece("Anglo", "Reserve Corps (Wellington)", 3715)
	setup_piece("Anglo", "I Corps (Orange)", 3002)
	setup_piece("Anglo", "II Corps (Hill*)", 3)
	setup_piece("Anglo", "Cav Corps (Uxbridge)", 4)
	setup_piece("Anglo", "Cav Detachment (Collaert)", 1211)
	setup_piece("Anglo", "I Detachment (Perponcher)", 2618)

	setup_piece("Prussian", "Blucher HQ", 2324, 1)
	setup_piece("Prussian", "Cav Corps (Gneisenau)", 2324)
	setup_piece("Prussian", "I Corps (Ziethen)", 1922, 1)
	setup_piece("Prussian", "II Corps (Pirch)", 1928)
	setup_piece("Prussian", "III Corps (Thielmann)", 1737)
	setup_piece("Prussian", "IV Corps (Bulow)", 3)
	setup_piece("Prussian", "I Detachment (Lutzow)", 1623)

	goto_detachment_placement_step()
}

exports.setup = function (seed, scenario, options) {
	game = {
		seed,
		log: [],
		undo: [],
		active: P1,
		state: null,
		turn: 3,
		remain: 0,
		pieces: new Array(data.pieces.length).fill(0),
		who: -1,
		target: -1,
		count: 0,
	}

	for (let p of p1_det)
		set_piece_hex(p, AVAILABLE_P1)
	for (let p of p2_det)
		set_piece_hex(p, AVAILABLE_P2)

	if (scenario === "June 15" || scenario === "June 15 (no special rules)")
		setup_june_15()
	else
		setup_june_16()

	return game
}

// === COMMON ===

function gen_action(action, what) {
	if (!(action in view.actions))
		view.actions[action] = []
	set_add(view.actions[action], what)
}

function gen_action_piece(piece) {
	gen_action("piece", piece)
}

function gen_action_hex(hex) {
	gen_action("hex", hex)
}

function gen_action_stop_hex(hex) {
	gen_action("stop_hex", hex)
}

exports.view = function (state, player) {
	game = state

	view = {
		prompt: null,
		actions: null,
		log: game.log,
		turn: game.turn,
		remain: game.remain,
		pieces: game.pieces,
		who: game.who,
		target: game.target,
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
			states[game.state].prompt()
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
	zoc_valid = false
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

function roll_die() {
	return random(6) + 1
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

// Array remove and insert (faster than splice)

function array_remove(array, index) {
	let n = array.length
	for (let i = index + 1; i < n; ++i)
		array[i - 1] = array[i]
	array.length = n - 1
}

function array_insert(array, index, item) {
	for (let i = array.length; i > index; --i)
		array[i] = array[i - 1]
	array[index] = item
}

// Set as plain sorted array

function set_has(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return true
	}
	return false
}

function set_add(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return
	}
	array_insert(set, a, item)
}

function set_delete(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else {
			array_remove(set, m)
			return
		}
	}
}
