#!/bin/bash

# ============================================
# LotoLink Icon Generator
# Generates icons for Desktop and Mobile apps
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_ICON="${ROOT_DIR}/lotolink-logo.png"

echo "🎨 LotoLink Icon Generator"
echo "=========================="

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Error: Source icon not found at $SOURCE_ICON"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ Error: ImageMagick (convert) is not installed"
    echo ""
    echo "Install with:"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: choco install imagemagick"
    exit 1
fi

# ============================================
# Desktop Icons
# ============================================
echo ""
echo "📂 Generating Desktop Icons..."
DESKTOP_ASSETS="${ROOT_DIR}/desktop/assets"
mkdir -p "$DESKTOP_ASSETS"

# General PNG icon (1024x1024)
echo "  - icon.png (1024x1024)"
convert "$SOURCE_ICON" -resize 1024x1024 "${DESKTOP_ASSETS}/icon.png"

# Tray icon (64x64)
echo "  - tray-icon.png (64x64)"
convert "$SOURCE_ICON" -resize 64x64 "${DESKTOP_ASSETS}/tray-icon.png"

# Windows ICO (multi-size)
echo "  - icon.ico (Windows)"
convert "$SOURCE_ICON" \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    \( -clone 0 -resize 64x64 \) \
    \( -clone 0 -resize 128x128 \) \
    \( -clone 0 -resize 256x256 \) \
    -delete 0 -alpha on -colors 256 "${DESKTOP_ASSETS}/icon.ico"

# macOS ICNS (requires iconutil on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  - icon.icns (macOS)"
    ICONSET_DIR="${DESKTOP_ASSETS}/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    convert "$SOURCE_ICON" -resize 16x16 "${ICONSET_DIR}/icon_16x16.png"
    convert "$SOURCE_ICON" -resize 32x32 "${ICONSET_DIR}/icon_16x16@2x.png"
    convert "$SOURCE_ICON" -resize 32x32 "${ICONSET_DIR}/icon_32x32.png"
    convert "$SOURCE_ICON" -resize 64x64 "${ICONSET_DIR}/icon_32x32@2x.png"
    convert "$SOURCE_ICON" -resize 128x128 "${ICONSET_DIR}/icon_128x128.png"
    convert "$SOURCE_ICON" -resize 256x256 "${ICONSET_DIR}/icon_128x128@2x.png"
    convert "$SOURCE_ICON" -resize 256x256 "${ICONSET_DIR}/icon_256x256.png"
    convert "$SOURCE_ICON" -resize 512x512 "${ICONSET_DIR}/icon_256x256@2x.png"
    convert "$SOURCE_ICON" -resize 512x512 "${ICONSET_DIR}/icon_512x512.png"
    convert "$SOURCE_ICON" -resize 1024x1024 "${ICONSET_DIR}/icon_512x512@2x.png"
    
    iconutil -c icns "$ICONSET_DIR" -o "${DESKTOP_ASSETS}/icon.icns"
    rm -rf "$ICONSET_DIR"
else
    echo "  ⚠️  Skipping icon.icns (requires macOS)"
fi

# ============================================
# Mobile Icons
# ============================================
echo ""
echo "📱 Generating Mobile Icons..."
MOBILE_ASSETS="${ROOT_DIR}/mobile/src/assets"
ANDROID_RES="${ROOT_DIR}/mobile/android/app/src/main/res"

mkdir -p "$MOBILE_ASSETS"

# App icon for React Native
echo "  - icon.png (1024x1024)"
convert "$SOURCE_ICON" -resize 1024x1024 "${MOBILE_ASSETS}/icon.png"

# Splash screen
echo "  - splash.png (1242x2688)"
convert "$SOURCE_ICON" -resize 400x400 -background "#0071e3" -gravity center -extent 1242x2688 "${MOBILE_ASSETS}/splash.png"

# Adaptive icon
echo "  - adaptive-icon.png (1024x1024)"
convert "$SOURCE_ICON" -resize 1024x1024 "${MOBILE_ASSETS}/adaptive-icon.png"

# Android launcher icons
echo "  - Android mipmap icons"
mkdir -p "${ANDROID_RES}/mipmap-mdpi"
mkdir -p "${ANDROID_RES}/mipmap-hdpi"
mkdir -p "${ANDROID_RES}/mipmap-xhdpi"
mkdir -p "${ANDROID_RES}/mipmap-xxhdpi"
mkdir -p "${ANDROID_RES}/mipmap-xxxhdpi"

convert "$SOURCE_ICON" -resize 48x48 "${ANDROID_RES}/mipmap-mdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 72x72 "${ANDROID_RES}/mipmap-hdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 96x96 "${ANDROID_RES}/mipmap-xhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 144x144 "${ANDROID_RES}/mipmap-xxhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 192x192 "${ANDROID_RES}/mipmap-xxxhdpi/ic_launcher.png"

# Round icons
convert "$SOURCE_ICON" -resize 48x48 \( +clone -threshold -1 -negate -fill white -draw "circle 24,24 24,0" \) -alpha off -compose copy_opacity -composite "${ANDROID_RES}/mipmap-mdpi/ic_launcher_round.png"
convert "$SOURCE_ICON" -resize 72x72 \( +clone -threshold -1 -negate -fill white -draw "circle 36,36 36,0" \) -alpha off -compose copy_opacity -composite "${ANDROID_RES}/mipmap-hdpi/ic_launcher_round.png"
convert "$SOURCE_ICON" -resize 96x96 \( +clone -threshold -1 -negate -fill white -draw "circle 48,48 48,0" \) -alpha off -compose copy_opacity -composite "${ANDROID_RES}/mipmap-xhdpi/ic_launcher_round.png"
convert "$SOURCE_ICON" -resize 144x144 \( +clone -threshold -1 -negate -fill white -draw "circle 72,72 72,0" \) -alpha off -compose copy_opacity -composite "${ANDROID_RES}/mipmap-xxhdpi/ic_launcher_round.png"
convert "$SOURCE_ICON" -resize 192x192 \( +clone -threshold -1 -negate -fill white -draw "circle 96,96 96,0" \) -alpha off -compose copy_opacity -composite "${ANDROID_RES}/mipmap-xxxhdpi/ic_launcher_round.png"

echo ""
echo "✅ Icons generated successfully!"
echo ""
echo "📂 Desktop icons: ${DESKTOP_ASSETS}"
echo "📂 Mobile icons: ${MOBILE_ASSETS}"
echo "📂 Android icons: ${ANDROID_RES}/mipmap-*"
