"use strict"

const ELIMINATED = 0
const SWAPPED = 200
const REINFORCEMENTS = 100
const AVAILABLE_P1 = 101
const AVAILABLE_P2 = 102
const BLOWN = 103

const last_corps = 22
const piece_count = 39

const first_hex = 1000
const last_hex = 4041

function find_piece(name) {
	let id = data.pieces.findIndex(pc => pc.name === name)
	if (id < 0)
		throw new Error("PIECE NOT FOUND: " + name)
	return id
}

for (let info of data.reinforcements)
	info.list = info.list.map(name => find_piece(name))

let yoff = 1555
let xoff = 36
let hex_dx = 58.67
let hex_dy = 68
let hex_r = 56 >> 1

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

const FRENCH = "French"
const COALITION = "Coalition"

const TURN_X = 20 - 70 + 35 + 8
const TURN_Y = 1745
const TURN_DX = 70

const REINF_OFFSET = {
	1015: [ hex_dx/2, hex_dy * 3/4 ],
	1018: [ -hex_dx/2, hex_dy * 3/4 ],
	1020: [ -hex_dx/2, hex_dy * 3/4 ],
	3000: [ -hex_dx/2, 0 ],
	3241: [ hex_dx/2, 0 ],
	4015: [ 0, -hex_dy * 3/8 ],
}

let ui = {
	hexes: new Array(last_hex+1).fill(null),
	sides: new Array((last_hex+1)*3).fill(null),
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
}

function toggle_pieces() {
	document.getElementById("pieces").classList.toggle("hide")
}

function on_blur(evt) {
	document.getElementById("status").textContent = ""
}

function on_focus_hex(evt) {
	document.getElementById("status").textContent = "Hex " + evt.target.my_name
}

function on_focus_piece(evt) {
	document.getElementById("status").textContent = evt.target.my_name
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

function toggle_pieces() {
	document.getElementById("pieces").classList.toggle("hide")
}

function build_hexes() {
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
			hex.onmouseleave = on_blur
			hex.my_action = "hex"
			hex.my_action_2 = "stop_hex"
			hex.my_id = hex_id
			if (data.map.names[hex_id])
				hex.my_name = String(hex_id) + " (" + data.map.names[hex_id] + ")"
			else
				hex.my_name = String(hex_id)

			document.getElementById("hexes").appendChild(hex)

			//
			for (let s = 0; s < 3; ++s) {
				let side_id = (hex_id << 2) + s
				let elt = ui.sides[side_id] = document.createElement("div")
				elt.className = "hexside + s" + s
				elt.style.left = (hex_x) + "px"
				elt.style.top = (hex_y) + "px"
				document.getElementById("hexes").appendChild(elt)
			}
		}
	}

	for (let p = 0; p < ui.pieces.length; ++p) {
		ui.pieces[p].onmousedown = on_click_action
		ui.pieces[p].onmouseenter = on_focus_piece
		ui.pieces[p].onmouseleave = on_blur
		ui.pieces[p].my_action = "piece"
		ui.pieces[p].my_id = p
		ui.pieces[p].my_name = data.pieces[p].name
	}
}

function is_action(action, arg) {
	if (arg === undefined)
		return !!(view.actions && view.actions[action] === 1)
	return !!(view.actions && view.actions[action] && set_has(view.actions[action], arg))
}

function find_hex_side(a, b) {
	if (a > b)
		return find_hex_side(b, a)
	if (b === a + 1)
		return (a << 2) + 0
	if ((a/100) & 1) {
		if (b === a + 101)
			return (a << 2) + 1
		if (b === a + 100)
			return (a << 2) + 2
	} else {
		if (b === a + 100)
			return (a << 2) + 1
		if (b === a + 99)
			return (a << 2) + 2
	}
	return -1
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

function on_update() {
	ui.stack.fill(0)

	for (let row = 0; row < data.map.rows; ++row) {
		for (let col = 0; col < data.map.cols; ++col) {
			let id = first_hex + row * 100 + col
			ui.hexes[id].classList.toggle("action", is_action("hex", id) || is_action("stop_hex", id))
			ui.hexes[id].classList.toggle("stop", is_action("stop_hex", id))
		}
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
			let x = 600 + 40 + ui.stack[hex] * 60
			let y = 1650 + 40 + 60 * (hex-AVAILABLE_P1)
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
	}

	if (view.roads) {
		for (let road of view.roads) {
			for (let i = 1; i < road.length; ++i) {
				let id = find_hex_side(road[i-1], road[i])
				console.log("id", id)
				ui.sides[id].classList.add("road")
			}
		}
	}

	ui.turn.style.left = (40 + TURN_X + (view.turn-1) * TURN_DX) + "px"
	ui.turn.classList.toggle("flip", view.rain > 0)

	ui.remain.style.left = (109 + (view.remain % 10) * 47.5 | 0) + "px"
	ui.remain.classList.toggle("flip", view.remain > 9)

	action_button("roll", "Roll")
	action_button("next", "Next")
	action_button("end_step", "End step")
	action_button("pass", "Pass")
	action_button("undo", "Undo")
}

build_hexes()
scroll_with_middle_mouse("main")
