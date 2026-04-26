import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const H = 22;
const W = 28;
const EDGE = 8;
const MARCH = 16;
const MARCH_MS = 480;

function indicatorColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(82 + 148 * t);
  const b = Math.round(82 + 36 * t);
  return `rgb(${r},${g},${b})`;
}

function LeftArrow({ color, size = 1 }: { color: string; size?: number }) {
  return (
    <View style={{
      width: 0, height: 0,
      borderTopWidth: H * size,
      borderBottomWidth: H * size,
      borderRightWidth: W * size,
      borderStyle: 'solid',
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderRightColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: 8,
    }} />
  );
}

function RightArrow({ color, size = 1 }: { color: string; size?: number }) {
  return (
    <View style={{
      width: 0, height: 0,
      borderTopWidth: H * size,
      borderBottomWidth: H * size,
      borderLeftWidth: W * size,
      borderStyle: 'solid',
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: 8,
    }} />
  );
}

export function CompassIndicator({ angleDiff }: { angleDiff: number }) {
  const THRESHOLD = 10;
  const color = indicatorColor(angleDiff);
  const showLeft = angleDiff < -THRESHOLD;
  const showRight = angleDiff > THRESHOLD;

  const marchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sawtooth: slide smoothly in direction, snap back instantly — creates continuous flow
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(marchAnim, {
          toValue: 1,
          duration: MARCH_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(marchAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [marchAnim]);

  const leftTranslate = marchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -MARCH] });
  const rightTranslate = marchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, MARCH] });
  const opacityMain = marchAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0.55] });
  const opacityDim = marchAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.45, 0.38, 0.2] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {showLeft && (
        <>
          <Animated.View style={[styles.edge, { left: EDGE, opacity: opacityMain, transform: [{ translateX: leftTranslate }] }]}>
            <LeftArrow color={color} />
          </Animated.View>
          <Animated.View style={[styles.edge, { left: EDGE + W + 8, opacity: opacityDim, transform: [{ translateX: leftTranslate }] }]}>
            <LeftArrow color={color} size={0.7} />
          </Animated.View>
        </>
      )}
      {showRight && (
        <>
          <Animated.View style={[styles.edge, { right: EDGE, opacity: opacityMain, transform: [{ translateX: rightTranslate }] }]}>
            <RightArrow color={color} />
          </Animated.View>
          <Animated.View style={[styles.edge, { right: EDGE + W + 8, opacity: opacityDim, transform: [{ translateX: rightTranslate }] }]}>
            <RightArrow color={color} size={0.7} />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: '50%',
  },
});
