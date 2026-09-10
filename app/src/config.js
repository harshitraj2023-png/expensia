import AsyncStorage from '@react-native-async-storage/async-storage';

const URL_KEY = 'eorm:apiUrl';
const KEY_KEY = 'eorm:apiKey';

export function normalizeUrl(value) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/\/+$/, '');
}

export const ENV_API_URL = normalizeUrl(process.env.EXPO_PUBLIC_API_URL || '');

let cache = { apiUrl: ENV_API_URL, apiKey: '' };
let initPromise = null;

export function getConfig() {
  return cache;
}

export function getApiUrl() {
  return cache.apiUrl;
}

export function getApiKey() {
  return cache.apiKey;
}

export async function loadConfig() {
  let storedUrl = null;
  let storedKey = null;
  try {
    const pairs = await AsyncStorage.multiGet([URL_KEY, KEY_KEY]);
    for (const pair of pairs) {
      if (pair[0] === URL_KEY) storedUrl = pair[1];
      if (pair[0] === KEY_KEY) storedKey = pair[1];
    }
  } catch (storageError) {
    storedUrl = null;
    storedKey = null;
  }

  const apiUrl = storedUrl == null || storedUrl === '' ? ENV_API_URL : normalizeUrl(storedUrl);
  const apiKey = storedKey == null ? '' : String(storedKey);
  return { apiUrl, apiKey };
}

export async function saveConfig({ apiUrl, apiKey }) {
  const next = {
    apiUrl: normalizeUrl(apiUrl),
    apiKey: apiKey == null ? '' : String(apiKey).trim(),
  };
  cache = next;

  try {
    await AsyncStorage.multiSet([
      [URL_KEY, next.apiUrl],
      [KEY_KEY, next.apiKey],
    ]);
    return { ...next, persisted: true };
  } catch (storageError) {
    return { ...next, persisted: false };
  }
}

export function initConfig() {
  if (!initPromise) {
    initPromise = loadConfig().then((loaded) => {
      cache = loaded;
      return loaded;
    });
  }
  return initPromise;
}
