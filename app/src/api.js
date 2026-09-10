import { getConfig } from './config';

function networkHelp(baseUrl) {
  if (!baseUrl) {
    return 'No backend URL is set. Open the Settings tab and enter the address of your backend, for example http://192.168.1.2:4000 for a Mac on the same wifi or https://your-service.onrender.com for a hosted server.';
  }
  return (
    'Could not reach the backend at ' +
    baseUrl +
    '. Open the Settings tab, check the URL and use Test connection. If it is a Mac on your home network, the server must be running and the phone must be on the same wifi. If it is a hosted server, it may still be deploying or asleep.'
  );
}

function unauthorizedHelp() {
  return 'The backend rejected the API key. Open the Settings tab and enter the key that matches the API_KEY environment variable on the server, or clear it if the server does not use one.';
}

async function request(path, method, body) {
  const { apiUrl, apiKey } = getConfig();

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (apiKey) headers['x-api-key'] = apiKey;
  const hasHeaders = Object.keys(headers).length > 0;

  let response;
  try {
    response = await fetch(apiUrl + path, {
      method,
      headers: hasHeaders ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error(networkHelp(apiUrl));
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

  if (response.status === 401) {
    throw new Error(unauthorizedHelp());
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
