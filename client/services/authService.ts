import { apiPost } from './api';

async function ensureRecaptcha(siteKey: string) {
  if (!(window as any).grecaptcha) {
    await new Promise<void>((resolve) => {
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      s.async = true;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  } else {
    await Promise.resolve();
  }
}

export async function getRecaptchaToken(action: string) {
  const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').toString();
  if (!siteKey) return 'disabled';
  await ensureRecaptcha(siteKey);
  await (window as any).grecaptcha.ready();
  const token = await (window as any).grecaptcha.execute(siteKey, { action });
  return token;
}

export async function login(email: string, password: string, rememberMe: boolean) {
  const recaptchaToken = await getRecaptchaToken('login');
  return apiPost('/api/auth/login', { body: { email, password, rememberMe, recaptchaToken } });
}

export async function requestReset(email: string, cpf: string) {
  const recaptchaToken = await getRecaptchaToken('reset');
  return apiPost('/api/auth/request-reset', { body: { email, cpf, recaptchaToken } });
}

export async function resetPassword(token: string, newPassword: string) {
  return apiPost('/api/auth/reset', { body: { token, newPassword } });
}
