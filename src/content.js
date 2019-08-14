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

  /**
   * Perform the initial SoundCloud stream request, as we sometimes
   * miss it due to our late injection by Google Chrome.
   */
  (function performFirstStreamRequest() {
    // Grab some secret values in order to send the HTTP request
    const sc_a_id = JSON.parse(window.localStorage.getItem('V2::local::promoted-persistent'))
    const authToken = decodeURIComponent(RegExp('oauth_token[^;]+').exec(document.cookie)).split('=')[1];
    const userId = authToken.split('-')[2];

    fetch([
      'https://api-v2.soundcloud.com/stream',
      `?sc_a_id=${sc_a_id}`,
      '&device_locale=en',
      '&variant_ids=',
      `&user_urn=soundcloud%3Ausers%3A${userId}`,
      '&promoted_playlist=true',
      '&client_id=7GggXaGxcUUvedkWCEYGyeI2qbWpiXLV',
      '&limit=10',
      '&offset=0',
      '&linked_partitioning=1',
      '&app_version=1565604047',
      '&app_locale=en',
    ].join(''), {
      method: 'GET',
      headers: {
        Authorization: `OAuth ${authToken}`,
      },
    }).then((response) => {
      return response.json();
    }).then((json) => {
      xhrHandler(json);
    });
  })();

  // Threshold in minutes before we consider it a DJ set in minutes
  const djSetThreshold = 15;

  // Keep data stored here ({ uuid => item } lookup)
  const stream = {};

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
    // Create a `{ uuid => item }` lookup and merge it into the stream,
    // this helps prevent duplicates / unnecessary DOM manipulation
    const lookup = data.collection.reduce((accumulator, current) => {
      accumulator[current.uuid] = current;
      return accumulator;
    }, {});
    Object.assign(stream, lookup)

    // Check what to hide/show
    Object.values(stream).forEach((item) => {
      const analyzedItem = analyzeItem(item);
      if (!analyzedItem.isDJSet && !item.isInitialized) {
        // Use some XPath magic to dim the non DJ sets
        const itemDOMNode = document.evaluate(`//li[contains(@class, "soundList__item") and descendant::span[text()="${analyzedItem.item.title}"]]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        itemDOMNode.style.opacity = 0.25;

        // Hide the body of the node
        const bodyDOMNode = itemDOMNode.getElementsByClassName('sound__body')[0]
        bodyDOMNode.style.display = 'none';

        // Make title clickable to toggle this item
        const titleDOMNode = itemDOMNode.getElementsByClassName('soundContext')[0]
        titleDOMNode.style.cursor = 'pointer';
        titleDOMNode.addEventListener('click', () => {
          bodyDOMNode.style.display = (bodyDOMNode.style.display === 'none' ? 'flex' : 'none');
          itemDOMNode.style.opacity = (itemDOMNode.style.opacity === '0.25' ? 0.75 : 0.25);
        });

        // Mark item as initialized
        item.isInitialized = true;
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
