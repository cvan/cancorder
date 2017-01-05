var ICON_DEFAULT = {
  32: 'icons/camcorder-32.png',
  64: 'icons/camcorder-64.png'
};
var ICON_BLUE = {
  32: 'icons/camcorder-blue-32.png',
  64: 'icons/camcorder-blue-64.png'
};
var ICON_GREEN = {
  32: 'icons/camcorder-green-32.png',
  64: 'icons/camcorder-green-64.png'
};
var ICON_RED = {
  32: 'icons/camcorder-red-32.png',
  64: 'icons/camcorder-red-64.png'
};

/**
 * Updates the browserAction icon to reflect whether the current page
 * is already bookmarked.
 */
function updateIcon (isReady, isRecording, isFinished) {
  var icon = ICON_DEFAULT;
  if (isRecording) {
    icon = ICON_RED;
  } else if (isFinished) {
    icon = ICON_GREEN;
  } else if (isReady) {
    icon = ICON_BLUE;
  }

  browser.browserAction.setIcon({
    path: icon,
    tabId: currentTab.id
  });
}

function updateActiveTab (tabs) {
  function updateTab (tabs) {
    if (!tabs[0]) {
      return;
    }
    currentTab = tabs[0];
    updateIcon();
  }

  var gettingActiveTab = browser.tabs.query({
    active: true,
    currentWindow: true
  });
  gettingActiveTab.then(updateTab);
}

// Listen to tab URL changes.
browser.tabs.onUpdated.addListener(updateActiveTab);

// Listen to tab switching.
browser.tabs.onActivated.addListener(updateActiveTab);

// Update when the extension loads initially.
updateActiveTab();
