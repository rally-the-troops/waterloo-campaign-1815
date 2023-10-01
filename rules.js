"use strict"

const P1 = "French"
const P2 = "Coalition"

var game = null
var view = null
var states = {}

exports.roles = [ P1, P2 ]

exports.scenarios = [ "June 16", "June 15" ]

const data = require("./data")

const TURN_NAME = [
	"June 15 A.M.",
	"June 15 P.M.",
	"June 16 A.M.",
	"June 16 P.M.",
	"June 17 A.M.",
	"June 17 P.M.",
	"June 18 A.M.",
	"June 18 P.M.",
]

const last_hex = 1000 + (data.map.rows - 1) * 100 + (data.map.cols - 1)

const p1_forbidden = data.map.forbidden[0]
const p2_forbidden = data.map.forbidden[1]

var move_seen = new Array(last_hex - 999).fill(0)
var move_cost = new Array(last_hex - 999).fill(0)
var move_flip = new Array(last_hex - 999).fill(0)
var move_from = []
var move_from_road = []

const ELIMINATED = 0
const REINFORCEMENTS = 100
const AVAILABLE_P1 = 101
const AVAILABLE_P2 = 102
const BLOWN = 103
const SWAPPED = 200

function find_piece(name) {
	let id = data.pieces.findIndex(pc => pc.name === name)
	if (id < 0)
		throw new Error("PIECE NOT FOUND: " + name)
	return id
}

for (let info of data.reinforcements)
	info.list = info.list.map(name => find_piece(name))

const NAPOLEON_HQ = find_piece("Napoléon HQ")
const OLD_GUARD = find_piece("Old Guard")
const GRAND_BATTERY = find_piece("Grand Battery")
const HILL_1 = find_piece("II Corps (Hill*)")
const HILL_2 = find_piece("II Corps (Hill**)")
const IMPERIAL_GUARD = find_piece("Guard Corps (Drouot)")
const IMPERIAL_GUARD_CAV = find_piece("Guard Cav Corps (Guyot)")
const ZIETHEN = find_piece("I Corps (Ziethen)")

function is_map_hex(x) {
	if (x >= 1000 && x <= 4041)
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
	return Math.max(Math.abs(bx-ax), Math.abs(by-ay), Math.abs(bz-az))
}

const adjacent_x1 = [
	[-101,-100,-1,1,99,100],
	[-100,-99,-1,1,100,101]
]

const within_x3 = [
	[
		-302,-301,-300,-299,
		-202,-201,-200,-199,-198,
		-103,-102,-101,-100,-99,-98,
		-3,-2,-1,0,1,2,3,
		97,98,99,100,101,102,
		198,199,200,201,202,
		298,299,300,301
	],
	[
		-301,-300,-299,-298,
		-202,-201,-200,-199,-198,
		-102,-101,-100,-99,-98,-97,
		-3,-2,-1,0,1,2,3,
		98,99,100,101,102,103,
		198,199,200,201,202,
		299,300,301,302
	]
]

function for_each_adjacent(x, f) {
	for (let dx of adjacent_x1[x / 100 & 1]) {
		let nx = x + dx
		if (is_map_hex(nx))
			f(nx)
	}
}

function for_each_within_x3(x, f) {
	for (let dx of within_x3[x / 100 & 1]) {
		let nx = x + dx
		if (is_map_hex(nx))
			f(nx)
	}
}

const brussels_couillet_road_x3 = []
for (let a of data.map.brussels_couillet_road)
	for_each_within_x3(a, b => set_add(brussels_couillet_road_x3, b))

const data_rivers = []
const data_bridges = []
const data_road_hexsides = []
const data_roads = []

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

for (let row = 0; row < data.map.rows; ++row) {
	for (let col = 0; col < data.map.cols; ++col) {
		let x = 1000 + row * 100 + col
		data_roads[x-1000] = []
	}
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

const all_hqs = make_piece_list(p => (p.type === "hq"))
const all_units = make_piece_list(p => (p.type === "inf" || p.type === "cav" || p.type === "det"))
const all_corps = make_piece_list(p => (p.type === "inf" || p.type === "cav"))

const anglo_det = make_piece_list(p => p.side === "Anglo" && p.type === "det")
const prussian_cav = make_piece_list(p => p.side === "Prussian" && p.type === "cav")
const prussian_inf = make_piece_list(p => p.side === "Prussian" && p.type === "inf")

function friendly_hqs() { return (game.active === P1) ? p1_hqs : p2_hqs }
function enemy_hqs() { return (game.active !== P1) ? p1_hqs : p2_hqs }
function friendly_cavalry_corps() { return (game.active === P1) ? p1_cav : p2_cav }
function enemy_cavalry_corps() { return (game.active !== P1) ? p1_cav : p2_cav }
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

function piece_name(p) {
	return data.pieces[p].name
}

function piece_is_cavalry(p) {
	return data.pieces[p].type === "cav"
}

function piece_is_infantry(p) {
	return data.pieces[p].type === "inf"
}

function piece_is_detachment(p) {
	return data.pieces[p].type === "det"
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

function pieces_are_associated(a, b) {
	return data.pieces[a].side === data.pieces[b].side
}

function piece_stars(p) {
	if (data.pieces[p].type === "hq" && !piece_mode(p))
		return 0
	if (data.pieces[p].type === "cav" && piece_mode(p))
		return 0
	return data.pieces[p].stars
}

function is_adjacent(a, b) {
	return is_map_hex(a) && is_map_hex(b) && calc_distance(a, b) === 1 && !is_river(a, b)
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

function is_forbidden_hex(x) {
	if (game.active === P1)
		return set_has(p1_forbidden, x)
	return set_has(p2_forbidden, x)
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

function is_town_hex(x) {
	return set_has(data.map.towns, x)
}

function is_stream_hex(x) {
	return set_has(data.map.streams, x)
}

function is_road_hex(x) {
	return data_roads[x-1000].length > 0
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

function set_next_player() {
	game.active = (game.active === P1) ? P2 : P1
}

function blow_unit(p, n) {
	if (piece_is_on_map(p)) {
		if (game.turn + n > 8) {
			log("P" + p + " eliminated.")
			set_piece_hex(p, ELIMINATED)
		} else {
			log("P" + p + " blown.")
			set_piece_hex(p, BLOWN + game.turn + n)
			set_piece_mode(p, 0)
		}
	}
}

function eliminate_unit(p) {
	if (piece_is_on_map(p)) {
		log("P" + p + " eliminated.")
		set_piece_hex(p, ELIMINATED)
	}
}

function eliminate_detachments_stacked_with_corps(c) {
	let x = piece_hex(c)
	for (let p of friendly_detachments())
		if (piece_hex(p) === x)
			eliminate_unit(p)
}

function recall_grand_battery_alone() {
	if (game.active === P1) {
		let x = piece_hex(GRAND_BATTERY)
		if (is_map_hex(x) && !hex_has_any_piece(x, friendly_corps()))
			recall_detachment(GRAND_BATTERY)
	}
}

function recall_detachment(p) {
	log("P" + p + " recalled from " + piece_hex(p) + ".")
	if (set_has(p1_det, p))
		set_piece_hex(p, AVAILABLE_P1)
	else
		set_piece_hex(p, AVAILABLE_P2)
}

function prompt(str) {
	view.prompt = str
}

// === ZONE OF CONTROL / INFLUENCE ===

// ANY_ZOC=1, CAV_ZOC=2, ANY_ZOI=4, CAV_ZOI=8

var zoc_valid = false
var zoc_cache = new Array(data.map.rows * 100).fill(0)

function is_p1_zoc(x) { update_zoc(); return zoc_cache[x-1000] & (1|2) }
function is_p1_cav_zoc(x) { update_zoc(); return zoc_cache[x-1000] & (2) }
function is_p1_zoc_or_zoi(x) { update_zoc(); return zoc_cache[x-1000] & (1|2|4) }
function is_p1_zoc_or_cav_zoi(x) { update_zoc(); return zoc_cache[x-1000] & (1|2|8) }

function is_p2_zoc(x) { update_zoc(); return zoc_cache[x-1000] & (16|32) }
function is_p2_cav_zoc(x) { update_zoc(); return zoc_cache[x-1000] & (32) }
function is_p2_zoc_or_zoi(x) { update_zoc(); return zoc_cache[x-1000] & (16|32|64) }
function is_p2_zoc_or_cav_zoi(x) { update_zoc(); return zoc_cache[x-1000] & (16|32|128) }

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

// === COMMAND PHASE ===

function count_french_reinforcements() {
	let n = 0
	for (let p of p1_corps)
		if (piece_hex(p) === REINFORCEMENTS)
			++n
	return n
}

function init_turn() {
	let die

	log_h1("Turn " + game.turn + " \u2013 " + TURN_NAME[game.turn-1])

	bring_on_reinforcements()

	if (game.rain > 0)
		game.rain--

	if (game.turn === 1) {
		log("Surprise:\nOnly P" + ZIETHEN + " can move.")
	}

	if (game.turn === 2) {
		log("Delayed Reaction:\nAnglo-Allied units cannot move.")
		die = roll_die()
		log("Concentrating the Army:\nD" + die + " Prussian moves.")
		game.prussian_moves = die
	}

	if (game.turn <= 2) {
		let n = 3
		if (game.turn === 2)
			n = count_french_reinforcements()
		die = roll_die()
		log("Road Congestion:\nD" + die + " + " + n + " French moves.")
		game.french_moves = die + n
	}

	if (game.turn === 5 || game.turn === 6) {
		die = roll_die()
		if (die <= 4) {
			log("The Deluge:\nD" + die + " \u2013 Rain.")
			game.rain = 2
		} else {
			log("The Deluge:\nD" + die + " \u2013 No effect.")
		}
	}

	if (game.rain > 0) {
		log("Artillery Ricochet Ineffective.")
	}

}

function goto_command_phase() {
	log_h2("Command")
	goto_hq_placement_step()
}

// === A: HQ PLACEMENT STEP ===

function goto_hq_placement_step() {
	log_h3("Place HQ")
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

function log_hq_placement_step(hqs) {
	for (let p of hqs)
		if (piece_mode(p))
			log("P" + p + " \u2013 Battle\nat " + piece_hex(p))
		else
			log("P" + p + "\nat " + piece_hex(p))
}

function end_hq_placement_step() {
	if (game.active === P1) {
		log_hq_placement_step(p1_hqs)
		logbr()
		game.active = P2
	} else {
		log_hq_placement_step(p2_hqs)
		goto_return_blown()
	}
}

states.place_hq = {
	inactive: "place HQs",
	prompt() {
		prompt("Place HQs and choose HQ modes.")
		let done = true
		for (let p of friendly_hqs()) {
			gen_action_piece(p)
			if (!piece_is_on_map(p))
				done = false
		}
		if (done)
			view.actions.end_step = 1
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
	end_step() {
		clear_undo()
		end_hq_placement_step()
	},
}

states.place_hq_where = {
	inactive: "place HQs",
	prompt() {
		prompt("Place " + piece_name(game.who) + ".")

		gen_action_piece(game.who)

		// within 3 of any unit
		for (let p of friendly_units()) {
			let x = piece_hex(p)
			if (is_map_hex(x) && pieces_are_associated(p, game.who)) {
				for_each_within_x3(x, next => {
					if (!is_enemy_zoc_or_zoi(next) && !hex_has_any_piece(next, all_hqs))
						gen_action_hex(next)
				})
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
	piece(_) {
		pop_undo()
	},
	hex(x) {
		set_piece_hex(game.who, x)
		game.who = -1
		game.state = "place_hq"
	},
}

// === B: BLOWN UNIT RETURN STEP ===

function can_return_blown_unit(p) {
	let result = false
	for (let hq of friendly_hqs()) {
		if (pieces_are_associated(p, hq)) {
			for_each_adjacent(piece_hex(hq), x => {
				if (is_empty_hex(x) && !is_enemy_zoc_or_zoi(x))
					if (!is_forbidden_hex(x))
						result = true
			})
		}
	}
	return result
}

function goto_return_blown() {
	let blown = false
	for (let p of p1_corps)
		if (piece_hex(p) === BLOWN)
			blown = true
	for (let p of p2_corps)
		if (piece_hex(p) === BLOWN)
			blown = true
	if (blown)
		log_h3("Return Blown Units")

	game.active = P2
	resume_return_blown_1()
}

function resume_return_blown_1() {
	game.state = "eliminate_blown"
	let n = 0
	for (let p of enemy_corps())
		if (piece_hex(p) === BLOWN)
			n ++
	if (n <= 2) {
		set_next_player()
		resume_return_blown_2()
	}
}

states.eliminate_blown = {
	inactive: "eliminate blown corps",
	prompt() {
		prompt("Eliminate all but two of opponent's blown corps.")
		for (let p of enemy_corps())
			if (piece_hex(p) === BLOWN)
				gen_action_piece(p)
	},
	piece(p) {
		eliminate_unit(p)
		resume_return_blown_1()
	},
}

function resume_return_blown_2() {
	game.state = "return_blown_who"
	for (let p of friendly_corps())
		if (piece_hex(p) === BLOWN)
			return
	end_return_blown()
}

states.return_blown_who = {
	inactive: "return blown corps",
	prompt() {
		let done = true
		for (let p of friendly_corps()) {
			if (piece_hex(p) === BLOWN) {
				gen_action_piece(p)
				done = false
			}
		}
		if (done) {
			prompt("Finished returning blown corps.")
			view.actions.end_step = 1
		} else {
			prompt("Return a blown corps.")
		}
	},
	piece(p) {
		push_undo()
		if (can_return_blown_unit(p)) {
			game.who = p
			game.state = "return_blown_where"
		} else {
			set_piece_hex(p, ELIMINATED)
		}
	},
	end_step() {
		clear_undo()
		end_return_blown()
	},
}

states.return_blown_where = {
	inactive: "return blown corps",
	prompt() {
		prompt("Return " + piece_name(game.who) + ".")
		for (let hq of friendly_hqs()) {
			if (pieces_are_associated(game.who, hq)) {
				for_each_adjacent(piece_hex(hq), x => {
					if (is_empty_hex(x) && !is_enemy_zoc_or_zoi(x))
						if (!is_forbidden_hex(x))
							gen_action_hex(x)
				})
			}
		}
		gen_action_piece(game.who)
	},
	piece(_) {
		pop_undo()
	},
	hex(x) {
		log("P" + game.who + "\nto " + x)
		// TODO: forbidden (retreat then resume return_blown_who)
		set_piece_hex(game.who, x)
		game.who = -1
		game.state = "return_blown_who"
	},
}

function end_return_blown() {
	if (game.active === P1)
		resume_return_blown_1()
	else
		goto_cavalry_corps_recovery_step()
}

// === C: CAVALRY CORPS RECOVERY STEP ===

function goto_cavalry_corps_recovery_step() {
	game.active = P1
	for (let p of friendly_cavalry_corps())
		if (piece_mode(p) && piece_is_not_in_enemy_zoc_or_zoi(p))
			set_piece_mode(p, 0)
	game.active = P2
	for (let p of friendly_cavalry_corps())
		if (piece_mode(p) && piece_is_not_in_enemy_zoc_or_zoi(p))
			set_piece_mode(p, 0)

	goto_detachment_placement_step()
}

// === D: DETACHMENT PLACEMENT STEP ===

function goto_detachment_placement_step() {
	log_h3("Detachments")
	game.active = P1
	begin_detachment_placement_step()
}

function begin_detachment_placement_step() {
	game.state = "place_detachment_hq"
	game.count = 0
	for (let p of friendly_hqs())
		game.count |= (1 << p)

	for (let hq of friendly_hqs()) {
		for (let p of friendly_detachments()) {
			if (can_place_detachment(p, hq))
				return
		}
	}

	end_detachment_placement_step()
}

function end_detachment_placement_step() {
	if (game.active === P1) {
		logbr()
		game.active = P2
		begin_detachment_placement_step()
	} else {
		goto_detachment_recall_step()
	}
}

function can_place_detachment_at(x) {
	// NOTE: must have run search_detachment before calling!
	return (
		move_seen[x-1000] &&
		!is_friendly_zoc_or_zoi(x) &&
		!hex_has_any_piece(x, friendly_detachments()) &&
		!hex_has_any_piece(x, enemy_detachments()) &&
		!is_forbidden_hex(x)
	)
}

function can_place_detachment_anywhere() {
	// NOTE: must have run search_detachment before calling!
	for (let row = 0; row < data.map.rows; ++row)
		for (let col = 0; col < data.map.cols; ++col)
			if (can_place_detachment_at(1000 + row * 100 + col))
				return true
	return false
}

function can_place_detachment(p, hq) {
	search_detachment(p, hq)
	let x = piece_hex(p)
	if (x === AVAILABLE_P1 || x === AVAILABLE_P2) {
		if (pieces_are_associated(p, hq)) {
			if (p === GRAND_BATTERY || p === OLD_GUARD) {
				if (hq === NAPOLEON_HQ && piece_mode(NAPOLEON_HQ))
					return can_place_detachment_anywhere()
			} else {
				return can_place_detachment_anywhere()
			}
		}
	}
	return false
}

states.place_detachment_hq = {
	inactive: "place detachments",
	prompt() {
		let done = true
		for (let p of friendly_hqs()) {
			if (game.count & (1 << p)) {
				done = false
				gen_action_piece(p)
			}
		}
		if (done)
			prompt("Finished placing detachments.")
		else
			prompt("Choose an HQ to place a detachment.")
		view.actions.end_step = 1
	},
	piece(p) {
		push_undo()
		game.target = p
		game.count ^= (1 << p)
		game.state = "place_detachment_who"
	},
	end_step() {
		clear_undo()
		end_detachment_placement_step()
	},
}

states.place_detachment_who = {
	inactive: "place detachments",
	prompt() {
		prompt("Choose a detachment for " + piece_name(game.target) + ".")

		gen_action_piece(game.target)

		for (let p of friendly_detachments()) {
			if (can_place_detachment(p, game.target))
				gen_action_piece(p)
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
}

states.place_detachment_where = {
	inactive: "place detachments",
	prompt() {
		prompt("Place " + piece_name(game.who) + ".")
		gen_action_piece(game.who)

		if (game.who === GRAND_BATTERY) {
			for (let p of friendly_units()) {
				let x = piece_hex(p)
				if (calc_distance(piece_hex(NAPOLEON_HQ), x) <= 3)
					if (!hex_has_any_piece(x, p1_det))
						gen_action_hex(x)
			}
			return
		}

		if (game.who === OLD_GUARD) {
			for_each_within_x3(piece_hex(NAPOLEON_HQ), next => {
				if (!is_enemy_zoc(next) && is_empty_hex(next))
					gen_action_hex(next)
			})
			return
		}

		search_detachment(game.who, game.target)
		for (let row = 0; row < data.map.rows; ++row)
			for (let col = 0; col < data.map.cols; ++col)
				if (can_place_detachment_at(1000 + row * 100 + col))
					gen_action_hex(1000 + row * 100 + col)
	},
	piece(_) {
		game.who = -1
		game.state = "place_detachment_who"
	},
	hex(x) {
		log("P" + game.who + "\nto " + x)
		set_piece_hex(game.who, x)
		game.target = -1
		game.who = -1
		game.state = "place_detachment_hq"
	},
}

// === E: DETACHMENT RECALL STEP ===

function goto_detachment_recall_step() {
	log_h3("Recall")
	game.active = P1
	game.state = "detachment_recall_step"
}

function end_detachment_recall_step() {
	if (game.active === P1) {
		game.active = P2
	} else {
		goto_organization_phase()
	}
}

states.detachment_recall_step = {
	inactive: "recall detachments",
	prompt() {
		prompt("Recall detachments?")

		for (let p of friendly_detachments())
			if (piece_is_on_map(p))
				gen_action_piece(p)

		view.actions.end_step = 1
	},
	piece(p) {
		push_undo()
		recall_detachment(p)
	},
	end_step() {
		clear_undo()
		end_detachment_recall_step()
	},
}

// === ORGANIZATION PHASE ===

function goto_organization_phase() {

	// British Line of Communication Angst
	let n = 0
	for (let p of anglo_det)
		if (piece_is_on_map(p) || piece_hex(p) === ELIMINATED)
			++n
	if (n < 3) {
		if (piece_hex(HILL_2) === SWAPPED && piece_hex(HILL_1) !== ELIMINATED) {
			log_h3("Line of Communication Angst")
			log("P" + HILL_2 + " substituted.")
			set_piece_hex(HILL_2, piece_hex(HILL_1))
			set_piece_mode(HILL_2, piece_mode(HILL_1))
			set_piece_hex(HILL_1, SWAPPED)
			set_piece_mode(HILL_1, 0)
		}
	} else {
		if (piece_hex(HILL_1) === SWAPPED && piece_hex(HILL_2) !== ELIMINATED) {
			log_h3("Line of Communication Angst")
			log("P" + HILL_1 + " substituted.")
			set_piece_hex(HILL_1, piece_hex(HILL_2))
			set_piece_mode(HILL_1, piece_mode(HILL_2))
			set_piece_hex(HILL_2, SWAPPED)
			set_piece_mode(HILL_2, 0)
		}
	}

	// F: ADVANCE FORMATION
	game.active = P1
	for (let p of friendly_infantry_corps())
		if (piece_mode(p) && piece_is_not_in_enemy_zoc(p))
			set_piece_mode(p, 0)
	game.active = P2
	for (let p of friendly_infantry_corps())
		if (piece_mode(p) && piece_is_not_in_enemy_zoc(p))
			set_piece_mode(p, 0)


	// G: BATTLE FORMATION
	game.active = P1
	for (let p of friendly_infantry_corps())
		if (!piece_mode(p) && piece_is_in_enemy_zoc(p))
			set_piece_mode(p, 1)
	game.active = P2
	for (let p of friendly_infantry_corps())
		if (!piece_mode(p) && piece_is_in_enemy_zoc(p))
			set_piece_mode(p, 1)

	goto_withdrawal()
}

// === H: WITHDRAWAL ===

function can_withdraw_any() {
	for (let p of friendly_corps())
		if (piece_is_in_enemy_zoc(p))
			return true
	return false
}

function goto_withdrawal() {
	log_h3("Withdrawal")
	game.remain = 0
	game.active = P2
	next_withdrawal()
}

function next_withdrawal() {
	clear_undo()
	game.state = "withdrawal"

	if (game.remain === 0) {
		set_next_player()
	} else {
		if (--game.remain === 0) {
			end_withdrawal()
			return
		}
	}

	if (!can_withdraw_any())
		pass_withdrawal()
}

function pass_withdrawal() {
	log(game.active + " passed.")
	if (game.remain > 0) {
		end_withdrawal()
	} else {
		set_next_player()
		if (can_withdraw_any()) {
			game.remain = 3
		} else {
			log(game.active + " passed.")
			end_withdrawal()
		}
	}
}

function end_withdrawal() {
	goto_movement_phase()
}

states.withdrawal = {
	inactive: "withdraw",
	prompt() {
		if (game.remain > 0)
			prompt("Withdrawal: " + game.remain + " withdrawals remain.")
		else
			prompt("Withdrawal.")

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
		log(game.active + " passed.")
		if (game.remain > 0) {
			end_withdrawal()
		} else {
			set_next_player()
			game.remain = 3
		}
	},
}

states.withdrawal_to = {
	inactive: "withdraw",
	prompt() {
		prompt("Withdraw " + piece_name(game.who) + ".")

		let list = search_withdrawal(piece_hex(game.who))
		if (list.length > 0) {
			view.actions.hex = list
			view.move_from = move_from
		} else {
			view.actions.blow = 1
		}

		gen_action_piece(game.who)
	},
	piece(_) {
		pop_undo()
	},
	blow() {
		blow_unit(game.who, 2)
		game.who = -1
		recall_grand_battery_alone()
		next_withdrawal()
	},
	hex(x) {
		let from = piece_hex(game.who)
		log("P" + game.who + "\nfrom " + from + "\nto " + x)
		set_piece_hex(game.who, x)
		game.who = -1
		recall_grand_battery_alone()
		next_withdrawal()
	},
}

// === MOVEMENT PHASE ===

function bring_on_reinforcements() {
	for (let info of data.reinforcements)
		if (info.turn === game.turn)
			for (let p of info.list)
				if (piece_hex(p) !== SWAPPED)
					set_piece_hex(p, REINFORCEMENTS)
	for (let p of all_units)
		if (piece_hex(p) === BLOWN + game.turn)
			set_piece_hex(p, BLOWN)
}

function can_move_any() {
	for (let info of data.reinforcements)
		if (info.turn === game.turn && info.side === game.active)
			for (let p of info.list)
				if (piece_hex(p) === REINFORCEMENTS)
					return true
	for (let p of friendly_cavalry_corps())
		if (piece_is_not_in_enemy_cav_zoc(p))
			return true
	for (let p of friendly_infantry_corps())
		if (piece_is_not_in_enemy_zoc(p))
			return true
	return false
}

function goto_movement_phase() {
	log_h2("Movement")
	game.remain = 0
	game.active = P2
	next_movement()
}

function next_movement() {
	game.state = "movement"
	game.who = -1

	if (game.remain === 0) {
		clear_undo()
		set_next_player()
	} else {
		if (--game.remain === 0) {
			end_movement()
			return
		}
	}

	if (!can_move_any())
		pass_movement()
}

function pass_movement() {
	log(game.active + " passed.")

	if (game.turn <= 2 && game.active === P1)
		game.french_moves = 0
	if (game.turn === 2 && game.active === P2)
		game.prussian_moves = 0

	if (game.remain > 0) {
		end_movement()
	} else {
		set_next_player()

		if (can_move_any()) {
			let die = roll_die()

			let n = 0
			for (let p of friendly_corps()) {
				if (piece_is_not_in_enemy_zoc_or_zoi(p))
					++n
				if (piece_hex(p) === REINFORCEMENTS)
					++n
			}

			log(">D" + die + " + " + n + " more moves.")

			game.remain = die + n
			logbr()
		} else {
			log(game.active + " passed.")
			end_movement()
		}
	}
}

function end_movement() {
	clear_undo()
	if (game.turn <= 2)
		delete game.french_moves
	if (game.turn === 2)
		delete game.prussian_moves
	goto_attack_phase()
}

states.movement = {
	inactive: "move",
	prompt() {
		let may_pass = 1

		let remain = game.remain
		if (game.turn <= 2 && game.active === P1)
			remain = Math.min(remain, game.french_moves)
		if (game.turn === 2 && game.active === P2)
			remain = Math.min(remain, game.prussian_moves)

		if (game.remain > 0)
			prompt("Movement: " + remain + " moves remain.")
		else
			prompt("Movement.")

		// June 15: Surprise
		if (game.turn === 1 && game.active === P2) {
			if (piece_is_not_in_enemy_zoc(ZIETHEN)) {
				view.prompt += " Only " + piece_name(ZIETHEN) + " may move."
				gen_action_piece(ZIETHEN)
			}
			view.actions.pass = 1
			return
		}

		// June 15: Congestion
		if (game.turn <= 2 && game.active === P1) {
			view.remain = 0
			if (game.french_moves === 0) {
				prompt("No moves remain.")
				view.actions.pass = 1
				return
			}
		}

		// June 15: Concentrating the Army
		if (game.turn === 2 && game.active === P2) {
			view.remain = 0
			if (game.prussian_moves === 0) {
				prompt("No moves remain.")
				view.actions.pass = 1
				return
			}
		}

		// June 15: Delayed Reaction
		if (game.turn === 2 && game.active === P2) {
			view.prompt += " Only Prussian corps may move."
			for (let p of prussian_cav)
				if (piece_is_not_in_enemy_cav_zoc(p))
					gen_action_piece(p)
			for (let p of prussian_inf)
				if (piece_is_not_in_enemy_zoc(p))
					gen_action_piece(p)
			view.actions.pass = 1
			return
		}

		let has_reinf = false
		for (let info of data.reinforcements) {
			if (info.turn <= game.turn && info.side === game.active) {
				for (let p of info.list) {
					if (piece_hex(p) === REINFORCEMENTS) {
						has_reinf = true
						if (can_piece_enter(p)) {
							may_pass = 0
							gen_action_piece(p)
							break
						}
					}
				}
			}
		}

		if (game.remain === 0 || !has_reinf) {
			for (let p of friendly_cavalry_corps())
				if (piece_is_not_in_enemy_cav_zoc(p))
					gen_action_piece(p)
			for (let p of friendly_infantry_corps())
				if (piece_is_not_in_enemy_zoc(p))
					gen_action_piece(p)
		} else {
			view.prompt += " You must enter reinforcements."
		}

		view.actions.pass = may_pass
	},
	piece(p) {
		push_undo()
		game.who = p
		game.state = "movement_to"
	},
	pass() {
		pass_movement()
	},
}

states.movement_to = {
	inactive: "move",
	prompt() {
		prompt("Move " + piece_name(game.who) + ".")

		search_move(game.who)
		view.move_from = move_from
		view.move_from_road = move_from_road

		let here = piece_hex(game.who)
		for (let row = 0; row < data.map.rows; ++row) {
			for (let col = 0; col < data.map.cols; ++col) {
				let x = 1000 + row * 100 + col
				if (x !== here && move_seen[x-1000] && !is_forbidden_hex(x)) {
					if (move_flip[x-1000])
						gen_action_stop_hex(x)
					else
						gen_action_hex(x)
				}
			}
		}

		gen_action_piece(game.who)
	},
	piece(_) {
		pop_undo()
	},
	stop_hex(x) {
		this.hex(x)
	},
	hex(x) {
		search_move(game.who)

		let from = piece_hex(game.who)

		if (from === REINFORCEMENTS) {
			from = find_reinforcement_hex(game.who)
			if (Array.isArray(from)) {
				if (!hex_has_any_piece(from[0], all_corps))
					from = from[0]
				else
					from = from[1]
			}
		}

		set_piece_hex(game.who, x)

		log("P" + game.who + "\nfrom " + from + "\nto " + x)

		// must flip (stream without road, or enter zoc)
		if (move_flip[x-1000])
			set_piece_mode(game.who, 1)

		// flip all enemy inf in zoc
		for (let p of enemy_infantry_corps())
			if (piece_is_in_zoc_of_hex(p, x))
				set_piece_mode(p, 1)

		game.who = -1
		recall_grand_battery_alone()

		// TODO: forbidden (retreat then next_movement)

		if (game.turn <= 2 && game.active === P1)
			--game.french_moves
		if (game.turn === 2 && game.active === P2)
			--game.prussian_moves

		logbr()
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
		// Cavalry beginning move in non-Cavalry ZoC may only move to empty hex not in ZoC
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

function must_stop_deluge(here, next) {
	if (game.rain === 2 && !is_road_hexside(here, next))
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

function find_reinforcement_hex(who) {
	for (let info of data.reinforcements)
		for (let p of info.list)
			if (p === who)
				return info.hex
	return 0
}

function can_trace_detachment(here, next) {
	if (is_enemy_zoc_or_zoi(next))
		return false
	if (is_river(here, next))
		return false
	return true
}

function search_detachment(who, hq) {
	move_seen.fill(0)

	search_detachment_normal(piece_hex(hq), piece_command_range(hq))

	if (!piece_mode(hq))
		if (is_road_hex(piece_hex(hq)))
			search_detachment_road(piece_hex(hq), piece_command_range(hq) * 2)

	for (let pp of data.pieces[who].parent)
		if (piece_is_on_map(pp))
			search_detachment_normal(piece_hex(pp), 4)
}

function search_detachment_normal(start, ma) {
	let queue = [ (start << 8) | (ma) ]
	move_cost.fill(0)
	move_cost[start-1000] = 1
	move_seen[start-1000] = 1
	while (queue.length > 0) {
		let item = queue.shift()
		let here = item >> 8
		let mp = item & 255
		for_each_adjacent(here, next => {
			if (!move_cost[next-1000]) {
				if (can_trace_detachment(here, next)) {
					move_cost[next-1000] = 1
					move_seen[next-1000] = 1
					if (mp > 1)
						queue.push((next << 8) | (mp - 1))
				}
			}
		})
	}
}

function search_detachment_road(start, range) {
	let queue = [ start ]

	move_cost.fill(255)
	move_cost[start-1000] = range
	move_seen[start-1000] = 1

	while (queue.length > 0) {
		let here = queue.shift()
		for (let [road_id, k] of data_roads[here-1000]) {
			let road = data.map.roads[road_id]
			if (k + 1 < road.length)
				search_detachment_road_segment(queue, here, road, k, 1)
			if (k > 0)
				search_detachment_road_segment(queue, here, road, k, -1)
		}
	}
}

function search_detachment_road_segment(queue, here, road, cur, dir) {
	let mp = move_cost[here-1000]
	let qq = false
	cur += dir

	while (mp > 0 && cur >= 0 && cur < road.length) {
		let next = road[cur]

		if (!can_trace_detachment(here, next))
			return

		let next_mp = mp - 1

		let seen_mp = move_cost[next-1000]
		if (seen_mp === 255 || next_mp > seen_mp) {
			move_seen[next-1000] = 1
			move_cost[next-1000] = next_mp
			qq = (next_mp > 0)
		} else {
			return
		}

		cur += dir
		here = next
		mp = next_mp
	}

	if (qq)
		queue.push(here)
}

function can_piece_enter(p) {
	let xs = find_reinforcement_hex(p)
	if (typeof xs === "number") {
		if (!hex_has_any_piece(xs, all_corps))
			return true
	} else {
		for (let x of xs)
			if (!hex_has_any_piece(x, all_corps))
				return true
	}
	return false
}

function search_move(p) {
	move_seen.fill(0)
	move_flip.fill(1)
	move_from.length = 0
	move_from_road.length = 0

	let x = piece_hex(p)
	let m = piece_movement_allowance(p)

	if (x === REINFORCEMENTS) {
		let xs = find_reinforcement_hex(p)
		if (typeof xs === "number") {
			x = xs
			if (!hex_has_any_piece(x, all_corps)) {
				move_seen[x-1000] = 1
				move_flip[x-1000] = 0
				search_move_imp(p, m, 1, x)
			}
		} else {
			for (x of xs) {
				if (!hex_has_any_piece(x, all_corps)) {
					move_seen[x-1000] = 1
					move_flip[x-1000] = 0
					search_move_imp(p, m, 1, x)
				}
			}
		}
	} else {
		search_move_imp(p, m, 0, x)
	}
}

function search_move_imp(p, m, u, x) {
	for (let hq of data.pieces[p].hq) {
		let hq_hex = piece_hex(hq)
		if (is_map_hex(hq_hex)) {
			search_move_normal(x, m - u, hq_hex, piece_command_range(hq), piece_is_cavalry(p))
			if (!(piece_is_infantry(game.who) && piece_mode(game.who)))
				if (is_road_hex(x))
					search_move_road(x, m * 2 - u, hq_hex, piece_command_range(hq), piece_is_cavalry(p))
		}
	}
}

function search_move_normal(start, ma, hq_hex, hq_range, is_cav) {
	let queue = [ start ]

	move_cost.fill(255)
	move_cost[start-1000] = ma
	move_flip[start-1000] = 0

	while (queue.length > 0) {
		let here = queue.shift()
		let mp = move_cost[here-1000]

		// console.log("HERE", here, mp)

		for_each_adjacent(here, next => {
			if (!can_move_into(here, next, hq_hex, hq_range, is_cav))
				return

			let next_mp = mp - 1
			if (must_stop_deluge(here, next))
				next_mp = -1
			else if (must_stop_stream(here, next))
				next_mp = -1
			else if (must_flip_zoc(here, next, is_cav))
				next_mp = -1
			else if (must_stop_zoc_zoi(here, next, is_cav))
				next_mp = 0
			
			// console.log("  INTO", next, mp)

			let seen_mp = move_cost[next-1000]
			if (seen_mp === 255 || next_mp > seen_mp) {
				map_set(move_from, next, here)
				move_seen[next-1000] = 1
				move_cost[next-1000] = next_mp

				// can move without flipping!
				if (next_mp >= 0)
					move_flip[next-1000] = 0

				// can continue
				if (next_mp > 0)
					queue.push(next)
			}
		})
	}
}

function search_move_road(start, ma, hq_hex, hq_range, is_cav) {
	let queue = [ start ]

	move_cost.fill(255)
	move_cost[start-1000] = ma
	move_seen[start-1000] = 1

	while (queue.length > 0) {
		let here = queue.shift()
		for (let [road_id, k] of data_roads[here-1000]) {
			let road = data.map.roads[road_id]
			if (k + 1 < road.length)
				search_move_road_segment(queue, here, road, k, 1, hq_hex, hq_range, is_cav)
			if (k > 0)
				search_move_road_segment(queue, here, road, k, -1, hq_hex, hq_range, is_cav)
		}
	}
}

function search_move_road_segment(queue, here, road, cur, dir, hq_hex, hq_range, is_cav) {
	let mp = move_cost[here-1000]
	let qq = false
	cur += dir

	while (mp > 0 && cur >= 0 && cur < road.length) {
		let next = road[cur]

		if (!can_move_into(here, next, hq_hex, hq_range, is_cav))
			return

		let next_mp = mp - 1
		if (must_flip_zoc(here, next, is_cav))
			next_mp = -1
		else if (must_stop_zoc_zoi(here, next, is_cav))
			next_mp = 0

		let seen_mp = move_cost[next-1000]
		if (seen_mp === 255 || next_mp > seen_mp) {
			map_set(move_from_road, next, here)
			move_seen[next-1000] = 1
			move_cost[next-1000] = next_mp

			if (next_mp >= 0)
				move_flip[next-1000] = 0

			qq = (next_mp > 0)
		} else {
			return
		}

		cur += dir
		here = next
		mp = next_mp
	}

	if (qq)
		queue.push(here)
}

function search_withdrawal(here) {
	// Withdraw from ALL enemy units.
	let from_list = []
	for_each_adjacent(here, from => {
		if (hex_has_any_piece(from, enemy_units()))
			from_list.push(from)
	})
	let result = []
	move_from.length = 0
	search_retreat(result, here, from_list, 3)
	return result
}

function search_retreat(result, here, from_list, n) {
	for_each_adjacent(here, next => {
		// can't enter zoc
		if (is_enemy_zoc(next))
			return

		// must move further away
		for (let from of from_list) {
			if (calc_distance(from, next) <= calc_distance(from, here))
				return
		}

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

		map_set(move_from, next, here)

		if (n > 1)
			search_retreat(result, next, from_list, n - 1)
		else
			if (!is_forbidden_hex(next))
				set_add(result, next)
	})
}

// === ATTACK PHASE ===

function can_attack_any() {
	for (let p of friendly_corps())
		if (piece_is_in_enemy_zoc(p))
			return true
	return false
}

function goto_attack_phase() {
	log_h2("Attack")
	game.remain = 0
	game.active = P2
	next_attack()
}

function next_attack() {
	game.state = "attack"
	game.who = -1
	game.target = -1
	game.attack = 0

	if (game.remain === 0) {
		set_next_player()
	} else {
		if (--game.remain === 0) {
			end_attack()
			return
		}
	}

	if (!can_attack_any())
		pass_attack()
}

function pass_attack() {
	log_h3("Pass")
	log(game.active + " passed.")
	if (game.remain > 0) {
		end_attack()
	} else {
		set_next_player()
		if (can_attack_any()) {
			game.remain = roll_die()
			log(">D" + game.remain + " more attacks.")
		} else {
			log(game.active + " passed.")
			end_attack()
		}
	}
}

function end_attack() {
	game.active = P1
	game.state = "end_phase"
}

states.attack = {
	inactive: "attack",
	prompt() {
		if (game.remain > 0)
			prompt("Attack: " + game.remain + " attacks remain.")
		else
			prompt("Attack.")
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
		pass_attack()
	},
}

function can_attack_cavalry_support(p) {
	if (p === game.who)
		return false
	return is_adjacent(piece_hex(p), piece_hex(game.who))
}

function can_defend_cavalry_support(p) {
	if (p === game.target)
		return false
	return is_adjacent(piece_hex(p), piece_hex(game.target))
}

function can_attack_infantry_support(p) {
	if (p === game.who)
		return false
	return is_adjacent(piece_hex(p), piece_hex(game.target))
}

states.attack_who = {
	inactive: "attack",
	prompt() {
		prompt("Attack with " + piece_name(game.who) + ".")
		let here = piece_hex(game.who)
		for (let p of enemy_units()) {
			if (piece_is_in_zoc_of_hex(p, here)) {
				if (piece_is_detachment(p)) {
					// Only detachments that are not stacked with a corps!
					let x = piece_hex(p)
					if (!hex_has_any_piece(x, enemy_corps()))
						gen_action_piece(p)
				} else {
					gen_action_piece(p)
				}
			}
		}
		gen_action_piece(game.who)
	},
	piece(p) {
		if (p === game.who) {
			pop_undo()
			return
		}

		let where = piece_hex(p)
		log_h3(where)

		game.target = p
		game.attack = piece_hex(game.target)
		begin_attack()
	},
}

function begin_attack() {
	game.count = 0
	for (let p of friendly_infantry_corps())
		if (can_attack_infantry_support(p))
			game.count |= (1 << p)
	for (let p of friendly_cavalry_corps())
		if (can_attack_cavalry_support(p) && piece_mode(p))
			game.count |= (1 << p)
	for (let p of enemy_cavalry_corps())
		if (can_defend_cavalry_support(p) && piece_mode(p))
			game.count |= (1 << p)
	goto_attack_support()
}

function goto_attack_support() {
	game.state = "attack_support"
}

function goto_defend_support() {
	set_next_player()
	game.state = "defend_support"
	for (let p of friendly_cavalry_corps())
		if (!(game.count & (1 << p)))
			if (can_defend_cavalry_support(p))
				return
	goto_resolve_attack()
}

states.attack_support = {
	inactive: "attack",
	prompt() {
		view.support = game.count
		if (data.map.names[game.attack])
			prompt("Attack " + piece_name(game.target) +
				" at " + data.map.names[game.attack] +
				" with " + piece_name(game.who) +
				".")
		else
			prompt(piece_name(game.who) +
				" attacks " + piece_name(game.target) +
				" at " + data.map.names[game.attack] +
				". Commit defending cavalry?")
			prompt("Attack " + piece_name(game.target) + " with " + piece_name(game.who) + ".")

		let can_support = false
		for (let p of friendly_cavalry_corps()) {
			if (!(game.count & (1 << p))) {
				if (can_attack_cavalry_support(p)) {
					can_support = true
					gen_action_piece(p)
				}
			}
		}

		if (can_support)
			view.prompt += " Commit supporting cavalry?"

		view.actions.next = 1
	},
	piece(p) {
		push_undo()
		game.count |= (1 << p)
	},
	next() {
		clear_undo()
		goto_defend_support()
	},
}

states.defend_support = {
	inactive: "commit cavalry",
	prompt() {
		view.support = game.count
		if (data.map.names[game.attack])
			prompt(piece_name(game.who) +
				" attacks " + piece_name(game.target) +
				" at " + data.map.names[game.attack] +
				". Commit defending cavalry?")
		else
			prompt(piece_name(game.who) +
				" attacks " + piece_name(game.target) +
				". Commit defending cavalry?")

		for (let p of friendly_cavalry_corps())
			if (!(game.count & (1 << p)))
				if (can_defend_cavalry_support(p))
					gen_action_piece(p)
		view.actions.next = 1
	},
	piece(p) {
		push_undo()
		game.count |= (1 << p)
	},
	next() {
		clear_undo()
		goto_resolve_attack()
	},
}

function log_drm(n, reason) {
	if (n > 0)
		log(`>+${n} ${reason}`)
	else if (n < 0)
		log(`>${n} ${reason}`)
	return n
}

function goto_resolve_attack() {
	let n

	set_next_player() // back to attacking player

	let a_unit = game.who
	let d_unit = game.target
	let a_hex = piece_hex(a_unit)
	let d_hex = piece_hex(d_unit)
	let a_drm = 0
	let d_drm = 0
	let town = is_town_hex(d_hex)

	// ATTACKER DRM

	let a_die = roll_die()

	log("P" + a_unit)
	log(">D" + a_die + " Attack")

	if (game.rain > 0)
		a_drm += log_drm(-1, "Artillery Ricochet Ineffective")

	// Unless Cav charging into town
	if (!(town && piece_is_cavalry(a_unit)))
		a_drm += log_drm(piece_stars(a_unit), "Battle Stars")

	for (let hq of friendly_hqs())
		if (piece_mode(hq) && pieces_are_associated(hq, a_unit))
			if (calc_distance(piece_hex(hq), a_hex) <= piece_command_range(hq))
				a_drm += log_drm(piece_stars(hq), "HQ")

	// Fresh Cavalry support
	if (!town) {
		for (let p of friendly_cavalry_corps())
			if (!piece_mode(p) && (game.count & (1 << p)))
				a_drm += log_drm(piece_stars(p), "Cavalry Stars")
	}

	// Grand battery stacked with attacking or supporting corps
	let gb_hex = piece_hex(GRAND_BATTERY)
	for (let p of friendly_corps())
		if (gb_hex === piece_hex(p) && (p === game.who || (game.count & (1<<p))))
			a_drm += log_drm(1, "Grand Battery")

	// Attack Support
	n = 0
	for (let p of friendly_infantry_corps())
		if (game.count & (1 << p))
			n += 1
	a_drm += log_drm(n, "Infantry Support")

	// Cavalry Support
	n = 0
	for (let p of friendly_cavalry_corps()) {
		if (game.count & (1 << p)) {
			n += 1
			set_piece_mode(p, 1)
		}
	}
	a_drm += log_drm(n, "Cavalry Support")

	// Detachment
	if (piece_is_detachment(d_unit))
		a_drm += log_drm(2, "vs Detachment")

	set_piece_mode(a_unit, 1)

	// DEFENDER DRM

	logbr()

	let d_die = roll_die()

	log("P" + d_unit)
	log(">D" + d_die + " Defend")

	if (town && !piece_is_cavalry(d_unit))
		d_drm += log_drm(1, "Town")

	else if (is_bridge(a_hex, d_hex))
		d_drm += log_drm(1, "Bridge")

	// ERRATA: No stars for Cav defending in Town
	// https://boardgamegeek.com/thread/2456286/article/35214829#35214829
	if (!(town && piece_is_cavalry(d_unit)))
		d_drm += log_drm(piece_stars(d_unit), "Battle Stars")

	for (let hq of enemy_hqs())
		if (piece_mode(hq) && pieces_are_associated(hq, d_unit))
			if (calc_distance(piece_hex(hq), d_hex) <= piece_command_range(hq))
				d_drm += log_drm(piece_stars(hq), "HQ")

	n = 0
	for (let p of enemy_cavalry_corps()) {
		if (game.count & (1 << p)) {
			n += 1
			set_piece_mode(p, 1)
		}
	}
	d_drm += log_drm(n, "Cavalry Support")

	if (!piece_is_detachment(d_unit))
		set_piece_mode(d_unit, 1)

	// COMBAT RESULT TABLE

	logbr()

	let diff = (a_die + a_drm) - (d_die + d_drm)
	if (diff <= -5)
		goto_eliminated_attacker()
	else if (diff <= -3)
		goto_blown_attacker()
	else if (diff <= -1)
		goto_retreat_attacker()
	else if (diff >= 5)
		goto_eliminated_defender()
	else if (diff >= 3)
		goto_blown_defender()
	else if (diff >= 1)
		goto_retreat_defender()
	else
		goto_stalemate()
}

function goto_stalemate() {
	log("Stalemate.")
	logbr()
	goto_pursuit()
}

function goto_blown_attacker() {
	log("Attacker blown.")
	logbr()
	if (piece_is_detachment(game.target))
		game.state = "retreat_attacker"
	else
		game.state = "blown_attacker"
}

function goto_eliminated_attacker() {
	log("Attacker eliminated.")
	logbr()
	if (piece_is_detachment(game.target))
		game.state = "retreat_attacker"
	else
		game.state = "eliminated_attacker"
}

function goto_blown_defender() {
	log("Defender blown.")
	logbr()
	set_next_player()
	if (piece_is_detachment(game.target))
		game.state = "eliminated_defender"
	else
		game.state = "blown_defender"
}

function goto_eliminated_defender() {
	log("Defender eliminated.")
	logbr()
	set_next_player()
	game.state = "eliminated_defender"
}

function goto_retreat_attacker() {
	log("Attacker retreat")
	logbr()
	game.state = "retreat_attacker"
}

function goto_retreat_defender() {
	log("Defender retreat.")
	logbr()
	set_next_player()
	if (piece_is_detachment(game.target))
		game.state = "recall_defender"
	else
		game.state = "retreat_defender"
}

states.blown_attacker = {
	inactive: "blow attacker",
	prompt() {
		prompt("Blow attacker.")
		gen_action_piece(game.who)
	},
	piece(p) {
		eliminate_detachments_stacked_with_corps(p)
		blow_unit(p, 2)
		next_attack()
	},
}

states.eliminated_attacker = {
	inactive: "eliminate attacker",
	prompt() {
		prompt("Eliminate attacker.")
		gen_action_piece(game.who)
	},
	piece(p) {
		eliminate_detachments_stacked_with_corps(p)
		eliminate_unit(p)
		next_attack()
	},
}

states.blown_defender = {
	inactive: "blow defender",
	prompt() {
		prompt("Blow defender.")
		gen_action_piece(game.target)
	},
	piece(p) {
		eliminate_detachments_stacked_with_corps(p)
		blow_unit(p, 2)
		set_next_player()
		goto_pursuit()
	},
}

states.eliminated_defender = {
	inactive: "eliminate defender",
	prompt() {
		prompt("Eliminate defender.")
		gen_action_piece(game.target)
	},
	piece(p) {
		eliminate_detachments_stacked_with_corps(p)
		eliminate_unit(p)
		set_next_player()
		goto_pursuit()
	},
}

states.retreat_attacker = {
	inactive: "retreat attacker",
	prompt() {
		prompt("Retreat attacker.")
		let result = []
		move_from.length = 0
		search_retreat(result, piece_hex(game.who), [ piece_hex(game.target) ], 3)
		view.move_from = move_from
		if (result.length === 0)
			gen_action_piece(game.who)
		for (let x of result)
			gen_action_hex(x)
	},
	hex(x) {
		log("P" + game.who + " retreated to " + x + ".")
		eliminate_detachments_stacked_with_corps(game.who)
		set_piece_hex(game.who, x)
		// TODO: forbidden (retreat again)
		next_attack()
	},
	piece(p) {
		eliminate_detachments_stacked_with_corps(p)
		blow_unit(p, 2)
		next_attack()
	},
}

states.recall_defender = {
	inactive: "recall defender",
	prompt() {
		prompt("Recall defender.")
		gen_action_piece(game.target)
	},
	piece(p) {
		recall_detachment(p)
		set_next_player()
		goto_pursuit()
	},
}

states.retreat_defender = {
	inactive: "retreat defender",
	prompt() {
		prompt("Retreat defender.")
		let result = []
		move_from.length = 0
		search_retreat(result, piece_hex(game.target), [ piece_hex(game.who) ], 3)
		view.move_from = move_from
		if (result.length === 0)
			gen_action_piece(game.target)
		for (let x of result)
			gen_action_hex(x)
	},
	hex(x) {
		log("P" + game.target + " retreated to " + x + ".")
		eliminate_detachments_stacked_with_corps(game.target)
		set_piece_hex(game.target, x)
		// TODO: forbidden (retreat again)
		set_next_player()
		goto_pursuit()
	},
	piece(p) {
		eliminate_detachments_stacked_with_corps(p)
		blow_unit(p, 2)
		set_next_player()
		goto_pursuit()
	},
}

function goto_pursuit() {
	if (!hex_has_any_piece(game.attack, enemy_units()) && piece_is_not_in_enemy_zoc(game.who)) {
		if (!is_forbidden_hex(game.attack)) {
			// TODO: forbidden (retreat then next_attack)
			set_piece_hex(game.who, game.attack)
			log("P" + game.who + " pursued.")
			recall_grand_battery_alone()
		}
	}
	next_attack()
}

// === END PHASE ===

states.end_phase = {
	inactive: "end turn",
	prompt() {
		prompt("End Phase.")
		view.actions.end_turn = 1
	},
	end_turn() {
		goto_end_phase()
	}
}

function goto_end_phase() {
	game.remain = 0

	if (game.turn === 8) {
		goto_victory_conditions()
		return
	}

	if (piece_is_on_map(GRAND_BATTERY))
		recall_detachment(GRAND_BATTERY)

	game.turn += 1
	init_turn()
	goto_command_phase()
}

function count_french_vp() {
	let vp = 0
	for (let p of p2_corps)
		if (piece_hex(p) === ELIMINATED)
			vp += 3
	for (let p of p2_det)
		if (piece_hex(p) === ELIMINATED)
			vp += 1
	return vp
}

function count_coalition_vp() {
	let vp = 0
	for (let p of p1_corps) {
		if (piece_hex(p) === ELIMINATED) {
			if (p === IMPERIAL_GUARD || p === IMPERIAL_GUARD_CAV)
				vp += 5
			else
				vp += 3
		}
	}
	for (let p of p1_det) {
		if (piece_hex(p) === ELIMINATED) {
			if (p === GRAND_BATTERY || p === OLD_GUARD)
				vp += 2
			else
				vp += 1
		}
	}
	return vp
}

function goto_victory_conditions() {
	game.active = P1

	log_h1("End of Game")

	let vp1 = count_french_vp()
	if (search_brussels_path()) {
		log(P1 + " " + vp1 + " + 5 VP.")
		vp1 += 5
	} else {
		log(P1 + " " + vp1 + " + 0 VP.")
	}

	let vp2 = count_coalition_vp()
	log(P2 + " " + vp2 + " VP.")

	if (vp1 >= vp2 + 12)
		return goto_game_over(P1, "Strategic Victory")
	if (vp2 >= vp1 + 12)
		return goto_game_over(P2, "Strategic Victory")
	if (vp1 >= vp2 + 9)
		return goto_game_over(P1, "Campaign Victory")
	if (vp2 >= vp1 + 9)
		return goto_game_over(P2, "Campaign Victory")

	goto_game_over(vp1 > vp2 ? P1 : P2, "Tactical Victory")
}

function search_brussels_path() {
	move_seen.fill(0)
	move_seen[1017-1000] = 1
	move_seen[1018-1000] = 1

	let queue = []
	if (!is_p2_zoc(1017))
		queue.push(1017)
	if (!is_p2_zoc(1018))
		queue.push(1018)

	while (queue.length > 0) {
		let here = queue.shift()
		for_each_adjacent(here, next => {
			if (move_seen[next-1000])
				return
			if (is_p2_zoc(next))
				return
			if (is_river(here, next))
				return
			move_seen[next-1000] = 1
			queue.push(next)
		})
	}

	if (move_seen[4006-1000] || move_seen[4015-1000] || move_seen[4025-1000])
		return true

	return false
}

// === SETUP ===

function setup_piece(side, name, hex, mode = 0) {
	let id = find_piece(name)
	set_piece_hex(id, hex)
	set_piece_mode(id, mode)
}

function setup_june_15() {
	game.turn = 1

	setup_piece("French", "Napoléon HQ", 1017)
	setup_piece("French", "II Corps (Reille)", 1)
	setup_piece("French", "I Corps (d'Erlon)", 1)
	setup_piece("French", "III Corps (Vandamme)", 1)
	setup_piece("French", "VI Corps (Lobau)", 1)
	setup_piece("French", "Guard Corps (Drouot)", 1)
	setup_piece("French", "Guard Cav Corps (Guyot)", 1)
	setup_piece("French", "Res Cav Corps (Grouchy)", 1)
	setup_piece("French", "IV Corps (Gérard)", 1)
	setup_piece("French", "Grouchy HQ", 2)
	setup_piece("French", "Ney HQ", 2)

	setup_piece("Anglo", "Wellington HQ", 3715)
	setup_piece("Anglo", "Reserve Corps (Wellington)", 3715)
	setup_piece("Anglo", "I Corps (Orange)", 3002)
	setup_piece("Anglo", "II Corps (Hill*)", 3)
	setup_piece("Anglo", "II Corps (Hill**)", SWAPPED)
	setup_piece("Anglo", "Cav Corps (Uxbridge)", 4)
	setup_piece("Anglo", "Cav Detachment (Collaert)", 1211)
	setup_piece("Anglo", "I Detachment (Perponcher)", 2618)

	setup_piece("Prussian", "Blücher HQ", 1737)
	setup_piece("Prussian", "Cav Corps (Gneisenau)", 1737)
	setup_piece("Prussian", "I Corps (Ziethen)", 1716)
	setup_piece("Prussian", "II Corps (Pirch)", 2840)
	setup_piece("Prussian", "III Corps (Thielmann)", 1340)
	setup_piece("Prussian", "IV Corps (Bülow)", 3)
	setup_piece("Prussian", "I Detachment (Steinmetz)", 1215)
	setup_piece("Prussian", "I Detachment (Pirch)", 1217)
	setup_piece("Prussian", "I Detachment (Lützow)", 1221)

	init_turn()

	goto_movement_phase()
}

function setup_june_16() {
	game.turn = 3

	setup_piece("French", "Napoléon HQ", 1217)
	setup_piece("French", "Guard Corps (Drouot)", 1217)
	setup_piece("French", "Grouchy HQ", 1621)
	setup_piece("French", "Ney HQ", 2218)
	setup_piece("French", "II Corps (Reille)", 2218)
	setup_piece("French", "I Corps (d'Erlon)", 1617)
	setup_piece("French", "III Corps (Vandamme)", 1721)
	setup_piece("French", "IV Corps (Gérard)", 1221)
	setup_piece("French", "VI Corps (Lobau)", 1117)
	setup_piece("French", "Guard Cav Corps (Guyot)", 2317)
	setup_piece("French", "Res Cav Corps (Grouchy)", 1822)
	setup_piece("French", "I Detachment (Jacquinot)", 1314)

	setup_piece("Anglo", "Wellington HQ", 2818, 1)
	setup_piece("Anglo", "Reserve Corps (Wellington)", 3715)
	setup_piece("Anglo", "I Corps (Orange)", 3002)
	setup_piece("Anglo", "II Corps (Hill*)", 3)
	setup_piece("Anglo", "II Corps (Hill**)", SWAPPED)
	setup_piece("Anglo", "Cav Corps (Uxbridge)", 4)
	setup_piece("Anglo", "Cav Detachment (Collaert)", 1211)
	setup_piece("Anglo", "I Detachment (Perponcher)", 2618)

	setup_piece("Prussian", "Blücher HQ", 2324, 1)
	setup_piece("Prussian", "Cav Corps (Gneisenau)", 2324)
	setup_piece("Prussian", "I Corps (Ziethen)", 1922, 1)
	setup_piece("Prussian", "II Corps (Pirch)", 1928)
	setup_piece("Prussian", "III Corps (Thielmann)", 1737)
	setup_piece("Prussian", "IV Corps (Bülow)", 3)
	setup_piece("Prussian", "I Detachment (Lützow)", 1623)

	init_turn()

	log_h2("Command")

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
		rain: 0,
		remain: 0,
		pieces: new Array(data.pieces.length).fill(0),
		who: -1,
		attack: 0,
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
	zoc_valid = false
	game = state

	view = {
		prompt: null,
		actions: null,
		log: game.log,
		turn: game.turn,
		rain: game.rain,
		remain: game.remain,
		pieces: game.pieces,
		who: game.who,
		target: game.target,
	}

	if (game.turn <= 2)
		view.french_moves = game.french_moves
	if (game.turn === 2)
		view.prussian_moves = game.prussian_moves

	if (game.state === "game_over") {
		view.prompt = game.victory
	} else if (game.active !== player) {
		let inactive = states[game.state].inactive || game.state
		view.prompt = `Waiting for ${game.active} to ${inactive}.`
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
		S[action](arg)
	else if (action === "undo" && game.undo && game.undo.length > 0)
		pop_undo()
	else
		throw new Error("Invalid action: " + action)
	return game
}

exports.resign = function (state, player) {
	zoc_valid = false
	game = state
	if (game.state !== 'game_over') {
		if (player === P1)
			goto_game_over(P2, P1 + " resigned.")
		if (player === P2)
			goto_game_over(P1, P2 + " resigned.")
	}
	return game
}

function goto_game_over(result, victory) {
	game.state = "game_over"
	game.active = "None"
	game.result = result
	game.victory = victory
	logbr()
	log(game.victory)
	return false
}

states.game_over = {
	get inactive() {
		return game.victory
	},
	prompt() {
		view.prompt = game.victory
	},
}

// === COMMON LIBRARY ===

function log(msg) {
	game.log.push(msg)
}

function logbr() {
	if (game.log.length > 0 && game.log[game.log.length - 1] !== "")
		game.log.push("")
}

function log_h1(msg) {
	logbr()
	log(".h1 " + msg)
	logbr()
}

function log_h2(msg) {
	logbr()
	log(".h2 " + msg)
	logbr()
}

function log_h3(msg) {
	logbr()
	log(".h3 " + msg)
	logbr()
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

function array_insert_pair(array, index, key, value) {
	for (let i = array.length; i > index; i -= 2) {
		array[i] = array[i-2]
		array[i+1] = array[i-1]
	}
	array[index] = key
	array[index+1] = value
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

// Map as plain sorted array of key/value pairs

function map_set(map, key, value) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m<<1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else {
			map[(m<<1)+1] = value
			return
		}
	}
	array_insert_pair(map, a<<1, key, value)
}
