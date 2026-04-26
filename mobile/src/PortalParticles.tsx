import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PARTICLE_COUNT = 24;
const BASE_MS = 1600;
const TICK_MS = 16;
const CANAL_HALF_WIDTH = 9; // stay within the 22px thick portal line

interface Particle {
  posX: Animated.Value;
  posY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  phase: number;
  perpBase: number;     // base lateral offset within canal (px)
  perpAmp: number;      // sinusoidal drift amplitude (px)
  perpFreq: number;     // drift frequency (cycles per traversal)
  perpPhase: number;    // drift phase offset
  size: number;
  cycleDuration: number;
}

interface Props {
  userX: number;
  userY: number;
  destOffsetDx: number;
  destOffsetDy: number;
  headingAtCapture: number;
  headingRef: React.MutableRefObject<number>;
}

export function PortalParticles({ userX, userY, destOffsetDx, destOffsetDy, headingAtCapture, headingRef }: Props) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      posX: new Animated.Value(0),
      posY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      phase: Math.random(),
      perpBase: (Math.random() - 0.5) * CANAL_HALF_WIDTH * 2,
      perpAmp: 1.5 + Math.random() * 2.5,
      perpFreq: 1 + Math.random() * 2,
      perpPhase: Math.random() * Math.PI * 2,
      size: 1.8 + Math.random() * 2,
      cycleDuration: BASE_MS * (0.7 + Math.random() * 0.6),
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

      const dx = currDestX - userX;
      const dy = currDestY - userY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = -dy / len;
      const perpY = dx / len;

      particles.forEach(p => {
        const t = ((now - startTime) / p.cycleDuration + p.phase) % 1;

        const perp = p.perpBase + p.perpAmp * Math.sin(t * Math.PI * 2 * p.perpFreq + p.perpPhase);

        p.posX.setValue(userX + dx * t + perpX * perp - p.size / 2);
        p.posY.setValue(userY + dy * t + perpY * perp - p.size / 2);

        const opacity = t < 0.12 ? t / 0.12
          : t < 0.72 ? 1
          : 1 - (t - 0.72) / 0.28;
        p.opacity.setValue(opacity * 0.75);

        const scale = t < 0.2 ? 0.5 + 0.5 * (t / 0.2)
          : t < 0.8 ? 1
          : 1 - 0.4 * ((t - 0.8) / 0.2);
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
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: '#ffccd8',
            opacity: p.opacity,
            transform: [{ scale: p.scale }],
            shadowColor: '#ff4d7a',
            shadowOpacity: 0.9,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ))}
    </View>
  );
}
