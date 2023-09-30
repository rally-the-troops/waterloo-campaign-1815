"use strict"

/* global data, view, action_button, send_action, scroll_with_middle_mouse */

/*
 * CONSTANTS AND LISTS
 */

const DICE = {
	D0: '<span class="dice d0"></span>',
	D1: '<span class="dice d1"></span>',
	D2: '<span class="dice d2"></span>',
	D3: '<span class="dice d3"></span>',
	D4: '<span class="dice d4"></span>',
	D5: '<span class="dice d5"></span>',
	D6: '<span class="dice d6"></span>',
}

const yoff = 1555
const xoff = 36
const hex_dx = 58.67
const hex_dy = 68
const hex_r = 56 >> 1

const TURN_X = 20 - 70 + 35 + 8 + 20
const TURN_Y = 1745 + 20
const TURN_DX = 70

const REINF_OFFSET = {
	1015: [ hex_dx/2, hex_dy * 3/4 ],
	1017: [ hex_dx/2, hex_dy * 3/4 ],
	1018: [ -hex_dx/2, hex_dy * 3/4 ],
	1020: [ -hex_dx/2, hex_dy * 3/4 ],
	3000: [ -hex_dx/2, 0 ],
	3241: [ hex_dx/2, 0 ],
	4015: [ 0, -hex_dy * 3/8 ],
}

const P1 = "French"
const P2 = "Coalition"

const ELIMINATED = 0
const REINFORCEMENTS = 100
const AVAILABLE_P1 = 101
const AVAILABLE_P2 = 102
const BLOWN = 103

const last_corps = 22
const piece_count = 39

const first_hex = 1000
const last_hex = 4041

const adjacent_x1 = [
	[-101,-100,-1,1,99,100],
	[-100,-99,-1,1,100,101]
]

const adjacent_cn = [ "r3", "r2", "r4", "r1", "r5", "r0" ]

const data_rivers = []
const data_bridges = []

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

function make_piece_list(f) {
	let list = []
	for (let p = 0; p < data.pieces.length; ++p)
		if (f(data.pieces[p]))
			list.push(p)
	return list
}

const p1_corps = make_piece_list(p => p.side === P1 && (p.type === "inf" || p.type === "cav"))
const p2_corps = make_piece_list(p => p.side !== P1 && (p.type === "inf" || p.type === "cav"))
const p1_det = make_piece_list(p => p.side === P1 && p.type === "det")
const p2_det = make_piece_list(p => p.side !== P1 && p.type === "det")

function find_piece(name) {
	let id = data.pieces.findIndex(pc => pc.name === name)
	if (id < 0)
		throw new Error("PIECE NOT FOUND: " + name)
	return id
}

const OLD_GUARD = find_piece("Old Guard")
const GRAND_BATTERY = find_piece("Grand Battery")
const IMPERIAL_GUARD = find_piece("Guard Corps (Drouot)")
const IMPERIAL_GUARD_CAV = find_piece("Guard Cav Corps (Guyot)")

for (let info of data.reinforcements)
	info.list = info.list.map(name => find_piece(name))

/*
 * INIT UI
 */

let ui = {
	header: document.querySelector("header"),
	arrow: document.getElementById("arrow"),
	hexes: new Array(last_hex+1).fill(null),
	hex_x: new Array(last_hex+1).fill(0),
	hex_y: new Array(last_hex+1).fill(0),
	pieces: [
		document.getElementById("french_hq_1"),
		document.getElementById("french_hq_2"),
		document.getElementById("french_hq_3"),
		document.getElementById("anglo_hq_1"),
		document.getElementById("prussian_hq_1"),
		document.getElementById("french_corps_1"),
		document.getElementById("french_corps_2"),
		document.getElementById("french_corps_3"),
		document.getElementById("french_corps_4"),
		document.getElementById("french_corps_5"),
		document.getElementById("french_corps_6"),
		document.getElementById("french_corps_7"),
		document.getElementById("french_corps_8"),
		document.getElementById("anglo_corps_1"),
		document.getElementById("anglo_corps_2"),
		document.getElementById("anglo_corps_3"),
		document.getElementById("anglo_corps_4"),
		document.getElementById("anglo_corps_5"),
		document.getElementById("prussian_corps_1"),
		document.getElementById("prussian_corps_2"),
		document.getElementById("prussian_corps_3"),
		document.getElementById("prussian_corps_4"),
		document.getElementById("prussian_corps_5"),
		document.getElementById("french_detachment_1"),
		document.getElementById("french_detachment_2"),
		document.getElementById("french_detachment_3"),
		document.getElementById("french_detachment_4"),
		document.getElementById("french_detachment_5"),
		document.getElementById("french_detachment_6"),
		document.getElementById("anglo_detachment_1"),
		document.getElementById("anglo_detachment_2"),
		document.getElementById("anglo_detachment_3"),
		document.getElementById("anglo_detachment_4"),
		document.getElementById("prussian_detachment_1"),
		document.getElementById("prussian_detachment_2"),
		document.getElementById("prussian_detachment_3"),
		document.getElementById("prussian_detachment_4"),
		document.getElementById("prussian_detachment_5"),
		document.getElementById("prussian_detachment_6"),
	],
	stack: new Array(last_hex+1).fill(0),
	turn: document.getElementById("marker_turn"),
	remain: document.getElementById("marker_remain"),
	french_moves: document.getElementById("marker_french_moves"),
	prussian_moves: document.getElementById("marker_prussian_moves"),
	french_vp: document.querySelector("#role_French .role_vp"),
	coalition_vp: document.querySelector("#role_Coalition .role_vp"),
}

for (let row = 0; row < data.map.rows; ++row) {
	for (let col = 0; col < data.map.cols; ++col) {
		let hex_id = first_hex + 100 * row + col
		let hex_x = ui.hex_x[hex_id] = Math.floor(xoff + hex_dx * (col + (row & 1) * 0.5 + 0.5))
		let hex_y = ui.hex_y[hex_id] = Math.floor(yoff - hex_dy * 3 / 4 * row + hex_dy/2)

		let hex = ui.hexes[hex_id] = document.createElement("div")
		hex.className = "hex"
		hex.style.left = (hex_x - hex_r) + "px"
		hex.style.top = (hex_y - hex_r) + "px"
		hex.style.width = (hex_r * 2) + "px"
		hex.style.height = (hex_r * 2) + "px"
		hex.onmousedown = on_click_action
		hex.onmouseenter = on_focus_hex
		hex.onmouseleave = on_blur_hex
		hex.my_action = "hex"
		hex.my_action_2 = "stop_hex"
		hex.my_id = hex_id
		if (data.map.names[hex_id])
			hex.my_name = String(hex_id) + " (" + data.map.names[hex_id] + ")"
		else
			hex.my_name = String(hex_id)

		document.getElementById("hexes").appendChild(hex)
	}
}

for (let p = 0; p < ui.pieces.length; ++p) {
	ui.pieces[p].onmousedown = on_click_action
	ui.pieces[p].onmouseenter = on_focus_piece
	ui.pieces[p].onmouseleave = on_blur_piece
	ui.pieces[p].my_action = "piece"
	ui.pieces[p].my_id = p
	ui.pieces[p].my_name = data.pieces[p].name
}

scroll_with_middle_mouse("main")

/*
 * TOOLTIPS & ACTIONS
 */

function toggle_pieces() {
	document.getElementById("pieces").classList.toggle("hide")
}

function toggle_hexes() {
	// Cycle between showing nothing, command ranges, and zocs
	let elt = document.getElementById("hexes")
	if (elt.className == "")
		elt.className = "p1hq"
	else if (elt.className == "p1hq")
		elt.className = "p2hq"
	else if (elt.className == "p2hq")
		elt.className = "p1zoc"
	else if (elt.className == "p1zoc")
		elt.className = "p2zoc"
	else if (elt.className == "p2zoc")
		elt.className = ""
}

function is_action(action, arg) {
	if (arg === undefined)
		return !!(view.actions && view.actions[action] === 1)
	return !!(view.actions && view.actions[action] && set_has(view.actions[action], arg))
}

function on_click_action(evt) {
	if (evt.button === 0) {
		if (send_action(evt.target.my_action, evt.target.my_id))
			evt.stopPropagation()
		if (evt.target.my_action_2)
			if (send_action(evt.target.my_action_2, evt.target.my_id))
				evt.stopPropagation()
	}
}

function on_focus_hex_tip(id) {
	ui.hexes[id].classList.add("tip")
}

function on_blur_hex_tip(id) {
	ui.hexes[id].classList.remove("tip")
}

function on_click_hex_tip(id) {
	ui.hexes[id].scrollIntoView({ block:"center", inline:"center", behavior:"smooth" })
}

function on_focus_piece_tip(id) {
	ui.pieces[id].classList.add("tip")
}

function on_blur_piece_tip(id) {
	ui.pieces[id].classList.remove("tip")
}

function on_click_piece_tip(id) {
	ui.pieces[id].scrollIntoView({ block:"center", inline:"center", behavior:"smooth" })
}

function on_blur() {
	document.getElementById("status").textContent = ""
}

var focused_piece = -1

function on_focus_piece(evt) {
	let p = evt.target.my_id
	document.getElementById("status").textContent = evt.target.my_name
	if (data.pieces[p].type === "hq") {
		focused_piece = p
		show_hq_range(p)
	}
}

function on_blur_piece(evt) {
	let p = evt.target.my_id
	on_blur()
	if (data.pieces[p].type === "hq") {
		focused_piece = -1
		hide_hq_range(p)
	}
}

function on_focus_hex(evt) {
	document.getElementById("status").textContent = "Hex " + evt.target.my_name
	if (view && view.move_from)
		show_move_path(evt.target.my_id)
}

function on_blur_hex() {
	on_blur()
	hide_move_path()
}

/*
 * SHOW PATH (FOR MOVE ACTIONS)
 */

var _move_path = []

function hide_move_path() {
	if (_move_path) {
		for (let x of _move_path) {
			ui.hexes[x].classList.remove("move")
			ui.hexes[x].classList.remove("road")
		}
		_move_path = null
	}
}

function show_move_path(x) {
	if (_move_path)
		hide_move_path()

	if (!is_action("hex", x) && !is_action("stop_hex", x))
		return

	if (view.move_from && map_get(view.move_from, x, 0)) {
		_move_path = []
		for (let i = 0; x && i < 100; ++i) {
			_move_path.push(x)
			x = map_get(view.move_from, x, 0)
		}
		for (let x of _move_path)
			ui.hexes[x].classList.add("move")
	}

	else

	if (view.move_from_road && map_get(view.move_from_road, x, 0)) {
		_move_path = []
		for (let i = 0; x && i < 100; ++i) {
			_move_path.push(x)
			x = map_get(view.move_from_road, x, 0)
		}
		for (let x of _move_path)
			ui.hexes[x].classList.add("road")
	}

}

/*
 * SHOW HQ RANGE (FOR HQ MOUSEOVER)
 */

function is_on_range(x, hq) {
	let hq_x = view.pieces[hq] >> 1
	if (hq_x >= 1000) {
		let hq_m = view.pieces[hq] & 1
		let hq_r = hq_m ? data.pieces[hq].range2 : data.pieces[hq].range1
		return calc_distance(x, hq_x) === hq_r
	}
	return false
}

function is_in_range(x, hq) {
	let hq_x = view.pieces[hq] >> 1
	if (hq_x >= 1000) {
		let hq_m = view.pieces[hq] & 1
		let hq_r = hq_m ? data.pieces[hq].range2 : data.pieces[hq].range1
		return calc_distance(x, hq_x) <= hq_r
	}
	return false
}

function show_hq_range(hq) {
	for (let row = 0; row < data.map.rows; ++row) {
		for (let col = 0; col < data.map.cols; ++col) {
			let id = first_hex + row * 100 + col
			if (hq <= 2)
				ui.hexes[id].classList.toggle("f_range", is_on_range(id, hq))
			else if (hq === 3)
				ui.hexes[id].classList.toggle("a_range", is_on_range(id, hq))
			else if (hq === 4)
				ui.hexes[id].classList.toggle("p_range", is_on_range(id, hq))
		}
	}
}

function hide_hq_range() {
	for (let row = 0; row < data.map.rows; ++row) {
		for (let col = 0; col < data.map.cols; ++col) {
			let id = first_hex + row * 100 + col
			ui.hexes[id].classList.remove("f_range")
			ui.hexes[id].classList.remove("a_range")
			ui.hexes[id].classList.remove("p_range")
		}
	}
}

/*
 * UPDATE UI
 */

function is_piece_support(id) {
	if (view.support)
		return view.support & (1 << id)
	return false
}

function on_update() {
	ui.stack.fill(0)

	update_zoc()

	if (search_brussels_path())
		ui.french_vp.textContent = count_french_vp() + " + 5 VP"
	else
		ui.french_vp.textContent = count_french_vp() + " + 0 VP"

	ui.coalition_vp.textContent = count_coalition_vp() + " VP"

	if (!view.move_path)
		hide_move_path()

	for (let row = 0; row < data.map.rows; ++row) {
		for (let col = 0; col < data.map.cols; ++col) {
			let id = first_hex + row * 100 + col
			ui.hexes[id].classList.toggle("action", is_action("hex", id) || is_action("stop_hex", id))
			ui.hexes[id].classList.toggle("stop", is_action("stop_hex", id))
			ui.hexes[id].classList.toggle("p1zoc", is_p1_zoc(id))
			ui.hexes[id].classList.toggle("p1zoi", is_p1_zoi(id))
			ui.hexes[id].classList.toggle("p2zoc", is_p2_zoc(id))
			ui.hexes[id].classList.toggle("p2zoi", is_p2_zoi(id))
			ui.hexes[id].classList.toggle("p1hq", is_in_range(id, 0) || is_in_range(id, 1) || is_in_range(id, 2))
			ui.hexes[id].classList.toggle("p2hq", is_in_range(id, 3) || is_in_range(id, 4))
		}
	}

	if (focused_piece >= 0)
		show_hq_range(focused_piece)

	if (view.who >= 0 && view.target >= 0) {
		let wx = view.pieces[view.who] >> 1
		let tx = view.pieces[view.target] >> 1
		if (wx >= 1000 && tx >= 1000 && calc_distance(wx, tx) === 1) {
			ui.arrow.style.left = (ui.hex_x[wx] - 25) + "px"
			ui.arrow.style.top = (ui.hex_y[wx] - 50) + "px"
			for (let i = 0; i < 6; ++i) {
				let dx = adjacent_x1[wx / 100 & 1][i]
				if (tx - wx === dx)
					ui.arrow.className = adjacent_cn[i]
			}
		} else {
			ui.arrow.className = "hide"
		}
	} else {
		ui.arrow.className = "hide"
	}

	for (let id = 0; id < piece_count; ++id) {
		let hex = view.pieces[id] >> 1
		let z = 0
		let s = 0
		if (hex > BLOWN && hex < BLOWN + 20)
			hex -= BLOWN
		if (hex >= first_hex || hex === REINFORCEMENTS) {
			// ON MAP
			ui.pieces[id].classList.remove("hide")
			ui.pieces[id].classList.toggle("flip", (view.pieces[id] & 1) === 1)
			let x, y
			if (hex === REINFORCEMENTS) {
				hex = find_reinforcement_hex(id)
				if (typeof hex !== "number")
					hex = hex[0]
				s = find_reinforcement_z(id)
				z = 4 - s
				x = ui.hex_x[hex] + s * 24
				y = ui.hex_y[hex] + s * 18
				if (REINF_OFFSET[hex]) {
					x += REINF_OFFSET[hex][0]
					y += REINF_OFFSET[hex][1]
				}
			} else {
				s = z = ui.stack[hex]++
				x = ui.hex_x[hex] - s * 18
				y = ui.hex_y[hex] + s * 12
			}
			if (id <= last_corps) {
				x -= (46>>1)
				y -= (46>>1)
			} else {
				x -= (38>>1)
				y -= (38>>1)
			}
			ui.pieces[id].style.top = y + "px"
			ui.pieces[id].style.left = x + "px"
			ui.pieces[id].style.zIndex = z
		} else if (hex >= AVAILABLE_P1 && hex <= BLOWN) {
			// OFF MAP DETACHMENTS / LEADERS / REINFORCEMENTS
			ui.pieces[id].classList.remove("hide")
			ui.pieces[id].classList.toggle("flip", (view.pieces[id] & 1) === 1)
			let x = 600 + 40 + ui.stack[hex] * 60 + 40
			let y = 1650 + 40 + 60 * (hex-AVAILABLE_P1) + 20
			ui.stack[hex] += 1
			ui.pieces[id].style.top = y + "px"
			ui.pieces[id].style.left = x + "px"
			ui.pieces[id].style.zIndex = 0
		} else if (hex >= 1 && hex <= 20) {
			// ON TURN TRACK
			ui.pieces[id].classList.remove("hide")
			ui.pieces[id].classList.remove("flip")
			let x = TURN_X + hex * TURN_DX - ui.stack[hex] * 18
			let y = TURN_Y + ui.stack[hex] * 12
			ui.stack[hex] += 1
			if (id <= last_corps) {
				x -= (46>>1)
				y -= (46>>1)
			} else {
				x -= (38>>1)
				y -= (38>>1)
			}
			ui.pieces[id].style.top = y + "px"
			ui.pieces[id].style.left = x + "px"
		} else {
			// ELIMINATED or SWAPPED
			ui.pieces[id].classList.add("hide")
		}
		//if (is_action("piece", id)) z = 101
		if (view.target === id) z = 102
		if (view.who === id) z = 103
		ui.pieces[id].style.zIndex = z
		ui.pieces[id].classList.toggle("action", is_action("piece", id))
		ui.pieces[id].classList.toggle("selected", view.who === id)
		ui.pieces[id].classList.toggle("target", view.target === id)
		ui.pieces[id].classList.toggle("support", is_piece_support(id))
	}

	ui.turn.style.left = (40 + TURN_X + (view.turn-1) * TURN_DX) + "px"
	ui.turn.classList.toggle("flip", view.rain === 2)

	if (view.remain > 0) {
		ui.remain.style.left = (20 + 109 + (view.remain % 10) * 47.5 | 0) + "px"
		ui.remain.classList.toggle("flip", view.remain > 9)
		ui.remain.classList.remove("hide")
	} else {
		ui.remain.classList.add("hide")
	}

	if (view.french_moves !== undefined) {
		let x = (20 + 109 + (view.french_moves % 10) * 47.5 | 0)
		ui.french_moves.style.left = x + "px"
		ui.french_moves.classList.toggle("flip", view.french_moves > 9)
		ui.french_moves.classList.remove("hide")
	} else {
		ui.french_moves.classList.add("hide")
	}

	if (view.prussian_moves !== undefined) {
		let x = (20 + 109 + (view.prussian_moves % 10) * 47.5 | 0)
		let y = 1857
		if (view.prussian_moves === view.french_moves) {
			x += 12
			y -= 12
		}
		ui.prussian_moves.style.left = x + "px"
		ui.prussian_moves.style.top = y + "px"
		ui.prussian_moves.classList.toggle("flip", view.prussian_moves > 9)
		ui.prussian_moves.classList.remove("hide")
	} else {
		ui.prussian_moves.classList.add("hide")
	}

	action_button("blow", "Blow")
	action_button("roll", "Roll")
	action_button("next", "Next")
	action_button("end_step", "End step")
	action_button("end_turn", "End turn")
	action_button("pass", "Pass")
	action_button("undo", "Undo")
}

/*
 * LOG
 */

function sub_hex(match, p1) {
	let x = p1 | 0
	let n = data.map.names[x]
	if (n)
		n = x + " " + n
	else
		n = x
	return `<span class="tip" onmouseenter="on_focus_hex_tip(${x})" onmouseleave="on_blur_hex_tip(${x})" onclick="on_click_hex_tip(${x})">${n}</span>`
}

function sub_piece(match, p1) {
	let x = p1 | 0
	let n = data.pieces[x].name
	let c = "piece"
	if (data.pieces[x].side === "Anglo")
		c = "tip anglo"
	else if (data.pieces[x].side === "Prussian")
		c = "tip prussian"
	else if (data.pieces[x].side === "French")
		c = "tip french"
	return `<span class="${c}" onmouseenter="on_focus_piece_tip(${x})" onmouseleave="on_blur_piece_tip(${x})" onclick="on_click_piece_tip(${x})">${n}</span>`
}

function on_log(text) {
	let p = document.createElement("div")

	if (text.match(/^>/)) {
		text = text.substring(1)
		p.className = 'i'
	}

	text = text.replace(/&/g, "&amp;")
	text = text.replace(/</g, "&lt;")
	text = text.replace(/>/g, "&gt;")

	text = text.replace(/\b(\d\d\d\d)\b/g, sub_hex)
	text = text.replace(/P(\d+)/g, sub_piece)
	text = text.replace(/\bD\d\b/g, match => DICE[match])

	text = text.replace(/^French/g, '<span class="french">French</span>')
	text = text.replace(/^Coalition/g, '<span class="anglo">Coalition</span>')

	if (text.match(/^\.h1 /)) {
		text = text.substring(4)
		p.className = "h1"
	}
	else if (text.match(/^\.h2/)) {
		text = text.substring(4)
		p.className = "h2"
	}
	else if (text.match(/^\.h3/)) {
		text = text.substring(4)
		p.className = "h3"
	}

	p.innerHTML = text
	return p
}

/*
 * COPIED FROM RULES
 */

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

function set_has(set, item) {
	if (!set)
		return false
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

function map_get(map, key, missing) {
	let a = 0
	let b = (map.length >> 1) - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = map[m<<1]
		if (key < x)
			b = m - 1
		else if (key > x)
			a = m + 1
		else
			return map[(m<<1)+1]
	}
	return missing
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

var move_seen = new Array(last_hex - 999).fill(0)
var zoc_cache = new Array(data.map.rows * 100).fill(0)

function is_map_hex(x) {
	if (x >= 1000 && x <= 4041)
		return x % 100 <= 41
	return false
}

function is_river(a, b) {
	return set_has(data_rivers, a * 10000 + b)
}

function is_bridge(a, b) {
	return set_has(data_bridges, a * 10000 + b)
}

function piece_hex(p) {
	return view.pieces[p] >> 1
}

function for_each_adjacent(x, f) {
	for (let dx of adjacent_x1[x / 100 & 1]) {
		let nx = x + dx
		if (is_map_hex(nx))
			f(nx)
	}
}

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
	zoc_cache.fill(0)
	update_zoc_imp(1, 4, p1_corps)
	update_zoc_imp(1, 0, p1_det)
	update_zoc_imp(16, 64, p2_corps)
	update_zoc_imp(16, 0, p2_det)
}

function is_p1_zoc(x) { return (zoc_cache[x-1000] & 1) > 0 }
function is_p1_zoi(x) { return (zoc_cache[x-1000] & 4) > 0 }
function is_p2_zoc(x) { return (zoc_cache[x-1000] & 16) > 0 }
function is_p2_zoi(x) { return (zoc_cache[x-1000] & 64) > 0 }

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

function find_reinforcement_hex(who) {
	for (let info of data.reinforcements)
		for (let p of info.list)
			if (p === who)
				return info.hex
	return REINFORCEMENTS
}

function find_reinforcement_z(who) {
	for (let info of data.reinforcements) {
		let n = 0
		for (let p of info.list) {
			if (p === who)
				return n
			if ((view.pieces[p] >> 1) === REINFORCEMENTS)
				++n
		}
	}
	return 0
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
