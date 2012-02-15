var Protocol = require('./proto').Protocol;
var natural = require('natural');
var colors = require('irc').colors;

process.stdin.resume();
var proto = new Protocol(process.stdin, process.stdout);

function say(chan, text) {
	proto.write({type: 'say', args: [chan, text]});
}

function log(info) {
	proto.write({log: info.toString()});
}
console.log = log;

var commitTimer;
const commitDelay = 5000;

var classifier;
var dirty = false;

proto.on('message', function (nick, to, text) {
	var chan = to[0] == '#' && to;
	if (!chan)
		return;
	log('> ' + nick + ': ' + text);

	if (!classifier)
		return;
	if (nick.match(/eris/i))
		return;
	var m = text.match(/^\s*who\s+would\s+say(.*)/i);
	if (m) {
		var target = m[1];
		console.log('Classifying ' + target);
		if (dirty) {
			classifier.train();
			dirty = false;
		}
		try {
			var who = classifier.classify(target);
			say(chan, "That would be " + who + ".");
		}
		catch (e) {
			console.error(e);
			say(chan, "Couldn't figure that out.");
		}
		return;
	}

	if (text.match(/>2012/)) {
		say(chan, colors.wrap('dark_green', ">not being a bot"));
		//say(chan, "ISHYGDDT");
	}
	else if (text.match(/greentext/i)) {
		var msg;
		if (text.indexOf('\u000303') >= 0 || text.indexOf('\u00033') >= 0) {
			msg = '>greentexting';
		}
		else
			msg = colors.wrap('dark_green', ">not greentexting");
		say(chan, msg);
		//say(chan, 'ISHYGDDT');
	}
	else {
		var m = text.match(/^>(.*)$/i);
		if (m) {
			var before = '', msg = m[1], after = 'ing';
			m = msg.match(/^(bot|lagann|eris)\s+(.*)/i);
			if (m) {
				before = m[1] + ' ';
				msg = m[2];
			}
			if (msg.match(/ing/i))
				after = '';
			say(chan, colors.wrap('dark_green', '>' + before + 'not ' + msg + after));
		}
	}

	classifier.addDocument(text, nick);
	dirty = true;
	if (commitTimer)
		clearTimeout(commitTimer);
	commitTimer = setTimeout(commitClassifier, commitDelay);
});

function commitClassifier() {
	commitTimer = 0;
	if (dirty) {
		classifier.train();
		dirty = false;
	}
	classifier.save('classifier.json', function (err) {
		if (err)
			console.error("Couldn't save classifier: " + err);
		else
			console.log("Saved classifier.");
	});
}

proto.on('startup', function (chans) {
	natural.BayesClassifier.load('classifier.json', null, function (err, cls) {
		if (err) {
			console.error(err);
			console.error("Making new classifier");
			classifier = new natural.BayesClassifier();
		}
		else {
			console.log("Loaded classifier");
			classifier = cls;
		}
	});
});

var MINE = 'nono';

proto.on('join', function (chan, nick) {
	//if (nick == MINE)
	//	say(chan, "My body is ready.");
});

/*
proto.on('json', function (msg) {
	console.error(msg);
});
*/


/*
	names: 'chan,nicks',
	topic: 'chan,topic,nick',
	join: 'chan,nick',
	part: 'nick,reason',
	quit: 'nick,reason,chans',
	kick: 'chan,nick,by,reason',
	kill: 'nick,reason,chans',
	message: 'nick,to,text',
	notice: 'nick,to,text',
	pm: 'nick,text',
	nick: 'oldNick,newNick,chans',
	invite: 'chan,from',
	'+mode': 'chan,by,mode,arg',
	'-mode': 'chan,by,mode,arg',
	whois: 'info',
	error: 'message',
*/
