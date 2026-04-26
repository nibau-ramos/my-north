import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PARTICLE_COUNT = 6;
const PARTICLE_MS = 1800;
const TICK_MS = 16;
const DOT_SIZE = 6;

interface Props {
  userX: number;
  userY: number;
  destOffsetDx: number;
  destOffsetDy: number;
  headingAtCapture: number;
  headingRef: React.MutableRefObject<number>;
}

export function PortalParticles({ userX, userY, destOffsetDx, destOffsetDy, headingAtCapture, headingRef }: Props) {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      posX: new Animated.Value(0),
      posY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  useEffect(() => {
    const startTime = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const dH = (headingRef.current - headingAtCapture) * (Math.PI / 180);
      const cosH = Math.cos(dH);
      const sinH = Math.sin(dH);
      const currDestX = userX + destOffsetDx * cosH + destOffsetDy * sinH;
      const currDestY = userY - destOffsetDx * sinH + destOffsetDy * cosH;

      particles.forEach((p, i) => {
        const t = ((now - startTime) / PARTICLE_MS + i / PARTICLE_COUNT) % 1;

        p.posX.setValue(userX + (currDestX - userX) * t - DOT_SIZE / 2);
        p.posY.setValue(userY + (currDestY - userY) * t - DOT_SIZE / 2);

        let opacity: number;
        if (t < 0.1) opacity = t / 0.1;
        else if (t < 0.75) opacity = 1;
        else opacity = 1 - (t - 0.75) / 0.25;

        let scale: number;
        if (t < 0.2) scale = 0.5 + 0.5 * (t / 0.2);
        else if (t < 0.8) scale = 1;
        else scale = 1 - 0.5 * ((t - 0.8) / 0.2);

        p.opacity.setValue(opacity);
        p.scale.setValue(scale);
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.posX,
            top: p.posY,
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: '#ffb3c6',
            opacity: p.opacity,
            transform: [{ scale: p.scale }],
            shadowColor: '#ff4d7a',
            shadowOpacity: 1,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ))}
    </View>
  );
}
