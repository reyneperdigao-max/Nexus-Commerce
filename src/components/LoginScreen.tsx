import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  User, 
  Scan, 
  CheckCircle2, 
  X, 
  HelpCircle
} from 'lucide-react';
import { Settings } from '../types';

interface LoginScreenProps {
  onLogin: () => void;
  settings: Settings;
}

export function LoginScreen({ onLogin, settings }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFaceIdScanning, setIsFaceIdScanning] = useState(false);
  const [faceIdSuccess, setFaceIdSuccess] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const operatorName = settings.userName || 'Operador';

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('nexus_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
      } else if (settings.userEmail) {
        setEmail(settings.userEmail);
      } else {
        setEmail('email@nexuscommerce.com');
      }
    } catch {
      // Ignora erro
    }
  }, [settings.userEmail]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    if (email) {
      try {
        localStorage.setItem('nexus_saved_email', email);
      } catch {}
    }

    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 400);
  };

  const handleQuickAccountLogin = () => {
    if (settings.userEmail) {
      setEmail(settings.userEmail);
    }
    handleSubmit();
  };

  const handleFaceIdLogin = () => {
    setIsFaceIdScanning(true);
    setFaceIdSuccess(false);

    setTimeout(() => {
      setFaceIdSuccess(true);
      setTimeout(() => {
        setIsFaceIdScanning(false);
        onLogin();
      }, 700);
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-[#080a0f] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans select-none">
      {/* Subtle Architectural Backdrop */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(ellipse 65% 45% at 50% 15%, rgba(229, 184, 75, 0.1) 0%, transparent 65%), radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 32px 32px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080a0f]/40 to-[#080a0f]" />
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-[400px] mx-auto flex flex-col items-center z-10">
        
        {/* Hexagonal Gold Emblem */}
        <motion.button 
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-4 flex items-center justify-center cursor-pointer group focus:outline-none"
          onClick={() => setShowSupportModal(true)}
          title="Suporte e acesso"
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
        </motion.button>

        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex flex-col items-center text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Nexus Commerce
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão Comercial &amp; Controle de Recebíveis
          </p>
        </motion.div>

        {/* Elevated Executive Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="w-full glass-card p-6 sm:p-7 space-y-5"
        >
          {/* Quick Switch Account Button */}
          <button
            type="button"
            onClick={handleQuickAccountLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-gold/[0.08] border border-gold/30 hover:border-gold/55 hover:bg-gold/[0.14] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-gold text-xs font-semibold cursor-pointer"
          >
            <User size={15} />
            <span className="truncate">Continuar como {operatorName}</span>
          </button>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* E-mail Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@nexuscommerce.com"
                  className="w-full h-11 bg-[#080a0f]/80 border border-white/[0.1] rounded-xl pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-gold/70 transition-colors"
                />
              </div>
            </div>

            {/* Senha Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300 block">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-xs font-medium text-zinc-400 hover:text-gold transition-colors cursor-pointer"
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
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

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-1 rounded-xl bg-gradient-to-r from-[#d4a438] via-[#e5b84b] to-[#f0cb6e] hover:brightness-105 active:scale-[0.99] text-[#080a0f] font-bold text-sm transition-all duration-150 shadow-[0_6px_20px_rgba(229,184,75,0.22)] cursor-pointer flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#080a0f] border-t-transparent rounded-full animate-spin" />
                  Acessando...
                </span>
              ) : (
                'Acessar Painel'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full flex items-center">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            <span className="px-3 text-[11px] font-medium text-zinc-500">
              ou biometria
            </span>
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Biometrics Card Button */}
          <button
            type="button"
            onClick={handleFaceIdLogin}
            className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-gold/35 active:scale-[0.99] transition-all flex items-center gap-3.5 cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
              <Scan size={19} className="stroke-[1.75]" />
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-100 group-hover:text-gold transition-colors">
                Entrar com Face ID
              </span>
              <span className="text-[11px] text-zinc-500 truncate">
                Autenticação biométrica do dispositivo
              </span>
            </div>
          </button>
        </motion.div>
      </div>

      {/* Face ID Scanning Overlay */}
      <AnimatePresence>
        {isFaceIdScanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-xs bg-[#0e121b] border border-gold/35 rounded-2xl p-7 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

              <div className="relative w-18 h-18 rounded-2xl bg-white/[0.04] border border-gold/35 flex items-center justify-center text-gold mb-4">
                {faceIdSuccess ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400">
                    <CheckCircle2 size={38} />
                  </motion.div>
                ) : (
                  <>
                    <Scan size={36} className="stroke-[1.5]" />
                    <motion.div 
                      className="absolute inset-x-2 h-0.5 bg-gold shadow-[0_0_8px_#e5b84b]"
                      animate={{ top: ['15%', '80%', '15%'] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    />
                  </>
                )}
              </div>

              <h3 className="text-sm font-semibold text-white">
                {faceIdSuccess ? 'Face ID Reconhecido' : 'Autenticando Face ID'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {faceIdSuccess ? `Bem-vindo, ${operatorName}` : 'Olhe para a câmera do dispositivo...'}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support / Help Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0e121b] border border-white/[0.1] rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>

              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center mb-3">
                <HelpCircle size={20} />
              </div>

              <h3 className="text-base font-bold text-white">Suporte e Acesso</h3>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                Para redefinir a senha de operador ou configurar dados da conta, preencha os dados cadastrados ou utilize o acesso rápido.
              </p>

              {settings.userEmail && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-300">
                  <span className="text-zinc-500 block text-[10px] font-medium">E-mail cadastrado</span>
                  <span className="font-semibold truncate block mt-0.5">{settings.userEmail}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (settings.userEmail) setEmail(settings.userEmail);
                  setShowSupportModal(false);
                }}
                className="w-full h-10 mt-5 rounded-xl bg-gradient-to-r from-[#d4a438] to-[#e5b84b] text-[#080a0f] font-bold text-xs hover:brightness-105 transition-all cursor-pointer"
              >
                Preencher meu e-mail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
