import { Settings as SettingsIcon, Menu, Activity, AlertCircle, Calendar, TrendingUp, DollarSign, ShieldCheck, Eye, EyeOff, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { isSameMonthAndYear, parseDateToMidnight } from '../lib/dateUtils';

export function Logo({ className = "", showText = true }: { className?: string, showText?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className} overflow-hidden`}>
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#f3cf7a] via-[#e5b84b] to-[#b88924] flex items-center justify-center text-[#080a0f] font-extrabold text-sm sm:text-base shadow-[0_4px_16px_rgba(229,184,75,0.22)] border border-white/20 shrink-0">
        NC
      </div>
      {showText && (
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-tight shrink-0 whitespace-nowrap">
            Nexus <span className="text-zinc-400 font-semibold">Commerce</span>
          </h2>
          <span className="text-[10px] text-gold/85 font-medium tracking-wide shrink-0 whitespace-nowrap mt-0.5">
            Gestão Comercial
          </span>
        </div>
      )}
    </div>
  );
}

export function Topbar({ 
  onOpenSettings, 
  onOpenMobileMenu, 
  onToggleDesktopSidebar, 
  desktopSidebarOpen, 
  viewTitle,
  hideDashboardValues = false,
  onToggleHideDashboardValues
}: { 
  onOpenSettings: () => void; 
  onOpenMobileMenu: () => void;
  onToggleDesktopSidebar: () => void;
  desktopSidebarOpen: boolean;
  viewTitle: string;
  hideDashboardValues?: boolean;
  onToggleHideDashboardValues?: () => void;
}) {
  return (
    <header className="h-16 bg-[#080a0f]/85 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu button */}
        <button 
          type="button"
          onClick={onOpenMobileMenu} 
          className="sm:hidden w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        {/* Desktop toggle button to hide/show sidebar */}
        <button 
          type="button"
          onClick={onToggleDesktopSidebar} 
          className="hidden sm:flex w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-white/[0.15] transition-all cursor-pointer shrink-0"
          title={desktopSidebarOpen ? "Ocultar Menu Lateral" : "Exibir Menu Lateral"}
          aria-label={desktopSidebarOpen ? "Ocultar Menu Lateral" : "Exibir Menu Lateral"}
        >
          {desktopSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden md:inline text-zinc-500 font-medium whitespace-nowrap">Nexus Commerce</span>
          <span className="hidden md:inline text-zinc-600" aria-hidden="true">/</span>
          <h2 className="text-sm sm:text-[15px] font-semibold text-zinc-100 tracking-tight truncate">
            {viewTitle}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onToggleHideDashboardValues && (
          <button 
            type="button"
            onClick={onToggleHideDashboardValues}
            className={`h-9 px-2.5 sm:px-3 border rounded-lg flex items-center gap-2 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              hideDashboardValues 
                ? 'bg-gold/15 border-gold/35 text-gold' 
                : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.06] text-zinc-300 hover:text-white'
            }`}
            title={hideDashboardValues ? "Exibir valores financeiros" : "Ocultar valores financeiros"}
            aria-label={hideDashboardValues ? "Exibir valores financeiros" : "Ocultar valores financeiros"}
          >
            {hideDashboardValues ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="hidden md:inline">{hideDashboardValues ? 'Valores ocultos' : 'Privacidade'}</span>
          </button>
        )}

        <button 
          type="button"
          onClick={onOpenSettings}
          className="w-9 h-9 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.06] rounded-lg flex items-center justify-center text-zinc-300 hover:text-gold transition-all group cursor-pointer"
          title="Configurações do Sistema"
          aria-label="Configurações do Sistema"
        >
          <SettingsIcon size={16} className="group-hover:rotate-45 transition-transform duration-300" />
        </button>
      </div>
    </header>
  );
}

export function DashboardStats({ 
  sales, 
  installments, 
  closings = [], 
  onNavigate,
  hideValues = false
}: { 
  products: any[], 
  sales: any[], 
  installments: any[], 
  closings?: any[], 
  onNavigate: (view: string, filter?: string) => void,
  hideValues?: boolean
}) {
  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const displayMoney = (val: number) => hideValues ? 'R$ ••••••' : money(val);
  const displayCount = (count: number, singular: string, plural: string) => hideValues ? `•• ${plural}` : `${count} ${count === 1 ? singular : plural}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastClosingDate = closings.length > 0 
    ? closings.reduce((latest, c) => c.closedAt > latest ? c.closedAt : latest, '')
    : '';

  const isAfterLastClosing = (dateStr?: string) => {
    if (!lastClosingDate) return true;
    if (!dateStr) return false;
    const itemTime = parseDateToMidnight(dateStr).getTime();
    const closingTime = new Date(lastClosingDate).getTime();
    if (isNaN(itemTime) || isNaN(closingTime)) return false;
    return itemTime > closingTime;
  };

  // Filtra apenas parcelas vinculadas a contratos/vendas válidas que não foram excluídas
  const validSaleIds = new Set(sales.map(s => s.id));
  const validInstallments = installments.filter(i => validSaleIds.has(i.saleId));

  const monthlyDownPayments = sales
    .filter(s => isSameMonthAndYear(s.createdAt || s.date) && isAfterLastClosing(s.createdAt || s.date))
    .reduce((acc, s) => acc + (Number(s.downPayment) || 0), 0);

  const monthlyPaidInstallments = validInstallments
    .filter(i => i.status === 'Pago' && isSameMonthAndYear(i.paidAt || i.dueDate) && isAfterLastClosing(i.paidAt || i.dueDate))
    .reduce((acc, i) => acc + (Number(i.value) || 0), 0);

  const currentProfit = Number((monthlyDownPayments + monthlyPaidInstallments).toFixed(2));
  const receivablesValue = Number(validInstallments.filter(i => i.status === 'Pendente').reduce((acc, i) => acc + (Number(i.value) || 0), 0).toFixed(2));

  // Health Rate (Credit / Adimplência Index)
  const paidCount = validInstallments.filter(i => i.status === 'Pago').length;
  const overdueCount = validInstallments.filter(i => {
    if (i.status !== 'Pendente') return false;
    const dueDate = parseDateToMidnight(i.dueDate);
    return dueDate.getTime() < today.getTime();
  }).length;

  const totalRelevantPoints = paidCount + overdueCount;
  const healthRate = totalRelevantPoints > 0 ? Number(((paidCount / totalRelevantPoints) * 100).toFixed(1)) : 100;

  // Due today count
  const dueTodayCount = validInstallments.filter(i => {
    if (i.status !== 'Pendente') return false;
    const dueDate = parseDateToMidnight(i.dueDate);
    return dueDate.getTime() === today.getTime();
  }).length;

  // SVG Sparkline path helper
  const getSalesTrendPoints = (): number[] => {
    if (currentProfit === 0) {
      return [0, 0, 0, 0, 0];
    }
    const cycleSales = sales.filter(s => isAfterLastClosing(s.createdAt || s.date));
    const sorted = [...cycleSales]
      .sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());
    if (sorted.length < 3) {
      return [currentProfit * 0.3, currentProfit * 0.6, currentProfit * 0.8, currentProfit];
    }
    return sorted.slice(-10).map(s => Number(s.total) || 0);
  };

  const getReceivablesTrendPoints = (): number[] => {
    const sortedPending = [...validInstallments]
      .filter(i => i.status === 'Pendente')
      .sort((a, b) => parseDateToMidnight(a.dueDate).getTime() - parseDateToMidnight(b.dueDate).getTime());
    if (sortedPending.length < 3) {
      return [150, 240, 180, 310, 260, 420, 380, 510];
    }
    return sortedPending.slice(0, 10).map(i => Number(i.value) || 0);
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

  const gaugeRadius = 14;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (healthRate / 100) * gaugeCircumference;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {/* KPI Card 1: Valores a Receber */}
      <button 
        type="button"
        onClick={() => onNavigate('sales')}
        className="glass-card group p-5 sm:p-6 flex flex-col justify-between text-left hover:bg-[#131825] hover:border-blue-400/35 transition-colors duration-200 cursor-pointer min-h-[156px]"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <TrendingUp size={18} />
          </div>
          
          <div className={`opacity-75 group-hover:opacity-100 transition-opacity duration-200 ${hideValues ? 'blur-sm opacity-20 pointer-events-none' : ''}`}>
            <svg width="96" height="28" viewBox="0 0 100 28" className="overflow-visible">
              <defs>
                <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={drawSparklineArea(getReceivablesTrendPoints(), 100, 28)} fill="url(#blue-grad)" />
              <path d={drawSparkline(getReceivablesTrendPoints(), 100, 28)} fill="none" stroke="#60a5fa" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="mt-4 w-full">
          <span className="text-[11px] font-medium text-zinc-400 block">Valores a receber</span>
          <strong className="text-2xl sm:text-[26px] font-bold block text-white tracking-tight tabular-figure mt-0.5">
            {displayMoney(receivablesValue)}
          </strong>
          <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
            Carteira ativa · Total pendente futuro
          </p>
        </div>
      </button>

      {/* KPI Card 2: Faturamento Realizado */}
      <button 
        type="button"
        onClick={() => onNavigate('reports')}
        className="glass-card group p-5 sm:p-6 flex flex-col justify-between text-left hover:bg-[#131825] hover:border-gold/35 transition-colors duration-200 cursor-pointer min-h-[156px]"
        title="Clique para acessar os Relatórios Mensais"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/25 text-gold">
            <DollarSign size={18} />
          </div>
          
          <div className={`opacity-75 group-hover:opacity-100 transition-opacity duration-200 ${hideValues ? 'blur-sm opacity-20 pointer-events-none' : ''}`}>
            <svg width="96" height="28" viewBox="0 0 100 28" className="overflow-visible">
              <defs>
                <linearGradient id="gold-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e5b84b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#e5b84b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={drawSparklineArea(getSalesTrendPoints(), 100, 28)} fill="url(#gold-grad)" />
              <path d={drawSparkline(getSalesTrendPoints(), 100, 28)} fill="none" stroke="#e5b84b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="mt-4 w-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400">Faturamento realizado</span>
            {lastClosingDate && (
              <span className="text-[10px] font-semibold text-gold/90">Ciclo aberto</span>
            )}
          </div>
          <strong className="text-2xl sm:text-[26px] font-bold block text-gold tracking-tight tabular-figure mt-0.5">
            {displayMoney(currentProfit)}
          </strong>
          <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
            {currentProfit === 0 && lastClosingDate ? 'Caixa zerado pós-fechamento' : 'Total recebido no mês'}
          </p>
        </div>
      </button>

      {/* KPI Card 3: Índice de Adimplência */}
      <button 
        type="button"
        onClick={() => onNavigate('sales')}
        className="glass-card group p-5 sm:p-6 flex flex-col justify-between text-left hover:bg-[#131825] hover:border-emerald-400/35 transition-colors duration-200 cursor-pointer min-h-[156px]"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity size={18} />
          </div>
          
          <div className={`relative flex items-center justify-center w-10 h-10 shrink-0 ${hideValues ? 'blur-sm opacity-20' : ''}`}>
            <svg className="w-11 h-11" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r={gaugeRadius} className="stroke-white/[0.08] fill-none" strokeWidth="2.8" />
              <circle 
                cx="18" 
                cy="18" 
                r={gaugeRadius} 
                className="stroke-emerald-400 fill-none transition-all duration-700 ease-out" 
                strokeWidth="2.8"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <span className="absolute text-[9px] font-bold text-emerald-400 tabular-figure">{Math.round(healthRate)}%</span>
          </div>
        </div>

        <div className="mt-4 w-full">
          <span className="text-[11px] font-medium text-zinc-400 block">Índice de adimplência</span>
          <strong className="text-2xl sm:text-[26px] font-bold block text-emerald-400 tracking-tight tabular-figure mt-0.5">
            {hideValues ? '•••%' : `${healthRate.toFixed(1)}%`}
          </strong>
          <p className="text-[11px] text-zinc-500 mt-1.5 truncate">
            {overdueCount === 0 ? "Carteira saudável · Sem atrasos" : `${overdueCount} parcelas em atraso`}
          </p>
        </div>
      </button>

      {/* Container dos dois cards menores: Vencem Hoje e Atrasados */}
      <div className="col-span-1 sm:col-span-2 xl:col-span-1 grid grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Vencem Hoje */}
        <button 
          type="button"
          onClick={() => onNavigate('sales', 'Hoje')}
          className={`glass-card group p-4 sm:p-5 flex flex-col justify-between text-left transition-colors duration-200 cursor-pointer min-h-[156px] ${
            dueTodayCount > 0 
              ? 'border-purple-400/25 hover:border-purple-400/45 hover:bg-[#131825]'
              : 'hover:border-white/[0.16] hover:bg-[#131825]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              dueTodayCount > 0 
                ? 'bg-purple-500/12 border border-purple-500/25 text-purple-300' 
                : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400'
            }`}>
              <Calendar size={15} />
            </div>
            
            <span className={`text-[10px] font-semibold ${dueTodayCount > 0 ? 'text-purple-300' : 'text-zinc-500'}`}>
              {dueTodayCount > 0 ? 'Hoje' : 'Em dia'}
            </span>
          </div>

          <div className="mt-3 w-full">
            <span className="text-[11px] font-medium text-zinc-400 block">Vencem hoje</span>
            <strong className="text-lg sm:text-xl font-bold block text-zinc-100 tabular-figure leading-snug mt-0.5">
              {displayCount(dueTodayCount, 'parcela', 'parcelas')}
            </strong>
            <p className="text-[11px] text-zinc-500 mt-1 truncate">
              {dueTodayCount > 0 ? "Receber hoje" : "Sem vencimentos"}
            </p>
          </div>
        </button>

        {/* Card 2: Atrasados */}
        <button 
          type="button"
          onClick={() => onNavigate('sales', 'Atrasados')}
          className={`glass-card group p-4 sm:p-5 flex flex-col justify-between text-left transition-colors duration-200 cursor-pointer min-h-[156px] ${
            overdueCount > 0 
              ? 'border-red-500/30 hover:border-red-500/50 hover:bg-[#131825]'
              : 'hover:border-emerald-400/35 hover:bg-[#131825]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              overdueCount > 0 
                ? 'bg-red-500/12 border border-red-500/25 text-red-400' 
                : 'bg-emerald-500/12 border border-emerald-500/25 text-emerald-400'
            }`}>
              {overdueCount > 0 ? <AlertCircle size={15} /> : <ShieldCheck size={15} />}
            </div>
            
            <span className={`text-[10px] font-semibold ${overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {overdueCount > 0 ? 'Atenção' : 'Regular'}
            </span>
          </div>

          <div className="mt-3 w-full">
            <span className="text-[11px] font-medium text-zinc-400 block">Atrasados</span>
            <strong className="text-lg sm:text-xl font-bold block text-zinc-100 tabular-figure leading-snug mt-0.5">
              {displayCount(overdueCount, 'pendente', 'pendentes')}
            </strong>
            <p className="text-[11px] text-zinc-500 mt-1 truncate">
              {overdueCount > 0 ? "Requer cobrança" : "Nenhum atraso"}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
