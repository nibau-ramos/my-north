import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
}

export default function InitialButton({ onPress, style }: Props) {
  const { authState } = useAuth();
  const email = authState.status === 'authenticated' ? authState.user.email : '';
  const initial = email.charAt(0).toUpperCase();

  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{initial}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ff4d6d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4d6d',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
