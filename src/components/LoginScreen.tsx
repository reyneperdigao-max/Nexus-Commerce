import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import {
  signInWithEmail,
  registerWithEmail,
  resetPasswordEmail,
  signInWithGoogle,
  translateFirebaseAuthError,
} from '../lib/firebase';

type AuthMode = 'login' | 'register' | 'reset';

export function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('nexus_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const persistEmailHint = (value: string) => {
    try {
      if (value.trim()) {
        localStorage.setItem('nexus_saved_email', value.trim());
      }
    } catch {
      // Ignore storage write errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Informe o seu e-mail para continuar.');
      return;
    }

    if (mode === 'reset') {
      setIsLoading(true);
      try {
        await resetPasswordEmail(trimmedEmail);
        persistEmailHint(trimmedEmail);
        setSuccessMsg(
          'Enviamos um link de redefinição de senha para o seu e-mail. Verifique sua caixa de entrada e spam.'
        );
      } catch (err) {
        setErrorMsg(translateFirebaseAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Informe sua senha para continuar.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Informe seu nome ou nome da empresa para criar a conta.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não conferem.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await registerWithEmail(trimmedEmail, password, fullName.trim());
      }
      persistEmailHint(trimmedEmail);
    } catch (err) {
      setErrorMsg(translateFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.user?.email) {
        persistEmailHint(result.user.email);
      }
    } catch (err) {
      setErrorMsg(translateFirebaseAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const busy = isLoading || isGoogleLoading;

  return (
    <div className="min-h-screen w-full bg-[#080a0f] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans select-none">
      {/* Subtle Architectural Backdrop */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(ellipse 65% 45% at 50% 15%, rgba(229, 184, 75, 0.1) 0%, transparent 65%), radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 32px 32px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080a0f]/40 to-[#080a0f]" />
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-[420px] mx-auto flex flex-col items-center z-10">
        {/* Hexagonal Gold Emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-4 flex items-center justify-center"
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_24px_rgba(229,184,75,0.2)]">
              <polygon
                points="50,3 93,26 93,74 50,97 7,74 7,26"
                fill="#0e121b"
                stroke="url(#goldGradient)"
                strokeWidth="3"
              />
              <polygon
                points="50,10 86,30 86,70 50,90 14,70 14,30"
                fill="#0a0d14"
                stroke="rgba(229,184,75,0.25)"
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5DC93" />
                  <stop offset="50%" stopColor="#E5B84B" />
                  <stop offset="100%" stopColor="#A67B1F" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-br from-[#F5DC93] via-[#E5B84B] to-[#B88924] bg-clip-text text-transparent">
                NC
              </span>
            </div>
          </div>
        </motion.div>

        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex flex-col items-center text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus Commerce</h1>
          <p className="text-xs text-zinc-400 mt-1">Gestão Comercial &amp; Controle de Recebíveis</p>
        </motion.div>

        {/* Elevated Executive Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="w-full glass-card p-6 sm:p-7 space-y-5"
        >
          {/* Mode Tabs (Login / Register) */}
          {mode !== 'reset' ? (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#080a0f]/80 border border-white/[0.08]">
              <button
                type="button"
                disabled={busy}
                onClick={() => switchMode('login')}
                className={`h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gold/15 text-gold border border-gold/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => switchMode('register')}
                className={`h-9 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gold/15 text-gold border border-gold/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                Criar Conta
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={busy}
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-gold transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Voltar ao login</span>
              </button>
              <span className="text-xs font-semibold text-gold">Recuperar Senha</span>
            </div>
          )}

          {/* Feedback Banners */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                key="auth-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key="auth-success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Full Name (only on Register) */}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Nome ou Empresa
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type="text"
                    required
                    disabled={busy}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full h-11 bg-[#080a0f]/80 border border-white/[0.1] rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-gold/70 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* E-mail Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                E-mail da conta
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type="email"
                  required
                  disabled={busy}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-11 bg-[#080a0f]/80 border border-white/[0.1] rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-gold/70 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            {mode !== 'reset' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => switchMode('reset')}
                      className="text-xs font-medium text-zinc-400 hover:text-gold transition-colors cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={busy}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 bg-[#080a0f]/80 border border-white/[0.1] rounded-xl pl-10 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-gold/70 transition-colors tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={busy}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full h-11 bg-[#080a0f]/80 border border-white/[0.1] rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-gold/70 transition-colors tracking-wider"
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-[#d4a438] via-[#e5b84b] to-[#f0cb6e] hover:brightness-105 active:scale-[0.99] disabled:opacity-60 text-[#080a0f] font-bold text-sm transition-all duration-150 shadow-[0_6px_20px_rgba(229,184,75,0.22)] cursor-pointer flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#080a0f] border-t-transparent rounded-full animate-spin" />
                  {mode === 'register'
                    ? 'Criando conta...'
                    : mode === 'reset'
                    ? 'Enviando link...'
                    : 'Autenticando...'}
                </span>
              ) : mode === 'register' ? (
                'Criar Conta Segura'
              ) : mode === 'reset' ? (
                'Enviar Link de Redefinição'
              ) : (
                'Acessar Painel'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full flex items-center">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            <span className="px-3 text-[11px] font-medium text-zinc-500">ou continue com</span>
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleLogin}
            className="w-full h-11 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-gold/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-3 cursor-pointer text-sm font-medium text-zinc-100"
          >
            {isGoogleLoading ? (
              <span className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.94 0 3.68.67 5.05 1.98l3.77-3.77C18.54 1.12 15.54 0 12 0 7.31 0 3.25 2.69 1.27 6.61l4.39 3.41C6.71 6.89 9.14 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.17-2 3.71-4.95 3.71-8.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.66 14.02c-.23-.69-.36-1.43-.36-2.2 0-.77.13-1.51.36-2.2L1.27 6.21C.46 7.83 0 9.66 0 11.82s.46 3.99 1.27 5.61l4.39-3.41z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.71-2.88c-1.07.72-2.45 1.15-4.24 1.15-2.86 0-5.29-1.85-6.34-4.5l-4.39 3.41C3.25 21.31 7.31 24 12 24z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
          </button>

          <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
            <ShieldCheck size={13} className="text-emerald-400/80 shrink-0" />
            <span>Dados isolados e protegidos por Firebase Auth</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
