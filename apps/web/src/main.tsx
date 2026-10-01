import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link as RouterLink,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import { theme } from "./theme";
import { Home } from "./pages/Home";
import { BoardPage } from "./pages/BoardPage";
import { RequestPage } from "./pages/shared/RequestPage";
const cache = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, retry: 1 } },
});
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="header"
        sx={{ borderBottom: "1px solid #e1e6dc", bgcolor: "#fffdf9" }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ height: 80 }}
          >
            <Button
              component={RouterLink}
              to="/"
              startIcon={<SpaOutlined />}
              sx={{
                fontSize: 26,
                letterSpacing: "-.04em",
                color: "text.primary",
                p: 0,
              }}
            >
              koreiru
              <Box
                component="span"
                sx={{ color: "primary.main", fontSize: 30 }}
              >
                .
              </Box>
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              身近な人に、次の居場所を。
            </Typography>
            <Button component={RouterLink} to="/">
              ホーム
            </Button>
          </Stack>
        </Container>
      </Box>
      <Container
        component="main"
        maxWidth="lg"
        sx={{ py: 3, minHeight: "calc(100vh - 190px)" }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/manage/:token"
            element={<BoardPage key="manage" owner />}
          />
          <Route
            path="/share/:token"
            element={<BoardPage key="shared" owner={false} />}
          />
          <Route path="/request/:token" element={<RequestPage />} />
          <Route
            path="*"
            element={
              <Typography>
                ページが見つかりません。ホームからお進みください。
              </Typography>
            }
          />
        </Routes>
      </Container>
      <Box
        component="footer"
        sx={{ borderTop: "1px solid #e1e6dc", py: 3, mt: 5 }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" gap={2}>
            <Typography variant="body2" color="text.secondary">
              koreiru · ものをつなぐ、ちいさなボード
            </Typography>
            <Typography variant="caption" color="text.secondary">
              LOCAL DEVELOPMENT
            </Typography>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={cache}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
