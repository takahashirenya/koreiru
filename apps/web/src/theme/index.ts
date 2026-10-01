import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: {
    primary: { main: "#356859" },
    secondary: { main: "#c47d4d" },
    background: { default: "#f7f8f4", paper: "#ffffff" },
    text: { primary: "#243a33", secondary: "#6c7871" },
  },
  typography: {
    fontFamily:
      '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
    h3: { fontWeight: 750, letterSpacing: "-.045em" },
    h4: { fontWeight: 750, letterSpacing: "-.035em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 650 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, padding: "10px 18px" } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiDialog: { defaultProps: { fullWidth: true, maxWidth: "sm" } },
    MuiTextField: { defaultProps: { fullWidth: true, size: "small" } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});
