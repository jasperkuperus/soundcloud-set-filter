/**
 * Contains the plugin code that will be injected by `injectPlugin`.
 */
function plugin() {
  /**
   * Initializes the XHR interceptor, overriding XMLHttpRequest and
   * add a call to `xhrHandler` on response.
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
   * Due to late injection by Google Chrome, sometimes this code runs
   * after the first XHR for the stream has already returned. That way
   * we miss the first results. This method performs the first stream
   * request manually, making sure our code handles the first page of
   * the stream.
   */
  (function performFirstStreamRequest() {
    // Grab some secret tokens to perform the HTTP request
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
  // TODO: Make configurable
  const djSetThreshold = 15;

  // Keep data stored here ({ uuid => { item, isInitialized } lookup)
  const stream = {};

  /**
   * Checks whether an item in the stream contains a DJ set. Either the
   * track, or one or more tracks in a playlist should exceed the duration
   * threshold. Returns also the actual object (`playlist` or `track`).
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
   * Handles incoming XHR responses. Merges the data into `stream`.
   * Then, loops through the items and hides everything that isn't
   * a DJ set and adds a click handler to allow toggling it.
   */
  function xhrHandler(data) {
    // Create a lookup and merge it into the stream, this helps prevent
    // duplicates / unnecessary DOM manipulation
    const lookup = data.collection.reduce((accumulator, current) => {
      accumulator[current.uuid] = {
        item: current,
        isInitialized: false,
      };
      return accumulator;
    }, {});
    Object.assign(stream, lookup)

    // Check what to hide/show
    Object.values(stream).forEach((streamItem) => {
      const analyzedItem = analyzeItem(streamItem.item);
      if (!analyzedItem.isDJSet && !streamItem.isInitialized) {
        // Use some XPath magic to find the parent DOM node
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
        streamItem.isInitialized = true;
      }
    });
  }
}


/**
 * When `head` is ready, inject the plugin as a `script` tag containing
 * the code for the `plugin` function.
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
