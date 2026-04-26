import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import MapView from 'react-native-maps';

const FLIGHT_MS = 2400;
const FRAG_COUNT = 6;
const TICK_MS = 16;
const FETCH_INTERVAL_MS = 50; // re-query target screen position at most every 50ms

interface Props {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  mapRef: React.RefObject<MapView | null>;
  target: { latitude: number; longitude: number };
  size: number;
  emoji: string;
  onArrive: () => void;
  onComplete: (id: number) => void;
}

export const FlyingHeart = React.memo(function FlyingHeart({
  id, startX, startY, endX, endY, mapRef, target, size, emoji, onArrive, onComplete,
}: Props) {
  const hs = size * 0.55;
  const posX = useRef(new Animated.Value(startX - hs)).current;
  const posY = useRef(new Animated.Value(startY - hs)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [exploding, setExploding] = useState(false);
  const landingPos = useRef({ x: endX, y: endY });

  // Live destination position — updated via pointForCoordinate so zoom/rotation changes are tracked
  const latestEndRef = useRef({ x: endX, y: endY });
  const fetchPending = useRef(false);
  const lastFetchTime = useRef(0);

  const pathConfig = useRef({
    isLost: Math.random() < 0.15,
    amplitude: 20 + Math.random() * 40,
    oscillations: 1 + Math.random() * 1.5,
    dir: Math.random() < 0.5 ? 1 : -1,
    perpDir: Math.random() < 0.5 ? 1 : -1,
    wanderDist: 120 + Math.random() * 100,
  }).current;

  const frags = useRef(
    Array.from({ length: FRAG_COUNT }, (_, i) => ({
      anim: new Animated.Value(0),
      angle: (i / FRAG_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
      dist: 25 + Math.random() * 35,
    }))
  ).current;

  useEffect(() => {
    const startTime = Date.now();

    const timer = setInterval(() => {
      const t = Math.min((Date.now() - startTime) / FLIGHT_MS, 1);

      // Throttled live position query — handles both rotation and zoom changes
      const now = Date.now();
      if (!fetchPending.current && mapRef.current && now - lastFetchTime.current >= FETCH_INTERVAL_MS) {
        fetchPending.current = true;
        lastFetchTime.current = now;
        mapRef.current.pointForCoordinate(target)
          .then(pt => { latestEndRef.current = { x: pt.x, y: pt.y }; })
          .catch(() => {})
          .finally(() => { fetchPending.current = false; });
      }

      const currEndX = latestEndRef.current.x;
      const currEndY = latestEndRef.current.y;

      const dx = currEndX - startX;
      const dy = currEndY - startY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = -dy / len;
      const py = dx / len;

      let x: number, y: number;
      if (pathConfig.isLost) {
        const lostWander = Math.max(pathConfig.wanderDist, len * 0.35);
        const P1x = startX + dx * 0.25 + px * pathConfig.perpDir * lostWander;
        const P1y = startY + dy * 0.25 + py * pathConfig.perpDir * lostWander;
        const P2x = currEndX + px * pathConfig.perpDir * lostWander * 0.2;
        const P2y = currEndY + py * pathConfig.perpDir * lostWander * 0.2;
        const mt = 1 - t;
        x = mt ** 3 * startX + 3 * mt ** 2 * t * P1x + 3 * mt * t ** 2 * P2x + t ** 3 * currEndX - hs;
        y = mt ** 3 * startY + 3 * mt ** 2 * t * P1y + 3 * mt * t ** 2 * P2y + t ** 3 * currEndY - hs;
      } else {
        const osc = pathConfig.dir * pathConfig.amplitude *
          Math.sin(t * Math.PI * 2 * pathConfig.oscillations) * 4 * t * (1 - t);
        x = startX + t * dx + px * osc - hs;
        y = startY + t * dy + py * osc - hs;
      }

      posX.setValue(x);
      posY.setValue(y);
      scaleAnim.setValue(1 - 0.4 * t);

      if (t >= 1) {
        clearInterval(timer);
        landingPos.current = { x: currEndX, y: currEndY };
        onArrive();
        setExploding(true);
        Animated.parallel(
          frags.map(f =>
            Animated.timing(f.anim, { toValue: 1, duration: 550, useNativeDriver: false })
          )
        ).start(() => onComplete(id));
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (exploding) {
    const { x: lx, y: ly } = landingPos.current;
    return (
      <>
        {frags.map((f, i) => {
          const fx = f.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [lx - 8, lx + Math.cos(f.angle) * f.dist - 8],
          });
          const fy = f.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [ly - 8, ly + Math.sin(f.angle) * f.dist - 8],
          });
          const op = f.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] });
          const fsc = f.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.8, 1.3, 0.4] });
          return (
            <Animated.View
              key={i}
              style={{ position: 'absolute', left: fx, top: fy, opacity: op, transform: [{ scale: fsc }] }}
            >
              <Text style={{ fontSize: 14 }}>{emoji}</Text>
            </Animated.View>
          );
        })}
      </>
    );
  }

  return (
    <Animated.View style={{ position: 'absolute', left: posX, top: posY, transform: [{ scale: scaleAnim }] }}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
});
