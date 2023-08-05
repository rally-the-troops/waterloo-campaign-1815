"use strict"

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

function array_insert(array, index, item) {
	for (let i = array.length; i > index; --i)
		array[i] = array[i - 1]
	array[index] = item
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
	if (hex / 100 & 1) {
		fn(hex - 100)
		fn(hex - 99)
		fn(hex - 1)
		fn(hex + 1)
		fn(hex + 100)
		fn(hex + 101)
	} else {
		fn(hex - 101)
		fn(hex - 100)
		fn(hex - 1)
		fn(hex + 1)
		fn(hex + 99)
		fn(hex + 100)
	}
}

function search2(list, a, max) {
	for_each_adjacent(a, (b) => {
		set_add(list, b)
		for_each_adjacent(b, (c) => {
			set_add(list, c)
			for_each_adjacent(c, (d) => {
				set_add(list, d)
			})
		})
	})
}

function search(list, start, max) {
	let seen = [ start ]
	let queue = [ start << 8 ]
	while (queue.length > 0) {
		let item = queue.shift()
		let here = (item >> 8)
		let cost = (item & 255) + 1
		for_each_adjacent(here, next => {
			if (!set_has(seen, next)) {
				set_add(seen, next)
				set_add(list, next)
				if (cost < max)
					queue.push(next << 8 | cost)
			}
		})
	}
}

function mklist(search,n) {
	let a, b
	search(a=[], 2050, n)
	a=a.map(x=>x-2050)
	search(b=[], 2150, n)
	b=b.map(x=>x-2150)
	console.log("const ADJACENT_X" + n + " = [")
	console.log("\t" + JSON.stringify(a) + ",")
	console.log("\t" + JSON.stringify(b))
	console.log("]")
}

mklist(search, 1)
mklist(search, 2)
mklist(search, 3)
