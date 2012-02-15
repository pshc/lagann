var EventEmitter = require('events').EventEmitter,
    util = require('util');

function Protocol(input, output) {
	EventEmitter.call(this);
	this.input = input;
	this.output = output;
	this.buf = [];
	input.on('data', this.onData.bind(this));
	input.once('end', this.onEnd.bind(this));
}
util.inherits(Protocol, EventEmitter);
exports.Protocol = Protocol;
var P = Protocol.prototype;

// dead stupid but simple
P.onData = function (data) {
	var len = data.length;
	for (var i = 0; i < len; i++) {
		var c = data[i];
		if (c != 0) {
			this.buf.push(c);
			continue;
		}
		var msg = new Buffer(this.buf);
		this.buf = [];
		try {
			msg = msg.toString("UTF-8");
		}
		catch (e) {
			console.error("Not valid UTF-8: " + msg + "\n" + e.toString());
			continue;
		}
		try {
			msg = JSON.parse(msg);
		}
		catch (e) {
			console.error("Not valid JSON: " + msg + "\n" + e.toString());
			continue;
		}
		try {
			this.emit('json', msg);
			if (msg.type) {
				var args = msg.args.slice();
				args.unshift(msg.type);
				this.emit.apply(this, args);
			}
		}
		catch (e) {
			console.error(e.toString());
		}
	}
};

P.onEnd = function () {
	this.emit('end');
};

var eom = new Buffer([0]);
P.write = function (msg) {
	msg = JSON.stringify(msg);
	if (msg.indexOf('\0') >= 0) {
		console.warn("Found null in " + msg);
		return;
	}
	this.output.write(msg);
	this.output.write(eom);
};
