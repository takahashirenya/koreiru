import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, Item } from "@koreiru/shared";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddPhotoAlternateOutlined from "@mui/icons-material/AddPhotoAlternateOutlined";
export function ItemForm({
  item,
  busy,
  submit,
}: {
  item?: Item;
  busy: boolean;
  submit: (data: unknown, files: File[]) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]),
    [fileError, setFileError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name || "",
      description: item?.description || "",
      quantity: item?.quantity || 1,
      pickupNote: item?.pickupNote || "",
    },
  });
  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={handleSubmit((data) => submit(data, files))}
      sx={{ py: 1 }}
    >
      <TextField
        label="品物の名前"
        placeholder="例：木のサイドテーブル"
        {...register("name")}
        error={!!errors.name}
        helperText={errors.name?.message}
      />
      <TextField
        label="説明・状態"
        multiline
        minRows={3}
        {...register("description")}
        error={!!errors.description}
        helperText={errors.description?.message}
      />
      <TextField
        type="number"
        label="個数（まとめて1人に譲渡）"
        {...register("quantity", { valueAsNumber: true })}
        error={!!errors.quantity}
        helperText={errors.quantity?.message}
      />
      <TextField
        label="受け渡しの補足"
        multiline
        minRows={2}
        {...register("pickupNote")}
        error={!!errors.pickupNote}
        helperText={errors.pickupNote?.message}
      />
      <Box sx={{ p: 2.5, border: "1px dashed #c9d6cb", borderRadius: 2 }}>
        <Button component="label" startIcon={<AddPhotoAlternateOutlined />}>
          写真を追加
          <input
            type="file"
            multiple
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              if (
                selected.length + (item?.images.length || 0) > 8 ||
                selected.some((f) => f.size > 5 * 1024 * 1024)
              ) {
                setFileError("写真は合計8枚まで、1枚5MBまでです");
                setFiles([]);
                e.target.value = "";
              } else {
                setFileError("");
                setFiles(selected);
              }
            }}
          />
        </Button>
        <Typography variant="caption" display="block" color="text.secondary">
          JPEG / PNG / WebP · 1枚5MBまで · 合計8枚
        </Typography>
        {files.map((f, i) => (
          <Typography key={i} variant="body2" sx={{ mt: 1 }}>
            {f.name}
          </Typography>
        ))}
      </Box>
      {fileError && <Alert severity="error">{fileError}</Alert>}
      <Button variant="contained" type="submit" disabled={busy || !!fileError}>
        {busy ? "保存中…" : "品物を保存"}
      </Button>
    </Stack>
  );
}
