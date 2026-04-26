import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

const FLIGHT_MS = 2400;
const OSCILLATIONS = 2.5;
const AMPLITUDE = 45;
const FRAG_COUNT = 6;

interface Props {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  onComplete: (id: number) => void;
}

export const FlyingHeart = React.memo(function FlyingHeart({
  id, startX, startY, endX, endY, size, onComplete,
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

  // Computed once on mount — stable across re-renders so native driver
  // doesn't lose the animation after parent re-renders.
  const { tx, ty, sc } = useMemo(() => {
    const N = 60;
    const ir = Array.from({ length: N + 1 }, (_, i) => i / N);
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const hs = size * 0.55;

    const xOut = ir.map(t => {
      const osc = AMPLITUDE * Math.sin(t * Math.PI * 2 * OSCILLATIONS) * (1 - t);
      return startX + t * dx + px * osc - hs;
    });
    const yOut = ir.map(t => {
      const osc = AMPLITUDE * Math.sin(t * Math.PI * 2 * OSCILLATIONS) * (1 - t);
      return startY + t * dy + py * osc - hs;
    });
    const scOut = ir.map(t => 1 - 0.4 * t);

    return {
      tx: progress.interpolate({ inputRange: ir, outputRange: xOut }),
      ty: progress.interpolate({ inputRange: ir, outputRange: yOut }),
      sc: progress.interpolate({ inputRange: ir, outputRange: scOut }),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frag interpolations also computed once.
  const fragStyles = useMemo(() => frags.map(f => ({
    fx: f.anim.interpolate({
      inputRange: [0, 1],
      outputRange: [endX - 8, endX + Math.cos(f.angle) * f.dist - 8],
    }),
    fy: f.anim.interpolate({
      inputRange: [0, 1],
      outputRange: [endY - 8, endY + Math.sin(f.angle) * f.dist - 8],
    }),
    op: f.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] }),
    fsc: f.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.8, 1.3, 0.4] }),
  })), // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: FLIGHT_MS,
      useNativeDriver: true,
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
          const { fx, fy, op, fsc } = fragStyles[i];
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
              <Text style={{ fontSize: 14 }}>❤️</Text>
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
        left: 0,
        top: 0,
        transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
      }}
    >
      <Text style={{ fontSize: size }}>❤️</Text>
    </Animated.View>
  );
});
