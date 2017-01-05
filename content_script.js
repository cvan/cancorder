/* global browser, MediaRecorder */
var CANCORDER_VIDEO_ID = 'cancorder-video';
var NUMERIC_KEY_CHAR_CODES = {
  161: 1,
  8482: 2,
  163: 3,
  162: 4,
  8734: 5,
  167: 6,
  182: 7,
  8226: 8,
  170: 9
};

var filenamesGenerated = {};
var framerate;
var isFinished = true;
var isRecording = false;
var recorder = null;
var recordingCanvasNumber = -1;

function getCanvasByNumber (num, selector) {
  var canvases = document.querySelectorAll(selector || 'canvas');
  if (!num) {
    return canvases[0];
  }
  var canvas = canvases[num - 1];
  if (!canvas && num === 9) {
    num = canvases.length - 1;
    var canvasLast = canvases[num - 1];
    canvas = canvasLast;
  }
  return canvas;
}

var getSelector = function (el) {
  var elTag = el.tagName.toLowerCase();
  var elSelectorId = el.id ? `[id="${el.id}"]` : '';
  var elSelectorClass = el.className ? `[class="${el.className}"]` : '';
  var elSelector = `${elTag}${elSelectorId}${elSelectorClass}`;
  return elSelector;
};

var getCanvasNames = function () {
  var canvases = document.querySelectorAll('canvas');
  var displaySelectors = canvases.length > 1;
  return Array.prototype.map.call(canvases, function (canvas) {
    return document.title + (displaySelectors ? ' (' + getSelector(canvas) + ')' : '');
  });
};

var toggleCanvasRecording = function (num) {
  var canvas = getCanvasByNumber(num);
  if (!canvas) {
    return;
  }

  var shouldStop = isRecording && recordingCanvasNumber === num;
  if (shouldStop) {
    stop();
    return;
  }

  record(canvas, num);
};

window.addEventListener('keypress', function (e) {
  if (!e.altKey) {
    return;
  }
  var num = NUMERIC_KEY_CHAR_CODES[e.charCode];
  if (!num) {
    return;
  }
  toggleCanvasRecording(num);
});

function slugify (str) {
  // Adapted from https://gist.github.com/mathewbyrne/1280286#gistcomment-1761979
  str = (str || '').replace(/^\s+|\s+$/g, '');  // Trim whitespace.
  str = str.toLowerCase();

  // Replace accents with their latin equivalents (e.g., swap ñ for n).
  var before = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
  var after  = 'aaaaeeeeiiiioooouuuunc______';

  for (var i = 0, len = before.length; i < len; i++) {
    str = str.replace(new RegExp(before.charAt(i), 'g'), after.charAt(i));
  }

  str = str.replace(/-+/g, '_')  // Collapse dashes to underscores.
    .replace(/&/g, '_')  // Replace ampersands with underscores.
    .replace(/\./g, '_')  // Collapse dashes to underscores.
    .replace(/\W/g, '')  // Remove unaccepted characters.
    .replace(/\s+/g, '_')  // Collapse whitespace to underscores.
    .replace(/_+/g, '_');  // Collapse underscores.

  return str;
}

function generateFilename (customFilename) {
  var title = customFilename || document.title.trim();
  if (!title) {
    title = location.host + '_' + location.pathname + '_' + location.search;
  }
  var filename = slugify(title);
  if (filename in filenamesGenerated) {
    filename = filename + '_(' + (++filenamesGenerated[filename]) + ')';
  } else {
    filenamesGenerated[filename] = 0;
  }
  return filename + '.mp4';
}

var startCapturing = function () {
  if (!recorder) {
    record();
  }
  recorder.start();
  isRecording = true;
  isFinished = false;
  notify();
};

var stopCapturing = function () {
  if (!recorder) {
    return;
  }
  recorder.stop();
  notify();
};

var record = function (canvas, num) {
  recordingCanvasNumber = parseInt(num, 10);
  framerate = parseInt(framerate, 10) || 15;

  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;

  console.log('Ready to record %s #%s', getSelector(canvas), num);

  var video = document.body.querySelector('#' + CANCORDER_VIDEO_ID);

  if (video) {
    video.pause();
    // video.src = '';
  } else {
    video = document.createElement('video');
    video.id = CANCORDER_VIDEO_ID;
    video.controls = true;
    video.loop = true;
    // video.download = generateFilename();
    video.style.cssText = 'position: absolute; bottom: 0; left: 0; height: 30vh; width: 30vw; z-index: 9999';
    video.addEventListener('dblclick', function () {
      window.location.href = video.src;
    });
    document.body.appendChild(video);
  }

  if (video.canvas !== canvas) {
    video.canvas = canvas;
    if (video.canvas) {
      canvas.removeEventListener('resize', resizeVideo);
    }
    canvas.addEventListener('resize', resizeVideo);
  }

  var resizeVideo = function () {
    if (!isRecording) {
      return;
    }
    video.width = canvasWidth;
    video.height = canvasHeight;
  };

  var stream = canvas.captureStream(framerate);
  recorder = new MediaRecorder(stream);

  var finishCapturing = function (e) {
    isRecording = false;
    isFinished = true;
    var videoData = [e.data];
    var blob = new Blob(videoData, {type: 'video/webm'});
    console.log('Video (%s bytes, %s media) ready to save:',
      blob.size, blob.type, generateFilename());
    var videoURL = URL.createObjectURL(blob);
    video.src = videoURL;
    video.play();
  };

  recorder.addEventListener('dataavailable', finishCapturing);
  startCapturing();
};

var stop = function () {
  stopCapturing();
};

/**
 * Send a message to the page script.
 */
function msgPageScript (data) {
  window.postMessage({
    source: 'cancorder',
    isRecording: isRecording,
    isFinished: isFinished,
    sources: getCanvasNames()
  }, '*');
}

/**
 * Send a message to the extension's pop-up doorhanger in the toolbar.
 */
function msgToolbarPopup (data) {
  browser.runtime.sendMessage({
    source: 'cancorder',
    isRecording: isRecording,
    isFinished: isFinished,
    sources: getCanvasNames()
  });
}

function notify (data) {
  msgPageScript(data);
  msgToolbarPopup(data);
}

function handleMessage (msg, sender, sendResponse) {
  if (msg.state === 'ready') {
    msgToolbarPopup();
    framerate = parseInt(msg.framerate, 10) || 15;
    sendResponse({
      source: 'cancorder',
      isRecording: isRecording,
      isFinished: isFinished,
      sources: getCanvasNames()
    });
  }

  if (msg.request) {
    var num = msg.canvasNumber ? parseInt(msg.canvasNumber, 10) : 0;
    toggleCanvasRecording(num);
  }
}

/**
 * Listens for messages from the popup script.
 * If the message was from the popup script, start recording.
 */
browser.runtime.onMessage.addListener(handleMessage);

/**
 * Listens for messages from the page.
 * If the message was from the page script, start recording.
 */
window.addEventListener('message', function () {
  if (e.source !== window || e.data.source !== 'cancorder') {
    return;
  }
  handleMessage(e.data);
});
