import { Installment, Sale } from '../types';

export interface SaleInvestmentSummary {
  originalCost: number;
  remainingInvested: number;
  recoveredCapital: number;
  isFullyPaid: boolean;
}

export function calculateSaleInvestment(
  sale: Sale,
  saleInstallments: Installment[]
): SaleInvestmentSummary {
  const originalCost = Number(sale.costPrice) > 0 ? Number(sale.costPrice) : 0;
  if (originalCost <= 0) {
    return {
      originalCost: 0,
      remainingInvested: 0,
      recoveredCapital: 0,
      isFullyPaid: sale.status === 'Liquidada',
    };
  }

  const pendingInsts = saleInstallments.filter((i) => i.status === 'Pendente');
  const isFullyPaid =
    sale.status === 'Liquidada' ||
    (saleInstallments.length > 0 && pendingInsts.length === 0);

  if (isFullyPaid) {
    return {
      originalCost,
      remainingInvested: 0,
      recoveredCapital: originalCost,
      isFullyPaid: true,
    };
  }

  let remainingInvested = originalCost;

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
    const ratio =
      originalPrincipal > 0
        ? Math.max(0, Math.min(1, currentPrincipal / originalPrincipal))
        : 0;
    remainingInvested = originalCost * ratio;
  } else {
    const downPayment = Math.max(0, Number(sale.downPayment) || 0);
    const totalInstOriginal = saleInstallments.reduce(
      (acc, i) => acc + (Number(i.originalValue ?? i.value) || 0),
      0
    );
    const pendingOriginal = pendingInsts.reduce(
      (acc, i) => acc + (Number(i.originalValue ?? i.value) || 0),
      0
    );
    const effectiveTotal =
      totalInstOriginal + downPayment > 0
        ? totalInstOriginal + downPayment
        : Number(sale.total) || 0;

    if (effectiveTotal > 0 && saleInstallments.length > 0) {
      const ratio = Math.max(0, Math.min(1, pendingOriginal / effectiveTotal));
      remainingInvested = originalCost * ratio;
    } else if (effectiveTotal > 0 && downPayment > 0) {
      const ratio = Math.max(
        0,
        Math.min(1, (effectiveTotal - downPayment) / effectiveTotal)
      );
      remainingInvested = originalCost * ratio;
    }
  }

  const safeRemaining = Number(
    Math.max(0, Math.min(originalCost, remainingInvested)).toFixed(2)
  );
  const recoveredCapital = Number(
    Math.max(0, originalCost - safeRemaining).toFixed(2)
  );

  return {
    originalCost,
    remainingInvested: safeRemaining,
    recoveredCapital,
    isFullyPaid: false,
  };
}
