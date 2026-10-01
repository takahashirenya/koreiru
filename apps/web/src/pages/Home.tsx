import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import LinkRounded from "@mui/icons-material/LinkRounded";
import HandshakeOutlined from "@mui/icons-material/HandshakeOutlined";
import { BoardForm } from "../features/boards/BoardForm";
import {
  readLocal,
  saveBoard,
  SavedBoard,
  SavedRequest,
} from "../features/boards/local";
import { api, body } from "../api/client";
import { useAction } from "../hooks/useAction";
export function Home() {
  const [open, setOpen] = useState(false),
    navigate = useNavigate(),
    action = useAction();
  const saved = readLocal<SavedBoard>("koreiru.boards"),
    requests = readLocal<SavedRequest>("koreiru.requests");
  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.15fr .85fr" },
          gap: 5,
          alignItems: "center",
          py: { xs: 4, md: 8 },
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "primary.main",
              fontWeight: 700,
              letterSpacing: ".12em",
              fontSize: 13,
              mb: 3,
            }}
          >
            ちいさな、譲渡ボード
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontSize: { xs: 28, sm: 38, md: 56 }, lineHeight: 1.3 }}
          >
            使わなくなったものに、
            <br />
            身近な人との
            <br />
            <Box component="span" sx={{ color: "primary.main" }}>
              次のつながりを。
            </Box>
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 3, mb: 4, lineHeight: 2 }}
          >
            引っ越しや、暮らしの整理に。
            <br />
            家族・友人・同僚にURLを送って、
            <br />
            欲しいものを聞いてみませんか。
          </Typography>
          <Button
            size="large"
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => setOpen(true)}
          >
            譲渡ボードを作る
          </Button>
          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            sx={{ mt: 2 }}
          >
            会員登録なし · URLを知っている人だけに共有
          </Typography>
        </Box>
        <Box
          aria-hidden
          sx={{
            bgcolor: "#e8eee3",
            borderRadius: "100px 24px 100px 24px",
            p: { xs: 4, md: 6 },
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Box
            sx={{
              bgcolor: "#fffdf8",
              p: 3,
              borderRadius: 3,
              boxShadow: "0 14px 40px #28473513",
              transform: "rotate(-4deg)",
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                bgcolor: "#e8f0e4",
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                mb: 2,
              }}
            >
              <Inventory2Outlined
                sx={{ fontSize: 32, color: "primary.main" }}
              />
            </Box>
            <Typography variant="h6">ものを、気持ちよく譲る。</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              写真を載せて、URLを送る。
              <br />
              次の持ち主は、あなたが決める。
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: "#356859",
              color: "white",
              p: 2.5,
              mt: 3,
              ml: { xs: 2, md: 5 },
              borderRadius: 3,
              transform: "rotate(3deg)",
            }}
          >
            <HandshakeOutlined sx={{ verticalAlign: "middle", mr: 1 }} />
            大切に使ってくれる人へ。
          </Box>
        </Box>
      </Box>
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {[
          {
            icon: <Inventory2Outlined />,
            title: "01  写真で紹介",
            text: "品物の写真と、状態やサイズを登録。",
          },
          {
            icon: <LinkRounded />,
            title: "02  URLを送る",
            text: "身近な人に共有。応募する人も登録不要。",
          },
          {
            icon: <HandshakeOutlined />,
            title: "03  相手を決める",
            text: "希望者から選んで、直接受け渡し。",
          },
        ].map((step) => (
          <Grid key={step.title} size={{ xs: 12, md: 4 }}>
            <Card
              variant="outlined"
              sx={{ height: "100%", borderColor: "#e1e6dc" }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ color: "primary.main", mb: 2 }}>{step.icon}</Box>
                <Typography fontWeight={700}>{step.title}</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {step.text}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {saved.length > 0 && (
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Typography variant="h6">この端末のボード</Typography>
          {saved.map((b) => (
            <Card key={b.adminToken} variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography fontWeight={600}>{b.title}</Typography>
                <Button component={RouterLink} to={`/manage/${b.adminToken}`}>
                  管理画面へ
                </Button>
              </CardContent>
            </Card>
          ))}
          <Typography variant="caption" color="text.secondary">
            URLはこのブラウザに保存されています。共有端末での利用にはご注意ください。
          </Typography>
        </Stack>
      )}
      {requests.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="h6">この端末の応募</Typography>
          {requests.map((r) => (
            <Button
              key={r.token}
              component={RouterLink}
              to={`/request/${r.token}`}
              sx={{ justifyContent: "start" }}
            >
              {r.name} の応募を確認 →
            </Button>
          ))}
        </Stack>
      )}
      <Dialog open={open} onClose={() => !action.busy && setOpen(false)}>
        <DialogTitle>新しい譲渡ボード</DialogTitle>
        <DialogContent>
          {action.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {action.error}
            </Alert>
          )}
          <BoardForm
            busy={action.busy}
            submit={(value) =>
              action.run(async () => {
                const result = await api<{
                  title: string;
                  adminToken: string;
                  shareToken: string;
                }>("/boards", { method: "POST", body: body(value) });
                saveBoard(result);
                navigate(`/manage/${result.adminToken}`);
              })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
