import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { getConfig, normalizeUrl, saveConfig } from '../config';
import { colors, spacing } from '../theme';

const TEST_TIMEOUT_MS = 8000;

function readableReason(error, timedOut) {
  if (timedOut) {
    return 'no reply within ' + Math.round(TEST_TIMEOUT_MS / 1000) + ' seconds';
  }
  const raw = String((error && error.message) || '').trim();
  if (/could not be found|nodename|servname|dns/i.test(raw)) {
    return 'the address could not be found, so the name lookup failed';
  }
  if (/certificate|ssl|tls|secure connection/i.test(raw)) {
    return 'the secure connection failed, which usually means a certificate problem';
  }
  if (/refused/i.test(raw)) {
    return 'the connection was refused, so nothing is listening on that port';
  }
  if (!raw || /cancel|network request failed|fetch failed/i.test(raw)) {
    return 'nothing answered at that address';
  }
  return raw;
}

function describeFailure(url, error, timedOut) {
  const lines = ['Not reachable. Tried ' + url + '/health and ' + readableReason(error, timedOut) + '.'];

  if (/localhost|127\.0\.0\.1/i.test(url)) {
    lines.push(
      'localhost points at the phone itself, not at your computer. Use the computer LAN address instead, such as http://192.168.1.2:4000.'
    );
  } else if (/^http:\/\//i.test(url) && /onrender\.com/i.test(url)) {
    lines.push('Hosted addresses need https, not http. Try https:// in front of the same address.');
  } else if (/^https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
    lines.push(
      'For a computer on your home network: the server must be running, the port must be right, and this device must be on the same wifi.'
    );
  } else {
    lines.push(
      'For a hosted server: check the address is exact, that the deploy has finished, and that a free instance is not still waking up. A first request after sleep can take up to a minute.'
    );
  }

  return lines.join(' ');
}

export default function SettingsScreen() {
  const current = getConfig();
  const keyRef = useRef(null);
  const [url, setUrl] = useState(current.apiUrl);
  const [key, setKey] = useState(current.apiKey);
  const [saved, setSaved] = useState('');
  const [savedTone, setSavedTone] = useState(colors.income);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');
  const [resultTone, setResultTone] = useState(colors.muted);

  async function onSave() {
    setSaving(true);
    setSaved('');
    try {
      const stored = await saveConfig({ apiUrl: url, apiKey: key });
      setUrl(stored.apiUrl);
      setKey(stored.apiKey);
      if (stored.persisted) {
        setSavedTone(colors.income);
        setSaved(
          stored.apiUrl
            ? 'Saved. The app will use ' + stored.apiUrl + ' from now on, including after a restart.'
            : 'Saved. No URL is set, so the app falls back to the address built into this build.'
        );
      } else {
        setSavedTone(colors.expense);
        setSaved('Using these settings now, but this device would not store them. They will be lost when the app restarts.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    const target = normalizeUrl(url);
    setResult('');

    if (!target) {
      setResultTone(colors.danger);
      setResult('Enter a backend URL first.');
      return;
    }
    if (!/^https?:\/\//i.test(target)) {
      setResultTone(colors.danger);
      setResult('The URL must start with http:// or https://.');
      return;
    }

    setTesting(true);
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TEST_TIMEOUT_MS);
    const trimmedKey = key.trim();

    let response;
    try {
      response = await fetch(target + '/health', {
        method: 'GET',
        headers: trimmedKey ? { 'x-api-key': trimmedKey } : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      setTesting(false);
      setResultTone(colors.danger);
      setResult(describeFailure(target, error, timedOut));
      return;
    }
    clearTimeout(timer);

    let text = '';
    try {
      text = await response.text();
    } catch (readError) {
      text = '';
    }
    setTesting(false);

    if (response.status === 401) {
      setResultTone(colors.expense);
      setResult(
        'Reachable, but the server rejected the API key (401). ' +
          (trimmedKey
            ? 'The key above does not match the API_KEY set on the server.'
            : 'This server requires a key. Enter the value of API_KEY from the server settings above, then Save.')
      );
      return;
    }

    if (!response.ok) {
      setResultTone(colors.expense);
      setResult(
        'Reachable, but ' +
          target +
          '/health replied HTTP ' +
          response.status +
          '. Something is answering at that address, but it does not look like the expense backend. Check the address for a typo or a missing port.'
      );
      return;
    }

    let ok = false;
    try {
      ok = !!JSON.parse(text).ok;
    } catch (parseError) {
      ok = false;
    }

    if (ok) {
      setResultTone(colors.income);
      setResult('Reachable and healthy. ' + target + ' answered /health normally' + (trimmedKey ? ' and accepted the API key.' : '.'));
    } else {
      setResultTone(colors.expense);
      setResult(
        'Reachable, and ' +
          target +
          '/health replied HTTP 200, but the answer was not the expected health response. Check that this address points at the expense backend.'
      );
    }
  }

  const busy = saving || testing;

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Backend</Text>
        <Text style={styles.body}>
          This app talks to your own server. Set its address here so this install can be pointed anywhere.
        </Text>

        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          textContentType="URL"
          keyboardType="url"
          inputMode="url"
          returnKeyType="next"
          onSubmitEditing={() => keyRef.current && keyRef.current.focus()}
          placeholder="https://expensia-gs7p.onrender.com/health"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.hint}>
          http://192.168.1.2:4000 for a Mac on the same wifi. https://your-service.onrender.com for a Render deploy. No
          trailing slash needed.
        </Text>

        <Text style={styles.label}>API key (optional)</Text>
        <TextInput
          style={styles.input}
          ref={keyRef}
          value={key}
          onChangeText={setKey}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          textContentType="none"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Leave blank if the server has none"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.hint}>
          Must match the API_KEY environment variable set on the backend. Leave it blank when the backend has no API_KEY
          set, which is the normal setup at home.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={onSave}
          disabled={busy}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {saved ? <Text style={[styles.message, { color: savedTone }]}>{saved}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.title}>Test connection</Text>
        <Text style={styles.body}>
          Checks the address typed above, whether or not it has been saved yet.
        </Text>

        <TouchableOpacity
          style={[styles.secondaryButton, busy && styles.buttonDisabled]}
          onPress={onTest}
          disabled={busy}
        >
          {testing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Test connection</Text>
          )}
        </TouchableOpacity>

        {result ? <Text style={[styles.message, { color: resultTone }]}>{result}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.title}>In use now</Text>
        <Text style={styles.mono}>{current.apiUrl || 'No backend URL set'}</Text>
        <Text style={styles.hint}>
          {current.apiKey ? 'An API key is set.' : 'No API key is set.'} Saved changes apply to the other tabs
          immediately.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  mono: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
});
