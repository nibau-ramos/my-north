#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/mobile"

# Check device is connected
if ! adb devices | grep -q "device$"; then
    echo "Error: No Android device found. Make sure your phone is connected via USB with USB Debugging enabled."
    exit 1
fi

export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null)
export ANDROID_HOME="$HOME/Library/Android/sdk"

# Forward backend port so the device can reach localhost:3000 on the Mac
adb reverse tcp:3000 tcp:3000

echo "Launching MyNorth on Android..."
npx react-native run-android
