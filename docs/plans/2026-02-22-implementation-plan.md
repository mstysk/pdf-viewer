# PDF Viewer 実装計画

## Context

設計ドキュメントに基づき、以下の順序で実装を進める。
まずビルド・デプロイ基盤を固めてから、アプリ本体の開発に入る。

## リポジトリ情報

- GitHub: `https://github.com/mstysk/pdf-viewer.git`
- ローカル: `/home/yoshioka/github/mstysk/pdf-viwer`（ディレクトリ名はタイポ、注意）
- ghcr.ioイメージ名: `ghcr.io/mstysk/pdf-viewer/android-builder:latest`
- Capacitor appId: `com.mstysk.pdfviewer`

---

## フェーズ1: Docker環境構築

### 目的
ローカル開発とCIで同一の環境を保証するDockerイメージを作成する。

### 作成ファイル

**`Dockerfile`**
- ベースイメージ: `ubuntu:24.04`
- Java 21 LTS (Eclipse Temurin) をインストール
- Node.js 22 LTS をインストール（NodeSource経由）
- Android commandlinetools をダウンロード・展開
- `sdkmanager` で以下を自動accept＆インストール:
  - `platforms;android-35`
  - `build-tools;35.0.0`
  - `platform-tools`
- 環境変数: `ANDROID_HOME=/opt/android-sdk`, `PATH` に各種ツールを追加

**`compose.yml`**
```yaml
services:
  dev:
    image: ghcr.io/<owner>/pdf-viwer/android-builder:latest
    volumes:
      - .:/workspace
    ports:
      - "5173:5173"
    command: npm run dev -- --host
    working_dir: /workspace
```

### 確認方法
```bash
docker build -t android-builder .
docker run --rm android-builder java -version
docker run --rm android-builder node -version
docker run --rm android-builder sdkmanager --list_installed
```

---

## フェーズ2: DeployFlow構築（Hello Worldアプリで動作確認）

### 目的
Capacitor + React + TypeScript の最小限アプリで、タグpush → APKビルド＆署名 → Artifactsアップロードのパイプラインを動作確認する。

### 作成ファイル

**Capacitorアプリのスキャフォールディング**
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
```

**`capacitor.config.ts`**
- `appId`: `com.mstysk.pdfviewer`
- `appName`: `PDF Viewer`
- `webDir`: `dist`

**`.github/workflows/release.yml`**
```yaml
on:
  push:
    tags: ['v*.*.*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # 1. Dockerイメージをビルド＆ghcr.ioにpush
      - uses: docker/login-action
      - uses: docker/build-push-action
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/android-builder:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # 2. Webビルド（コンテナ内）
      - run: npm ci
      - run: npm run build
      - run: npx cap sync

      # 3. Gradleビルド
      - run: ./gradlew assembleRelease
        working-directory: android

      # 4. APK署名
      - name: Keystoreを復元
        run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > keystore.jks
      - name: zipalign
        run: zipalign -v 4 app-release-unsigned.apk app-release-aligned.apk
      - name: apksigner
        run: apksigner sign --ks keystore.jks ...

      # 5. Artifactsアップロード
      - uses: actions/upload-artifact
        with:
          name: app-release-signed
          path: app-release-signed.apk
```

**Keystoreの生成（初回のみ・手動）**
```bash
keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pdf-viewer
base64 keystore.jks | pbcopy  # → KEYSTORE_BASE64 としてGitHub Secretsに登録
```

### GitHub Secretsの登録
| Secret名 | 値 |
|----------|------|
| `KEYSTORE_BASE64` | Keystoreのbase64 |
| `KEYSTORE_PASSWORD` | Keystoreパスワード |
| `KEY_ALIAS` | `pdf-viewer` |
| `KEY_PASSWORD` | キーパスワード |

### 確認方法
```bash
git tag v0.1.0
git push origin v0.1.0
# GitHub ActionsでAPKが生成されることを確認
```

---

## フェーズ3: アプリ開発（PDFビューア本体）

### 目的
ローカルPDFファイルを開いてシングルページ表示し、スワイプでページ送りできるアプリを実装する。

### 追加パッケージ
- `@capacitor/filesystem`
- `@capacitor-community/file-chooser`
- PDFレンダリングライブラリ（**実装時に選定**）

### 実装ファイル

| ファイル | 内容 |
|----------|------|
| `src/App.tsx` | `pdfData` の状態管理。null → FilePicker、あり → PdfViewer |
| `src/components/FilePicker.tsx` | 「PDFを開く」ボタン。file-chooser呼び出し→ ArrayBuffer を親へ |
| `src/components/PdfViewer.tsx` | `<canvas>` レンダリング＋スワイプ検知 |
| `src/hooks/usePdf.ts` | PDFロード・ページ管理ロジック |

### 確認方法
```bash
docker compose run dev npm install
# Android実機 or エミュレータで動作確認
npx cap run android --livereload --external
```

---

## 実装順序まとめ

0. **タイポ修正**: ローカルディレクトリを `pdf-viwer` → `pdf-viewer` にリネームし、GitHubリモートを設定
   ```bash
   mv /home/yoshioka/github/mstysk/pdf-viwer /home/yoshioka/github/mstysk/pdf-viewer
   cd /home/yoshioka/github/mstysk/pdf-viewer
   git remote add origin https://github.com/mstysk/pdf-viewer.git
   git push -u origin main
   ```
1. `Dockerfile` 作成 → ローカルビルド確認
2. `compose.yml` 作成 → `docker compose run dev npm -v` 確認
3. Viteアプリのスキャフォールディング
4. Capacitor初期設定 (`npx cap init`, `npx cap add android`)
5. Keystoreを生成してGitHub Secretsに登録
6. `release.yml` 作成
7. `git tag v0.1.0 && git push origin v0.1.0` でパイプライン動作確認
8. PDFビューア本体の実装（フェーズ3）
