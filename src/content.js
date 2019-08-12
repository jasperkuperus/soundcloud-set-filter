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
      this.url = url; // the request url
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
   * Handles new incoming XHR data.
   */
  function xhrHandler(data) {
    console.log('Handling XHR!', data);
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
