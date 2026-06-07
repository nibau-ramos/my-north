import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../services/api';

export default function DevBanner() {
  if (!__DEV__) return null;
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: bottom + 4 }]}>
      <Text style={styles.text}>DEV · {BASE_URL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingTop: 4,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  text: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontFamily: 'Courier',
    letterSpacing: 0.3,
  },
});
