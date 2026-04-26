import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from 'react-native-maps';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CompassHeading from 'react-native-compass-heading';
import { CompassIndicator } from './src/CompassIndicator';
import { FlyingHeart } from './src/FlyingHeart';

const WORLD_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 160,
  longitudeDelta: 360,
};

const TARGET = {
  latitude: -8.039977532613815,
  longitude: -34.886511493765695,
};

const ALIGNED_THRESHOLD = 10;

const KISS_EMOJIS = ['❤️', '😘', '🥰', '😏'];

function getBearing(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(from.latitude);
  const φ2 = toRad(to.latitude);
  const Δλ = toRad(to.longitude - from.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function zoomForDistance(km: number): number {
  if (km < 0.5) return 17;
  if (km < 2) return 15;
  if (km < 10) return 13;
  if (km < 50) return 10;
  if (km < 200) return 8;
  if (km < 1000) return 6;
  if (km < 4000) return 4;
  return 3;
}

function normalizeDiff(angle: number): number {
  let a = angle % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

function lineColor(diff: number): string {
  const t = Math.max(0, 1 - Math.abs(diff) / 90);
  const r = Math.round(255 * (1 - t));
  const g = Math.round(82 + 148 * t);
  const b = Math.round(82 + 36 * t);
  return `rgb(${r},${g},${b})`;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface HeartEntry {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  emoji: string;
}

export default function App() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const zoomDone = useRef(false);
  const alignedZoom = useRef(false);
  const isZoomingOut = useRef(false);
  const isZoomingIn = useRef(false);
  const currentZoom = useRef(2);
  const headingRef = useRef(0);
  const showIndicatorRef = useRef(false);
  const userLocation = useRef<{ latitude: number; longitude: number } | null>(null);

  const [showIndicator, setShowIndicator] = useState(false);
  const [angleDiff, setAngleDiff] = useState(0);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);

  // Destination pulse overlay (outside MapView — markers can't animate)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseScreenPos = useRef({ x: 0, y: 0 });
  const [showPulse, setShowPulse] = useState(false);

  // Kiss feature
  const kissGrowAnim = useRef(new Animated.Value(0)).current;
  const pressStartTime = useRef(0);
  const isPressingRef = useRef(false);
  const kissAnimatingRef = useRef(false);
  const kissOriginRef = useRef({ x: 0, y: 0 });
  const selectedEmojiRef = useRef('❤️');
  const heartIdRef = useRef(0);
  const [showGrowingHeart, setShowGrowingHeart] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<HeartEntry[]>([]);

  const triggerAlignmentZoomOut = useCallback(() => {
    if (alignedZoom.current || !userLocation.current) return;
    alignedZoom.current = true;
    isZoomingOut.current = true;

    const km = haversineKm(userLocation.current, TARGET);
    const targetZoom = zoomForDistance(km);
    const startZoom = currentZoom.current;
    const userLat = userLocation.current.latitude;
    const userLng = userLocation.current.longitude;
    const TOTAL_MS = 4000;
    const STEP_MS = 100;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const t = Math.min((Date.now() - startTime) / TOTAL_MS, 1);
      const zoom = startZoom + (targetZoom - startZoom) * easeInOut(t);
      currentZoom.current = zoom;
      mapRef.current?.animateCamera(
        { center: { latitude: userLat, longitude: userLng }, zoom, heading: headingRef.current },
        { duration: STEP_MS * 2 },
      );
      if (t >= 1) {
        clearInterval(timer);
        isZoomingOut.current = false;
      }
    }, STEP_MS);
  }, []);

  useEffect(() => {
    CompassHeading.start(3, ({ heading }: { heading: number }) => {
      headingRef.current = heading;

      // During zoom-in the heading is included in each camera step; skip separate call
      if (!isZoomingIn.current && !isZoomingOut.current) {
        mapRef.current?.animateCamera({ heading }, { duration: 150 });
      }

      if (showIndicatorRef.current && userLocation.current) {
        const bearing = getBearing(userLocation.current, TARGET);
        const diff = normalizeDiff(bearing - heading);
        setAngleDiff(diff);

        if (Math.abs(diff) < ALIGNED_THRESHOLD) {
          triggerAlignmentZoomOut();
        }
      }
    });

    return () => CompassHeading.stop();
  }, [triggerAlignmentZoomOut]);

  // If already aligned when zoom-in completes, compass won't fire — check immediately
  useEffect(() => {
    if (!showIndicator || !userLocation.current) return;
    const bearing = getBearing(userLocation.current, TARGET);
    const diff = normalizeDiff(bearing - headingRef.current);
    setAngleDiff(diff);
    if (Math.abs(diff) < ALIGNED_THRESHOLD) {
      triggerAlignmentZoomOut();
    }
  }, [showIndicator, triggerAlignmentZoomOut]);

  const onUserLocationChange = useCallback((event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    userLocation.current = { latitude, longitude };
    setUserPos({ latitude, longitude });

    if (zoomDone.current) return;
    zoomDone.current = true;

    mapRef.current?.animateCamera(
      { center: { latitude, longitude }, zoom: 2 },
      { duration: 800 },
    );

    setTimeout(() => {
      const ZOOM_START = 2;
      const ZOOM_END = 18;
      const TOTAL_MS = 5000;
      const STEP_MS = 100;
      const startTime = Date.now();

      isZoomingIn.current = true;

      const timer = setInterval(() => {
        const t = Math.min((Date.now() - startTime) / TOTAL_MS, 1);
        const zoom = ZOOM_START + (ZOOM_END - ZOOM_START) * easeInOut(t);

        currentZoom.current = zoom;
        mapRef.current?.animateCamera(
          { center: { latitude, longitude }, zoom, heading: headingRef.current },
          { duration: STEP_MS * 2 },
        );

        if (t >= 1) {
          clearInterval(timer);
          isZoomingIn.current = false;
          showIndicatorRef.current = true;
          setShowIndicator(true);
        }
      }, STEP_MS);
    }, 900);
  }, []);

  const isAligned = showIndicator && Math.abs(angleDiff) < ALIGNED_THRESHOLD;

  const handleKissPressIn = useCallback(async (emoji: string) => {
    if (isPressingRef.current) return;
    selectedEmojiRef.current = emoji;
    isPressingRef.current = true;
    kissGrowAnim.setValue(0);
    kissOriginRef.current = { x: screenW / 2, y: screenH / 2 };

    try {
      if (userLocation.current) {
        const pt = await mapRef.current?.pointForCoordinate(userLocation.current);
        if (pt) kissOriginRef.current = { x: pt.x, y: pt.y };
      }
    } catch {}

    if (!isPressingRef.current) return; // released during the async lookup

    pressStartTime.current = Date.now();
    setShowGrowingHeart(true);
    kissAnimatingRef.current = true;
    Animated.timing(kissGrowAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [kissGrowAnim, screenW, screenH]);

  const handleKissPressOut = useCallback(async () => {
    kissAnimatingRef.current = false;
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    kissGrowAnim.stopAnimation();
    setShowGrowingHeart(false);

    // Time elapsed since animation started, capped at 2000ms → 0..1
    const val = Math.min((Date.now() - pressStartTime.current) / 2000, 1);
    console.log('[kiss] val:', val);
    if (val < 0.025) return;

    // 36px base * scale (0.5..2.0) → 18..72 visual size
    const heartSize = Math.round(36 * (0.5 + val * 1.5));
    const startX = kissOriginRef.current.x;
    const startY = kissOriginRef.current.y;

    let endX = screenW / 2;
    let endY = 100;
    try {
      const pt = await mapRef.current?.pointForCoordinate(TARGET);
      if (pt) { endX = pt.x; endY = pt.y; }
    } catch (e) {
      console.log('[kiss] pointForCoordinate error:', e);
    }

    console.log('[kiss] launching heart:', { startX, startY, endX, endY, heartSize });
    setFlyingHearts(prev => {
      if (prev.length >= 5) return prev;
      return [
        ...prev,
        { id: heartIdRef.current++, startX, startY, endX, endY, size: heartSize, emoji: selectedEmojiRef.current },
      ];
    });
  }, [kissGrowAnim, screenW, screenH]);

  const triggerDestinationPulse = useCallback(async () => {
    try {
      const pt = await mapRef.current?.pointForCoordinate(TARGET);
      if (pt) pulseScreenPos.current = { x: pt.x, y: pt.y };
    } catch {}
    pulseAnim.setValue(1);
    setShowPulse(true);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.35, duration: 160, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowPulse(false));
  }, [pulseAnim]);

  const removeHeart = useCallback((id: number) => {
    setFlyingHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  // Fire kiss immediately when orientation is lost mid-press
  useEffect(() => {
    if (!isAligned && kissAnimatingRef.current) {
      handleKissPressOut();
    }
  }, [isAligned]);

  const color = lineColor(angleDiff);

  const kissScale = kissGrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.0],
  });

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={WORLD_REGION}
          showsUserLocation
          onUserLocationChange={onUserLocationChange}
          showsCompass={false}
          scrollEnabled={false}
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {showIndicator && userPos && (
            <Polyline
              coordinates={[userPos, TARGET]}
              strokeColor={color}
              strokeWidth={3}
            />
          )}
          {showIndicator && (
            <Marker coordinate={TARGET} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.destinationMarker}>
                <Text style={styles.destinationEmoji}>❤️</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {showIndicator && <CompassIndicator angleDiff={angleDiff} />}

        {showPulse && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
              style={{
                position: 'absolute',
                left: pulseScreenPos.current.x - 19,
                top: pulseScreenPos.current.y - 19,
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.35,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                transform: [{ scale: pulseAnim }],
              }}
            >
              <Text style={styles.destinationEmoji}>❤️</Text>
            </Animated.View>
          </View>
        )}

        {flyingHearts.length > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {flyingHearts.map(h => (
              <FlyingHeart
                key={h.id}
                id={h.id}
                startX={h.startX}
                startY={h.startY}
                endX={h.endX}
                endY={h.endY}
                size={h.size}
                emoji={h.emoji}
                onArrive={triggerDestinationPulse}
                onComplete={removeHeart}
              />
            ))}
          </View>
        )}

        {showGrowingHeart && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
              style={{
                position: 'absolute',
                left: kissOriginRef.current.x - 18,
                top: kissOriginRef.current.y - 18,
                transform: [{ scale: kissScale }],
              }}
            >
              <Text style={styles.kissEmoji}>{selectedEmojiRef.current}</Text>
            </Animated.View>
          </View>
        )}

        {isAligned && (
          <View pointerEvents="box-none" style={styles.kissButtonContainer}>
            <View style={styles.kissButtonRow}>
              {KISS_EMOJIS.map(emoji => (
                <Pressable
                  key={emoji}
                  onPressIn={() => handleKissPressIn(emoji)}
                  onPressOut={handleKissPressOut}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.kissButton,
                        pressed && styles.kissButtonPressed,
                        { transform: [{ scale: pressed ? 0.88 : 1 }] },
                      ]}
                    >
                      <Text style={styles.kissEmoji}>{emoji}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kissButtonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  kissButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kissButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4d6d',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  kissButtonPressed: {
    backgroundColor: 'rgba(255,180,180,0.92)',
  },
  kissEmoji: {
    fontSize: 26,
  },
  destinationMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  destinationEmoji: {
    fontSize: 22,
  },
});
