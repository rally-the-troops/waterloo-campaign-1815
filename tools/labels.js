const data = require('../data.js')

const yoff = 1555
const xoff = 36
const hex_dx = 58.67
const hex_dy = 68
const hex_r = 56 >> 1

const CAPS = [ 1204, 1217, 1737, 2911, 3002, 3925 ]

var hex_x = []
var hex_y = []

for (let row = 0; row < data.map.rows; ++row) {
	for (let col = 0; col < data.map.cols; ++col) {
		let hex_id = 1000 + 100 * row + col
		hex_x[hex_id] = Math.floor(xoff + hex_dx * (col + (row & 1) * 0.5 + 0.5))
		hex_y[hex_id] = Math.floor(yoff - hex_dy * 3 / 4 * row + hex_dy/2)
	}
}

for (let hex in data.map.names) {
	hex = hex | 0
	let name = data.map.names[hex]
	let x = hex_x[hex] - 35
	let y = hex_y[hex]
	if (CAPS.includes(hex))
		console.log(`<div class="label caps" style="left:${x}px;top:${y}px">${name}</div>`)
	else
		console.log(`<div class="label" style="left:${x}px;top:${y}px">${name}</div>`)
}
