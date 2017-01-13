/* global browser, MediaRecorder */
var CANCORDER_VIDEO_ID = 'cancorder-video';
var GAMEPAD_CONTROLS_ENABLED = false;
var MEDIARECORDER_CONTENT_TYPES = [
  'video/webm',
  'video/webm;codecs=vp8',
  'audio/webm',
  'video/mp4;codecs=h264'
];
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
var VIDEO_CONTENT_TYPE = 'video/webm';
var VIDEO_EXTENSION = '.webm';

var filenamesGenerated = {};
var framerate;
var isFinished = null;
var isRecording = false;
var recorder = null;
var recordingCanvasNumber = -1;
var videos = [];

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

var getElementsWithSelectors = function (selector) {
  var canvases = document.querySelectorAll(selector);
  var displaySelectors = canvases.length > 1;
  return Array.prototype.map.call(canvases, function (canvas) {
    return document.title + (displaySelectors ? ' (' + getSelector(canvas) + ')' : '');
  });
};

var getCanvasNames = function () {
  return getElementsWithSelectors('canvas');
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
  var num = parseInt(e.key, 10);
  if (num > 0 && num < 10) {
    toggleCanvasRecording(num);
    return;
  }
  num = NUMERIC_KEY_CHAR_CODES[e.charCode];
  if (num) {
    toggleCanvasRecording(num);
  }
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
  return filename + VIDEO_EXTENSION;
}

var record = function (canvas, num) {
  recordingCanvasNumber = parseInt(num, 10);
  framerate = parseInt(framerate, 10) || 15;

  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;

  var video = document.getElementById(CANCORDER_VIDEO_ID);

  if (typeof window.MediaRecorder === 'undefined') {
    if (!video) {
      console.error('[cancorder] Browser support for MediaRecorder is required');
    }
    return;
  }

  console.log('Ready to record %s (source #%s)', getSelector(canvas), num);

  if (video) {
    video.pause();
    video.style.cssText = 'opacity: 0; visibility: hidden; pointer-events: none';
  } else {
    var contentTypes = {
      supported: [],
      unsupported: []
    };
    MEDIARECORDER_CONTENT_TYPES.forEach(contentType => {
      if (MediaRecorder.isTypeSupported(contentType)) {
        contentTypes.supported.push(contentType);
      } else {
        contentTypes.unsupported.push(contentType);
      }
    });
    console.info('[cancorder] Supported media types: %s', contentTypes.supported.join(', '));
    console.info('[cancorder] Unsupported media types: %s', contentTypes.unsupported.join(', '));
    console.info('[cancorder] Using media types: %s', VIDEO_CONTENT_TYPE);

    video = document.createElement('video');
    video.id = CANCORDER_VIDEO_ID;
    video.controls = true;
    video.loop = true;
    video.style.cssText = 'opacity: 1; visibility: visible; pointer-events: auto; position: absolute; bottom: 0; left: 0; height: 30vh; width: 30vw; z-index: 9999';
    video.addEventListener('dblclick', function () {
      window.location.href = video.src;
    });
    document.body.appendChild(video);
  }

  var resizeVideo = function () {
    if (!isRecording) {
      return;
    }
    video.width = canvasWidth;
    video.height = canvasHeight;
  };

  if (video.canvas !== canvas) {
    video.canvas = canvas;
    if (video.canvas) {
      canvas.removeEventListener('resize', resizeVideo);
    }
    canvas.addEventListener('resize', resizeVideo);
  }

  var stream = canvas.captureStream(framerate);
  recorder = new MediaRecorder(stream);

  recorder.addEventListener('start', function (e) {
    isRecording = true;
    isFinished = false;
    notify();
  });
  recorder.addEventListener('dataavailable', function (e) {
    isRecording = false;
    isFinished = true;
    var videoData = [e.data];
    var filename = generateFilename();
    var blob = new Blob(videoData, {type: VIDEO_CONTENT_TYPE});
    console.log('Video (%s bytes, %s media) ready to save:',
      blob.size, blob.type, filename);
    var videoURL = URL.createObjectURL(blob);
    video.src = videoURL;
    video.play();
    videos.push({
      url: videoURL,
      filename: filename
    });
    notify();
  });

  recorder.start();
};

var stop = function () {
  if (!recorder) {
    return;
  }
  recorder.stop();
};

function getState () {
  return {
    source: 'cancorder',
    recorderState: recorder ? recorder.state : null,
    isFinished: isFinished,
    sources: getCanvasNames()
  };
}

/**
 * Send a message to the page script.
 */
function msgPageScript () {
  window.postMessage(getState(), '*');
}

/**
 * Send a message to the extension's pop-up doorhanger in the toolbar.
 */
function msgToolbarPopup () {
  var msg = getState();
  console.log('msgToolbarPopup', msg);
  browser.runtime.sendMessage(msg);
}

window.addEventListener('load', function () {
  console.log('[cancorder][content_script] load');
  notify();
});

window.addEventListener('DOMConentLoaded', function () {
  console.log('[cancorder][content_script] DOM content loaded');
  notify();
});

function notify () {
  msgPageScript();
  msgToolbarPopup();
}

function handleMessage (msg, sender, sendResponse) {
  if (!msg.request) {
    return;
  }

  if (msg.request === 'setup') {
    msgToolbarPopup();
    framerate = parseInt(msg.framerate, 10);
    sendResponse({
      source: 'cancorder',
      isRecording: isRecording,
      isFinished: isFinished,
      sources: getCanvasNames()
    });
    return;
  }

  var num = msg.canvasNumber ? parseInt(msg.canvasNumber, 10) : 0;
  toggleCanvasRecording(num);
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
window.addEventListener('message', function (e) {
  if (!e || e.source !== window || e.data.source !== 'cancorder') {
    return;
  }
  handleMessage(e.data);
});

/*

// Sample usage:

window.addEventListener('gamepad.buttonvaluechange', function (e) {
  console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
});

window.addEventListener('gamepad.buttondown', function (e) {
  console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
});

window.addEventListener('gamepad.buttonup', function (e) {
  console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
});

window.addEventListener('gamepad.buttondown.oculusremote.b0', function (e) {
  console.log('[%s]', window.performance.now().toFixed(3), e.type, '• Gamepad', e.gamepad, '• Button', e.button);
});

*/

var DEFAULTS = {
  autostart: true,
  buttonThreshold: 0.1,
  emitEventsOnWindow: true,
  postMessageEventsOn: null,
  mappings: {
    'Oculus Remote': {
      'b0': 'center',
      'b1': 'back',
      'b2': 'up',
      'b3': 'down',
      'b5': 'right',
      'b4': 'left'
    },
    'OpenVR Gamepad': {
      'b3': 'menu'
    }
  }
};

function slugify (str) {
  return (str || '').toLowerCase().replace(/[^\w]/g, '').replace(/\(.+\)/, '');
}

function formatEvent (name, detail) {
  var event = new CustomEvent(name, {detail: detail});
  Object.keys(detail).forEach(function (key) {
    event[key] = detail[key];
  });
  return event;
}

function Gamepads (settings) {
  var self = this;
  this.supported = window.requestAnimationFrame && navigator.getGamepads;

  if (typeof settings === 'string') {
    this.settings = {select: settings};
  } else {
    this.settings = settings || {};
  }

  this.start = function () {
    if (this.started) {
      return;
    }
    this.started = true;
    if (navigator.getGamepads()[0]) {
      startLoop();
    } else {
      window.addEventListener('gamepadconnected', startLoop);
    }
  };

  this.stop = function () {
    window.removeEventListener('gamepadconnected', startLoop);
    window.cancelAnimationFrame(this.raf);
  };

  this.DEFAULTS = DEFAULTS;

  if (this.supported) {
    this.settings.mappings = Object.assign({}, DEFAULTS.mappings, this.settings.mappings);
    this.settings = Object.assign({}, DEFAULTS, this.settings);

    this.state = {};
    this.previousState = {};

    this.start();

    // In Chromium builds, you must first query the VR devices for Gamepads to be exposed.
    if (navigator.getVRDisplays) {
      navigator.getVRDisplays().then(function () {
        if (!self.autostarted && self.settings.autostart) {
          self.autostarted = true;
          self.start();
        }
      });
    }

    if (!this.autostarted && this.settings.autostart) {
      this.autostarted = true;
      this.start();
    }

    window.addEventListener('vrdisplaypresentchange', function () {
      if (!self.settings.autostart && self.autostarted) {
        self.autostarted = true;
        if (self.started) {
          self.stop();
        } else {
          self.start();
        }
      }
    });
  }

  function loop () {
    self.poll();
    self.raf = window.requestAnimationFrame(loop);
  }

  function startLoop () {
    self.raf = window.requestAnimationFrame(loop);
    window.removeEventListener('gamepadconnected', startLoop);
  }
}

Gamepads.prototype.poll = function () {
  var self = this;
  if (!this.supported) { return; }
  this.gamepads = navigator.getGamepads();
  var gp;
  var btn;
  var btnState;
  var len;
  var previousBtnState;

  for (var i = 0; i < navigator.getGamepads().length; ++i) {
    gp = navigator.getGamepads()[i];
    if (!gp) { continue; }
    if (this.select && this.select !== gp.id) { continue; }
    this.state[gp.id] = {};
    if (!this.previousState[gp.id]) {
      this.previousState[gp.id] = {};
    }
    if (gp.buttons) {
      len = gp.buttons.length;
      for (var j = 0; j < len; ++j) {
        btn = gp.buttons[j];

        previousBtnState = this.previousState[gp.id]['b' + j] = this.previousState[gp.id]['b' + j] || {
          gamepad: {
            index: i,
            id: gp.id
          },
          button: {
            index: j,
            value: 0,
            pressed: false,
            name: this.buttonName(gp, j),
            count: 0
          }
        };

        btnState = this.state[gp.id]['b' + j] = {
          gamepad: {
            index: gp.index,
            id: gp.id
          },
          button: {
            index: j,
            value: this.buttonValue(btn),
            pressed: this.buttonPressed(btn),
            name: this.buttonName(gp, j),
            count: previousBtnState.button.count
          }
        };

        if (previousBtnState.button.value !== btnState.button.value) {
          emitEvent(['gamepad.buttonvaluechange', btnState]);
        }

        if (previousBtnState.button.pressed && btnState.button.pressed) {
          this.state[gp.id]['b' + j].button.count++;
          if (this.state[gp.id]['b' + j].button.count >= 50) {
            emitEvent(['gamepad.buttonhold', btnState]);
            this.state[gp.id]['b' + j].button.count = 0;
          }
        }

        if (!previousBtnState.button.pressed && btnState.button.pressed) {
          this.state[gp.id]['b' + j].button.count = 0;
          emitEvent(['gamepad.buttondown', btnState]);
        }

        if (previousBtnState.button.pressed && !btnState.button.pressed) {
          emitEvent(['gamepad.buttonup', btnState]);
          this.state[gp.id]['b' + j].button.count = 0;
        }
      }
    }
  }

  function emitEvent (eventToEmit) {
    var name = eventToEmit[0];
    var detail = Object.assign({}, eventToEmit[1]);

    if (detail.button && detail.button.count) {
      // TODO: Actually store timestamps and compare.
      detail.button.seconds = Math.ceil(detail.button.count / 30);
    }

    // Emit `gamepad.buttondown`, for example.
    self.emit(formatEvent(name, detail));

    name += '.' + self.gamepadSlug(detail.gamepad);

    // Emit `gamepad.buttondown.oculusremote`, for example.
    self.emit(formatEvent(name, detail));

    if (detail.button) {
      // Emit `gamepad.buttondown.oculusremote.b1`, for example.
      self.emit(formatEvent(name + '.b' + detail.button.index, detail));

      if (detail.button.name) {
        // Emit `gamepad.buttondown.oculusremote.back`, for example.
        self.emit(formatEvent(name + '.' + detail.button.name, detail));
      }
    }
  }

  this.previousState = Object.assign({}, this.state);
};

Gamepads.prototype.buttonValue = function (btn) {
  if (!this.supported) { return 0; }
  return typeof btn === 'number' ? btn : btn.value;
};

Gamepads.prototype.buttonPressed = function (btn) {
  if (!this.supported) { return false; }
  return (typeof btn === 'number' ? btn : btn.value) > this.settings.buttonThreshold;
};

Gamepads.prototype.buttonName = function (gp, btnIndex) {
  if (!this.supported) { return; }
  return this.settings.mappings[gp.id] && this.settings.mappings[gp.id]['b' + btnIndex];
};

Gamepads.prototype.gamepadSlug = function (gp) {
  if (!this.supported) { return ''; }
  return slugify(gp.id);
};

Gamepads.prototype.emit = function (event) {
  console.log('emit', event);
  if (!this.supported) { return; }
  if (this.settings.emitEventsOnWindow) {
    window.dispatchEvent(event);
  }
  if (this.settings.postMessageEventsOn) {
    var el = this.settings.postMessageEventsOn;
    if (typeof el === 'string') {
      el = document.querySelector(this.settings.postMessageEventsOn);
    }
    if (el) {
      el.postMessage({type: 'event', data: {type: event.type, detail: event}}, '*');
    }
  }
};

if (GAMEPAD_CONTROLS_ENABLED) {
  var GAMEPADS = new Gamepads(window.GAMEPADS_SETTINGS);

  if (typeof define === 'function' && define.amd) {
    define('GAMEPADS', GAMEPADS);
  } else if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    module.exports = GAMEPADS;
  } else if (window) {
    window.GAMEPADS = GAMEPADS;
  }

  window.addEventListener('gamepad.buttonhold.openvrgamepad.menu', function () {
    toggleCanvasRecording(0);
  });
}
