var canvasSourceField = document.querySelector('#source');
var framerateField = document.querySelector('#framerate');
var isRecording = false;
var recordButton = document.querySelector('#record');
var sources = [];
var stopButton = document.querySelector('#stop');

var canvasNumber = canvasSourceField.value;
var framerate = framerateField.value;

function getActiveTab () {
  return browser.tabs.query({active: true, currentWindow: true});
}

function markIsRecording (bool, state) {
  isRecording = bool;
  document.documentElement.dataset.state = state;
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
  if (msg.sources) {
    canvasSourceField.options = [];
    msg.sources.map(function (source, idx) {
      canvasSourceField.options.add(new Option(source, idx));
    });
  }
  if ('isRecording' in msg) {
    isRecording = msg.isRecording;
  }
}

/**
 * Assign `notify()` as a listener to messages from the content script.
 */
browser.runtime.onMessage.addListener(notify);

function msgTab (data) {
  return getActiveTab().then(tabs => {
    return browser.tabs.sendMessage(tabs[0].id, Object.assign({
      source: 'cancorder',
      canvasNumber: document.querySelector('#source').value,
      framerate: document.querySelector('#framerate').value
    }, data));
  });
}

function record () {
  msgTab({
    request: 'record'
  });
  markIsRecording(true, 'recording');
}

function stop () {
  msgTab({
    request: 'stop'
  });
  markIsRecording(false, 'stopped');
}

msgTab({
  state: 'ready'
});

recordButton.addEventListener('click', record);
stopButton.addEventListener('click', stop);
