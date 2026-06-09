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
      setError('Não foi possível carregar o estado.');
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
      setError(e?.response?.data?.error ?? 'Não foi possível enviar o convite.');
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
      setError('Não foi possível cancelar o convite.');
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
      setError('Não foi possível desligar.');
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
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>
      )}

      <Text style={[styles.title, !canGoBack && styles.titleGate]}>Conexão</Text>

      {loading && !status ? (
        <ActivityIndicator color="#ff4d6d" size="large" />
      ) : null}

      {/* Cenário A: utilizador novo, sem ligação prévia */}
      {status?.status === 'free' && (
        <View style={styles.section}>
          <Text style={styles.welcomeText}>
            Bem-vindo à nossa aplicação! Para começares a utilizar todas as funcionalidades, precisas de te conectar a outra pessoa. Atualmente, ainda não tens nenhuma ligação estabelecida.
          </Text>
          <Text style={styles.subtitle}>Queres procurar alguém para se conectar contigo?</Text>
          <TextInput
            style={styles.input}
            placeholder="Email da outra pessoa"
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
              <Text style={styles.buttonText}>Conectar</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Cenário B: ligação anterior quebrada */}
      {status?.status === 'broken' && (
        <View style={styles.section}>
          <View style={styles.brokenBadge}>
            <View style={[styles.dot, styles.dotRed]} />
            <Text style={styles.brokenBadgeText}>Ligação terminada</Text>
          </View>
          <Text style={styles.brokenText}>
            Lamentavelmente, a tua conexão já não está ativa, por isso vais ter que voltar a registar uma nova ligação com outra pessoa ou com a mesma pessoa para que possas continuar a usar o software.
          </Text>
          <TextInput
            style={[styles.input, styles.inputSpaced]}
            placeholder="Email da outra pessoa"
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
              <Text style={styles.buttonText}>Nova Ligação</Text>
            )}
          </Pressable>
        </View>
      )}

      {status?.status === 'pending' && (
        <View style={styles.section}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, styles.dotOrange]} />
            <Text style={styles.statusText}>A aguardar resposta</Text>
          </View>
          <Text style={styles.emailText}>{status.invitedEmail}</Text>
          <Text style={styles.hint}>
            O convite expira em {daysUntil(status.expiresAt)} dia{daysUntil(status.expiresAt) !== 1 ? 's' : ''}
          </Text>
          <Pressable style={[styles.button, styles.buttonOutline]} onPress={handleCancel} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ff4d6d" />
            ) : (
              <Text style={styles.buttonText}>Cancelar Convite</Text>
            )}
          </Pressable>
        </View>
      )}

      {status?.status === 'linked' && (
        <View style={styles.section}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, styles.dotGreen]} />
            <Text style={styles.statusText}>Conectado</Text>
          </View>
          <Text style={styles.emailText}>{status.partnerEmail}</Text>
          <Pressable style={[styles.button, styles.buttonOutline]} onPress={handleDisconnect} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ff4d6d" />
            ) : (
              <Text style={styles.buttonText}>Desligar</Text>
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
  welcomeText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  brokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  brokenBadgeText: {
    fontSize: 15,
    color: '#e53935',
    fontWeight: '600',
  },
  brokenText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  inputSpaced: {
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
  dotRed: {
    backgroundColor: '#e53935',
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
