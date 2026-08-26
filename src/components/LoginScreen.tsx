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
  ShieldCheck, 
  HelpCircle,
  Sparkles
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

  const operatorName = settings.userName || 'EDIEIK BRENO';

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
    <div className="min-h-screen w-full bg-[#05070d] text-white flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans select-none">
      {/* Dynamic Luxury Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep starry & dark gradient atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060a14] via-[#04060c] to-[#020306]" />
        
        {/* Subtle starry particle backdrop */}
        <div 
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, rgba(255, 215, 0, 0.15) 0%, transparent 60%), radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 36px 36px'
          }}
        />

        {/* Ambient Golden Glows */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-amber-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[420px] h-[260px] bg-blue-900/10 rounded-full blur-[140px]" />

        {/* Floating Money / Luxury Atmosphere Elements */}
        <div className="absolute -top-10 left-[8%] w-24 h-16 rounded-lg bg-emerald-950/20 border border-emerald-500/10 rotate-12 blur-[1px] opacity-40 animate-pulse" />
        <div className="absolute top-[28%] -left-6 w-32 h-20 rounded-lg bg-emerald-950/20 border border-emerald-500/10 -rotate-12 blur-[2px] opacity-30" />
        <div className="absolute top-[18%] -right-8 w-36 h-20 rounded-lg bg-amber-950/20 border border-gold/10 rotate-45 blur-[2px] opacity-35" />
        <div className="absolute bottom-[22%] -right-4 w-28 h-16 rounded-lg bg-emerald-950/20 border border-emerald-500/10 -rotate-6 blur-[1px] opacity-30" />
        <div className="absolute bottom-[10%] -left-8 w-40 h-24 rounded-lg bg-amber-950/15 border border-gold/10 rotate-12 blur-[3px] opacity-25" />
        
        {/* Car Silhouette Light Vignette at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-[390px] mx-auto flex flex-col items-center z-10 my-auto">
        
        {/* Hexagonal Gold Logo */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-3 flex items-center justify-center cursor-pointer group"
          onClick={() => setShowSupportModal(true)}
        >
          {/* Hexagon Shape with SVG */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(255,215,0,0.35)]">
              {/* Outer Golden Border */}
              <polygon 
                points="50,3 93,26 93,74 50,97 7,74 7,26" 
                fill="#0f1118" 
                stroke="url(#goldGradient)" 
                strokeWidth="3.5"
              />
              {/* Inner Accent Line */}
              <polygon 
                points="50,9 87,29 87,71 50,91 13,71 13,29" 
                fill="#0b0d13" 
                stroke="rgba(255,215,0,0.3)" 
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF1A8" />
                  <stop offset="50%" stopColor="#E5B232" />
                  <stop offset="100%" stopColor="#996D14" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Monogram inside Hexagon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-br from-yellow-100 via-gold to-amber-600 bg-clip-text text-transparent drop-shadow-md">
                NC
              </span>
            </div>
          </div>
        </motion.div>

        {/* Brand Titles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center text-center mb-3"
        >
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Nexus Commerce
          </h1>
          <span className="text-[10px] text-[#E5B232] font-black uppercase tracking-[0.35em] mt-0.5">
            GESTÃO DE VENDAS
          </span>
        </motion.div>

        {/* Slogan Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-5 px-4 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md"
        >
          <span className="text-xs font-semibold text-zinc-300 italic">
            "Sem dinheiro, sem graça"
          </span>
        </motion.div>

        {/* Quick Switch Account Button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          type="button"
          onClick={handleQuickAccountLogin}
          className="w-full mb-6 py-2.5 px-4 rounded-xl bg-black/40 border border-[#E5B232]/50 hover:border-[#E5B232] hover:bg-gold/[0.05] active:scale-[0.99] backdrop-blur-md transition-all flex items-center justify-center gap-2 text-[#E5B232] text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(229,178,50,0.1)]"
        >
          <User size={15} className="text-[#E5B232]" />
          <span className="truncate">VOLTAR PARA CONTA DE {operatorName.toUpperCase()}</span>
        </motion.button>

        {/* Form Container */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSubmit}
          className="w-full space-y-4"
        >
          {/* E-mail Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block ml-1">
              E-MAIL
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@nexuscommerce.com"
                className="w-full h-12 bg-[#0d121f]/70 border border-white/10 rounded-xl pl-11 pr-4 text-sm font-medium text-white placeholder:text-zinc-500 outline-none focus:border-[#E5B232] focus:bg-[#0d121f]/90 transition-all backdrop-blur-md"
              />
            </div>
          </div>

          {/* Senha Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                SENHA
              </label>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="text-[10px] font-semibold text-zinc-400 hover:text-[#E5B232] transition-colors cursor-pointer"
              >
                Esqueceu?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 bg-[#0d121f]/70 border border-white/10 rounded-xl pl-11 pr-11 text-sm font-medium text-white placeholder:text-zinc-500 outline-none focus:border-[#E5B232] focus:bg-[#0d121f]/90 transition-all tracking-widest backdrop-blur-md"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Primary Action Button: ENTRAR */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-[#b3861b] via-[#e5b232] to-[#c9941a] hover:from-[#c9941a] hover:to-[#e5b232] active:scale-[0.99] text-white font-extrabold uppercase text-sm tracking-[0.2em] transition-all duration-200 shadow-[0_4px_25px_rgba(229,178,50,0.3)] hover:shadow-[0_4px_30px_rgba(229,178,50,0.45)] cursor-pointer flex items-center justify-center drop-shadow-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ACESSANDO...
              </span>
            ) : (
              'ENTRAR'
            )}
          </button>
        </motion.form>

        {/* Divider: OU BIOMETRIA */}
        <div className="w-full flex items-center my-6">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span className="px-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em]">
            OU BIOMETRIA
          </span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        {/* Biometrics Card Button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          type="button"
          onClick={handleFaceIdLogin}
          className="w-full p-3.5 rounded-2xl bg-black/45 hover:bg-black/65 border border-white/10 hover:border-[#E5B232]/40 active:scale-[0.99] backdrop-blur-xl transition-all flex items-center gap-3.5 cursor-pointer text-left group shadow-lg"
        >
          {/* Face ID Icon Container */}
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-[#E5B232]/30 group-hover:border-[#E5B232] flex items-center justify-center text-[#E5B232] transition-colors shrink-0 shadow-inner">
            <Scan size={22} className="stroke-[1.75]" />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-[#E5B232] transition-colors">
              ENTRAR COM FACE ID
            </span>
            <span className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">
              BIOMETRIA DO IPHONE / DISPOSITIVO
            </span>
          </div>
        </motion.button>
      </div>

      {/* Face ID Scanning Animated Overlay */}
      <AnimatePresence>
        {isFaceIdScanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="w-full max-w-xs bg-[#0b0e17] border border-[#E5B232]/40 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(229,178,50,0.25)] relative overflow-hidden"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E5B232] to-transparent" />

              <div className="relative w-20 h-20 rounded-2xl bg-white/[0.04] border border-[#E5B232]/40 flex items-center justify-center text-[#E5B232] mb-5">
                {faceIdSuccess ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400">
                    <CheckCircle2 size={42} />
                  </motion.div>
                ) : (
                  <>
                    <Scan size={40} className="animate-pulse stroke-[1.5]" />
                    <motion.div 
                      className="absolute inset-x-2 h-0.5 bg-[#E5B232] shadow-[0_0_8px_#E5B232]"
                      animate={{ top: ['15%', '80%', '15%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    />
                  </>
                )}
              </div>

              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {faceIdSuccess ? 'Face ID Reconhecido' : 'Autenticando Face ID'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                {faceIdSuccess ? `Bem-vindo, ${operatorName}!` : 'Olhe para a câmera do dispositivo...'}
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
              className="w-full max-w-sm bg-[#0e111a] border border-white/10 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="w-10 h-10 rounded-xl bg-gold-soft border border-gold/30 text-gold flex items-center justify-center mb-3">
                <HelpCircle size={20} />
              </div>

              <h3 className="text-base font-black text-white">Suporte & Acesso</h3>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                Para redefinir a senha de operador ou configurar dados da conta, você pode preencher os dados cadastrados ou entrar com a conta rápida.
              </p>

              {settings.userEmail && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-300">
                  <span className="text-zinc-500 block text-[9px] font-bold uppercase">E-mail Cadastrado:</span>
                  <span className="font-bold truncate block mt-0.5">{settings.userEmail}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (settings.userEmail) setEmail(settings.userEmail);
                  setShowSupportModal(false);
                }}
                className="w-full h-10 mt-5 rounded-xl bg-gradient-to-r from-gold to-yellow-500 text-black font-black uppercase text-[10px] tracking-wider hover:opacity-95 transition-all cursor-pointer"
              >
                Preencher Meu E-mail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
