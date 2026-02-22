# Docker環境 設計ドキュメント

## 概要

ローカル開発環境とCIビルド環境をDockerで統一し、どこでも同じ動作を保証する。

## Dockerイメージ

**ベースイメージ:** `ubuntu:24.04`

| ツール | バージョン |
|--------|-----------|
| Java (Eclipse Temurin) | 21 LTS |
| Node.js | 22 LTS |
| Android commandlinetools | 最新 |
| Android Build Tools | 35.x |
| Android Platform | API 35 |

**イメージ管理:**
- `ghcr.io/<owner>/pdf-viwer/android-builder:latest` にpush
- `docker/build-push-action`（GitHub公式）を `release.yml` に組み込んで管理
- 専用の `docker-build.yml` は作成しない

## ローカル開発環境（compose.yml）

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

**ポイント:**
- `--host` オプションでAndroid実機から `192.168.x.x:5173` でアクセス可能
- ボリュームマウントによりホスト側の変更がリアルタイム反映（ホットリロード）
- Capacitorのlive reloadと組み合わせて実機確認が可能

## ファイル構成

```
pdf-viwer/
├── Dockerfile        # Androidビルド環境の定義
├── compose.yml       # ローカル開発サーバー起動
└── .github/
    └── workflows/
        └── release.yml  # Dockerビルド＆APKビルドをまとめて管理
```
