import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const R = 28;          // arc radius
const B = 3;           // arc border width
const AW = 7;          // arrowhead size
const SWING_DEG = 30;  // how far the arc sweeps each repeat
const SWING_MS = 520;  // forward sweep duration
const HOLD_MS = 440;   // pause at rest before next sweep

function indicatorColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(82 + 148 * t);
  const b = Math.round(82 + 36 * t);
  return `rgb(${r},${g},${b})`;
}

export function CompassIndicator({ angleDiff, dotOffsetY = 0 }: { angleDiff: number; dotOffsetY?: number }) {
  const THRESHOLD = 10;
  const showLeft = angleDiff < -THRESHOLD;
  const showRight = angleDiff > THRESHOLD;
  const show = showLeft || showRight;
  const isCW = showRight;
  const color = indicatorColor(angleDiff);

  const swingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!show) return;
    swingAnim.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        // Hold at rest
        Animated.timing(swingAnim, { toValue: 0, duration: HOLD_MS, useNativeDriver: true }),
        // Sweep forward
        Animated.timing(swingAnim, { toValue: 1, duration: SWING_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        // Snap back instantly
        Animated.timing(swingAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [show, swingAnim]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  const rotation = swingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${SWING_DEG}deg`],
  });

  // scaleX: -1 mirrors the arc for CCW — a CW sweep in mirrored space appears CCW
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.center, dotOffsetY ? { transform: [{ translateY: dotOffsetY }] } : undefined]}>
        <Animated.View
          style={{
            transform: [
              { scaleX: isCW ? 1 : -1 },
              { rotate: rotation },
            ],
          }}
        >
          {/* Bottom semicircle: overflow:hidden clips the top half of the ring */}
          <View style={{ position: 'absolute', top: 0, left: -R, width: R * 2, height: R, overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                top: -R,
                left: 0,
                width: R * 2,
                height: R * 2,
                borderRadius: R,
                borderWidth: B,
                borderTopColor: 'transparent',
                borderRightColor: color,
                borderBottomColor: color,
                borderLeftColor: color,
              }}
            />
          </View>

          {/* Arrowhead at left end (9 o'clock), pointing up — tangent direction for CW sweep */}
          <View
            style={{
              position: 'absolute',
              top: -AW,
              left: -R - AW / 2,
              width: 0,
              height: 0,
              borderBottomWidth: AW,
              borderLeftWidth: AW / 2,
              borderRightWidth: AW / 2,
              borderBottomColor: color,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
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
