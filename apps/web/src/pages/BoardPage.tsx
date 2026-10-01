import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { Board, Item, statusLabels, ItemStatus } from "@koreiru/shared";
import { api, body, absoluteUrl } from "../api/client";
import { readLocal, SavedBoard, saveBoard } from "../features/boards/local";
import { BoardForm } from "../features/boards/BoardForm";
import { ItemForm } from "../features/items/ItemForm";
import { useAction } from "../hooks/useAction";
import { CopyLink, Empty, LoadingError } from "../components/Ui";
import { ItemCard } from "../components/ItemCard";
import { ItemDetail } from "./ItemDetail";
export function BoardPage({ owner }: { owner: boolean }) {
  const { token = "" } = useParams();
  const query = useQuery({
    queryKey: ["board", owner, token],
    queryFn: () =>
      api<Board>(owner ? `/manage/boards/${token}` : `/share/${token}`),
    refetchInterval: 20000,
    retry: false,
  });
  const [filter, setFilter] = useState("all"),
    [add, setAdd] = useState(false),
    [settings, setSettings] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const action = useAction();
  const saved = readLocal<SavedBoard>("koreiru.boards").find(
    (b) => b.adminToken === token,
  );
  const [share, setShare] = useState(saved?.shareToken || ""),
    [expiry, setExpiry] = useState("");
  const board = query.data;
  if (!board)
    return (
      <LoadingError
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const items = board.items.filter(
      (i) => filter === "all" || i.status === filter,
    ),
    current = board.items.find((i) => i.id === selected);
  async function upload(id: string, files: File[]) {
    if (!files.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("images", f));
    await api(
      `/manage/items/${id}/images`,
      { method: "POST", body: form },
      token,
    );
  }
  return (
    <>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "start", md: "center" }}
        gap={2}
        sx={{ mt: 3, mb: 4 }}
      >
        <Box>
          <Typography variant="overline" color="primary">
            {owner ? "MY BOARD / 管理画面" : "SHARED BOARD / おすそわけ"}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            {board.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 1.5, whiteSpace: "pre-wrap" }}
          >
            {board.description ||
              "気になる品物があったら、手を挙げてみてください。"}
          </Typography>
          {board.expiresAt && (
            <Typography variant="caption" color="text.secondary">
              共有期限：{new Date(board.expiresAt).toLocaleString("ja-JP")}
            </Typography>
          )}
        </Box>
        {owner && (
          <Stack direction="row" gap={1}>
            <Button
              variant="outlined"
              startIcon={<SettingsOutlined />}
              onClick={() => setSettings(true)}
            >
              設定・共有
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setAdd(true)}
            >
              品物を追加
            </Button>
          </Stack>
        )}
      </Stack>
      {owner && (
        <Alert
          severity={
            board.isActive &&
            (!board.expiresAt || new Date(board.expiresAt) > new Date())
              ? "info"
              : "warning"
          }
          sx={{ mb: 3 }}
        >
          {board.isActive &&
          (!board.expiresAt || new Date(board.expiresAt) > new Date())
            ? "共有URLを知っている人だけが閲覧・応募できます。管理URLはご自身だけで保管してください。"
            : "現在、共有は停止中です。共有URLからの閲覧・応募・画像表示はできません。"}
        </Alert>
      )}
      {query.error && (
        <Alert severity="error">
          更新できませんでした：{query.error.message}
        </Alert>
      )}
      {action.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {action.error}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(["available", "reserved", "given"] as ItemStatus[]).map((s) => (
          <Grid key={s} size={{ xs: 4 }}>
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                bgcolor: s === "available" ? "#edf3e8" : "#fff",
                border: "1px solid #e0e6da",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {statusLabels[s]}
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.5 }}>
                {board.items.filter((i) => i.status === s).length}
                <Box
                  component="span"
                  sx={{ fontSize: 13, fontWeight: 400, ml: 1 }}
                >
                  品
                </Box>
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Tabs
        value={filter}
        onChange={(_, value) => setFilter(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: "1px solid #dfe5d9" }}
      >
        <Tab value="all" label={`すべて (${board.items.length})`} />
        {(["available", "reserved", "given"] as ItemStatus[]).map((s) => (
          <Tab key={s} value={s} label={statusLabels[s]} />
        ))}
      </Tabs>
      {items.length ? (
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ItemCard
                item={item}
                token={token}
                owner={owner}
                open={() => setSelected(item.id)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Empty
          icon={<Inventory2Outlined fontSize="inherit" />}
          title={
            board.items.length
              ? "この状態の品物はありません"
              : owner
                ? "最初の品物を登録しましょう"
                : "品物の準備中です"
          }
          description={
            owner
              ? "写真と説明を添えて、次の持ち主に届けたい品物を並べてみましょう。"
              : "品物が追加されるまで、少しお待ちください。"
          }
          action={
            owner && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setAdd(true)}
              >
                品物を追加
              </Button>
            )
          }
        />
      )}
      {!owner && (
        <Typography
          color="text.secondary"
          variant="body2"
          textAlign="center"
          sx={{ mt: 4 }}
        >
          応募してもすぐには確定しません。持ち主が相手を決めた後、直接やりとりして受け渡します。
        </Typography>
      )}
      <Dialog open={add} onClose={() => !action.busy && setAdd(false)}>
        <DialogTitle>品物を追加</DialogTitle>
        <DialogContent>
          {action.error && <Alert severity="error">{action.error}</Alert>}
          <ItemForm
            busy={action.busy}
            submit={(data, files) =>
              action.run(async () => {
                const result = await api<{ id: string }>(
                  `/manage/boards/${token}/items`,
                  { method: "POST", body: body(data) },
                );
                setAdd(false);
                try {
                  await upload(result.id, files);
                } catch (e) {
                  throw new Error(
                    `品物は保存済みですが、写真を追加できませんでした。詳細から再追加してください。${e instanceof Error ? e.message : ""}`,
                  );
                }
              })
            }
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={settings}
        onClose={() => !action.busy && setSettings(false)}
      >
        <DialogTitle>設定・共有URL</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {action.error && <Alert severity="error">{action.error}</Alert>}
            <Typography fontWeight={700}>持ち主の管理URL</Typography>
            <CopyLink
              value={absoluteUrl(`/manage/${token}`)}
              label="管理URLをコピー"
            />
            <Alert severity="warning">
              この管理URLを紛失すると管理できなくなります。ブックマークなどで保管してください。
            </Alert>
            <Typography fontWeight={700}>家族・友人に送る共有URL</Typography>
            {share ? (
              <CopyLink
                value={absoluteUrl(`/share/${share}`)}
                label="共有URLをコピー"
              />
            ) : (
              <Alert severity="info">
                共有URLはこの端末に保存されていません。再発行してください。古いURLは無効になります。
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              転送された相手も閲覧できます。URLは信頼できる人だけに送ってください。
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button
                disabled={action.busy}
                variant="outlined"
                onClick={() =>
                  action.run(async () => {
                    await api(`/manage/boards/${token}`, {
                      method: "PATCH",
                      body: body({ isActive: !board.isActive }),
                    });
                  })
                }
              >
                {board.isActive ? "共有を停止する" : "共有を再開する"}
              </Button>
              <Button
                disabled={action.busy}
                onClick={() => {
                  if (
                    confirm(
                      "共有URLを再発行します。古いURLは使えなくなります。よろしいですか？",
                    )
                  )
                    void action.run(async () => {
                      const result = await api<{ shareToken: string }>(
                        `/manage/boards/${token}/share-token`,
                        { method: "POST" },
                      );
                      setShare(result.shareToken);
                      saveBoard({
                        title: board.title,
                        adminToken: token,
                        shareToken: result.shareToken,
                      });
                    });
                }}
              >
                URLを再発行
              </Button>
            </Stack>
            <Typography fontWeight={700}>共有期限</Typography>
            <Typography variant="body2" color="text.secondary">
              現在：
              {board.expiresAt
                ? new Date(board.expiresAt).toLocaleString("ja-JP")
                : "期限なし"}
            </Typography>
            <TextFieldLocal value={expiry} onChange={setExpiry} />
            <Stack direction="row" gap={1}>
              <Button
                disabled={action.busy || !expiry}
                onClick={() =>
                  action.run(async () => {
                    await api(`/manage/boards/${token}`, {
                      method: "PATCH",
                      body: body({ expiresAt: new Date(expiry).toISOString() }),
                    });
                  })
                }
              >
                期限を設定
              </Button>
              <Button
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    await api(`/manage/boards/${token}`, {
                      method: "PATCH",
                      body: body({ expiresAt: null }),
                    });
                    setExpiry("");
                  })
                }
              >
                期限を解除
              </Button>
            </Stack>
            <Typography fontWeight={700}>ボードの内容</Typography>
            <BoardForm
              key={board.id}
              initial={board}
              busy={action.busy}
              submit={(value) =>
                action.run(async () => {
                  await api(`/manage/boards/${token}`, {
                    method: "PATCH",
                    body: body(value),
                  });
                  if (share)
                    saveBoard({
                      title: (value as { title: string }).title,
                      adminToken: token,
                      shareToken: share,
                    });
                })
              }
            />
          </Stack>
        </DialogContent>
      </Dialog>
      {current && (
        <ItemDetail
          item={current}
          token={token}
          owner={owner}
          close={() => setSelected(null)}
          upload={upload}
        />
      )}
    </>
  );
}
import { TextField } from "@mui/material";
function TextFieldLocal({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextField
      label="有効期限（この端末の時刻）"
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}
