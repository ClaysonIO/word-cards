#!/usr/bin/env bash
# Generates the Android signing key and prints the values to paste into
# GitHub → Settings → Secrets and variables → Actions → New repository secret.
#
# Run ONCE. Keep the same key forever: Android only installs updates that are
# signed with the same key as the installed app.
set -euo pipefail
OUT="${1:-word-cards-release.jks}"
PASS="${KEYSTORE_PASSWORD:-$(openssl rand -hex 16)}"

keytool -genkeypair -keystore "$OUT" -storetype PKCS12 -alias wordcards \
  -keyalg RSA -keysize 2048 -validity 36500 \
  -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Word Cards, O=Word Cards, C=US"

echo
echo "Add these repository secrets:"
echo "  ANDROID_KEYSTORE_PASSWORD = $PASS"
echo "  ANDROID_KEYSTORE_BASE64   = (contents of ${OUT}.b64, created next to the keystore)"
base64 -w0 "$OUT" > "${OUT}.b64"
echo
echo "Keep $OUT and the password somewhere safe (e.g. a password manager)."
