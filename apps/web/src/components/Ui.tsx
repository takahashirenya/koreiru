import { ReactNode, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { ItemStatus, statusLabels } from "@koreiru/shared";
import { copyText } from "../utils/clipboard";
export function Status({ status }: { status: ItemStatus }) {
  return (
    <Chip
      size="small"
      label={statusLabels[status]}
      sx={{
        bgcolor:
          status === "available"
            ? "#e7f2e8"
            : status === "reserved"
              ? "#fff0df"
              : "#eceeeb",
        color:
          status === "available"
            ? "#356859"
            : status === "reserved"
              ? "#986232"
              : "#68736b",
      }}
    />
  );
}
export function CopyLink({
  value,
  label = "URLをコピー",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        startIcon={<ContentCopyRounded />}
        onClick={async () => {
          setCopied(false);
          setError(false);
          try {
            await copyText(value, inputRef.current);
            setCopied(true);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? "コピーしました" : label}
      </Button>
      {error && (
        <Alert severity="warning" role="alert">
          コピーできませんでした。以下のURLを長押ししてコピーしてください。
        </Alert>
      )}
      <Box
        component="input"
        ref={inputRef}
        readOnly
        aria-label={label}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        sx={{
          width: "100%",
          p: 1.3,
          bgcolor: "#f5f7f3",
          border: "1px solid #dee5dc",
          borderRadius: 1,
          // iPhoneの入力欄フォーカスによる自動拡大を防ぐ。
          fontSize: 16,
          color: "text.secondary",
          boxSizing: "border-box",
        }}
      />
    </Stack>
  );
}
export function LoadingError({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: Error | null;
  retry?: () => void;
}) {
  if (loading)
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>読み込み中…</Typography>
      </Stack>
    );
  if (error)
    return (
      <Alert
        severity="error"
        action={
          retry && (
            <Button color="inherit" onClick={retry}>
              再試行
            </Button>
          )
        }
      >
        {error.message}
      </Alert>
    );
  return null;
}
export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      alignItems="center"
      textAlign="center"
      spacing={2}
      sx={{
        py: 8,
        px: 2,
        border: "1px dashed #cdd9cf",
        borderRadius: 3,
        bgcolor: "#fafcf8",
      }}
    >
      <Box sx={{ color: "primary.main", fontSize: 48 }}>{icon}</Box>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 430 }}>
        {description}
      </Typography>
      {action}
    </Stack>
  );
}
