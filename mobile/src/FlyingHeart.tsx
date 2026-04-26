import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

const FLIGHT_MS = 2400;
const FRAG_COUNT = 6;

interface Props {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  emoji: string;
  onComplete: (id: number) => void;
}

// React.memo stops App's compass re-renders from reaching this component,
// so the interpolations and animation stay stable for the full flight.
export const FlyingHeart = React.memo(function FlyingHeart({
  id, startX, startY, endX, endY, size, emoji, onComplete,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [exploding, setExploding] = useState(false);

  const frags = useRef(
    Array.from({ length: FRAG_COUNT }, (_, i) => ({
      anim: new Animated.Value(0),
      angle: (i / FRAG_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
      dist: 25 + Math.random() * 35,
    }))
  ).current;

  const path = useRef({
    amplitude: 25 + Math.random() * 50,        // 25..75 px
    oscillations: 1.5 + Math.random() * 2,     // 1.5..3.5 cycles
    phase: Math.random() * Math.PI * 2,        // random start angle
    bias: (Math.random() - 0.5) * 40,          // -20..20 px lateral drift
  }).current;

  const N = 60;
  const ir = Array.from({ length: N + 1 }, (_, i) => i / N);
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const hs = size * 0.55;

  const xOut = ir.map(t => {
    const osc = path.amplitude * Math.sin(t * Math.PI * 2 * path.oscillations + path.phase) * (1 - t);
    const drift = path.bias * (1 - t);
    return startX + t * dx + px * (osc + drift) - hs;
  });
  const yOut = ir.map(t => {
    const osc = path.amplitude * Math.sin(t * Math.PI * 2 * path.oscillations + path.phase) * (1 - t);
    const drift = path.bias * (1 - t);
    return startY + t * dy + py * (osc + drift) - hs;
  });
  const scOut = ir.map(t => 1 - 0.4 * t);

  const tx = progress.interpolate({ inputRange: ir, outputRange: xOut });
  const ty = progress.interpolate({ inputRange: ir, outputRange: yOut });
  const sc = progress.interpolate({ inputRange: ir, outputRange: scOut });

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: FLIGHT_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setExploding(true);
      Animated.parallel(
        frags.map(f =>
          Animated.timing(f.anim, { toValue: 1, duration: 550, useNativeDriver: false })
        )
      ).start(() => onComplete(id));
    });
  }, []);

  if (exploding) {
    return (
      <>
        {frags.map((f, i) => {
          const fx = f.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [endX - 8, endX + Math.cos(f.angle) * f.dist - 8],
          });
          const fy = f.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [endY - 8, endY + Math.sin(f.angle) * f.dist - 8],
          });
          const op = f.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] });
          const fsc = f.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.8, 1.3, 0.4] });
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: fx,
                top: fy,
                opacity: op,
                transform: [{ scale: fsc }],
              }}
            >
              <Text style={{ fontSize: 14 }}>{emoji}</Text>
            </Animated.View>
          );
        })}
      </>
    );
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: tx,
        top: ty,
        transform: [{ scale: sc }],
      }}
    >
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
});
