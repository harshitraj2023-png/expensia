const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');

const NETWORK_HELP =
  'Could not reach the backend at ' +
  (BASE_URL || '(EXPO_PUBLIC_API_URL is not set)') +
  '. Start the Node server on your Mac, set EXPO_PUBLIC_API_URL in app/.env to the Mac LAN IP (not localhost), restart Expo, and make sure the phone is on the same wifi network as the Mac.';

async function request(path, method, body) {
  let response;
  try {
    response = await fetch(BASE_URL + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error(NETWORK_HELP);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      parsed = null;
    }
  }

  if (!response.ok) {
    throw new Error((parsed && parsed.error) || 'Request failed');
  }
  return parsed;
}

export async function apiGet(path) {
  return request(path, 'GET');
}

export async function apiPost(path, body) {
  return request(path, 'POST', body || {});
}

export async function apiPut(path, body) {
  return request(path, 'PUT', body || {});
}

export async function apiDelete(path) {
  return request(path, 'DELETE');
}
