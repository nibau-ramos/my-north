import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function GoogleButton({ onPress, disabled, loading }: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress} disabled={disabled}>
      {loading ? (
        <ActivityIndicator color="#ff4d6d" />
      ) : (
        <>
          <Image source={require('../assets/google-logo.png')} style={styles.logo} />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ff4d6d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  logo: {
    width: 20,
    height: 20,
  },
  text: {
    color: '#ff4d6d',
    fontSize: 16,
    fontWeight: '600',
  },
});
