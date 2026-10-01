import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { Application, requestLabels } from "@koreiru/shared";
import { api, absoluteUrl } from "../../api/client";
import { useAction } from "../../hooks/useAction";
import { CopyLink, LoadingError, Status } from "../../components/Ui";
export function RequestPage() {
  const { token = "" } = useParams(),
    action = useAction();
  const query = useQuery({
    queryKey: ["request", token],
    queryFn: () => api<Application>(`/requests/${token}`),
    refetchInterval: 20000,
    retry: false,
  });
  if (!query.data)
    return (
      <LoadingError
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const wish = query.data;
  return (
    <Paper
      variant="outlined"
      sx={{ maxWidth: 640, mx: "auto", p: { xs: 3, md: 5 }, mt: 4 }}
    >
      <Stack spacing={3}>
        <Box>
          <CheckCircleOutlineRounded
            sx={{ fontSize: 42, color: "primary.main", mb: 2 }}
          />
          <Typography variant="h4">{requestLabels[wish.status]}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {wish.boardTitle}
          </Typography>
        </Box>
        {query.error && (
          <Alert severity="error">
            最新の状況を取得できませんでした：{query.error.message}
          </Alert>
        )}
        {action.error && <Alert severity="error">{action.error}</Alert>}
        <Typography variant="h6">{wish.item.name}</Typography>
        <Status status={wish.item.status} />
        <Alert severity={wish.status === "selected" ? "success" : "info"}>
          {wish.item.status === "given"
            ? "受け渡しが完了しました。"
            : wish.status === "selected"
              ? "持ち主があなたを選びました。受け渡しについては、持ち主からの連絡をお待ちください。"
              : wish.status === "pending"
                ? "応募を受け付けました。選ばれた場合は、入力した連絡先で持ち主と直接やりとりします。"
                : wish.status === "cancelled"
                  ? "応募を取り消しました。"
                  : "この応募の受付は終了しました。"}
          {!wish.sharingAvailable &&
            " ボードの共有は現在停止中です。応募確認と取り消しはこのURLから行えます。"}
        </Alert>
        <Typography>
          お名前：{wish.requesterName}
          <br />
          連絡先：{wish.contact}
        </Typography>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{wish.message}</Typography>
        {wish.item.pickupNote && (
          <Typography color="text.secondary">
            受け渡し：{wish.item.pickupNote}
          </Typography>
        )}
        <Typography fontWeight={700}>応募確認・取り消しURL</Typography>
        <CopyLink value={absoluteUrl(`/request/${token}`)} />
        <Typography variant="caption" color="text.secondary">
          このURLはご自身だけで保管してください。URLを知っている人はあなたの連絡先を確認し、応募を取り消せます。
        </Typography>
        {["pending", "selected"].includes(wish.status) &&
          wish.item.status !== "given" && (
            <Button
              color="error"
              disabled={action.busy}
              onClick={() => {
                if (confirm("応募を取り消しますか？"))
                  void action.run(async () => {
                    await api(`/requests/${token}`, { method: "DELETE" });
                  });
              }}
            >
              応募を取り消す
            </Button>
          )}
      </Stack>
    </Paper>
  );
}
