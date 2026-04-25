# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow
- After every code change, commit it to the current branch
- Use descriptive commit messages that explain what was changed and why
- Never switch branches or create new branches unless explicitly asked
- Run any relevant checks before committing if applicable

## Behavior
- Before starting any non-trivial task, ask clarifying questions to better understand the requirements, edge cases, and expected outcome
- If a request is ambiguous, always ask rather than assume
- Confirm your understanding of the task before writing any code

## Communication
- Be concise in explanations unless asked for detail
- When something is unclear, ask don't assume
- Flag potential issues or risks even if not asked

---

## Repository Structure

This is a monorepo. Currently contains one component:

```
my-north/
├── mobile/   # React Native app (iOS + Android)
```

Future components (backend, etc.) will be added as sibling directories.

---

## Mobile App

React Native 0.85.2 with New Architecture enabled. All commands run from `mobile/`.

### Commands

```bash
# Start Metro bundler
npm start

# Run on iOS (connected iPhone 16e)
npm run ios

# Run on Android
npm run android

# Lint
npm run lint

# Tests
npm test

# Run a single test file
npx jest __tests__/App.test.tsx
```

### iOS Setup Notes

- Google Maps requires the explicit `Google` subspec in `ios/Podfile` — do not change it to the default subspec or the build will fail with `No such module 'GoogleMaps'`
- The Google Maps API key lives in `ios/MyNorth/Info.plist` under `GMSApiKey` and is read at launch in `AppDelegate.swift` via `GMSServices.provideAPIKey(...)`
- After adding/removing native dependencies, run `pod install` from `ios/` before building
- Bundle ID: `com.ensoorigins.MyNorth`

### Architecture

The app is a single-screen experience. `App.tsx` owns all state and orchestration; `src/` holds presentational components.

**App.tsx** — core logic:
- Zoom animation: Google Maps SDK ignores the `duration` param on `animateCamera`, so zoom is driven by a `setInterval` at 100 ms increments using an easeInOut curve (2 → 18 over 5 s)
- Compass: `CompassHeading.start(3, cb)` fires on every 3° change; each tick calls `animateCamera({ heading })` to rotate the map and recomputes `angleDiff` (bearing to target minus current heading, normalised to −180..180)
- Alignment zoom-out: fires once when `|angleDiff| < 10°`, calls `animateCamera` with a zoom level derived from haversine distance to keep the user centred
- `angleDiff` flows down to `CompassIndicator` (arrows) and controls visibility of the kiss button

**src/CompassIndicator.tsx** — left/right arrow indicators:
- Renders only when `|angleDiff| > 10°`
- Uses the CSS border trick (zero-size View with coloured border) to draw triangles — no SVG or image assets
- Two arrows per side: inner full-size, outer at 70% / 45% opacity for depth
- Anchored at `left: '50%', top: '50%'` (screen centre = user blue dot)

**src/FlyingHeart.tsx** — kiss animation:
- Receives screen-pixel coordinates (`startX/Y`, `endX/Y`) — `endX/Y` comes from `mapRef.current.pointForCoordinate(TARGET)`
- Flight path: oscillating perpendicular offset using a 61-keyframe `interpolate` outputRange (pre-computed sine wave), amplitude tapers to zero on arrival
- Explosion phase: `FRAG_COUNT` small hearts scatter with random angles/distances and fade out, then `onComplete(id)` is called to remove the entry from state
- Up to 5 hearts can fly simultaneously (enforced in `App.tsx` before adding to state)

### Key Constants (App.tsx)
| Name | Value | Purpose |
|---|---|---|
| `TARGET` | Recife, Brazil | Fixed destination coordinate |
| `ALIGNED_THRESHOLD` | 10° | Threshold for "locked on" state |
| `ZOOM_END` | 18 | Street-level zoom after animation |
| `TOTAL_MS` | 5000 | Duration of zoom-in animation |
