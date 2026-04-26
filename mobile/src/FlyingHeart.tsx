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

  const pathConfig = useRef({
    isLost: Math.random() < 0.15,
    amplitude: 20 + Math.random() * 40,
    oscillations: 1 + Math.random() * 1.5,
    dir: Math.random() < 0.5 ? 1 : -1,
    perpDir: Math.random() < 0.5 ? 1 : -1,
    wanderDist: 120 + Math.random() * 100,
  }).current;

  const N = 60;
  const ir = Array.from({ length: N + 1 }, (_, i) => i / N);
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const hs = size * 0.55;

  // Bezier control points for the lost-heart path:
  // P1 goes backward + sideways (wrong direction), P2 approaches from the side
  const lostWander = Math.max(pathConfig.wanderDist, len * 0.35);
  const P1x = startX - dx * 0.35 + px * pathConfig.perpDir * lostWander;
  const P1y = startY - dy * 0.35 + py * pathConfig.perpDir * lostWander;
  const P2x = endX + px * pathConfig.perpDir * lostWander * 0.2;
  const P2y = endY + py * pathConfig.perpDir * lostWander * 0.2;

  const xOut = ir.map(t => {
    if (pathConfig.isLost) {
      const mt = 1 - t;
      return mt ** 3 * startX + 3 * mt ** 2 * t * P1x + 3 * mt * t ** 2 * P2x + t ** 3 * endX - hs;
    }
    const osc = pathConfig.dir * pathConfig.amplitude * Math.sin(t * Math.PI * 2 * pathConfig.oscillations) * 4 * t * (1 - t);
    return startX + t * dx + px * osc - hs;
  });
  const yOut = ir.map(t => {
    if (pathConfig.isLost) {
      const mt = 1 - t;
      return mt ** 3 * startY + 3 * mt ** 2 * t * P1y + 3 * mt * t ** 2 * P2y + t ** 3 * endY - hs;
    }
    const osc = pathConfig.dir * pathConfig.amplitude * Math.sin(t * Math.PI * 2 * pathConfig.oscillations) * 4 * t * (1 - t);
    return startY + t * dy + py * osc - hs;
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
