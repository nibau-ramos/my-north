#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/mobile"

echo "Building and installing MyNorth in Release mode (no Metro needed after install)..."
npx react-native run-ios --udid 00008140-000944D60132801C --mode Release
