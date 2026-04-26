import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Rotation-line: dots positioned outward from the blue dot; each one scrolls
// downward (along the orbital arc) as it appears, suggesting rotation direction.
// Both sides scroll downward: CW from 3h goes toward 6h, CCW from 9h also toward 6h.
const N = 7;
const DOT_R_MAX = 3.5;
const DOT_R_STEP = 0.35;
const LINE_START = 22;   // px from blue-dot centre to first dot
const DOT_GAP = 12;      // px between dot centres

const SCROLL_Y = 18;     // px each dot travels downward during its flash

const STAGGER_MS = 75;
const ON_MS = 200;       // appear + scroll to midpoint
const OFF_MS = 200;      // fade + continue scrolling
const PAUSE_MS = 460;
// Every dot's private loop shares LOOP_MS so stagger phase is preserved across iterations
const LOOP_MS = N * STAGGER_MS + ON_MS + OFF_MS + PAUSE_MS;
const REST_MS = LOOP_MS - ON_MS - OFF_MS;

function lineColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t * 0.65));
  const g = Math.round(80 + 145 * t);
  const b = Math.round(80 + 40 * t);
  return `rgb(${r},${g},${b})`;
}

export function CompassIndicator({
  angleDiff,
  dotOffsetY = 0,
}: {
  angleDiff: number;
  dotOffsetY?: number;
}) {
  const THRESHOLD = 10;
  const showLeft = angleDiff < -THRESHOLD;
  const showRight = angleDiff > THRESHOLD;
  const show = showLeft || showRight;

  // Each dot uses a single value that travels 0 → 1 (rise) → 2 (fade) → snap back to 0 → rest
  const dotAnims = useRef(
    Array.from({ length: N }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!show) {
      dotAnims.forEach(a => a.setValue(0));
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const loops: Animated.CompositeAnimation[] = [];

    dotAnims.forEach((a, i) => {
      a.setValue(0);
      const t = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            // Appear and scroll to arc midpoint
            Animated.timing(a, {
              toValue: 1,
              duration: ON_MS,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            // Fade and continue along arc
            Animated.timing(a, {
              toValue: 2,
              duration: OFF_MS,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }),
            // Snap back to origin while invisible (opacity = 0 at value 0 and 2)
            Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: false }),
            // Silent rest until next wave
            Animated.timing(a, { toValue: 0, duration: REST_MS, useNativeDriver: false }),
          ]),
        );
        loop.start();
        loops.push(loop);
      }, i * STAGGER_MS);
      timers.push(t);
    });

    return () => {
      timers.forEach(clearTimeout);
      loops.forEach(l => l.stop());
      dotAnims.forEach(a => a.setValue(0));
    };
  }, [show, dotAnims]);

  if (!show) return null;

  const dir = showRight ? 1 : -1;
  const color = lineColor(angleDiff);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.center,
          dotOffsetY ? { transform: [{ translateY: dotOffsetY }] } : undefined,
        ]}
      >
        <View>
          {dotAnims.map((a, i) => {
            const r = DOT_R_MAX - i * DOT_R_STEP;
            const peakOpacity = 0.9 - i * 0.06;

            // value 0→1: appear + scroll first half; 1→2: fade + scroll second half
            const opacity = a.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [0, peakOpacity, 0],
            });
            const translateY = a.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [0, SCROLL_Y / 2, SCROLL_Y],
            });
            const scale = a.interpolate({
              inputRange: [0, 0.5, 1, 1.5, 2],
              outputRange: [0.4, 0.85, 1.0, 0.85, 0.4],
            });

            return (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: dir * (LINE_START + i * DOT_GAP) - r,
                  top: -r,
                  width: r * 2,
                  height: r * 2,
                  borderRadius: r,
                  backgroundColor: color,
                  opacity,
                  transform: [{ translateY }, { scale }],
                  shadowColor: color,
                  shadowOpacity: 0.7,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
            );
          })}
        </View>
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
