export async function getStorage(keys) {
  return new Promise((resolve) => {
    if (typeof keys === 'string') {
      chrome.storage.sync.get(keys, (result) => {
        resolve(result[keys]);
      });
    } else if (Array.isArray(keys)) {
      chrome.storage.sync.get(keys, resolve);
    } else {
      chrome.storage.sync.get(keys, resolve);
    }
  });
}

export async function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(data, resolve);
  });
}

export async function getLocalStorage(keys) {
  return new Promise((resolve) => {
    if (typeof keys === 'string') {
      chrome.storage.local.get(keys, (result) => {
        resolve(result[keys]);
      });
    } else if (Array.isArray(keys)) {
      chrome.storage.local.get(keys, resolve);
    } else {
      chrome.storage.local.get(keys, resolve);
    }
  });
}

export async function setLocalStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

export async function removeStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(keys, resolve);
  });
}

export async function removeLocalStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}