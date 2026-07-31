#!/usr/bin/env bash
# Build libadhder_android.so for Android ABIs and copy into the RN jniLibs folder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JNI_LIBS="$ROOT/apps/android/android/app/src/main/jniLibs"

if [[ -z "${ANDROID_NDK_HOME:-}" ]]; then
  # Common Android Studio locations
  for candidate in \
    "${ANDROID_HOME:-}/ndk-bundle" \
    "${ANDROID_HOME:-}/ndk/"* \
    "$HOME/Android/Sdk/ndk/"* \
    "$HOME/Library/Android/sdk/ndk/"*
  do
    if [[ -d "$candidate" ]]; then
      export ANDROID_NDK_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${ANDROID_NDK_HOME:-}" || ! -d "${ANDROID_NDK_HOME}" ]]; then
  echo "ANDROID_NDK_HOME is not set. Install NDK via Android Studio SDK Manager, then re-run."
  exit 1
fi

echo "Using NDK: $ANDROID_NDK_HOME"

if ! command -v cargo-ndk >/dev/null 2>&1; then
  echo "Installing cargo-ndk…"
  cargo install cargo-ndk
fi

TARGETS=(
  aarch64-linux-android
  armv7-linux-androideabi
  x86_64-linux-android
  i686-linux-android
)

mkdir -p "$JNI_LIBS"

cd "$ROOT"
cargo ndk \
  -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 \
  -o "$JNI_LIBS" \
  build -p adhder-android --release

echo "Native libraries copied to:"
find "$JNI_LIBS" -name 'libadhder_android.so' -print
echo "Done. Open apps/android/android in Android Studio (or run npm run android)."
