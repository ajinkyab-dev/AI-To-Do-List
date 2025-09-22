import { createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2b6cb0' },
    secondary: { main: '#38a169' },
    error: { main: '#e53e3e' },
    warning: { main: '#dd6b20' },
    success: { main: '#38a169' },
    background: {
      default: '#f5f7fb',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2rem'
    }
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained'
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 20px 40px -24px rgba(31, 41, 55, 0.35)'
        }
      }
    }
  }
});

export default theme;
