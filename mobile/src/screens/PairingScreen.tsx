import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePairingGate } from '../navigation/RootNavigator';
import * as pairingService from '../services/pairingService';
import type { PairingStatus } from '../services/pairingService';

export default function PairingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { onLinked, onUnlinked } = usePairingGate();

  const [status, setStatus] = useState<PairingStatus | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const s = await pairingService.getStatus();
      setStatus(s);
    } catch {
      setError('Failed to load status.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      const s = await pairingService.sendInvite(email.trim());
      setStatus(s);
      setEmail('');
      if (s.status === 'linked') onLinked();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setError('');
    setLoading(true);
    try {
      const s = await pairingService.cancelInvite();
      setStatus(s);
    } catch {
      setError('Failed to cancel invite.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setError('');
    setLoading(true);
    try {
      const s = await pairingService.breakLink();
      setStatus(s);
      onUnlinked();
    } catch {
      setError('Failed to disconnect.');
    } finally {
      setLoading(false);
    }
  }

  function daysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const canGoBack = navigation.canGoBack();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {canGoBack && (
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      )}

      <Text style={[styles.title, !canGoBack && styles.titleGate]}>Connection</Text>

      {loading && !status ? (
        <ActivityIndicator color="#ff4d6d" size="large" />
      ) : null}

      {status?.status === 'free' && (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Connect with someone</Text>
          <Text style={styles.hint}>Enter their email address to send a connection invite.</Text>
          <TextInput
            style={styles.input}
            placeholder="Their email address"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.button} onPress={handleConnect} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ff4d6d" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </Pressable>
        </View>
      )}

      {status?.status === 'pending' && (
        <View style={styles.section}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, styles.dotOrange]} />
            <Text style={styles.statusText}>Waiting for them to connect back</Text>
          </View>
          <Text style={styles.emailText}>{status.invitedEmail}</Text>
          <Text style={styles.hint}>
            Invite expires in {daysUntil(status.expiresAt)} day{daysUntil(status.expiresAt) !== 1 ? 's' : ''}
          </Text>
          <Pressable style={[styles.button, styles.buttonOutline]} onPress={handleCancel} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ff4d6d" />
            ) : (
              <Text style={styles.buttonText}>Cancel Invite</Text>
            )}
          </Pressable>
        </View>
      )}

      {status?.status === 'linked' && (
        <View style={styles.section}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
          <Text style={styles.emailText}>{status.partnerEmail}</Text>
          <Pressable style={[styles.button, styles.buttonOutline]} onPress={handleDisconnect} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ff4d6d" />
            ) : (
              <Text style={styles.buttonText}>Disconnect</Text>
            )}
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  back: {
    marginTop: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#ff4d6d',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ff4d6d',
    marginBottom: 32,
    marginTop: 16,
  },
  titleGate: {
    marginTop: 48,
  },
  section: {
    width: '100%',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 14,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ff4d6d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    marginTop: 24,
  },
  buttonText: {
    color: '#ff4d6d',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotOrange: {
    backgroundColor: '#f97316',
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  emailText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  error: {
    color: '#e53935',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
