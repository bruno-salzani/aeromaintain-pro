import React, { useEffect, useState } from 'react';
import { login, requestReset, resetPassword } from '@/services/authService';

interface Props {
  onAuthenticated: () => void;
}

const AuthForms: React.FC<Props> = ({ onAuthenticated }) => {
  const [view, setView] = useState<'login' | 'forgot' | 'reset' | 'success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [cpf, setCpf] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const remembered = localStorage.getItem('remember_email');
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  const doLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email, password, remember);
      if (remember) localStorage.setItem('remember_email', email);
      onAuthenticated();
    } catch (e: any) {
      setError('Falha no login');
    } finally {
      setLoading(false);
    }
  };

  const doRequestReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await requestReset(email, cpf);
      setResetLink(res.resetLink || '');
      setView('reset');
    } catch (e: any) {
      setError('Falha ao solicitar redefinição');
    } finally {
      setLoading(false);
    }
  };

  const doReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, newPassword);
      setView('success');
    } catch (e: any) {
      setError('Falha ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 w-full max-w-md">
        {view === 'login' && (
          <>
            <h2 className="text-xl font-bold mb-2">Acesso</h2>
            <p className="text-sm text-gray-500 mb-6">Entre com suas credenciais</p>
            <div className="space-y-3">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-4 py-2" />
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Senha" className="w-full border rounded-lg px-4 py-2" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Lembrar meu login
              </label>
              {error && <div className="badge-danger">{error}</div>}
              <button onClick={doLogin} className="btn-primary w-full" disabled={loading}>
                <i className="fas fa-right-to-bracket"></i> Entrar
              </button>
              <button onClick={() => setView('forgot')} className="btn-muted w-full" disabled={loading}>
                Esqueci minha senha
              </button>
            </div>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h2 className="text-xl font-bold mb-2">Recuperar Senha</h2>
            <p className="text-sm text-gray-500 mb-6">Informe Email e CPF</p>
            <div className="space-y-3">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-4 py-2" />
              <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF" className="w-full border rounded-lg px-4 py-2" />
              {error && <div className="badge-danger">{error}</div>}
              <button onClick={doRequestReset} className="btn-primary w-full" disabled={loading}>
                <i className="fas fa-envelope"></i> Enviar link de redefinição
              </button>
              <button onClick={() => setView('login')} className="btn-muted w-full" disabled={loading}>
                Voltar ao login
              </button>
            </div>
          </>
        )}

        {view === 'reset' && (
          <>
            <h2 className="text-xl font-bold mb-2">Redefinir Senha</h2>
            <p className="text-sm text-gray-500 mb-6">Use o token do link recebido</p>
            <div className="space-y-3">
              {resetLink && <a href={resetLink} className="text-xs text-blue-600 underline break-all">{resetLink}</a>}
              <input value={token} onChange={e => setToken(e.target.value)} placeholder="Token" className="w-full border rounded-lg px-4 py-2" />
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Nova senha" className="w-full border rounded-lg px-4 py-2" />
              {error && <div className="badge-danger">{error}</div>}
              <button onClick={doReset} className="btn-success w-full" disabled={loading}>
                <i className="fas fa-key"></i> Redefinir
              </button>
            </div>
          </>
        )}

        {view === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-green-600 font-black text-sm uppercase tracking-widest">Senha atualizada com sucesso</div>
            <button onClick={() => setView('login')} className="btn-primary w-full">
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForms;
