# DeployFlow 設計ドキュメント

## 概要

GitHub Actions を使ってタグpush時に署名済みリリースAPKを自動ビルドし、GitHub Artifacts に保存する。
ビルド環境はカスタムDockerイメージで定義し、ghcr.io に置くことでどこでも同じ動作を保証する。

## トリガー

`v*.*.*` 形式のタグpush（例: `v1.0.0`）

## Dockerイメージ

カスタム `Dockerfile` でビルド環境を定義し、`ghcr.io` にpushして管理する。
詳細は `2026-02-22-docker-environment-design.md` を参照。

**更新フロー:**
- `docker/build-push-action`（GitHub公式）を `release.yml` に組み込んで管理
- 専用の `docker-build.yml` は作成しない（layerキャッシュで高速化）

## ワークフロー

```
タグpush
  ↓
1. docker/build-push-action でDockerイメージをビルド＆ghcr.ioにpush
   （layerキャッシュにより変更がない場合は高速スキップ）

2. Webビルド（コンテナ内）
   - npm ci
   - npm run build（Vite）
   - npx cap sync

3. Gradleビルド（コンテナ内）
   - ./gradlew assembleRelease

4. APK署名（コンテナ内）
   - GitHub Secrets から Keystore を復元（base64デコード）
   - zipalign で整列
   - apksigner で署名

5. Artifactsアップロード
   - app-release-signed.apk を保存
```

## GitHub Secrets

| Secret名 | 内容 |
|----------|------|
| `KEYSTORE_BASE64` | Keystoreファイルのbase64エンコード |
| `KEYSTORE_PASSWORD` | Keystoreのパスワード |
| `KEY_ALIAS` | キーのエイリアス |
| `KEY_PASSWORD` | キーのパスワード |

## ファイル構成

```
.github/
└── workflows/
    └── release.yml   # Dockerビルド＆APKビルド＆署名をまとめて管理
Dockerfile            # Androidビルド環境の定義
```
