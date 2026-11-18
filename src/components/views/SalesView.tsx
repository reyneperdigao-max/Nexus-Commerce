import { Fragment } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign,
  Zap,
  FileText,
  ShoppingBag,
  Search,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  PenTool,
  ChevronDown,
  Minus,
  Download,
  Pencil,
  Trash2,
  MessageCircle,
  Check,
  Clock,
} from 'lucide-react';
import { Installment, Product, Sale, Settings } from '../../types';
import { formatLocalDateBR, getLocalDateString, getFutureLocalDateString, parseDateToMidnight } from '../../lib/dateUtils';
import { getSystemSellerName } from '../../lib/pdfGenerator';

interface SalesViewProps {
  sales: Sale[];
  filteredSales: Sale[];
  products: Product[];
  installments: Installment[];
  settings: Settings;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterStatus: 'Todos' | 'Atrasados' | 'Hoje';
  setFilterStatus: (val: 'Todos' | 'Atrasados' | 'Hoje') => void;
  showSaleForm: boolean;
  setShowSaleForm: (val: boolean) => void;
  saleToEdit: Sale | null;
  setSaleToEdit: (sale: Sale | null) => void;
  saleFormSelectedProductId: string;
  setSaleFormSelectedProductId: (val: string) => void;
  saleFormCostPrice: string | number;
  setSaleFormCostPrice: (val: string | number) => void;
  saleFormSalePrice: string | number;
  setSaleFormSalePrice: (val: string | number) => void;
  isInterestOnlyForm: boolean;
  setIsInterestOnlyForm: (val: boolean) => void;
  interestRateForm: string | number;
  setInterestRateForm: (val: string | number) => void;
  expandedSaleId: string | null;
  setExpandedSaleId: (id: string | null) => void;
  todayTime: Date;
  money: (val: number) => string;
  onQuickPayment: () => void;
  onQuickAdvance: () => void;
  onDownloadReportPDF: () => void;
  onRegisterSale: (data: any) => Promise<boolean>;
  onUpdateSaleFull: (id: string, data: any, oldSale: Sale) => Promise<boolean>;
  onOpenAdvanceModal: (sale: Sale) => void;
  onOpenAmortize: (pendingInstallment: Installment) => void;
  onOpenShareSignModal: (sale: Sale) => void;
  onOpenAuditModal: (sale: Sale) => void;
  onViewContract: (sale: Sale) => void;
  onDownloadContract: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  onPayInstallment: (inst: Installment) => void;
  onViewReceipt: (inst: Installment) => void;
  onShareInstallmentWhatsApp: (sale: Sale, inst: Installment) => void;
  onShareSaleTableWhatsApp: (sale: Sale) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export function SalesView({
  sales,
  filteredSales,
  products,
  installments,
  settings,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  showSaleForm,
  setShowSaleForm,
  saleToEdit,
  setSaleToEdit,
  saleFormSelectedProductId,
  setSaleFormSelectedProductId,
  saleFormCostPrice,
  setSaleFormCostPrice,
  saleFormSalePrice,
  setSaleFormSalePrice,
  isInterestOnlyForm,
  setIsInterestOnlyForm,
  interestRateForm,
  setInterestRateForm,
  expandedSaleId,
  setExpandedSaleId,
  todayTime,
  money,
  onQuickPayment,
  onQuickAdvance,
  onDownloadReportPDF,
  onRegisterSale,
  onUpdateSaleFull,
  onOpenAdvanceModal,
  onOpenAmortize,
  onOpenShareSignModal,
  onOpenAuditModal,
  onViewContract,
  onDownloadContract,
  onDeleteSale,
  onPayInstallment,
  onViewReceipt,
  onShareInstallmentWhatsApp,
  onShareSaleTableWhatsApp,
  onShowToast,
}: SalesViewProps) {
  const activeCount = sales.filter((s) => {
    const sInsts = installments.filter((i) => i.saleId === s.id);
    return !(sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago'));
  }).length;

  const overdueCount = sales.filter((s) => {
    const sInsts = installments.filter((i) => i.saleId === s.id);
    if (sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago')) return false;
    return sInsts
      .filter((i) => i.status === 'Pendente')
      .some((i) => parseDateToMidnight(i.dueDate).getTime() < todayTime.getTime());
  }).length;

  const dueTodayCount = sales.filter((s) => {
    const sInsts = installments.filter((i) => i.saleId === s.id);
    if (sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago')) return false;
    return sInsts
      .filter((i) => i.status === 'Pendente')
      .some((i) => parseDateToMidnight(i.dueDate).getTime() === todayTime.getTime());
  }).length;

  if (showSaleForm) {
    const existingFirstInst = saleToEdit
      ? installments.find(
          (i) => (i.saleId === saleToEdit.id || String(i.saleId).trim() === String(saleToEdit.id).trim()) && i.number === 1
        )
      : null;
    const defaultFirstDue = existingFirstInst?.dueDate
      ? getLocalDateString(existingFirstInst.dueDate)
      : saleToEdit?.date
        ? getLocalDateString(saleToEdit.date)
        : getFutureLocalDateString(30);
    const currentSeller = saleToEdit?.sellerName || getSystemSellerName(settings, saleToEdit);

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 sm:p-8 glass-card max-w-4xl mx-auto w-full border-gold/25"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-white/[0.08]">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {saleToEdit ? 'Editar Contrato e Venda' : 'Nova Operação Comercial'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Preencha os dados do cliente, ativo e condições de pagamento
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSaleForm(false);
              setSaleToEdit(null);
            }}
            className="h-9 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-300 self-start sm:self-auto cursor-pointer"
          >
            Voltar à Lista
          </button>
        </div>

        <form
          key={saleToEdit ? `edit-${saleToEdit.id}` : 'new-sale'}
          className="flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.target as any;

            const resolvedProductId = (
              f.productId?.value ||
              saleFormSelectedProductId ||
              (saleToEdit ? saleToEdit.productId : '') ||
              ''
            ).trim();
            if (!saleToEdit && !resolvedProductId) {
              onShowToast('Por favor, selecione um produto para cadastrar a venda.', 'error');
              return;
            }

            const selectedProd = products.find(
              (p) => p.id === resolvedProductId || String(p.id).trim() === resolvedProductId
            );

            const parsedCost =
              f.costPrice?.value !== '' && !isNaN(Number(f.costPrice?.value))
                ? Math.max(0, Number(f.costPrice.value))
                : saleToEdit?.costPrice !== undefined
                  ? Math.max(0, saleToEdit.costPrice)
                  : 0;
            const parsedTotal =
              f.manualSalePrice?.value !== '' && !isNaN(Number(f.manualSalePrice?.value))
                ? Number(f.manualSalePrice.value)
                : saleToEdit?.total || selectedProd?.sale || 0;

            if (parsedTotal <= 0) {
              onShowToast('Por favor, informe um Preço Final válido para a venda.', 'error');
              return;
            }

            const parsedDown =
              f.downPayment?.value !== '' && !isNaN(Number(f.downPayment?.value))
                ? Number(f.downPayment.value)
                : saleToEdit?.downPayment || 0;
            const parsedInst =
              f.installments?.value !== '' && !isNaN(Number(f.installments?.value))
                ? Math.max(1, Number(f.installments.value))
                : saleToEdit?.installmentsCount || 12;
            const parsedInterestRate =
              isInterestOnlyForm && f.interestRate?.value !== '' && !isNaN(Number(f.interestRate?.value))
                ? Number(f.interestRate.value)
                : isInterestOnlyForm
                  ? Number(interestRateForm) || 0
                  : 0;

            const saleData = {
              productId: resolvedProductId,
              sellerName: f.sellerName?.value ? f.sellerName.value.trim() : currentSeller,
              client: (f.client?.value || saleToEdit?.client || '').trim(),
              clientPhone: (f.clientPhone?.value || saleToEdit?.clientPhone || '').trim(),
              clientCpf: (f.clientCpf?.value || saleToEdit?.clientCpf || '').trim(),
              clientAddress: (f.clientAddress?.value || saleToEdit?.clientAddress || '').trim(),
              installments: parsedInst,
              saleDate:
                f.saleDate?.value || (saleToEdit?.date ? getLocalDateString(saleToEdit.date) : getLocalDateString()),
              firstDueDate: f.firstDueDate?.value || defaultFirstDue,
              percentageAdjustment: 0,
              manualSalePrice: parsedTotal,
              downPayment: parsedDown,
              isInterestOnly: isInterestOnlyForm,
              interestRate: parsedInterestRate,
              costPrice: parsedCost,
            };

            if (saleToEdit) {
              try {
                const ok = await onUpdateSaleFull(saleToEdit.id, saleData, saleToEdit);
                if (ok) {
                  onShowToast('Contrato e venda atualizados com sucesso!');
                  setShowSaleForm(false);
                  setSaleToEdit(null);
                } else {
                  onShowToast('Erro ao atualizar contrato.', 'error');
                }
              } catch (err: any) {
                console.error('Erro ao atualizar contrato:', err);
                onShowToast('Erro ao atualizar contrato: ' + (err?.message || 'Tente novamente'), 'error');
              }
            } else {
              try {
                const ok = await onRegisterSale(saleData);
                if (ok) {
                  onShowToast('Venda e contrato cadastrados com sucesso!');
                  setShowSaleForm(false);
                  setSaleToEdit(null);
                } else {
                  onShowToast('Erro ao cadastrar venda. Verifique se o produto está disponível.', 'error');
                }
              } catch (err: any) {
                console.error('Erro ao cadastrar venda:', err);
                onShowToast('Erro ao cadastrar venda: ' + (err?.message || 'Tente novamente'), 'error');
              }
            }
          }}
        >
          {/* Ativo & Vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Produto / Ativo</label>
              <select
                name="productId"
                required={!saleToEdit}
                value={saleFormSelectedProductId || saleToEdit?.productId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSaleFormSelectedProductId(val);
                  const prod = products.find((p) => p.id === val || String(p.id).trim() === val);
                  if (prod) {
                    setSaleFormSalePrice(prod.sale);
                    if (prod.cost !== undefined) setSaleFormCostPrice(prod.cost);
                  }
                }}
                className="fintech-select"
              >
                <option value="">
                  {saleToEdit ? `${saleToEdit.productName || 'Ativo Atual'} (Manter)` : 'Selecione um ativo...'}
                </option>
                {saleToEdit && saleToEdit.productId && !products.some((p) => p.id === saleToEdit.productId) && (
                  <option value={saleToEdit.productId}>{saleToEdit.productName}</option>
                )}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.imei ? ` • IMEI ${p.imei}` : ''} ({money(p.sale)}){' '}
                    {p.status !== 'Disponivel' && p.id !== saleToEdit?.productId ? `— [${p.status}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gold/90">Vendedor no Contrato</label>
              <input
                name="sellerName"
                required
                defaultValue={currentSeller}
                placeholder="Nome do operador / vendedor"
                className="fintech-input text-gold font-semibold"
              />
            </div>
          </div>

          {/* Dados do Comprador */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-xs font-medium text-zinc-400">Nome do Comprador</label>
              <input
                name="client"
                required
                defaultValue={saleToEdit?.client || ''}
                placeholder="Ex: João da Silva"
                className="fintech-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">CPF / Documento</label>
              <input
                name="clientCpf"
                defaultValue={saleToEdit?.clientCpf || ''}
                placeholder="000.000.000-00"
                className="fintech-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">WhatsApp / Telefone</label>
              <input
                name="clientPhone"
                defaultValue={saleToEdit?.clientPhone || ''}
                placeholder="(00) 00000-0000"
                className="fintech-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Endereço Completo</label>
            <input
              name="clientAddress"
              defaultValue={saleToEdit?.clientAddress || ''}
              placeholder="Ex: Av. Paulista, 1000, Apto 12 - São Paulo / SP"
              className="fintech-input"
            />
          </div>

          {/* Valores & Prazos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Custo (R$)</label>
              <input
                name="costPrice"
                type="number"
                step="0.01"
                value={saleFormCostPrice}
                onChange={(e) => setSaleFormCostPrice(e.target.value)}
                placeholder="0,00"
                className="fintech-input tabular-figure"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gold">Preço Final (R$)</label>
              <input
                name="manualSalePrice"
                type="number"
                step="0.01"
                required
                value={saleFormSalePrice}
                onChange={(e) => setSaleFormSalePrice(e.target.value)}
                placeholder="0,00"
                className="fintech-input border-gold/40 text-gold font-bold tabular-figure"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Entrada (R$)</label>
              <input
                name="downPayment"
                type="number"
                step="0.01"
                defaultValue={saleToEdit?.downPayment || '0'}
                className="fintech-input tabular-figure"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Parcelas</label>
              <input
                name="installments"
                type="number"
                min="1"
                defaultValue={saleToEdit?.installmentsCount || '12'}
                className="fintech-input tabular-figure"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Data da Compra</label>
              <input
                name="saleDate"
                type="date"
                required
                defaultValue={saleToEdit?.date ? getLocalDateString(saleToEdit.date) : getLocalDateString()}
                className="fintech-input tabular-figure"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">1º Vencimento</label>
              <input
                name="firstDueDate"
                type="date"
                required
                defaultValue={defaultFirstDue}
                className="fintech-input tabular-figure"
              />
            </div>
          </div>

          {/* Modalidade */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Modalidade de Recebimento</label>
              <input name="percentage" className="hidden" />
              <select
                value={isInterestOnlyForm ? 'interest_only' : 'standard'}
                onChange={(e) => setIsInterestOnlyForm(e.target.value === 'interest_only')}
                className="fintech-select"
              >
                <option value="standard">Venda Padrão (Amortização fixa nas parcelas)</option>
                <option value="interest_only">Venda por Juros (Cobrança mensal somente dos juros)</option>
              </select>
            </div>

            {isInterestOnlyForm && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                <label className="text-xs font-medium text-gold">Taxa de Juros Mensal (%)</label>
                <input
                  name="interestRate"
                  type="number"
                  step="0.01"
                  required
                  value={interestRateForm}
                  onChange={(e) => setInterestRateForm(e.target.value)}
                  placeholder="5.00"
                  className="fintech-input border-gold/30 text-gold font-bold tabular-figure max-w-xs"
                />
                <span className="text-xs text-zinc-400">
                  As parcelas serão equivalentes aos juros mensais sobre o saldo, mantendo o principal ativo para amortização.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowSaleForm(false);
                setSaleToEdit(null);
              }}
              className="h-12 px-6 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-gold text-[#07090e] rounded-xl font-bold text-xs sm:text-sm shadow-[0_8px_24px_rgba(243,186,47,0.25)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
            >
              {saleToEdit ? 'Salvar Alterações no Contrato' : 'Confirmar Venda e Emitir Contrato'}
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      {/* Header & Ações Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Vendas & Recebíveis</h1>
          <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
            Gestão de contratos ativos, assinatura digital, vencimentos e quitações
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={onQuickPayment}
            className="h-10 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <DollarSign size={15} />
            <span>Quitar Parcela</span>
          </button>

          <button
            type="button"
            onClick={onQuickAdvance}
            className="h-10 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Zap size={15} className="text-gold" />
            <span>Antecipar</span>
          </button>

          <button
            type="button"
            onClick={onDownloadReportPDF}
            className="h-10 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={15} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSaleForm(true);
              setSaleToEdit(null);
            }}
            className="h-10 px-4 sm:px-5 bg-gold hover:brightness-110 text-[#07090e] transition-all rounded-xl font-bold text-xs flex items-center gap-2 shadow-[0_4px_14px_rgba(243,186,47,0.22)] shrink-0 cursor-pointer ml-auto sm:ml-0"
          >
            <ShoppingBag size={15} strokeWidth={2.5} />
            <span>Nova Operação</span>
          </button>
        </div>
      </div>

      {/* Filtros & Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex flex-wrap bg-[#0d111a] border border-white/[0.08] rounded-xl p-1 gap-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterStatus('Todos')}
            className={`flex-1 sm:flex-initial h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === 'Todos' ? 'bg-gold text-[#07090e]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Ativos ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Atrasados')}
            className={`flex-1 sm:flex-initial h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === 'Atrasados' ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500/10'
            }`}
          >
            Atrasados ({overdueCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('Hoje')}
            className={`flex-1 sm:flex-initial h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === 'Hoje' ? 'bg-purple-500 text-white' : 'text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            Vence Hoje ({dueTodayCount})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar cliente ou produto..."
            className="fintech-input w-full pl-10 pr-4"
          />
        </div>
      </div>

      {/* Lista Vazia */}
      {filteredSales.length === 0 ? (
        <div
          className={`glass-card p-12 sm:p-16 flex flex-col items-center justify-center text-center gap-4 ${
            filterStatus === 'Atrasados'
              ? 'border-red-500/25'
              : filterStatus === 'Hoje'
                ? 'border-purple-500/25'
                : ''
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl grid place-items-center ${
              filterStatus === 'Atrasados'
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : filterStatus === 'Hoje'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                  : 'bg-gold/12 text-gold border border-gold/25'
            }`}
          >
            {filterStatus === 'Atrasados' ? (
              <AlertCircle size={30} />
            ) : filterStatus === 'Hoje' ? (
              <Calendar size={30} />
            ) : (
              <CheckCircle2 size={30} />
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {filterStatus === 'Atrasados'
              ? 'Nenhum contrato em atraso'
              : filterStatus === 'Hoje'
                ? 'Sem vencimentos para hoje'
                : 'Nenhum contrato ativo encontrado'}
          </h3>
          <p className="max-w-md text-xs text-zinc-400 leading-relaxed">
            {filterStatus === 'Atrasados'
              ? 'Sua carteira está adimplente. Não existem parcelas vencidas em aberto.'
              : filterStatus === 'Hoje'
                ? 'Não há parcelas com vencimento programado para a data de hoje.'
                : 'Todos os contratos quitados permanecem registrados no histórico da aba Clientes.'}
          </p>
          {filterStatus !== 'Todos' && (
            <button
              type="button"
              onClick={() => setFilterStatus('Todos')}
              className="h-10 px-5 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] rounded-xl text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              Ver todos os contratos ativos
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards Responsivos (sem tabela esticada) */}
          <div className="flex flex-col gap-3.5 lg:hidden">
            {filteredSales.map((sale) => {
              const sInstallments = installments.filter((i) => i.saleId === sale.id);
              const paidCount = sInstallments.filter((i) => i.status === 'Pago').length;
              const totalCount = sale.installmentsCount;
              const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
              const isExpanded = expandedSaleId === sale.id;
              const isSigned = Boolean(sale.isSigned || sale.signature?.signed);
              const hasPending = sInstallments.some((i) => i.status === 'Pendente');

              return (
                <div key={sale.id} className="glass-card overflow-hidden">
                  <div className="p-4 flex flex-col gap-3.5">
                    <div
                      onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                      className="flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gold/12 border border-gold/25 text-gold flex items-center justify-center font-bold text-sm shrink-0">
                          {sale.client.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <strong className="text-sm font-bold text-white block truncate">{sale.client}</strong>
                          <span className="text-xs text-zinc-400 block truncate">{sale.productName}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isSigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/12 px-2 py-0.5 rounded-md border border-emerald-500/25">
                            <ShieldCheck size={11} /> Assinado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/12 px-2 py-0.5 rounded-md border border-amber-500/25">
                            <PenTool size={10} /> Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/[0.06] text-xs">
                      <div>
                        <span className="text-[11px] text-zinc-500 block">Total</span>
                        <strong className="text-white font-bold tabular-figure block mt-0.5">
                          {money(sale.total)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-500 block">Lucro</span>
                        <strong className="text-emerald-400 font-bold tabular-figure block mt-0.5">
                          +{money(sale.profit)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-zinc-500 block">Progresso</span>
                        <strong className="text-zinc-200 font-semibold tabular-figure block mt-0.5">
                          {paidCount}/{totalCount}
                        </strong>
                      </div>
                    </div>

                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gold transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>

                    {/* Ações Mobile */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className={`flex-1 h-9 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                          isExpanded
                            ? 'bg-gold text-[#07090e] border-gold'
                            : 'bg-white/[0.04] text-zinc-200 border-white/[0.1]'
                        }`}
                      >
                        <DollarSign size={13} />
                        <span>{isExpanded ? 'Ocultar Parcelas' : 'Parcelas'}</span>
                        <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {hasPending && (
                        <button
                          type="button"
                          onClick={() => onOpenAdvanceModal(sale)}
                          className="h-9 px-3 rounded-lg border border-gold/30 bg-gold/10 text-gold text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Zap size={13} />
                          <span>Antecipar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenShareSignModal(sale)}
                        className="h-9 w-9 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 grid place-items-center cursor-pointer"
                        title="Link de Assinatura"
                      >
                        <PenTool size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewContract(sale)}
                        className="h-9 w-9 rounded-lg border border-white/[0.1] bg-white/[0.03] text-zinc-300 grid place-items-center cursor-pointer"
                        title="Ver Contrato"
                      >
                        <FileText size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteSale(sale)}
                        className="h-9 w-9 rounded-lg border border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-red-400 grid place-items-center cursor-pointer"
                        title="Excluir Contrato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Parcelas Expandidas (Mobile Touch-Friendly) */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.08] bg-[#07090e]/70 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-300">Cronograma de Parcelas</span>
                        <button
                          type="button"
                          onClick={() => onShareSaleTableWhatsApp(sale)}
                          className="h-8 px-3 rounded-lg bg-[#25D366]/12 border border-[#25D366]/25 text-[#25D366] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle size={12} />
                          <span>Enviar Tabela</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                  isPaid
                                    ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                                    : isOverdue
                                      ? 'border-red-500/35 bg-red-500/[0.06]'
                                      : isDueToday
                                        ? 'border-purple-500/35 bg-purple-500/[0.06]'
                                        : 'border-white/[0.08] bg-white/[0.02]'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-xs font-semibold ${
                                        isPaid
                                          ? 'text-emerald-400'
                                          : isOverdue
                                            ? 'text-red-400'
                                            : isDueToday
                                              ? 'text-purple-300'
                                              : 'text-zinc-300'
                                      }`}
                                    >
                                      Parcela {inst.number}/{totalCount}
                                    </span>
                                    {isOverdue && <span className="text-[10px] text-red-400">(Atrasada)</span>}
                                    {isDueToday && <span className="text-[10px] text-purple-300">(Hoje)</span>}
                                  </div>
                                  <p className="text-sm font-bold text-white tabular-figure mt-0.5">
                                    {money(inst.value)}
                                  </p>
                                  <span className="text-[11px] text-zinc-400 tabular-figure">
                                    Venc: {formatLocalDateBR(inst.dueDate)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => onViewReceipt(inst)}
                                      className="h-9 px-3 rounded-lg bg-white/[0.07] border border-white/[0.12] text-zinc-200 text-xs font-semibold cursor-pointer"
                                    >
                                      Recibo
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onShareInstallmentWhatsApp(sale, inst)}
                                        className="h-9 w-9 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] grid place-items-center cursor-pointer"
                                        title="Cobrar no WhatsApp"
                                      >
                                        <MessageCircle size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onPayInstallment(inst)}
                                        className="h-9 px-3 rounded-lg bg-gold text-[#07090e] text-xs font-bold cursor-pointer"
                                      >
                                        Quitar
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Tabela Corporativa Expandida */}
          <div className="hidden lg:block glass-card overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-zinc-400 h-12">
                    <th className="px-5 py-3">Comprador / Assinatura</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-right">Lucro</th>
                    <th className="px-4 py-3 text-center">Quitação</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-zinc-200">
                  {filteredSales.map((sale) => {
                    const sInstallments = installments.filter((i) => i.saleId === sale.id);
                    const paidCount = sInstallments.filter((i) => i.status === 'Pago').length;
                    const totalCount = sale.installmentsCount;
                    const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
                    const isExpanded = expandedSaleId === sale.id;
                    const isSigned = Boolean(sale.isSigned || sale.signature?.signed);

                    return (
                      <Fragment key={sale.id}>
                        <tr className="hover:bg-white/[0.02] transition-colors h-20">
                          <td
                            className="px-5 py-3 cursor-pointer"
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 text-gold flex items-center justify-center font-bold text-sm shrink-0">
                                {sale.client.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <strong className="text-white font-semibold text-sm truncate max-w-[190px]">
                                    {sale.client}
                                  </strong>
                                  {isSigned ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/12 px-2 py-0.5 rounded-md border border-emerald-500/25">
                                      <ShieldCheck size={10} /> Assinado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                      <PenTool size={9} /> Pendente
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-500 font-mono tabular-figure block mt-0.5">
                                  #{sale.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <span className="text-sm font-medium text-zinc-200 block">{sale.productName}</span>
                            <span className="text-[11px] text-zinc-500 tabular-figure block mt-0.5">
                              {formatLocalDateBR(sale.date || sale.createdAt)}
                            </span>
                          </td>

                          <td
                            className="px-4 py-3 text-right cursor-pointer"
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <strong className="text-white text-sm font-bold tabular-figure block">
                              {money(sale.total)}
                            </strong>
                            {sale.isInterestOnly ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-gold/15 text-gold text-[10px] font-semibold mt-0.5 tabular-figure">
                                Juros {sale.interestRate}% a.m.
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400 tabular-figure block mt-0.5">
                                {sale.installmentsCount}x de {money(sale.installmentValue)}
                              </span>
                            )}
                          </td>

                          <td
                            className="px-4 py-3 text-right cursor-pointer"
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <strong className="text-emerald-400 text-sm font-bold tabular-figure block">
                              +{money(sale.profit)}
                            </strong>
                            <span className="text-[11px] text-zinc-500 block mt-0.5">Previsto</span>
                          </td>

                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <div className="flex flex-col max-w-[136px] mx-auto w-full gap-1.5">
                              <div className="flex items-center justify-between text-[11px] tabular-figure">
                                <span className="text-zinc-400">
                                  {paidCount}/{totalCount}
                                </span>
                                <span className="font-semibold text-zinc-200">{Math.round(progressPercent)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gold transition-all duration-300"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td
                            className="px-4 py-3 text-center cursor-pointer"
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                sale.status === 'Ativa'
                                  ? 'bg-gold/10 text-gold border-gold/25'
                                  : 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
                              }`}
                            >
                              {sale.status === 'Ativa' ? 'Ativa' : 'Liquidada'}
                            </span>
                          </td>

                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                className={`h-8 px-2.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer shrink-0 ${
                                  isExpanded
                                    ? 'bg-gold text-[#07090e] border-gold'
                                    : 'border-white/[0.1] bg-white/[0.04] text-zinc-200 hover:border-white/[0.2]'
                                }`}
                                title={isExpanded ? 'Ocultar Parcelas' : 'Receber / Ver Parcelas'}
                              >
                                <DollarSign size={12} />
                                <span>Parcelas</span>
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>

                              {sInstallments.some((i) => i.status === 'Pendente') && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAdvanceModal(sale)}
                                  className="h-8 px-2.5 rounded-lg border border-gold/30 bg-gold/10 hover:bg-gold hover:text-[#07090e] text-gold text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                  title="Antecipar Parcelas com Desconto"
                                >
                                  <Zap size={12} />
                                  <span>Antecipar</span>
                                </button>
                              )}

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
                                  className="h-8 w-8 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-gold hover:text-[#07090e] transition-colors grid place-items-center cursor-pointer"
                                  title="Amortizar Valor"
                                >
                                  <Minus size={13} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onOpenShareSignModal(sale)}
                                className="h-8 w-8 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-[#07090e] transition-colors grid place-items-center cursor-pointer"
                                title="Link de Assinatura Eletrônica"
                              >
                                <PenTool size={13} />
                              </button>

                              {isSigned && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAuditModal(sale)}
                                  className="h-8 w-8 rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors grid place-items-center cursor-pointer"
                                  title="Certificado e Auditoria Digital"
                                >
                                  <ShieldCheck size={13} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onViewContract(sale)}
                                className="h-8 w-8 rounded-lg border border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-gold hover:border-gold/40 transition-colors grid place-items-center cursor-pointer"
                                title="Ver Contrato"
                              >
                                <FileText size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => onDownloadContract(sale)}
                                className="h-8 w-8 rounded-lg border border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors grid place-items-center cursor-pointer"
                                title="Baixar PDF"
                              >
                                <Download size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isSigned) {
                                    onShowToast(
                                      'Este contrato já possui assinatura digital vinculada e está bloqueado para edições.',
                                      'error'
                                    );
                                    return;
                                  }
                                  setSaleToEdit(sale);
                                  setShowSaleForm(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`h-8 w-8 rounded-lg border transition-colors grid place-items-center ${
                                  isSigned
                                    ? 'border-white/[0.05] text-zinc-600 bg-white/[0.01] cursor-not-allowed'
                                    : 'border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-gold hover:border-gold/40 cursor-pointer'
                                }`}
                                title={isSigned ? 'Contrato Selado Digitalmente' : 'Editar Contrato'}
                              >
                                <Pencil size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteSale(sale)}
                                className="h-8 w-8 rounded-lg border border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors grid place-items-center cursor-pointer"
                                title="Excluir Contrato"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#07090e]/85 border-b border-white/[0.08]">
                            <td colSpan={7} className="p-6">
                              <div className="flex flex-col gap-4 animate-view-enter">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                      <span>Cronograma de Liquidação</span>
                                      {sInstallments.some((i) => i.status === 'Pendente') && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[11px] font-semibold border border-amber-500/25 tabular-figure">
                                          {sInstallments.filter((i) => i.status === 'Pendente').length} pendente(s)
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                      Registre quitações individuais, envie cobranças por WhatsApp ou antecipe parcelas
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onShareSaleTableWhatsApp(sale)}
                                      className="h-9 px-3.5 bg-[#25D366]/12 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <MessageCircle size={14} />
                                      <span>Compartilhar Tabela</span>
                                    </button>
                                    {sInstallments.some((i) => i.status === 'Pendente') && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenAdvanceModal(sale)}
                                        className="h-9 px-3.5 bg-gold/15 hover:bg-gold hover:text-[#07090e] border border-gold/35 text-gold rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Zap size={14} />
                                        <span>Antecipar Parcelas</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
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
                                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                                            isPaid
                                              ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                                              : isOverdue
                                                ? 'border-red-500/35 bg-red-500/[0.06]'
                                                : isDueToday
                                                  ? 'border-purple-500/35 bg-purple-500/[0.06]'
                                                  : 'border-white/[0.08] bg-white/[0.02]'
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-center justify-between gap-1">
                                              <span
                                                className={`text-[11px] font-semibold ${
                                                  isPaid
                                                    ? 'text-emerald-400'
                                                    : isOverdue
                                                      ? 'text-red-400'
                                                      : isDueToday
                                                        ? 'text-purple-300'
                                                        : 'text-zinc-400'
                                                }`}
                                              >
                                                Parcela {inst.number}
                                              </span>
                                              {isPaid ? (
                                                <Check size={12} className="text-emerald-400" />
                                              ) : isOverdue ? (
                                                <AlertCircle size={12} className="text-red-400" />
                                              ) : (
                                                <Clock size={12} className="text-zinc-500" />
                                              )}
                                            </div>
                                            <p className="text-sm font-bold text-white tabular-figure mt-1">
                                              {money(inst.value)}
                                            </p>
                                            <span className="text-[11px] text-zinc-400 tabular-figure block mt-0.5">
                                              {formatLocalDateBR(inst.dueDate)}
                                              {isOverdue ? ' · Atrasada' : isDueToday ? ' · Hoje' : ''}
                                            </span>
                                          </div>

                                          {isPaid ? (
                                            <button
                                              type="button"
                                              onClick={() => onViewReceipt(inst)}
                                              className="w-full h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 text-[11px] font-semibold cursor-pointer transition-colors"
                                            >
                                              Ver Recibo
                                            </button>
                                          ) : (
                                            <div className="grid grid-cols-2 gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => onPayInstallment(inst)}
                                                className="h-8 rounded-lg bg-gold hover:brightness-110 text-[#07090e] text-[11px] font-bold cursor-pointer transition-all"
                                              >
                                                Quitar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => onShareInstallmentWhatsApp(sale, inst)}
                                                className="h-8 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366] border border-[#25D366]/30 text-[#25D366] hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
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
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
