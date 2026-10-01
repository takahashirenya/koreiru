import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { boardSchema, BoardInput } from "@koreiru/shared";
import { Button, Stack, TextField, Alert } from "@mui/material";
export function BoardForm({
  submit,
  busy,
  initial,
}: {
  submit: (value: unknown) => Promise<void>;
  busy: boolean;
  initial?: {
    title: string;
    description: string;
    expiresAt: string | null;
    ownerLineUrl?: string | null;
  };
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BoardInput>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      title: initial?.title || "",
      description: initial?.description || "",
      ownerLineUrl: initial?.ownerLineUrl || "",
    },
  });
  return (
    <Stack
      component="form"
      onSubmit={handleSubmit(async (values) => {
        await submit(values);
      })}
      spacing={3}
      sx={{ py: 1 }}
    >
      <TextField
        label="ボード名"
        placeholder="例：引っ越し前のおすそわけ"
        {...register("title")}
        error={!!errors.title}
        helperText={errors.title?.message}
      />
      <TextField
        label="ひとこと"
        placeholder="受け渡しの場所や、いつまでに渡したいかなど"
        multiline
        minRows={3}
        {...register("description")}
        error={!!errors.description}
        helperText={errors.description?.message}
      />
      <TextField
        label="持ち主のLINE友だち追加リンク（任意）"
        placeholder="https://line.me/ti/p/..."
        {...register("ownerLineUrl")}
        error={!!errors.ownerLineUrl}
        helperText={
          errors.ownerLineUrl?.message ||
          "LINEの「マイQRコード」→「リンクをコピー」で取得できます。空欄で保存すると解除できます。応募した人に相談先として表示します。"
        }
      />
      <Alert severity="info">
        管理URLを知っている人はボードを編集できます。共有URLと区別して、ご自身だけで保管してください。
      </Alert>
      <Button disabled={busy} type="submit" variant="contained">
        {busy ? "保存中…" : initial ? "変更を保存" : "ボードを作成する"}
      </Button>
    </Stack>
  );
}
