import { useState, type MouseEvent } from 'react';
import {
  ArrowLeft,
  Search,
  History,
  ChevronDown,
  ShoppingBag,
  Minus,
  PenTool,
  ShieldCheck,
  FileText,
  Download,
  Pencil,
  Trash2,
  MessageCircle,
  User,
  ArrowRight,
  Check,
  Clock,
  AlertCircle,
  X,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { Installment, Sale } from '../../types';
import { formatLocalDateBR, parseDateToMidnight } from '../../lib/dateUtils';
import { calculateSaleInvestment } from '../../lib/investmentUtils';

interface ClientsViewProps {
  sales: Sale[];
  installments: Installment[];
  clientsList: string[];
  filteredClients: string[];
  selectedClient: string | null;
  setSelectedClient: (client: string | null) => void;
  expandedSaleId: string | null;
  setExpandedSaleId: (id: string | null) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  todayTime: Date;
  money: (val: number) => string;
  onOpenAmortize: (pendingInst: Installment) => void;
  onOpenShareSignModal: (sale: Sale) => void;
  onOpenAuditModal: (sale: Sale) => void;
  onViewContract: (sale: Sale) => void;
  onDownloadContract: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  onPayInstallment: (inst: Installment) => void;
  onEditDueDate: (inst: Installment) => void;
  onViewReceipt: (inst: Installment) => void;
  onShareInstallmentWhatsApp: (sale: Sale, inst: Installment) => void;
  onShareSaleTableWhatsApp: (sale: Sale) => void;
  onUpdateSaleCost: (saleId: string, costPrice: number) => Promise<boolean>;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export function ClientsView({
  sales,
  installments,
  clientsList,
  filteredClients,
  selectedClient,
  setSelectedClient,
  expandedSaleId,
  setExpandedSaleId,
  searchTerm,
  setSearchTerm,
  todayTime,
  money,
  onOpenAmortize,
  onOpenShareSignModal,
  onOpenAuditModal,
  onViewContract,
  onDownloadContract,
  onEditSale,
  onDeleteSale,
  onPayInstallment,
  onEditDueDate,
  onViewReceipt,
  onShareInstallmentWhatsApp,
  onShareSaleTableWhatsApp,
  onUpdateSaleCost,
  onShowToast,
}: ClientsViewProps) {
  const [editingCostSaleId, setEditingCostSaleId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<string>('');
  const [savingCostSaleId, setSavingCostSaleId] = useState<string | null>(null);

  const startEditingCost = (sale: Sale, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedSaleId(sale.id);
    setEditingCostSaleId(sale.id);
    const current = Number(sale.costPrice) || 0;
    setEditingCostValue(current > 0 ? String(current) : '');
  };

  const cancelEditingCost = () => {
    setEditingCostSaleId(null);
    setEditingCostValue('');
  };

  const handleSaveCost = async (sale: Sale) => {
    const normalized = editingCostValue.replace(',', '.').trim();
    const parsed = normalized === '' ? 0 : Number(normalized);
    if (Number.isNaN(parsed) || parsed < 0) {
      onShowToast('Informe um valor válido maior ou igual a zero.', 'error');
      return;
    }

    setSavingCostSaleId(sale.id);
    try {
      const ok = await onUpdateSaleCost(sale.id, parsed);
      if (ok) {
        onShowToast(
          parsed > 0
            ? `Valor pago no aparelho (${money(parsed)}) adicionado ao card de investimento!`
            : 'Valor pago no aparelho zerado para este contrato.'
        );
        setEditingCostSaleId(null);
        setEditingCostValue('');
      } else {
        onShowToast('Não foi possível salvar o valor pago no aparelho.', 'error');
      }
    } finally {
      setSavingCostSaleId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {selectedClient && (
            <button
              type="button"
              onClick={() => setSelectedClient(null)}
              className="w-10 h-10 border border-white/[0.1] rounded-xl grid place-items-center bg-[#0d111a] text-gold hover:border-gold/40 transition-colors shrink-0 cursor-pointer"
              aria-label="Voltar à lista de clientes"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
              {selectedClient || 'Carteira de Clientes'}
            </h1>
            <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
              {selectedClient
                ? 'Histórico consolidado de contratos, quitações e assinaturas'
                : `${clientsList.length} cliente(s) cadastrado(s) na carteira`}
            </p>
          </div>
        </div>

        {!selectedClient && (
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              size={16}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar comprador..."
              className="fintech-input w-full pl-10 pr-4"
            />
          </div>
        )}
      </div>

      {selectedClient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Perfil do Cliente (4 colunas) */}
          <div className="lg:col-span-4 glass-card p-6 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gold/12 border border-gold/30 text-gold flex items-center justify-center text-3xl font-bold">
              {selectedClient.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 w-full">
              <h3 className="text-xl font-bold text-white truncate">{selectedClient}</h3>
              <span className="inline-block text-xs font-medium text-emerald-400 mt-1">
                Cadastro Ativo
              </span>
            </div>

            {(() => {
              const clientSales = sales.filter((s) => s.client === selectedClient);
              const pend = installments
                .filter((i) => i.client === selectedClient && i.status === 'Pendente')
                .reduce((acc, i) => acc + (Number(i.value) || 0), 0);
              const paid = installments
                .filter((i) => i.client === selectedClient && i.status === 'Pago')
                .reduce((acc, i) => acc + (Number(i.value) || 0), 0);

              let clientOriginalInvested = 0;
              let clientRemainingInvested = 0;
              let clientRecoveredCapital = 0;
              clientSales.forEach((s) => {
                const sInsts = installments.filter((i) => i.saleId === s.id);
                const inv = calculateSaleInvestment(s, sInsts);
                clientOriginalInvested += inv.originalCost;
                clientRemainingInvested += inv.remainingInvested;
                clientRecoveredCapital += inv.recoveredCapital;
              });

              return (
                <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="p-3.5 bg-[#07090e]/80 border border-white/[0.07] rounded-xl">
                    <span className="text-[11px] font-medium text-zinc-400 block">Contratos</span>
                    <strong className="text-lg font-bold text-gold tabular-figure block mt-0.5">
                      {clientSales.length}
                    </strong>
                  </div>
                  <div className="p-3.5 bg-[#07090e]/80 border border-white/[0.07] rounded-xl">
                    <span className="text-[11px] font-medium text-zinc-400 block">Liquidado</span>
                    <strong className="text-lg font-bold text-emerald-400 tabular-figure block mt-0.5">
                      {money(paid)}
                    </strong>
                  </div>
                  <div className="col-span-2 p-4 bg-[#07090e]/80 border border-amber-500/25 rounded-xl">
                    <span className="text-[11px] font-medium text-amber-300/90 block">
                      Capital Investido em Aberto
                    </span>
                    <strong className="text-xl font-bold text-amber-300 tabular-figure block mt-1">
                      {money(clientRemainingInvested)}
                    </strong>
                    <span className="text-[11px] text-zinc-500 block mt-0.5 tabular-figure">
                      {clientRecoveredCapital > 0
                        ? `Abatido: ${money(clientRecoveredCapital)} de ${money(clientOriginalInvested)}`
                        : 'Abatimento automático conforme parcelas pagas'}
                    </span>
                  </div>
                  <div className="col-span-2 p-4 bg-[#07090e]/80 border border-gold/20 rounded-xl">
                    <span className="text-[11px] font-medium text-zinc-400 block">Capital em Movimento</span>
                    <strong className="text-xl font-bold text-white tabular-figure block mt-1">
                      {money(paid + pend)}
                    </strong>
                    <span className="text-[11px] text-zinc-500 tabular-figure block mt-0.5">
                      Saldo pendente: {money(pend)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Contratos do Cliente (8 colunas) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <History size={17} className="text-gold" />
                <h3 className="text-base font-bold text-white">Carteira de Contratos</h3>
              </div>
              <span className="text-xs font-medium text-zinc-400 tabular-figure">
                {sales.filter((s) => s.client === selectedClient).length} registro(s)
              </span>
            </div>

            {sales
              .filter((s) => s.client === selectedClient)
              .map((sale) => {
                const isExpanded = expandedSaleId === sale.id;
                const isSigned = Boolean(sale.isSigned || sale.signature?.signed);
                const sInstallments = installments.filter((i) => i.saleId === sale.id);
                const paidCount = sInstallments.filter((i) => i.status === 'Pago').length;
                const invSummary = calculateSaleInvestment(sale, sInstallments);
                const currentCost = invSummary.originalCost;
                const saleExpectedReturn = sale.isInterestOnly
                  ? (Number(sale.total) || 0) +
                    sInstallments.reduce((acc, i) => acc + (Number(i.value) || 0), 0)
                  : Number(sale.total) || 0;
                const calculatedProfit = currentCost > 0 ? saleExpectedReturn - currentCost : 0;
                const isEditingCost = editingCostSaleId === sale.id;
                const isSavingCost = savingCostSaleId === sale.id;

                return (
                  <div
                    key={sale.id}
                    className={`glass-card overflow-hidden transition-colors ${
                      isExpanded ? 'border-gold/40' : 'hover:border-white/[0.15]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isExpanded
                              ? 'bg-gold text-[#07090e]'
                              : 'bg-white/[0.05] text-zinc-300 border border-white/[0.1]'
                          }`}
                        >
                          {sale.productName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white truncate">{sale.productName}</h4>
                          <span className="text-xs text-zinc-400 tabular-figure block mt-0.5">
                            {money(sale.total)} · {paidCount}/{sale.installmentsCount} parcelas
                          </span>
                          <span
                            className={`text-[11px] font-medium tabular-figure block mt-0.5 ${
                              currentCost > 0 ? 'text-amber-300' : 'text-zinc-500'
                            }`}
                          >
                            {currentCost > 0
                              ? invSummary.recoveredCapital > 0
                                ? `Pago no aparelho: ${money(currentCost)} · Restante: ${money(invSummary.remainingInvested)}`
                                : `Pago no aparelho: ${money(currentCost)}`
                              : 'Pago no aparelho: Não informado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`hidden sm:inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                            sale.status === 'Ativa'
                              ? 'bg-gold/10 text-gold border-gold/25'
                              : 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
                          }`}
                        >
                          {sale.status === 'Ativa' ? 'Ativo' : 'Liquidado'}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-zinc-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-gold' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/[0.08] p-4 sm:p-6 flex flex-col gap-5 bg-[#07090e]/60 animate-view-enter">
                        {/* Resumo do Contrato */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                            <span className="text-[11px] font-medium text-zinc-400 block">Identificação</span>
                            <strong className="text-sm text-white block mt-1">{sale.client}</strong>
                            {sale.clientAddress && (
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{sale.clientAddress}</p>
                            )}
                            <span className="text-[11px] text-zinc-500 font-mono block mt-1.5">
                              #{sale.id.substring(0, 8).toUpperCase()}
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                            <span className="text-[11px] font-medium text-zinc-400 block">Ativo Vinculado</span>
                            <div className="flex items-center gap-2 mt-1">
                              <ShoppingBag size={14} className="text-gold shrink-0" />
                              <strong className="text-sm text-white truncate">{sale.productName}</strong>
                            </div>
                            <span className="text-xs text-zinc-400 block mt-1.5">
                              {isSigned ? 'Assinado eletronicamente' : 'Aguardando assinatura'}
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                            <span className="text-[11px] font-medium text-zinc-400 block">Resumo Financeiro</span>
                            <div className="flex items-baseline justify-between gap-2 mt-1">
                              <strong className="text-base font-bold text-white tabular-figure">
                                {money(sale.total)}
                              </strong>
                              {currentCost > 0 && (
                                <span
                                  className={`text-xs font-semibold tabular-figure ${
                                    calculatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {calculatedProfit >= 0 ? '+' : ''}
                                  {money(calculatedProfit)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-400 tabular-figure block mt-1">
                              {sale.installmentsCount}x de {money(sale.installmentValue)}
                              {sale.isInterestOnly ? ` (${sale.interestRate}% juros)` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Valor Pago no Aparelho (Investimento) — Sempre editável mesmo em contratos assinados */}
                        <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                              <Briefcase size={16} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-amber-200 block">
                                Valor Pago no Aparelho (Investimento)
                              </span>
                              {!isEditingCost && (
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-0.5">
                                  <strong className="text-base font-bold text-white tabular-figure">
                                    {currentCost > 0 ? money(currentCost) : 'R$ 0,00'}
                                  </strong>
                                  <span className="text-[11px] text-zinc-400 tabular-figure">
                                    {currentCost > 0
                                      ? invSummary.recoveredCapital > 0
                                        ? `Em aberto: ${money(invSummary.remainingInvested)} · Abatido: ${money(invSummary.recoveredCapital)}`
                                        : `Lucro previsto: ${calculatedProfit >= 0 ? '+' : ''}${money(calculatedProfit)}`
                                      : 'Informe quanto pagou neste aparelho para entrar no card de investimento'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {isEditingCost ? (
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                              <div className="relative flex-1 sm:w-40">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-300 pointer-events-none">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min="0"
                                  autoFocus
                                  value={editingCostValue}
                                  onChange={(e) => setEditingCostValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveCost(sale);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelEditingCost();
                                    }
                                  }}
                                  placeholder="0,00"
                                  className="fintech-input h-9 w-full pl-9 pr-3 text-sm font-bold text-white tabular-figure"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={isSavingCost}
                                onClick={() => handleSaveCost(sale)}
                                className="h-9 px-3.5 rounded-xl bg-gold text-[#07090e] text-xs font-bold hover:brightness-110 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                              >
                                <Check size={14} />
                                <span>{isSavingCost ? 'Salvando...' : 'Salvar'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isSavingCost}
                                onClick={cancelEditingCost}
                                className="h-9 w-9 rounded-xl border border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:text-white grid place-items-center cursor-pointer shrink-0"
                                aria-label="Cancelar edição do valor pago"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => startEditingCost(sale, e)}
                              className="h-9 px-3.5 rounded-xl border border-amber-500/35 bg-amber-500/15 hover:bg-amber-500 text-amber-200 hover:text-[#07090e] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                            >
                              <Pencil size={13} />
                              <span>{currentCost > 0 ? 'Editar Valor Pago' : 'Informar Valor Pago'}</span>
                            </button>
                          )}
                        </div>

                        {/* Barra de Ações */}
                        <div className="flex flex-wrap items-center gap-2">
                          {sale.isInterestOnly && sale.status === 'Ativa' && (
                            <button
                              type="button"
                              onClick={() => {
                                const pending = sInstallments.find((i) => i.status === 'Pendente');
                                if (pending) {
                                  onOpenAmortize(pending);
                                } else {
                                  onShowToast('Não há parcelas pendentes para amortizar nesta venda.', 'error');
                                }
                              }}
                              className="h-9 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-gold hover:text-[#07090e] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Minus size={13} />
                              <span>Amortizar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenShareSignModal(sale)}
                            className="h-9 px-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-[#07090e] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <PenTool size={13} />
                            <span>Assinatura</span>
                          </button>

                          {isSigned && (
                            <button
                              type="button"
                              onClick={() => onOpenAuditModal(sale)}
                              className="h-9 px-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShieldCheck size={13} />
                              <span>Auditoria</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onViewContract(sale)}
                            className="h-9 px-3.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-zinc-200 hover:text-gold hover:border-gold/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText size={13} />
                            <span>Contrato</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDownloadContract(sale)}
                            className="h-9 px-3.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-zinc-200 hover:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isSigned) {
                                onShowToast(
                                  'Este contrato já foi assinado digitalmente. Edições bloqueadas.',
                                  'error'
                                );
                                return;
                              }
                              onEditSale(sale);
                            }}
                            className={`h-9 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                              isSigned
                                ? 'border-white/[0.06] text-zinc-600 cursor-not-allowed'
                                : 'border-white/[0.1] bg-white/[0.04] text-zinc-200 hover:text-gold cursor-pointer'
                            }`}
                          >
                            <Pencil size={13} />
                            <span>{isSigned ? 'Selado' : 'Editar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteSale(sale)}
                            className="h-9 px-3.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-zinc-400 hover:text-red-400 hover:border-red-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Excluir</span>
                          </button>
                        </div>

                        {/* Parcelas */}
                        <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.07]">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-semibold text-zinc-300">Parcelas do Contrato</h4>
                            <button
                              type="button"
                              onClick={() => onShareSaleTableWhatsApp(sale)}
                              className="h-8 px-3 rounded-lg bg-[#25D366]/12 border border-[#25D366]/25 text-[#25D366] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageCircle size={12} />
                              <span>Enviar Tabela</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {sInstallments
                              .sort((a, b) => a.number - b.number)
                              .map((inst) => {
                                const isPaid = inst.status === 'Pago';
                                const dueDateObj = parseDateToMidnight(inst.dueDate);
                                const isOverdue = !isPaid && dueDateObj.getTime() < todayTime.getTime();
                                const isDueToday = !isPaid && dueDateObj.getTime() === todayTime.getTime();

                                return (
                                  <div
                                    key={inst.id}
                                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 ${
                                      isPaid
                                        ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                                        : isOverdue
                                          ? 'border-red-500/35 bg-red-500/[0.06]'
                                          : isDueToday
                                            ? 'border-purple-500/35 bg-purple-500/[0.06]'
                                            : 'border-white/[0.08] bg-white/[0.02]'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <span
                                          className={`text-[11px] font-semibold block ${
                                            isPaid
                                              ? 'text-emerald-400'
                                              : isOverdue
                                                ? 'text-red-400'
                                                : isDueToday
                                                  ? 'text-purple-300'
                                                  : 'text-zinc-400'
                                          }`}
                                        >
                                          Parcela {inst.number}/{sale.installmentsCount}
                                        </span>
                                        <strong className="text-sm font-bold text-white tabular-figure block mt-0.5">
                                          {money(inst.value)}
                                        </strong>
                                        {isPaid ? (
                                          <span className="text-[11px] text-zinc-400 tabular-figure">
                                            {formatLocalDateBR(inst.dueDate)}
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => onEditDueDate(inst)}
                                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-gold transition-colors cursor-pointer tabular-figure"
                                            title="Alterar prazo de vencimento"
                                          >
                                            <span>{formatLocalDateBR(inst.dueDate)}</span>
                                            <Calendar size={11} className="text-gold/80 shrink-0" />
                                          </button>
                                        )}
                                      </div>
                                      {isPaid ? (
                                        <Check size={13} className="text-emerald-400 shrink-0" />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => onEditDueDate(inst)}
                                          className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-gold/15 border border-white/[0.08] hover:border-gold/35 text-zinc-400 hover:text-gold grid place-items-center transition-colors cursor-pointer shrink-0"
                                          title="Alterar prazo de vencimento"
                                        >
                                          <Calendar size={12} />
                                        </button>
                                      )}
                                    </div>

                                    {isPaid ? (
                                      <button
                                        type="button"
                                        onClick={() => onViewReceipt(inst)}
                                        className="w-full h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 text-[11px] font-semibold cursor-pointer"
                                      >
                                        Recibo
                                      </button>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => onPayInstallment(inst)}
                                          className="h-8 rounded-lg bg-gold text-[#07090e] text-[11px] font-bold cursor-pointer"
                                        >
                                          Quitar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onShareInstallmentWhatsApp(sale, inst)}
                                          className="h-8 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                          <MessageCircle size={11} />
                                          <span>Cobrar</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="glass-card p-16 text-center flex flex-col items-center gap-3">
          <User size={40} className="text-zinc-600" />
          <h4 className="text-sm font-semibold text-white">Nenhum cliente localizado</h4>
          <p className="text-xs text-zinc-500">Os clientes são adicionados automaticamente ao registrar uma venda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((clientName) => {
            const clientSales = sales.filter((s) => s.client === clientName);
            const totalVolume = clientSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
            const clientInvested = clientSales.reduce((acc, s) => {
              const sInsts = installments.filter((i) => i.saleId === s.id);
              return acc + calculateSaleInvestment(s, sInsts).remainingInvested;
            }, 0);
            const pendingCount = installments.filter(
              (i) => i.client === clientName && i.status === 'Pendente'
            ).length;

            return (
              <button
                key={clientName}
                type="button"
                onClick={() => setSelectedClient(clientName)}
                className="glass-card group p-5 flex items-center justify-between gap-3 hover:bg-[#131824] hover:border-gold/35 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center text-sm font-bold shrink-0">
                    {clientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-sm font-bold text-zinc-100 group-hover:text-white truncate block">
                      {clientName}
                    </strong>
                    <span className="text-xs text-zinc-400 tabular-figure block mt-0.5 truncate">
                      {clientSales.length} contrato(s) · {money(totalVolume)}
                    </span>
                    <span
                      className={`text-[11px] font-medium block mt-0.5 tabular-figure ${
                        pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {pendingCount > 0 ? `${pendingCount} parcela(s) pendente(s)` : 'Sem pendências'}
                      {clientInvested > 0 ? ` · Investido: ${money(clientInvested)}` : ''}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-zinc-500 group-hover:text-gold group-hover:translate-x-1 transition-all shrink-0"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
