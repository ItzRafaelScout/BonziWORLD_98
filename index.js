const sqlite3 = require('sqlite3').verbose();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');

var db_connected = false;

// Load available skins from skins.txt
let availableSkins = [];
try {
	const skinsData = fs.readFileSync('skins.txt', 'utf8');
	availableSkins = skinsData.split('\n').filter(skin => skin.trim().length > 0);
	console.log('Loaded skins:', availableSkins);
} catch (err) {
	console.error('Error loading skins.txt:', err);
	availableSkins = ['purple']; // Fallback to default red skin
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files and HTML
app.use("/static", express.static(__dirname + "/public/static"));
app.get("/", (req, res) => res.sendFile(__dirname + "/public/index.html"));
app.get("/admin", (req, res) => res.sendFile(__dirname + "/public/admin.html"));

// Expose skins list API endpoint
app.get("/api/skins", (req, res) => {
	res.json(availableSkins);
});

// Users array to track connected users
let users = [];

// Socket.IO server
io.on("connection", (socket) => {

	let user = null;

	// Send list of available skins to client
	socket.on("get_skins", () => {
		socket.emit("skins_list", availableSkins);
	});

	// Handle user status updates (typing/commanding)
	socket.on("user_status", (data) => {
		if (!user) return;
		let statusData = {
			id: user.id,
			status: data.status
		};
		users.forEach(u => u.room == user.room && u.socket.emit('user_status_update', statusData));
	});

	// Handle image command
	socket.on("image", (url) => {
		if (!user) return;
		let imageData = {
			id: user.id,
			url: url
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_image', imageData));
	});

	// Handle video command
	socket.on("video", (url) => {
		if (!user) return;
		let videoData = {
			id: user.id,
			url: url
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_video', videoData));
	});

	// Handle YouTube command
	socket.on("youtube", (youtubeId) => {
		if (!user) return;
		let youtubeData = {
			id: user.id,
			youtubeId: youtubeId
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_youtube', youtubeData));
	});

	// Handle hat command
	socket.on("hat", (hatType) => {
		if (!user) return;
		let hatData = {
			id: user.id,
			hatType: hatType
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_hat', hatData));
	});

	// Handle joke command
	socket.on("joke", () => {
		if (!user) return;
		let jokeData = {
			id: user.id
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_joke', jokeData));
	});

	// Handle fact command
	socket.on("fact", () => {
		if (!user) return;
		let factData = {
			id: user.id
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_fact', factData));
	});
	
	// Handle reply message
	socket.on("reply", (data) => {
		if (!user) return;
		let replyData = {
			id: user.id,
			originalMsg: data.originalMsg,
			replyText: data.replyText,
			targetId: data.targetId
		};
		users.forEach(u => u.room == user.room && u.socket.emit('reply_message', replyData));
	});

	// Handle poll command
	socket.on("poll", () => {
		if (!user) return;
		let pollData = {
			id: user.id
		};
		users.forEach(u => u.room == user.room && u.socket.emit('display_poll', pollData));
	});

	// Handle "user joined" event
	socket.on("user joined", async (data) => {
		let row = await new Promise(resolve => {
			db.get('SELECT id FROM banned_ips WHERE ip = ?', [socket.request.connection.remoteAddress], (err, row) => {
				resolve(row);
			})
		});
		if(row) return socket.emit('alert', 'You have been banned.');
		if(!data) return;
		let good = s => typeof s == 'string' && s.length < 256 && s.length > 0 && s.indexOf('\n') == -1;
		let cnfb = (s, fb) => good(s) ? s : fb
		
		// Validate skin against available skins
		const validSkin = (skin) => good(skin) && availableSkins.includes(skin);
		const defaultSkin = 'red';
		
		if(user) {
			user.name = cnfb(data.name, 'anonymous');
			user.skin = validSkin(data.skin) ? data.skin : defaultSkin;
		} else {
			user = {
				id: Math.random().toString().slice(2),
				room: cnfb(data.room, 'general'),
				name: cnfb(data.name, 'anonymous'),
				skin: validSkin(data.skin) ? data.skin : defaultSkin,
				ip: socket.request.connection.remoteAddress,
				perms: 0,
				socket
			};
			users.push(user);
		}
		let upd = users.filter(u => u.room == user.room).map(u => ({id: u.id, name: u.name, skin: u.skin}));
		users.forEach(u => u.room == user.room && u.socket.emit('update users', upd));
	});

	// Handle "message" event
	socket.on("message", (msg) => {
		if(!msg) return;
		if (user) {
			let data = {id: user.id, message: msg};
			users.forEach(u => u.room == user.room && u.socket.emit('message', data));
		}
	});

	socket.on("modauth", (pass) => {
		db.get('SELECT perms FROM mods WHERE pass = ?', [pass], (err, row) => {
			if(row) {
				user.perms = row.perms;
				socket.emit('alert', 'Welcome back mr moderator.');
				socket.emit('modsetup');
			}
			else socket.emit('alert', 'You have been IP logged ;D');
		});
	});

	socket.on("ban", (id) => {
		if(!user.perms) return;
		let u = users.filter(x => x.id == id);
		if(!u.length) return socket.emit('alert', 'User not found!');
		u = u[0];
		if(u.perms >= user.perms) return socket.emit('alert', 'User has too high perms.');
		db.run('INSERT INTO banned_ips (ip) VALUES (?)', [u.ip], (err) => {
			if(!err) socket.emit('alert', 'User banned');
			else socket.emit('alert', 'Error: ' + err);
		});
		users.filter(u => u.id == id).forEach(u => u.socket.disconnect());
		users = users.filter(u => u.id != id);
		let us = users.toSorted((a, b) => a.room < b.room ? -1 : (a.room > b.room ? 1 : 0));
		let rds = [], j = 0;
		for(let i = 1; i < us.length+1; i++) {
			if(i == us.length || us[i].room != us[j].room) {
				rds.push(us.splice(j, i - j));
				j = i;
			}
		}
		for(let g of rds) {
			let upd = g.map(u => ({name: u.name, skin: u.skin, id: u.id}));
			g.forEach(u => u.socket.emit('update users', upd));
		}
	});

	socket.on("admin_kick", (id) => {
		if(!user.perms) return;
		let u = users.filter(x => x.id == id);
		if(!u.length) return socket.emit('alert', 'User not found!');
		u = u[0];
		if(u.perms >= user.perms) return socket.emit('alert', 'User has too high perms.');
		
		users.filter(u => u.id == id).forEach(u => u.socket.emit('kicked'));
		users = users.filter(u => u.id != id);
		let us = users.toSorted((a, b) => a.room < b.room ? -1 : (a.room > b.room ? 1 : 0));
		let rds = [], j = 0;
		for(let i = 1; i < us.length+1; i++) {
			if(i == us.length || us[i].room != us[j].room) {
				rds.push(us.splice(j, i - j));
				j = i;
			}
		}
		for(let g of rds) {
			let upd = g.map(u => ({name: u.name, skin: u.skin, id: u.id}));
			g.forEach(u => u.socket.emit('update users', upd));
		}
		socket.emit('alert', 'User kicked');
	});

	socket.on("getip", (id) => {
		if(!user.perms) return;
		let u = users.filter(x => x.id == id);
		if(!u.length) return socket.emit('alert', 'User not found!');
		u = u[0];
		if(u.perms >= user.perms) return socket.emit('alert', 'User has too high perms.');
		socket.emit('alert', "User's ip: " + u.ip);
	});

	// Handle user disconnect
	socket.on("disconnect", () => {
		if(!user) return;
		users = users.filter((u) => u.id !== user.id);
		let upd = users.filter(u => u.room == user.room).map(u => ({id: u.id, name: u.name, skin: u.skin}));
		users.forEach(u => u.room == user.room && u.socket.emit('update users', upd));
	});
});

const db = new sqlite3.Database("stuff.db", (err) => {
	if (err) {
		console.error('Could not open database:', err.message);
		return;
	}
	console.log('Connected to the SQLite database.');

	// Start the server
	const PORT = process.env.PORT || 3000;
	server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});

