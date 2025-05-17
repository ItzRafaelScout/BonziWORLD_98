function mswindow({ title, body, width, height, unclosable, resizable }) {

	unclosable = unclosable || false;
	resizable = resizable || false;

	// Create the container for the window
	const $window = $('<div class="window"></div>').css({
		width: `${width}px`,
		height: `${height}px`,
		position: 'absolute',
		top: Math.floor((document.body.offsetHeight - height)*.5)+'px',
		left: Math.floor((document.body.offsetWidth - width)*.5)+'px'
	});

	// Create the title bar
	const $titleBar = $('<div class="title-bar"></div>');
	const $titleText = $('<div>').addClass('title-bar-text').text(title);
	const $titleControls = $('<div class="title-bar-controls"></div>');

	if (!unclosable) {
		const $closeButton = $('<button aria-label="Close"></button>').click(() => {
			$window.remove();
		});
		$titleControls.append($closeButton);
	}

	$titleBar.append($titleText).append($titleControls);

	// Create the body of the window
	const $windowBody = $('<div>').addClass('window-body').css({
		overflow: 'auto',
	});
	if(typeof body == 'string') $windowBody.html(body);
	else $windowBody.append(body);

	// Append the title bar and body to the window
	$window.append($titleBar).append($windowBody);

	// Append the window to the body of the document
	$('body').append($window);

	// Make the window draggable
	$window.draggable({
		handle: $titleBar,
		containment: $('body')
	});

	// Make the window resizable if the option is enabled
	if (resizable) {
		$window.resizable({
			handles: 'n, e, s, w, ne, se, sw, nw',
			minWidth: 200,
			minHeight: 100
		});
	}

	// Return the window body and destroy function
	return {
		body: $windowBody.get(0),
		destroy: () => {
			$window.remove();
		},
	};
}

function msalert(text) {
	let win;
	let body = $('<div>')
		.append($('<p>').text(text))
		.append($('<center>')
			.append($('<button>')
				.text('Ok')
				.css('width', '100px')
				.click(() => win.destroy())));
	win = mswindow({
		title: 'Alert',
		body: body,
		width: 300,
		height: 100
	});
}
