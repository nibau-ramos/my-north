import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { authState, logout } = useAuth();

  const user = authState.status === 'authenticated' ? authState.user : null;
  const isEmailUser = user?.provider === 'email';

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  async function handleChangePassword() {
    setPwdError('');
    setPwdSuccess('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('Preenche todos os campos.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('As novas passwords não coincidem.');
      return;
    }
    if (newPwd.length < 8) {
      setPwdError('A nova password deve ter pelo menos 8 caracteres.');
      return;
    }
    setPwdLoading(true);
    try {
      await authService.changePassword(currentPwd, newPwd);
      setPwdSuccess('Password alterada com sucesso.');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e: any) {
      setPwdError(e?.response?.data?.error ?? 'Não foi possível alterar a password.');
    } finally {
      setPwdLoading(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Encerrar conta',
      'Tens a certeza? Esta ação é irreversível e todos os teus dados serão eliminados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar conta',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.deleteAccount();
              await logout();
            } catch {
              Alert.alert('Erro', 'Não foi possível encerrar a conta. Tenta novamente.');
            }
          },
        },
      ],
    );
  }

  function confirmLogout() {
    Alert.alert('Terminar sessão', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>

        <Text style={styles.title}>A Minha Conta</Text>

        {/* Profile details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{user?.email ?? '—'}</Text>

          <View style={styles.divider} />

          <Text style={styles.cardLabel}>Conta</Text>
          <View style={styles.providerRow}>
            <View style={[styles.providerBadge, user?.provider === 'google' ? styles.badgeGoogle : styles.badgeEmail]}>
              <Text style={styles.providerBadgeText}>
                {user?.provider === 'google' ? 'Google' : 'Email / Password'}
              </Text>
            </View>
          </View>
        </View>

        {/* Change password — only for email users */}
        {isEmailUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alterar Password</Text>

            <TextInput
              style={styles.input}
              placeholder="Password atual"
              placeholderTextColor="#aaa"
              value={currentPwd}
              onChangeText={setCurrentPwd}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Nova password (mín. 8 caracteres)"
              placeholderTextColor="#aaa"
              value={newPwd}
              onChangeText={setNewPwd}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar nova password"
              placeholderTextColor="#aaa"
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry
            />

            {pwdError ? <Text style={styles.errorText}>{pwdError}</Text> : null}
            {pwdSuccess ? <Text style={styles.successText}>{pwdSuccess}</Text> : null}

            <Pressable style={styles.button} onPress={handleChangePassword} disabled={pwdLoading}>
              {pwdLoading ? (
                <ActivityIndicator color="#ff4d6d" />
              ) : (
                <Text style={styles.buttonText}>Guardar Password</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Logout */}
        <View style={styles.section}>
          <Pressable style={styles.button} onPress={confirmLogout}>
            <Text style={styles.buttonText}>Terminar Sessão</Text>
          </Pressable>
        </View>

        {/* Delete account */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerTitle}>Zona de Perigo</Text>
          <Pressable style={styles.dangerButton} onPress={confirmDeleteAccount}>
            <Text style={styles.dangerButtonText}>Encerrar Conta</Text>
          </Pressable>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 24,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backText: {
    color: '#ff4d6d',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ff4d6d',
    marginBottom: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  providerRow: {
    flexDirection: 'row',
  },
  providerBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeGoogle: {
    backgroundColor: '#fce8e6',
  },
  badgeEmail: {
    backgroundColor: '#e8f0fe',
  },
  providerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
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
    marginBottom: 12,
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
  buttonText: {
    color: '#ff4d6d',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#e53935',
    fontSize: 14,
    marginBottom: 10,
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
    marginBottom: 10,
  },
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: '#fce8e6',
    paddingTop: 24,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e53935',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  dangerButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '600',
  },
});
