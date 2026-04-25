import React from 'react';
import { StyleSheet, View } from 'react-native';

const H = 22;   // arrow half-height
const W = 28;   // arrow length
const GAP = 36; // gap from screen centre to arrow base

function indicatorColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(82 + 148 * t);
  const b = Math.round(82 + 36 * t);
  return `rgb(${r},${g},${b})`;
}

// borderRight coloured → ◁  (tip left, base right — borderRight occupies space to the RIGHT of element x)
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

// borderLeft coloured → ▷  (tip right, base left — borderLeft occupies space to the LEFT of element x)
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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {showLeft && (
        <>
          {/* Inner arrow — closer to dot */}
          <View style={[styles.anchor, { transform: [{ translateX: -GAP }] }]}>
            <LeftArrow color={color} />
          </View>
          {/* Outer arrow — smaller, lower opacity */}
          <View style={[styles.anchor, { transform: [{ translateX: -(GAP + W + 10) }], opacity: 0.45 }]}>
            <LeftArrow color={color} size={0.7} />
          </View>
        </>
      )}
      {showRight && (
        <>
          <View style={[styles.anchor, { transform: [{ translateX: GAP }] }]}>
            <RightArrow color={color} />
          </View>
          <View style={[styles.anchor, { transform: [{ translateX: GAP + W + 10 }], opacity: 0.45 }]}>
            <RightArrow color={color} size={0.7} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 0×0 absolute anchor at screen centre — arrows expand from their own borders
  anchor: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
});
