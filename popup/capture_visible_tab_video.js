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
var recordButton = document.querySelector('#record');
var sources = [];
var stopButton = document.querySelector('#stop');

var canvasNumber = canvasSourceField.value;
var framerate = framerateField.value;

function getActiveTab () {
  return browser.tabs.query({active: true, currentWindow: true});
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
  console.log('popup received msg', msg);
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
  if (msg.recorderState === 'recording') {
    isRecording = true;
    setIcon(ICON_RED);
  } else if (msg.recorderState) {
    setIcon(ICON_GREEN);
    document.documentElement.dataset.state = msg.recorderState;
  }
}

/**
 * Assign `notify()` as a listener to messages from the content script.
 */
browser.runtime.onMessage.addListener(notify);

function msgTab (data) {
  return getActiveTab().then(tabs => {
    activeTab = tabs[0];
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
  state: 'ready'
});

recordButton.addEventListener('click', record);
stopButton.addEventListener('click', stop);

browser.browserAction.onClicked.addListener(function () {
  console.log('clicked', isRecording);
  if (isRecording) {
    stop();
  }
});
