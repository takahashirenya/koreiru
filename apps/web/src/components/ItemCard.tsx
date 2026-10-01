import { Item } from "@koreiru/shared";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import { imageUrl } from "../api/client";
import { Status } from "./Ui";
export function ItemCard({
  item,
  token,
  owner,
  open,
}: {
  item: Item;
  token: string;
  owner: boolean;
  open: () => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: "#e0e6dd",
        overflow: "hidden",
        transition: "transform .2s",
        "&:hover": { transform: "translateY(-3px)" },
      }}
    >
      <Box
        component="button"
        onClick={open}
        aria-label={`${item.name}の詳細`}
        sx={{
          width: "100%",
          border: 0,
          p: 0,
          cursor: "pointer",
          bgcolor: "#edf0e8",
          aspectRatio: "4 / 3",
          display: "grid",
          placeItems: "center",
        }}
      >
        {item.images[0] ? (
          <Box
            component="img"
            alt={item.name}
            src={imageUrl(token, item.id, item.images[0].id, owner)}
            loading="lazy"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              aspectRatio: "4 / 3",
            }}
          />
        ) : (
          <Inventory2Outlined sx={{ fontSize: 58, color: "#a1b39e" }} />
        )}
      </Box>
      <CardContent sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Status status={item.status} />
          <Typography variant="caption" color="text.secondary">
            {item.quantity}点
          </Typography>
        </Stack>
        <Typography variant="h6" sx={{ mt: 1.5, mb: 1 }}>
          {item.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            height: 44,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.description || "詳しくは品物の詳細をご覧ください。"}
        </Typography>
        <Button
          fullWidth
          variant={owner ? "outlined" : "contained"}
          sx={{ mt: 2 }}
          onClick={open}
        >
          {owner
            ? `詳細・希望者 ${item.requests?.filter((r) => r.status === "pending" || r.status === "selected").length || 0}人`
            : item.status === "available"
              ? "詳細を見る・手を挙げる"
              : "詳細・受付状況を見る"}
        </Button>
      </CardContent>
    </Card>
  );
}
