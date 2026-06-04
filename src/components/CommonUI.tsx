import { Settings as SettingsIcon, Menu, Wallet, ShoppingBag, Boxes, User, Activity, AlertCircle, Calendar, TrendingUp, DollarSign, ShieldCheck } from 'lucide-react';
import { Product, Sale, Installment } from '../types';

export function Logo({ className = "", showText = true }: { className?: string, showText?: boolean }) {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className} overflow-hidden`}>
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center text-black font-black text-lg sm:text-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] shrink-0 transition-transform hover:rotate-12">
        NC
      </div>
      {showText && (
        <div className="flex flex-col">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-widest leading-none shrink-0 uppercase">NEXUS <span className="text-white/60">COMMERCE</span></h2>
          <span className="text-[8px] sm:text-[10px] text-gold font-bold uppercase tracking-[0.3em] mt-1 shrink-0">GESTÃO DE VENDAS</span>
        </div>
      )}
    </div>
  );
}

export function Topbar({ onOpenSettings, onOpenMobileMenu, onToggleDesktopSidebar, desktopSidebarOpen, viewTitle }: { 
  onOpenSettings: () => void; 
  onOpenMobileMenu: () => void;
  onToggleDesktopSidebar: () => void;
  desktopSidebarOpen: boolean;
  viewTitle: string;
}) {
  return (
    <header className="h-16 sm:h-20 bg-black/80 backdrop-blur-md border-b border-line-strong px-4 sm:px-10 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
        {/* Mobile menu button */}
        <button onClick={onOpenMobileMenu} className="sm:hidden w-10 h-10 rounded-xl border border-line flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
          <Menu size={20} />
        </button>

        {/* Desktop toggle button to fully hide/show sidebar */}
        <button 
          onClick={onToggleDesktopSidebar} 
          className="hidden sm:flex w-10 h-10 rounded-xl border border-line-strong bg-card items-center justify-center text-gray-400 hover:text-gold hover:border-gold/30 transition-all active:scale-90"
          title={desktopSidebarOpen ? "Ocultar Menu Lateral" : "Exibir Menu Lateral"}
        >
          <Menu size={20} />
        </button>

        <h2 className="text-sm sm:text-lg font-black text-white italic uppercase tracking-tight truncate">{viewTitle}</h2>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSettings}
          className="w-10 h-10 bg-card border border-line rounded-xl flex items-center justify-center text-gray-400 hover:text-gold hover:border-gold/30 transition-all group active:scale-90"
        >
          <SettingsIcon size={20} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>
    </header>
  );
}

export function DashboardStats({ products, sales, installments, closings = [], onNavigate }: { products: any[], sales: any[], installments: any[], closings?: any[], onNavigate: (view: string, filter?: string) => void }) {
  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastClosingDate = closings.length > 0 
    ? closings.reduce((latest, c) => c.closedAt > latest ? c.closedAt : latest, '')
    : '';

  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const monthlyDownPayments = sales
    .filter(s => isCurrentMonth(s.createdAt))
    .reduce((acc, s) => acc + (s.downPayment || 0), 0);

  const monthlyPaidInstallments = installments
    .filter(i => i.status === 'Pago' && isCurrentMonth(i.paidAt || i.dueDate))
    .reduce((acc, i) => acc + (i.value || 0), 0);

  const currentProfit = monthlyDownPayments + monthlyPaidInstallments;
  const receivablesValue = installments.filter(i => i.status === 'Pendente').reduce((acc, i) => acc + i.value, 0);

  // Health Rate (Credit / Adimplência Index)
  const paidCount = installments.filter(i => i.status === 'Pago').length;
  const overdueCount = installments.filter(i => {
    if (i.status !== 'Pendente') return false;
    const dueDate = new Date(i.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  const totalRelevantPoints = paidCount + overdueCount;
  const healthRate = totalRelevantPoints > 0 ? (paidCount / totalRelevantPoints) * 100 : 100;

  // Due today count
  const dueTodayCount = installments.filter(i => {
    if (i.status !== 'Pendente') return false;
    const dueDate = new Date(i.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }).length;

  // SVG Sparkline path helper
  const getSalesTrendPoints = (): number[] => {
    const sorted = [...sales]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sorted.length < 3) {
      return [300, 420, 310, 580, 490, 720, 610, 890]; // Elegant modern mock-wave
    }
    return sorted.slice(-10).map(s => s.total);
  };

  const getReceivablesTrendPoints = (): number[] => {
    const sortedPending = [...installments]
      .filter(i => i.status === 'Pendente')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (sortedPending.length < 3) {
      return [150, 240, 180, 310, 260, 420, 380, 510]; // Fluid modern progression mock-wave
    }
    return sortedPending.slice(0, 10).map(i => i.value);
  };

  const drawSparkline = (points: number[], width = 140, height = 36) => {
    if (points.length < 2) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    return points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 8) - 4;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const drawSparklineArea = (points: number[], width = 140, height = 36) => {
    const linePath = drawSparkline(points, width, height);
    if (!linePath) return "";
    return `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
  };

  // Circle progress math for adimplência gauge
  const gaugeRadius = 14;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (healthRate / 100) * gaugeCircumference;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 px-1">
      
      {/* Bento Card 1: Valores a Receber */}
      <div 
        onClick={() => onNavigate('sales')}
        className="glass-card group p-5 sm:p-6 flex flex-col justify-between border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden cursor-pointer active:scale-95 min-h-[160px]"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-blue-500" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/40 transition-all duration-500">
            <TrendingUp size={20} className="text-blue-400 group-hover:scale-110 transition-transform duration-500" />
          </div>
          
          {/* Glowing mini path */}
          <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
            <svg width="100" height="28" viewBox="0 0 100 28" className="overflow-visible">
              <defs>
                <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d={drawSparklineArea(getReceivablesTrendPoints(), 100, 28)} 
                fill="url(#blue-grad)" 
              />
              <path 
                d={drawSparkline(getReceivablesTrendPoints(), 100, 28)} 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 block text-white/40">Valores a Receber</span>
          <strong className="text-2xl sm:text-3xl font-black block text-blue-400 group-hover:text-blue-300 transition-colors duration-500">
            {money(receivablesValue)}
          </strong>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Total Pendente Futuro</p>
          </div>
        </div>
      </div>

      {/* Bento Card 2: Faturamento Realizado (Recebido no Mês) */}
      <div 
        onClick={() => onNavigate('reports')}
        className="glass-card group p-5 sm:p-6 flex flex-col justify-between border border-white/5 hover:border-gold/30 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden cursor-pointer active:scale-95 min-h-[160px]"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-gold" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20 group-hover:border-gold/40 transition-all duration-500">
            <DollarSign size={20} className="text-gold group-hover:scale-110 transition-transform duration-500" />
          </div>
          
          {/* Glowing mini path */}
          <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
            <svg width="100" height="28" viewBox="0 0 100 28" className="overflow-visible">
              <defs>
                <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd700" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d={drawSparklineArea(getSalesTrendPoints(), 100, 28)} 
                fill="url(#gold-grad)" 
              />
              <path 
                d={drawSparkline(getSalesTrendPoints(), 100, 28)} 
                fill="none" 
                stroke="#ffd700" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 block text-white/40">Faturamento Realizado</span>
          <strong className="text-2xl sm:text-3xl font-black block text-gold group-hover:text-amber-300 transition-colors duration-500">
            {money(currentProfit)}
          </strong>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_#ffd700]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Total Recebido no Mês</p>
          </div>
        </div>
      </div>

      {/* Bento Card 3: Índice de Adimplência (Credit Health) */}
      <div 
        onClick={() => onNavigate('sales')}
        className="glass-card group p-5 sm:p-6 flex flex-col justify-between border border-white/5 hover:border-green-neon/30 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden cursor-pointer active:scale-95 min-h-[160px]"
      >
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-green-neon" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#39ff14]/10 border border-[#39ff14]/20 group-hover:border-[#39ff14]/40 transition-all duration-500">
            <Activity size={20} className="text-green-neon group-hover:scale-110 transition-transform duration-500" />
          </div>
          
          {/* Gauge Widget */}
          <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
            <svg className="w-12 h-12" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r={gaugeRadius} className="stroke-zinc-900 fill-none" strokeWidth="3" />
              <circle 
                cx="18" 
                cy="18" 
                r={gaugeRadius} 
                className="stroke-green-neon fill-none transition-all duration-1000 ease-out" 
                strokeWidth="3"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <span className="absolute text-[8px] font-black text-green-neon">{Math.round(healthRate)}%</span>
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 block text-white/40">Índice de Adimplência</span>
          <strong className="text-2xl sm:text-3xl font-black block text-green-neon">
            {healthRate.toFixed(1)}%
          </strong>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-neon shadow-[0_0_8px_#39FF14]" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 truncate">
              {overdueCount === 0 ? "Sem faturas atrasadas" : `${overdueCount} parcelas em risco`}
            </p>
          </div>
        </div>
      </div>

      {/* Container dos dois cards menores: Vencem Hoje e Atrasados */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-1 grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Vencem Hoje */}
        <div 
          onClick={() => onNavigate('sales', 'Hoje')}
          className={`glass-card group p-4 sm:p-5 flex flex-col justify-between border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden cursor-pointer active:scale-95 min-h-[160px] ${
            dueTodayCount > 0 
              ? 'border-purple-500/20 hover:border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
              : 'border-white/5 hover:border-emerald-500/30'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-purple-500" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all duration-500 ${
              dueTodayCount > 0 
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' 
                : 'bg-zinc-800/50 border border-zinc-700/30 text-zinc-500'
            }`}>
              <Calendar size={14} className={dueTodayCount > 0 ? "animate-bounce" : ""} />
            </div>
            
            <div>
              {dueTodayCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">Hoje</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-zinc-800/40 text-zinc-500 border border-zinc-750">Ok</span>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-2">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 block text-white/40">Vencem hoje</span>
            <strong className="text-base sm:text-lg font-black block text-zinc-100 group-hover:text-white transition-colors duration-500 leading-tight">
              {dueTodayCount} {dueTodayCount === 1 ? 'parcela' : 'parcelas'}
            </strong>
            <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mt-1 truncate">
              {dueTodayCount > 0 ? "Receber hoje" : "Sem vencimentos"}
            </p>
          </div>
        </div>

        {/* Card 2: Atrasados */}
        <div 
          onClick={() => onNavigate('sales', 'Atrasados')}
          className={`glass-card group p-4 sm:p-5 flex flex-col justify-between border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden cursor-pointer active:scale-95 min-h-[160px] ${
            overdueCount > 0 
              ? 'border-red-500/20 hover:border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
              : 'border-white/5 hover:border-emerald-500/30'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-red-500" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all duration-500 ${
              overdueCount > 0 
                ? 'bg-red-500/10 border border-red-500/20 text-red-500' 
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              {overdueCount > 0 ? (
                <AlertCircle size={14} className="animate-pulse" />
              ) : (
                <ShieldCheck size={14} />
              )}
            </div>
            
            <div>
              {overdueCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 animate-pulse border border-red-500/30">Risco</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Zero</span>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-2">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 block text-white/40">Atrasados</span>
            <strong className="text-base sm:text-lg font-black block text-zinc-100 group-hover:text-white transition-colors duration-500 leading-tight">
              {overdueCount} {overdueCount === 1 ? 'pendente' : 'pendentes'}
            </strong>
            <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mt-1 truncate">
              {overdueCount > 0 ? "Requer atenção" : "Nenhum atraso"}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
