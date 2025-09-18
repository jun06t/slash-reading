# スラッシュリーディング Chrome拡張機能

英文をAIが自動的に意味のまとまりで区切り、読みやすくする拡張機能です。

## 機能

- 🤖 OpenAI APIを使用した高精度な文章解析
- 📚 CEFR基準（A1〜B2）に基づくレベル選択
- ⚡ プログレッシブ処理で大きな記事も快適に
- 🎨 カスタマイズ可能な表示設定
- 💾 処理結果のキャッシュで高速化
- ⌨️ キーボードショートカット対応

## インストール方法

### 方法1: リリース版を使用（推奨）

1. [Releases](https://github.com/jun06t/slash-reading/releases)から最新版をダウンロード
2. ダウンロードしたZIPファイルを解凍
3. Chromeで `chrome://extensions/` を開く
4. 右上の「デベロッパーモード」をONにする
5. 「パッケージ化されていない拡張機能を読み込む」をクリック
6. 解凍したフォルダを選択

### 方法2: ソースコードから直接

```bash
git clone https://github.com/jun06t/slash-reading.git
cd slash-reading
```

その後、上記の手順3〜6を実行（フォルダはcloneしたディレクトリを選択）

### 方法3: ローカルビルド

```bash
git clone https://github.com/jun06t/slash-reading.git
cd slash-reading
./build.sh
```

作成された `dist/slash-reading-vX.X.X.zip` を解凍して、上記の手順3〜6を実行

## 初期設定

1. 拡張機能アイコンをクリックして「詳細設定」を開く
2. OpenAI APIキーを入力
   - [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを取得
   - 使用量に応じて料金が発生します（GPT-4o-miniは低コスト）
3. 読解レベルを設定
   - **A1**: 英検3級程度（最小2語、最大3語）
   - **A2**: 英検準2級程度（最小3語、最大4語）
   - **B1**: 英検2級程度（最小4語、最大6語）推奨
   - **B2**: 英検準1級程度（最小5語、最大8語）
   - **カスタム**: 単語数を自由に設定

## 使い方

### ページ全体を処理
1. 拡張機能アイコンをクリック
2. 「このページで有効化」をON
3. または `Alt+S` (Windows) / `Option+S` (Mac)

### 選択部分のみ処理
1. テキストを選択
2. 右クリック→「選択部分に適用」
3. または `Alt+Shift+S` (Windows) / `Option+Shift+S` (Mac)

### 処理を停止
- プログレッシブバーの「停止」ボタンをクリック
- または `Escape` キーを押す

## 詳細設定

### 表示設定
- **スラッシュの色**: マーカーの色をカスタマイズ
- **表示方法**: CSS疑似要素または実際のテキスト挿入を選択

### 処理設定
- **対象セレクタ**: 処理する要素のCSSセレクタ
- **除外セレクタ**: スキップする要素のCSSセレクタ
- **動的ページ監視**: ページに追加された新しいコンテンツを自動処理

## 開発者向け

### ビルド

```bash
# ローカルパッケージの作成
./build.sh

# GitHubでのリリース（タグ作成時に自動実行）
git tag v1.0.0
git push origin v1.0.0
```

### GitHub Actions

タグをプッシュすると自動的に：
1. Chrome拡張機能のZIPファイルを作成
2. GitHubリリースを作成
3. ZIPファイルをリリースに添付

### プロジェクト構成

```
slash-reading/
├── manifest.json          # 拡張機能設定
├── background.js          # サービスワーカー
├── content-progressive.js # DOM操作（プログレッシブ版）
├── popup.html/js         # ポップアップUI
├── options.html/js       # 設定ページ
├── lib/                  # コアモジュール
│   ├── api.js           # OpenAI統合
│   ├── api-mock.js      # モックAPI（テスト用）
│   ├── dom.js           # DOMユーティリティ
│   ├── text.js          # テキスト処理
│   ├── queue.js         # リクエストキュー
│   └── storage.js       # ストレージラッパー
├── styles/              # CSSファイル
│   ├── content.css      # ページスタイル
│   ├── popup.css        # ポップアップスタイル
│   └── options.css      # 設定スタイル
└── icons/               # 拡張機能アイコン
```

## プライバシー

- APIキーはChromeの同期ストレージにローカル保存
- テキスト処理はOpenAI APIを使用
- レスポンスはローカルにキャッシュしてAPI呼び出しを削減

## ライセンス

MIT

## 貢献

Issue報告やPull Requestは歓迎です！

## 注意事項

- OpenAI APIの使用には料金が発生します
- 大量のテキストを処理する場合はコストにご注意ください
- GPT-4o-miniモデルの使用を推奨（低コスト）