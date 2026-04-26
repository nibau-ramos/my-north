import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const ORBIT_R = 50;   // px from blue dot centre to satellite centre
const DOT_R = 5;      // satellite radius
const LUNGE_Y = 16;   // downward lunge (traces the orbit arc, suggesting rotation direction)
const LUNGE_X = 6;    // outward nudge per side (reinforces direction)
const REST_MS = 650;
const OUT_MS = 210;
const BACK_MS = 420;

function dotColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t * 0.7));
  const g = Math.round(80 + 140 * t);
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

  const lungeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!show) {
      lungeAnim.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(REST_MS),
        Animated.timing(lungeAnim, {
          toValue: 1,
          duration: OUT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lungeAnim, {
          toValue: 0,
          duration: BACK_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [show, lungeAnim]);

  if (!show) return null;

  const dir = showRight ? 1 : -1;
  const color = dotColor(angleDiff);

  // Lunge traces a short arc: outward + downward, suggesting orbital direction
  const translateX = lungeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dir * LUNGE_X],
  });
  const translateY = lungeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LUNGE_Y],
  });
  const scale = lungeAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.35, 1],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.center,
          dotOffsetY ? { transform: [{ translateY: dotOffsetY }] } : undefined,
        ]}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: dir * ORBIT_R - DOT_R,
            top: -DOT_R,
            width: DOT_R * 2,
            height: DOT_R * 2,
            borderRadius: DOT_R,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.75,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 0 },
            transform: [{ translateX }, { translateY }, { scale }],
          }}
        />
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
