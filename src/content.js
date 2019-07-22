// Capture incomding HTTP data
setTimeout(() => {
  console.log('Loaded content.js');
}, 2000);

// Capture HTML changes
// setTimeout(() => {
//   const ul = $('div.stream ul.lazyLoadingList__list');

//   function getItems() {
//     return ul.find('li.soundList__item');
//   }

//   const observer = new MutationObserver((mutations) => {
//     // mutations.forEach((mutation) => {
//     //   mutation.addedNodes.forEach((addedNode) => {
//     //     insertedNodes.push(addedNode);
//     //   })
//     // })

//     console.log('Hello mutations:', mutations);
//     console.log('Items', getItems());
//   })

//   observer.observe(ul.get(0), { childList: true });
//   console.log('Items', getItems());
// }, 2000);
