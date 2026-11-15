import {
  Settings as SettingsIcon,
  Menu,
  Activity,
  AlertCircle,
  Calendar,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  Plus,
  Layers,
} from 'lucide-react';
import { isSameMonthAndYear, parseDateToMidnight } from '../lib/dateUtils';
import { calculateSaleInvestment } from '../lib/investmentUtils';
import { Product, Sale, Installment, Closing } from '../types';

export function Logo({ className = '', showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className} overflow-hidden`}>
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_14px_rgba(243,186,47,0.22)]">
          <polygon
            points="50,3 93,26 93,74 50,97 7,74 7,26"
            fill="#0d111a"
            stroke="url(#ncHeaderGold)"
            strokeWidth="4"
          />
          <defs>
            <linearGradient id="ncHeaderGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f3ba2f" />
              <stop offset="100%" stopColor="#b48112" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute text-xs sm:text-[13px] font-extrabold tracking-tight text-gold">
          NC
        </span>
      </div>
      {showText && (
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-tight shrink-0 whitespace-nowrap">
            Nexus <span className="text-zinc-400 font-semibold">Commerce</span>
          </h2>
          <span className="text-[10px] text-gold/85 font-medium tracking-wide shrink-0 whitespace-nowrap mt-0.5">
            Gestão Financeira
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
  onToggleHideDashboardValues,
  onQuickNewSale,
}: {
  onOpenSettings: () => void;
  onOpenMobileMenu: () => void;
  onToggleDesktopSidebar: () => void;
  desktopSidebarOpen: boolean;
  viewTitle: string;
  hideDashboardValues?: boolean;
  onToggleHideDashboardValues?: () => void;
  onQuickNewSale?: () => void;
}) {
  return (
    <header className="h-14 sm:h-16 bg-[#07090e]/85 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="sm:hidden w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          className="hidden sm:flex w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-white/[0.15] transition-all cursor-pointer shrink-0"
          title={desktopSidebarOpen ? 'Recolher Menu Lateral' : 'Exibir Menu Lateral'}
          aria-label={desktopSidebarOpen ? 'Recolher Menu Lateral' : 'Exibir Menu Lateral'}
        >
          {desktopSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden lg:inline text-zinc-500 font-medium whitespace-nowrap">Nexus Commerce</span>
          <span className="hidden lg:inline text-zinc-600" aria-hidden="true">
            /
          </span>
          <h2 className="text-sm sm:text-[15px] font-semibold text-zinc-100 tracking-tight truncate">
            {viewTitle}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {onQuickNewSale && (
          <button
            type="button"
            onClick={onQuickNewSale}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-gold text-[#07090e] hover:brightness-110 font-bold text-xs tracking-tight transition-all cursor-pointer whitespace-nowrap shadow-[0_4px_14px_rgba(243,186,47,0.22)] active:scale-95"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Nova Operação</span>
          </button>
        )}

        {onToggleHideDashboardValues && (
          <button
            type="button"
            onClick={onToggleHideDashboardValues}
            className={`h-9 px-2.5 sm:px-3 border rounded-lg flex items-center gap-2 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              hideDashboardValues
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.06] text-zinc-300 hover:text-white'
            }`}
            title={hideDashboardValues ? 'Exibir valores financeiros' : 'Ocultar valores financeiros'}
            aria-label={hideDashboardValues ? 'Exibir valores financeiros' : 'Ocultar valores financeiros'}
          >
            {hideDashboardValues ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="hidden md:inline">{hideDashboardValues ? 'Oculto' : 'Privacidade'}</span>
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
  hideValues = false,
}: {
  products?: Product[];
  sales: Sale[];
  installments: Installment[];
  closings?: Closing[];
  onNavigate: (view: string, filter?: string) => void;
  hideValues?: boolean;
}) {
  const money = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const displayMoney = (val: number) => (hideValues ? 'R$ ••••••' : money(val));
  const displayCount = (count: number, singular: string, plural: string) =>
    hideValues ? `•• ${plural}` : `${count} ${count === 1 ? singular : plural}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastClosingDate =
    closings.length > 0
      ? closings.reduce((latest, c) => (c.closedAt > latest ? c.closedAt : latest), '')
      : '';

  const isAfterLastClosing = (dateStr?: string) => {
    if (!lastClosingDate) return true;
    if (!dateStr) return false;
    const itemTime = parseDateToMidnight(dateStr).getTime();
    const closingTime = new Date(lastClosingDate).getTime();
    if (isNaN(itemTime) || isNaN(closingTime)) return false;
    return itemTime > closingTime;
  };

  // Filtra apenas parcelas vinculadas a contratos válidos
  const validSaleIds = new Set(sales.map((s) => s.id));
  const validInstallments = installments.filter((i) => validSaleIds.has(i.saleId));

  // Identifica vendas ativas (com saldo/parcelas pendentes)
  const activeContracts = sales.filter((s) => {
    const sInsts = validInstallments.filter((i) => i.saleId === s.id);
    const isFullyPaid =
      s.status === 'Liquidada' || (sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago'));
    return !isFullyPaid;
  });

  // 1) Valor Investido com abatimento proporcional por parcela paga / entrada / amortização
  const installmentsBySaleId = new Map<string, Installment[]>();
  validInstallments.forEach((inst) => {
    const list = installmentsBySaleId.get(inst.saleId) || [];
    list.push(inst);
    installmentsBySaleId.set(inst.saleId, list);
  });

  const costedSales = sales.filter((s) => Number(s.costPrice) > 0);
  let totalRemainingInvested = 0;
  let activeCostedCount = 0;

  costedSales.forEach((s) => {
    const sInsts = installmentsBySaleId.get(s.id) || [];
    const summary = calculateSaleInvestment(s, sInsts);
    totalRemainingInvested += summary.remainingInvested;
    if (!summary.isFullyPaid && summary.remainingInvested > 0) {
      activeCostedCount += 1;
    }
  });

  totalRemainingInvested = Number(totalRemainingInvested.toFixed(2));

  // 2) Faturamento Realizado no ciclo & Recebíveis futuros
  const monthlyDownPayments = sales
    .filter((s) => isSameMonthAndYear(s.createdAt || s.date) && isAfterLastClosing(s.createdAt || s.date))
    .reduce((acc, s) => acc + (Number(s.downPayment) || 0), 0);

  const monthlyPaidInstallments = validInstallments
    .filter(
      (i) => i.status === 'Pago' && isSameMonthAndYear(i.paidAt || i.dueDate) && isAfterLastClosing(i.paidAt || i.dueDate)
    )
    .reduce((acc, i) => acc + (Number(i.value) || 0), 0);

  const currentProfit = Number((monthlyDownPayments + monthlyPaidInstallments).toFixed(2));
  const pendingInstallments = validInstallments.filter((i) => i.status === 'Pendente');
  const receivablesValue = Number(
    pendingInstallments.reduce((acc, i) => acc + (Number(i.value) || 0), 0).toFixed(2)
  );

  // 3) Indicadores de Adimplência, Vence Hoje e Atrasados
  const paidCount = validInstallments.filter((i) => i.status === 'Pago').length;
  const overdueInstallments = pendingInstallments.filter((i) => {
    const dueDate = parseDateToMidnight(i.dueDate);
    return dueDate.getTime() < today.getTime();
  });
  const overdueCount = overdueInstallments.length;
  const overdueAmount = overdueInstallments.reduce((acc, i) => acc + (Number(i.value) || 0), 0);

  const totalRelevantPoints = paidCount + overdueCount;
  const healthRate = totalRelevantPoints > 0 ? Number(((paidCount / totalRelevantPoints) * 100).toFixed(1)) : 100;

  const dueTodayInstallments = pendingInstallments.filter((i) => {
    const dueDate = parseDateToMidnight(i.dueDate);
    return dueDate.getTime() === today.getTime();
  });
  const dueTodayCount = dueTodayInstallments.length;
  const dueTodayAmount = dueTodayInstallments.reduce((acc, i) => acc + (Number(i.value) || 0), 0);

  // Sparkline helpers
  const getSalesTrendPoints = (): number[] => {
    if (currentProfit === 0) return [0, 0, 0, 0, 0];
    const cycleSales = sales.filter((s) => isAfterLastClosing(s.createdAt || s.date));
    const sorted = [...cycleSales].sort(
      (a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );
    if (sorted.length < 3) {
      return [currentProfit * 0.3, currentProfit * 0.6, currentProfit * 0.8, currentProfit];
    }
    return sorted.slice(-10).map((s) => Number(s.total) || 0);
  };

  const getReceivablesTrendPoints = (): number[] => {
    const sortedPending = [...pendingInstallments].sort(
      (a, b) => parseDateToMidnight(a.dueDate).getTime() - parseDateToMidnight(b.dueDate).getTime()
    );
    if (sortedPending.length < 3) {
      return [150, 240, 180, 310, 260, 420, 380, 510];
    }
    return sortedPending.slice(0, 10).map((i) => Number(i.value) || 0);
  };

  const drawSparkline = (points: number[], width = 96, height = 28) => {
    if (points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    return points
      .map((p, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 6) - 3;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const drawSparklineArea = (points: number[], width = 96, height = 28) => {
    const linePath = drawSparkline(points, width, height);
    if (!linePath) return '';
    return `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
  };

  const gaugeRadius = 14;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (healthRate / 100) * gaugeCircumference;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* LINHA 1: MÉTRICAS EXECUTIVAS PRINCIPAIS (3 COLUNAS DESKTOP / 1 COLUNA MOBILE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Valor Investido (com abatimento proporcional por parcela paga) */}
        <button
          type="button"
          onClick={() => onNavigate('clients')}
          className="glass-card group p-5 flex flex-col justify-between text-left hover:bg-[#131824] hover:border-amber-400/35 transition-colors duration-200 cursor-pointer min-h-[154px]"
          title="Editar valor pago nos aparelhos na aba Clientes"
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
              <Briefcase size={18} />
            </div>
            <span className="text-[11px] font-medium text-amber-300/90 tabular-figure">
              {activeCostedCount} {activeCostedCount === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>

          <div className="mt-4 w-full">
            <span className="text-xs font-medium text-zinc-400 block">Valor Investido</span>
            <strong className="text-2xl sm:text-[26px] font-bold block text-white tracking-tight tabular-figure mt-0.5">
              {displayMoney(totalRemainingInvested)}
            </strong>
            <p className="text-[11px] text-zinc-400 mt-1.5 truncate tabular-figure">
              {costedSales.length > 0
                ? displayCount(activeCostedCount, 'operação em aberto', 'operações em aberto')
                : 'Edite o custo do aparelho na aba Clientes'}
            </p>
          </div>
        </button>

        {/* Card 2: Valores a Receber */}
        <button
          type="button"
          onClick={() => onNavigate('sales')}
          className="glass-card group p-5 flex flex-col justify-between text-left hover:bg-[#131824] hover:border-blue-400/35 transition-colors duration-200 cursor-pointer min-h-[154px]"
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <TrendingUp size={18} />
            </div>

            <div
              className={`opacity-80 group-hover:opacity-100 transition-opacity duration-200 ${
                hideValues ? 'blur-sm opacity-20 pointer-events-none' : ''
              }`}
            >
              <svg width="96" height="28" viewBox="0 0 96 28" className="overflow-visible">
                <defs>
                  <linearGradient id="blue-grad-exec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={drawSparklineArea(getReceivablesTrendPoints(), 96, 28)} fill="url(#blue-grad-exec)" />
                <path
                  d={drawSparkline(getReceivablesTrendPoints(), 96, 28)}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 w-full">
            <span className="text-xs font-medium text-zinc-400 block">Valores a Receber</span>
            <strong className="text-2xl sm:text-[26px] font-bold block text-white tracking-tight tabular-figure mt-0.5">
              {displayMoney(receivablesValue)}
            </strong>
            <p className="text-[11px] text-zinc-400 mt-1.5 truncate tabular-figure">
              {displayCount(pendingInstallments.length, 'parcela futura', 'parcelas futuras')}
            </p>
          </div>
        </button>

        {/* Card 4: Faturamento Realizado */}
        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="glass-card group p-5 flex flex-col justify-between text-left hover:bg-[#131824] hover:border-emerald-400/35 transition-colors duration-200 cursor-pointer min-h-[154px]"
          title="Acessar Relatórios Mensais e Fechamento de Caixa"
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <DollarSign size={18} />
            </div>

            <div
              className={`opacity-80 group-hover:opacity-100 transition-opacity duration-200 ${
                hideValues ? 'blur-sm opacity-20 pointer-events-none' : ''
              }`}
            >
              <svg width="96" height="28" viewBox="0 0 96 28" className="overflow-visible">
                <defs>
                  <linearGradient id="emerald-grad-exec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={drawSparklineArea(getSalesTrendPoints(), 96, 28)} fill="url(#emerald-grad-exec)" />
                <path
                  d={drawSparkline(getSalesTrendPoints(), 96, 28)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-400">Faturamento Realizado</span>
              {lastClosingDate && <span className="text-[10px] font-medium text-gold">Ciclo aberto</span>}
            </div>
            <strong className="text-2xl sm:text-[26px] font-bold block text-emerald-400 tracking-tight tabular-figure mt-0.5">
              {displayMoney(currentProfit)}
            </strong>
            <p className="text-[11px] text-zinc-400 mt-1.5 truncate">
              {currentProfit === 0 && lastClosingDate ? 'Caixa zerado pós-fechamento' : 'Entradas e parcelas no mês'}
            </p>
          </div>
        </button>
      </div>

      {/* LINHA 2: SAÚDE OPERACIONAL & VENCIMENTOS (4 COLUNAS DESKTOP / 2 COLUNAS MOBILE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Índice de Adimplência */}
        <button
          type="button"
          onClick={() => onNavigate('sales')}
          className="glass-card p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[#131824] hover:border-emerald-400/35 transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 block truncate">Adimplência</span>
            <strong className="text-lg sm:text-xl font-bold text-emerald-400 tabular-figure block mt-0.5">
              {hideValues ? '•••%' : `${healthRate.toFixed(1)}%`}
            </strong>
            <span className="text-[11px] text-zinc-500 block truncate mt-0.5">
              {overdueCount === 0 ? 'Carteira saudável' : `${paidCount} pagas`}
            </span>
          </div>

          <div className={`relative flex items-center justify-center w-11 h-11 shrink-0 ${hideValues ? 'blur-sm opacity-20' : ''}`}>
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
            <Activity size={13} className="absolute text-emerald-400" />
          </div>
        </button>

        {/* Contratos Ativos */}
        <button
          type="button"
          onClick={() => onNavigate('sales', 'Todos')}
          className="glass-card p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[#131824] hover:border-gold/35 transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 block truncate">Contratos Ativos</span>
            <strong className="text-lg sm:text-xl font-bold text-white tabular-figure block mt-0.5">
              {displayCount(activeContracts.length, 'contrato', 'contratos')}
            </strong>
            <span className="text-[11px] text-zinc-500 block truncate mt-0.5 tabular-figure">
              {sales.length} totais na base
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
            <Layers size={17} />
          </div>
        </button>

        {/* Vencem Hoje */}
        <button
          type="button"
          onClick={() => onNavigate('sales', 'Hoje')}
          className={`glass-card p-4 sm:p-5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
            dueTodayCount > 0
              ? 'border-purple-400/30 hover:border-purple-400/50 hover:bg-[#131824]'
              : 'hover:border-white/[0.16] hover:bg-[#131824]'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 block truncate">Vencem Hoje</span>
            <strong className="text-lg sm:text-xl font-bold text-zinc-100 tabular-figure block mt-0.5">
              {displayCount(dueTodayCount, 'parcela', 'parcelas')}
            </strong>
            <span className={`text-[11px] block truncate mt-0.5 tabular-figure ${dueTodayCount > 0 ? 'text-purple-300 font-medium' : 'text-zinc-500'}`}>
              {dueTodayCount > 0 ? displayMoney(dueTodayAmount) : 'Sem vencimentos'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              dueTodayCount > 0
                ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400'
            }`}
          >
            <Calendar size={17} />
          </div>
        </button>

        {/* Atrasados */}
        <button
          type="button"
          onClick={() => onNavigate('sales', 'Atrasados')}
          className={`glass-card p-4 sm:p-5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
            overdueCount > 0
              ? 'border-red-500/35 hover:border-red-500/55 hover:bg-[#131824]'
              : 'hover:border-emerald-400/35 hover:bg-[#131824]'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 block truncate">Em Atraso</span>
            <strong className={`text-lg sm:text-xl font-bold tabular-figure block mt-0.5 ${overdueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {displayCount(overdueCount, 'parcela', 'parcelas')}
            </strong>
            <span className={`text-[11px] block truncate mt-0.5 tabular-figure ${overdueCount > 0 ? 'text-red-400/90 font-medium' : 'text-zinc-500'}`}>
              {overdueCount > 0 ? displayMoney(overdueAmount) : 'Nenhum atraso'}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              overdueCount > 0
                ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                : 'bg-emerald-500/12 border border-emerald-500/25 text-emerald-400'
            }`}
          >
            {overdueCount > 0 ? <AlertCircle size={17} /> : <ShieldCheck size={17} />}
          </div>
        </button>
      </div>
    </div>
  );
}
