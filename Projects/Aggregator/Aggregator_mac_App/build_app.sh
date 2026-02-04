#!/bin/bash
APP_NAME="AirportAggregator"
APP_DIR="$APP_NAME.app"
EXECUTABLE_NAME="AirportAggregator" 

echo "Cleaning..."
rm -rf "$APP_DIR"

echo "Creating Bundle Structure..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

echo "Compiling Swift..."
swiftc -parse-as-library AirportAggregator/AirportAggregator.swift -o "$APP_DIR/Contents/MacOS/$EXECUTABLE_NAME"
if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

echo "Processing Icon..."
ICON_SOURCE="IconSource.png"
if [ -f "$ICON_SOURCE" ]; then
    ICONSET_DIR="AirportAggregator.iconset"
    mkdir -p "$ICONSET_DIR"
    
    # Generate all required sizes
    sips -s format png -z 16 16     "$ICON_SOURCE" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null
    sips -s format png -z 32 32     "$ICON_SOURCE" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null
    sips -s format png -z 32 32     "$ICON_SOURCE" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null
    sips -s format png -z 64 64     "$ICON_SOURCE" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null
    sips -s format png -z 128 128   "$ICON_SOURCE" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null
    sips -s format png -z 256 256   "$ICON_SOURCE" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null
    sips -s format png -z 256 256   "$ICON_SOURCE" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null
    sips -s format png -z 512 512   "$ICON_SOURCE" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null
    sips -s format png -z 512 512   "$ICON_SOURCE" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null
    sips -s format png -z 1024 1024 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null
    
    iconutil -c icns "$ICONSET_DIR"
    cp "AirportAggregator.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
    
    # Clean up
    rm -rf "$ICONSET_DIR"
    rm "AirportAggregator.icns"
else 
    echo "Warning: IconSource.png not found."
fi

echo "Creating Info.plist..."
cat <<EOF > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$EXECUTABLE_NAME</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.antigravity.aggregator</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "Copying Resources..."
# Copy external/aggregator to Resources
mkdir -p "$APP_DIR/Contents/Resources/external"
cp -R "external/aggregator" "$APP_DIR/Contents/Resources/external/"

echo "App Bundle created at $APP_DIR"
