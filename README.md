# Discord Web Token Client

Socket.ioとdiscord.jsを使用した、ブラウザで動作する軽量DiscordTokenクライアントです
Botトークンおよびユーザー個人トークン（Selfbot）の両方に対応しています
まだバグだらけかも

## 特徴
-  **高速・軽量**: Socket.io によるリアルタイム通信
- **レスポンシブ**: PCおよびスマホ表示に完全対応
- 掲示板（フォーラム）チャンネルの閲覧・スレッド表示に対応

## ディレクトリ構造
- `/frontend`: React (Vite) + Tailwind CSS
- `/backend`: Node.js + Express + Socket.io

## セットアップ

### バックエンド
1. `cd backend`
2. `npm install`
3. `node server.js` (デフォルトポート: 8000)

### フロントエンド
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 免責事項
本プロジェクトでユーザー名義のトークン（Selfbot）を使用することは、Discord公式のサービス利用規約に違反する可能性があります。本サービスの利用によりアカウントが停止、削除、または制限された場合でも、開発者は一切の責任を負いません。すべて自己責任において利用してください。

## ライセンス
[MIT](LICENSE)