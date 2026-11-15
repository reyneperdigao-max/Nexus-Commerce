import { useState, useMemo, useEffect } from 'react';
import { 
  Sale, 
  Installment, 
  Settings as SettingsType, 
  Closing 
} from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell
} from 'recharts';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Search, 
  MessageCircle, 
  Layers, 
  Receipt,
  Wallet,
  RotateCcw,
  Check,
  Trash2
} from 'lucide-react';

interface MonthlyInstallmentsReportProps {
  sales: Sale[];
  activeSales: Sale[];
  installments: Installment[];
  closings: Closing[];
  settings: SettingsType;
  money: (val: number) => string;
  onPayInstallment: (installment: Installment) => void;
  onViewReceipt: (installment: Installment) => void;
  onDownloadPDF: () => void;
  onCloseRegister: (periodName: string, profit: number, revenue: number, count: number) => void;
  onDeleteClosing?: (closingId: string) => void;
  initialTab?: 'installments' | 'closings';
  onTabChange?: (tab: 'installments' | 'closings') => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

// Robust Date Parsing Helper (prevents timezone offset bugs)
export function parseDateSafe(dateStr: string | undefined): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
  } else if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    }
  } catch {}
  return null;
}

export function getYearMonthKey(dateStr: string | undefined): string {
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return '';
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
}

export function formatDateBR(dateStr: string | undefined): string {
  const parsed = parseDateSafe(dateStr);
  if (!parsed) return '—';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`;
}

export function MonthlyInstallmentsReport({
  sales,
  activeSales,
  installments,
  closings,
  settings,
  money,
  onPayInstallment,
  onViewReceipt,
  onDownloadPDF,
  onCloseRegister,
  onDeleteClosing,
  initialTab,
  onTabChange,
  showToast
}: MonthlyInstallmentsReportProps) {
  // Current Date logic
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const initialMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonthStr);
  const [activeTab, setActiveTab] = useState<'installments' | 'closings'>(initialTab || 'installments');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: 'installments' | 'closings') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // 3. MÉTRICAS DO CICLO ABERTO (Fechamento de Caixa - Padrão Nexus Private)
  const lastClosingDate = useMemo(() => {
    if (!closings || closings.length === 0) return '';
    return closings.reduce((latest, c) => c.closedAt > latest ? c.closedAt : latest, '');
  }, [closings]);

  const isAfterLastClosing = (dateStr?: string) => {
    if (!lastClosingDate) return true;
    if (!dateStr) return false;
    const itemTime = new Date(dateStr).getTime();
    const closingTime = new Date(lastClosingDate).getTime();
    if (isNaN(itemTime) || isNaN(closingTime)) return false;
    return itemTime > closingTime;
  };

  const isCurrentMonthNow = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const curr = new Date();
    return date.getFullYear() === curr.getFullYear() && date.getMonth() === curr.getMonth();
  };

  const cycleDownPayments = useMemo(() => {
    return sales
      .filter(s => isCurrentMonthNow(s.createdAt || s.date) && isAfterLastClosing(s.createdAt || s.date))
      .reduce((acc, s) => acc + (s.downPayment || 0), 0);
  }, [sales, lastClosingDate]);

  const cyclePaidInstallments = useMemo(() => {
    return installments
      .filter(i => i.status === 'Pago' && isCurrentMonthNow(i.paidAt || i.dueDate) && isAfterLastClosing(i.paidAt || i.dueDate))
      .reduce((acc, i) => acc + (i.value || 0), 0);
  }, [installments, lastClosingDate]);

  const cycleRealizedFaturamento = cycleDownPayments + cyclePaidInstallments;
  const cycleSalesVolume = activeSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const cycleSalesCount = activeSales.length;

  // Parse Year and Month from selectedMonth (YYYY-MM)
  const [selectedYear, selectedMonthIndex] = useMemo(() => {
    const parts = selectedMonth.split('-').map(Number);
    const y = parts[0] || currentYear;
    const m = (parts[1] || currentMonthNum) - 1;
    return [y, m];
  }, [selectedMonth, currentYear, currentMonthNum]);

  // Navigate to Previous Month
  const handlePrevMonth = () => {
    let newMonth = selectedMonthIndex - 1;
    let newYear = selectedYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  // Navigate to Next Month
  const handleNextMonth = () => {
    let newMonth = selectedMonthIndex + 1;
    let newYear = selectedYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  // Reset to Current Month
  const handleCurrentMonth = () => {
    setSelectedMonth(initialMonthStr);
  };

  // Identifica contratos / produtos que já foram 100% quitados
  const fullyPaidSaleIds = useMemo(() => {
    const ids = new Set<string>();
    sales.forEach(s => {
      const sInsts = installments.filter(i => i.saleId === s.id);
      const isFullyPaid = s.status === 'Liquidada' || (sInsts.length > 0 && sInsts.every(i => i.status === 'Pago'));
      if (isFullyPaid) {
        ids.add(s.id);
      }
    });
    return ids;
  }, [sales, installments]);

  // Parcelas ativas (apenas de produtos/contratos que ainda possuem pendências e NÃO foram quitados)
  const activeInstallments = useMemo(() => {
    return installments.filter(inst => {
      if (inst.saleId && fullyPaidSaleIds.has(inst.saleId)) {
        return false;
      }
      return true;
    });
  }, [installments, fullyPaidSaleIds]);

  // Filter active installments for the selected month with robust key matching
  const monthInstallments = useMemo(() => {
    return activeInstallments.filter(inst => {
      if (!inst.dueDate) return false;
      return getYearMonthKey(inst.dueDate) === selectedMonth;
    });
  }, [activeInstallments, selectedMonth]);

  // 1. SOMA EXATA DAS PARCELAS ATIVAS DO MÊS SELECIONADO
  const monthStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalExpected = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    let countPaid = 0;
    let countPending = 0;
    let countOverdue = 0;

    monthInstallments.forEach(inst => {
      const val = Number(inst.value) || 0;
      totalExpected += val;

      if (inst.status === 'Pago') {
        totalPaid += val;
        countPaid += 1;
      } else {
        const parsed = parseDateSafe(inst.dueDate);
        let isOverdue = false;
        if (parsed) {
          const due = new Date(parsed.year, parsed.month - 1, parsed.day);
          due.setHours(0, 0, 0, 0);
          isOverdue = due < today;
        }

        if (isOverdue) {
          totalOverdue += val;
          countOverdue += 1;
        } else {
          totalPending += val;
          countPending += 1;
        }
      }
    });

    const completionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    return {
      totalExpected,
      totalPaid,
      totalPending,
      totalOverdue,
      totalUnpaid: totalPending + totalOverdue,
      countTotal: monthInstallments.length,
      countPaid,
      countPending,
      countOverdue,
      completionRate
    };
  }, [monthInstallments]);

  // 2. ESTIMATIVA MENSAL TOTAL DA CARTEIRA DE VENDAS ATIVAS (EXCLUINDO QUITADAS)
  const portfolioMonthlyEstimate = useMemo(() => {
    // Apenas vendas/contratos ativos que não foram quitados
    const activeContracts = sales.filter(s => !fullyPaidSaleIds.has(s.id));

    // Soma o valor de parcela mensal de todos os contratos ativos
    const monthlySum = activeContracts.reduce((acc, sale) => {
      const val = Number(sale.installmentValue) || 0;
      return acc + val;
    }, 0);

    // Total geral a receber na carteira (todas as parcelas pendentes futuras somadas de contratos ativos)
    const totalRemainingReceivables = activeInstallments
      .filter(i => i.status === 'Pendente')
      .reduce((acc, i) => acc + (Number(i.value) || 0), 0);

    return {
      monthlySum,
      activeContractsCount: activeContracts.length,
      totalRemainingReceivables
    };
  }, [sales, fullyPaidSaleIds, activeInstallments]);

  // Filtered installments based on search and status filter
  const filteredMonthInstallments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return monthInstallments
      .filter(inst => {
        // Status filter
        if (statusFilter === 'paid' && inst.status !== 'Pago') return false;
        if (statusFilter === 'pending') {
          if (inst.status === 'Pago') return false;
          const parsed = parseDateSafe(inst.dueDate);
          if (parsed) {
            const due = new Date(parsed.year, parsed.month - 1, parsed.day);
            due.setHours(0, 0, 0, 0);
            if (due < today) return false;
          }
        }
        if (statusFilter === 'overdue') {
          if (inst.status === 'Pago') return false;
          const parsed = parseDateSafe(inst.dueDate);
          if (parsed) {
            const due = new Date(parsed.year, parsed.month - 1, parsed.day);
            due.setHours(0, 0, 0, 0);
            if (due >= today) return false;
          }
        }

        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const clientMatch = inst.client?.toLowerCase().includes(term);
          const productMatch = inst.productName?.toLowerCase().includes(term);
          if (!clientMatch && !productMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const pA = parseDateSafe(a.dueDate);
        const pB = parseDateSafe(b.dueDate);
        const tA = pA ? new Date(pA.year, pA.month - 1, pA.day).getTime() : 0;
        const tB = pB ? new Date(pB.year, pB.month - 1, pB.day).getTime() : 0;
        return tA - tB;
      });
  }, [monthInstallments, statusFilter, searchTerm]);

  // 12-Month Projection Timeline Series for Recharts and Comparison Table
  const projectionTimeline = useMemo(() => {
    const monthsData: {
      key: string;
      label: string;
      shortLabel: string;
      monthName: string;
      year: number;
      previsto: number;
      recebido: number;
      pendente: number;
      atrasado: number;
      count: number;
      isSelected: boolean;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Look from 2 months back to 9 months forward (12 months span)
    const baseDate = new Date(currentYear, currentMonthNum - 3, 1);

    for (let i = 0; i < 12; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[m]} ${y}`;
      const shortLabel = `${SHORT_MONTH_NAMES[m]}/${String(y).slice(2)}`;

      let previsto = 0;
      let recebido = 0;
      let pendente = 0;
      let atrasado = 0;
      let count = 0;

      activeInstallments.forEach(inst => {
        if (!inst.dueDate) return;
        if (getYearMonthKey(inst.dueDate) === key) {
          const val = Number(inst.value) || 0;
          previsto += val;
          count += 1;

          if (inst.status === 'Pago') {
            recebido += val;
          } else {
            const parsed = parseDateSafe(inst.dueDate);
            let isOver = false;
            if (parsed) {
              const due = new Date(parsed.year, parsed.month - 1, parsed.day);
              due.setHours(0, 0, 0, 0);
              isOver = due < today;
            }
            if (isOver) {
              atrasado += val;
            } else {
              pendente += val;
            }
          }
        }
      });

      monthsData.push({
        key,
        label,
        shortLabel,
        monthName: MONTH_NAMES[m],
        year: y,
        previsto,
        recebido,
        pendente,
        atrasado,
        count,
        isSelected: key === selectedMonth
      });
    }

    return monthsData;
  }, [installments, currentYear, currentMonthNum, selectedMonth]);

  // WhatsApp Message for Installment Reminder
  const sendWhatsAppReminder = (inst: Installment) => {
    const parentSale = sales.find(s => s.id === inst.saleId);
    const phone = parentSale?.clientPhone ? parentSale.clientPhone.replace(/\D/g, '') : '';
    const dateFormatted = formatDateBR(inst.dueDate);
    const company = (settings.companyName || settings.userName || 'GESTÃO COMERCIAL').toUpperCase();
    const pixKey = settings.pixKey || settings.op1PixKey || '';
    const pixName = settings.pixName || settings.op1PixName || settings.userName || '';

    const text = `*LEMBRETE DE VENCIMENTO - ${company}*\n\n` +
      `Olá, *${inst.client}*!\n\n` +
      `Passando para lembrar da sua parcela de *${inst.productName || 'produto'}*:\n` +
      `📦 *Parcela:* ${inst.number} de ${inst.total}\n` +
      `💰 *Valor:* ${money(inst.value)}\n` +
      `📅 *Vencimento:* ${dateFormatted}\n\n` +
      (pixKey ? `🔑 *Chave Pix:* ${pixKey}\n👤 *Favorecido:* ${pixName}\n\n` : '') +
      `Caso já tenha realizado o pagamento, desconsidere esta mensagem. Obrigado!`;

    const url = phone 
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN CONTROLS                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase text-gold tracking-wider block">
            Controle Financeiro
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
            Relatório de Parcelas & Previsão Mensal
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Consolidado das parcelas do mês e projeção recorrente da carteira
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center bg-[#0d111a] p-1 rounded-xl border border-white/[0.08] flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => handleTabChange('installments')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'installments'
                  ? 'bg-gold text-[#07090e]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar size={14} />
              <span>Previsão</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('closings')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'closings'
                  ? 'bg-gold text-[#07090e]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>Fechamento</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onDownloadPDF}
            className="h-10 flex items-center justify-center gap-2 px-4 bg-[#0d111a] hover:bg-[#131824] border border-white/[0.1] text-zinc-100 font-semibold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
            title="Exportar Relatório Mensal em PDF"
          >
            <FileText size={14} className="text-gold" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SELETOR DE MÊS CLARO E ELEGANTE                                        */}
      {/* ========================================================================= */}
      {activeTab === 'installments' && (
        <div className="glass-card p-4 sm:p-5 border border-gold/30 bg-gradient-to-r from-gold/[0.06] via-black/80 to-gold/[0.02] flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl">
          {/* Mês Atualmente Selecionado */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/40 text-gold flex items-center justify-center shrink-0 shadow-inner">
              <Calendar size={22} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest block">Mês Selecionado para Análise</span>
              <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wide">
                {MONTH_NAMES[selectedMonthIndex]} <span className="text-gold">{selectedYear}</span>
              </h3>
            </div>
          </div>

          {/* Botões de Navegação Rápida entre Meses */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={handlePrevMonth}
              className="h-10 px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-gold/50 rounded-xl flex items-center gap-1 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95 text-xs font-bold uppercase"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Dropdown Seletor de Mês */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 px-3 bg-black border border-zinc-700 rounded-xl text-xs font-black uppercase text-white tracking-wider outline-none focus:border-gold cursor-pointer"
            >
              {projectionTimeline.map(m => (
                <option key={m.key} value={m.key}>
                  {m.monthName} {m.year} — {money(m.previsto)}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="h-10 px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-gold/50 rounded-xl flex items-center gap-1 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95 text-xs font-bold uppercase"
              title="Próximo Mês"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight size={16} />
            </button>

            {selectedMonth !== initialMonthStr && (
              <button
                onClick={handleCurrentMonth}
                className="h-10 px-3.5 bg-gold hover:bg-gold/90 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Mês Atual</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CARDS PRINCIPAIS: SOMA DAS PARCELAS DO MÊS & ESTIMATIVA DA CARTEIRA    */}
      {/* ========================================================================= */}
      {activeTab === 'installments' && (
        <div className="flex flex-col gap-6">
          
          {/* GRID DE CARDS EXECUTIVOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* CARD 1: SOMA DE TODAS AS PARCELAS DO MÊS SELECIONADO */}
            <div className="glass-card p-5 border-gold/30 bg-gold/[0.04] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gold">Previsto no Mês</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/25 tabular-figure">
                    {monthStats.countTotal} parc.
                  </span>
                </div>
                <strong className="text-2xl font-bold text-gold mt-2 block tracking-tight tabular-figure">
                  {money(monthStats.totalExpected)}
                </strong>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Vencimentos em {MONTH_NAMES[selectedMonthIndex]}/{selectedYear}
                </p>
              </div>

              <div className="border-t border-gold/15 pt-2.5 flex items-center justify-between text-xs text-zinc-400">
                <span>Taxa de Quitação:</span>
                <span className="text-white font-semibold tabular-figure">{monthStats.completionRate.toFixed(0)}%</span>
              </div>
            </div>

            {/* CARD 2: JÁ RECEBIDO NO MÊS */}
            <div className="glass-card p-5 border-emerald-500/25 bg-emerald-500/[0.03] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-400">Recebido no Mês</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 tabular-figure">
                    {monthStats.countPaid} pagas
                  </span>
                </div>
                <strong className="text-2xl font-bold text-emerald-400 mt-2 block tracking-tight tabular-figure">
                  {money(monthStats.totalPaid)}
                </strong>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Montante liquidado no período
                </p>
              </div>

              <div className="border-t border-emerald-500/15 pt-2.5 flex items-center justify-between text-xs text-zinc-400">
                <span>Quitadas:</span>
                <span className="text-emerald-400 font-semibold tabular-figure">
                  {monthStats.countPaid} de {monthStats.countTotal}
                </span>
              </div>
            </div>

            {/* CARD 3: SALDO PENDENTE A RECEBER NO MÊS */}
            <div className="glass-card p-5 border-amber-500/25 bg-amber-500/[0.03] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-amber-400">Falta Receber</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 tabular-figure">
                    {monthStats.countPending + monthStats.countOverdue} abertas
                  </span>
                </div>
                <strong className="text-2xl font-bold text-amber-200 mt-2 block tracking-tight tabular-figure">
                  {money(monthStats.totalUnpaid)}
                </strong>
                <p className="text-[11px] text-zinc-400 mt-1">
                  A vencer e em atraso no mês
                </p>
              </div>

              <div className="border-t border-amber-500/15 pt-2.5 flex items-center justify-between text-xs text-zinc-400">
                <span>Em atraso:</span>
                <span className={`font-semibold tabular-figure ${monthStats.countOverdue > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {money(monthStats.totalOverdue)} ({monthStats.countOverdue})
                </span>
              </div>
            </div>

            {/* CARD 4: ESTIMATIVA MENSAL DA CARTEIRA */}
            <div className="glass-card p-5 border-sky-500/25 bg-sky-500/[0.03] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-sky-400">Estimativa Carteira</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/25 tabular-figure">
                    {portfolioMonthlyEstimate.activeContractsCount} ativos
                  </span>
                </div>
                <strong className="text-2xl font-bold text-sky-300 mt-2 block tracking-tight tabular-figure">
                  {money(portfolioMonthlyEstimate.monthlySum)}
                  <span className="text-xs text-sky-400 font-medium">/mês</span>
                </strong>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Soma mensal dos contratos ativos
                </p>
              </div>

              <div className="border-t border-sky-500/15 pt-2.5 flex items-center justify-between text-xs text-zinc-400">
                <span>Saldo Futuro:</span>
                <span className="text-white font-semibold tabular-figure">
                  {money(portfolioMonthlyEstimate.totalRemainingReceivables)}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VISÃO GERAL DE ENTRADAS MÊS A MÊS (12 MESES)                           */}
          {/* ========================================================================= */}
          <div className="glass-card p-5 sm:p-6 border border-line-strong bg-black/40 rounded-2xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold" />
                  Previsão de Parcelas Mês a Mês (Próximos 12 Meses)
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Clique em qualquer mês para selecionar e abrir a lista detalhada de parcelas
                </p>
              </div>
              <span className="text-xs font-bold text-gold">
                Mês em foco: {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
              </span>
            </div>

            {/* Gráfico de Barras Simplificado */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectionTimeline}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      setSelectedMonth(e.activePayload[0].payload.key);
                    }
                  }}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis 
                    dataKey="shortLabel" 
                    stroke="#71717A" 
                    fontSize={10} 
                    tickLine={false}
                    tick={{ fill: '#A1A1AA', fontWeight: 'bold' }}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    tick={{ fill: '#71717A' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-950 border border-gold/50 p-3 rounded-xl shadow-2xl text-xs flex flex-col gap-1 backdrop-blur-md">
                            <span className="font-black text-white uppercase text-sm border-b border-white/10 pb-1">
                              {data.label}
                            </span>
                            <div className="flex justify-between gap-4 text-zinc-300 mt-1">
                              <span className="text-gold font-bold">Total Previsto:</span>
                              <strong className="text-white">{money(data.previsto)}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-zinc-300">
                              <span className="text-green-400 font-bold">Já Recebido:</span>
                              <strong className="text-green-neon">{money(data.recebido)}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-zinc-300">
                              <span className="text-amber-400 font-bold">Falta Receber:</span>
                              <strong className="text-amber-200">{money(data.pendente + data.atrasado)}</strong>
                            </div>
                            <div className="border-t border-white/5 pt-1 text-[10px] text-zinc-500 font-bold flex justify-between">
                              <span>Parcelas:</span>
                              <span>{data.count} uni.</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="previsto" fill="#f3ba2f" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {projectionTimeline.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.key === selectedMonth ? '#f3ba2f' : '#574618'}
                        stroke={entry.key === selectedMonth ? '#FFFFFF' : 'none'}
                        strokeWidth={entry.key === selectedMonth ? 1.5 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="recebido" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Grid dos Meses com Botões Rápidos de Acesso */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-white/5">
              {projectionTimeline.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMonth(m.key)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    m.key === selectedMonth
                      ? 'bg-gold/15 border-gold text-white shadow-md'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-1">
                    <span className={m.key === selectedMonth ? 'text-gold font-black' : 'text-zinc-400'}>{m.shortLabel}</span>
                    <span className="text-[9px] text-zinc-500 font-semibold">{m.count} parc.</span>
                  </div>
                  <strong className="text-xs font-black block text-white truncate">
                    {money(m.previsto)}
                  </strong>
                  <div className="flex items-center justify-between text-[9px] mt-1 text-zinc-400">
                    <span className="text-green-400 font-bold">{money(m.recebido)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. LISTA & TABELA DETALHADA DE PARCELAS DO MÊS */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Parcelas de {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md bg-gold/10 text-gold text-xs font-semibold border border-gold/25 tabular-figure">
                    {filteredMonthInstallments.length}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Recebimentos previstos, baixas e cobranças via WhatsApp
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
                <div className="relative group min-w-[200px]">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-gold transition-colors"
                    size={15}
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente ou produto..."
                    className="h-10 w-full bg-[#07090e] border border-white/[0.1] rounded-xl pl-9 pr-3 text-xs text-white outline-none focus:border-gold transition-colors"
                  />
                </div>

                <div className="flex items-center bg-[#07090e] p-1 rounded-xl border border-white/[0.08] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'all' ? 'bg-gold text-[#07090e]' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todas ({monthStats.countTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'pending' ? 'bg-amber-500 text-[#07090e]' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    A Vencer ({monthStats.countPending})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'paid' ? 'bg-emerald-500 text-[#07090e]' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Pagas ({monthStats.countPaid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('overdue')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === 'overdue' ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Atrasadas ({monthStats.countOverdue})
                  </button>
                </div>
              </div>
            </div>

            {filteredMonthInstallments.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Calendar size={36} className="text-zinc-600 mb-3" />
                <p className="text-zinc-400 font-medium text-xs">
                  Nenhuma parcela encontrada para os filtros selecionados neste mês.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                  }}
                  className="mt-3 text-xs text-gold font-semibold hover:underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="md:hidden divide-y divide-white/[0.06]">
                  {filteredMonthInstallments.map((inst) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const parsed = parseDateSafe(inst.dueDate);
                    let isOverdue = false;
                    let isDueToday = false;
                    let diffDays = 0;

                    if (parsed) {
                      const due = new Date(parsed.year, parsed.month - 1, parsed.day);
                      due.setHours(0, 0, 0, 0);
                      isOverdue = inst.status !== 'Pago' && due < today;
                      isDueToday = inst.status !== 'Pago' && due.getTime() === today.getTime();
                      if (isOverdue) {
                        diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                      }
                    }

                    const isPaid = inst.status === 'Pago';

                    return (
                      <div key={inst.id} className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 text-gold font-bold text-xs flex items-center justify-center shrink-0">
                              {inst.client ? inst.client.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-white block truncate">{inst.client}</span>
                              <span className="text-xs text-zinc-400 block truncate">
                                {inst.productName || 'Produto Registrado'} · {inst.number}/{inst.total}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <strong
                              className={`text-sm font-bold tabular-figure block ${
                                isPaid ? 'text-emerald-400' : 'text-gold'
                              }`}
                            >
                              {money(Number(inst.value) || 0)}
                            </strong>
                            <span className="text-[11px] text-zinc-400 tabular-figure">{formatDateBR(inst.dueDate)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div>
                            {isPaid ? (
                              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold inline-flex items-center gap-1">
                                <Check size={11} /> Pago
                              </span>
                            ) : isDueToday ? (
                              <span className="px-2.5 py-1 rounded-md bg-gold/15 text-gold border border-gold/30 text-[11px] font-semibold inline-flex items-center gap-1">
                                <Clock size={11} /> Vence Hoje
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/25 text-[11px] font-semibold inline-flex items-center gap-1">
                                <AlertTriangle size={11} /> {diffDays}d atraso
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[11px] font-semibold">
                                A Vencer
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isPaid ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppReminder(inst)}
                                  className="h-9 px-3 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <MessageCircle size={13} />
                                  <span>Cobrar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onPayInstallment(inst)}
                                  className="h-9 px-3.5 rounded-lg bg-gold text-[#07090e] text-xs font-bold cursor-pointer"
                                >
                                  Dar Baixa
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onViewReceipt(inst)}
                                className="h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                              >
                                <Receipt size={13} className="text-gold" />
                                <span>Recibo</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[760px]">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-xs text-zinc-400 font-semibold bg-white/[0.02] h-12">
                        <th className="p-4 pl-6">Cliente</th>
                        <th className="p-4">Produto</th>
                        <th className="p-4 text-center">Parcela</th>
                        <th className="p-4 text-center">Vencimento</th>
                        <th className="p-4 text-center">Valor</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right pr-6">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredMonthInstallments.map((inst) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const parsed = parseDateSafe(inst.dueDate);
                        let isOverdue = false;
                        let isDueToday = false;
                        let diffDays = 0;

                        if (parsed) {
                          const due = new Date(parsed.year, parsed.month - 1, parsed.day);
                          due.setHours(0, 0, 0, 0);
                          isOverdue = inst.status !== 'Pago' && due < today;
                          isDueToday = inst.status !== 'Pago' && due.getTime() === today.getTime();
                          if (isOverdue) {
                            diffDays = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                          }
                        }

                        const isPaid = inst.status === 'Pago';

                        return (
                          <tr key={inst.id} className="hover:bg-white/[0.02] transition-colors h-16">
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 text-gold font-bold text-xs flex items-center justify-center shrink-0">
                                  {inst.client ? inst.client.charAt(0).toUpperCase() : 'C'}
                                </div>
                                <span className="text-white font-semibold text-xs">{inst.client}</span>
                              </div>
                            </td>

                            <td className="p-4">
                              <span className="text-xs text-zinc-300">{inst.productName || 'Produto Registrado'}</span>
                            </td>

                            <td className="p-4 text-xs text-zinc-300 font-semibold text-center tabular-figure">
                              <span className="px-2 py-1 rounded bg-[#07090e] border border-white/[0.08]">
                                {String(inst.number).padStart(2, '0')}/{String(inst.total).padStart(2, '0')}
                              </span>
                            </td>

                            <td className="p-4 text-xs text-zinc-300 font-medium text-center tabular-figure">
                              {formatDateBR(inst.dueDate)}
                            </td>

                            <td className="p-4 text-center font-bold text-sm tabular-figure">
                              <span className={isPaid ? 'text-emerald-400' : 'text-gold'}>
                                {money(Number(inst.value) || 0)}
                              </span>
                            </td>

                            <td className="p-4 text-center">
                              {isPaid && (
                                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-semibold inline-flex items-center gap-1">
                                  <Check size={11} /> Pago
                                </span>
                              )}
                              {!isPaid && isDueToday && (
                                <span className="px-2.5 py-1 rounded-md bg-gold/15 text-gold border border-gold/30 text-[11px] font-semibold inline-flex items-center gap-1">
                                  <Clock size={11} /> Vence Hoje
                                </span>
                              )}
                              {!isPaid && isOverdue && (
                                <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/25 text-[11px] font-semibold inline-flex items-center gap-1">
                                  <AlertTriangle size={11} /> {diffDays}d atraso
                                </span>
                              )}
                              {!isPaid && !isDueToday && !isOverdue && (
                                <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[11px] font-semibold">
                                  A Vencer
                                </span>
                              )}
                            </td>

                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isPaid ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => sendWhatsAppReminder(inst)}
                                      className="h-8 px-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <MessageCircle size={13} />
                                      <span>Cobrar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onPayInstallment(inst)}
                                      className="h-8 px-3.5 rounded-lg bg-gold hover:brightness-110 text-[#07090e] text-xs font-bold transition-all cursor-pointer"
                                    >
                                      Dar Baixa
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onViewReceipt(inst)}
                                    className="h-8 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Receipt size={13} className="text-gold" />
                                    <span>Recibo</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: FECHAMENTO DE CAIXA DO CICLO                                      */}
      {/* ========================================================================= */}
      {activeTab === 'closings' && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-5 sm:p-6 border-amber-500/25 bg-amber-500/[0.03] flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base sm:text-lg font-bold text-amber-200">
                  Consolidar e Fechar Caixa Mensal
                </h3>
                <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                  Ao consolidar o fechamento, o faturamento realizado no ciclo (
                  <strong className="text-gold tabular-figure">{money(cycleRealizedFaturamento)}</strong>) será
                  arquivado e o <strong className="text-white">faturamento do mês no Painel será zerado</strong> para
                  início do novo ciclo.
                </p>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#07090e] border border-amber-500/25 shrink-0">
                <span className="text-[11px] text-zinc-400 block">Status do Caixa</span>
                <span className="text-xs font-semibold text-amber-300 block mt-0.5">
                  {lastClosingDate
                    ? `Último Fechamento: ${new Date(lastClosingDate).toLocaleDateString('pt-BR')}`
                    : 'Ciclo Inicial Aberto'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.08]">
              <div className="p-4 rounded-xl bg-[#07090e]/70 border border-white/[0.07]">
                <span className="text-xs text-zinc-400 block">Faturamento do Ciclo Aberto</span>
                <strong className="text-xl font-bold text-gold mt-1 block tabular-figure">
                  {money(cycleRealizedFaturamento)}
                </strong>
                <span className="text-[11px] text-zinc-400 mt-1 block tabular-figure">
                  Entradas: {money(cycleDownPayments)} · Parcelas: {money(cyclePaidInstallments)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#07090e]/70 border border-white/[0.07]">
                <span className="text-xs text-zinc-400 block">Novos Contratos no Ciclo</span>
                <strong className="text-xl font-bold text-white mt-1 block tabular-figure">
                  {cycleSalesCount} {cycleSalesCount === 1 ? 'venda' : 'vendas'}
                </strong>
                <span className="text-[11px] text-zinc-400 mt-1 block tabular-figure">
                  Volume: {money(cycleSalesVolume)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#07090e]/70 border border-white/[0.07]">
                <span className="text-xs text-zinc-400 block">Carteira Ativa Geral</span>
                <strong className="text-xl font-bold text-zinc-100 mt-1 block tabular-figure">
                  {money(portfolioMonthlyEstimate.monthlySum)}
                  <span className="text-xs text-zinc-400 font-normal">/mês</span>
                </strong>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  {portfolioMonthlyEstimate.activeContractsCount} contratos ativos
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2 border-t border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-medium text-zinc-300 shrink-0">Etiqueta do Ciclo:</span>
                <input
                  type="text"
                  placeholder="Ex: Maio de 2026"
                  defaultValue={`${MONTH_NAMES[selectedMonthIndex]} de ${selectedYear}`}
                  id="closingPeriodInput"
                  className="h-10 px-3.5 bg-[#07090e] border border-white/[0.1] rounded-xl outline-none text-xs font-medium text-white focus:border-gold min-w-[200px]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const inputEl = document.getElementById('closingPeriodInput') as HTMLInputElement;
                  const periodVal =
                    inputEl?.value?.trim() || `${MONTH_NAMES[selectedMonthIndex]} de ${selectedYear}`;

                  setConfirmDialog({
                    title: `Fechar Caixa — ${periodVal}`,
                    message: `Faturamento a consolidar: ${money(cycleRealizedFaturamento)} (${cycleSalesCount} contratos). O faturamento mensal no Painel será zerado para o novo ciclo.`,
                    onConfirm: () => {
                      onCloseRegister(periodVal, cycleRealizedFaturamento, cycleSalesVolume, cycleSalesCount);
                      if (inputEl) inputEl.value = '';
                      showToast(
                        'Fechamento de caixa concluído! O faturamento do mês no Painel foi zerado.',
                        'success'
                      );
                    },
                  });
                }}
                className="h-10 px-5 bg-gold hover:brightness-110 text-[#07090e] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers size={15} />
                <span>Fechar Caixa e Zerar Painel</span>
              </button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Histórico de Fechamentos</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Relatórios consolidados de ciclos anteriores</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-semibold tabular-figure">
                {closings?.length || 0} arquivados
              </span>
            </div>

            {!closings || closings.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-xs">
                Nenhum encerramento de caixa arquivado até o momento.
              </div>
            ) : (
              <>
                <div className="md:hidden divide-y divide-white/[0.06]">
                  {[...closings]
                    .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
                    .map((c) => (
                      <div key={c.id} className="p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-white">{c.periodName}</span>
                          <strong className="text-sm font-bold text-emerald-400 tabular-figure">
                            {money(c.profit || 0)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>{new Date(c.closedAt).toLocaleDateString('pt-BR')} · {c.salesCount} contr.</span>
                          {onDeleteClosing && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDialog({
                                  title: `Reabrir Caixa (${c.periodName})`,
                                  message:
                                    'O faturamento consolidado deste período será restaurado no Painel Principal. Deseja prosseguir?',
                                  onConfirm: () => {
                                    onDeleteClosing(c.id);
                                    showToast('Fechamento cancelado! Caixa reaberto.', 'success');
                                  },
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-red-400 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={12} /> Reabrir
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-xs text-zinc-400 font-semibold bg-white/[0.02]">
                        <th className="p-4 pl-6">Período</th>
                        <th className="p-4 text-center">Fechamento</th>
                        <th className="p-4 text-center">Contratos</th>
                        <th className="p-4 text-center">Volume</th>
                        <th className="p-4 text-right pr-6 text-emerald-400">Faturamento</th>
                        {onDeleteClosing && <th className="p-4 text-center w-24">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {[...closings]
                        .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-white/[0.02] transition-colors h-14">
                            <td className="p-4 pl-6 font-semibold text-sm text-white">{c.periodName}</td>
                            <td className="p-4 text-xs text-zinc-400 text-center tabular-figure">
                              {new Date(c.closedAt).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-4 text-xs text-zinc-300 text-center tabular-figure">
                              {c.salesCount} contrato(s)
                            </td>
                            <td className="p-4 text-xs text-zinc-200 text-center tabular-figure">
                              {money(c.totalSales || 0)}
                            </td>
                            <td className="p-4 text-sm font-bold text-emerald-400 text-right pr-6 tabular-figure">
                              {money(c.profit || 0)}
                            </td>
                            {onDeleteClosing && (
                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDialog({
                                      title: `Reabrir Caixa (${c.periodName})`,
                                      message:
                                        'O faturamento consolidado deste período será restaurado no Painel Principal. Deseja prosseguir?',
                                      onConfirm: () => {
                                        onDeleteClosing(c.id);
                                        showToast('Fechamento cancelado! Caixa reaberto.', 'success');
                                      },
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-red-500/15 text-zinc-300 hover:text-red-400 border border-white/[0.08] hover:border-red-500/35 text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <RotateCcw size={12} />
                                  <span>Reabrir</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setConfirmDialog(null)} />
          <div className="relative w-full max-w-sm glass-card p-6 bg-[#0d111a] text-center">
            <h3 className="text-base font-bold text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{confirmDialog.message}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="h-10 rounded-xl bg-gold text-[#07090e] text-xs font-bold cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TEMPLATE DE IMPRESSÃO / PDF OFICIAL                                    */}
      {/* ========================================================================= */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div id="report-pdf-content" className="bg-white p-10 text-zinc-900 w-[790px] font-sans flex flex-col gap-6" style={{ width: '790px' }}>
          
          {/* Header */}
          <div className="border-b-2 border-zinc-900 pb-4 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest block">
                {settings.companyName || 'NEXUS COMMERCE'}
              </span>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-900 mt-0.5">
                Relatório de Parcelas & Previsão Mensal
              </h1>
              <p className="text-xs font-bold uppercase text-zinc-600 tracking-wider">
                Mês de Referência: {MONTH_NAMES[selectedMonthIndex]} de {selectedYear}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Emissão:</span>
              <span className="text-xs font-bold text-zinc-700 block">{new Date().toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Dados do Operador & Empresa */}
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Responsável Comercial</span>
              <strong className="block text-sm text-zinc-800 mt-0.5 uppercase">{settings.userName || 'Operador Responsável'}</strong>
              <span className="block text-zinc-500 mt-0.5">{settings.userRole || 'Operador'} — {settings.userFunction || 'Gestão'}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Estimativa Mensal da Carteira</span>
              <strong className="block text-sm text-zinc-900 mt-0.5">{money(portfolioMonthlyEstimate.monthlySum)} / mês</strong>
              <span className="block text-zinc-500 mt-0.5 text-[10px]">{portfolioMonthlyEstimate.activeContractsCount} contratos ativos</span>
            </div>
          </div>

          {/* Resumo do Mês Selecionado */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 border border-amber-300 bg-amber-50/50 rounded-xl text-center">
              <span className="text-[8px] text-amber-900 font-bold uppercase tracking-widest block mb-1">Soma das Parcelas</span>
              <strong className="text-base font-black text-amber-900">{money(monthStats.totalExpected)}</strong>
              <span className="text-[8px] text-zinc-500 block mt-0.5">{monthStats.countTotal} parcelas</span>
            </div>
            <div className="p-3.5 border border-green-300 bg-green-50/50 rounded-xl text-center">
              <span className="text-[8px] text-green-900 font-bold uppercase tracking-widest block mb-1">Já Recebido</span>
              <strong className="text-base font-black text-green-700">{money(monthStats.totalPaid)}</strong>
              <span className="text-[8px] text-green-700 font-bold block mt-0.5">{monthStats.countPaid} quitadas</span>
            </div>
            <div className="p-3.5 border border-zinc-200 bg-zinc-50 rounded-xl text-center">
              <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest block mb-1">Falta Receber</span>
              <strong className="text-base font-black text-zinc-800">{money(monthStats.totalUnpaid)}</strong>
              <span className="text-[8px] text-zinc-500 block mt-0.5">{monthStats.countPending} no prazo</span>
            </div>
            <div className="p-3.5 border border-red-300 bg-red-50/50 rounded-xl text-center">
              <span className="text-[8px] text-red-900 font-bold uppercase tracking-widest block mb-1">Em Atraso</span>
              <strong className="text-base font-black text-red-700">{money(monthStats.totalOverdue)}</strong>
              <span className="text-[8px] text-red-700 font-bold block mt-0.5">{monthStats.countOverdue} atrasadas</span>
            </div>
          </div>

          {/* Tabela de Parcelas */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-black uppercase text-zinc-800 tracking-wider">
              Demonstrativo de Parcelas — {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-zinc-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-zinc-900 text-white text-[9px] uppercase font-bold text-center">
                  <th className="p-2 text-left">Cliente</th>
                  <th className="p-2 text-left">Produto</th>
                  <th className="p-2">Parcela</th>
                  <th className="p-2">Vencimento</th>
                  <th className="p-2">Situação</th>
                  <th className="p-2 text-right">Valor da Parcela</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {monthInstallments.slice(0, 20).map((inst) => (
                  <tr key={inst.id} className="text-center">
                    <td className="p-2 text-left font-bold text-zinc-900">{inst.client}</td>
                    <td className="p-2 text-left text-zinc-600">{inst.productName}</td>
                    <td className="p-2 text-zinc-600 font-medium">{inst.number}/{inst.total}</td>
                    <td className="p-2 text-zinc-600 font-medium">{formatDateBR(inst.dueDate)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        inst.status === 'Pago' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="p-2 text-right font-bold text-zinc-900">{money(Number(inst.value) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {monthInstallments.length > 20 && (
              <p className="text-[8px] text-zinc-400 italic text-right">
                * Exibindo as primeiras 20 de {monthInstallments.length} parcelas deste mês.
              </p>
            )}
          </div>

          {/* Projeção dos Próximos Meses */}
          <div className="flex flex-col gap-2 mt-2">
            <h3 className="text-xs font-black uppercase text-zinc-800 tracking-wider">
              Resumo dos Próximos 6 Meses
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {projectionTimeline.slice(3, 9).map((m) => (
                <div key={m.key} className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center">
                  <span className="text-[8px] text-zinc-500 font-bold uppercase block">{m.shortLabel}</span>
                  <strong className="text-xs font-black text-zinc-900 block mt-0.5">{money(m.previsto)}</strong>
                  <span className="text-[7px] text-zinc-500 block">{m.count} parc.</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-6 border-t border-zinc-200 pt-3 flex justify-between items-center text-[9px] text-zinc-400 uppercase font-mono">
            <span>RELATÓRIO DE GESTÃO COMERCIAL — SISTEMA NEXUS</span>
            <span>AUTENTICAÇÃO: NX-{Date.now().toString(36).toUpperCase()}</span>
          </div>

        </div>
      </div>

    </div>
  );
}
