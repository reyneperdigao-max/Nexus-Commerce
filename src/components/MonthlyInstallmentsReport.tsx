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
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
            <span className="text-[10px] font-black uppercase text-gold tracking-widest">Controle Financeiro</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase mt-0.5">
            Relatório de Parcelas & Previsão Mensal
          </h2>
          <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1">
            Soma exata das parcelas do mês e estimativa mensal da carteira de contratos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Aba de Navegação Simples */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-line-strong">
            <button
              onClick={() => handleTabChange('installments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'installments'
                  ? 'bg-gold text-black shadow-lg shadow-gold/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar size={14} />
              <span>Previsão de Parcelas</span>
            </button>
            <button
              onClick={() => handleTabChange('closings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'closings'
                  ? 'bg-gold text-black shadow-lg shadow-gold/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={14} />
              <span>Fechamento de Caixa</span>
            </button>
          </div>

          {/* Botão de Exportar PDF */}
          <button
            onClick={onDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            title="Exportar Relatório Mensal em PDF"
          >
            <FileText size={15} className="text-gold" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* CARD 1: SOMA DE TODAS AS PARCELAS DO MÊS SELECIONADO */}
            <div className="glass-card p-5 sm:p-6 border-2 border-gold/40 bg-gold/[0.04] flex flex-col justify-between rounded-2xl relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 text-gold pointer-events-none">
                <DollarSign size={64} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gold font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                    Soma das Parcelas do Mês
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gold/20 text-gold border border-gold/40">
                    {monthStats.countTotal} parcelas
                  </span>
                </div>
                <strong className="text-2xl sm:text-3xl font-black text-gold mt-3 block tracking-tight">
                  {money(monthStats.totalExpected)}
                </strong>
                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                  Total de todas as parcelas com vencimento em {MONTH_NAMES[selectedMonthIndex]}/{selectedYear}
                </p>
              </div>

              <div className="border-t border-gold/20 pt-3 mt-4 flex items-center justify-between text-xs text-zinc-300 font-bold">
                <span>Taxa de Quitação:</span>
                <span className="text-white font-black">{monthStats.completionRate.toFixed(0)}% liquidado</span>
              </div>
            </div>

            {/* CARD 2: JÁ RECEBIDO NO MÊS */}
            <div className="glass-card p-5 sm:p-6 border border-green-500/30 bg-green-500/[0.03] flex flex-col justify-between rounded-2xl relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 text-green-400 pointer-events-none">
                <CheckCircle2 size={64} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-green-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Já Recebido no Mês
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/40">
                    {monthStats.countPaid} pagas
                  </span>
                </div>
                <strong className="text-2xl sm:text-3xl font-black text-green-neon mt-3 block tracking-tight">
                  {money(monthStats.totalPaid)}
                </strong>
                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                  Montante já quitado e confirmado para este mês
                </p>
              </div>

              <div className="border-t border-green-500/20 pt-3 mt-4 flex items-center justify-between text-xs text-zinc-300 font-bold">
                <span>Parcelas Quitadas:</span>
                <span className="text-green-neon font-black">{monthStats.countPaid} de {monthStats.countTotal}</span>
              </div>
            </div>

            {/* CARD 3: SALDO PENDENTE A RECEBER NO MÊS */}
            <div className="glass-card p-5 sm:p-6 border border-amber-500/30 bg-amber-500/[0.03] flex flex-col justify-between rounded-2xl relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 text-amber-400 pointer-events-none">
                <Clock size={64} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Falta Receber no Mês
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {monthStats.countPending + monthStats.countOverdue} a receber
                  </span>
                </div>
                <strong className="text-2xl sm:text-3xl font-black text-amber-200 mt-3 block tracking-tight">
                  {money(monthStats.totalUnpaid)}
                </strong>
                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                  Saldo pendente de parcelas a vencer ou em atraso
                </p>
              </div>

              <div className="border-t border-amber-500/20 pt-3 mt-4 flex items-center justify-between text-xs text-zinc-300 font-bold">
                <span>Em atraso:</span>
                <span className={monthStats.countOverdue > 0 ? "text-red-400 font-black" : "text-zinc-400 font-black"}>
                  {money(monthStats.totalOverdue)} ({monthStats.countOverdue} parc.)
                </span>
              </div>
            </div>

            {/* CARD 4: ESTIMATIVA MENSAL DA CARTEIRA (TODAS AS VENDAS ATIVAS) */}
            <div className="glass-card p-5 sm:p-6 border border-blue-500/30 bg-blue-500/[0.03] flex flex-col justify-between rounded-2xl relative overflow-hidden group">
              <div className="absolute right-3 top-3 opacity-10 text-blue-400 pointer-events-none">
                <TrendingUp size={64} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Estimativa Mensal da Carteira
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {portfolioMonthlyEstimate.activeContractsCount} contratos
                  </span>
                </div>
                <strong className="text-2xl sm:text-3xl font-black text-blue-300 mt-3 block tracking-tight">
                  {money(portfolioMonthlyEstimate.monthlySum)}
                  <span className="text-xs text-blue-400 font-bold lowercase"> /mês</span>
                </strong>
                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">
                  Soma da mensalidade de todos os contratos ativos juntos
                </p>
              </div>

              <div className="border-t border-blue-500/20 pt-3 mt-4 flex items-center justify-between text-xs text-zinc-300 font-bold">
                <span>Saldo Futuro Total:</span>
                <span className="text-white font-black">{money(portfolioMonthlyEstimate.totalRemainingReceivables)}</span>
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
                  <Bar dataKey="previsto" fill="#FFD700" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {projectionTimeline.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.key === selectedMonth ? '#FFD700' : '#78620e'} 
                        stroke={entry.key === selectedMonth ? '#FFFFFF' : 'none'}
                        strokeWidth={entry.key === selectedMonth ? 2 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="recebido" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={28} />
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

          {/* ========================================================================= */}
          {/* 5. TABELA DETALHADA DE PARCELAS DO MÊS SELECIONADO                        */}
          {/* ========================================================================= */}
          <div className="glass-card border border-line-strong overflow-hidden bg-black/40 backdrop-blur-md rounded-2xl">
            {/* Cabeçalho da Tabela & Filtros */}
            <div className="p-4 sm:p-6 border-b border-line-strong flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black uppercase text-white">
                    Parcelas de {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-black uppercase border border-gold/30">
                    {filteredMonthInstallments.length} no total
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Lista completa de recebimentos previstos, baixas e cobranças
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Campo de Busca */}
                <div className="relative group min-w-[220px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={14} />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente ou produto..."
                    className="h-10 w-full bg-black border border-line-strong rounded-xl pl-9 pr-3 text-xs font-bold text-white outline-none focus:border-gold transition-all"
                  />
                </div>

                {/* Filtros por Status */}
                <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-[10px] font-black uppercase">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-gold text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    Todas ({monthStats.countTotal})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'pending' ? 'bg-amber-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    A Vencer ({monthStats.countPending})
                  </button>
                  <button
                    onClick={() => setStatusFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'paid' ? 'bg-green-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    Pagas ({monthStats.countPaid})
                  </button>
                  <button
                    onClick={() => setStatusFilter('overdue')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === 'overdue' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    Atrasadas ({monthStats.countOverdue})
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo da Tabela */}
            {filteredMonthInstallments.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center">
                <Calendar size={44} className="text-zinc-700 mb-3" />
                <p className="text-gray-400 uppercase font-black text-xs tracking-widest">
                  Nenhuma parcela encontrada para os filtros selecionados neste mês.
                </p>
                <button
                  onClick={() => { setStatusFilter('all'); setSearchTerm(''); }}
                  className="mt-3 text-xs text-gold font-bold uppercase hover:underline cursor-pointer"
                >
                  Limpar Filtros de Busca
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[780px]">
                  <thead>
                    <tr className="border-b border-line-strong text-[10px] uppercase text-zinc-400 font-black bg-white/[0.02] h-12">
                      <th className="p-4 pl-6">Cliente</th>
                      <th className="p-4">Produto</th>
                      <th className="p-4 text-center">Nº Parcela</th>
                      <th className="p-4 text-center">Data Vencimento</th>
                      <th className="p-4 text-center">Valor da Parcela</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right pr-6">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
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
                          
                          {/* Nome do Cliente */}
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 text-gold font-black text-xs flex items-center justify-center shrink-0">
                                {inst.client ? inst.client.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <span className="uppercase text-white font-bold tracking-wide text-xs">
                                {inst.client}
                              </span>
                            </div>
                          </td>

                          {/* Nome do Produto */}
                          <td className="p-4">
                            <span className="text-xs text-zinc-300 font-medium">
                              {inst.productName || 'Produto Registrado'}
                            </span>
                          </td>

                          {/* Número da Parcela */}
                          <td className="p-4 text-xs text-zinc-300 font-black text-center">
                            <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">
                              {String(inst.number).padStart(2, '0')} / {String(inst.total).padStart(2, '0')}
                            </span>
                          </td>

                          {/* Data de Vencimento */}
                          <td className="p-4 text-xs text-zinc-300 font-bold text-center">
                            {formatDateBR(inst.dueDate)}
                          </td>

                          {/* Valor da Parcela */}
                          <td className="p-4 text-center font-black text-sm">
                            <span className={isPaid ? 'text-green-neon' : 'text-gold'}>
                              {money(Number(inst.value) || 0)}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="p-4 text-center">
                            {isPaid && (
                              <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-neon border border-green-500/30 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <Check size={11} /> Pago
                              </span>
                            )}
                            {!isPaid && isDueToday && (
                              <span className="px-2.5 py-1 rounded-md bg-gold/20 text-gold border border-gold/40 text-[10px] font-black uppercase tracking-wider animate-pulse inline-flex items-center gap-1">
                                <Clock size={11} /> Vence Hoje
                              </span>
                            )}
                            {!isPaid && isOverdue && (
                              <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <AlertTriangle size={11} /> {diffDays}d em atraso
                              </span>
                            )}
                            {!isPaid && !isDueToday && !isOverdue && (
                              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                                A Vencer
                              </span>
                            )}
                          </td>

                          {/* Ações Comerciais */}
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isPaid && (
                                <>
                                  <button
                                    onClick={() => sendWhatsAppReminder(inst)}
                                    className="h-8 px-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                    title="Cobrar via WhatsApp"
                                  >
                                    <MessageCircle size={13} />
                                    <span>Cobrar</span>
                                  </button>
                                  <button
                                    onClick={() => onPayInstallment(inst)}
                                    className="h-8 px-3.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95"
                                    title="Registrar Pagamento / Baixa"
                                  >
                                    Dar Baixa
                                  </button>
                                </>
                              )}

                              {isPaid && (
                                <button
                                  onClick={() => onViewReceipt(inst)}
                                  className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                  title="Ver Comprovante de Pagamento"
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
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: FECHAMENTO DE CAIXA DO CICLO                                      */}
      {/* ========================================================================= */}
      {activeTab === 'closings' && (
        <div className="flex flex-col gap-6">
          {/* Card de Ação para Fechar Caixa (Configuração Nexus Private) */}
          <div className="glass-card p-6 border border-amber-500/30 bg-amber-500/[0.03] rounded-2xl flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                  <h3 className="text-base sm:text-lg font-black text-amber-200 uppercase tracking-wider">
                    Consolidar e Fechar Caixa Mensal
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Padrão Nexus Private
                  </span>
                </div>
                <p className="text-xs text-amber-100/80 max-w-2xl leading-relaxed">
                  Ao consolidar o fechamento de caixa, o faturamento realizado no ciclo (<strong className="text-gold">{money(cycleRealizedFaturamento)}</strong>) será arquivado para registro contábil e o <strong className="text-white">faturamento do mês no Dashboard será ZERADO</strong> para a abertura de um novo ciclo comercial.
                </p>
              </div>

              {/* Status do Ciclo */}
              <div className="px-3.5 py-2 rounded-xl bg-black/60 border border-amber-500/20 text-right shrink-0">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Status do Caixa</span>
                <span className="text-xs font-black text-amber-300 uppercase block mt-0.5">
                  {lastClosingDate ? `Último Fechamento: ${new Date(lastClosingDate).toLocaleDateString('pt-BR')}` : 'Ciclo Inicial Aberto'}
                </span>
              </div>
            </div>

            {/* Painel com Métricas do Ciclo Atual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-500/20">
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Faturamento do Ciclo Aberto</span>
                <strong className="text-xl sm:text-2xl font-black text-gold mt-1 block">
                  {money(cycleRealizedFaturamento)}
                </strong>
                <span className="text-[9px] text-zinc-400 mt-1 block">
                  Entradas: {money(cycleDownPayments)} | Parcelas: {money(cyclePaidInstallments)}
                </span>
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest mt-1">
                  ↓ Será zerado no Dashboard ao fechar
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Novos Contratos no Ciclo</span>
                <strong className="text-xl sm:text-2xl font-black text-white mt-1 block">
                  {cycleSalesCount} {cycleSalesCount === 1 ? 'venda' : 'vendas'}
                </strong>
                <span className="text-[9px] text-zinc-400 mt-1 block">
                  Capital Movimentado: {money(cycleSalesVolume)}
                </span>
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-1">
                  Ativas aguardando consolidação
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Carteira Ativa Geral</span>
                <strong className="text-xl sm:text-2xl font-black text-zinc-200 mt-1 block">
                  {money(portfolioMonthlyEstimate.monthlySum)} <span className="text-xs text-zinc-500 font-normal">/mês</span>
                </strong>
                <span className="text-[9px] text-zinc-400 mt-1 block">
                  {portfolioMonthlyEstimate.activeContractsCount} contratos ativos no sistema
                </span>
                <span className="text-[8px] font-black text-green-neon uppercase tracking-widest mt-1">
                  Base recorrente contínua
                </span>
              </div>
            </div>

            {/* Ação de Fechamento */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2 border-t border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider shrink-0">Etiqueta do Ciclo:</span>
                <input 
                  type="text"
                  placeholder="Ex: Maio de 2026"
                  defaultValue={`${MONTH_NAMES[selectedMonthIndex]} de ${selectedYear}`}
                  id="closingPeriodInput"
                  className="h-11 px-4 bg-black/80 border border-zinc-700 rounded-xl outline-none text-xs font-bold text-white focus:border-gold min-w-[200px]"
                />
              </div>

              <button
                onClick={() => {
                  const inputEl = document.getElementById('closingPeriodInput') as HTMLInputElement;
                  const periodVal = inputEl?.value?.trim() || `${MONTH_NAMES[selectedMonthIndex]} de ${selectedYear}`;

                  const confirmMsg = `Confirma o Fechamento de Caixa para "${periodVal}"?\n\n` +
                    `• Faturamento a Consolidar: ${money(cycleRealizedFaturamento)}\n` +
                    `• Novos Contratos: ${cycleSalesCount} (${money(cycleSalesVolume)})\n\n` +
                    `Configuração Nexus Private: O faturamento do mês no Dashboard será ZERADO imediatamente para o início do novo ciclo contábil.`;

                  if (confirm(confirmMsg)) {
                    onCloseRegister(periodVal, cycleRealizedFaturamento, cycleSalesVolume, cycleSalesCount);
                    if (inputEl) inputEl.value = '';
                    showToast('Fechamento de caixa concluído com sucesso! O faturamento do mês no Dashboard foi zerado.', 'success');
                  }
                }}
                className="h-11 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers size={16} />
                <span>Fechar Caixa e Zerar Dashboard</span>
              </button>
            </div>
          </div>

          {/* Histórico de Fechamentos */}
          <div className="glass-card border border-line-strong overflow-hidden rounded-2xl">
            <div className="p-5 border-b border-line-strong flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase text-white">Histórico de Fechamentos Anteriores</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Relatórios consolidados de períodos passados</p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-zinc-850 text-zinc-300 text-[10px] font-black uppercase">
                {closings?.length || 0} Arquivados
              </span>
            </div>

            {!closings || closings.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 uppercase font-black text-xs">
                Nenhum encerramento de caixa arquivado até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase text-zinc-400 font-black bg-white/[0.02]">
                      <th className="p-4 pl-6">Período Consolidado</th>
                      <th className="p-4 text-center">Data do Fechamento</th>
                      <th className="p-4 text-center">Novos Contratos</th>
                      <th className="p-4 text-center">Capital Movimentado</th>
                      <th className="p-4 text-right pr-6 text-green-neon">Faturamento Consolidado</th>
                      {onDeleteClosing && (
                        <th className="p-4 text-center w-24">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {closings
                      .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.01] transition-colors h-14">
                          <td className="p-4 pl-6 font-black text-sm text-white uppercase">
                            📁 {c.periodName}
                          </td>
                          <td className="p-4 text-xs text-zinc-400 font-bold text-center">
                            {new Date(c.closedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-4 text-xs text-zinc-300 font-bold text-center">
                            {c.salesCount} contrato(s)
                          </td>
                          <td className="p-4 text-xs text-zinc-200 font-bold text-center">
                            {money(c.totalSales || 0)}
                          </td>
                          <td className="p-4 text-sm font-black text-green-neon text-right pr-6">
                            {money(c.profit || 0)}
                          </td>
                          {onDeleteClosing && (
                            <td className="p-4 text-center">
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja reabrir o caixa de "${c.periodName}"? O faturamento deste período será restabelecido no Dashboard.`)) {
                                    onDeleteClosing(c.id);
                                    showToast('Fechamento cancelado! Caixa reaberto.', 'success');
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-zinc-850 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-750 hover:border-red-500/40 text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="Reabrir este caixa e restaurar movimentação no Dashboard"
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
            )}
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
