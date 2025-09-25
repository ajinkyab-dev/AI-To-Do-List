import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import App from './App';
import { clearAuthToken, loginWithGoogle, setAuthToken } from './api';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
let googleScriptPromise;

function loadGoogleIdentityServices() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services require a browser environment.'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const scriptId = 'google-identity-services';
      const existingScript = document.getElementById(scriptId);

      const handleLoad = () => {
        if (window.google?.accounts?.id) {
          resolve(window.google.accounts.id);
        } else {
          reject(new Error('Google Identity Services failed to initialize.'));
        }
      };

      const handleError = () => {
        reject(new Error('Failed to load Google Identity Services.'));
      };

      if (existingScript) {
        if (window.google?.accounts?.id) {
          resolve(window.google.accounts.id);
        } else {
          existingScript.addEventListener('load', handleLoad, { once: true });
          existingScript.addEventListener('error', handleError, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = handleLoad;
      script.onerror = handleError;
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export default function AuthenticatedApp() {
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const buttonContainerRef = useRef(null);

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential || isAuthenticating) {
        return;
      }

      setIsAuthenticating(true);
      setAuthError(null);

      try {
        const result = await loginWithGoogle(response.credential);
        const token = result?.token?.trim();
        const user = result?.user;

        if (!token || !user) {
          throw new Error('Authentication response was incomplete.');
        }

        setAuthToken(token);
        setAuthUser(user);
        window.google?.accounts?.id?.disableAutoSelect?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to authenticate with Google.';
        setAuthError(message);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [isAuthenticating]
  );

  useEffect(() => {
    let cancelled = false;

    if (!googleClientId) {
      setAuthError('Missing Google Client ID. Set VITE_GOOGLE_CLIENT_ID in your client environment.');
      setIsScriptReady(true);
      return () => {
        cancelled = true;
      };
    }

    loadGoogleIdentityServices()
      .then((accountsId) => {
        if (cancelled) {
          return;
        }

        accountsId.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse
        });

        if (buttonContainerRef.current) {
          buttonContainerRef.current.innerHTML = '';
          accountsId.renderButton(buttonContainerRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill'
          });
        }

        accountsId.prompt();
        setIsScriptReady(true);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to load Google Sign-In.';
        setAuthError(message);
        setIsScriptReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [handleCredentialResponse]);

  const handleLogout = useCallback(() => {
    clearAuthToken();
    setAuthUser(null);
    setAuthError(null);
    window.google?.accounts?.id?.disableAutoSelect?.();
  }, []);

  if (authUser) {
    return <App user={authUser} onLogout={handleLogout} />;
  }

  const isLoading = !isScriptReady || isAuthenticating;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: { xs: 3, md: 4 } }} elevation={0}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="h4">AI To-Do List</Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in with Google to access your tasks.
          </Typography>
          {authError ? (
            <Alert severity="error" sx={{ width: '100%' }}>
              {authError}
            </Alert>
          ) : null}
          <Box ref={buttonContainerRef} sx={{ minHeight: 44 }} />
          {isLoading ? <CircularProgress size={24} /> : null}
        </Stack>
      </Paper>
    </Container>
  );
}



