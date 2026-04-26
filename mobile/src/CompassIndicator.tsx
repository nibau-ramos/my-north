import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const H = 22;
const W = 28;
const EDGE = 8;

function indicatorColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(82 + 148 * t);
  const b = Math.round(82 + 36 * t);
  return `rgb(${r},${g},${b})`;
}

// borderRight coloured → ◁  (tip at element x, base W pixels to the right)
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

// borderLeft coloured → ▷  (tip at element x, base W pixels to the left)
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

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.1, duration: 350, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,   duration: 350, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: blinkAnim }]} pointerEvents="none">
      {showLeft && (
        <>
          <View style={[styles.leftEdge, { left: EDGE }]}>
            <LeftArrow color={color} />
          </View>
          <View style={[styles.leftEdge, { left: EDGE + W + 8, opacity: 0.45 }]}>
            <LeftArrow color={color} size={0.7} />
          </View>
        </>
      )}
      {showRight && (
        <>
          <View style={[styles.rightEdge, { right: EDGE }]}>
            <RightArrow color={color} />
          </View>
          <View style={[styles.rightEdge, { right: EDGE + W + 8, opacity: 0.45 }]}>
            <RightArrow color={color} size={0.7} />
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leftEdge: {
    position: 'absolute',
    top: '50%',
  },
  rightEdge: {
    position: 'absolute',
    top: '50%',
  },
});
