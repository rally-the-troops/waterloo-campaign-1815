"use strict"

const last_corps = 22
const piece_count = 39

const first_hex = 1000
const last_hex = 4041

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

function on_click_hex(evt) {
	if (evt.button === 0) {
		if (send_action('hex', evt.target.my_id))
			evt.stopPropagation()
	}
}

function toggle_pieces() {
	document.getElementById("pieces").classList.toggle("hide")
}

function build_hexes() {
	let yoff = 1555
	let xoff = 36
	let hex_dx = 58.67
	let hex_dy = 68
	let hex_r = 62 >> 1

	for (let y = 0; y < data.map.rows; ++y) {
		for (let x = 0; x < data.map.cols; ++x) {
			let hex_id = first_hex + 100 * y + x
			let hex_x = ui.hex_x[hex_id] = Math.floor(xoff + hex_dx * (x + (y & 1) * 0.5 + 0.5))
			let hex_y = ui.hex_y[hex_id] = Math.floor(yoff - hex_dy * 3 / 4 * y + hex_dy/2)

			let hex = ui.hexes[hex_id] = document.createElement("div")
			hex.className = "hex"
			hex.style.left = (hex_x - hex_r) + "px"
			hex.style.top = (hex_y - hex_r) + "px"
			hex.addEventListener("mousedown", on_click_hex)
			hex.addEventListener("mouseenter", on_focus_hex)
			hex.addEventListener("mouseleave", on_blur)
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

function on_update() {
	ui.stack.fill(0)

	for (let row = 0; row < data.map.rows; ++row) {
		for (let col = 0; col < data.map.cols; ++col) {
			let id = first_hex + row * 100 + col
			ui.hexes[id].classList.toggle("action", is_action("hex", id))
		}
	}

	for (let id = 0; id < piece_count; ++id) {
		let hex = view.pieces[id] >> 1
		if (hex >= first_hex) {
			ui.pieces[id].classList.remove("hide")
			ui.pieces[id].classList.toggle("flip", (view.pieces[id] & 1) === 1)
			let x = ui.hex_x[hex] - ui.stack[hex] * 18
			let y = ui.hex_y[hex] + ui.stack[hex] * 12
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
		} else if (hex >= 1) {
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
			ui.pieces[id].classList.add("hide")
		}
		ui.pieces[id].classList.toggle("action", is_action("piece", id))
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

	action_button("edit_town", "Town")
	action_button("edit_stream", "Stream")
	action_button("edit_road", "Road")

	action_button("next", "Next")
	action_button("pass", "Pass")
	action_button("undo", "Undo")
}

build_hexes()
scroll_with_middle_mouse("main")
