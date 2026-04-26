import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Tension-line: a chain of dots that pulses outward like a plucked string
const N = 7;
const DOT_R_MAX = 3.5;  // inner dot radius (tapers outward)
const DOT_R_STEP = 0.35;
const LINE_START = 22;  // px from blue-dot centre to first dot
const DOT_GAP = 12;     // px between dot centres

const STAGGER_MS = 75;
const ON_MS = 200;
const OFF_MS = 185;
const PAUSE_MS = 500;
// Loop duration — every dot's private loop must share this total so phase stays locked
const LOOP_MS = N * STAGGER_MS + ON_MS + OFF_MS + PAUSE_MS;
const REST_MS = LOOP_MS - ON_MS - OFF_MS;  // silence period inside each dot's loop

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
      // Stagger the loop start so the wave phase is preserved across iterations
      const t = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(a, {
              toValue: 1,
              duration: ON_MS,
              easing: Easing.out(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(a, {
              toValue: 0,
              duration: OFF_MS,
              easing: Easing.in(Easing.sin),
              useNativeDriver: false,
            }),
            // Silent rest — fills the gap until the next wave front arrives
            Animated.timing(a, {
              toValue: 0,
              duration: REST_MS,
              useNativeDriver: false,
            }),
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
        {/* Zero-size anchor at blue-dot centre; absolute children use it as origin */}
        <View>
          {dotAnims.map((a, i) => {
            const r = DOT_R_MAX - i * DOT_R_STEP;
            const peakOpacity = 0.9 - i * 0.06;
            const opacity = a.interpolate({
              inputRange: [0, 1],
              outputRange: [0.15, peakOpacity],
            });
            const scale = a.interpolate({
              inputRange: [0, 1],
              outputRange: [0.55, 1.0],
            });
            const glowOpacity = a.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, peakOpacity * 0.6, 0],
            });
            return (
              <React.Fragment key={i}>
                {/* Glow halo */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: dir * (LINE_START + i * DOT_GAP) - r * 2.2,
                    top: -r * 2.2,
                    width: r * 4.4,
                    height: r * 4.4,
                    borderRadius: r * 2.2,
                    backgroundColor: color,
                    opacity: glowOpacity,
                  }}
                />
                {/* Core dot */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: dir * (LINE_START + i * DOT_GAP) - r,
                    top: -r,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: r,
                    backgroundColor: color,
                    opacity,
                    transform: [{ scale }],
                  }}
                />
              </React.Fragment>
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
