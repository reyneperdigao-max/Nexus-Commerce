import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  Check,
  Copy,
  DollarSign,
  Download,
  FileText,
  Image as ImageIcon,
  Link2,
  Pencil,
  Percent,
  Printer,
  RotateCcw,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Installment, Product, Sale, Settings } from '../types';
import { extractDueDay, formatLocalDateBR, getLocalDateString, parseDateSafe, parseDateToMidnight } from '../lib/dateUtils';
import { getSystemSellerName } from '../lib/pdfGenerator';
import { SignatureAuditModal } from './SignatureAuditModal';
import { ShareSigningLinkModal } from './ShareSigningLinkModal';

interface AppModalsProps {
  products: Product[];
  sales: Sale[];
  installments: Installment[];
  settings: Settings;
  money: (val: number) => string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;

  // Add/Edit Product
  showAddProduct: boolean;
  setShowAddProduct: (v: boolean) => void;
  productToEdit: Product | null;
  setProductToEdit: (p: Product | null) => void;
  previewPhoto: string | null;
  setPreviewPhoto: (v: string | null) => void;
  onAddProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;

  // Contract Viewer
  selectedSaleForContract: Sale | null;
  setSelectedSaleForContract: (s: Sale | null) => void;
  isContractGenerating: boolean;
  onDownloadContract: (sale: Sale) => void;
  onPrintContract: (sale: Sale) => void;
  onShareContract: (sale: Sale) => void;
  onCopyContractText: (sale: Sale) => void;
  onEditSaleFromContract: (sale: Sale) => void;
  onDeleteSale: (id: string) => Promise<boolean>;

  // Receipt Viewer
  selectedInstallmentForReceipt: any;
  setSelectedInstallmentForReceipt: (inst: any) => void;
  onDownloadReceiptPDF: () => void;
  onShareReceipt: () => void;

  // Installment Payment / Interest-Only Modal
  selectedInstallmentForPayment: Installment | null;
  setSelectedInstallmentForPayment: (inst: Installment | null) => void;
  paymentType: 'interest' | 'amortization';
  setPaymentType: (t: 'interest' | 'amortization') => void;
  paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência';
  setPaymentMethod: (
    m: 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'
  ) => void;
  amortizationAmount: string;
  setAmortizationAmount: (v: string) => void;
  onConfirmPaymentSubmit: (isAmortizing: boolean) => Promise<void>;

  // Edit Installment Due Date Modal
  selectedInstallmentForDueDate: Installment | null;
  setSelectedInstallmentForDueDate: (inst: Installment | null) => void;
  onUpdateInstallmentDueDate: (
    installmentId: string,
    newDueDateStr: string,
    scope: 'single' | 'following'
  ) => Promise<{ success: boolean; updatedCount: number }>;

  // Advance Installments Modal
  selectedSaleForAdvance: Sale | null;
  setSelectedSaleForAdvance: (s: Sale | null) => void;
  advancePendingInsts: Installment[];
  advanceSelectedInstIds: string[];
  setAdvanceSelectedInstIds: (ids: string[]) => void;
  advanceGlobalDiscount: number;
  advanceCustomDiscounts: { [instId: string]: number };
  advancePaymentMethod: 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência';
  setAdvancePaymentMethod: (
    m: 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'
  ) => void;
  advanceCalculations: {
    selectedCount: number;
    totalOriginal: number;
    totalDiscount: number;
    totalFinal: number;
    effectiveDiscountPct: string;
  };
  onSetGlobalDiscount: (pct: number) => void;
  onCustomDiscountChange: (instId: string, val: number) => void;
  onToggleSelectAdvanceInst: (instId: string) => void;
  onConfirmAdvance: () => Promise<void>;

  // Capital Manager Modal
  showCapitalManagerModal: boolean;
  setShowCapitalManagerModal: (v: boolean) => void;
  capitalBatchCosts: { [productId: string]: number };
  setCapitalBatchCosts: (map: { [productId: string]: number }) => void;
  capitalBatchPercent: number;
  onApplyCapitalBatchPercent: (pct: number) => void;
  onSaveCapitalBatch: () => Promise<void>;

  // Quick Pickers
  showQuickPaymentPicker: boolean;
  setShowQuickPaymentPicker: (v: boolean) => void;
  quickPaymentClientFilter: string | null;
  showAdvanceSalePicker: boolean;
  setShowAdvanceSalePicker: (v: boolean) => void;
  onOpenAdvanceModal: (sale: Sale) => void;

  // Electronic Signature & Audit Modals
  shareSignModalSale: Sale | null;
  setShareSignModalSale: (s: Sale | null) => void;
  auditModalSale: Sale | null;
  setAuditModalSale: (s: Sale | null) => void;
  onSignOnDevice: (sale: Sale) => void;
  onResetDigitalSignature: (saleId: string) => Promise<boolean>;

  // Confirm Modal & Toast
  confirmModal: {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  setConfirmModal: Dispatch<
    SetStateAction<{
      show: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
    }>
  >;
  toast: { msg: string; type: 'success' | 'error' } | null;
}

export function AppModals(props: AppModalsProps) {
  const {
    products,
    sales,
    installments,
    settings,
    money,
    showToast,
    openConfirm,
    showAddProduct,
    setShowAddProduct,
    productToEdit,
    setProductToEdit,
    previewPhoto,
    setPreviewPhoto,
    onAddProduct,
    onUpdateProduct,
    selectedSaleForContract,
    setSelectedSaleForContract,
    isContractGenerating,
    onDownloadContract,
    onPrintContract,
    onShareContract,
    onCopyContractText,
    onEditSaleFromContract,
    onDeleteSale,
    selectedInstallmentForReceipt,
    setSelectedInstallmentForReceipt,
    onDownloadReceiptPDF,
    onShareReceipt,
    selectedInstallmentForPayment,
    setSelectedInstallmentForPayment,
    paymentType,
    setPaymentType,
    paymentMethod,
    setPaymentMethod,
    amortizationAmount,
    setAmortizationAmount,
    onConfirmPaymentSubmit,
    selectedInstallmentForDueDate,
    setSelectedInstallmentForDueDate,
    onUpdateInstallmentDueDate,
    selectedSaleForAdvance,
    setSelectedSaleForAdvance,
    advancePendingInsts,
    advanceSelectedInstIds,
    setAdvanceSelectedInstIds,
    advanceGlobalDiscount,
    advanceCustomDiscounts,
    advancePaymentMethod,
    setAdvancePaymentMethod,
    advanceCalculations,
    onSetGlobalDiscount,
    onCustomDiscountChange,
    onToggleSelectAdvanceInst,
    onConfirmAdvance,
    showCapitalManagerModal,
    setShowCapitalManagerModal,
    capitalBatchCosts,
    setCapitalBatchCosts,
    capitalBatchPercent,
    onApplyCapitalBatchPercent,
    onSaveCapitalBatch,
    showQuickPaymentPicker,
    setShowQuickPaymentPicker,
    quickPaymentClientFilter,
    showAdvanceSalePicker,
    setShowAdvanceSalePicker,
    onOpenAdvanceModal,
    shareSignModalSale,
    setShareSignModalSale,
    auditModalSale,
    setAuditModalSale,
    onSignOnDevice,
    onResetDigitalSignature,
    confirmModal,
    setConfirmModal,
    toast,
  } = props;

  const stripSignatureLocal = (sale: Sale): Sale => ({
    ...sale,
    isSigned: false,
    signature: undefined,
    signatureImage: undefined,
    signedAt: undefined,
    signerIp: undefined,
    signerUserAgent: undefined,
    signatureHash: undefined,
  });

  const handleRequestResetSignature = (
    saleToReset: Sale,
    options?: { openShareAfter?: boolean }
  ) => {
    openConfirm(
      'Refazer Assinatura do Contrato',
      `Deseja remover a assinatura atual do contrato de ${saleToReset.client} e liberar o documento para que o cliente assine novamente?`,
      async () => {
        const ok = await onResetDigitalSignature(saleToReset.id);
        if (!ok) {
          showToast('Não foi possível liberar o contrato para nova assinatura.', 'error');
          return;
        }
        const cleanSale = stripSignatureLocal(saleToReset);
        if (selectedSaleForContract?.id === saleToReset.id) {
          setSelectedSaleForContract(cleanSale);
        }
        if (shareSignModalSale?.id === saleToReset.id) {
          setShareSignModalSale(cleanSale);
        }
        if (auditModalSale?.id === saleToReset.id) {
          setAuditModalSale(null);
          if (options?.openShareAfter) {
            setShareSignModalSale(cleanSale);
          }
        }
        showToast('Assinatura removida! O contrato foi liberado para nova assinatura.');
      }
    );
  };

  return (
    <AnimatePresence>
      {/* Modal: Cadastrar / Editar Produto */}
      {showAddProduct && (
        <div key="modal-add-product" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddProduct(false);
              setProductToEdit(null);
              setPreviewPhoto(null);
            }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative glass-card w-full max-w-lg p-5 sm:p-7 bg-[#0d111a] max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {productToEdit ? 'Editar Produto' : 'Novo Produto no Estoque'}
                </h3>
                <p className="text-xs text-zinc-400">Defina custo, preço de venda e disponibilidade</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddProduct(false);
                  setProductToEdit(null);
                  setPreviewPhoto(null);
                }}
                className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              key={productToEdit?.id || 'new-product'}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.target as any;
                const file = f.photo.files[0];
                const handleSuccess = (photoUrl?: string) => {
                  const qtyVal = Number(f.quantity.value);
                  const newStatus = qtyVal > 0 ? 'Disponivel' : 'Vendido';
                  const imeiVal = (f.imei?.value || '').trim().slice(0, 64);
                  if (productToEdit) {
                    onUpdateProduct(productToEdit.id, {
                      name: f.name.value,
                      cost: Number(f.cost.value),
                      sale: Number(f.sale.value),
                      category: f.category.value,
                      imei: imeiVal,
                      quantity: qtyVal,
                      status: newStatus as any,
                      photo: photoUrl || previewPhoto || productToEdit.photo || undefined,
                    });
                    showToast('Produto atualizado com sucesso.');
                  } else {
                    onAddProduct({
                      name: f.name.value,
                      cost: Number(f.cost.value),
                      sale: Number(f.sale.value),
                      category: f.category.value,
                      imei: imeiVal || undefined,
                      quantity: qtyVal,
                      status: newStatus as any,
                      photo: photoUrl,
                    });
                    showToast('Produto cadastrado no estoque.');
                  }
                  setShowAddProduct(false);
                  setProductToEdit(null);
                  setPreviewPhoto(null);
                };
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (re) => handleSuccess(re.target?.result as string);
                  reader.readAsDataURL(file);
                } else {
                  handleSuccess();
                }
              }}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-300">Nome / Modelo *</label>
                <input
                  name="name"
                  required
                  defaultValue={productToEdit?.name || ''}
                  placeholder="Ex: iPhone 15 Pro Max 256GB"
                  className="fintech-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Categoria</label>
                  <select
                    name="category"
                    defaultValue={productToEdit?.category || 'Celular'}
                    className="fintech-select"
                  >
                    <option>Celular</option>
                    <option>Eletrônico</option>
                    <option>Hardware</option>
                    <option>Acessório</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Imagem do Produto</label>
                  <div className="relative h-11 border border-white/[0.1] rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-zinc-300 overflow-hidden bg-[#07090e] hover:border-gold/40 transition-colors">
                    <ImageIcon size={16} className="text-gold" />
                    <span>{previewPhoto || productToEdit?.photo ? 'Foto selecionada' : 'Enviar Imagem'}</span>
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = (re) => setPreviewPhoto(re.target?.result as string);
                          r.readAsDataURL(f);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-zinc-300">IMEI do Aparelho</label>
                  <span className="text-[11px] text-zinc-500">Opcional • Identificação do celular</span>
                </div>
                <input
                  name="imei"
                  type="text"
                  maxLength={64}
                  defaultValue={productToEdit?.imei || ''}
                  placeholder="Ex: 356789012345678"
                  className="fintech-input font-mono tracking-wide tabular-figure"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Custo (R$)</label>
                  <input
                    name="cost"
                    type="number"
                    step="0.01"
                    defaultValue={productToEdit?.cost !== undefined ? productToEdit.cost : ''}
                    placeholder="0,00"
                    className="fintech-input tabular-figure"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gold">Valor Venda (R$) *</label>
                  <input
                    name="sale"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={productToEdit?.sale || ''}
                    placeholder="0,00"
                    className="fintech-input text-gold font-bold tabular-figure"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Quantidade *</label>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    required
                    defaultValue={productToEdit?.quantity !== undefined ? productToEdit.quantity : 1}
                    className="fintech-input tabular-figure"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProduct(false);
                    setProductToEdit(null);
                    setPreviewPhoto(null);
                  }}
                  className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-gold hover:brightness-110 text-[#07090e] font-bold text-xs shadow-[0_4px_14px_rgba(243,186,47,0.22)] cursor-pointer"
                >
                  {productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Visualização & Impressão de Contrato */}
      {selectedSaleForContract &&
        (() => {
          const baseContractSale = sales.find((s) => s.id === selectedSaleForContract.id) || selectedSaleForContract;
          const linkedProductImei = (products.find((p) => p.id === baseContractSale.productId)?.imei || '').trim();
          const resolvedContractImei = (baseContractSale.productImei || linkedProductImei || '').trim();
          const activeContractSale =
            baseContractSale.productImei || !resolvedContractImei
              ? baseContractSale
              : { ...baseContractSale, productImei: resolvedContractImei };
          const isContractSigned = !!(activeContractSale.isSigned || activeContractSale.signature?.signed);
          const contractSigImg = activeContractSale.signatureImage || activeContractSale.signature?.signatureImage;
          const contractHash = activeContractSale.signature?.signatureHash || activeContractSale.signatureHash;
          const contractIp = activeContractSale.signature?.signerIp || activeContractSale.signerIp;
          const contractSignedAt =
            activeContractSale.signature?.signedAtFormatted ||
            (activeContractSale.signedAt ? new Date(activeContractSale.signedAt).toLocaleString('pt-BR') : '');

          return (
            <div
              key="modal-contract"
              className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 overflow-y-auto custom-scrollbar"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSaleForContract(null)}
                className="fixed inset-0 bg-black/85 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="relative bg-white w-full max-w-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh] rounded-2xl text-black font-sans my-auto"
              >
                <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-2.5 no-print shadow-sm mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-black text-gold flex items-center justify-center font-black">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase text-black tracking-wider">
                          Contrato de Compra e Venda
                        </h3>
                        {isContractSigned && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase">
                            Assinado
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{activeContractSale.client}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onDownloadContract(activeContractSale)}
                      disabled={isContractGenerating}
                      className="h-9 px-3.5 rounded-xl bg-black text-gold hover:bg-gold hover:text-black transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Baixar Arquivo PDF (1 Página A4)"
                    >
                      <Download size={14} />
                      <span>{isContractGenerating ? 'Gerando...' : 'Baixar PDF'}</span>
                    </button>

                    <button
                      onClick={() => setShareSignModalSale(activeContractSale)}
                      className="h-9 px-3 rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                      title="Link de Assinatura Eletrônica"
                    >
                      <Link2 size={14} />
                      <span className="hidden sm:inline">Assinatura</span>
                    </button>

                    {isContractSigned && (
                      <>
                        <button
                          onClick={() => setAuditModalSale(activeContractSale)}
                          className="h-9 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                          title="Ver Certificado e Auditoria Digital"
                        >
                          <ShieldCheck size={14} />
                          <span className="hidden sm:inline">Auditoria</span>
                        </button>

                        <button
                          onClick={() => handleRequestResetSignature(activeContractSale)}
                          className="h-9 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                          title="Remover assinatura atual e liberar para o cliente assinar novamente"
                        >
                          <RotateCcw size={14} />
                          <span className="hidden sm:inline">Refazer Assinatura</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onPrintContract(activeContractSale)}
                      className="h-9 px-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                      title="Imprimir ou Salvar via Navegador"
                    >
                      <Printer size={14} />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <button
                      onClick={() => onShareContract(activeContractSale)}
                      className="h-9 px-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                      title="Compartilhar Arquivo PDF"
                    >
                      <Share2 size={14} />
                      <span className="hidden sm:inline">Compartilhar</span>
                    </button>

                    <button
                      onClick={() => onCopyContractText(activeContractSale)}
                      className="h-9 px-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                      title="Copiar Texto do Contrato"
                    >
                      <Copy size={14} />
                      <span className="hidden sm:inline">Copiar Texto</span>
                    </button>

                    <button
                      onClick={() => {
                        if (isContractSigned) {
                          showToast(
                            'Este contrato já foi assinado digitalmente e está bloqueado para edições.',
                            'error'
                          );
                          return;
                        }
                        setSelectedSaleForContract(null);
                        onEditSaleFromContract(activeContractSale);
                      }}
                      className={`h-9 px-3 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 ${
                        isContractSigned
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-amber-500/10 border-amber-500/40 text-amber-800 hover:bg-amber-500 hover:text-black cursor-pointer'
                      }`}
                      title={
                        isContractSigned ? 'Contrato assinado digitalmente (edição bloqueada)' : 'Editar este contrato'
                      }
                    >
                      <Pencil size={14} />
                      <span className="hidden sm:inline">{isContractSigned ? 'Selado' : 'Editar'}</span>
                    </button>

                    <button
                      onClick={() => {
                        openConfirm(
                          'Excluir Contrato Permanentemente',
                          `Deseja realmente excluir o contrato de ${activeContractSale.client} (${money(activeContractSale.total)}) e todas as suas parcelas? Esta ação é irreversível.`,
                          async () => {
                            setSelectedSaleForContract(null);
                            const ok = await onDeleteSale(activeContractSale.id);
                            if (ok) showToast('Contrato e parcelas excluídos com sucesso!');
                          }
                        );
                      }}
                      className="h-9 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                      title="Excluir este contrato permanentemente"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>

                    <button
                      onClick={() => setSelectedSaleForContract(null)}
                      className="h-9 w-9 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div id="contract-content" className="bg-white p-2 sm:p-4 font-sans text-slate-800 print:p-2 text-xs">
                  {(() => {
                    const company = (settings.companyName || 'NEXUS COMMERCE').toUpperCase();
                    const sellerName = getSystemSellerName(settings, activeContractSale);
                    const cleanId = activeContractSale.id.substring(0, 8).toUpperCase();
                    const dateFormatted = formatLocalDateBR(
                      activeContractSale.date || activeContractSale.createdAt || new Date()
                    );

                    let dueDay = '—';
                    if (installments && installments.length > 0) {
                      const matchingInst = installments.find((i) => i.saleId === activeContractSale.id);
                      if (matchingInst?.dueDate) {
                        dueDay = extractDueDay(matchingInst.dueDate);
                      }
                    }
                    if (dueDay === '—' && activeContractSale.date) {
                      dueDay = extractDueDay(activeContractSale.date);
                    }

                    const downPayment = activeContractSale.downPayment || 0;
                    const installmentsCount = activeContractSale.installmentsCount || 1;
                    const installmentVal = activeContractSale.installmentValue || 0;
                    const isInterest = !!activeContractSale.isInterestOnly;
                    const interestRate = activeContractSale.interestRate || 0;

                    return (
                      <div className="max-w-[720px] mx-auto flex flex-col gap-3.5 leading-normal">
                        <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="text-[9.5px] font-black uppercase text-amber-700 tracking-widest block">
                              {company}
                            </span>
                            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                              Contrato de Compra e Venda
                            </h1>
                            <span className="text-[9px] text-slate-500 font-semibold">
                              Instrumento Particular de Compromisso de Venda e Confissão de Dívida
                            </span>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-mono text-[10px] font-black text-slate-900 inline-block">
                              Nº: CT-{cleanId}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                              Emissão: <strong className="text-slate-800">{dateFormatted}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                              📋 Quadro-Resumo da Transação
                            </span>
                            {isInterest ? (
                              <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 text-[8.5px] font-black uppercase rounded-full">
                                Juros Mensais ({interestRate}% a.m.)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-sky-100 border border-sky-300 text-sky-900 text-[8.5px] font-black uppercase rounded-full">
                                Parcelamento Direto
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[10.5px]">
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                Comprador(a)
                              </span>
                              <strong className="text-slate-900 uppercase">{activeContractSale.client}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                CPF{activeContractSale.clientRg ? ' / RG' : ' / Documento'}
                              </span>
                              <strong className="text-slate-900">
                                {activeContractSale.clientCpf || 'Registrado em Sistema'}
                                {activeContractSale.clientRg ? ` • RG: ${activeContractSale.clientRg}` : ''}
                              </strong>
                            </div>
                            <div className={resolvedContractImei ? '' : 'sm:col-span-2'}>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                Produto / Bem Alienado
                              </span>
                              <strong className="text-slate-900 uppercase">
                                {(activeContractSale.productName || 'Produto Comercial').toUpperCase()}
                              </strong>
                            </div>
                            {resolvedContractImei && (
                              <div>
                                <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                  IMEI do Aparelho
                                </span>
                                <strong className="text-slate-900 font-mono tracking-wide">
                                  {resolvedContractImei}
                                </strong>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                Valor Total da Operação
                              </span>
                              <strong className="text-xs font-black text-slate-900">
                                {money(activeContractSale.total)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                Entrada Liquidada
                              </span>
                              <strong
                                className={
                                  downPayment > 0 ? 'text-emerald-700 font-bold' : 'text-slate-600 font-medium'
                                }
                              >
                                {downPayment > 0 ? money(downPayment) : 'Sem entrada'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                Plano de Pagamento
                              </span>
                              <strong className="text-slate-900">
                                {isInterest
                                  ? `${installmentsCount} parcelas de juros de ${money(installmentVal)}`
                                  : `${installmentsCount} parcelas de ${money(installmentVal)}`}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">
                                Vencimento Recorrente
                              </span>
                              <strong className="text-slate-900">Todo dia {dueDay} de cada mês</strong>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-[10px] text-slate-600 pt-0.5">
                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">
                              Cláusula 1ª – Das Partes Contratantes
                            </strong>
                            <p className="text-justify">
                              Pelo presente instrumento, de um lado denominada(o) <strong>VENDEDOR(A)</strong>:{' '}
                              <strong>{sellerName}</strong>; e de outro lado denominada(o) <strong>COMPRADOR(A)</strong>
                              : <strong>{activeContractSale.client.toUpperCase()}</strong>, CPF nº{' '}
                              <strong>{activeContractSale.clientCpf || 'N/A'}</strong>
                              {activeContractSale.clientRg ? (
                                <>
                                  , RG nº <strong>{activeContractSale.clientRg}</strong>
                                </>
                              ) : null}
                              , telefone{' '}
                              <strong>{activeContractSale.clientPhone || 'N/A'}</strong>
                              {activeContractSale.clientAddress
                                ? `, residente em ${activeContractSale.clientAddress}`
                                : ''}
                              , firmam o presente compromisso de compra e venda mercantil.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">
                              Cláusula 2ª – Do Objeto e Reserva de Domínio
                            </strong>
                            <p className="text-justify">
                              O presente contrato tem por objeto a venda com reserva de domínio (nos termos do art. 521 e
                              seguintes do Código Civil) do bem:{' '}
                              <strong>
                                {(activeContractSale.productName || 'PRODUTO REGISTRADO').toUpperCase()}
                                {resolvedContractImei ? ` (IMEI: ${resolvedContractImei})` : ''}
                              </strong>,
                              entregue em perfeitas condições de uso, conferido e aceito pelo Comprador. A propriedade
                              resolúvel do bem permanece com o VENDEDOR até a liquidação integral de todas as parcelas
                              pactuadas neste instrumento.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">
                              Cláusula 3ª – Do Preço, Condições e Amortização
                            </strong>
                            <p className="text-justify">
                              O valor integral estipulado é de <strong>{money(activeContractSale.total)}</strong>, a ser
                              liquidado conforme discriminado no Quadro-Resumo, com vencimento todo dia{' '}
                              <strong>{dueDay}</strong> de cada mês subsequente. É assegurado ao Comprador o direito de
                              realizar quitações antecipadas ou amortizações com o devido abatimento proporcional.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">
                              Cláusula 4ª – Da Tolerância, Encargos e Restrição por Atraso
                            </strong>
                            <p className="text-justify">
                              EVENTUAL ATRASO NA QUITAÇÃO DE PARCELAS ACARRETARÁ MULTA MORATÓRIA DE 2% (DOIS POR CENTO)
                              SOBRE O VALOR VENCIDO, ACRESCIDA DE JUROS DE MORA DE 1% (UM POR CENTO) AO MÊS, CALCULADOS{' '}
                              <em>PRO RATA DIE</em> ATÉ A EFETIVA QUITAÇÃO. APÓS 3 (TRÊS) DIAS CORRIDOS DE ATRASO, O
                              VENDEDOR FICA AUTORIZADO A APLICAR RESTRIÇÃO PARCIAL DE FUNCIONALIDADES DO APARELHO,
                              EXIBINDO NA TELA O CONTATO PARA NEGOCIAÇÃO. PERSISTINDO A INADIMPLÊNCIA APÓS 5 (CINCO)
                              DIAS CORRIDOS DE ATRASO, O VENDEDOR FICA AUTORIZADO A REALIZAR O BLOQUEIO TOTAL DO
                              FUNCIONAMENTO DO APARELHO ATÉ A REGULARIZAÇÃO DO DÉBITO. O DESBLOQUEIO SERÁ EFETUADO EM
                              ATÉ 24 (VINTE E QUATRO) HORAS APÓS A CONFIRMAÇÃO DO PAGAMENTO INTEGRAL. Fica expressamente
                              proibida qualquer tentativa de remoção, formatação clandestina ou burla do sistema de
                              segurança do dispositivo pelo comprador, sob pena de vencimento antecipado de todo o saldo
                              devedor e adoção das medidas legais cabíveis.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">
                              Cláusula 5ª – Da Eficácia, Notificações e Confissão de Dívida
                            </strong>
                            <p className="text-justify">
                              As partes reconhecem a plena validade jurídica deste instrumento eletrônico e de seus
                              respectivos comprovantes, constituindo confissão líquida, certa e exigível de dívida nos
                              termos do art. 784, inciso III do Código de Processo Civil Brasileiro. Fica acordado que
                              avisos, notificações e cobranças enviadas por meio do aplicativo de mensagens WhatsApp ao
                              número cadastrado pelo Comprador possuem plena validade jurídica para fins de comunicação
                              formal.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">
                              Cláusula 6ª – Do Foro
                            </strong>
                            <p className="text-justify">
                              Fica eleito o foro da comarca da sede do Vendedor para dirimir quaisquer dúvidas decorrentes
                              do presente contrato.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <p className="text-center text-[8.5px] text-slate-400 uppercase tracking-wider mb-5">
                            E por estarem de pleno acordo, firmam o presente compromisso.
                          </p>
                          <div className="grid grid-cols-2 gap-8 sm:gap-14 px-4 items-end">
                            <div className="text-center space-y-1">
                              <div className="h-[1.5px] bg-slate-700 w-full" />
                              <div className="flex flex-col">
                                <strong className="text-[9.5px] font-bold uppercase text-slate-900">{sellerName}</strong>
                                <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest">
                                  Vendedor(a)
                                </span>
                              </div>
                            </div>
                            <div className="text-center space-y-1 flex flex-col items-center">
                              {isContractSigned && contractSigImg && (
                                <div className="mb-1 flex flex-col items-center">
                                  <img
                                    src={contractSigImg}
                                    alt={`Assinatura de ${activeContractSale.client}`}
                                    className="max-h-14 max-w-[180px] object-contain filter contrast-125"
                                  />
                                  <span className="text-[7.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                                    ✓ Assinado Digitalmente
                                  </span>
                                </div>
                              )}
                              <div className="h-[1.5px] bg-slate-700 w-full" />
                              <div className="flex flex-col">
                                <strong className="text-[9.5px] font-bold uppercase text-slate-900">
                                  {activeContractSale.client}
                                </strong>
                                <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest">
                                  Comprador(a)
                                  {activeContractSale.clientRg ? ` • RG: ${activeContractSale.clientRg}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {isContractSigned && contractHash ? (
                          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[7.5px] text-emerald-950 font-mono space-y-0.5">
                            <div className="font-bold break-all">HASH SHA-256: {contractHash}</div>
                            <div className="flex flex-wrap justify-between text-emerald-800 gap-2">
                              <span>IP: {contractIp || 'Registrado'}</span>
                              <span>DATA/HORA: {contractSignedAt || dateFormatted} • MP 2.200-2/2001</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-2 flex justify-between border-t border-dashed border-slate-200 text-[7.5px] text-slate-400 uppercase font-mono">
                            <span>Autenticação: {activeContractSale.id.toUpperCase()}</span>
                            <span>Via Original Digital • Emissão: {dateFormatted}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          );
        })()}

      {/* Modal: Comprovante / Recibo de Pagamento */}
      {selectedInstallmentForReceipt &&
        (() => {
          const correspondingSale = sales.find(
            (s) =>
              s.id === selectedInstallmentForReceipt.saleId ||
              (selectedInstallmentForReceipt?.id &&
                selectedInstallmentForReceipt.id.replace('entrada-', '') === s.id)
          );
          const transactionDate =
            selectedInstallmentForReceipt.paidAt || selectedInstallmentForReceipt.date || new Date().toISOString();
          const cleanId = selectedInstallmentForReceipt.id.toUpperCase();

          return (
            <div
              key="modal-receipt"
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-10 overflow-y-auto backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedInstallmentForReceipt(null)}
                className="fixed inset-0 bg-black/85"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white w-full max-w-2xl p-5 sm:p-8 text-zinc-950 font-sans border-t-8 border-gold rounded-3xl shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex flex-wrap gap-3 items-center justify-between pb-4 border-b border-zinc-100 no-print">
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
                    Ações do Comprovante
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onDownloadReceiptPDF}
                      className="h-9 px-3.5 rounded-xl bg-zinc-900 text-white flex items-center gap-1.5 hover:bg-zinc-800 transition-all text-xs font-bold shadow cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Baixar PDF</span>
                    </button>
                    <button
                      onClick={onShareReceipt}
                      className="h-9 px-3.5 rounded-xl bg-gold text-black flex items-center gap-1.5 hover:brightness-105 transition-all text-xs font-bold shadow cursor-pointer"
                    >
                      <Share2 size={14} />
                      <span>Compartilhar</span>
                    </button>
                    <button
                      onClick={() => setSelectedInstallmentForReceipt(null)}
                      className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div
                  id="receipt-content"
                  className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 text-zinc-800 flex flex-col gap-5"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-zinc-200">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase font-extrabold tracking-widest text-amber-600">
                        {settings.companyName || 'NEXUS COMMERCE'}
                      </span>
                      <h2 className="text-xl font-black text-zinc-900 tracking-tight">COMPROVANTE DE RECEBIMENTO</h2>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">
                        Terminal de Operações Comerciais
                      </span>
                    </div>
                    <div className="text-left sm:text-right flex flex-col sm:items-end gap-1">
                      <span className="px-2.5 py-1 bg-zinc-100 rounded-lg text-[10px] font-mono text-zinc-700 font-bold uppercase">
                        ID: {cleanId.substring(0, 12)}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1">
                        Emitido em: {formatLocalDateBR(transactionDate, { showTime: true })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">
                      Valor Liquidado
                    </span>
                    <strong className="text-4xl font-black text-zinc-900 tracking-tight mt-1 tabular-figure">
                      {money(selectedInstallmentForReceipt.value)}
                    </strong>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider mt-3">
                      Transação Aprovada & Conciliada
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-zinc-700 leading-relaxed space-y-2">
                    <p>
                      Declaramos que recebemos de{' '}
                      <strong className="text-zinc-900 font-extrabold uppercase">
                        {selectedInstallmentForReceipt.client}
                      </strong>{' '}
                      o valor integral de <strong className="text-zinc-900">{money(selectedInstallmentForReceipt.value)}</strong>.
                    </p>
                    <p>
                      Referente ao pagamento da{' '}
                      {selectedInstallmentForReceipt.type === 'entrada' ? (
                        <strong className="text-zinc-900">Entrada Operacional / Sinal</strong>
                      ) : (
                        <>
                          parcela <strong>Nº {selectedInstallmentForReceipt.number}</strong> de{' '}
                          <strong>{selectedInstallmentForReceipt.total} parcelas</strong>
                        </>
                      )}{' '}
                      vinculado ao produto:{' '}
                      <strong className="text-zinc-900">
                        {selectedInstallmentForReceipt.productName ||
                          correspondingSale?.productName ||
                          'Produto Registrado'}
                      </strong>
                      .
                    </p>
                  </div>

                  <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                    <div className="bg-zinc-50 p-3 font-black uppercase tracking-wider border-b border-zinc-200 text-zinc-800 flex items-center justify-between">
                      <span>Especificações da Liquidação</span>
                      <span className="text-[9px] text-zinc-400">Via do Cliente</span>
                    </div>
                    <div className="divide-y divide-zinc-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-1">
                        <span className="text-zinc-500 font-semibold uppercase text-[10px]">Pagador (Cliente):</span>
                        <strong className="text-zinc-950 font-bold uppercase">
                          {selectedInstallmentForReceipt.client}
                        </strong>
                      </div>
                      {correspondingSale?.clientCpf && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-1">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">CPF / CNPJ:</span>
                          <span className="text-zinc-950 font-mono font-bold">{correspondingSale.clientCpf}</span>
                        </div>
                      )}
                      {correspondingSale?.clientPhone && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-1">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">Telefone:</span>
                          <span className="text-zinc-950 font-bold">{correspondingSale.clientPhone}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-1">
                        <span className="text-zinc-500 font-semibold uppercase text-[10px]">Meio de Recebimento:</span>
                        <strong className="text-zinc-950 uppercase font-black">
                          {selectedInstallmentForReceipt.paymentMethod || 'PIX'}
                        </strong>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-1">
                        <span className="text-zinc-500 font-semibold uppercase text-[10px]">Vencimento Nominal:</span>
                        <span className="text-zinc-950 font-bold">
                          {formatLocalDateBR(selectedInstallmentForReceipt.dueDate || transactionDate)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 p-3 gap-1">
                        <span className="text-zinc-500 font-semibold uppercase text-[10px]">Protocolo Digital:</span>
                        <span className="text-zinc-900 font-mono font-semibold">{cleanId}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 font-semibold uppercase leading-relaxed text-center px-4 py-2 border border-zinc-100 rounded-xl">
                    Damos por este recibo plena, geral e irrevogável quitação do valor recebido constante neste
                    comprovante referente a esta parcela específica.
                  </p>

                  <div className="pt-3 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end text-xs">
                    <div>
                      <span className="block text-[8px] text-zinc-400 font-extrabold uppercase tracking-wider">
                        Emitido por terminal eletrônico
                      </span>
                      <strong className="block text-zinc-900 font-extrabold uppercase mt-1">
                        {settings.companyName || 'NEXUS COMMERCE'}
                      </strong>
                      <span className="block text-[10px] text-zinc-500">{settings.city || 'São Paulo - SP'}</span>
                    </div>
                    <div className="flex flex-col sm:items-end text-left sm:text-right gap-1 font-mono text-[9px] text-zinc-400">
                      <span>CERTIFICADO DIGITALMENTE</span>
                      <span>DATA LOG: {new Date(transactionDate).toISOString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}

      {/* Modal: Quitação / Amortização de Parcela */}
      {selectedInstallmentForPayment &&
        (() => {
          const correspondingSale = sales.find((s) => s.id === selectedInstallmentForPayment.saleId);
          const isInterestOnly = Boolean(correspondingSale?.isInterestOnly);
          const isAmortizing = isInterestOnly && paymentType === 'amortization';

          return (
            <div key="modal-payment" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedInstallmentForPayment(null)}
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="relative w-full max-w-[440px] glass-card p-6 sm:p-7 bg-[#0d111a] border-gold/25 shadow-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setSelectedInstallmentForPayment(null)}
                  className="absolute top-5 right-5 w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>

                <div className="mb-5 pr-10">
                  <h3 className="text-lg font-bold text-white">
                    {isInterestOnly ? 'Opções de Liquidação' : 'Confirmar Recebimento'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedInstallmentForPayment.client} · Parcela {selectedInstallmentForPayment.number}/
                    {selectedInstallmentForPayment.total}
                  </p>
                </div>

                {isInterestOnly && (
                  <div className="grid grid-cols-2 bg-[#07090e] border border-white/[0.08] rounded-xl p-1 mb-5 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('interest');
                        setAmortizationAmount('');
                      }}
                      className={`py-2.5 text-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        paymentType === 'interest' ? 'bg-gold text-[#07090e]' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Juros (Renovar 30d)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('amortization');
                        setAmortizationAmount('');
                      }}
                      className={`py-2.5 text-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        paymentType === 'amortization'
                          ? 'bg-gold text-[#07090e]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Amortizar Principal
                    </button>
                  </div>
                )}

                <div className="p-5 bg-[#07090e]/80 rounded-2xl border border-white/[0.08] text-center mb-5">
                  {isAmortizing ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">Valor da Amortização (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={correspondingSale?.total || 9999999}
                        value={amortizationAmount}
                        onChange={(e) => setAmortizationAmount(e.target.value)}
                        placeholder="0,00"
                        className="h-12 bg-[#0d111a] border border-white/[0.12] rounded-xl px-4 font-bold outline-none focus:border-gold text-white text-center text-xl tabular-figure"
                        autoFocus
                      />
                      {correspondingSale && (
                        <div className="mt-2 pt-2.5 border-t border-white/[0.06] text-xs text-zinc-400 space-y-1 text-left">
                          <div className="flex justify-between">
                            <span>Saldo Atual:</span>
                            <span className="font-semibold text-white tabular-figure">
                              {money(correspondingSale.total)}
                            </span>
                          </div>
                          {Number(amortizationAmount) > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Novo Saldo:</span>
                              <span className="font-bold tabular-figure">
                                {money(Math.max(0, correspondingSale.total - Number(amortizationAmount)))}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-zinc-400 block mb-1">
                        {isInterestOnly ? 'Rendimento do Ciclo (Juros)' : 'Valor da Parcela'}
                      </span>
                      <strong className="text-3xl text-white font-bold tracking-tight tabular-figure block">
                        {money(selectedInstallmentForPayment.value)}
                      </strong>
                      {isInterestOnly && (
                        <p className="text-[11px] text-gold mt-2">
                          ROI de {correspondingSale?.interestRate || 0}% · Renova automaticamente por +30 dias
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs font-medium text-zinc-400">Meio de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Pix', 'Dinheiro', 'Cartão', 'Transferência'].map((m) => {
                      const isActive =
                        paymentMethod === m ||
                        (m === 'Cartão' &&
                          (paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito'));
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            const mapping: Record<string, any> = {
                              Pix: 'Pix',
                              Dinheiro: 'Dinheiro',
                              Cartão: 'Cartão de Crédito',
                              Transferência: 'Transferência',
                            };
                            setPaymentMethod(mapping[m] || 'Pix');
                          }}
                          className={`h-10 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-gold text-[#07090e] border-gold'
                              : 'bg-white/[0.03] text-zinc-300 border-white/[0.08] hover:border-white/[0.2]'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onConfirmPaymentSubmit(isAmortizing)}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-[#07090e] rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap size={16} />
                  {isAmortizing
                    ? 'Confirmar Amortização'
                    : isInterestOnly
                      ? 'Confirmar Juros e Renovar'
                      : 'Confirmar Recebimento'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const instToEdit = selectedInstallmentForPayment;
                    setSelectedInstallmentForPayment(null);
                    setSelectedInstallmentForDueDate(instToEdit);
                  }}
                  className="w-full h-10 mt-2.5 rounded-xl bg-white/[0.03] hover:bg-gold/10 border border-white/[0.08] hover:border-gold/30 text-zinc-300 hover:text-gold text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar size={14} className="text-gold" />
                  <span>Alterar prazo de vencimento desta parcela</span>
                </button>
              </motion.div>
            </div>
          );
        })()}

      {/* Modal: Alterar Prazo de Vencimento */}
      {selectedInstallmentForDueDate && (
        <div key={`modal-edit-due-${selectedInstallmentForDueDate.id}`}>
          <EditInstallmentDueDateModal
            installment={selectedInstallmentForDueDate}
            allInstallments={installments}
            sale={sales.find((s) => s.id === selectedInstallmentForDueDate.saleId)}
            money={money}
            onClose={() => setSelectedInstallmentForDueDate(null)}
            onConfirm={onUpdateInstallmentDueDate}
            showToast={showToast}
          />
        </div>
      )}

      {/* Modal: Antecipação de Parcelas */}
      {selectedSaleForAdvance && (
        <div key="modal-advance" className="fixed inset-0 z-[250] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setSelectedSaleForAdvance(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-2xl bg-[#0d111a] border border-gold/30 rounded-2xl p-5 sm:p-7 shadow-2xl my-auto max-h-[90vh] overflow-y-auto custom-scrollbar z-10 text-left"
          >
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                  <Zap size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gold block">Liquidação Antecipada</span>
                  <h3 className="text-lg font-bold text-white">Antecipar Parcelas</h3>
                  <p className="text-xs text-zinc-400">
                    {selectedSaleForAdvance.client} · {selectedSaleForAdvance.productName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleForAdvance(null)}
                className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-5 p-4 rounded-xl bg-[#07090e]/70 border border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Percent size={13} className="text-gold" />
                  Desconto Global para Selecionadas
                </span>
                <span className="text-xs font-bold text-gold">{advanceGlobalDiscount}%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[0, 5, 10, 15, 20, 25, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onSetGlobalDiscount(pct)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      advanceGlobalDiscount === pct
                        ? 'bg-gold text-[#07090e] border-gold'
                        : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:border-gold/35'
                    }`}
                  >
                    {pct === 0 ? '0%' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-zinc-400">
                  Selecione as Parcelas ({advanceSelectedInstIds.length}/{advancePendingInsts.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (advanceSelectedInstIds.length === advancePendingInsts.length) {
                      setAdvanceSelectedInstIds([]);
                    } else {
                      setAdvanceSelectedInstIds(advancePendingInsts.map((i) => i.id));
                    }
                  }}
                  className="text-xs font-semibold text-gold hover:underline cursor-pointer"
                >
                  {advanceSelectedInstIds.length === advancePendingInsts.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {advancePendingInsts.map((inst) => {
                  const isSelected = advanceSelectedInstIds.includes(inst.id);
                  const currentDiscountPct = advanceCustomDiscounts[inst.id] ?? advanceGlobalDiscount ?? 0;
                  const origValue = Number(inst.value) || 0;
                  const discountVal = Number(((origValue * currentDiscountPct) / 100).toFixed(2));
                  const finalInstVal = Number(Math.max(0, origValue - discountVal).toFixed(2));

                  return (
                    <div
                      key={inst.id}
                      className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-gold/[0.06] border-gold/35 text-white'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 opacity-65'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectAdvanceInst(inst.id)}
                          className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">Parcela {inst.number}</span>
                            <span className="text-[11px] text-zinc-400">
                              Venc: {formatLocalDateBR(inst.dueDate)}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 tabular-figure">
                            Original: <strong className="text-zinc-200">{money(origValue)}</strong>
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex items-center gap-1.5 bg-[#07090e] border border-gold/30 rounded-lg px-2.5 py-1">
                            <span className="text-[11px] font-semibold text-gold">% Desc:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentDiscountPct}
                              onChange={(e) => onCustomDiscountChange(inst.id, parseFloat(e.target.value))}
                              className="w-11 bg-transparent text-center font-bold text-xs text-white outline-none tabular-figure"
                            />
                          </div>
                          <div className="text-right min-w-[84px]">
                            <span className="text-[10px] text-amber-400 block">A Pagar</span>
                            <span className="text-xs font-bold text-white tabular-figure">{money(finalInstVal)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-zinc-400 block mb-2">Forma de Recebimento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Pix', label: 'PIX' },
                  { id: 'Cartão de Crédito', label: 'Cartão' },
                  { id: 'Dinheiro', label: 'Dinheiro' },
                  { id: 'Transferência', label: 'TED / DOC' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAdvancePaymentMethod(m.id as any)}
                    className={`h-10 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      advancePaymentMethod === m.id
                        ? 'bg-gold text-[#07090e] border-gold'
                        : 'bg-white/[0.03] text-zinc-300 border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#07090e] border border-gold/25 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>Original:</span>
                  <strong className="text-zinc-200 line-through tabular-figure">
                    {money(advanceCalculations.totalOriginal)}
                  </strong>
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <span>Desconto Total:</span>
                  <span className="tabular-figure">
                    -{money(advanceCalculations.totalDiscount)} ({advanceCalculations.effectiveDiscountPct}%)
                  </span>
                </div>
              </div>
              <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.08]">
                <span className="text-[11px] font-medium text-gold block">Valor Final a Receber</span>
                <strong className="text-2xl font-bold text-white tabular-figure">
                  {money(advanceCalculations.totalFinal)}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedSaleForAdvance(null)}
                className="h-11 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 rounded-xl font-semibold text-xs border border-white/[0.08] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={advanceSelectedInstIds.length === 0}
                onClick={onConfirmAdvance}
                className="h-11 bg-gold text-[#07090e] rounded-xl font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={15} />
                Confirmar ({money(advanceCalculations.totalFinal)})
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Gerenciador de Capital Investido em Lote */}
      {showCapitalManagerModal && (
        <div key="modal-capital-manager" className="fixed inset-0 z-[240] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowCapitalManagerModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-2xl bg-[#0d111a] border border-white/[0.1] rounded-2xl p-5 sm:p-7 shadow-2xl max-h-[88vh] flex flex-col gap-5 z-10"
          >
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Gerenciar Capital Investido</h3>
                  <p className="text-xs text-zinc-400">Ajuste os custos de aquisição de múltiplos ativos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCapitalManagerModal(false)}
                className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#07090e]/70 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs font-medium text-zinc-300">Reajuste Rápido em Lote:</span>
              <div className="flex flex-wrap gap-1.5">
                {[-10, -5, 0, 5, 10, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onApplyCapitalBatchPercent(pct)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      capitalBatchPercent === pct
                        ? 'bg-gold text-[#07090e] border-gold'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:border-gold/30'
                    }`}
                  >
                    {pct > 0 ? `+${pct}%` : pct === 0 ? 'Original' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {products.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">Nenhum produto cadastrado no estoque.</p>
              ) : (
                products.map((p) => {
                  const qty = p.quantity !== undefined ? p.quantity : 1;
                  const batchVal = capitalBatchCosts[p.id] ?? p.cost ?? 0;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">{p.name}</span>
                        <span className="text-[11px] text-zinc-400">
                          Estoque: {qty} un. · Preço Venda: {money(p.sale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-zinc-400">Custo un.:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={batchVal}
                          onChange={(e) =>
                            setCapitalBatchCosts({
                              ...capitalBatchCosts,
                              [p.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-28 h-9 px-3 rounded-lg bg-[#07090e] border border-white/[0.1] text-xs font-semibold text-gold text-right outline-none focus:border-gold tabular-figure"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowCapitalManagerModal(false)}
                className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSaveCapitalBatch}
                className="h-11 rounded-xl bg-gold hover:brightness-110 text-[#07090e] font-bold text-xs cursor-pointer"
              >
                Salvar Custos Atualizados
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Seletor Rápido de Parcela para Quitação */}
      {showQuickPaymentPicker && (
        <div key="modal-quick-pay-picker" className="fixed inset-0 z-[240] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowQuickPaymentPicker(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-lg bg-[#0d111a] border border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col gap-4 z-10"
          >
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Selecionar Parcela para Quitar</h3>
                  <p className="text-xs text-zinc-400">
                    {quickPaymentClientFilter ? `Cliente: ${quickPaymentClientFilter}` : 'Parcelas pendentes ordenadas por vencimento'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickPaymentPicker(false)}
                className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {installments
                .filter(
                  (i) =>
                    i.status === 'Pendente' && (!quickPaymentClientFilter || i.client === quickPaymentClientFilter)
                )
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      setShowQuickPaymentPicker(false);
                      setSelectedInstallmentForPayment(inst);
                    }}
                    className="w-full p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-gold/35 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{inst.client}</span>
                      <span className="text-[11px] text-zinc-400 block truncate">
                        {inst.productName} · Parcela {inst.number}/{inst.total}
                      </span>
                      <span className="text-[11px] text-zinc-500">Venc: {formatLocalDateBR(inst.dueDate)}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <strong className="text-sm font-bold text-gold tabular-figure block">
                        {money(inst.value)}
                      </strong>
                      <span className="text-[11px] font-semibold text-emerald-400">Quitar →</span>
                    </div>
                  </button>
                ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Seletor de Contrato para Antecipação */}
      {showAdvanceSalePicker && (
        <div key="modal-advance-sale-picker" className="fixed inset-0 z-[240] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setShowAdvanceSalePicker(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-lg bg-[#0d111a] border border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] flex flex-col gap-4 z-10"
          >
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Selecionar Contrato para Antecipar</h3>
                  <p className="text-xs text-zinc-400">Escolha a operação que deseja liquidar com desconto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanceSalePicker(false)}
                className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {sales
                .filter((s) => installments.some((i) => i.saleId === s.id && i.status === 'Pendente'))
                .map((sale) => {
                  const pendingCount = installments.filter(
                    (i) => i.saleId === sale.id && i.status === 'Pendente'
                  ).length;
                  return (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => {
                        setShowAdvanceSalePicker(false);
                        onOpenAdvanceModal(sale);
                      }}
                      className="w-full p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-gold/35 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{sale.client}</span>
                        <span className="text-[11px] text-zinc-400 block truncate">{sale.productName}</span>
                        <span className="text-[11px] text-amber-400">{pendingCount} parcela(s) pendente(s)</span>
                      </div>
                      <div className="text-right shrink-0">
                        <strong className="text-sm font-bold text-gold tabular-figure block">
                          {money(sale.total)}
                        </strong>
                        <span className="text-[11px] font-semibold text-gold">Antecipar →</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modais de Assinatura Eletrônica & Auditoria */}
      {shareSignModalSale && (
        <ShareSigningLinkModal
          key="modal-share-sign"
          sale={sales.find((s) => s.id === shareSignModalSale.id) || shareSignModalSale}
          settings={settings}
          onClose={() => setShareSignModalSale(null)}
          onSignOnDevice={(saleToSign) => {
            setShareSignModalSale(null);
            onSignOnDevice(saleToSign);
          }}
          onViewAudit={(saleForAudit) => {
            setShareSignModalSale(null);
            setAuditModalSale(saleForAudit);
          }}
          onResetSignature={(saleToReset) => handleRequestResetSignature(saleToReset)}
        />
      )}

      {auditModalSale && (
        <SignatureAuditModal
          key="modal-signature-audit"
          sale={sales.find((s) => s.id === auditModalSale.id) || auditModalSale}
          settings={settings}
          installments={installments}
          onClose={() => setAuditModalSale(null)}
          onResetSignature={(saleToReset) =>
            handleRequestResetSignature(saleToReset, { openShareAfter: true })
          }
        />
      )}

      {/* Modal: Confirmação */}
      {confirmModal.show && (
        <div key="modal-confirm" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
          />
          <div className="relative w-full max-w-sm glass-card p-6 sm:p-7 bg-[#0d111a] text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 grid place-items-center mx-auto mb-4">
              <X size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                className="h-10 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal((prev) => ({ ...prev, show: false }));
                }}
                className="h-10 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <motion.div
          key="toast-notice"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[350] px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 max-w-[92vw] ${
            toast.type === 'success'
              ? 'bg-[#0d111a]/95 border-emerald-500/35 text-emerald-400'
              : 'bg-[#0d111a]/95 border-red-500/35 text-red-400'
          }`}
        >
          <Zap size={16} className="shrink-0" />
          <span className="font-semibold text-xs text-zinc-100">{toast.msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditInstallmentDueDateModal({
  installment,
  allInstallments,
  sale,
  money,
  onClose,
  onConfirm,
  showToast,
}: {
  installment: Installment;
  allInstallments: Installment[];
  sale?: Sale;
  money: (val: number) => string;
  onClose: () => void;
  onConfirm: (
    installmentId: string,
    newDueDateStr: string,
    scope: 'single' | 'following'
  ) => Promise<{ success: boolean; updatedCount: number }>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const originalDateStr = getLocalDateString(installment.dueDate);
  const [newDateStr, setNewDateStr] = useState<string>(originalDateStr);
  const [scope, setScope] = useState<'single' | 'following'>('single');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewDateStr(getLocalDateString(installment.dueDate));
    setScope('single');
    setIsSaving(false);
  }, [installment.id, installment.dueDate]);

  const followingPendingCount = allInstallments.filter(
    (i) => i.saleId === installment.saleId && i.status === 'Pendente' && i.number > installment.number
  ).length;

  const todayMidnight = parseDateToMidnight(new Date());
  const dueMidnight = parseDateToMidnight(installment.dueDate);
  const isOverdue = installment.status !== 'Pago' && dueMidnight < todayMidnight;
  const todayStr = getLocalDateString(new Date());

  const addDaysToOriginal = (days: number): string => {
    const parsed = parseDateSafe(installment.dueDate);
    const base = parsed
      ? new Date(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0)
      : new Date();
    base.setDate(base.getDate() + days);
    return getLocalDateString(base);
  };

  const addOneMonthToOriginal = (): string => {
    const parsed = parseDateSafe(installment.dueDate);
    if (!parsed) return addDaysToOriginal(30);
    const targetMonthIndex = parsed.month; // 0-indexed next month = (parsed.month - 1) + 1
    const lastDay = new Date(parsed.year, targetMonthIndex + 1, 0).getDate();
    const clampedDay = Math.min(parsed.day, lastDay);
    return getLocalDateString(new Date(parsed.year, targetMonthIndex, clampedDay, 12, 0, 0));
  };

  const quickPresets: { label: string; value: string }[] = [
    ...(isOverdue ? [{ label: 'Hoje', value: todayStr }] : []),
    { label: '+5 dias', value: addDaysToOriginal(5) },
    { label: '+10 dias', value: addDaysToOriginal(10) },
    { label: '+15 dias', value: addDaysToOriginal(15) },
    { label: '+1 mês', value: addOneMonthToOriginal() },
  ];

  const newDueDay = extractDueDay(newDateStr);
  const effectiveScope = followingPendingCount > 0 ? scope : 'single';
  const totalAffected = effectiveScope === 'following' ? 1 + followingPendingCount : 1;

  const handleSubmit = async () => {
    if (!newDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(newDateStr)) {
      showToast('Selecione uma nova data de vencimento válida.', 'error');
      return;
    }
    setIsSaving(true);
    const res = await onConfirm(installment.id, newDateStr, effectiveScope);
    setIsSaving(false);
    if (res.success) {
      onClose();
      showToast(
        res.updatedCount > 1
          ? `Prazo atualizado em ${res.updatedCount} parcelas para todo dia ${newDueDay}!`
          : `Vencimento da parcela ${installment.number}/${installment.total} alterado para ${formatLocalDateBR(newDateStr)}.`
      );
    } else {
      showToast('Não foi possível salvar a alteração de vencimento.', 'error');
    }
  };

  return (
    <div key="modal-edit-due-date" className="fixed inset-0 z-[265] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-md glass-card p-6 sm:p-7 bg-[#0d111a] border border-gold/30 shadow-2xl z-10 text-left my-auto"
      >
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/35 flex items-center justify-center text-gold shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Alterar Prazo de Vencimento</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {installment.client} · Parcela {installment.number}/{installment.total}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-[#07090e] border border-white/[0.06] mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Aparelho / Contrato</span>
            <span className="text-zinc-200 font-semibold truncate max-w-[60%]">
              {installment.productName || sale?.productName || 'Produto Registrado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Valor da Parcela</span>
            <span className="text-gold font-bold tabular-figure">{money(installment.value)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Vencimento Atual</span>
            <span className="text-zinc-200 font-semibold tabular-figure">
              {formatLocalDateBR(installment.dueDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs font-medium text-zinc-300">Nova Data de Vencimento</label>
          <input
            type="date"
            value={newDateStr}
            onChange={(e) => setNewDateStr(e.target.value)}
            className="w-full h-11 bg-[#07090e] border border-white/[0.12] focus:border-gold rounded-xl px-3.5 text-sm font-semibold text-white outline-none transition-colors [color-scheme:dark]"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickPresets.map((preset) => {
              const isSelected = newDateStr === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setNewDateStr(preset.value)}
                  className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gold/20 border-gold/50 text-gold'
                      : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-gold/30 hover:text-gold'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {followingPendingCount > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            <label className="text-xs font-medium text-zinc-300">Aplicar alteração em</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setScope('single')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  scope === 'single'
                    ? 'bg-gold/10 border-gold/45 text-white'
                    : 'bg-[#07090e] border-white/[0.08] text-zinc-400 hover:border-white/[0.18]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block text-white">Somente esta parcela ({installment.number}/{installment.total})</span>
                  <span className="text-[11px] text-zinc-400">
                    Prorroga apenas este vencimento para {formatLocalDateBR(newDateStr)}
                  </span>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    scope === 'single' ? 'border-gold bg-gold text-[#07090e]' : 'border-zinc-600'
                  }`}
                >
                  {scope === 'single' && <Check size={11} strokeWidth={3} />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('following')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  scope === 'following'
                    ? 'bg-gold/10 border-gold/45 text-white'
                    : 'bg-[#07090e] border-white/[0.08] text-zinc-400 hover:border-white/[0.18]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block text-white">
                    Esta e próximas {followingPendingCount} pendente{followingPendingCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Reajusta as {1 + followingPendingCount} parcelas para todo dia {newDueDay} a partir desta data
                  </span>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    scope === 'following' ? 'border-gold bg-gold text-[#07090e]' : 'border-zinc-600'
                  }`}
                >
                  {scope === 'following' && <Check size={11} strokeWidth={3} />}
                </span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-zinc-300 cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !newDateStr}
            className="h-11 rounded-xl bg-gold hover:brightness-110 text-[#07090e] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg disabled:opacity-50"
          >
            <Check size={15} />
            <span>
              {isSaving
                ? 'Salvando...'
                : totalAffected > 1
                  ? `Salvar (${totalAffected}x)`
                  : 'Salvar Prazo'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
