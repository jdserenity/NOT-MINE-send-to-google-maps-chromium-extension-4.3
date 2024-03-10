var GOOGLE_MAPS_BASE_URL = 'https://maps.google.com';
var URL_REVERSE_GEO_CODE = 'https://maps.googleapis.com/maps/api/geocode/json?sensor=false&key=AIzaSyB9QoZrS831r0NSeZKHu1hr6PMDuivKy4U&latlng=';
var LS_STORAGE_NAME = 'showOnMapsAddresses';
var LS_STORAGE_NAME_COUNRTY = 'showOnMapsCC';
var LS_STORAGE_ID = 'ID';
var LS_STORAGE_TRANSPORT = 'TRANSPORT';
var LS_STORAGE_conMenuConfig = 'conMenuConfig';
var LS_STORAGE_VERSION = 'firstrunSTGM';
var version = 40;
var showOptionsPageAfterUpdate = false;
var counter = 0;
var logLevel = 'PROD'; // set to Debug to get Log entries

async function rebuildContextMenu() {
  log('rebuild Context menu');
  chrome.contextMenus.removeAll();
  await buildContextMenu();
}

async function getID() {
  var idFromStorage = await readFromStorage(LS_STORAGE_ID);

  if (idFromStorage) {return idFromStorage;} else {
    var id = Math.random() * 100000000000000000;
    writeToStorage(LS_STORAGE_ID, id);
    return id;
  }
}

async function getInstalledVersion() {
  val = await readFromStorage(LS_STORAGE_VERSION);
  return val;	
}

function setInstalledVersion(val) {
  return writeToStorage(LS_STORAGE_VERSION, val);
}

async function getConMenuConfig() {
  var val = await readFromStorage(LS_STORAGE_conMenuConfig);
  if (val == undefined) {
    var conMenuConfig = setConMenuConfig(true, true, true);
    return conMenuConfig;
  } else {return JSON.parse(val);}
}

function setConMenuConfig(curPos, dirSel, dirCurPos) {
  conMenuConfig = new Object();
  conMenuConfig.curPos = curPos;
  conMenuConfig.dirSel = dirSel;
  conMenuConfig.dirCurPos = dirCurPos;
	
  writeToStorage(LS_STORAGE_conMenuConfig, JSON.stringify(conMenuConfig));
  return conMenuConfig
}

async function getTransportationMode() {
  var val = await readFromStorage(LS_STORAGE_TRANSPORT);
  if (val) {return val;} else {
    var transport = 'd';
    writeToStorage(LS_STORAGE_TRANSPORT, transport);
    return transport;
  }
}

function setTransportationMode(transport) {
  writeToStorage(LS_STORAGE_TRANSPORT, transport);
}

async function readCountryURL() {
  defaultSetting = new Object();
  defaultSetting.country = 'Default';
  defaultSetting.url = GOOGLE_MAPS_BASE_URL;
	
  var val = await readFromStorage(LS_STORAGE_NAME_COUNRTY);
  log('country: ' + val);
  if (val != undefined) {
    return JSON.parse(val);
  } else {return defaultSetting;}
}

function writeCountry(url, country) {
  log('writeCountry' + url + country);
  defaultSetting = new Object();
  defaultSetting.country = country;
  defaultSetting.url = url;
	
  writeToStorage(LS_STORAGE_NAME_COUNRTY, JSON.stringify(defaultSetting));
}

function log(text) {
  if (logLevel == 'DEBUG') {console.log(text);}
}

async function readInAddresses() {
  var address = new Array();

  var addressesAvailable = await readFromStorage(LS_STORAGE_NAME);
  if (addressesAvailable != undefined) {
    var db = JSON.parse(addressesAvailable);

    var addresses = db.addresses;
				
    for (var i = 0; i < addresses.length; i++) {
      if (addresses[i].name != undefined) {	
        address[address.length] = addresses[i];
        if (address[i].id > counter) {counter = address[i].id;}
      }
    }
  } else {
    writeAddressesToLocalStorage(address);
  }
  return address;
}

function writeAddressesToLocalStorage(addresses) {
  var addressHolder = new Object();
  addressHolder.addresses = addresses;
  writeToStorage(LS_STORAGE_NAME, JSON.stringify(addressHolder));
}

async function addressesSaved() {
  var savedAddresses = await readInAddresses();
	
  if (savedAddresses.length > 0) {return true;} else {return false;}
}

async function countSavedAddresses() {
  var addressesFromStorage = await readInAddresses();
  return addressesFromStorage.length;
}

function readFromStorage(key) {
  return new Promise((resolve, reject) =>
    chrome.storage.sync.get(key, result => {
      if (chrome.runtime.lastError) {
        log(chrome.runtime.lastError.message);
        // reject(Error(chrome.runtime.lastError.message))
        resolve(undefined);
      } else {
        // log('Value '+key+' currently is ' + result[key]);
        resolve(result[key]);
      }
    })
  );
}

function writeToStorage(key, value) {
  var obj = {};
  obj[key] = value;

  return new Promise((resolve, reject) =>
    chrome.storage.sync.set(obj, () => {
      if (chrome.runtime.lastError) {
        log(chrome.runtime.lastError.message);
        reject(Error(chrome.runtime.lastError.message))
      } else {
        log('Value ' + key + ' is set to ' + value);
        resolve();
      }
    })
  );
}

function removeFromStorage(key) {
  chrome.storage.sync.remove(key, function (result) {
    log('Value was removed: ' + key);
  });
}

async function onStorageChangeListener(changes, namespace) {
  if (namespace !== 'sync') {
    return;
  }
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
	  log('Storage key ' + key + ' in namespace ' + namespace + ' changed. Old value was ' + oldValue + ', new value is ' + newValue);
  }
  await rebuildContextMenu();
}
