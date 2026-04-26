import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const R = 45;
const B = 3.5;
const CAP_R = B + 1.5;
const SPIN_MS = 1100;

function indicatorColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(82 + 148 * t);
  const b = Math.round(82 + 36 * t);
  return `rgb(${r},${g},${b})`;
}

export function CompassIndicator({ angleDiff }: { angleDiff: number }) {
  const THRESHOLD = 10;
  const showLeft = angleDiff < -THRESHOLD;
  const showRight = angleDiff > THRESHOLD;
  const show = showLeft || showRight;
  const isCW = showRight;
  const color = indicatorColor(angleDiff);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!show) return;
    spinAnim.setValue(0);
    const anim = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [show, spinAnim]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // scaleX: -1 mirrors the ring for CCW so the cap (at 3 o'clock) becomes the leading edge
  // in both directions — no need to restart the animation when direction flips
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scaleX: isCW ? 1 : -1 }, { rotate }] }}>
          {/* 270° arc — gap at bottom (borderBottomColor transparent) */}
          <View
            style={{
              width: R * 2,
              height: R * 2,
              borderRadius: R,
              borderWidth: B,
              borderTopColor: color,
              borderRightColor: color,
              borderLeftColor: color,
              borderBottomColor: 'transparent',
              shadowColor: color,
              shadowOpacity: 0.65,
              shadowRadius: 7,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          {/* Leading-edge cap at 3 o'clock */}
          <View
            style={{
              position: 'absolute',
              right: -(CAP_R - B / 2),
              top: R - CAP_R,
              width: CAP_R * 2,
              height: CAP_R * 2,
              borderRadius: CAP_R,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 0.9,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
