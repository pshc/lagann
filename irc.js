var irc = require('irc'),
    Protocol = require('./proto').Protocol,
    spawn = require('child_process').spawn,
    util = require('util');

var client = new irc.Client('irc.opera.com', 'lagann', {
	channels: ['#uweng'],
	userName: 'gurren',
	realName: 'Tengen Toppa',
	floodProtection: true,
});

var repl = require('repl').start();
repl.context.client = client;
repl.context.reload = reload;

var backend, protocol;

function setup() {
	backend = spawn('node', ['bot.js']);
	console.log('Loading backend, pid ' + backend.pid);
	backend.stderr.pipe(process.stderr, {end: false});
	backend.stderr.on('error', killBackend);
	backend.stdin.on('error', killBackend);
	backend.stdout.on('error', killBackend);
	backend.stdin.resume()
	protocol = new Protocol(backend.stdout, backend.stdin);

	repl.context.backend = backend;
	repl.context.protocol = protocol;

	protocol.on('json', onBackend);
	backend.on('exit', onExit);
	protocol.write({type: 'startup', args: [client.chans]});
}
setup();

function onBackend(msg) {
	if (msg.log)
		console.log('Log: ' + msg.log);
	else if (msg.type && msg.args)
		client[msg.type].apply(client, msg.args);
	else
		console.warn("Ignored message: " + util.inspect(msg));
}

function onExit(code) {
	console.error('Backend quit unexpectedly with code ' + code);
	// should restart it
}

function killBackend(err) {
	if (err /*&& err.code != 'EBADF'*/) {
		console.error('Error: ' + err);
	}
	backend.stdin.destroy();
	backend.stdout.destroy();
	backend.stderr.destroy();
	backend.kill();
}

function reload() {
	protocol.removeListener('message', onBackend);
	backend.removeListener('exit', onExit);
	backend.once('exit', function () {
		console.log('Restarting.');
		setup();
	});
	killBackend();
}

function setupEvents(events) {
	events.forEach(function (ev) {
		client.removeAllListeners(ev);
		client.on(ev, function () {
			protocol.write({type: ev, args: [].slice.call(arguments)});
		});
	});
}

var ircEvents = 'names,topic,join,part,quit,kick,kill,message,pm,nick,invite,+mode,-mode,whois,error'.split(',');

setupEvents(ircEvents);
