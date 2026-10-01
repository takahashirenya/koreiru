import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Item, requestSchema, requestLabels } from "@koreiru/shared";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { api, body, imageUrl } from "../api/client";
import { useAction } from "../hooks/useAction";
import { saveRequest, readLocal, SavedRequest } from "../features/boards/local";
import { ItemForm } from "../features/items/ItemForm";
import { Status } from "../components/Ui";
export function ItemDetail({
  item,
  token,
  owner,
  close,
  upload,
}: {
  item: Item;
  token: string;
  owner: boolean;
  close: () => void;
  upload: (id: string, files: File[]) => Promise<void>;
}) {
  const [edit, setEdit] = useState(false),
    action = useAction(),
    navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { requesterName: "", contact: "", message: "" },
  });
  const previous = readLocal<SavedRequest>("koreiru.requests").filter(
    (r) => r.itemId === item.id,
  );
  return (
    <Dialog open onClose={() => !action.busy && close()}>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {edit ? "品物を編集" : item.name}
        <IconButton aria-label="閉じる" disabled={action.busy} onClick={close}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5}>
          {action.error && <Alert severity="error">{action.error}</Alert>}
          <Status status={item.status} />
          {item.images.length > 0 && (
            <Stack direction="row" gap={1.5} sx={{ overflowX: "auto", pb: 1 }}>
              {item.images.map((image) => (
                <Box
                  key={image.id}
                  sx={{
                    minWidth: item.images.length === 1 ? "100%" : "80%",
                    position: "relative",
                  }}
                >
                  <Box
                    component="img"
                    src={imageUrl(token, item.id, image.id, owner)}
                    alt={item.name}
                    sx={{
                      width: "100%",
                      height: 280,
                      objectFit: "contain",
                      bgcolor: "#f2f4ed",
                      borderRadius: 2,
                    }}
                  />
                  {owner && edit && (
                    <IconButton
                      aria-label="写真を削除"
                      disabled={action.busy}
                      sx={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        bgcolor: "white",
                      }}
                      onClick={() => {
                        if (confirm("この写真を削除しますか？"))
                          void action.run(async () => {
                            await api(
                              `/manage/items/${item.id}/images/${image.id}`,
                              { method: "DELETE" },
                              token,
                            );
                          });
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
          )}
          {edit ? (
            <>
              <ItemForm
                item={item}
                busy={action.busy}
                submit={(data, files) =>
                  action.run(async () => {
                    await api(
                      `/manage/items/${item.id}`,
                      { method: "PATCH", body: body(data) },
                      token,
                    );
                    try {
                      await upload(item.id, files);
                    } catch (e) {
                      throw new Error(
                        `品物の変更は保存済みです。写真の追加に失敗しました。${e instanceof Error ? e.message : ""}`,
                      );
                    }
                    setEdit(false);
                  })
                }
              />
              <Button disabled={action.busy} onClick={() => setEdit(false)}>
                詳細に戻る
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
                {item.description || "説明はまだありません。"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                個数：{item.quantity}点（まとめて1人に譲渡）
              </Typography>
              {item.pickupNote && (
                <Box sx={{ p: 2, bgcolor: "#f3f5ed", borderRadius: 2 }}>
                  <Typography variant="subtitle2">受け渡しについて</Typography>
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, whiteSpace: "pre-wrap" }}
                  >
                    {item.pickupNote}
                  </Typography>
                </Box>
              )}
              {owner ? (
                <>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button
                      disabled={action.busy}
                      variant="outlined"
                      onClick={() => setEdit(true)}
                    >
                      品物を編集
                    </Button>
                    {item.status === "reserved" && (
                      <Button
                        disabled={action.busy}
                        variant="contained"
                        onClick={() => {
                          if (
                            confirm(
                              "直接受け渡しは完了しましたか？譲渡済みに変更します。",
                            )
                          )
                            void action.run(async () => {
                              await api(
                                `/manage/items/${item.id}`,
                                {
                                  method: "PATCH",
                                  body: body({ status: "given" }),
                                },
                                token,
                              );
                            });
                        }}
                      >
                        受け渡し完了
                      </Button>
                    )}
                    {item.status !== "available" && (
                      <Button
                        disabled={action.busy}
                        onClick={() => {
                          if (
                            confirm(
                              "受付を再開し、決定済みの相手を応募中に戻しますか？ほかの終了済み応募はそのままです。",
                            )
                          )
                            void action.run(async () => {
                              await api(
                                `/manage/items/${item.id}`,
                                {
                                  method: "PATCH",
                                  body: body({ status: "available" }),
                                },
                                token,
                              );
                            });
                        }}
                      >
                        受付を再開
                      </Button>
                    )}
                    <Button
                      color="error"
                      disabled={action.busy}
                      onClick={() => {
                        if (confirm("品物とすべての応募・写真を削除しますか？"))
                          void action.run(async () => {
                            await api(
                              `/manage/items/${item.id}`,
                              { method: "DELETE" },
                              token,
                            );
                            close();
                          });
                      }}
                    >
                      削除
                    </Button>
                  </Stack>
                  <Divider />
                  <Typography variant="h6">
                    希望者 ({item.requests?.length || 0})
                  </Typography>
                  {!item.requests?.length && (
                    <Typography color="text.secondary">
                      まだ応募はありません。
                    </Typography>
                  )}
                  {item.requests?.map((wish) => (
                    <Box
                      key={wish.id}
                      sx={{
                        p: 2,
                        border: "1px solid #dfe5d9",
                        borderRadius: 2,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        gap={2}
                      >
                        <Typography fontWeight={700}>
                          {wish.requesterName}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          {requestLabels[wish.status]}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {wish.contact}
                      </Typography>
                      <Typography sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                        {wish.message || "メッセージなし"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(wish.createdAt).toLocaleString("ja-JP")}
                      </Typography>
                      {wish.status === "pending" &&
                        item.status === "available" && (
                          <Stack direction="row" gap={1} sx={{ mt: 2 }}>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={action.busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    `${wish.requesterName}さんに決定しますか？ほかの応募は受付終了になります。`,
                                  )
                                )
                                  void action.run(async () => {
                                    await api(
                                      `/manage/requests/${wish.id}`,
                                      {
                                        method: "PATCH",
                                        body: body({ status: "selected" }),
                                      },
                                      token,
                                    );
                                  });
                              }}
                            >
                              この人に譲る
                            </Button>
                            <Button
                              size="small"
                              disabled={action.busy}
                              onClick={() => {
                                if (confirm("この応募を受付終了にしますか？"))
                                  void action.run(async () => {
                                    await api(
                                      `/manage/requests/${wish.id}`,
                                      {
                                        method: "PATCH",
                                        body: body({ status: "declined" }),
                                      },
                                      token,
                                    );
                                  });
                              }}
                            >
                              お断りする
                            </Button>
                          </Stack>
                        )}
                    </Box>
                  ))}
                </>
              ) : (
                <>
                  <Divider />
                  {previous.map((r) => (
                    <Button
                      key={r.token}
                      component={RouterLink}
                      to={`/request/${r.token}`}
                    >
                      この端末の応募を確認する →
                    </Button>
                  ))}
                  {item.status === "available" ? (
                    <Stack
                      spacing={2}
                      component="form"
                      onSubmit={handleSubmit((data) =>
                        action.run(async () => {
                          const result = await api<{ requestToken: string }>(
                            `/share/${token}/items/${item.id}/requests`,
                            { method: "POST", body: body(data) },
                          );
                          saveRequest({
                            name: item.name,
                            token: result.requestToken,
                            shareToken: token,
                            itemId: item.id,
                          });
                          navigate(`/request/${result.requestToken}`);
                        }),
                      )}
                    >
                      <Typography variant="h6">この品物に手を挙げる</Typography>
                      <TextField
                        label="お名前"
                        {...register("requesterName")}
                        error={!!errors.requesterName}
                        helperText={errors.requesterName?.message}
                      />
                      <TextField
                        label="連絡先（メール・電話番号など）"
                        {...register("contact")}
                        error={!!errors.contact}
                        helperText={errors.contact?.message}
                      />
                      <TextField
                        label="持ち主へのメッセージ"
                        multiline
                        minRows={3}
                        {...register("message")}
                        error={!!errors.message}
                        helperText={errors.message?.message}
                      />
                      <Typography variant="caption" color="text.secondary">
                        名前・連絡先・メッセージは持ち主だけに表示します。応募後に発行される確認URLから、自分の応募を取り消せます。
                      </Typography>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={action.busy}
                      >
                        {action.busy ? "応募中…" : "欲しいです、と伝える"}
                      </Button>
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      {item.status === "given"
                        ? "この品物は受け渡しが完了しています。"
                        : "持ち主が譲る相手と相談中です。現在は応募できません。"}
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
