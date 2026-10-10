#!/usr/bin/env bash
# Downloads the small English Vosk model (~40 MB) into the Android assets.
# The model is not committed to git; CI runs this before building.
set -euo pipefail
NAME=vosk-model-small-en-us-0.15
DEST="$(dirname "$0")/../android/app/src/main/assets/model-en-us"
if [ -f "$DEST/uuid" ]; then echo "Model already present"; exit 0; fi
TMP="$(mktemp -d)"
curl -fL --retry 3 -o "$TMP/model.zip" "https://alphacephei.com/vosk/models/$NAME.zip"
unzip -q "$TMP/model.zip" -d "$TMP"
rm -rf "$DEST" && mkdir -p "$(dirname "$DEST")"
mv "$TMP/$NAME" "$DEST"
# Vosk's StorageService re-unpacks the model only when this id changes.
echo "$NAME" > "$DEST/uuid"
rm -rf "$TMP"
echo "Model installed in $DEST"
