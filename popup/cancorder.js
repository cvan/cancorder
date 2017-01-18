/* global browser */
var ICON_GREEN = {
  32: '../icons/camcorder-green-32.png',
  64: '../icons/camcorder-green-64.png'
};
var ICON_RED = {
  32: '../icons/camcorder-red-32.png',
  64: '../icons/camcorder-red-64.png'
};

var activeTab;
var canvasSourceField = document.querySelector('#source');
var framerateField = document.querySelector('#framerate');
var isRecording = false;
var recordButton = document.querySelector('#record');
var sources = browser.storage.local.get('cancorder:sources');
var stopButton = document.querySelector('#stop');

var state = {
  source: 'cancorder',
  canvasNumber: canvasSourceField.value || 0,
  framerate: framerateField.value || 15
};

function setState (data) {
  Object.assign(state, data);
  return state;
}

function setIcon (icon) {
  browser.browserAction.setIcon({
    path: icon,
    tabId: activeTab.id
  });
}

/**
 * Log that we received the message.
 * Then display a notification. The notification contains the URL,
 * which we read from the message.
*/
function notify (msg) {
  if (msg.source !== 'cancorder') {
    return;
  }
  console.log('[cancorder][popup] received msg', msg);
  if (msg.sources) {
    canvasSourceField.options.length = 0;
    document.querySelector('#logs').innerHTML += JSON.stringify(msg) + '<br>\n';
    msg.sources.map(function (source, idx) {
      canvasSourceField.options.add(new Option(source, idx));
    });
  }
  if (msg.recorderState) {
    setIcon();
  }
  isRecording = msg.recorderState;
  document.documentElement.dataset.state = msg.recorderState;
}

/**
 * Assign `notify()` as a listener to messages from the content script.
 */
browser.runtime.onMessage.addListener(notify);

function getActiveTab () {
  return browser.tabs.query({active: true, currentWindow: true});
}

function msgTab (data) {
  return getActiveTab().then(function (tabs) {
    activeTab = tabs[0];
    updateState(data);
    return browser.tabs.sendMessage(tabs[0].id, state);
  });
}

function record () {
  msgTab({
    request: 'record'
  });
  document.documentElement.dataset.state = 'recording';
  setTimeout(function () {
    window.close();
  }, 0);
}

function stop () {
  msgTab({
    request: 'stop'
  });
  document.documentElement.dataset.state = 'stopped';
}

msgTab({
  request: 'setup'
});
console.log('setup');

recordButton.addEventListener('click', record);
stopButton.addEventListener('click', stop);

browser.browserAction.onClicked.addListener(function () {
  console.log('[cancorder][popup] clicked', isRecording);
  if (isRecording) {
    stop();
  }
});

var form = document.querySelector('form');

form.addEventListener('change', function (e) {
  console.log('[cancorder][popup] form changed', e);
  state.canvasNumber = document.querySelector('#source').value;
  state.framerate = document.querySelector('#framerate').value;
});

form.addEventListener('submit', function (e) {
  console.log('[cancorder][popup] submitted', e);
  state.canvasNumber = document.querySelector('#source').value;
  state.framerate = document.querySelector('#framerate').value;
});

var port = chrome.extension.connect({
    name: 'Sample Communication'
});
port.postMessage('Hi Background');
port.onMessage.addListener(function (msg) {
  console.log('message received:', msg);
});
