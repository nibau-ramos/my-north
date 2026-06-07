#!/bin/bash
set -e

ARRAKIS_UDID="00008140-000944D60132801C"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/mobile"

# Check device is connected and online
if ! xcrun xctrace list devices 2>/dev/null | grep -q "$ARRAKIS_UDID"; then
    echo "Error: Arrakis not found. Make sure your iPhone is connected via USB and trusted."
    exit 1
fi

echo "Launching MyNorth on Arrakis..."
npx react-native run-ios --udid "$ARRAKIS_UDID"
