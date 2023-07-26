"use strict"

const FRENCH = "French"
const COALITION = "Coalition"

var game = null
var view = null
var states = {}

exports.roles = [ FRENCH, COALITION ]
exports.scenarios = [ "June 16-18", "June 15-18" ]

exports.setup = function (seed, scenario, options) {
	return {
		seed,
		scenario,
		undo: [],
		log: [],
		active: FRENCH,
		state: "setup",
		pieces: [],
	}
}

exports.view = function (state) {
	return state
}
