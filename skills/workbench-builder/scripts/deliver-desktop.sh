#!/bin/sh
set -eu

skill_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
project_dir=$(CDPATH= cd -- "$skill_dir/../.." && pwd)
build_app="$project_dir/desktop-dist/个人成长工作台.app"
desktop_app="$HOME/Desktop/个人成长工作台.app"
backup_dir="$project_dir/desktop-dist/backup"
backup_app="$backup_dir/个人成长工作台.previous.app"
staging_dir=$(mktemp -d /private/tmp/growth-workbench-delivery.XXXXXX)

cleanup() { rm -rf "$staging_dir"; }
trap cleanup EXIT INT TERM

if [ -e "$build_app" ]; then
  mv "$build_app" "$staging_dir/previous-build.app"
fi

"$project_dir/scripts/build-native-preview.sh"

mkdir -p "$backup_dir"
if [ -e "$desktop_app" ]; then
  if [ -e "$backup_app" ]; then
    mv "$backup_app" "$staging_dir/older-backup.app"
  fi
  cp -R "$desktop_app" "$backup_app"
  mv "$desktop_app" "$staging_dir/current-desktop.app"
fi
cp -R "$build_app" "$desktop_app"

codesign --verify --deep --strict "$build_app"
codesign --verify --deep --strict "$desktop_app"
cmp "$build_app/Contents/MacOS/GrowthWorkbench" "$desktop_app/Contents/MacOS/GrowthWorkbench"
cmp "$build_app/Contents/Info.plist" "$desktop_app/Contents/Info.plist"
cmp "$build_app/Contents/PrivacyInfo.xcprivacy" "$desktop_app/Contents/PrivacyInfo.xcprivacy"
diff -qr "$build_app/Contents/Resources/workbench-prototype" "$desktop_app/Contents/Resources/workbench-prototype"
"$desktop_app/Contents/MacOS/GrowthWorkbench" --database-self-test
"$desktop_app/Contents/MacOS/GrowthWorkbench" --backup-self-test
backup_count=$(find "$backup_dir" -mindepth 1 -maxdepth 1 -name '*.app' -type d | wc -l | tr -d ' ')
if [ "$backup_count" -ne 1 ]; then
  echo "FAIL: expected exactly one previous Desktop app backup, found $backup_count." >&2
  exit 1
fi

pkill -f "$desktop_app/Contents/MacOS/GrowthWorkbench" 2>/dev/null || true
if open -Ra TextEdit >/dev/null 2>&1; then
  if ! open "$desktop_app"; then
    mv "$desktop_app" "$staging_dir/failed-desktop.app"
    if [ -e "$backup_app" ]; then cp -R "$backup_app" "$desktop_app"; fi
    echo "FAIL: LaunchServices is available but the new Desktop app did not open; the previous version was restored." >&2
    exit 1
  fi
  echo "PASS: Desktop app built, synchronized, signed, opened, and previous version retained."
else
  echo "PASS: Desktop app built, synchronized, signed, and native self-tested; GUI launch was skipped because this automation session has no LaunchServices application registry."
fi
