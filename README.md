# koreiru

引っ越しや断捨離の際に、家族・友人・同僚へ限定URLを送り、品物の譲り先を決める小さな譲渡ボード。ローカル開発用のMVPです。会員登録は不要です。

## 起動する

### Docker Compose

DockerとComposeが入っている環境で、リポジトリ直下から実行します。

```bash
cp .env.example .env
docker compose up --build
```

- 画面: http://localhost:5173
- API: http://localhost:3001/api/health
- PostgreSQL: localhost:5432
- DB確認画面（任意）: `docker compose --profile tools up -d adminer` → http://localhost:8080 （サーバー名 `db`）

API起動時に初期マイグレーションを適用します。DBはDocker volume、画像は `storage/` に保存します。停止は `docker compose down`。ポートはローカルホストだけに公開しています。

### Dockerなし（この環境で検証した方法）

Node.js 24とnpmを使います。開発用PostgreSQLは `embedded-postgres` で起動できます。一般ユーザーで実行してください。

```bash
cd /home/renya/src/koreiru
npm ci
cp .env.example .env
npm run db:generate
npm run db:local
```

`db:local` は起動したままにして、別のターミナルで実行します。

```bash
cd /home/renya/src/koreiru
npm run db:migrate
npm run dev
```

http://localhost:5173 を開きます。両方のターミナルで Ctrl+C を押すと停止します。DBは `.local-db/`、画像は `storage/` に残るので、再起動後も使えます。

既存のPostgreSQLを使う場合は `.env` の `DATABASE_URL` を変更し、`db:local` は実行せず、`db:migrate` と `dev` を実行してください。`.env` はリポジトリ直下で読み込みます。Docker内の接続先はComposeが設定します。

## 使い方

1. ホームでボード名と説明を入力して作成。
2. 管理画面の「設定・共有」で管理URLを保管し、共有URLをコピー。
3. 「品物を追加」から名前、説明、個数、受け渡しの補足、写真を登録。
4. 共有URLを開くと、会員登録なしで名前・連絡先・メッセージを入力して応募。
5. 応募完了画面の確認URLを保管。このURLで応募状態を確認・取り消し。
6. 持ち主が品物の詳細で希望者を確認し、「この人に譲る」で決定。
7. 入力された連絡先を使って直接相談し、受け渡し後に「受け渡し完了」。

管理URL、共有URL、応募確認URLは別々の権限です。

```text
/manage/{adminToken}     持ち主の管理用
/share/{shareToken}      品物の閲覧・応募用
/request/{requestToken}  自分の応募確認・取り消し用
```

管理URLと応募確認URLは本人だけで保管してください。端末内の履歴はブラウザのlocalStorageに保存します。別の端末では保管したURLから開いてください。ブラウザの保存が使えない場合は、URLを手動で保管できます。DBにはトークンの生の値を保存しないため、管理URLを紛失した際の復旧機能はありません。

## MVPの機能

- ボード作成・名前と説明の編集
- 品物の登録・編集・削除
- 複数写真の追加・削除（1品8枚、1枚5MB、JPEG / PNG / WebP）
- 共有URLのコピー・再発行、共有停止・再開、有効期限の設定・解除
- 品物一覧、詳細、状態別フィルター
- 応募者の名前・連絡先・メッセージの確認、相手の決定・お断り
- 受付中 / 相談中 / 譲渡済みの管理
- 応募確認URL、応募取り消し
- スマートフォン表示、通信失敗・入力不備の表示

複数個の品物はまとめて1人に譲る扱いです。個別に譲りたい場合は品物を分けて登録します。

相手を決めると品物は相談中になり、ほかの応募は受付終了になります。同時決定はSerializableトランザクションと競合時の再試行で処理します。選ばれた人の取り消しで受付を再開します。持ち主による再開では、選ばれた人を応募中に戻します。ほかの受付終了済み応募は自動で復活しません。譲渡済みの応募は取り消せません。

共有停止・期限切れ・URL再発行後は、対象の共有URLでの閲覧・応募・画像取得を拒否します。管理画面と応募確認・取り消しURLは引き続き利用できます。URL再発行は期限や共有停止の設定を変更しません。通知はないので、応募者は確認URLを開いて状況を確認します（開いている間は20秒ごとに更新）。

## 個人LINEで相談する

ボード作成時、または管理画面の「設定・共有」→「ボードの内容」で、持ち主のLINE友だち追加リンクを登録できます。LINEの「マイQRコード」→「リンクをコピー」で取得した `https://line.me/ti/p/...` 形式のリンクを使います。空欄で保存すると解除できます。

応募後の確認画面に「メッセージをコピーして、持ち主のLINEを開く」が表示されます。ボード名・品物名・応募者名・応募メッセージをコピーして、登録された持ち主のプロフィールを開きます。必要なら友だち追加して、トークで貼り付け・送信すると、そのまま相談できます。LINEで相談する場合は、応募時の連絡先欄にLINEの表示名を入力できます。

コピーできない場合は画面の文面を手動でコピーし、「持ち主のLINEを開く」から進んでください。個人LINEのトークを文章付きで直接開く機能や、自動送信・送信確認は含みません。LINEへ移動しても応募状態は変わりません。応募確認URLや管理URLは送信文面に自動で含めません。

相談先のリンクは管理画面と受付中・相談中の応募確認画面に表示し、共有一覧にはリンクそのものを返しません。取り消し済み・受付終了・譲渡済みの応募では相談ボタンを表示しません。既存のボードは未設定で、従来どおり利用できます。LINEアプリの起動・友だち追加・トークの操作はスマートフォンで確認してください。

## 構成

```text
koreiru/
├─ apps/
│  ├─ web/               React + Vite + MUI
│  │  └─ src/            pages / components / features / api / hooks / theme
│  └─ api/               NestJS
│     ├─ src/            boards / items / requests / uploads / access / database / common
│     ├─ prisma/         PostgreSQLスキーマと初期マイグレーション
│     └─ test/           Supertestの統合テスト
├─ packages/shared/      共通の型・状態ラベル・Zodバリデーション
├─ scripts/              DB起動・Prisma実行・テスト実行
├─ storage/              開発用画像（Git対象外）
├─ .local-db/            Dockerなしの開発用DB（Git対象外）
├─ docker-compose.yml
└─ .env.example
```

フロントはReact Router、TanStack Query、React Hook Formを使用。APIはNestJS、Prisma、PostgreSQL。画像はMulterで受け取り、Sharpで向きを補正・縮小してWebPへ変換し、EXIFなどのメタデータを除去します。`ImageStorage` を差し替えることで将来S3互換ストレージへ移行できます。画像は静的公開せず、共有・管理トークンを確認して配信します。

トークンは256bitのランダム値、DBではSHA-256のハッシュとして保持。共有レスポンスに応募者の連絡先や管理トークンは含めません。入力サイズ制限、画像枚数・サイズ制限、IP単位のアクセス制限、`noindex` と `no-store`、`no-referrer` を設定しています。URLを転送された人も閲覧可能です。一度閲覧された写真や情報のコピーは共有停止では回収できません。

ログイン、チャット、通知、配送、決済、一般公開検索は含みません。ローカル利用前提で、インターネットへのデプロイは行っていません。

## 検証

```bash
npm run build           # 共通パッケージ・API・画面の型チェックとビルド
npm test                # 入力・トークンのユニットテスト
npm run test:local      # 一時PostgreSQLでマイグレーションとAPI統合テスト
```

`test:local` はポート55439に専用テストDBを起動し、終了時に削除します。開発DBには触れません。手動でテストDBを使う場合は `TEST_DATABASE_URL` を設定して `npm run test:integration` を実行します。DB名に `test` を含める必要があります。

画面テストは、開発DBと `npm run dev` が起動した状態で以下を実行します。

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Linuxではブラウザ依存のインストールに管理者権限が必要な場合があります。テスト用ボードを作成し、終了後に削除します。
