
let options;
let video, canvas, context;
let renderTimer;

// Initialize video stream
function initVideoStream() {
	video = document.createElement("video");
	video.setAttribute('width', options.width);
	video.setAttribute('height', options.height);
	video.setAttribute('playsinline', 'true');
	video.setAttribute('webkit-playsinline', 'true');

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
	window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

	if (navigator.getUserMedia) {
		navigator.getUserMedia({
			video: true,
			audio: false,
		}, function (stream) {
			options.onSuccess();

			if (video.mozSrcObject !== undefined) { // hack for Firefox < 19
				video.mozSrcObject = stream;
			} else {
				video.srcObject = stream;
			}

			initCanvas();
		}, options.onError);
	} else {
		options.onNotSupported();
	}
}

// Initialize canvas element
function initCanvas() {
	canvas = options.targetCanvas || document.createElement("canvas");
	canvas.setAttribute('width', options.width);
	canvas.setAttribute('height', options.height);

	context = canvas.getContext('2d');

	// Mirror video
	if (options.mirror) {
		context.translate(canvas.width, 0);
		context.scale(-1, 1);
	}
}

// Start capturing video frames
function startCapture() {
	video.play();

	renderTimer = setInterval(function () {
		try {
			context.drawImage(video, 0, 0, video.width, video.height);
			options.onFrame(canvas);
		} catch (e) {
			// Error handling
		}
	}, Math.round(1000 / options.fps));
}

// Stop capturing video frames
function stopCapture() {
	pauseCapture();

	if (video.mozSrcObject !== undefined) {
		video.mozSrcObject = null;
	} else {
		video.srcObject = null;
	}
}

// Pause video capture
function pauseCapture() {
	if (renderTimer) clearInterval(renderTimer);
	video.pause();
}

// Initialize camera with provided options
export function init(captureOptions) {
	const doNothing = function () { };

	options = captureOptions || {};

	options.fps = options.fps || 30;
	options.width = options.width || 640;
	options.height = options.height || 480;
	options.mirror = options.mirror || false;
	options.targetCanvas = options.targetCanvas || null;

	options.onSuccess = options.onSuccess || doNothing;
	options.onError = options.onError || doNothing;
	options.onNotSupported = options.onNotSupported || doNothing;
	options.onFrame = options.onFrame || doNothing;

	initVideoStream();
}

// Export start, pause, and stop methods
export const start = startCapture;
export const pause = pauseCapture;
export const stop = stopCapture;