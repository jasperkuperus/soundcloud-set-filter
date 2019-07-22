function logComplete(requestDetails) {
  if (requestDetails.url.startsWith('https://api-v2.soundcloud.com/stream')) {
    console.log('DURP', requestDetails);
  }
}

chrome.webRequest.onCompleted.addListener(logComplete, {
  urls: ['<all_urls>'],
})


chrome.webRequest.onResponseStarted.addListener(function(details) {
  console.log(details);
}, {
  urls: ['<all_urls>'],
})
