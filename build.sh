#!/bin/bash

# ローカルでChrome拡張機能をパッケージ化するスクリプト

# manifest.jsonからバージョンを取得
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "Building Slash Reading Extension v$VERSION"

# distディレクトリを作成
mkdir -p dist

# ZIPファイル名
ZIP_NAME="slash-reading-v${VERSION}.zip"

# 除外するファイルのパターン
EXCLUDE_PATTERNS=(
  "*.git*"
  "dist/*"
  "node_modules/*"
  ".github/*"
  "*.md"
  "*.sh"
  ".DS_Store"
  "spec.md"
)

# 除外オプションを構築
EXCLUDE_OPTS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_OPTS="$EXCLUDE_OPTS -x \"$pattern\""
done

# ZIPファイルを作成
echo "Creating package..."
eval "zip -r \"dist/$ZIP_NAME\" . $EXCLUDE_OPTS"

echo "✅ Package created: dist/$ZIP_NAME"
echo ""
echo "インストール方法:"
echo "1. dist/$ZIP_NAME を解凍"
echo "2. Chromeで chrome://extensions/ を開く"
echo "3. デベロッパーモードをONにする"
echo "4. 「パッケージ化されていない拡張機能を読み込む」をクリック"
echo "5. 解凍したフォルダを選択"