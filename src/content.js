/**
 * Contains the plugin code that will be injected in the page by
 * the `injectPlugin` code.
 */
function plugin() {
  /**
   * Initializes the XHR interceptor. Overrides the XMLHttpRequest and
   * correctly calls the handler.
   */
  (function initXHRInterceptor() {
    var XHR = XMLHttpRequest.prototype;
    var send = XHR.send;
    var open = XHR.open;

    XHR.open = function(method, url) {
      this.url = url;
      return open.apply(this, arguments);
    }

    XHR.send = function() {
      this.addEventListener('load', function() {
        if (this.url.includes('https://api-v2.soundcloud.com/stream')) {
          xhrHandler(JSON.parse(this.response));
        }
      });
      return send.apply(this, arguments);
    };
  })();

  // TODO: Re-do the first XHR if we did not get it...

  // Threshold in minutes before we consider it a DJ set in minutes
  const djSetThreshold = 15;

  // Keep data stored here
  let stream = [];

  /**
   * Checks whether an item in the stream contains a DJ set. Checks
   * whether the item (or an item in a playlist) has a duration that
   * exceeds the threshold.
   */
  function analyzeItem(item) {
    let actualitem = null;
    let isDJSet = false;

    if (['track', 'track-repost'].includes(item.type)) {
      // Single track, just check the duration
      isDJSet = (item.track.duration / 1000 / 60) > djSetThreshold;
      actualitem = item.track;
    } else if (['playlist', 'playlist-repost'].includes(item.type)) {
      // Playlist, check if there is at least 1 track
      actualitem = item.playlist
      for (const track of item.playlist.tracks) {
        isDJSet = isDJSet || (track.duration / 1000 / 60) > djSetThreshold;
      }
    }

    return {
      item: actualitem,
      isDJSet,
    };
  }

  /**
   * Handles new incoming XHR data. Append the data, loop through
   * the items in the result.
   */
  function xhrHandler(data) {
    stream = stream.concat(data.collection);
    console.log(stream);

    // Check what to hide/show
    stream.forEach((item) => {
      const analyzedItem = analyzeItem(item);
      if (!analyzedItem.isDJSet) {
        const domNode = document.evaluate(`//li[contains(@class, "soundList__item") and descendant::span[text()="${analyzedItem.item.title}"]]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        domNode.style.opacity = 0.25;
      }
    });
  }
}


/**
 * Injects the plugin code into the DOM. When `head` is ready,
 * inject the `script` tag with the contents of our plugin function.
 */
(function injectPlugin() {
  if (document.body && document.head) {
    var xhrOverrideScript = document.createElement('script');
    xhrOverrideScript.type = 'text/javascript';
    xhrOverrideScript.innerHTML = `(${plugin.toString()})();`;
    document.head.prepend(xhrOverrideScript);
  } else {
    requestIdleCallback(injectPlugin);
  }
})();
