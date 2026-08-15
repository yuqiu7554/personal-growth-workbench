#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
app_dir="$project_dir/desktop-dist/个人成长工作台.app"
contents="$app_dir/Contents"
module_cache=$(mktemp -d /private/tmp/growth-clang-cache.XXXXXX)

if [ -e "$app_dir" ]; then
  echo "Build target already exists: $app_dir" >&2
  echo "Move it manually before rebuilding; this script will not overwrite it." >&2
  exit 1
fi

mkdir -p "$contents/MacOS" "$contents/Resources"
MACOSX_DEPLOYMENT_TARGET=11.0 clang "$project_dir/native-shell/main.m" \
  -o "$contents/MacOS/GrowthWorkbench" \
  -fobjc-arc \
  -fmodules-cache-path="$module_cache" \
  -framework Cocoa \
  -framework AVFoundation \
  -framework CoreMedia \
  -framework Quartz \
  -framework PDFKit \
  -framework Speech \
  -framework Vision \
  -framework Security \
  -framework WebKit \
  -framework UserNotifications \
  -lsqlite3
cp "$project_dir/native-shell/Info.plist" "$contents/Info.plist"
cp "$project_dir/native-shell/AppIcon.icns" "$contents/Resources/AppIcon.icns"
cp "$project_dir/native-shell/PrivacyInfo.xcprivacy" "$contents/PrivacyInfo.xcprivacy"
cp -R "$project_dir/workbench-prototype" "$contents/Resources/workbench-prototype"
codesign --force --deep --sign - "$app_dir"

echo "Built native preview: $app_dir"
du -sh "$app_dir"
