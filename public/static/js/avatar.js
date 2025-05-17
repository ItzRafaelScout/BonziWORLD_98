function range(s, e) {
	let arr = [];
	for(let i = s; i <= e; i++) arr.push(i);
	return arr;
}

// Function to format text with special markdown
function formatText(text) {
	if (!text) return '';
	
	// Linkify URLs
	text = text.replace(
		/(https?:\/\/[^\s]+)/g, 
		'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
	);
	
	// Rainbow gradient text ($r$text$r$)
	text = text.replace(
		/\$r\$(.*?)\$r\$/g,
		'<span class="rainbow-text">$1</span>'
	);
	
	// Bold (**text**)
	text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
	
	// Italic (*text*)
	text = text.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
	
	// Bold and italic (***text***)
	text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
	
	// Underline (__text__)
	text = text.replace(/\_\_(.*?)\_\_/g, '<u>$1</u>');
	
	// Strikethrough (--text--)
	text = text.replace(/\-\-(.*?)\-\-/g, '<s>$1</s>');
	
	// Big text (^^text^^)
	text = text.replace(/\^\^(.*?)\^\^/g, '<span class="big-text">$1</span>');
	
	return text;
}

function msavatar({skin, spritew, spriteh, n, m, anims}) {
	let $floaty = $('<div>').css({
		'width': spritew + 'px',
		'height': spriteh + 'px',
		'position': 'absolute',
		top: Math.floor((document.body.offsetHeight-spriteh)*Math.random())+'px',
		left: Math.floor((document.body.offsetWidth-spritew)*Math.random())+'px'
	})
	let $canv = $('<canvas>').css({
		'width': spritew + 'px',
		'height': spriteh + 'px',
	}).attr({
		'width': spritew.toString(),
		'height': spriteh.toString()
	});
	let $textbox = $('<div>').addClass('agent-textbox');
	let $namebox = $('<div>').addClass('agent-namebox');
	let $status = $('<div>').addClass('agent-status');
	let $mediaContainer = $('<div>').addClass('agent-media-container');
	let $pollContainer = $('<div>').addClass('agent-poll-container');
	let $hatContainer = $('<div>').addClass('agent-hat-container');

	$textbox.hide();
	$status.hide();
	$mediaContainer.hide();
	$pollContainer.hide();
	
	$floaty.append($canv);
	$floaty.append($namebox);
	$floaty.append($status);
	$floaty.append($textbox);
	$floaty.append($mediaContainer);
	$floaty.append($pollContainer);
	$floaty.append($hatContainer);
	
	// Add admin badge for pope skin
	if (skin.src.includes('pope.png')) {
		const $adminBadge = $('<div>').addClass('admin-badge').text('A');
		$floaty.append($adminBadge);
	}
	
	$floaty.draggable({
		containment: $('#desktop')
	});
	$('#desktop').append($floaty);

	let ctx = $canv[0].getContext('2d');
	let animiid = null;
	let actQueue = [];
	let isActing = false;

	function drawframe(frame) {
		let sx = (frame % n) * spritew;
		let sy = Math.floor(frame / n) * spriteh;
		ctx.clearRect(0, 0, spritew, spriteh);
		ctx.drawImage(skin, sx, sy, spritew, spriteh, 0, 0, spritew, spriteh);
	}

	skin.onload = () => {
		if(!animiid) drawframe(anims['idle'].frames[0]);
	}

	// Process the action queue
	function processActQueue() {
		if (isActing || actQueue.length === 0) return;
		
		isActing = true;
		const act = actQueue.shift();
		
		if (act.type === 'text') {
			$textbox.text(act.text).show();
			speak.play(act.text);
			setTimeout(() => {
				if (actQueue.length === 0) {
					$textbox.hide();
				}
				isActing = false;
				processActQueue();
			}, act.duration || 3000);
		}
	}

	return {
		destroy: () => $floaty.remove(),
		play: (ai) => {
			return new Promise(resolve => {
				if(animiid) clearInterval(animiid);
				let counter = 0;
				drawframe(anims[ai][0]);
				animiid = setInterval(() => {
					if(++counter >= anims[ai].frames.length)
						return (clearInterval(animiid), animiid = null, resolve());
					drawframe(anims[ai].frames[counter]);
				}, 1000/anims[ai].speed);
			});
		},
		showText: (text) => {
			// Process text formatting before showing
			const formattedText = formatText(text);
			$textbox.html(formattedText).show();
		},
		hideText: () => $textbox.hide(),
		setName: (name) => {
			// Process rainbow formatting for name
			const formattedName = formatText(name);
			$namebox.html(formattedName);
		},
		setStatus: (status) => {
			if (status === 'typing') {
				$status.text('(typing...)').show();
			} else if (status === 'commanding') {
				$status.text('(commanding...)').show();
			} else {
				$status.hide();
			}
		},
		showImage: (url) => {
			// Create image in a speech bubble
			const $mediaContent = $('<img>').attr({
				src: url,
				alt: 'User shared image'
			}).css({
				'max-width': '130px',
				'max-height': '130px',
				'display': 'block',
				'margin': '5px auto'
			});
			
			$textbox.empty().append($mediaContent).show();
			
			// Add close button
			$textbox.append(
				$('<button>').text('×').addClass('close-media-btn').click(function() {
					$textbox.hide();
				})
			);
		},
		showVideo: (url) => {
			// Create video in a speech bubble
			const $mediaContent = $('<video>').attr({
				src: url,
				controls: true,
				autoplay: false
			}).css({
				'max-width': '130px',
				'max-height': '130px',
				'display': 'block',
				'margin': '5px auto'
			});
			
			$textbox.empty().append($mediaContent).show();
			
			// Add close button
			$textbox.append(
				$('<button>').text('×').addClass('close-media-btn').click(function() {
					$textbox.hide();
				})
			);
		},
		showYouTube: (youtubeId) => {
			// Create YouTube iframe in a speech bubble
			const $mediaContent = $('<iframe>').attr({
				src: `https://www.youtube.com/embed/${youtubeId}?autoplay=0`,
				frameborder: "0",
				allowfullscreen: true
			}).css({
				'width': '180px',
				'height': '120px',
				'display': 'block',
				'margin': '5px auto'
			});
			
			$textbox.empty().append($mediaContent).show();
			
			// Add close button
			$textbox.append(
				$('<button>').text('×').addClass('close-media-btn').click(function() {
					$textbox.hide();
				})
			);
		},
		showHat: (hatType) => {
			// Hat collection - you can expand this list
			const hats = {
				'kamala': '/static/hats/kamala.png',
				'elon': '/static/hats/elon.png',
				'tophat': '/static/hats/tophat.png',
				'maga': '/static/hats/maga.png',
				'troll': '/static/hats/troll.png'
			};
			
			// Clear any existing hat
			$hatContainer.empty();
			
			// If we have this hat type
			if (hats[hatType.toLowerCase()]) {
				// Create and position the hat
				$hatContainer.append(
					$('<img>').attr({
						src: hats[hatType.toLowerCase()],
						alt: hatType + ' hat'
					}).addClass('bonzi-hat')
				);
			}
		},
		showQuote: (originalText, replyText) => {
			$textbox.empty();
			
			// Create blockquote element - apply formatting to both quote and reply
			const $quote = $('<blockquote>').addClass('reply-quote').html(formatText(originalText));
			$textbox.append($quote);
			
			// Add reply text with formatting
			$textbox.append($('<div>').addClass('reply-text').html(formatText(replyText)));
			
			$textbox.show();
		},
		queueAct: (act) => {
			actQueue.push(act);
			processActQueue();
		},
		tellJoke: () => {
			const jokes = [
				{
					start: "Why did the chicken cross the road?",
					mid: "...",
					end: "To get to the other side!"
				},
				{
					start: "Knock knock!",
					mid: "Who's there? Boo. Boo who?",
					end: "Don't cry, it's just a joke!"
				},
				{
					start: "What's orange and sounds like a parrot?",
					mid: "...",
					end: "A carrot!"
				}
			];
			
			const joke = jokes[Math.floor(Math.random() * jokes.length)];
			
			// Queue joke parts
			actQueue.push({ type: 'text', text: joke.start, duration: 2000 });
			actQueue.push({ type: 'text', text: joke.mid, duration: 1500 });
			actQueue.push({ type: 'text', text: joke.end, duration: 3000 });
			
			processActQueue();
		},
		tellFact: () => {
			const facts = [
				{
					start: "Did you know?",
					mid: "The shortest war in history was between Britain and Zanzibar in 1896.",
					end: "It lasted only 38 minutes!"
				},
				{
					start: "Here's an interesting fact...",
					mid: "Honey never spoils.",
					end: "Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly good to eat!"
				},
				{
					start: "Fun fact:",
					mid: "The original name for butterfly was 'flutterby'.",
					end: "It's believed the name got switched around over time to what we know today!"
				}
			];
			
			const fact = facts[Math.floor(Math.random() * facts.length)];
			
			// Queue fact parts
			actQueue.push({ type: 'text', text: fact.start, duration: 1500 });
			actQueue.push({ type: 'text', text: fact.mid, duration: 3000 });
			actQueue.push({ type: 'text', text: fact.end, duration: 3000 });
			
			processActQueue();
		},
		showPoll: () => {
			$pollContainer.empty().append(
				$('<div>').addClass('poll-title').text('Poll'),
				$('<div>').addClass('poll-option').append(
					$('<div>').addClass('poll-option-label').text('Yes'),
					$('<div>').addClass('poll-option-bar yes-bar').css({
						'width': '50%',
						'background-color': 'green',
						'height': '20px'
					}),
					$('<div>').addClass('poll-option-value').text('50%')
				),
				$('<div>').addClass('poll-option').append(
					$('<div>').addClass('poll-option-label').text('No'),
					$('<div>').addClass('poll-option-bar no-bar').css({
						'width': '50%',
						'background-color': 'red',
						'height': '20px'
					}),
					$('<div>').addClass('poll-option-value').text('50%')
				),
				$('<div>').addClass('poll-buttons').append(
					$('<button>').text('Yes').click(function() {
						// Simulate vote
						$('.yes-bar').css('width', '70%');
						$('.no-bar').css('width', '30%');
						$('.poll-option-value').eq(0).text('70%');
						$('.poll-option-value').eq(1).text('30%');
						$(this).prop('disabled', true);
						$('.poll-buttons button:last-child').prop('disabled', true);
					}),
					$('<button>').text('No').click(function() {
						// Simulate vote
						$('.yes-bar').css('width', '30%');
						$('.no-bar').css('width', '70%');
						$('.poll-option-value').eq(0).text('30%');
						$('.poll-option-value').eq(1).text('70%');
						$(this).prop('disabled', true);
						$('.poll-buttons button:first-child').prop('disabled', true);
					})
				),
				$('<button>').text('×').addClass('close-poll-btn').click(function() {
					$pollContainer.hide();
				})
			).show();
		},
		elem: $floaty
	}
}

function bonzipreset(skinName = 'red') {
	return msavatar({
		skin: (i => (i.src = `/static/agents/${skinName}.png`, i))(new Image()),
		spritew: 200,
		spriteh: 160,
		n: 17,
		m: 21,
		anims: {
			idle: {speed: 1000, frames: [0]},
			join: {speed: 30,   frames: [...range(277, 302), 0]},
			left: {speed: 30,   frames: range(16, 39)}
		}
	});
}
