export interface AuthStatus {
  authenticated: boolean;
}

const AUTH_REQUEST_TIMEOUT_MS = 5000;

export async function checkSession(): Promise<AuthStatus> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, AUTH_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch('/api/auth/session', {
      credentials: 'include',
      signal: controller.signal,
    });
    if (!res.ok) return { authenticated: false };
    return (await res.json()) as AuthStatus;
  } catch {
    return { authenticated: false };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    let message = 'Login failed';
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // ignore network errors on logout
  }
}
