import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { useNexusState } from './useNexusState';
import { Sidebar } from './components/Sidebar';
import { BottomNavigation } from './components/BottomNavigation';
import { Topbar } from './components/CommonUI';
import { MonthlyInstallmentsReport } from './components/MonthlyInstallmentsReport';
import { LoginScreen } from './components/LoginScreen';
import { ClientSigningPortal } from './components/ClientSigningPortal';
import { AppModals } from './components/Modals';

import { DashboardView } from './components/views/DashboardView';
import { StockView } from './components/views/StockView';
import { SalesView } from './components/views/SalesView';
import { TransactionsView } from './components/views/TransactionsView';
import { ClientsView } from './components/views/ClientsView';
import { SimulationView } from './components/views/SimulationView';
import { SettingsView } from './components/views/SettingsView';

import {
  downloadContractAsPDF,
  fallbackPrintContract,
  shareContractFile,
  downloadReceiptAsPDF,
  getSystemSellerName,
} from './lib/pdfGenerator';
import { formatLocalDateBR, getLocalDateString, extractDueDay, parseDateToMidnight } from './lib/dateUtils';
import { auth, signOut, resendVerificationEmail, linkAccountWithGoogle, translateFirebaseAuthError } from './lib/firebase';
import { Installment, Product, Sale } from './types';

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Visão Geral',
  sales: 'Vendas & Recebíveis',
  stock: 'Estoque de Produtos',
  clients: 'Carteira de Clientes',
  transactions: 'Transações & Recebimentos',
  reports: 'Relatório Mensal & Caixa',
  simulation: 'Simulador Financeiro',
  settings: 'Configurações do Sistema',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [migrationActionBusy, setMigrationActionBusy] = useState(false);
  const isAuthenticated = Boolean(currentUser);

  const {
    products,
    sales,
    installments,
    closings,
    settings,
    setSettings,
    addProduct,
    deleteProduct,
    registerSale,
    deleteSale,
    updateProduct,
    updateSaleFull,
    updateSaleCostPrice,
    payInstallment,
    amortizeSale,
    advanceInstallments,
    closeMonthlyRegister,
    deleteClosing,
    saveDigitalSignature,
    resetDigitalSignature,
    syncPublicContract,
    isInitialLoading,
    migrationState,
    retryLegacyMigration,
  } = useNexusState(currentUser);

  const [reportsTab, setReportsTab] = useState<'installments' | 'closings'>('installments');

  const parseSigningIdFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sign = params.get('sign') || params.get('contrato') || params.get('assinar');
      if (sign && sign.trim()) return sign.trim();
      const hash = window.location.hash;
      if (hash && hash.includes('sign=')) {
        const raw = hash.split('sign=')[1].split('&')[0];
        return raw ? decodeURIComponent(raw).trim() : null;
      }
    } catch {}
    return null;
  };

  const [clientSigningSaleId, setClientSigningSaleId] = useState<string | null>(parseSigningIdFromUrl);

  useEffect(() => {
    const syncFromUrl = () => {
      const id = parseSigningIdFromUrl();
      if (id) setClientSigningSaleId(id);
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, []);

  const [auditModalSale, setAuditModalSale] = useState<Sale | null>(null);
  const [shareSignModalSale, setShareSignModalSale] = useState<Sale | null>(null);

  const [hideDashboardValues, setHideDashboardValues] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_hide_dashboard_values') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideDashboardValues = () => {
    setHideDashboardValues((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_hide_dashboard_values', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const [activeView, setActiveView] = useState('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut();
      setActiveView('dashboard');
      setSelectedClient(null);
      setIsMobileOpen(false);
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err);
    }
  };

  const lastClosingDate = useMemo(() => {
    if (!closings || closings.length === 0) return '';
    return closings.reduce((latest, c) => (c.closedAt > latest ? c.closedAt : latest), '');
  }, [closings]);

  const activeSales = useMemo(() => {
    return sales.filter((s) => {
      const sInsts = installments.filter((i) => i.saleId === s.id);
      const isFullyPaid =
        s.status === 'Liquidada' || (sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago'));
      if (isFullyPaid) return false;
      return !lastClosingDate || s.createdAt > lastClosingDate;
    });
  }, [sales, lastClosingDate, installments]);

  const switchOperator = (newOp: 'operator1' | 'operator2') => {
    const currentOp = settings.currentOperator || 'operator1';
    const updatedSettings = { ...settings };

    if (currentOp === 'operator1') {
      updatedSettings.op1Name = settings.userName;
      updatedSettings.op1Role = settings.userRole;
      updatedSettings.op1Function = settings.userFunction;
      updatedSettings.op1Email = settings.userEmail;
      updatedSettings.op1Photo = settings.profilePhoto;
      updatedSettings.op1PixName = settings.pixName;
      updatedSettings.op1PixKey = settings.pixKey;
      updatedSettings.op1PixType = settings.pixType;
    } else {
      updatedSettings.op2Name = settings.userName;
      updatedSettings.op2Role = settings.userRole;
      updatedSettings.op2Function = settings.userFunction;
      updatedSettings.op2Email = settings.userEmail;
      updatedSettings.op2Photo = settings.profilePhoto;
      updatedSettings.op2PixName = settings.pixName;
      updatedSettings.op2PixKey = settings.pixKey;
      updatedSettings.op2PixType = settings.pixType;
    }

    updatedSettings.currentOperator = newOp;

    if (newOp === 'operator1') {
      updatedSettings.userName = updatedSettings.op1Name || 'Operador 1';
      updatedSettings.userRole = updatedSettings.op1Role || 'Diretor Comercial';
      updatedSettings.userFunction = updatedSettings.op1Function || 'Vendas & Negócios';
      updatedSettings.userEmail = updatedSettings.op1Email || 'op1@nexus.com';
      updatedSettings.profilePhoto = updatedSettings.op1Photo;
      updatedSettings.pixName = updatedSettings.op1PixName || '';
      updatedSettings.pixKey = updatedSettings.op1PixKey || '';
      updatedSettings.pixType = updatedSettings.op1PixType || 'Pix';
    } else {
      updatedSettings.userName = updatedSettings.op2Name || 'Operador 2';
      updatedSettings.userRole = updatedSettings.op2Role || 'Financeiro';
      updatedSettings.userFunction = updatedSettings.op2Function || 'Controle de Recebimentos';
      updatedSettings.userEmail = updatedSettings.op2Email || 'op2@nexus.com';
      updatedSettings.profilePhoto = updatedSettings.op2Photo;
      updatedSettings.pixName = updatedSettings.op2PixName || '';
      updatedSettings.pixKey = updatedSettings.op2PixKey || '';
      updatedSettings.pixType = updatedSettings.op2PixType || 'Pix';
    }

    setSettings(updatedSettings);
  };

  // Sale Form State
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleFormSelectedProductId, setSaleFormSelectedProductId] = useState('');
  const [saleFormCostPrice, setSaleFormCostPrice] = useState<string | number>('');
  const [saleFormSalePrice, setSaleFormSalePrice] = useState<string | number>('');
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [isInterestOnlyForm, setIsInterestOnlyForm] = useState(false);
  const [interestRateForm, setInterestRateForm] = useState<string | number>(5);

  // Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Capital Investido Batch Modal State
  const [showCapitalManagerModal, setShowCapitalManagerModal] = useState(false);
  const [capitalBatchCosts, setCapitalBatchCosts] = useState<{ [productId: string]: number }>({});
  const [capitalBatchPercent, setCapitalBatchPercent] = useState<number>(0);

  useEffect(() => {
    if (saleToEdit) {
      setIsInterestOnlyForm(saleToEdit.isInterestOnly || false);
      setInterestRateForm(saleToEdit.interestRate !== undefined ? saleToEdit.interestRate : 5);
      setSaleFormSelectedProductId(saleToEdit.productId || '');
      setSaleFormCostPrice(saleToEdit.costPrice !== undefined ? saleToEdit.costPrice : '');
      setSaleFormSalePrice(saleToEdit.total !== undefined ? saleToEdit.total : '');
    } else if (!showSaleForm) {
      setIsInterestOnlyForm(false);
      setInterestRateForm(5);
      setSaleFormSelectedProductId('');
      setSaleFormCostPrice('');
      setSaleFormSalePrice('');
    }
  }, [saleToEdit, showSaleForm]);

  const [searchTerm, setSearchTerm] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'entrada' | 'parcela'>('all');
  const [txMethodFilter, setTxMethodFilter] = useState<string>('all');

  const transactions = useMemo(() => {
    const list: any[] = [];

    sales.forEach((sale) => {
      if (sale.downPayment > 0) {
        list.push({
          id: `entrada-${sale.id}`,
          type: 'entrada',
          client: sale.client,
          clientPhone: sale.clientPhone,
          productName: sale.productName,
          value: sale.downPayment,
          date: sale.createdAt || sale.date || new Date().toISOString(),
          paymentMethod: 'Pix',
          label: 'Valor de Entrada',
        });
      }
    });

    installments.forEach((inst) => {
      if (inst.status === 'Pago') {
        const correspondingSale = sales.find((s) => s.id === inst.saleId);
        list.push({
          id: inst.id,
          type: 'parcela',
          client: inst.client,
          clientPhone: correspondingSale?.clientPhone || '',
          productName: inst.productName,
          value: inst.value,
          date: inst.paidAt || inst.dueDate || new Date().toISOString(),
          paymentMethod: inst.paymentMethod || 'Pix',
          installmentDetails: {
            number: inst.number,
            total: inst.total,
          },
          label: `Parcela ${inst.number}/${inst.total}`,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, installments]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const searchLower = (txSearch || '').toLowerCase();
      const matchesSearch =
        !txSearch ||
        (tx.client || '').toLowerCase().includes(searchLower) ||
        (tx.productName || '').toLowerCase().includes(searchLower) ||
        (tx.id || '').toLowerCase().includes(searchLower) ||
        (tx.paymentMethod || '').toLowerCase().includes(searchLower) ||
        (tx.label || '').toLowerCase().includes(searchLower);

      const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
      const matchesMethod = txMethodFilter === 'all' || tx.paymentMethod === txMethodFilter;

      return matchesSearch && matchesType && matchesMethod;
    });
  }, [transactions, txSearch, txTypeFilter, txMethodFilter]);

  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Atrasados' | 'Hoje'>('Todos');
  const [selectedSaleForContract, setSelectedSaleForContract] = useState<Sale | null>(null);

  useEffect(() => {
    if (selectedClient && !sales.some((s) => s.client === selectedClient)) {
      setSelectedClient(null);
    }
  }, [sales, selectedClient]);

  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<Installment | null>(null);
  const [paymentType, setPaymentType] = useState<'interest' | 'amortization'>('interest');
  const [paymentMethod, setPaymentMethod] = useState<
    'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'
  >('Pix');
  const [selectedInstallmentForReceipt, setSelectedInstallmentForReceipt] = useState<any>(null);
  const [amortizationAmount, setAmortizationAmount] = useState<string>('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Anticipate Installments State
  const [selectedSaleForAdvance, setSelectedSaleForAdvance] = useState<Sale | null>(null);
  const [advanceSelectedInstIds, setAdvanceSelectedInstIds] = useState<string[]>([]);
  const [advanceGlobalDiscount, setAdvanceGlobalDiscount] = useState<number>(10);
  const [advanceCustomDiscounts, setAdvanceCustomDiscounts] = useState<{ [instId: string]: number }>({});
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<
    'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'
  >('Pix');

  const money = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const openAdvanceModal = (sale: Sale) => {
    setSelectedSaleForAdvance(sale);
    const salePendingInsts = installments.filter((i) => i.saleId === sale.id && i.status === 'Pendente');
    const allIds = salePendingInsts.map((i) => i.id);
    setAdvanceSelectedInstIds(allIds);
    setAdvanceGlobalDiscount(10);
    const initialDiscounts: { [key: string]: number } = {};
    allIds.forEach((id) => {
      initialDiscounts[id] = 10;
    });
    setAdvanceCustomDiscounts(initialDiscounts);
    setAdvancePaymentMethod('Pix');
  };

  const handleSetGlobalDiscount = (pct: number) => {
    setAdvanceGlobalDiscount(pct);
    const updated = { ...advanceCustomDiscounts };
    advanceSelectedInstIds.forEach((id) => {
      updated[id] = pct;
    });
    setAdvanceCustomDiscounts(updated);
  };

  const handleCustomDiscountChange = (instId: string, val: number) => {
    const num = Number.isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
    setAdvanceCustomDiscounts((prev) => ({ ...prev, [instId]: num }));
  };

  const toggleSelectAdvanceInst = (instId: string) => {
    if (advanceSelectedInstIds.includes(instId)) {
      setAdvanceSelectedInstIds((prev) => prev.filter((id) => id !== instId));
    } else {
      setAdvanceSelectedInstIds((prev) => [...prev, instId]);
      if (advanceCustomDiscounts[instId] === undefined) {
        setAdvanceCustomDiscounts((prev) => ({ ...prev, [instId]: advanceGlobalDiscount }));
      }
    }
  };

  const advancePendingInsts = useMemo(() => {
    if (!selectedSaleForAdvance) return [];
    return installments
      .filter((i) => i.saleId === selectedSaleForAdvance.id && i.status === 'Pendente')
      .sort((a, b) => a.number - b.number);
  }, [selectedSaleForAdvance, installments]);

  const advanceCalculations = useMemo(() => {
    const selectedInsts = advancePendingInsts.filter((i) => advanceSelectedInstIds.includes(i.id));
    let totalOriginal = 0;
    let totalDiscount = 0;
    let totalFinal = 0;

    selectedInsts.forEach((inst) => {
      const orig = Number(inst.value) || 0;
      const pct = Number(advanceCustomDiscounts[inst.id] ?? advanceGlobalDiscount ?? 0);
      const disc = Number(((orig * pct) / 100).toFixed(2));
      const finalVal = Number(Math.max(0, orig - disc).toFixed(2));

      totalOriginal += orig;
      totalDiscount += disc;
      totalFinal += finalVal;
    });

    return {
      selectedCount: selectedInsts.length,
      totalOriginal: Number(totalOriginal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalFinal: Number(totalFinal.toFixed(2)),
      effectiveDiscountPct: totalOriginal > 0 ? ((totalDiscount / totalOriginal) * 100).toFixed(1) : '0',
    };
  }, [advancePendingInsts, advanceSelectedInstIds, advanceCustomDiscounts, advanceGlobalDiscount]);

  const handleConfirmAdvance = async () => {
    if (!selectedSaleForAdvance || advanceSelectedInstIds.length === 0) {
      showToast('Selecione pelo menos uma parcela para antecipar.', 'error');
      return;
    }

    const items = advanceSelectedInstIds.map((id) => ({
      id,
      discountPercentage: advanceCustomDiscounts[id] ?? advanceGlobalDiscount ?? 0,
    }));

    await advanceInstallments(selectedSaleForAdvance.id, items, advancePaymentMethod);

    showToast(
      `${items.length} parcela(s) antecipada(s)! Capital recebido: ${money(advanceCalculations.totalFinal)}`
    );
    setSelectedSaleForAdvance(null);
  };

  const [showQuickPaymentPicker, setShowQuickPaymentPicker] = useState(false);
  const [showAdvanceSalePicker, setShowAdvanceSalePicker] = useState(false);
  const [quickPaymentClientFilter, setQuickPaymentClientFilter] = useState<string | null>(null);

  const handleGlobalQuickPaymentClick = (clientFilter?: string) => {
    setQuickPaymentClientFilter(clientFilter || null);
    let pendingList = installments.filter((i) => i.status === 'Pendente');
    if (clientFilter) {
      pendingList = pendingList.filter((i) => i.client === clientFilter);
    }
    if (pendingList.length === 0) {
      showToast(
        clientFilter
          ? `Não há parcelas pendentes para "${clientFilter}".`
          : 'Não há parcelas pendentes para recebimento.',
        'error'
      );
      return;
    }
    pendingList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (pendingList.length === 1) {
      setPaymentType('interest');
      setSelectedInstallmentForPayment(pendingList[0]);
    } else {
      setShowQuickPaymentPicker(true);
    }
  };

  const handleGlobalAdvanceClick = (clientFilter?: string) => {
    let activeSalesWithPending = sales.filter((s) =>
      installments.some((i) => i.saleId === s.id && i.status === 'Pendente')
    );
    if (clientFilter) {
      activeSalesWithPending = activeSalesWithPending.filter((s) => s.client === clientFilter);
    }
    if (activeSalesWithPending.length === 0) {
      showToast(
        clientFilter
          ? `Não há contratos com parcelas pendentes para "${clientFilter}".`
          : 'Não há contratos com parcelas pendentes para antecipar.',
        'error'
      );
      return;
    }
    if (activeSalesWithPending.length === 1) {
      openAdvanceModal(activeSalesWithPending[0]);
    } else {
      setShowAdvanceSalePicker(true);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  // Simulator State
  const [simValue, setSimValue] = useState<number>(0);
  const [simProductName, setSimProductName] = useState<string>('');
  const [simSelectedProductId, setSimSelectedProductId] = useState<string>('');
  const [simCashPrice, setSimCashPrice] = useState<number>(0);
  const [simDownPayment, setSimDownPayment] = useState<number>(0);
  const [simRate, setSimRate] = useState<number>(0);
  const [simInstallments, setSimInstallments] = useState<number>(12);
  const [simPmt, setSimPmt] = useState<string>('');
  const [isEditingPmt, setIsEditingPmt] = useState(false);

  const handleSimCashPriceChange = (val: number) => {
    const num = Number.isNaN(val) ? 0 : Math.max(0, val);
    setSimCashPrice(num);
    setSimValue(Math.max(0, num - simDownPayment));
  };

  const handleSimDownPaymentChange = (val: number) => {
    const num = Number.isNaN(val) ? 0 : Math.max(0, val);
    setSimDownPayment(num);
    const basePrice = simCashPrice > 0 ? simCashPrice : simValue + simDownPayment;
    setSimValue(Math.max(0, basePrice - num));
  };

  const handleSelectProductForSim = (productId: string) => {
    setSimSelectedProductId(productId);
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setSimProductName(prod.name);
      const cashVal = Number(prod.sale) || 0;
      setSimCashPrice(cashVal);
      setSimValue(Math.max(0, cashVal - simDownPayment));
    }
  };

  const calculateRateFromPmt = (pv: number, pmt: number, n: number): number => {
    if (pv <= 0 || pmt <= 0 || n <= 0) return 0;
    if (pmt * n <= pv) return 0;

    let low = 0.00001;
    let high = 5.0;
    let mid = 0;

    for (let iter = 0; iter < 100; iter++) {
      mid = (low + high) / 2;
      const factor = Math.pow(1 + mid, n);
      const estPmt = (pv * mid * factor) / (factor - 1);
      if (Math.abs(estPmt - pmt) < 0.00001) break;
      if (estPmt > pmt) high = mid;
      else low = mid;
    }
    return mid * 100;
  };

  useEffect(() => {
    if (!isEditingPmt) {
      const i = simRate / 100;
      const n = simInstallments || 1;
      const pv = simValue || 0;
      const pmt = i === 0 ? pv / n : (pv * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
      const roundedPmt = Math.round(pmt);
      setSimPmt(roundedPmt > 0 ? roundedPmt.toString() : '');
    }
  }, [simValue, simRate, simInstallments, isEditingPmt]);

  const handleSimPmtChange = (val: string) => {
    setSimPmt(val);
    const numericPmt = Number(val);
    if (!Number.isNaN(numericPmt) && numericPmt > 0) {
      const pv = simValue || 0;
      const n = simInstallments || 1;
      if (pv > 0 && n > 0) {
        const calculatedRate = calculateRateFromPmt(pv, numericPmt, n);
        setSimRate(Number(calculatedRate.toFixed(3)));
      }
    }
  };

  const handleLaunchSaleFromSim = () => {
    const i = simRate / 100;
    const n = simInstallments > 0 ? simInstallments : 1;
    const pv = simValue > 0 ? simValue : 0;
    const denominator = Math.pow(1 + i, n) - 1;
    const rawPmt =
      i === 0 || denominator <= 0 ? (n > 0 ? pv / n : 0) : (pv * (i * Math.pow(1 + i, n))) / denominator;
    const safeRawPmt = Number.isFinite(rawPmt) && !Number.isNaN(rawPmt) ? rawPmt : 0;
    const pmt = Math.round(safeRawPmt * 100) / 100;
    const totalPrazo = Math.round((pmt * n + (simDownPayment || 0)) * 100) / 100;

    setSaleToEdit(null);
    setSaleFormSelectedProductId(simSelectedProductId);
    const matchingProd = products.find((p) => p.id === simSelectedProductId);
    setSaleFormCostPrice(matchingProd && matchingProd.cost !== undefined ? matchingProd.cost : '');
    setSaleFormSalePrice(totalPrazo);
    setIsInterestOnlyForm(false);
    setInterestRateForm(simRate);
    setShowSaleForm(true);
    setActiveView('sales');
    showToast('Simulação transferida com sucesso para o formulário de venda!');
  };

  // Stock Financials
  const stockFinancials = useMemo(() => {
    let totalInvested = 0;
    let totalProjectedSale = 0;
    let totalUnits = 0;
    let availableModels = 0;

    products.forEach((p) => {
      const qty = Math.max(0, p.quantity !== undefined ? p.quantity : p.status === 'Disponivel' ? 1 : 0);
      const cost = Number(p.cost) || 0;
      const salePrice = Number(p.sale) || 0;

      if (qty > 0) {
        totalInvested += cost * qty;
        totalProjectedSale += salePrice * qty;
        totalUnits += qty;
        availableModels += 1;
      }
    });

    const totalProjectedProfit = totalProjectedSale - totalInvested;
    const marginPct = totalProjectedSale > 0 ? ((totalProjectedProfit / totalProjectedSale) * 100).toFixed(1) : '0';

    return {
      totalInvested,
      totalProjectedSale,
      totalProjectedProfit,
      totalUnits,
      availableModels,
      marginPct,
    };
  }, [products]);

  const openCapitalManager = () => {
    const initialMap: { [productId: string]: number } = {};
    products.forEach((p) => {
      initialMap[p.id] = p.cost !== undefined ? p.cost : 0;
    });
    setCapitalBatchCosts(initialMap);
    setCapitalBatchPercent(0);
    setShowCapitalManagerModal(true);
  };

  const handleApplyCapitalBatchPercent = (pct: number) => {
    setCapitalBatchPercent(pct);
    const updated: { [productId: string]: number } = {};
    products.forEach((p) => {
      const baseCost = p.cost !== undefined ? p.cost : 0;
      if (pct === 0) {
        updated[p.id] = baseCost;
      } else {
        const factor = 1 + pct / 100;
        updated[p.id] = Math.round(baseCost * factor * 100) / 100;
      }
    });
    setCapitalBatchCosts(updated);
  };

  const handleSaveCapitalBatch = async () => {
    let count = 0;
    for (const p of products) {
      const newCost = capitalBatchCosts[p.id];
      if (newCost !== undefined && newCost !== p.cost) {
        await updateProduct(p.id, { cost: newCost });
        count++;
      }
    }
    showToast(`Capital investido atualizado com sucesso (${count} produto(s) sincronizados).`);
    setShowCapitalManagerModal(false);
  };

  const handleUnifiedPaymentSubmit = async (isAmortizing: boolean) => {
    if (!selectedInstallmentForPayment) return;
    const correspondingSale = sales.find((s) => s.id === selectedInstallmentForPayment.saleId);

    if (isAmortizing && correspondingSale) {
      const amountVal = Number(amortizationAmount);
      if (Number.isNaN(amountVal) || amountVal <= 0) {
        showToast('Informe um valor de amortização válido maior que zero.', 'error');
        return;
      }
      if (amountVal > correspondingSale.total) {
        showToast(
          `O valor da amortização não pode ser maior que o saldo atual de ${money(correspondingSale.total)}.`,
          'error'
        );
        return;
      }

      await amortizeSale(correspondingSale.id, amountVal, paymentMethod);
      showToast('Amortização realizada com sucesso!');
      setSelectedInstallmentForPayment(null);
    } else {
      await payInstallment(selectedInstallmentForPayment.id, paymentMethod);
      const iCopy = {
        ...selectedInstallmentForPayment,
        status: 'Pago',
        paidAt: new Date().toISOString(),
        paymentMethod,
      };
      setSelectedInstallmentForPayment(null);
      setSelectedInstallmentForReceipt(iCopy);
      showToast('Pagamento confirmado com sucesso!');
    }
  };

  const handleShareReceipt = async () => {
    const element = document.getElementById('receipt-content');
    if (!element || !selectedInstallmentForReceipt) return;
    try {
      const cleanClientName = selectedInstallmentForReceipt.client.replace(/\s+/g, '_').toUpperCase();
      const filename = `RECIBO_${cleanClientName}_${selectedInstallmentForReceipt.id.substring(0, 8).toUpperCase()}.pdf`;
      const opt: any = {
        margin: [10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      const worker = html2pdf().set(opt).from(element);
      const pdfBlob = await worker.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Comprovante de Recebimento',
          text: `Comprovante de pagamento - ${selectedInstallmentForReceipt.client}`,
        });
      } else {
        await worker.save();
        showToast('Compartilhamento direto não suportado. O arquivo foi baixado.');
      }
    } catch {
      showToast('Erro ao processar o compartilhamento.', 'error');
    }
  };

  const handleDownloadReceiptPDF = async () => {
    if (!selectedInstallmentForReceipt) return;
    try {
      showToast('Gerando comprovante em PDF...');
      const correspondingSale = sales.find(
        (s) =>
          s.id === selectedInstallmentForReceipt.saleId ||
          (selectedInstallmentForReceipt?.id && selectedInstallmentForReceipt.id.replace('entrada-', '') === s.id)
      );
      const res = await downloadReceiptAsPDF(selectedInstallmentForReceipt, correspondingSale, settings);
      if (res.success) {
        showToast('Comprovante em PDF baixado com sucesso!');
      } else {
        showToast('Erro ao gerar PDF do comprovante.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao gerar PDF do comprovante.', 'error');
    }
  };

  const resolveSaleWithImei = (sale: Sale): Sale => {
    if (sale.productImei && sale.productImei.trim()) return sale;
    const stockImei = (products.find((p) => p.id === sale.productId)?.imei || '').trim();
    return stockImei ? { ...sale, productImei: stockImei } : sale;
  };

  const handleOpenShareSignModal = (sale: Sale) => {
    const enrichedSale = resolveSaleWithImei(sale);
    setShareSignModalSale(enrichedSale);
    if (enrichedSale.productImei && enrichedSale.productImei !== sale.productImei) {
      void syncPublicContract(enrichedSale);
    }
  };

  const [isContractGenerating, setIsContractGenerating] = useState(false);

  const handleDownloadContract = async (saleToDownload?: Sale) => {
    const rawTarget = saleToDownload || selectedSaleForContract;
    if (!rawTarget) {
      showToast('Erro: Contrato não selecionado.', 'error');
      return;
    }
    const targetSale = resolveSaleWithImei(rawTarget);

    setIsContractGenerating(true);
    showToast('Gerando PDF do contrato...');

    try {
      const res = await downloadContractAsPDF(targetSale, settings, installments);
      if (res.success) {
        showToast('Contrato em PDF baixado com sucesso!');
      } else {
        showToast('Abrindo diálogo de impressão/salvar PDF...');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF do contrato:', error);
      fallbackPrintContract(targetSale, settings, installments);
      showToast('Abrindo opção de impressão/salvar em PDF...');
    } finally {
      setIsContractGenerating(false);
    }
  };

  const handlePrintContract = (saleToPrint?: Sale) => {
    const rawTarget = saleToPrint || selectedSaleForContract;
    if (!rawTarget) return;
    const targetSale = resolveSaleWithImei(rawTarget);
    fallbackPrintContract(targetSale, settings, installments);
    showToast('Abrindo diálogo de impressão...');
  };

  const handleShareContract = async (saleToShare?: Sale) => {
    const rawTarget = saleToShare || selectedSaleForContract;
    if (!rawTarget) return;
    const targetSale = resolveSaleWithImei(rawTarget);
    showToast('Preparando contrato para envio...');
    const ok = await shareContractFile(targetSale, settings, installments);
    showToast(ok ? 'Contrato compartilhado com sucesso!' : 'Download do contrato iniciado.');
  };

  const handleCopyContractText = (saleToCopy?: Sale) => {
    const rawTarget = saleToCopy || selectedSaleForContract;
    if (!rawTarget) return;
    const targetSale = resolveSaleWithImei(rawTarget);
    const company = (settings.companyName || 'NEXUS COMMERCE').toUpperCase();
    const sellerName = getSystemSellerName(settings, targetSale);
    const cleanId = (targetSale.id || '').substring(0, 8).toUpperCase();
    const dateFormatted = formatLocalDateBR(targetSale.date || targetSale.createdAt || new Date());

    let dueDay = '—';
    if (installments && installments.length > 0) {
      const matchingInst = installments.find((i) => i.saleId === targetSale.id);
      if (matchingInst?.dueDate) {
        dueDay = extractDueDay(matchingInst.dueDate);
      }
    }
    if (dueDay === '—' && targetSale.date) {
      dueDay = extractDueDay(targetSale.date);
    }

    const isInterest = !!targetSale.isInterestOnly;
    const modalidadeDesc = isInterest
      ? `${targetSale.installmentsCount || 1} parcelas de juros mensais de ${money(targetSale.installmentValue)} (${targetSale.interestRate || 0}% a.m.)`
      : `${targetSale.installmentsCount || 1} parcelas fixas de ${money(targetSale.installmentValue)}`;
    const contractImei = (targetSale.productImei || '').trim();

    const text = `📋 CONTRATO DE COMPRA E VENDA (Nº CT-${cleanId})
Emissão: ${dateFormatted} • ${company}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 QUADRO-RESUMO DA TRANSAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Vendedor(a): ${sellerName} (${company})
• Comprador(a): ${targetSale.client.toUpperCase()}
• CPF/Doc: ${targetSale.clientCpf || 'Registrado em Sistema'}
• Telefone: ${targetSale.clientPhone || 'N/A'}${targetSale.clientAddress ? `\n• Endereço: ${targetSale.clientAddress}` : ''}
• Produto/Serviço: ${(targetSale.productName || 'Produto Registrado').toUpperCase()}${contractImei ? `\n• IMEI do Aparelho: ${contractImei}` : ''}
• Valor Total: ${money(targetSale.total)}${targetSale.downPayment ? ` (Entrada: ${money(targetSale.downPayment)})` : ''}
• Plano de Pagamento: ${modalidadeDesc}
• Vencimento Recorrente: Todo dia ${dueDay} de cada mês

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CLÁUSULAS E CONDIÇÕES PRINCIPAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. OBJETO E RESERVA DE DOMÍNIO: Venda com reserva de domínio (art. 521 e seguintes do Código Civil) do bem ${(targetSale.productName || 'Produto Registrado').toUpperCase()}${contractImei ? ` (IMEI: ${contractImei})` : ''}, entregue em perfeitas condições de uso, permanecendo a propriedade resolúvel com o VENDEDOR até a quitação integral de todas as parcelas.
2. PAGAMENTO: O Comprador se compromete a efetuar os pagamentos nas datas estipuladas.
3. ANTECIPAÇÃO: É facultado ao Comprador amortizar ou quitar parcelas a qualquer momento com abatimento proporcional.
4. TOLERÂNCIA, ENCARGOS E RESTRIÇÃO POR ATRASO: EVENTUAL ATRASO NA QUITAÇÃO DE PARCELAS ACARRETARÁ MULTA MORATÓRIA DE 2% SOBRE O VALOR VENCIDO, ACRESCIDA DE JUROS DE MORA DE 1% AO MÊS (PRO RATA DIE). APÓS 3 DIAS CORRIDOS DE ATRASO, O VENDEDOR FICA AUTORIZADO A APLICAR RESTRIÇÃO PARCIAL DE FUNCIONALIDADES DO APARELHO COM CONTATO NA TELA. APÓS 5 DIAS CORRIDOS, FICA AUTORIZADO O BLOQUEIO TOTAL DO APARELHO ATÉ REGULARIZAÇÃO, COM DESBLOQUEIO EM ATÉ 24H APÓS PAGAMENTO INTEGRAL. Proibida tentativa de remoção, formatação clandestina ou burla do sistema de segurança, sob pena de vencimento antecipado do saldo devedor e medidas legais cabíveis.
5. EFICÁCIA, NOTIFICAÇÕES E CONFISSÃO DE DÍVIDA: Título executivo extrajudicial (Art. 784, III CPC), com plena validade jurídica para notificações e cobranças enviadas via WhatsApp ao número cadastrado.

Assinado Eletronicamente:
• Vendedor(a): ${sellerName}
• Comprador(a): ${targetSale.client.toUpperCase()}
Autenticação: ${targetSale.id.toUpperCase()}`;

    navigator.clipboard.writeText(text);
    showToast('Texto do contrato copiado com sucesso!');
  };

  const handleDownloadReportPDF = async () => {
    const element = document.getElementById('report-pdf-content');
    if (!element) {
      showToast('Erro: Conteúdo do relatório para PDF não encontrado.', 'error');
      return;
    }

    showToast('Gerando PDF do Relatório Comercial...');
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const opt: any = {
      margin: [12, 12],
      filename: `RELATORIO_GESTAO_DE_VENDAS_${formattedDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    try {
      // @ts-ignore - html2pdf might not have TS types
      await html2pdf().set(opt).from(element).save();
      showToast('Relatório Comercial em PDF baixado com sucesso!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar o PDF.', 'error');
    }
  };

  const downloadSimulationPDF = () => {
    const element = document.getElementById('simulation-content');
    if (!element) return;
    const opt: any = {
      margin: [10, 10],
      filename: `SIMULACAO_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  const shareSimulationWhatsApp = () => {
    const date = new Date().toLocaleDateString('pt-BR');
    const i = simRate / 100;
    const n = simInstallments || 1;
    const pv = simValue || 0;
    const rawPmt = i === 0 ? pv / n : (pv * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    const pmt = Math.round(rawPmt);
    const totalInstallments = pmt * n;
    const totalPrazo = totalInstallments + (simDownPayment || 0);
    const effectiveCashPrice = simCashPrice > 0 ? simCashPrice : pv + (simDownPayment || 0);
    const company = (settings.companyName || settings.userName || 'GESTÃO DE VENDAS').toUpperCase();

    const productText = simProductName ? `💎 *Produto:* ${simProductName}\n` : '';
    const cashText = effectiveCashPrice > 0 ? `💵 *Valor À Vista:* ${money(effectiveCashPrice)}\n` : '';
    const downPaymentText = simDownPayment > 0 ? `💰 *Entrada:* ${money(simDownPayment)}\n` : '';

    let diffText = '';
    if (effectiveCashPrice > 0 && totalPrazo > effectiveCashPrice) {
      const diff = totalPrazo - effectiveCashPrice;
      const pct = ((diff / effectiveCashPrice) * 100).toFixed(1);
      diffText = `📈 *Acréscimo no Parcelamento:* +${money(diff)} (+${pct}%)\n`;
    } else if (effectiveCashPrice > 0 && totalPrazo === effectiveCashPrice) {
      diffText = `✨ *Condição Especial:* 0% Juros (Mesmo preço do à vista)\n`;
    }

    const text = `*SIMULAÇÃO COMERCIAL - ${company}*\n📅 *Data:* ${date}\n\n${productText}${cashText}${downPaymentText}📦 *Plano de Pagamento:* ${n}x de ${money(pmt)}\n📊 *Total a Prazo:* ${money(totalPrazo)}\n${diffText}\n_Proposta comercial sujeita a disponibilidade e análise cadastral._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareSaleTableWhatsApp = (sale: Sale) => {
    const saleInsts = installments.filter((i) => i.saleId === sale.id).sort((a, b) => a.number - b.number);
    const date = new Date().toLocaleDateString('pt-BR');

    let text = `*NOTA DE VENDA E PAGAMENTO*\n`;
    text += `*Cliente:* ${sale.client}\n`;
    text += `*Produto:* ${sale.productName}\n`;
    text += `*Valor Total:* ${money(sale.total)}\n`;
    if (sale.downPayment > 0) {
      text += `*Entrada:* ${money(sale.downPayment)} ✅\n`;
    }
    text += `*Plano de Pagamento:* ${sale.installmentsCount}x de ${money(sale.installmentValue)}\n`;
    text += `(Considerando a entrada + as ${sale.installmentsCount} parcelas para compor o total)\n\n`;

    saleInsts.forEach((inst, idx) => {
      const dueDate = formatLocalDateBR(inst.dueDate);
      const statusIcon = inst.status === 'Pago' ? ' ✅' : '';
      text += `• ${String(idx + 1).padStart(2, '0')}º Vencimento: ${dueDate}${statusIcon}\n`;
    });

    text += `\n_Gerado por Nexus Commerce em ${date}_`;

    window.open(`https://wa.me/${sale.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareInstallmentWhatsApp = (sale: Sale, inst: Installment) => {
    const template =
      settings.whatsappTemplate ||
      'Olá, {cliente}! Passando para lembrar que a sua parcela {parcela} do produto {produto} no valor de {valor} vence em {vencimento}.\n\nPara facilitar o pagamento, você pode utilizar a chave Pix abaixo:\nChave Pix: {chave_pix}\nBeneficiário: {nome_pix}\n\nSe tiver qualquer dúvida, fique à vontade para falar conosco!';

    const formattedParcela = `${inst.number}/${inst.total || sale.installmentsCount}`;
    const formattedValor = money(inst.value);
    const formattedVencimento = formatLocalDateBR(inst.dueDate);

    const text = template
      .replace(/{cliente}/g, inst.client || sale.client || 'Cliente')
      .replace(/{produto}/g, inst.productName || sale.productName || 'Produto')
      .replace(/{parcela}/g, formattedParcela)
      .replace(/{valor}/g, formattedValor)
      .replace(/{vencimento}/g, formattedVencimento)
      .replace(/{chave_pix}/g, settings.pixKey || '')
      .replace(/{nome_pix}/g, settings.pixName || '');

    const rawPhone = sale.clientPhone ? sale.clientPhone.replace(/\D/g, '') : '';
    const phonePrefix = rawPhone.length === 11 || rawPhone.length === 10 ? '55' + rawPhone : rawPhone;

    window.open(`https://wa.me/${phonePrefix}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getWhatsAppShareLink = (tx: any) => {
    const valueStr = money(tx.value);
    const dateStr = formatLocalDateBR(tx.date, { showTime: true });
    const typeLabel =
      tx.type === 'entrada'
        ? 'Valor de Entrada'
        : `Parcela ${tx.installmentDetails?.number}/${tx.installmentDetails?.total}`;

    const text =
      `*COMPROVANTE DE RECEBIMENTO* ✅\n` +
      `----------------------------------------\n` +
      `Olá, *${tx.client}*!\n\n` +
      `Confirmamos com sucesso o recebimento do seguinte pagamento:\n\n` +
      `• *Operação:* ${typeLabel}\n` +
      `• *Produto:* ${tx.productName}\n` +
      `• *Valor Pago:* ${valueStr}\n` +
      `• *Data/Hora:* ${dateStr}\n` +
      `• *Meio de Pagamento:* ${tx.paymentMethod}\n\n` +
      `----------------------------------------\n` +
      `Comprovante emitido por: ${settings.companyName || 'Nexus Commerce'}\n` +
      `Obrigado!`;

    const encodedText = encodeURIComponent(text);
    const cleanPhone = tx.clientPhone ? tx.clientPhone.replace(/\D/g, '') : '';
    let targetPhone = cleanPhone;
    if (targetPhone) {
      if (targetPhone.length <= 11 && !targetPhone.startsWith('55')) {
        targetPhone = '55' + targetPhone;
      }
      return `https://wa.me/${targetPhone}?text=${encodedText}`;
    }
    return `https://wa.me/?text=${encodedText}`;
  };

  const todayTime = new Date();
  todayTime.setHours(0, 0, 0, 0);
  const searchLower = (searchTerm || '').toLowerCase();

  const filteredProducts = products.filter(
    (p) =>
      !searchTerm ||
      [p.name, p.category, p.status, p.imei].some((v) => (v || '').toLowerCase().includes(searchLower))
  );

  const filteredSales = sales.filter((s) => {
    const sInsts = installments.filter((i) => i.saleId === s.id);
    const isFullyPaid = sInsts.length > 0 && sInsts.every((i) => i.status === 'Pago');
    if (isFullyPaid) return false;

    const matchesSearch =
      !searchTerm ||
      [s.client, s.productName, s.productImei, s.status].some((v) => (v || '').toLowerCase().includes(searchLower));

    if (filterStatus === 'Atrasados') {
      const hasOverdue = sInsts.some((i) => {
        if (i.status !== 'Pendente') return false;
        return parseDateToMidnight(i.dueDate).getTime() < todayTime.getTime();
      });
      return matchesSearch && hasOverdue;
    }

    if (filterStatus === 'Hoje') {
      const hasDueToday = sInsts.some((i) => {
        if (i.status !== 'Pendente') return false;
        return parseDateToMidnight(i.dueDate).getTime() === todayTime.getTime();
      });
      return matchesSearch && hasDueToday;
    }

    return matchesSearch;
  });

  const clientsList = Array.from(new Set(sales.map((s) => s.client).filter(Boolean))) as string[];
  const filteredClients = clientsList.filter((c) => !searchTerm || (c || '').toLowerCase().includes(searchLower));

  if (clientSigningSaleId) {
    return (
      <ClientSigningPortal
        saleId={clientSigningSaleId}
        sales={sales}
        settings={settings}
        installments={installments}
        isLoading={isInitialLoading}
        onSaveSignature={saveDigitalSignature}
        onExitPortal={
          isAuthenticated
            ? () => {
                setClientSigningSaleId(null);
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('sign');
                  url.searchParams.delete('contrato');
                  url.searchParams.delete('assinar');
                  window.history.replaceState({}, '', url.pathname);
                } catch {}
              }
            : undefined
        }
      />
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen w-full bg-[#07090e] flex flex-col items-center justify-center gap-4 text-zinc-300">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-zinc-400 tracking-wide">Verificando sessão segura...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleOpenNewSale = () => {
    setSaleToEdit(null);
    setSaleFormSelectedProductId('');
    setSaleFormCostPrice('');
    setSaleFormSalePrice('');
    setShowSaleForm(true);
    setActiveView('sales');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-bg-main text-white overflow-x-clip">
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view !== 'sales') {
            setShowSaleForm(false);
          }
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        settings={settings}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        desktopSidebarOpen={desktopSidebarOpen}
        setDesktopSidebarOpen={setDesktopSidebarOpen}
        onLogout={handleLogout}
      />

      <BottomNavigation
        activeView={activeView}
        setActiveView={setActiveView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {isInitialLoading && (
          <div className="fixed top-0 left-0 w-full h-[2px] bg-gold/20 z-50 overflow-hidden pointer-events-none">
            <div className="h-full bg-gold w-1/3 animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_8px_#f3ba2f]" />
          </div>
        )}

        <Topbar
          onOpenSettings={() => setActiveView('settings')}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onToggleDesktopSidebar={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          desktopSidebarOpen={desktopSidebarOpen}
          viewTitle={VIEW_TITLES[activeView] || 'Nexus Commerce'}
          hideDashboardValues={hideDashboardValues}
          onToggleHideDashboardValues={toggleHideDashboardValues}
          onQuickNewSale={handleOpenNewSale}
        />

        <div className="p-4 pb-24 sm:p-6 lg:p-8 flex-1 w-full max-w-[1600px] mx-auto overflow-x-clip">
          {migrationState.status === 'migrating' && (
            <div className="mb-6 p-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center gap-3 text-xs text-zinc-200">
              <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin shrink-0" />
              <span>
                Vinculando e migrando seus registros anteriores exclusivamente para{' '}
                <strong>{currentUser?.email}</strong>...
              </span>
            </div>
          )}

          {migrationState.status === 'needs_verification' && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#0d111a] border border-gold/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Confirme seu e-mail principal para importar os dados anteriores
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Enviamos um link de verificação para <strong className="text-zinc-200">{currentUser?.email}</strong>.
                    Após confirmar no seu e-mail (ou autenticar com o Google), clique em &quot;Importar Dados Agora&quot;.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={migrationActionBusy}
                  onClick={async () => {
                    setMigrationActionBusy(true);
                    try {
                      await linkAccountWithGoogle();
                      await retryLegacyMigration();
                      showToast('Conta verificada e dados vinculados com sucesso!');
                    } catch (err) {
                      showToast(translateFirebaseAuthError(err), 'error');
                    } finally {
                      setMigrationActionBusy(false);
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-zinc-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Verificar com Google
                </button>
                <button
                  type="button"
                  disabled={migrationActionBusy}
                  onClick={async () => {
                    setMigrationActionBusy(true);
                    try {
                      await resendVerificationEmail();
                      showToast('E-mail de verificação reenviado!');
                    } catch (err) {
                      showToast(translateFirebaseAuthError(err), 'error');
                    } finally {
                      setMigrationActionBusy(false);
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] text-zinc-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reenviar E-mail
                </button>
                <button
                  type="button"
                  disabled={migrationActionBusy}
                  onClick={async () => {
                    setMigrationActionBusy(true);
                    try {
                      await retryLegacyMigration();
                    } finally {
                      setMigrationActionBusy(false);
                    }
                  }}
                  className="h-9 px-4 rounded-xl bg-gold text-[#07090e] text-xs font-bold hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
                >
                  {migrationActionBusy ? 'Verificando...' : 'Importar Dados Agora'}
                </button>
              </div>
            </div>
          )}

          {migrationState.status === 'error' && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200">
              <span>
                Não foi possível concluir a importação dos dados anteriores:{' '}
                {migrationState.errorMessage || 'Tente novamente.'}
              </span>
              <button
                type="button"
                onClick={() => retryLegacyMigration()}
                className="h-8 px-3.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-white font-semibold cursor-pointer shrink-0"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeView === 'dashboard' && (
                <DashboardView
                  settings={settings}
                  products={products}
                  sales={sales}
                  installments={installments}
                  closings={closings}
                  isInitialLoading={isInitialLoading}
                  hideDashboardValues={hideDashboardValues}
                  money={money}
                  onNavigate={(view, filter) => {
                    setActiveView(view);
                    if (filter === 'closings' || filter === 'installments') {
                      setReportsTab(filter);
                    } else if (filter) {
                      setFilterStatus(filter as any);
                    }
                  }}
                  onNewSale={handleOpenNewSale}
                  onViewContract={(sale) => setSelectedSaleForContract(sale)}
                  onEditSale={(sale) => {
                    setSaleToEdit(sale);
                    setShowSaleForm(true);
                    setActiveView('sales');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDeleteSale={(sale) => {
                    openConfirm(
                      'Excluir Contrato Permanentemente',
                      `Deseja realmente excluir o contrato de ${sale.client} (${money(sale.total)}) e todas as suas parcelas? Esta ação é irreversível.`,
                      async () => {
                        const ok = await deleteSale(sale.id);
                        if (ok) showToast('Contrato excluído com sucesso!');
                      }
                    );
                  }}
                  onSelectStockProduct={(productName) => {
                    setSearchTerm(productName);
                    setActiveView('stock');
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeView === 'stock' && (
                <StockView
                  products={products}
                  filteredProducts={filteredProducts}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  stockFinancials={stockFinancials}
                  money={money}
                  onOpenCapitalManager={openCapitalManager}
                  onQuickPayment={() => handleGlobalQuickPaymentClick()}
                  onQuickAdvance={() => handleGlobalAdvanceClick()}
                  onNewProduct={() => {
                    setProductToEdit(null);
                    setPreviewPhoto(null);
                    setShowAddProduct(true);
                  }}
                  onEditProduct={(product) => {
                    setProductToEdit(product);
                    setPreviewPhoto(product.photo || null);
                    setShowAddProduct(true);
                  }}
                  onUpdateProduct={updateProduct}
                  onSellProduct={(product) => {
                    setSaleToEdit(null);
                    setSaleFormSelectedProductId(product.id);
                    setSaleFormCostPrice(product.cost !== undefined ? product.cost : 0);
                    setSaleFormSalePrice(product.sale !== undefined ? product.sale : 0);
                    setShowSaleForm(true);
                    setActiveView('sales');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDeleteProduct={(product) => {
                    openConfirm(
                      'Excluir Produto',
                      `Deseja remover "${product.name}" do estoque permanentemente?`,
                      () => {
                        deleteProduct(product.id);
                        showToast('Produto excluído do estoque.');
                      }
                    );
                  }}
                  onShowToast={showToast}
                />
              )}

              {activeView === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  filteredTransactions={filteredTransactions}
                  txSearch={txSearch}
                  setTxSearch={setTxSearch}
                  txTypeFilter={txTypeFilter}
                  setTxTypeFilter={setTxTypeFilter}
                  txMethodFilter={txMethodFilter}
                  setTxMethodFilter={setTxMethodFilter}
                  money={money}
                  getWhatsAppShareLink={getWhatsAppShareLink}
                  onViewReceipt={(tx) => setSelectedInstallmentForReceipt(tx)}
                />
              )}

              {activeView === 'sales' && (
                <SalesView
                  sales={sales}
                  filteredSales={filteredSales}
                  products={products}
                  installments={installments}
                  settings={settings}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  showSaleForm={showSaleForm}
                  setShowSaleForm={setShowSaleForm}
                  saleToEdit={saleToEdit}
                  setSaleToEdit={setSaleToEdit}
                  saleFormSelectedProductId={saleFormSelectedProductId}
                  setSaleFormSelectedProductId={setSaleFormSelectedProductId}
                  saleFormCostPrice={saleFormCostPrice}
                  setSaleFormCostPrice={setSaleFormCostPrice}
                  saleFormSalePrice={saleFormSalePrice}
                  setSaleFormSalePrice={setSaleFormSalePrice}
                  isInterestOnlyForm={isInterestOnlyForm}
                  setIsInterestOnlyForm={setIsInterestOnlyForm}
                  interestRateForm={interestRateForm}
                  setInterestRateForm={setInterestRateForm}
                  expandedSaleId={expandedSaleId}
                  setExpandedSaleId={setExpandedSaleId}
                  todayTime={todayTime}
                  money={money}
                  onQuickPayment={() => handleGlobalQuickPaymentClick()}
                  onQuickAdvance={() => handleGlobalAdvanceClick()}
                  onDownloadReportPDF={handleDownloadReportPDF}
                  onRegisterSale={registerSale}
                  onUpdateSaleFull={updateSaleFull}
                  onOpenAdvanceModal={openAdvanceModal}
                  onOpenAmortize={(pendingInst) => {
                    setPaymentType('amortization');
                    setAmortizationAmount('');
                    setSelectedInstallmentForPayment(pendingInst);
                  }}
                  onOpenShareSignModal={handleOpenShareSignModal}
                  onOpenAuditModal={(sale) => setAuditModalSale(sale)}
                  onViewContract={(sale) => setSelectedSaleForContract(sale)}
                  onDownloadContract={handleDownloadContract}
                  onDeleteSale={(sale) => {
                    openConfirm(
                      'Excluir Contrato Permanentemente',
                      `Deseja realmente excluir o contrato de ${sale.client} (${money(sale.total)}) e todas as suas parcelas? Esta ação é irreversível.`,
                      async () => {
                        const ok = await deleteSale(sale.id);
                        if (ok) showToast('Contrato e parcelas excluídos com sucesso!');
                      }
                    );
                  }}
                  onPayInstallment={(inst) => {
                    setPaymentType('interest');
                    setAmortizationAmount('');
                    setSelectedInstallmentForPayment(inst);
                  }}
                  onViewReceipt={(inst) => setSelectedInstallmentForReceipt(inst)}
                  onShareInstallmentWhatsApp={shareInstallmentWhatsApp}
                  onShareSaleTableWhatsApp={shareSaleTableWhatsApp}
                  onShowToast={showToast}
                />
              )}

              {activeView === 'reports' && (
                <MonthlyInstallmentsReport
                  sales={sales}
                  activeSales={activeSales}
                  installments={installments}
                  closings={closings}
                  settings={settings}
                  money={money}
                  onPayInstallment={(inst) => {
                    setPaymentType('interest');
                    setAmortizationAmount('');
                    setSelectedInstallmentForPayment(inst);
                  }}
                  onViewReceipt={(inst) => setSelectedInstallmentForReceipt(inst)}
                  onDownloadPDF={handleDownloadReportPDF}
                  onCloseRegister={closeMonthlyRegister}
                  onDeleteClosing={deleteClosing}
                  initialTab={reportsTab}
                  onTabChange={setReportsTab}
                  showToast={showToast}
                />
              )}

              {activeView === 'clients' && (
                <ClientsView
                  sales={sales}
                  installments={installments}
                  clientsList={clientsList}
                  filteredClients={filteredClients}
                  selectedClient={selectedClient}
                  setSelectedClient={setSelectedClient}
                  expandedSaleId={expandedSaleId}
                  setExpandedSaleId={setExpandedSaleId}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  todayTime={todayTime}
                  money={money}
                  onOpenAmortize={(pendingInst) => {
                    setPaymentType('amortization');
                    setAmortizationAmount('');
                    setSelectedInstallmentForPayment(pendingInst);
                  }}
                  onOpenShareSignModal={handleOpenShareSignModal}
                  onOpenAuditModal={(sale) => setAuditModalSale(sale)}
                  onViewContract={(sale) => setSelectedSaleForContract(sale)}
                  onDownloadContract={handleDownloadContract}
                  onEditSale={(sale) => {
                    setSaleToEdit(sale);
                    setShowSaleForm(true);
                    setActiveView('sales');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDeleteSale={(sale) => {
                    openConfirm(
                      'Excluir Contrato Permanentemente',
                      `Deseja realmente excluir o contrato de ${sale.client} (${money(sale.total)}) e todas as suas parcelas? Esta ação é irreversível.`,
                      async () => {
                        const ok = await deleteSale(sale.id);
                        if (ok) showToast('Contrato e parcelas excluídos com sucesso!');
                      }
                    );
                  }}
                  onPayInstallment={(inst) => {
                    setPaymentType('interest');
                    setAmortizationAmount('');
                    setSelectedInstallmentForPayment(inst);
                  }}
                  onViewReceipt={(inst) => setSelectedInstallmentForReceipt(inst)}
                  onShareInstallmentWhatsApp={shareInstallmentWhatsApp}
                  onShareSaleTableWhatsApp={shareSaleTableWhatsApp}
                  onUpdateSaleCost={updateSaleCostPrice}
                  onShowToast={showToast}
                />
              )}

              {activeView === 'simulation' && (
                <SimulationView
                  products={products}
                  simSelectedProductId={simSelectedProductId}
                  simProductName={simProductName}
                  setSimProductName={setSimProductName}
                  simCashPrice={simCashPrice}
                  simDownPayment={simDownPayment}
                  simValue={simValue}
                  setSimValue={setSimValue}
                  setSimCashPrice={setSimCashPrice}
                  simPmt={simPmt}
                  simRate={simRate}
                  setSimRate={setSimRate}
                  simInstallments={simInstallments}
                  setSimInstallments={setSimInstallments}
                  setIsEditingPmt={setIsEditingPmt}
                  onSelectProductForSim={handleSelectProductForSim}
                  onSimCashPriceChange={handleSimCashPriceChange}
                  onSimDownPaymentChange={handleSimDownPaymentChange}
                  onSimPmtChange={handleSimPmtChange}
                  onDownloadSimulationPDF={downloadSimulationPDF}
                  onShareSimulationWhatsApp={shareSimulationWhatsApp}
                  onLaunchSaleFromSim={handleLaunchSaleFromSim}
                  money={money}
                />
              )}

              {activeView === 'settings' && (
                <SettingsView
                  settings={settings}
                  setSettings={setSettings}
                  activeSettingsTab={activeSettingsTab}
                  setActiveSettingsTab={setActiveSettingsTab}
                  switchOperator={switchOperator}
                  currentUserUid={currentUser?.uid}
                  onSyncAndReturn={() => {
                    setActiveView('dashboard');
                    showToast('Nexus sincronizado com sucesso.');
                  }}
                  openConfirm={openConfirm}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AppModals
          products={products}
          sales={sales}
          installments={installments}
          settings={settings}
          money={money}
          showToast={showToast}
          openConfirm={openConfirm}
          showAddProduct={showAddProduct}
          setShowAddProduct={setShowAddProduct}
          productToEdit={productToEdit}
          setProductToEdit={setProductToEdit}
          previewPhoto={previewPhoto}
          setPreviewPhoto={setPreviewPhoto}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          selectedSaleForContract={selectedSaleForContract}
          setSelectedSaleForContract={setSelectedSaleForContract}
          isContractGenerating={isContractGenerating}
          onDownloadContract={handleDownloadContract}
          onPrintContract={handlePrintContract}
          onShareContract={handleShareContract}
          onCopyContractText={handleCopyContractText}
          onEditSaleFromContract={(sale) => {
            setSaleToEdit(sale);
            setShowSaleForm(true);
            setActiveView('sales');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDeleteSale={deleteSale}
          selectedInstallmentForReceipt={selectedInstallmentForReceipt}
          setSelectedInstallmentForReceipt={setSelectedInstallmentForReceipt}
          onDownloadReceiptPDF={handleDownloadReceiptPDF}
          onShareReceipt={handleShareReceipt}
          selectedInstallmentForPayment={selectedInstallmentForPayment}
          setSelectedInstallmentForPayment={setSelectedInstallmentForPayment}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          amortizationAmount={amortizationAmount}
          setAmortizationAmount={setAmortizationAmount}
          onConfirmPaymentSubmit={handleUnifiedPaymentSubmit}
          selectedSaleForAdvance={selectedSaleForAdvance}
          setSelectedSaleForAdvance={setSelectedSaleForAdvance}
          advancePendingInsts={advancePendingInsts}
          advanceSelectedInstIds={advanceSelectedInstIds}
          setAdvanceSelectedInstIds={setAdvanceSelectedInstIds}
          advanceGlobalDiscount={advanceGlobalDiscount}
          advanceCustomDiscounts={advanceCustomDiscounts}
          advancePaymentMethod={advancePaymentMethod}
          setAdvancePaymentMethod={setAdvancePaymentMethod}
          advanceCalculations={advanceCalculations}
          onSetGlobalDiscount={handleSetGlobalDiscount}
          onCustomDiscountChange={handleCustomDiscountChange}
          onToggleSelectAdvanceInst={toggleSelectAdvanceInst}
          onConfirmAdvance={handleConfirmAdvance}
          showCapitalManagerModal={showCapitalManagerModal}
          setShowCapitalManagerModal={setShowCapitalManagerModal}
          capitalBatchCosts={capitalBatchCosts}
          setCapitalBatchCosts={setCapitalBatchCosts}
          capitalBatchPercent={capitalBatchPercent}
          onApplyCapitalBatchPercent={handleApplyCapitalBatchPercent}
          onSaveCapitalBatch={handleSaveCapitalBatch}
          showQuickPaymentPicker={showQuickPaymentPicker}
          setShowQuickPaymentPicker={setShowQuickPaymentPicker}
          quickPaymentClientFilter={quickPaymentClientFilter}
          showAdvanceSalePicker={showAdvanceSalePicker}
          setShowAdvanceSalePicker={setShowAdvanceSalePicker}
          onOpenAdvanceModal={openAdvanceModal}
          shareSignModalSale={shareSignModalSale}
          setShareSignModalSale={(sale) => (sale ? handleOpenShareSignModal(sale) : setShareSignModalSale(null))}
          auditModalSale={auditModalSale}
          setAuditModalSale={setAuditModalSale}
          onSignOnDevice={(saleToSign) => setClientSigningSaleId(saleToSign.id)}
          onResetDigitalSignature={resetDigitalSignature}
          confirmModal={confirmModal}
          setConfirmModal={setConfirmModal}
          toast={toast}
        />
      </main>
    </div>
  );
}
