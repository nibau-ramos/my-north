import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import * as pairingService from '../services/pairingService';
import type { PairingStatus } from '../services/pairingService';
import { usePairingGate } from '../navigation/RootNavigator';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { authState, logout } = useAuth();
  const { onUnlinked } = usePairingGate();

  const user = authState.status === 'authenticated' ? authState.user : null;
  const isEmailUser = user?.provider === 'email';

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [pairingStatus, setPairingStatus] = useState<PairingStatus | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    pairingService.getStatus().then(setPairingStatus).catch(() => {});
  }, []);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

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

  function confirmBreakLink() {
    Alert.alert(
      'Terminar ligação',
      'Tens a certeza que queres terminar a ligação com o teu parceiro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar ligação',
          style: 'destructive',
          onPress: async () => {
            try {
              await pairingService.breakLink();
              navigation.goBack();
              onUnlinked();
            } catch {
              Alert.alert('Erro', 'Não foi possível terminar a ligação. Tenta novamente.');
            }
          },
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await authService.deleteAccount();
      setDeleteModalVisible(false);
      await logout();
    } catch {
      setDeleteLoading(false);
      Alert.alert('Erro', 'Não foi possível encerrar a conta. Tenta novamente.');
    }
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

        {/* Section 1: Profile */}
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

        {/* Change password — email users only */}
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

        {/* Section 2: Connection */}
        {pairingStatus?.status === 'linked' && (
          <View style={[styles.section, styles.sectionBorder]}>
            <Text style={styles.sectionTitle}>A Minha Ligação</Text>
            <View style={styles.connectionCard}>
              <Text style={styles.connectionLabel}>Ligado a</Text>
              <Text style={styles.connectionEmail}>{pairingStatus.partnerEmail}</Text>
              <Text style={styles.connectionSince}>
                desde {formatDate(pairingStatus.linkedSince)}
              </Text>
            </View>
            <Pressable style={[styles.button, styles.buttonOutlineDanger]} onPress={confirmBreakLink}>
              <Text style={styles.buttonDangerText}>Terminar Ligação</Text>
            </Pressable>
          </View>
        )}

        {/* Section 3: Session */}
        <View style={[styles.section, styles.sectionBorder]}>
          <Text style={styles.sectionTitle}>Sessão</Text>
          <Pressable style={styles.button} onPress={logout}>
            <Text style={styles.buttonText}>Terminar Sessão</Text>
          </Pressable>
        </View>

        {/* Section 4: Delete account */}
        <View style={[styles.section, styles.sectionBorder]}>
          <Text style={styles.sectionTitle}>Encerrar Conta</Text>
          <Text style={styles.deleteHint}>
            Caso pretendas encerrar a tua conta, podes utilizar o botão abaixo. Esta ação é permanente e imediata.
          </Text>
          <Pressable style={[styles.button, styles.buttonOutlineDanger]} onPress={() => setDeleteModalVisible(true)}>
            <Text style={styles.buttonDangerText}>Encerrar Conta</Text>
          </Pressable>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteLoading && setDeleteModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !deleteLoading && setDeleteModalVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Encerrar conta</Text>
            <Text style={styles.modalBody}>
              Ao encerrar a conta vais cancelar todas as tuas ligações a pessoas e perder todos os
              dados da conta. Esta ação é imediata e irreversível — não guardamos dados nos nossos
              servidores após o encerramento.
            </Text>
            <Pressable
              style={[styles.modalButtonDanger, deleteLoading && styles.buttonDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonDangerText}>Encerrar Conta</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalButtonCancel}
              onPress={() => setDeleteModalVisible(false)}
              disabled={deleteLoading}
            >
              <Text style={styles.modalButtonCancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  sectionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 24,
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
  buttonOutlineDanger: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDangerText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
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
  connectionCard: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    marginBottom: 16,
  },
  connectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  connectionEmail: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  connectionSince: {
    fontSize: 13,
    color: '#888',
  },
  deleteHint: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtonDanger: {
    width: '100%',
    height: 50,
    backgroundColor: '#e53935',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalButtonDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonCancel: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
});
