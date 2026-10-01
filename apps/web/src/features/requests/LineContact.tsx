import { useRef, useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import { isPersonalLineUrl } from "@koreiru/shared";
import { copyText } from "../../utils/clipboard";

export function LineContact({
  url,
  boardTitle,
  itemName,
  requesterName,
  message,
}: {
  url: string;
  boardTitle: string;
  itemName: string;
  requesterName: string;
  message: string;
}) {
  const [busy, setBusy] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const text = `koreiru「${boardTitle}」の「${itemName}」に応募した${requesterName}です。\n受け渡しについて相談できますか？${message ? `\n\n${message}` : ""}`;
  if (!isPersonalLineUrl(url)) return null;
  return (
    <Stack
      spacing={2}
      sx={{
        p: 2.5,
        border: "1px solid #cddfd3",
        borderRadius: 2,
        bgcolor: "#f3f8f2",
      }}
    >
      <Typography variant="h6">持ち主とLINEで相談する</Typography>
      <Typography variant="body2" color="text.secondary">
        下の文面をコピーして、持ち主のプロフィールを開きます。必要なら友だち追加し、トーク画面に文面を貼り付けて送信してください。
      </Typography>
      <TextField
        label="LINEで送る文面"
        value={text}
        inputRef={inputRef}
        multiline
        minRows={3}
        maxRows={8}
        slotProps={{ input: { readOnly: true } }}
        sx={{ "& .MuiInputBase-input": { fontSize: 16 } }}
        onFocus={(event) => {
          const input = event.target as HTMLTextAreaElement;
          input.select();
        }}
      />
      {copyError && (
        <Alert severity="warning">
          コピーできませんでした。上の文面を手動でコピーしてから、下の「持ち主のLINEを開く」を押してください。
        </Alert>
      )}
      <Button
        variant="contained"
        startIcon={<ChatBubbleOutlineRounded />}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setCopyError(false);
          try {
            await copyText(text, inputRef.current);
            window.location.assign(url);
          } catch {
            setCopyError(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "コピー中…" : "メッセージをコピーして、持ち主のLINEを開く"}
      </Button>
      {copyError && (
        <Button component="a" href={url} variant="outlined" rel="noreferrer">
          持ち主のLINEを開く
        </Button>
      )}
      <Typography variant="caption" color="text.secondary">
        LINEの送信はご自身で行います。ボタンを押しても、自動送信や応募状態の変更は行いません。
      </Typography>
    </Stack>
  );
}
