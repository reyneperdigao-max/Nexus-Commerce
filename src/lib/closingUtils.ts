import { Closing, Installment, Sale } from '../types';
import { isSameMonthAndYear, parseDateSafe, parseDateToMidnight } from './dateUtils';
import { calculateSaleInvestment } from './investmentUtils';

export interface CycleFinancialMetrics {
  faturamentoTotal: number;
  entriesTotal: number;
  installmentsTotal: number;
  capitalRecovery: number;
  netProfit: number;
  profitMarginPct: number;
  capitalSharePct: number;
  salesCount: number;
  salesVolume: number;
  averageTicket: number;
  pendingOverdueAmount: number;
  pendingOverdueCount: number;
  cycleSales: Sale[];
  cyclePaidInstallments: Installment[];
  cycleOverdueInstallments: Installment[];
}

export interface ResolvedClosingSummary {
  closing: Closing;
  faturamento: number;
  capitalRecovery: number;
  netProfit: number;
  profitMarginPct: number;
  capitalSharePct: number;
  salesCount: number;
  salesVolume: number;
  averageTicket: number;
  entriesTotal: number;
  installmentsTotal: number;
  pendingOverdueAmount: number;
  pendingOverdueCount: number;
  isLegacySnapshot: boolean;
  cycleSales: Sale[];
  cyclePaidInstallments: Installment[];
}

function toTimestampMs(dateStr?: string | null): number {
  if (!dateStr) return NaN;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return NaN;
  if (trimmed.includes('T')) {
    const ms = new Date(trimmed).getTime();
    if (!isNaN(ms)) return ms;
  }
  const parsed = parseDateSafe(trimmed);
  if (parsed) {
    return new Date(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0, 0).getTime();
  }
  return new Date(trimmed).getTime();
}

function isAfterTimestamp(dateStr: string | undefined, boundaryIso: string): boolean {
  if (!boundaryIso) return true;
  if (!dateStr) return false;
  const itemMs = toTimestampMs(dateStr);
  const boundaryMs = new Date(boundaryIso).getTime();
  if (isNaN(itemMs) || isNaN(boundaryMs)) return false;
  return itemMs > boundaryMs;
}

function buildSaleInstallmentMap(installments: Installment[]): Map<string, Installment[]> {
  const map = new Map<string, Installment[]>();
  installments.forEach((inst) => {
    if (!inst.saleId) return;
    const list = map.get(inst.saleId) || [];
    list.push(inst);
    map.set(inst.saleId, list);
  });
  return map;
}

/**
 * Computes proportional capital recovery (cost amortization) for a single down payment
 * or a single paid installment, matching calculateSaleInvestment in investmentUtils.ts.
 */
function getSalePaymentCapitalRatio(sale: Sale | undefined, saleInstallments: Installment[]): {
  standardRatio: number;
  interestPrincipalRatio: number;
  hasCost: boolean;
} {
  if (!sale) {
    return { standardRatio: 0, interestPrincipalRatio: 0, hasCost: false };
  }
  const cost = Math.max(0, Number(sale.costPrice) || 0);
  if (cost <= 0) {
    return { standardRatio: 0, interestPrincipalRatio: 0, hasCost: false };
  }

  if (sale.isInterestOnly) {
    const amortizedPrincipal = saleInstallments
      .filter(
        (i) =>
          i.status === 'Pago' &&
          (i.productName || '').includes('(Amortização de Principal)')
      )
      .reduce((acc, i) => acc + (Number(i.value) || 0), 0);
    const currentPrincipal = Math.max(0, Number(sale.total) || 0);
    const originalPrincipal = currentPrincipal + amortizedPrincipal;
    const interestPrincipalRatio =
      originalPrincipal > 0 ? Math.max(0, Math.min(1, cost / originalPrincipal)) : 0;

    return {
      standardRatio: interestPrincipalRatio,
      interestPrincipalRatio,
      hasCost: true,
    };
  }

  const downPayment = Math.max(0, Number(sale.downPayment) || 0);
  const totalInstOriginal = saleInstallments.reduce(
    (acc, i) => acc + (Number(i.originalValue ?? i.value) || 0),
    0
  );
  const effectiveTotal =
    totalInstOriginal + downPayment > 0
      ? totalInstOriginal + downPayment
      : Math.max(0, Number(sale.total) || 0);

  const standardRatio = effectiveTotal > 0 ? Math.max(0, Math.min(1, cost / effectiveTotal)) : 0;

  return {
    standardRatio,
    interestPrincipalRatio: standardRatio,
    hasCost: true,
  };
}

function computeCapitalRecoveryForCashflows(
  downPaymentSales: Sale[],
  paidInstallments: Installment[],
  salesById: Map<string, Sale>,
  installmentsBySaleId: Map<string, Installment[]>
): number {
  let capitalRecovery = 0;

  downPaymentSales.forEach((sale) => {
    const dp = Math.max(0, Number(sale.downPayment) || 0);
    if (dp <= 0) return;
    const sInsts = installmentsBySaleId.get(sale.id) || [];
    const ratios = getSalePaymentCapitalRatio(sale, sInsts);
    if (!ratios.hasCost) return;
    capitalRecovery += dp * ratios.standardRatio;
  });

  paidInstallments.forEach((inst) => {
    const paidVal = Math.max(0, Number(inst.value) || 0);
    if (paidVal <= 0) return;
    const sale = salesById.get(inst.saleId);
    if (!sale) return;

    const sInsts = installmentsBySaleId.get(sale.id) || [];
    const ratios = getSalePaymentCapitalRatio(sale, sInsts);
    if (!ratios.hasCost) return;

    if (sale.isInterestOnly) {
      const isAmortization = (inst.productName || '').includes('(Amortização de Principal)');
      if (isAmortization) {
        capitalRecovery += paidVal * ratios.interestPrincipalRatio;
      }
      // Regular monthly interest payment is 100% realized profit (0 capital amortization)
    } else {
      const baseVal = Math.max(0, Number(inst.originalValue ?? inst.value) || paidVal);
      const capPart = Math.min(paidVal, baseVal * ratios.standardRatio);
      capitalRecovery += capPart;
    }
  });

  return Number(capitalRecovery.toFixed(2));
}

/**
 * Computes complete financial metrics for the currently open register cycle.
 */
export function computeOpenCycleMetrics(
  sales: Sale[],
  installments: Installment[],
  lastClosingDate: string,
  referenceDate: Date = new Date()
): CycleFinancialMetrics {
  const validSaleIds = new Set(sales.map((s) => s.id));
  const salesById = new Map(sales.map((s) => [s.id, s]));
  const validInstallments = installments.filter((i) => !i.saleId || validSaleIds.has(i.saleId));
  const installmentsBySaleId = buildSaleInstallmentMap(validInstallments);

  const cycleSales = sales.filter(
    (s) =>
      isSameMonthAndYear(s.createdAt || s.date, referenceDate) &&
      isAfterTimestamp(s.createdAt || s.date, lastClosingDate)
  );

  const entriesTotal = Number(
    cycleSales.reduce((acc, s) => acc + Math.max(0, Number(s.downPayment) || 0), 0).toFixed(2)
  );

  const cyclePaidInstallments = validInstallments.filter(
    (i) =>
      i.status === 'Pago' &&
      isSameMonthAndYear(i.paidAt || i.dueDate, referenceDate) &&
      isAfterTimestamp(i.paidAt || i.dueDate, lastClosingDate)
  );

  const installmentsTotal = Number(
    cyclePaidInstallments.reduce((acc, i) => acc + Math.max(0, Number(i.value) || 0), 0).toFixed(2)
  );

  const faturamentoTotal = Number((entriesTotal + installmentsTotal).toFixed(2));

  const rawCapRecovery = computeCapitalRecoveryForCashflows(
    cycleSales,
    cyclePaidInstallments,
    salesById,
    installmentsBySaleId
  );
  const capitalRecovery = Number(Math.min(faturamentoTotal, rawCapRecovery).toFixed(2));
  const netProfit = Number(Math.max(0, faturamentoTotal - capitalRecovery).toFixed(2));

  const profitMarginPct = faturamentoTotal > 0 ? (netProfit / faturamentoTotal) * 100 : 0;
  const capitalSharePct = faturamentoTotal > 0 ? (capitalRecovery / faturamentoTotal) * 100 : 0;

  const salesCount = cycleSales.length;
  const salesVolume = Number(
    cycleSales.reduce((acc, s) => acc + Math.max(0, Number(s.total) || 0), 0).toFixed(2)
  );
  const averageTicket = salesCount > 0 ? Number((salesVolume / salesCount).toFixed(2)) : 0;

  // Pendências do Ciclo: parcelas vencidas dentro do mês de referência em atraso antes do fechamento
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );

  const fullyPaidSaleIds = new Set<string>();
  sales.forEach((s) => {
    const sInsts = installmentsBySaleId.get(s.id) || [];
    const isFullyPaid =
      s.status === 'Liquidada' || (sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago'));
    if (isFullyPaid) fullyPaidSaleIds.add(s.id);
  });

  const cycleOverdueInstallments = validInstallments.filter((inst) => {
    if (inst.saleId && fullyPaidSaleIds.has(inst.saleId)) return false;
    if (inst.status === 'Pago' || !inst.dueDate) return false;
    if (!isSameMonthAndYear(inst.dueDate, referenceDate)) return false;
    const due = parseDateToMidnight(inst.dueDate);
    return due.getTime() < today.getTime();
  });

  const pendingOverdueAmount = Number(
    cycleOverdueInstallments.reduce((acc, i) => acc + Math.max(0, Number(i.value) || 0), 0).toFixed(2)
  );
  const pendingOverdueCount = cycleOverdueInstallments.length;

  return {
    faturamentoTotal,
    entriesTotal,
    installmentsTotal,
    capitalRecovery,
    netProfit,
    profitMarginPct,
    capitalSharePct,
    salesCount,
    salesVolume,
    averageTicket,
    pendingOverdueAmount,
    pendingOverdueCount,
    cycleSales,
    cyclePaidInstallments,
    cycleOverdueInstallments,
  };
}

/**
 * Resolves full financial breakdown for any archived Closing record (supports both new enriched
 * closing snapshots and legacy closings such as 31/10/2026 without modifying database records).
 */
export function resolveClosingSummary(
  closing: Closing,
  allClosings: Closing[],
  sales: Sale[],
  installments: Installment[]
): ResolvedClosingSummary {
  const sortedAsc = [...allClosings].sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  const idx = sortedAsc.findIndex((c) => c.id === closing.id);
  const prevClosing = idx > 0 ? sortedAsc[idx - 1] : null;
  const closingEndDate = new Date(closing.closedAt);
  const closingEndMs = closingEndDate.getTime();
  const prevEndMs = prevClosing ? new Date(prevClosing.closedAt).getTime() : null;

  const isInClosedWindow = (dateStr?: string) => {
    if (!dateStr || isNaN(closingEndMs)) return false;
    const ms = toTimestampMs(dateStr);
    if (isNaN(ms)) return false;
    if (ms > closingEndMs) return false;
    if (prevEndMs !== null && !isNaN(prevEndMs)) {
      if (ms <= prevEndMs) return false;
    }
    return isSameMonthAndYear(dateStr, closingEndDate);
  };

  const validSaleIds = new Set(sales.map((s) => s.id));
  const salesById = new Map(sales.map((s) => [s.id, s]));
  const validInstallments = installments.filter((i) => !i.saleId || validSaleIds.has(i.saleId));
  const installmentsBySaleId = buildSaleInstallmentMap(validInstallments);

  const cycleSales = sales.filter((s) => isInClosedWindow(s.createdAt || s.date));
  const cyclePaidInstallments = validInstallments.filter(
    (i) => i.status === 'Pago' && isInClosedWindow(i.paidAt || i.dueDate)
  );

  const hasStoredBreakdown = closing.revenue !== undefined && closing.revenue !== null;

  if (hasStoredBreakdown) {
    const faturamento = Number(closing.revenue) || 0;
    const capitalRecovery = Number(Math.min(faturamento, Number(closing.capitalRecovery) || 0).toFixed(2));
    const netProfit = Number(
      (closing.netProfit !== undefined ? Number(closing.netProfit) : Math.max(0, faturamento - capitalRecovery)).toFixed(2)
    );
    const salesCount = Number(closing.salesCount) || 0;
    const salesVolume = Number(closing.totalSales) || 0;
    const averageTicket =
      closing.averageTicket !== undefined
        ? Number(closing.averageTicket) || 0
        : salesCount > 0
          ? Number((salesVolume / salesCount).toFixed(2))
          : 0;
    const entriesTotal =
      closing.entriesTotal !== undefined
        ? Number(closing.entriesTotal) || 0
        : Number(cycleSales.reduce((acc, s) => acc + Math.max(0, Number(s.downPayment) || 0), 0).toFixed(2));
    const installmentsTotal =
      closing.installmentsTotal !== undefined
        ? Number(closing.installmentsTotal) || 0
        : Number(cyclePaidInstallments.reduce((acc, i) => acc + Math.max(0, Number(i.value) || 0), 0).toFixed(2));

    return {
      closing,
      faturamento,
      capitalRecovery,
      netProfit,
      profitMarginPct: faturamento > 0 ? (netProfit / faturamento) * 100 : 0,
      capitalSharePct: faturamento > 0 ? (capitalRecovery / faturamento) * 100 : 0,
      salesCount,
      salesVolume,
      averageTicket,
      entriesTotal,
      installmentsTotal,
      pendingOverdueAmount: Number(closing.pendingOverdueAmount) || 0,
      pendingOverdueCount: Number(closing.pendingOverdueCount) || 0,
      isLegacySnapshot: false,
      cycleSales,
      cyclePaidInstallments,
    };
  }

  // Legacy closing fallback (older records stored realized faturamento in `profit` field)
  const faturamento = Number(closing.profit) || 0;
  const reconstructedCapRec = computeCapitalRecoveryForCashflows(
    cycleSales,
    cyclePaidInstallments,
    salesById,
    installmentsBySaleId
  );
  const capitalRecovery = Number(Math.min(faturamento, reconstructedCapRec).toFixed(2));
  const netProfit = Number(Math.max(0, faturamento - capitalRecovery).toFixed(2));
  const salesCount = Number(closing.salesCount) || cycleSales.length || 0;
  const salesVolume = Number(closing.totalSales) || 0;
  const averageTicket = salesCount > 0 ? Number((salesVolume / salesCount).toFixed(2)) : 0;

  const entriesTotal = Number(
    cycleSales.reduce((acc, s) => acc + Math.max(0, Number(s.downPayment) || 0), 0).toFixed(2)
  );
  const installmentsTotal = Number(
    cyclePaidInstallments.reduce((acc, i) => acc + Math.max(0, Number(i.value) || 0), 0).toFixed(2)
  );

  return {
    closing,
    faturamento,
    capitalRecovery,
    netProfit,
    profitMarginPct: faturamento > 0 ? (netProfit / faturamento) * 100 : 0,
    capitalSharePct: faturamento > 0 ? (capitalRecovery / faturamento) * 100 : 0,
    salesCount,
    salesVolume,
    averageTicket,
    entriesTotal,
    installmentsTotal,
    pendingOverdueAmount: 0,
    pendingOverdueCount: 0,
    isLegacySnapshot: true,
    cycleSales,
    cyclePaidInstallments,
  };
}

export interface CapitalYieldReportMetrics {
  activeRemainingInvested: number;
  activeOriginalInvested: number;
  activeCostedCount: number;
  totalInvestedAllTime: number;
  activeMonthlyProfit: number;
  activeCostedMonthlyProfit: number;
  monthlyRoiPct: number;
  pendingPortfolioProfit: number;
  pendingPortfolioCapital: number;
  totalRealizedProfitAllTime: number;
  overallRoiPct: number;
  monthExpectedProfit: number;
  monthRealizedProfit: number;
  monthPendingProfit: number;
  monthExpectedCapital: number;
  monthRealizedCapital: number;
}

function getInstallmentCapitalAndProfit(
  inst: Installment,
  sale: Sale | undefined,
  installmentsBySaleId: Map<string, Installment[]>
): { capital: number; profit: number } {
  const val = Math.max(0, Number(inst.value) || 0);
  if (val <= 0) return { capital: 0, profit: 0 };
  if (!sale) return { capital: 0, profit: val };

  const sInsts = installmentsBySaleId.get(sale.id) || [];
  const ratios = getSalePaymentCapitalRatio(sale, sInsts);
  if (!ratios.hasCost) {
    return { capital: 0, profit: val };
  }

  if (sale.isInterestOnly) {
    const isAmortization = (inst.productName || '').includes('(Amortização de Principal)');
    if (isAmortization) {
      const cap = Math.min(val, val * ratios.interestPrincipalRatio);
      return { capital: cap, profit: Math.max(0, val - cap) };
    }
    return { capital: 0, profit: val };
  }

  const baseVal = Math.max(0, Number(inst.originalValue ?? inst.value) || val);
  const cap = Math.min(val, baseVal * ratios.standardRatio);
  return { capital: cap, profit: Math.max(0, val - cap) };
}

/**
 * Computes how much profit the invested capital is generating across the active portfolio,
 * historical realized cashflows, and the currently selected report month.
 */
export function computeCapitalYieldMetrics(
  sales: Sale[],
  installments: Installment[],
  selectedMonthKey: string
): CapitalYieldReportMetrics {
  const validSaleIds = new Set(sales.map((s) => s.id));
  const salesById = new Map(sales.map((s) => [s.id, s]));
  const validInstallments = installments.filter((i) => !i.saleId || validSaleIds.has(i.saleId));
  const installmentsBySaleId = buildSaleInstallmentMap(validInstallments);

  const fullyPaidSaleIds = new Set<string>();
  sales.forEach((s) => {
    const sInsts = installmentsBySaleId.get(s.id) || [];
    const isFullyPaid =
      s.status === 'Liquidada' || (sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago'));
    if (isFullyPaid) fullyPaidSaleIds.add(s.id);
  });

  let activeRemainingInvested = 0;
  let activeOriginalInvested = 0;
  let activeCostedCount = 0;
  let totalInvestedAllTime = 0;
  let activeMonthlyProfit = 0;
  let activeCostedMonthlyProfit = 0;

  sales.forEach((s) => {
    const sInsts = installmentsBySaleId.get(s.id) || [];
    const cost = Math.max(0, Number(s.costPrice) || 0);
    const isActive = !fullyPaidSaleIds.has(s.id);

    if (cost > 0) {
      totalInvestedAllTime += cost;
      const invSummary = calculateSaleInvestment(s, sInsts);
      activeRemainingInvested += invSummary.remainingInvested;
      if (isActive) {
        activeOriginalInvested += cost;
        if (!invSummary.isFullyPaid && invSummary.remainingInvested > 0) {
          activeCostedCount += 1;
        }
      }
    }

    if (isActive) {
      const monthlyVal = Math.max(0, Number(s.installmentValue) || 0);
      const ratios = getSalePaymentCapitalRatio(s, sInsts);
      const monthlyProfitPart = s.isInterestOnly
        ? monthlyVal
        : monthlyVal * (1 - (ratios.hasCost ? ratios.standardRatio : 0));

      activeMonthlyProfit += monthlyProfitPart;
      if (cost > 0) {
        activeCostedMonthlyProfit += monthlyProfitPart;
      }
    }
  });

  let pendingPortfolioProfit = 0;
  let pendingPortfolioCapital = 0;

  validInstallments.forEach((inst) => {
    if (inst.saleId && fullyPaidSaleIds.has(inst.saleId)) return;
    if (inst.status !== 'Pendente') return;
    const sale = salesById.get(inst.saleId);
    const { capital, profit } = getInstallmentCapitalAndProfit(inst, sale, installmentsBySaleId);
    pendingPortfolioProfit += profit;
    pendingPortfolioCapital += capital;
  });

  // Total realized profit across all downPayments and paid installments
  let totalRealizedRevenueAllTime = 0;
  let totalRealizedCapitalAllTime = 0;

  sales.forEach((s) => {
    const dp = Math.max(0, Number(s.downPayment) || 0);
    if (dp <= 0) return;
    totalRealizedRevenueAllTime += dp;
    const sInsts = installmentsBySaleId.get(s.id) || [];
    const ratios = getSalePaymentCapitalRatio(s, sInsts);
    if (ratios.hasCost) {
      totalRealizedCapitalAllTime += dp * ratios.standardRatio;
    }
  });

  validInstallments.forEach((inst) => {
    if (inst.status !== 'Pago') return;
    const val = Math.max(0, Number(inst.value) || 0);
    totalRealizedRevenueAllTime += val;
    const sale = salesById.get(inst.saleId);
    const { capital } = getInstallmentCapitalAndProfit(inst, sale, installmentsBySaleId);
    totalRealizedCapitalAllTime += capital;
  });

  const totalRealizedProfitAllTime = Math.max(
    0,
    totalRealizedRevenueAllTime - Math.min(totalRealizedRevenueAllTime, totalRealizedCapitalAllTime)
  );

  // Selected month breakdown (active installments due in selectedMonthKey)
  let monthExpectedProfit = 0;
  let monthRealizedProfit = 0;
  let monthExpectedCapital = 0;
  let monthRealizedCapital = 0;

  validInstallments.forEach((inst) => {
    if (inst.saleId && fullyPaidSaleIds.has(inst.saleId)) return;
    if (!inst.dueDate) return;
    const parsed = parseDateSafe(inst.dueDate);
    if (!parsed) return;
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
    if (key !== selectedMonthKey) return;

    const sale = salesById.get(inst.saleId);
    const { capital, profit } = getInstallmentCapitalAndProfit(inst, sale, installmentsBySaleId);
    monthExpectedProfit += profit;
    monthExpectedCapital += capital;
    if (inst.status === 'Pago') {
      monthRealizedProfit += profit;
      monthRealizedCapital += capital;
    }
  });

  const roundedActiveRemaining = Number(activeRemainingInvested.toFixed(2));
  const roundedActiveCostedMonthly = Number(activeCostedMonthlyProfit.toFixed(2));
  const roundedTotalInvested = Number(totalInvestedAllTime.toFixed(2));
  const roundedTotalRealizedProfit = Number(totalRealizedProfitAllTime.toFixed(2));

  return {
    activeRemainingInvested: roundedActiveRemaining,
    activeOriginalInvested: Number(activeOriginalInvested.toFixed(2)),
    activeCostedCount,
    totalInvestedAllTime: roundedTotalInvested,
    activeMonthlyProfit: Number(activeMonthlyProfit.toFixed(2)),
    activeCostedMonthlyProfit: roundedActiveCostedMonthly,
    monthlyRoiPct:
      roundedActiveRemaining > 0
        ? (roundedActiveCostedMonthly / roundedActiveRemaining) * 100
        : 0,
    pendingPortfolioProfit: Number(pendingPortfolioProfit.toFixed(2)),
    pendingPortfolioCapital: Number(pendingPortfolioCapital.toFixed(2)),
    totalRealizedProfitAllTime: roundedTotalRealizedProfit,
    overallRoiPct:
      roundedTotalInvested > 0
        ? (roundedTotalRealizedProfit / roundedTotalInvested) * 100
        : 0,
    monthExpectedProfit: Number(monthExpectedProfit.toFixed(2)),
    monthRealizedProfit: Number(monthRealizedProfit.toFixed(2)),
    monthPendingProfit: Number(Math.max(0, monthExpectedProfit - monthRealizedProfit).toFixed(2)),
    monthExpectedCapital: Number(monthExpectedCapital.toFixed(2)),
    monthRealizedCapital: Number(monthRealizedCapital.toFixed(2)),
  };
}

