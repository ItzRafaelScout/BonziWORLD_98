window.tts = {};

$(document).ready(() => {

	/*
	 * {id, name, skin, avatar}
	 */
	let users = [];
	let chatLog = []; // To store chat messages
	let mutedUsers = []; // Array to store muted user IDs

	let myname, myskin, myroom;
	let iammod = false;
	let isAdmin = localStorage.getItem("bonziAdmin") === "true";
	let isTyping = false;
	let isCommanding = false;

	const socket = io();
	let skins = ['purple']; // Default skin set, will be updated from server
	
	// Helper function to get center position for context menu
	function canvas_center() {
		return {
			x: Math.floor(window.innerWidth / 2),
			y: Math.floor(window.innerHeight / 2)
		};
	}

	// Create chat log button and window
	const $chatLogBtn = $('<button>').addClass('chat-log-btn').text('≡');
	$('body').append($chatLogBtn);
	
	const $chatLogWindow = $('<div>').addClass('chat-log-window').css('display', 'none');
	$chatLogWindow.html(`
		<div class="chat-log-title">
			<span>Chat Log</span>
			<button class="chat-log-close">✕</button>
		</div>
		<div class="chat-log-content"></div>
	`);
	$('body').append($chatLogWindow);
	
	// Reply window
	const $replyWindow = $('<div>').addClass('reply-window');
	$replyWindow.html(`
		<div class="reply-window-title">
			<span>Reply to Message</span>
			<button class="reply-window-close">✕</button>
		</div>
		<div class="reply-window-content">
			<div class="reply-original"></div>
			<textarea class="reply-input" placeholder="Type your reply..."></textarea>
			<div class="reply-buttons">
				<button class="reply-send-btn">Send</button>
			</div>
		</div>
	`);
	$('body').append($replyWindow);
	
	// Chat log toggle
	$chatLogBtn.on('click', function() {
		$chatLogWindow.toggle();
	});
	
	// Close chat log
	$chatLogWindow.find('.chat-log-close').on('click', function() {
		$chatLogWindow.hide();
	});
	
	// Close reply window
	$replyWindow.find('.reply-window-close').on('click', function() {
		$replyWindow.hide();
	});
	
	// Handle reply send
	$replyWindow.find('.reply-send-btn').on('click', function() {
		const originalMsg = $replyWindow.data('original-msg');
		const replyText = $replyWindow.find('.reply-input').val();
		const targetId = $replyWindow.data('target-id');
		
		if (replyText.trim()) {
			socket.emit('reply', {
				originalMsg: originalMsg,
				replyText: replyText,
				targetId: targetId
			});
			
			$replyWindow.hide();
			$replyWindow.find('.reply-input').val('');
		}
	});

	// Request available skins from server
	socket.on('connect', () => {
		socket.emit('get_skins');
	});

	// Handle skins received from server
	socket.on('skins_list', skinsFromServer => {
		if (Array.isArray(skinsFromServer) && skinsFromServer.length > 0) {
			skins = skinsFromServer;
			// Update the skin selection dropdown if it exists
			updateSkinDropdown();
		}
	});

	function updateSkinDropdown() {
		const skinSelect = $('select[name="skin"]');
		if (skinSelect.length) {
			skinSelect.empty();
			skins.forEach(skin => {
				skinSelect.append($('<option>').val(skin).text(skin));
			});
		}
	}
	
	// Function to add a message to the chat log
	function addToChatLog(userId, userName, message, isReply = false, originalMsg = '') {
		const timestamp = new Date().toLocaleTimeString();
		
		// Create entry for UI
		const $entry = $('<div>').addClass('chat-log-entry');
		
		// Reply button
		const $replyBtn = $('<button>').addClass('chat-log-reply-btn').text('↩');
		$replyBtn.on('click', function() {
			openReplyWindow(userId, userName, message);
		});
		$entry.append($replyBtn);
		
		// User and timestamp
		const $user = $('<span>').addClass('chat-log-user').text(userName);
		const $time = $('<span>').addClass('chat-log-time').text(timestamp);
		$entry.append($user).append($time);
		
		// Message content
		const $message = $('<div>').addClass('chat-log-message');
		
		if (isReply) {
			// For replies, add blockquote and reply text
			const $quote = $('<blockquote>').addClass('reply-quote').text(originalMsg);
			const $replyText = $('<div>').text(message);
			$message.append($quote).append($replyText);
		} else {
			$message.text(message);
		}
		
		$entry.append($message);
		
		// Add to chat log array and UI
		chatLog.push({
			userId,
			userName,
			message,
			timestamp,
			isReply,
			originalMsg
		});
		
		$('.chat-log-content').append($entry);
		$('.chat-log-content').scrollTop($('.chat-log-content')[0].scrollHeight);
	}
	
	// Function to open reply window
	function openReplyWindow(userId, userName, message) {
		$replyWindow.find('.reply-original').text(`${userName}: ${message}`);
		$replyWindow.data('original-msg', message);
		$replyWindow.data('target-id', userId);
		$replyWindow.show();
		$replyWindow.find('.reply-input').focus();
	}

	const startmenu = $('<div class="window start-menu">');
	startmenu.hide();
	$('body').append(startmenu);
	$('#start-btn').click(() => startmenu.toggle());

	let ctmenu = $('<div>')
		.addClass('window')
		.addClass('msctmenu')
		.css({position: 'fixed'})
		.append($('<button> Assholeify </button>')
			.click(() => socket.emit('message', `Hey ${users.filter(x=>x.id==ctmenu_subject)[0].name}! You're a fucking asshole.`)))
		.append($('<button> Mute User </button>')
			.click(() => {
				const userToMute = users.filter(x => x.id == ctmenu_subject)[0];
				if (userToMute && !mutedUsers.includes(userToMute.id)) {
					mutedUsers.push(userToMute.id);
					msalert(`Muted ${userToMute.name}`);
				}
			}))
		.append($('<button> Unmute User </button>')
			.click(() => {
				const userToUnmute = users.filter(x => x.id == ctmenu_subject)[0];
				if (userToUnmute) {
					const index = mutedUsers.indexOf(userToUnmute.id);
					if (index > -1) {
						mutedUsers.splice(index, 1);
						msalert(`Unmuted ${userToUnmute.name}`);
					}
				}
			}));

	// Add admin-specific buttons (only shown for admins)
	const $kickBtn = $('<button> Kick </button>')
		.click(() => {
			const userToKick = users.filter(x => x.id == ctmenu_subject)[0];
			if (userToKick) {
				socket.emit('admin_kick', userToKick.id);
			}
		});
		
	const $banBtn = $('<button> Ban </button>')
		.click(() => {
			const userToBan = users.filter(x => x.id == ctmenu_subject)[0];
			if (userToBan) {
				socket.emit('ban', userToBan.id);
			}
		});
		
	const $ipBtn = $('<button> Show IP </button>')
		.click(() => {
			const userForIp = users.filter(x => x.id == ctmenu_subject)[0];
			if (userForIp) {
				socket.emit('getip', userForIp.id);
			}
		});
	
	// Add admin buttons to the menu but hide them initially
	ctmenu.append($kickBtn).append($banBtn).append($ipBtn);
	
	// Function to update context menu based on admin status
	function updateContextMenu() {
		if (isAdmin) {
			$kickBtn.show();
			$banBtn.show();
			$ipBtn.show();
			ctmenu.addClass('admin-ctmenu');
		} else {
			$kickBtn.hide();
			$banBtn.hide();
			$ipBtn.hide();
			ctmenu.removeClass('admin-ctmenu');
		}
	}
	
	// Initial setup
	updateContextMenu();
	
	ctmenu.hide();
	$('body').append(ctmenu);

	let ctmenu_subject = null;

	$('body').click(() => {
		ctmenu.hide();
	});

	let win = mswindow({
		title: 'Join the chat',
		width: 250,
		height: 150,
		resizable: false,
		unclosable: true,
		body: $('<form>')
			.on('submit', e => {
				e.preventDefault();
				socket.emit('user joined', {
					'room': myroom = e.target['room'].value,
					'name': myname = e.target['name'].value,
					'skin': myskin = e.target['skin'].value
				});
				win.destroy();
				$('#toolbar').show();
			})
			.html(`
			<table>
				<tr>
					<td style="width: 100px"><b> Name: </b></td>
					<td> <input type="text" name="name" style="width: 100%"/> </td>
				</tr>
				<tr>
					<td><b> Skin: </b></td>
					<td>
						<select name="skin" style="width: 100%">
							${skins.map(skin => '<option value="' + skin + '">' + skin + '</option>').join('\n')}
						</select>
					</td>
				</tr>
				<tr>
					<td style="width: 100px"><b> Room: </b></td>
					<td> <input type="text" name="room" style="width: 100%"/> </td>
				</tr>
				<tr>
					<td> </td>
					<td> <button> Join </button> </td>
				</tr>
			</table>
			`)
	});

	// Typing indicator
	$('#msg-form input[name="message"]').on('input', function() {
		const text = $(this).val();
		
		// Check if the user is typing a command
		if (text.startsWith('/')) {
			if (!isCommanding) {
				isCommanding = true;
				isTyping = false;
				socket.emit('user_status', { status: 'commanding' });
			}
		} else {
			if (!isTyping && !isCommanding && text.length > 0) {
				isTyping = true;
				socket.emit('user_status', { status: 'typing' });
			} else if (text.length === 0) {
				isTyping = false;
				isCommanding = false;
				socket.emit('user_status', { status: 'idle' });
			}
		}
	});

	$('#msg-form').on('submit', e => {
		e.preventDefault();
		let text = e.target['message'].value;
		isTyping = false;
		isCommanding = false;
		socket.emit('user_status', { status: 'idle' });
		
		let mgroups;
		if(mgroups = text.match(/^\/(\w+)(?:\s+(.*))?$/)) {
			let [cmd, arg] = mgroups.slice(1);
			if(cmd == 'name') {
				myname = arg;
				socket.emit('user joined', {
					room: myroom,
					name: myname,
					skin: myskin
				});
			} else
			if(cmd == 'skin') {
				myskin = arg;
				socket.emit('user joined', {
					room: myroom,
					name: myname,
					skin: myskin
				});
			} else
			if(cmd == 'modauth') {
				socket.emit('modauth', arg);
			} else
			if(cmd == 'image') {
				if (arg && arg.trim()) {
					socket.emit('image', arg.trim());
				} else {
					msalert("Please provide an image URL!");
				}
			} else
			if(cmd == 'video') {
				if (arg && arg.trim()) {
					socket.emit('video', arg.trim());
				} else {
					msalert("Please provide a video URL!");
				}
			} else
			if(cmd == 'youtube') {
				if (arg && arg.trim()) {
					socket.emit('youtube', arg.trim());
				} else {
					msalert("Please provide a YouTube video ID!");
				}
			} else
			if(cmd == 'poll') {
				socket.emit('poll');
			} else
			if(cmd == 'hat') {
				if (arg && arg.trim()) {
					socket.emit('hat', arg.trim());
				} else {
					msalert("Please provide a hat type! Available hats: kamala, elon, tophat, maga, troll");
				}
			} else
			if(cmd == 'joke') {
				socket.emit('joke');
			} else
			if(cmd == 'fact') {
				socket.emit('fact');
			} else
			if(cmd == 'clear') {
				// Clear the chat log
				chatLog = [];
				$('.chat-log-content').empty();
				msalert("Chat log cleared!");
			} else {
				msalert("Bad command!");
			}
		} else {
			socket.emit('message', text);
			
			// Add to chat log (our own message)
			addToChatLog(null, myname, text);
		}
		e.target['message'].value = '';
	});

	// Update context menu whenever a user clicks on a bonzi character
	function showContextMenu(userId, x, y) {
		ctmenu_subject = userId;
		
		// Check admin status again (in case it changed during the session)
		isAdmin = localStorage.getItem("bonziAdmin") === "true";
		updateContextMenu();
		
		ctmenu.css({
			top: y + 'px',
			left: x + 'px'
		}).show();
	}

	socket.on('update users', upd => {
		const cmpfn = (a, b) => a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
		const setremove = function(s1, s2) {
			let rez = [];
			let i, j;
			for(i = 0, j = 0; i < s2.length && j < s1.length; ++i) {
				while(j < s1.length && s1[j].id < s2[i].id)
					rez.push(s1[j++]);
				if(j < s1.length && s1[j].id == s2[i].id) ++j;
			}
			for(; j < s1.length; ++j) rez.push(s1[j]);
			return rez;
		}
		upd.sort(cmpfn);
		let joined = setremove(upd, users);
		let left = setremove(users, upd);
		let stayed = setremove(users, left);
		let stayed_changes = setremove(setremove(upd, left), joined);
		for(let user of joined) {
			user.avatar = bonzipreset(user.skin);
			user.avatar.elem.on('contextmenu', e => {
				e.preventDefault();
				showContextMenu(user.id, e.clientX, e.clientY);
			});
			user.avatar.setName(user.name);
			user.avatar.play('join');
		}
		for(let user of left) {
			user.avatar.play('left').then(() => user.avatar.destroy());
		}
		for(let i = 0; i < stayed.length; i++) {
			if(stayed[i].name != stayed_changes[i].name) {
				stayed[i].name = stayed_changes[i].name;
				stayed[i].avatar.setName(stayed_changes[i].name);
			}
			if(stayed[i].skin != stayed_changes[i].skin) {
				stayed[i].skin = stayed_changes[i].skin;
			}
		}
		users = [...joined, ...stayed];
		users.sort(cmpfn);
	})

	socket.on('alert', msg => {
		msalert(msg)
	});

	socket.on('modsetup', () => {
		ctmenu.append(
			$('<button> Get IP </button>').click(() => {
				socket.emit('getip', ctmenu_subject);
			})
		).append(
			$('<button> Ban user </button>').click(() => {
				socket.emit('ban', ctmenu_subject);
			})
		);
		console.log('mod setup')
	});

	socket.on('message', data => {
		let u = users.filter(x => x.id == data.id)[0];
		
		// Check if the user is muted, if so, don't show the message
		if (mutedUsers.includes(data.id)) {
			return;
		}
		
		speak.play(data.message, u.id, {}, () => {
			u.avatar.hideText();
		}, () => {
			u.avatar.showText(data.message);
		});
		
		// Add to chat log
		if (u) {
			addToChatLog(u.id, u.name, data.message);
		}
	});
	
	// Handle reply message
	socket.on('reply_message', data => {
		let u = users.filter(x => x.id == data.id)[0];
		
		// Check if the user is muted, if so, don't show the message
		if (mutedUsers.includes(data.id)) {
			return;
		}
		
		if (u) {
			// Display as a quote in the speech bubble
			u.avatar.showQuote(data.originalMsg, data.replyText);
			
			// Add to chat log
			addToChatLog(u.id, u.name, data.replyText, true, data.originalMsg);
			
			// Add speech synthesis
			speak.play(data.replyText, u.id, {}, () => {
				u.avatar.hideText();
			});
		}
	});

	// Handle user status updates (typing/commanding)
	socket.on('user_status_update', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			if (data.status === 'typing') {
				u.avatar.setStatus('typing');
			} else if (data.status === 'commanding') {
				u.avatar.setStatus('commanding');
			} else {
				u.avatar.setStatus('');
			}
		}
	});

	// Handle image display
	socket.on('display_image', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.showImage(data.url);
		}
	});

	// Handle video display
	socket.on('display_video', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.showVideo(data.url);
		}
	});

	// Handle YouTube display
	socket.on('display_youtube', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.showYouTube(data.youtubeId);
		}
	});

	// Handle hat display
	socket.on('display_hat', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.showHat(data.hatType);
		}
	});
	
	// Handle joke display
	socket.on('display_joke', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.tellJoke();
		}
	});
	
	// Handle fact display
	socket.on('display_fact', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.tellFact();
		}
	});

	// Handle poll display
	socket.on('display_poll', data => {
		let u = users.filter(x => x.id == data.id)[0];
		if (u) {
			u.avatar.showPoll();
		}
	});

	socket.on('connected', (uid) => {
		// Update admin status
		isAdmin = localStorage.getItem("bonziAdmin") === "true";
		let pos = canvas_center();
		showContextMenu(uid, pos.x, pos.y);
	});

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
		
		// If admin, set skin to pope if admin in localStorage
		if(user) {
			user.name = cnfb(data.name, 'anonymous');
			// Use pope skin for admin
			if (isAdmin) {
				user.skin = 'pope';
			} else {
				user.skin = validSkin(data.skin) ? data.skin : defaultSkin;
			}
		} else {
			// Set pope skin for admin
			let userSkin = validSkin(data.skin) ? data.skin : defaultSkin;
			if (isAdmin) {
				userSkin = 'pope';
			}
			
			user = {
				id: Math.random().toString().slice(2),
				room: cnfb(data.room, 'general'),
				name: cnfb(data.name, 'anonymous'),
				skin: userSkin,
				ip: socket.request.connection.remoteAddress,
				perms: isAdmin ? 1 : 0, // Set perms to 1 for admin
				socket
			};
			users.push(user);
		}
		let upd = users.filter(u => u.room == user.room).map(u => ({id: u.id, name: u.name, skin: u.skin}));
		users.forEach(u => u.room == user.room && u.socket.emit('update users', upd));
	});
	
	// Setup admin kick functionality
	socket.on("admin_kick", (id) => {
		if (!isAdmin && !user.perms) return;
		let u = users.filter(x => x.id == id);
		if (!u.length) return socket.emit('alert', 'User not found!');
		u = u[0];
		
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

	// Add kicked event listener
	socket.on("kicked", () => {
		socket.disconnect();
		alert("You have been kicked from the server!");
		window.location.reload();
	});
});
