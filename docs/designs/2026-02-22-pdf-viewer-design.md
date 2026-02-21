# PDF Viewer アプリ 設計ドキュメント

## 概要

Capacitor + React + TypeScript で構築するAndroid向けPDFビューアアプリ。
ローカルのPDFファイルを開いてシングルページ表示する。AI機能は後フェーズで追加予定。

## 要件

- プラットフォーム: Android のみ
- PDFの取得: ファイルピッカーでローカルストレージから選択
- 表示方式: シングルページ表示
- ページ操作: 左右スワイプのみ
- AI機能: 今フェーズは対象外（後フェーズで追加）

## 技術スタック

- Vite + React + TypeScript（フロントエンド）
- Capacitor（Android対応ランタイム）
- PDFレンダリングライブラリ: **検討中**（下記参照）
- `@capacitor/filesystem`（ファイル読み込み）
- `@capacitor-community/file-chooser`（ファイル選択）

## PDFレンダリングライブラリ（検討中）

| 選択肢 | 概要 | メリット | デメリット |
|--------|------|----------|------------|
| pdf.js / react-pdf | JavaScriptベース | Web技術、Capacitorと相性良い | 大きなPDFで重くなる可能性 |
| Androidネイティブ | `Capacitor.convertFileSrc()` でWebViewに渡す | ネイティブ品質 | 制御が限定的 |
| PSPDFKit | 商用SDK | 高機能・高品質 | 有料ライセンス |

## ディレクトリ構成

```
pdf-viwer/
├── src/
│   ├── App.tsx              # ルート・状態管理
│   ├── components/
│   │   ├── FilePicker.tsx   # ファイル選択UI
│   │   └── PdfViewer.tsx    # PDFレンダリング＋スワイプ
│   └── hooks/
│       └── usePdf.ts        # PDFロードロジック
├── android/                 # Capacitorが生成
├── capacitor.config.ts
└── package.json
```

## コンポーネント設計

### `App.tsx`
- `pdfData`（ArrayBuffer | null）の状態管理
- `pdfData` が null → `<FilePicker>` を表示
- `pdfData` あり → `<PdfViewer>` を表示

### `FilePicker.tsx`
- 「PDFを開く」ボタンのシンプルな画面
- タップで `@capacitor-community/file-chooser` を呼び出し
- PDF選択後、ファイルデータを親コンポーネントへコールバック

### `PdfViewer.tsx`
- `<canvas>` にページをレンダリング
- スワイプ検知: `touchstart` / `touchend` の deltaX で判定
  - 左スワイプ → 次ページ
  - 右スワイプ → 前ページ
- 画面幅・高さに合わせてcanvasをリサイズ（`devicePixelRatio` 対応）

### `usePdf.ts`
- PDFドキュメントのロード
- `renderPage(pageNum)` でページをcanvasに描画
- 返り値: 現在ページ番号・総ページ数・前/次ページ関数

## データフロー

```
ユーザー操作
  ↓
FilePicker → ファイル選択
  ↓
Capacitor Filesystem → ArrayBuffer として読み込み
  ↓
usePdf → PDFをパース・ページ管理
  ↓
PdfViewer → <canvas> にレンダリング
  ↓
スワイプ → usePdf のページ切り替え
```

## 後フェーズ（AI機能）

- Claude API連携によるページ解説・要約
- SQLite によるローカルキャッシュ（解析結果の保存）
- ユーザーの明示的なリクエストで解析実行
