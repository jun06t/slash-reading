# 概要
英語テキストに学習用の「スラッシュ（/）」を自動挿入する Chrome 拡張。ページ内のテキストノードを抽出し、生成AI（OpenAI）でスラッシュ位置を推定し、HTMLを直接書き換えて可視化する。ポップアップ（拡張アイコン）と右クリック（コンテキストメニュー）の両方で ON/OFF 切り替えができる。範囲選択テキストへの適用にも対応する。

---

## ユースケース / 目標
- 学習中に任意の英語ページでスラッシュリーディングを有効化。
- ページ全体、またはユーザーが選択した範囲テキストに対して処理。
- 長文でも破綻なく処理（段落単位で分割・バッチ処理）。
- 1クリック/右クリックで素早く ON/OFF。
- 元のHTML構造やリンク・入力フォームを壊さない。

### 非目標（スコープ外）
- 翻訳（和訳）の提供。
- ページ保存/印刷時の完全再現（可能だが初版は最小対応）。
- PDF ビューア内テキストの処理（将来検討）。

---

## アーキテクチャ
- **Manifest V3**
- **Service Worker（Background）**: コンテキストメニュー生成、タブごとのON/OFF状態管理、OpenAI API呼び出し仲介（CORS・レート制御の集中化）。
- **Content Script**: DOM走査、テキスト抽出、AI結果の適用（スラッシュ挿入/復元）、範囲選択時の処理、MutationObserverで動的ページ対応。
- **Popup（拡張アイコン）**: 現在タブの有効/無効トグル、設定画面遷移、モデル選択。
- **Options Page**: OpenAI APIキーの保存、詳細設定（閾値、対象/除外セレクタ、表示色など）。
- **共通モジュール**: ストレージ、ハッシュ、キュー、キャッシュ、テキスト正規化。

### データフロー
1. Popupまたはコンテキストメニュー→Background: 現タブの有効化トグル。
2. Background→Content: 有効化メッセージ。
3. Content: DOM走査または選択範囲→段落/文ごとにバッチを作成→Backgroundへ「推定リクエスト」。
4. Background: OpenAI API呼び出し（バッチ）→Contentへスラッシュ位置結果返却。
5. Content: HTMLへスラッシュを適用（CSS疑似要素で非破壊表示）、またはオフ時に原文へ復元。

---

## 権限 / Manifest 設計
```json
{
  "manifest_version": 3,
  "name": "Slash Reading Inserter",
  "version": "1.0.0",
  "description": "Insert learning slashes into English sentences on web pages.",
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Slash Reading"
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/16.png",
    "32": "icons/32.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

---

## ディレクトリ構成（Claude Code で新規作成）
```
slash-reading-extension/
├─ manifest.json
├─ background.js
├─ content.js
├─ popup.html
├─ popup.js
├─ options.html
├─ options.js
├─ styles/
│  ├─ content.css
│  └─ popup.css
├─ icons/
│  ├─ 16.png 32.png 48.png 128.png
├─ lib/
│  ├─ api.js        // OpenAI呼び出し
│  ├─ dom.js        // DOM抽出・適用処理
│  ├─ text.js       // 文分割・正規化・ハッシュ
│  ├─ queue.js      // リクエストキューとレート制御
│  └─ storage.js    // chrome.storage ラッパ
└─ README.md
```

---

## 主要コンポーネントの仕様

### 1) Options（APIキー & 設定）
- **保存先**: `chrome.storage.sync`（端末間同期）。
- **項目**
  - OpenAI API Key（必須）
  - モデル選択: `gpt-4o-mini` を既定とし、他の候補（例: `gpt-4o`, `gpt-3.5-turbo`）も選択可能。
  - 最大トークン/1バッチ（数値）
  - スラッシュ表示方式: 実文字 or CSS疑似要素（既定: CSS疑似要素）
  - スラッシュ色（CSSカラー値）
  - 対象セレクタ
  - 除外セレクタ
  - 動的ページ監視の有無
- **バリデーション**: APIキー形式の簡易チェック、空値は保存不可。

### 2) Popup（ON/OFF）
- 現在タブの有効化状態を表示。
- トグルスイッチでON/OFF切替。
- モデル選択ドロップダウン。
- Optionsへのリンク、最終エラー表示。

### 3) コンテキストメニュー（右クリック）
- `ページ全体でスラッシュ: ON/OFF`
- `選択範囲でスラッシュを適用`（新機能）

### 4) Background（service worker）
- 状態管理: `Map<tabId, boolean>`。
- メニュー登録: ページ全体と範囲選択用。
- API仲介: `lib/api.js` 使用。
- メッセージ: `TOGGLE`, `PROCESS_BATCH`, `PROCESS_SELECTION`, `BATCH_RESULT`。

### 5) Content Script
- 起動時に状態問い合わせ。
- **範囲選択モード**: ユーザーが選んだ `window.getSelection()` の範囲内のみ処理。
- DOM走査・文分割・AI呼び出し・適用処理は全体処理と共通。

### 6) レンダリング仕様
- **CSS疑似要素方式**: 各チャンク後に `::after { content: "/"; color: <設定色>; }` を追加。
- 実文字挿入方式も選択可能。

---

## OpenAI 連携
- モデル選択可能。
- キャッシュは 20MB 上限。

---

## エラーハンドリング
- APIキー未設定時はPopupに警告。
- その他は既存の設計と同じ。

---

## 受け入れ基準（Acceptance Criteria）
1. 任意の英語記事で拡張アイコンON→スラッシュ表示、OFF→復元。
2. 右クリックメニューで「ページ全体」または「選択範囲」を処理可能。
3. リンクやフォームを壊さない。
4. キャッシュ有効。
5. モデル選択・スラッシュ色選択がOptionsから設定可能。

---

## ロードマップ（将来拡張）
- 選択範囲での逐次処理改善。
- ドメイン許可/除外リスト。
- 翻訳補助ツールチップ。

---

これで、ユーザー要望を反映した v2 仕様書になっています。


---

# 追補 v1.1（要件確定に伴う更新）

以下の変更は v1 仕様を**上書き**します（v1の該当箇所よりこちらを優先）。

## 決定事項の反映
- **対象範囲**: ページ全体に加え、**範囲選択のみ**への適用を初版から実装。
- **モデル**: 既定 `gpt-4o-mini`。**Options で選択・切替可能**（プルダウン＋自由入力）。Popup でも簡易切替を提供。
- **挿入方式**: **CSS擬似要素による非破壊表示**を既定に採用。実文字「/」は挿入しない。
  - 実装: 各チャンクを `<span class="sr-chunk">…</span>` でラップし、`.sr-chunk + .sr-chunk::before { content: "/"; }` で表示。
  - **色**は Options のカラーピッカーで指定し、CSSカスタムプロパティ `--sr-slash-color` に反映。
- **リンク内テキスト**: 「リンク内テキスト」とは `<a>` 要素配下のテキストを指す。**対象外**とする。
- **キャッシュ上限**: `chrome.storage.local` の応答キャッシュを **20MB** LRU 管理。
- **ドメイン許可制**: 既定は**全サイト対象**。

## 機能追加
### 1) 選択範囲への適用
- UI:
  - **コンテキストメニュー**: 「選択範囲にスラッシュを適用」（selection コンテキスト時のみ表示）
  - **Popup**: 「選択範囲に適用」ボタン
  - **キーボードショートカット**（manifest `commands`）:
    - `Alt+S` … ページ全体 ON/OFF
    - `Alt+D` … 選択範囲に適用
- フロー:
  1. Content Script が `window.getSelection()` から Range 収集
  2. 選択範囲内テキストノードのみ抽出→バッチ作成→Background へ API 要請
  3. 返却 `chunks[]` を `.sr-chunk` でラップして適用（範囲外は不変）

### 2) OpenAI 応答フォーマット（非破壊表示向け）
- **入力**（例）:
```json
{
  "sentences": [
    { "id": "p1s1", "text": "When the meeting ends, we will head to the station together." }
  ],
  "style": { "max_chunks_per_sentence": 6, "min_chunk_length": 2 }
}
```
- **出力**（例）:
```json
{
  "results": [
    { "id": "p1s1", "chunks": ["When the meeting ends", "we will head", "to the station", "together."] }
  ]
}
```
> 以後、v1の `slash_text` 仕様は**非推奨**。`chunks[]` を使用。

### 3) CSS 仕様（追補）
```css
:root { --sr-slash-color: currentColor; }
.sr-chunk + .sr-chunk::before {
  content: "/";
  color: var(--sr-slash-color);
  opacity: .9;
  margin: 0 .15em;
}
```
- クリップボードコピー時、擬似要素は多くのブラウザでコピーされず原文が保持される想定。

### 4) Manifest 追補（抜粋）
```json
{
  "commands": {
    "toggle_page": { "suggested_key": { "default": "Alt+S" }, "description": "ページ全体のON/OFF" },
    "process_selection": { "suggested_key": { "default": "Alt+D" }, "description": "選択範囲に適用" }
  }
}
```
- 背景: `background.js` は `chrome.commands.onCommand` で両コマンドを受け取り、Content Script にメッセージを送る。

### 5) 受け入れ基準 追補
- 選択範囲に対し、右クリック / Popup / `Alt+D` のいずれでも適用できる。
- Options の色設定が即時反映される（再適用不要のためには、`<style>` 変数参照にしておく）。
- リンク (`<a>`) 内テキストは未処理のまま維持される。

## 実装メモ（Claude Codeでの差分開発ガイド）
- `lib/dom.js`
  - 新規 `extractSelectionBatch()` を実装。
  - `applyChunksResults()` は `chunks[]` を `DocumentFragment` に再構成し `.sr-chunk` でラップ。
- `background.js`
  - `contextMenus` に `selection` 用アイテム追加。
  - `commands.onCommand` で `process_selection` 分岐。
- `options.html/js`
  - モデル選択 UI（プリセット + 自由入力）と色ピッカー追加。
- `styles/content.css`
  - 上記CSSを追加。`--sr-slash-color` は Options から `documentElement.style.setProperty` で更新。

以上の追補により、選択範囲対応・モデル切替・非破壊表示・色指定が v1 に統合されます。
