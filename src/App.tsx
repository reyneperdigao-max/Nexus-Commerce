import { useState, Fragment, useEffect, useMemo } from 'react';
import { useNexusState } from './useNexusState';
import { Sidebar } from './components/Sidebar';
import { BottomNavigation } from './components/BottomNavigation';
import { Logo, Topbar, DashboardStats } from './components/CommonUI';
import { MonthlyInstallmentsReport } from './components/MonthlyInstallmentsReport';
import { LoginScreen } from './components/LoginScreen';
import { AnimatePresence, motion } from 'motion/react';
import { Boxes, Plus, X, Search, ImagePlus, User, Wallet, ShoppingBag, ArrowLeft, ArrowRight, BadgeDollarSign, Activity, Zap, History, ChevronDown, Pencil, FileText, Download, DollarSign, Share2, Calculator, Package, MessageCircle, ShieldCheck, Lock, Mail, Image as ImageIcon, AlertCircle, Calendar, Camera, Trash2, Minus, TrendingUp, Percent, Printer, Copy, Check, CheckCircle2, ExternalLink, SlidersHorizontal, Layers } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { downloadContractAsPDF, fallbackPrintContract, shareContractFile, downloadReceiptAsPDF, getSystemSellerName } from './lib/pdfGenerator';
import { formatLocalDateBR, getLocalDateString, getFutureLocalDateString, extractDueDay, parseDateToMidnight } from './lib/dateUtils';
import { auth } from './lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const { products, sales, installments, closings, settings, setSettings, addProduct, deleteProduct, registerSale, deleteSale, deleteClient, updateProduct, updateSaleFull, payInstallment, amortizeSale, advanceInstallments, closeMonthlyRegister, deleteClosing } = useNexusState();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [reportsTab, setReportsTab] = useState<'installments' | 'closings'>('installments');

  useEffect(() => {
    // We set authReady to true immediately since anonymous sign-in is restricted
    // Persistence will work via relaxed Firestore rules
    setAuthReady(true);
  }, []);

  const lastClosingDate = useMemo(() => {
    if (!closings || closings.length === 0) return '';
    return closings.reduce((latest, c) => c.closedAt > latest ? c.closedAt : latest, '');
  }, [closings]);

  const activeSales = useMemo(() => {
    return sales.filter(s => {
      const sInsts = installments.filter(i => i.saleId === s.id);
      const isFullyPaid = s.status === 'Liquidada' || (sInsts.length > 0 && sInsts.every(i => i.status === 'Pago'));
      if (isFullyPaid) return false;
      return !lastClosingDate || s.createdAt > lastClosingDate;
    });
  }, [sales, lastClosingDate, installments]);

  const [activeView, setActiveView] = useState('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState<string | null>(null);

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

  const [collapsed, setCollapsed] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleFormSelectedProductId, setSaleFormSelectedProductId] = useState('');
  const [saleFormCostPrice, setSaleFormCostPrice] = useState<string | number>('');
  const [saleFormSalePrice, setSaleFormSalePrice] = useState<string | number>('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any>(null);
  const [prodFormCost, setProdFormCost] = useState<string | number>('');
  const [prodFormSale, setProdFormSale] = useState<string | number>('');
  const [prodFormQty, setProdFormQty] = useState<string | number>(1);
  const [saleToEdit, setSaleToEdit] = useState<any>(null);
  const [isInterestOnlyForm, setIsInterestOnlyForm] = useState(false);
  const [interestRateForm, setInterestRateForm] = useState<string | number>(5);

  // Capital Investido Management State (Modal & Bulk Update)
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
    } else {
      setIsInterestOnlyForm(false);
      setInterestRateForm(5);
      setSaleFormSelectedProductId('');
      setSaleFormCostPrice('');
      setSaleFormSalePrice('');
    }
  }, [saleToEdit, showSaleForm]);

  useEffect(() => {
    if (productToEdit) {
      setProdFormCost(productToEdit.cost !== undefined ? productToEdit.cost : '');
      setProdFormSale(productToEdit.sale !== undefined ? productToEdit.sale : '');
      setProdFormQty(productToEdit.quantity !== undefined ? productToEdit.quantity : 1);
    } else {
      setProdFormCost('');
      setProdFormSale('');
      setProdFormQty(1);
    }
  }, [productToEdit, showAddProduct]);

  const [searchTerm, setSearchTerm] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'entrada' | 'parcela'>('all');
  const [txMethodFilter, setTxMethodFilter] = useState<string>('all');

  const transactions = useMemo(() => {
    const list: any[] = [];

    // Add down payments as transactions
    sales.forEach(sale => {
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
          label: 'Valor de Entrada'
        });
      }
    });

    // Add paid installments as transactions
    installments.forEach(inst => {
      if (inst.status === 'Pago') {
        const correspondingSale = sales.find(s => s.id === inst.saleId);
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
            total: inst.total
          },
          label: `Parcela ${inst.number}/${inst.total}`
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, installments]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.client.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.productName.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.id.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.paymentMethod.toLowerCase().includes(txSearch.toLowerCase()) ||
        tx.label.toLowerCase().includes(txSearch.toLowerCase());
      
      const matchesType = txTypeFilter === 'all' || tx.type === txTypeFilter;
      const matchesMethod = txMethodFilter === 'all' || tx.paymentMethod === txMethodFilter;
      
      return matchesSearch && matchesType && matchesMethod;
    });
  }, [transactions, txSearch, txTypeFilter, txMethodFilter]);

  const [filterDay, setFilterDay] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Atrasados' | 'Hoje'>('Todos');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [selectedSaleForContract, setSelectedSaleForContract] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClient && !sales.some(s => s.client === selectedClient)) {
      setSelectedClient(null);
    }
  }, [sales, selectedClient]);
  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'interest' | 'amortization'>('interest');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'>('Pix');
  const [selectedInstallmentForReceipt, setSelectedInstallmentForReceipt] = useState<any>(null);
  const [selectedSaleForAmortization, setSelectedSaleForAmortization] = useState<any>(null);
  const [amortizationAmount, setAmortizationAmount] = useState<string>('');
  const [amortizationMethod, setAmortizationMethod] = useState<'Pix' | 'Dinheiro' | 'Cartão' | 'Transferência'>('Pix');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // State & helpers for Anticipate Installments feature
  const [selectedSaleForAdvance, setSelectedSaleForAdvance] = useState<any>(null);
  const [advanceSelectedInstIds, setAdvanceSelectedInstIds] = useState<string[]>([]);
  const [advanceGlobalDiscount, setAdvanceGlobalDiscount] = useState<number>(10);
  const [advanceCustomDiscounts, setAdvanceCustomDiscounts] = useState<{ [instId: string]: number }>({});
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'>('Pix');

  const openAdvanceModal = (sale: any) => {
    setSelectedSaleForAdvance(sale);
    const salePendingInsts = installments.filter(i => i.saleId === sale.id && i.status === 'Pendente');
    const allIds = salePendingInsts.map(i => i.id);
    setAdvanceSelectedInstIds(allIds);
    setAdvanceGlobalDiscount(10);
    const initialDiscounts: { [key: string]: number } = {};
    allIds.forEach(id => { initialDiscounts[id] = 10; });
    setAdvanceCustomDiscounts(initialDiscounts);
    setAdvancePaymentMethod('Pix');
  };

  const handleSetGlobalDiscount = (pct: number) => {
    setAdvanceGlobalDiscount(pct);
    const updated = { ...advanceCustomDiscounts };
    advanceSelectedInstIds.forEach(id => {
      updated[id] = pct;
    });
    setAdvanceCustomDiscounts(updated);
  };

  const handleCustomDiscountChange = (instId: string, val: number) => {
    const num = isNaN(val) ? 0 : Math.max(0, Math.min(100, val));
    setAdvanceCustomDiscounts(prev => ({ ...prev, [instId]: num }));
  };

  const toggleSelectAdvanceInst = (instId: string) => {
    if (advanceSelectedInstIds.includes(instId)) {
      setAdvanceSelectedInstIds(prev => prev.filter(id => id !== instId));
    } else {
      setAdvanceSelectedInstIds(prev => [...prev, instId]);
      if (advanceCustomDiscounts[instId] === undefined) {
        setAdvanceCustomDiscounts(prev => ({ ...prev, [instId]: advanceGlobalDiscount }));
      }
    }
  };

  const advancePendingInsts = useMemo(() => {
    if (!selectedSaleForAdvance) return [];
    return installments
      .filter(i => i.saleId === selectedSaleForAdvance.id && i.status === 'Pendente')
      .sort((a, b) => a.number - b.number);
  }, [selectedSaleForAdvance, installments]);

  const advanceCalculations = useMemo(() => {
    const selectedInsts = advancePendingInsts.filter(i => advanceSelectedInstIds.includes(i.id));
    let totalOriginal = 0;
    let totalDiscount = 0;
    let totalFinal = 0;

    selectedInsts.forEach(inst => {
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
      effectiveDiscountPct: totalOriginal > 0 ? ((totalDiscount / totalOriginal) * 100).toFixed(1) : '0'
    };
  }, [advancePendingInsts, advanceSelectedInstIds, advanceCustomDiscounts, advanceGlobalDiscount]);

  const handleConfirmAdvance = async () => {
    if (!selectedSaleForAdvance || advanceSelectedInstIds.length === 0) {
      showToast('Selecione pelo menos uma parcela para antecipar.', 'error');
      return;
    }

    const items = advanceSelectedInstIds.map(id => ({
      id,
      discountPercentage: advanceCustomDiscounts[id] ?? advanceGlobalDiscount ?? 0
    }));

    await advanceInstallments(
      selectedSaleForAdvance.id,
      items,
      advancePaymentMethod
    );

    showToast(`⚡ ${items.length} parcela(s) antecipada(s) com sucesso! Capital recebido: ${money(advanceCalculations.totalFinal)}`);
    setSelectedSaleForAdvance(null);
  };

  const [showQuickPaymentPicker, setShowQuickPaymentPicker] = useState(false);
  const [showAdvanceSalePicker, setShowAdvanceSalePicker] = useState(false);
  const [quickPaymentClientFilter, setQuickPaymentClientFilter] = useState<string | null>(null);

  const handleGlobalQuickPaymentClick = (clientFilter?: string) => {
    setQuickPaymentClientFilter(clientFilter || null);
    let pendingList = installments.filter(i => i.status === 'Pendente');
    if (clientFilter) {
      pendingList = pendingList.filter(i => i.client === clientFilter);
    }
    if (pendingList.length === 0) {
      showToast(clientFilter ? `Não há parcelas pendentes para o cliente "${clientFilter}".` : 'Não há parcelas pendentes para recebimento.', 'error');
      return;
    }
    pendingList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (pendingList.length === 1) {
      setSelectedInstallmentForPayment(pendingList[0]);
    } else {
      setShowQuickPaymentPicker(true);
    }
  };

  const handleGlobalAdvanceClick = (clientFilter?: string) => {
    let activeSalesWithPending = sales.filter(s => 
      installments.some(i => i.saleId === s.id && i.status === 'Pendente')
    );
    if (clientFilter) {
      activeSalesWithPending = activeSalesWithPending.filter(s => s.client === clientFilter);
    }
    if (activeSalesWithPending.length === 0) {
      showToast(clientFilter ? `Não há contratos com parcelas pendentes para "${clientFilter}".` : 'Não há contratos com parcelas pendentes para antecipar.', 'error');
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
    const num = isNaN(val) ? 0 : Math.max(0, val);
    setSimCashPrice(num);
    const calculatedPV = Math.max(0, num - simDownPayment);
    setSimValue(calculatedPV);
  };

  const handleSimDownPaymentChange = (val: number) => {
    const num = isNaN(val) ? 0 : Math.max(0, val);
    setSimDownPayment(num);
    const basePrice = simCashPrice > 0 ? simCashPrice : (simValue + simDownPayment);
    setSimValue(Math.max(0, basePrice - num));
  };

  const handleSelectProductForSim = (productId: string) => {
    setSimSelectedProductId(productId);
    if (!productId) return;
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setSimProductName(prod.name);
      const cashVal = Number(prod.sale) || 0;
      setSimCashPrice(cashVal);
      setSimValue(Math.max(0, cashVal - simDownPayment));
    }
  };

  // Helper numerical solver to find interest rate (i) given pv, pmt, and n using bisection
  const calculateRateFromPmt = (pv: number, pmt: number, n: number): number => {
    if (pv <= 0 || pmt <= 0 || n <= 0) return 0;
    if (pmt * n <= pv) return 0;

    let low = 0.00001; 
    let high = 5.0;    
    let mid = 0;
    
    for (let iter = 0; iter < 100; iter++) {
      mid = (low + high) / 2;
      const factor = Math.pow(1 + mid, n);
      const estPmt = pv * mid * factor / (factor - 1);
      
      if (Math.abs(estPmt - pmt) < 0.00001) {
        break;
      }
      if (estPmt > pmt) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return mid * 100;
  };

  useEffect(() => {
    if (!isEditingPmt) {
      const i = simRate / 100;
      const n = simInstallments || 1;
      const pv = simValue || 0;
      const pmt = i === 0 ? pv / n : pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
      const roundedPmt = Math.round(pmt);
      setSimPmt(roundedPmt > 0 ? roundedPmt.toString() : '');
    }
  }, [simValue, simRate, simInstallments, isEditingPmt]);

  const handleSimPmtChange = (val: string) => {
    setSimPmt(val);
    const numericPmt = Number(val);
    if (!isNaN(numericPmt) && numericPmt > 0) {
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
    const n = simInstallments || 1;
    const pv = simValue || 0;
    const rawPmt = i === 0 ? pv / n : pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    const pmt = Math.round(rawPmt);
    const totalPrazo = (pmt * n) + (simDownPayment || 0);

    setSaleToEdit(null);
    setSaleFormSelectedProductId(simSelectedProductId);
    const matchingProd = products.find(p => p.id === simSelectedProductId);
    if (matchingProd) {
      setSaleFormCostPrice(matchingProd.cost !== undefined ? matchingProd.cost : '');
    } else {
      setSaleFormCostPrice('');
    }
    setSaleFormSalePrice(totalPrazo);
    setIsInterestOnlyForm(false);
    setInterestRateForm(simRate);
    setShowSaleForm(true);
    showToast('Simulação transferida com sucesso para o formulário de venda!');
  };

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Reactive Stock Financials & Capital Calculations
  const stockFinancials = useMemo(() => {
    let totalInvested = 0;
    let totalProjectedSale = 0;
    let totalUnits = 0;
    let availableModels = 0;

    products.forEach(p => {
      const qty = Math.max(0, p.quantity !== undefined ? p.quantity : (p.status === 'Disponivel' ? 1 : 0));
      const cost = Number(p.cost) || 0;
      const salePrice = Number(p.sale) || 0;

      if (qty > 0) {
        totalInvested += (cost * qty);
        totalProjectedSale += (salePrice * qty);
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
      marginPct
    };
  }, [products]);

  const handleSaleProductSelect = (productId: string) => {
    setSaleFormSelectedProductId(productId);
    const selected = products.find(p => p.id === productId);
    if (selected) {
      setSaleFormCostPrice(selected.cost !== undefined ? selected.cost : 0);
      setSaleFormSalePrice(selected.sale !== undefined ? selected.sale : 0);
    } else {
      setSaleFormCostPrice('');
      setSaleFormSalePrice('');
    }
  };

  const openCapitalManager = () => {
    const initialMap: { [productId: string]: number } = {};
    products.forEach(p => {
      initialMap[p.id] = p.cost !== undefined ? p.cost : 0;
    });
    setCapitalBatchCosts(initialMap);
    setCapitalBatchPercent(0);
    setShowCapitalManagerModal(true);
  };

  const handleApplyCapitalBatchPercent = (pct: number) => {
    setCapitalBatchPercent(pct);
    const updated: { [productId: string]: number } = {};
    products.forEach(p => {
      const baseCost = p.cost !== undefined ? p.cost : 0;
      if (pct === 0) {
        updated[p.id] = baseCost;
      } else {
        const factor = 1 + (pct / 100);
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

  const handleConfirmPayment = async () => {
    if (!selectedInstallmentForPayment) return;
    
    await payInstallment(selectedInstallmentForPayment.id, paymentMethod);
    
    const installment = { ...selectedInstallmentForPayment, status: 'Pago', paidAt: new Date().toISOString(), paymentMethod };
    setSelectedInstallmentForPayment(null);
    setSelectedInstallmentForReceipt(installment);
    showToast('Pagamento confirmado com sucesso!');
  };

  const handleConfirmAmortization = async () => {
    if (!selectedSaleForAmortization || !amortizationAmount) return;
    const amountVal = Number(amortizationAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Por favor, informe um valor de amortização válido maior que zero.');
      return;
    }
    if (amountVal > selectedSaleForAmortization.total) {
      showToast(`O valor da amortização não pode ser maior que o saldo atual de ${money(selectedSaleForAmortization.total)}.`);
      return;
    }
    
    await amortizeSale(selectedSaleForAmortization.id, amountVal, amortizationMethod);
    setSelectedSaleForAmortization(null);
    setAmortizationAmount('');
    showToast('Amortização realizada com sucesso!');
  };

  const handleShareReceipt = async () => {
    const element = document.getElementById('receipt-content');
    if (!element || !selectedInstallmentForReceipt) return;
    try {
      const cleanClientName = selectedInstallmentForReceipt.client.replace(/\s+/g, '_').toUpperCase();
      const filename = `RECIBO_${cleanClientName}_${selectedInstallmentForReceipt.id.substring(0,8).toUpperCase()}.pdf`;
      const opt: any = {
        margin: [10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      const worker = html2pdf().set(opt).from(element);
      const pdfBlob = await worker.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Comprovante de Recebimento', text: `Comprovante de pagamento - ${selectedInstallmentForReceipt.client}` });
      } else {
        await worker.save();
        showToast('Compartilhamento direto não suportado. O arquivo foi baixado para envio.');
      }
    } catch (error) {
      showToast('Erro ao processar o compartilhamento.', 'error');
    }
  };

  const handleDownloadReceiptPDF = async () => {
    if (!selectedInstallmentForReceipt) return;
    try {
      showToast('Gerando comprovante em PDF...');
      const correspondingSale = sales.find(s => s.id === selectedInstallmentForReceipt.saleId || (selectedInstallmentForReceipt?.id && selectedInstallmentForReceipt.id.replace('entrada-', '') === s.id));
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

  const [isContractGenerating, setIsContractGenerating] = useState(false);

  const handleDownloadContract = async (saleToDownload?: any) => {
    const targetSale = saleToDownload || selectedSaleForContract;
    if (!targetSale) {
      showToast('Erro: Contrato não selecionado.', 'error');
      return;
    }
    
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

  const handlePrintContract = (saleToPrint?: any) => {
    const targetSale = saleToPrint || selectedSaleForContract;
    if (!targetSale) return;
    fallbackPrintContract(targetSale, settings, installments);
    showToast('Abrindo diálogo de impressão...');
  };

  const handleShareContract = async (saleToShare?: any) => {
    const targetSale = saleToShare || selectedSaleForContract;
    if (!targetSale) return;
    showToast('Preparando contrato para envio...');
    const ok = await shareContractFile(targetSale, settings, installments);
    if (ok) {
      showToast('Contrato compartilhado com sucesso!');
    } else {
      showToast('Download do contrato iniciado.');
    }
  };

  const handleCopyContractText = (saleToCopy?: any) => {
    const targetSale = saleToCopy || selectedSaleForContract;
    if (!targetSale) return;
    const company = (settings.companyName || 'NEXUS COMMERCE').toUpperCase();
    const sellerName = getSystemSellerName(settings, targetSale);
    const cleanId = (targetSale.id || '').substring(0, 8).toUpperCase();
    const dateFormatted = formatLocalDateBR(targetSale.date || targetSale.createdAt || new Date());
    
    let dueDay = '—';
    if (installments && installments.length > 0) {
      const matchingInst = installments.find(i => i.saleId === targetSale.id);
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

    const text = `📋 CONTRATO DE COMPRA E VENDA (Nº CT-${cleanId})
Emissão: ${dateFormatted} • ${company}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 QUADRO-RESUMO DA TRANSAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Vendedor(a): ${sellerName} (${company})
• Comprador(a): ${targetSale.client.toUpperCase()}
• CPF/Doc: ${targetSale.clientCpf || 'Registrado em Sistema'}
• Telefone: ${targetSale.clientPhone || 'N/A'}${targetSale.clientAddress ? `\n• Endereço: ${targetSale.clientAddress}` : ''}
• Produto/Serviço: ${(targetSale.productName || 'Produto Registrado').toUpperCase()}
• Valor Total: ${money(targetSale.total)}${targetSale.downPayment ? ` (Entrada: ${money(targetSale.downPayment)})` : ''}
• Plano de Pagamento: ${modalidadeDesc}
• Vencimento Recorrente: Todo dia ${dueDay} de cada mês

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CLÁUSULAS E CONDIÇÕES PRINCIPAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. OBJETO: Venda do bem/serviço discriminado acima em perfeitas condições de uso.
2. PAGAMENTO: O Comprador se compromete a efetuar os pagamentos nas datas estipuladas.
3. ANTECIPAÇÃO: É facultado ao Comprador amortizar ou quitar parcelas a qualquer momento com abatimento proporcional.
4. ATRASO: Atrasos implicarão em multa de 2% e juros moratórios de 1% ao mês pro rata die.
5. EFICÁCIA: Documento reconhecido como título de crédito e confissão de dívida líquida e certa (Art. 784, CPC).

Assinado Eletronicamente:
• Vendedor(a): ${sellerName}
• Comprador(a): ${targetSale.client.toUpperCase()}
Autenticação: ${targetSale.id.toUpperCase()}`;

    navigator.clipboard.writeText(text);
    showToast('Texto do contrato copiado com sucesso!');
  };

  const downloadPDF = async () => {
    await handleDownloadContract();
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
      filename: `RELATORIO_GESTÃO_DE_VENDAS_${formattedDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
    const effectiveCashPrice = simCashPrice > 0 ? simCashPrice : (pv + (simDownPayment || 0));
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

  const shareSaleTableWhatsApp = (sale: any) => {
    const saleInsts = installments.filter(i => i.saleId === sale.id).sort((a,b) => a.number - b.number);
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

  const shareInstallmentWhatsApp = (sale: any, inst: any) => {
    let template = settings.whatsappTemplate || 'Olá, {cliente}! Passando para lembrar que a sua parcela {parcela} do produto {produto} no valor de {valor} vence em {vencimento}.\n\nPara facilitar o pagamento, você pode utilizar a chave Pix abaixo:\nChave Pix: {chave_pix}\nBeneficiário: {nome_pix}\n\nSe tiver qualquer dúvida, fique à vontade para falar conosco!';
    
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
    
    const typeLabel = tx.type === 'entrada' ? 'Valor de Entrada' : `Parcela ${tx.installmentDetails?.number}/${tx.installmentDetails?.total}`;

    const text = `*COMPROVANTE DE RECEBIMENTO* ✅\n` +
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

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const todayTime = new Date();
  todayTime.setHours(0,0,0,0);

  const filteredProducts = products.filter(p => !searchTerm || [p.name, p.category, p.status].some(v => v.toLowerCase().includes(searchTerm.toLowerCase())));
  
  const filteredSales = sales.filter(s => {
    // Excluir contratos que já estão totalmente pagos
    const sInsts = installments.filter(i => i.saleId === s.id);
    const isFullyPaid = sInsts.length > 0 && sInsts.every(i => i.status === 'Pago');
    if (isFullyPaid) return false;

    const matchesSearch = !searchTerm || [s.client, s.productName, s.status].some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === 'Atrasados') {
      const hasOverdue = sInsts.some(i => {
        if (i.status !== 'Pendente') return false;
        const d = parseDateToMidnight(i.dueDate);
        return d.getTime() < todayTime.getTime();
      });
      return matchesSearch && hasOverdue;
    }
    
    if (filterStatus === 'Hoje') {
      const hasDueToday = sInsts.some(i => {
        if (i.status !== 'Pendente') return false;
        const d = parseDateToMidnight(i.dueDate);
        return d.getTime() === todayTime.getTime();
      });
      return matchesSearch && hasDueToday;
    }
    
    return matchesSearch;
  });
  const filteredInstallments = installments.filter(i => {
    const matchesSearch = !searchTerm || [i.client, i.productName, i.status].some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    const day = extractDueDay(i.dueDate);
    return matchesSearch && (!filterDay || day === filterDay);
  });
  const clientsList = Array.from(new Set(sales.map(s => s.client).filter(Boolean))) as string[];
  const filteredClients = clientsList.filter(c => !searchTerm || c.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!authReady) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} settings={settings} />;
  }


  return (
    <div className="flex min-h-screen bg-bg-main text-white">
      <Sidebar activeView={activeView} setActiveView={setActiveView} collapsed={collapsed} setCollapsed={setCollapsed} settings={settings} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} desktopSidebarOpen={desktopSidebarOpen} setDesktopSidebarOpen={setDesktopSidebarOpen} onLogout={() => setIsAuthenticated(false)} />
      <BottomNavigation activeView={activeView} setActiveView={setActiveView} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar 
          onOpenSettings={() => setActiveView('settings')} 
          onOpenMobileMenu={() => setIsMobileOpen(true)} 
          onToggleDesktopSidebar={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          desktopSidebarOpen={desktopSidebarOpen}
          viewTitle={activeView === 'reports' ? 'Relatório Mensal' : activeView === 'dashboard' ? 'Gestão de Vendas' : activeView === 'stock' ? 'Estoque de Produtos' : activeView === 'sales' ? 'Gestão de Recebíveis' : activeView === 'transactions' ? 'Histórico de Transações' : activeView === 'clients' ? 'Relacionamento' : activeView === 'settings' ? 'Configurações de Sistema' : 'Simulador de Preços'} 
        />
        <div className="p-4 pb-24 sm:p-8 overflow-x-hidden custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeView === 'dashboard' && (
                <div className="flex flex-col gap-4 sm:gap-8 animate-view-enter">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-1 sm:pl-0">
                     <div className="flex flex-col">
                        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                           Olá, <span className="text-white font-black italic">{settings.userName ? settings.userName.trim().split(' ')[0].charAt(0).toUpperCase() + settings.userName.trim().split(' ')[0].slice(1).substring(0).toLowerCase() : ''}</span>.
                        </h1>
                        <p className="text-[9px] text-zinc-550 font-bold uppercase mt-0.5 tracking-[0.25em]" style={{ color: '#71717a' }}>
                           gerencie suas vendas
                        </p>
                     </div>
                     <button
                       onClick={() => {
                         setSaleToEdit(null);
                         setShowSaleForm(true);
                         setActiveView('sales');
                       }}
                       className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gold hover:bg-amber-400 text-black font-black uppercase text-[10px] sm:text-xs tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
                     >
                       <Plus size={14} />
                       <span>Nova Venda</span>
                     </button>
                  </div>

                  <DashboardStats 
                    products={products} 
                    sales={sales} 
                    installments={installments} 
                    closings={closings}
                    onNavigate={(view, filter) => {
                      setActiveView(view);
                      if (filter === 'closings' || filter === 'installments') {
                        setReportsTab(filter);
                      } else if (filter) {
                        setFilterStatus(filter as any);
                      }
                    }} 
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                    <div className="glass-card p-6 sm:p-8 flex flex-col gap-6">
                      <div 
                        onClick={() => setActiveView('sales')}
                        className="flex items-center justify-between cursor-pointer group/header hover:opacity-80 transition-opacity"
                      >
                         <div>
                            <h3 className="text-base sm:text-lg font-black italic uppercase text-white tracking-widest">Fluxo Recente</h3>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase mt-1">Últimas movimentações</p>
                         </div>
                         <button onClick={() => setActiveView('sales')} className="text-[9px] sm:text-[10px] font-black uppercase text-gold hover:underline">Ver Todos</button>
                      </div>
                      <div className="flex flex-col gap-3">
                        {sales.length === 0 ? (
                          <div className="p-6 bg-[rgba(255,255,255,0.02)] border border-line rounded-2xl text-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nenhum contrato ativo</span>
                          </div>
                        ) : (
                          sales.slice(-5).reverse().map(sale => (
                            <div 
                              key={sale.id} 
                              className="p-3 sm:p-4 bg-[rgba(255,255,255,0.02)] border border-line rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 group hover:bg-[rgba(255,215,0,0.05)] transition-all"
                            >
                              <div 
                                onClick={() => setSelectedSaleForContract(sale)}
                                className="flex items-center gap-3 sm:gap-4 min-w-0 cursor-pointer flex-1"
                                title="Clique para visualizar o contrato completo"
                              >
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center border border-[rgba(255,215,0,0.1)] shrink-0 group-hover:scale-105 transition-transform">
                                  <ShoppingBag size={16} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-black text-white italic text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[160px] uppercase tracking-tighter group-hover:text-gold transition-colors">{sale.productName}</span>
                                  <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase truncate">{sale.client}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                                <div className="text-right">
                                  <p className="font-black text-white italic text-xs sm:text-sm">{money(sale.total)}</p>
                                  <span className="text-[8px] text-green-neon font-black uppercase">KPI OK</span>
                                </div>

                                <div className="flex items-center gap-1 pl-2 border-l border-line/60">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSaleForContract(sale);
                                    }}
                                    className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-gold hover:border-gold transition-all grid place-items-center active:scale-95 cursor-pointer"
                                    title="Visualizar Contrato"
                                  >
                                    <FileText size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSaleToEdit(sale);
                                      setShowSaleForm(true);
                                      setActiveView('sales');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-gold hover:border-gold transition-all grid place-items-center active:scale-95 cursor-pointer"
                                    title="Editar Contrato"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openConfirm(
                                        'Excluir Contrato Permanentemente',
                                        `Deseja realmente excluir o contrato de ${sale.client} (${money(sale.total)}) e todas as suas parcelas? Esta ação é irreversível.`,
                                        async () => {
                                          const ok = await deleteSale(sale.id);
                                          if (ok) showToast('Contrato excluído com sucesso!');
                                        }
                                      );
                                    }}
                                    className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-red-500 hover:border-red-500 transition-all grid place-items-center active:scale-95 cursor-pointer"
                                    title="Excluir Contrato"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="glass-card p-6 sm:p-8 flex flex-col gap-6">
                      <div 
                        onClick={() => setActiveView('stock')}
                        className="cursor-pointer group/header hover:opacity-80 transition-opacity"
                      >
                        <h3 className="text-base sm:text-lg font-black italic uppercase text-white tracking-widest">Produtos em Destaque</h3>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase mt-1">Produtos com maior tração</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {products.filter(p => p.status === 'Disponivel').slice(0, 4).map(product => (
                          <div 
                            key={product.id} 
                            onClick={() => { setActiveView('stock'); setSearchTerm(product.name); }}
                            className="p-3 sm:p-4 bg-[rgba(0,0,0,0.4)] border border-line rounded-2xl sm:rounded-3xl flex flex-col gap-3 sm:gap-4 group hover:border-[rgba(255,215,0,0.3)] transition-all cursor-pointer active:scale-95"
                          >
                             <div className="w-full aspect-square rounded-xl sm:rounded-2xl bg-zinc-900 border border-line overflow-hidden">
                                {product.photo ? (
                                  <img src={product.photo} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[rgba(255,215,0,0.1)]">
                                     <Package size={20} />
                                  </div>
                                )}
                             </div>
                             <div>
                                <h4 className="text-[10px] sm:text-xs font-black text-white truncate uppercase italic">{product.name}</h4>
                                <p className="text-xs sm:text-sm font-black text-gold mt-1 italic">{money(product.sale)}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'clients' && (
                <div className="flex flex-col gap-6 animate-view-enter">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      {selectedClient && (
                        <button 
                          onClick={() => setSelectedClient(null)}
                          className="w-10 h-10 border border-line rounded-xl grid place-items-center bg-[rgba(0,0,0,0.4)] text-gold hover:scale-110 transition-all shadow-lg shrink-0"
                        >
                          <ArrowLeft size={18} />
                        </button>
                      )}
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white italic uppercase truncate">
                        {selectedClient || 'Inteligência de Clientes'}
                      </h2>
                    </div>

                    {!selectedClient && (
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative group w-full sm:w-64">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={18} />
                          <input 
                            type="search" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar comprador..." 
                            className="w-full h-11 bg-black border border-line-strong rounded-2xl pl-11 pr-4 outline-none focus:border-gold transition-all font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedClient ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 sm:gap-8">
                      {/* Sidebar do Perfil do Cliente */}
                      <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="glass-card p-6 sm:p-8 flex flex-col items-center text-center">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] bg-gold-soft border-2 border-[rgba(255,215,0,0.4)] text-gold flex items-center justify-center text-3xl sm:text-4xl font-black mb-4 sm:mb-6 shadow-[0_0_50px_#ffd70026]">
                            {selectedClient.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-2 truncate max-w-full">{selectedClient}</h3>
                          <p className="text-gray-500 text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-4 py-1.5 border border-line rounded-full">Score: A+</p>
                          
                          <div className="w-full grid grid-cols-2 gap-3 mt-6 sm:mt-8">
                            {(() => {
                              const s = sales.filter(s => s.client === selectedClient);
                              const pend = installments.filter(i => i.client === selectedClient && i.status === 'Pendente').reduce((acc, i) => acc + i.value, 0);
                              const paid = installments.filter(i => i.client === selectedClient && i.status === 'Pago').reduce((acc, i) => acc + i.value, 0);
                              return (
                                <>
                                  <div className="p-3 sm:p-4 bg-[rgba(0,0,0,0.4)] border border-line shadow-sm rounded-[20px] sm:rounded-[24px]">
                                    <span className="text-[8px] sm:text-[9px] font-black text-gray-600 block mb-1 uppercase tracking-widest">Contratos</span>
                                    <strong className="text-lg sm:text-xl font-black text-gold">{s.length}</strong>
                                  </div>
                                  <div className="p-3 sm:p-4 bg-[rgba(0,0,0,0.4)] border border-line shadow-sm rounded-[20px] sm:rounded-[24px]">
                                    <span className="text-[8px] sm:text-[9px] font-black text-gray-600 block mb-1 uppercase tracking-widest">Liquidado</span>
                                    <strong className="text-lg sm:text-xl font-bold text-green-neon">{money(paid)}</strong>
                                  </div>
                                  <div className="col-span-2 p-4 sm:p-5 bg-[rgba(0,0,0,0.6)] border border-[rgba(255,215,0,0.1)] shadow-sm rounded-[20px] sm:rounded-[24px] mt-2">
                                     <span className="text-[9px] sm:text-[10px] font-black text-gray-500 block mb-2 uppercase tracking-[0.2em] text-center">Capital em Movimento</span>
                                     <strong className="text-xl sm:text-2xl font-bold text-white block text-center">{money(paid + pend)}</strong>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Histórico Comercial do Cliente */}
                      <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="flex items-center justify-between border-b border-line pb-4 px-1">
                           <div>
                              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 uppercase italic text-white">
                                 <History size={18} className="text-gold" /> Carteira de Contratos
                              </h3>
                              <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Histórico de compromissos e regularidade de liquidação</p>
                           </div>
                           <span className="pill text-[9px] font-black uppercase tracking-wider">Total: {sales.filter(s => s.client === selectedClient).length}</span>
                        </div>

                        <div className="flex flex-col gap-4">
                           {sales.filter(s => s.client === selectedClient).map(sale => {
                              const isExpanded = expandedSaleId === sale.id;
                              return (
                                 <div 
                                    key={sale.id} 
                                    className={`glass-card overflow-hidden border transition-all duration-300 ${
                                       isExpanded 
                                          ? 'border-gold bg-[rgba(0,0,0,0.6)] shadow-[0_15px_40px_rgba(0,0,0,0.6)]' 
                                          : 'border-white/5 bg-[rgba(0,0,0,0.3)] hover:border-white/15'
                                    }`}
                                 >
                                    {/* Capa/Header do Compromisso */}
                                    <button 
                                       type="button"
                                       onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                       className="w-full text-left p-6 flex items-center justify-between focus:outline-none focus-within:ring-1 focus-within:ring-gold"
                                    >
                                       <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic shadow-inner ${
                                             isExpanded 
                                                ? 'bg-gold text-black shadow-lg text-xs' 
                                                : 'bg-white/5 text-gray-400 border border-white/10 text-xs'
                                          }`}>
                                             {sale.productName.charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                             <h3 className="text-base sm:text-lg font-black text-white italic uppercase tracking-tight">
                                                {sale.productName}
                                             </h3>
                                             {!isExpanded && (
                                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mt-0.5">
                                                   Clique para Ver Compromisso Completo
                                                </span>
                                             )}
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-4">
                                          {!isExpanded && (
                                             <div className="flex items-center gap-4">
                                                {/* Progresso de parcelas */}
                                                <div className="hidden sm:flex items-center gap-2">
                                                   <span className="text-[9px] text-gray-500 font-extrabold uppercase">Quitação:</span>
                                                   <span className="text-[9px] text-white font-extrabold">{installments.filter(i => i.saleId === sale.id && i.status === 'Pago').length}/{sale.installmentsCount}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                   <span className={`w-2 h-2 rounded-full ${sale.status === 'Ativa' ? 'bg-gold animate-pulse' : 'bg-green-neon'}`} />
                                                   <span className={`text-[9.5px] font-black uppercase tracking-widest ${sale.status === 'Ativa' ? 'text-gold' : 'text-green-neon'}`}>
                                                      {sale.status === 'Ativa' ? 'Operacional' : 'Liquidado'}
                                                   </span>
                                                </div>
                                             </div>
                                          )}
                                          <ChevronDown 
                                             size={20} 
                                             className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-gold' : ''}`} 
                                          />
                                       </div>
                                    </button>

                                    {/* Informações Completas (Exibidas apenas quando clicado) */}
                                    {isExpanded && (
                                       <div className="border-t border-line px-6 sm:px-10 py-8 flex flex-col gap-8 animate-view-enter">
                                          
                                          {/* Painel de Informações do Ativo & Financeiro */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                             
                                             {/* Detalhes do Cliente e Instrumento */}
                                             <div className="flex flex-col gap-4 p-5 sm:p-6 bg-black/40 rounded-2xl border border-line-strong">
                                                <h4 className="text-[10px] font-black uppercase text-gold tracking-widest pr-2 border-b border-line pb-2">
                                                   I. Identificação do Compromisso
                                                </h4>
                                                <div className="flex flex-col gap-2.5">
                                                   <div className="flex flex-col">
                                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Nome do Comprador</span>
                                                      <strong className="text-white text-sm font-semibold uppercase">{sale.client}</strong>
                                                   </div>
                                                   {sale.clientAddress && (
                                                      <div className="flex flex-col">
                                                         <span className="text-[9px] text-gray-500 font-bold uppercase">Endereço</span>
                                                         <span className="text-xs text-gray-300 leading-relaxed font-semibold">{sale.clientAddress}</span>
                                                      </div>
                                                   )}
                                                   <div className="flex flex-col">
                                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Protocol ID</span>
                                                      <span className="text-[10px] text-gray-400 font-mono font-bold mt-0.5">{sale.id}</span>
                                                   </div>
                                                </div>
                                             </div>

                                             {/* Detalhes do Ativo */}
                                             <div className="flex flex-col gap-4 p-5 sm:p-6 bg-black/40 rounded-2xl border border-line-strong">
                                                <h4 className="text-[10px] font-black uppercase text-gold tracking-widest pr-2 border-b border-line pb-2">
                                                   II. Detalhes do Ativo Objeto
                                                </h4>
                                                <div className="flex flex-col gap-2.5">
                                                   <div className="flex flex-col">
                                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Instrumento / Ativo</span>
                                                      <div className="flex items-center gap-2 mt-1">
                                                         <div className="w-6 h-6 rounded-lg bg-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center border border-[rgba(255,215,0,0.1)]">
                                                            <ShoppingBag size={12} />
                                                         </div>
                                                         <strong className="text-white text-sm font-semibold uppercase">{sale.productName}</strong>
                                                      </div>
                                                   </div>
                                                   <div className="flex flex-col">
                                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Status / Ciclo Atual</span>
                                                      <div className="flex items-center gap-2 mt-1">
                                                         <span className={`w-2 h-2 rounded-full ${sale.status === 'Ativa' ? 'bg-gold animate-pulse' : 'bg-green-neon'}`} />
                                                         <span className={`text-[10px] font-black uppercase tracking-widest ${sale.status === 'Ativa' ? 'text-gold' : 'text-green-neon'}`}>
                                                            {sale.status === 'Ativa' ? 'Operacional' : 'Liquidado'}
                                                         </span>
                                                      </div>
                                                   </div>
                                                </div>
                                             </div>

                                             {/* Aspectos Financeiros */}
                                             <div className="flex flex-col gap-4 p-5 sm:p-6 bg-black/40 rounded-2xl border border-line-strong md:col-span-2 lg:col-span-1">
                                                <h4 className="text-[10px] font-black uppercase text-gold tracking-widest pr-2 border-b border-line pb-2">
                                                   III. Aspectos Financeiros & Retorno
                                                </h4>
                                                <div className="flex flex-col gap-3">
                                                   <div className="flex items-center justify-between">
                                                      <div className="flex flex-col">
                                                         <span className="text-[9px] text-gray-500 font-bold uppercase">Valor da Transação</span>
                                                         <strong className="text-white text-lg font-bold">{money(sale.total)}</strong>
                                                      </div>
                                                      <div className="flex flex-col text-right">
                                                         <span className="text-[9px] text-gray-500 font-bold uppercase">Projeção ROI</span>
                                                         <strong className="text-green-neon text-lg font-bold">+{money(sale.profit)}</strong>
                                                      </div>
                                                   </div>
                                                   <div className="flex flex-col border-t border-line/50 pt-2">
                                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Modalidade</span>
                                                      <div className="flex items-center gap-1.5 mt-1">
                                                         <span className="text-[11px] text-gray-300 font-bold uppercase">{sale.installmentsCount}x de {money(sale.installmentValue)}</span>
                                                         {sale.isInterestOnly && (
                                                            <span className="px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.1)] text-gold border border-[rgba(255,215,0,0.2)] text-[8px] font-black uppercase tracking-wider">
                                                               Apenas Juros ({sale.interestRate}%)
                                                            </span>
                                                         )}
                                                      </div>
                                                   </div>
                                                </div>
                                             </div>

                                          </div>

                                          {/* Barra de Ações do Contrato */}
                                          <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-black/20 rounded-2xl border border-line-strong">
                                             <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-gold/50 animate-pulse" />
                                                <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Painel de Controle Administrativo</span>
                                             </div>
                                             <div className="flex flex-wrap items-center gap-2">
                                                {sale.isInterestOnly && sale.status === 'Ativa' && (
                                                   <button 
                                                      onClick={() => {
                                                         const pending = installments.find(i => i.saleId === sale.id && i.status === 'Pendente');
                                                         if (pending) {
                                                            setSelectedInstallmentForPayment(pending);
                                                            setPaymentType('amortization');
                                                            setAmortizationAmount('');
                                                         } else {
                                                            showToast('Não há parcelas pendentes para amortizar nesta venda.', 'error');
                                                         }
                                                      }}
                                                      className="h-10 px-4 rounded-xl border border-[rgba(255,190,0,0.3)] bg-[rgba(255,190,0,0.05)] text-amber-200 hover:bg-gold hover:text-black hover:border-gold transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest active:scale-95 cursor-pointer"
                                                      title="Amortizar Valor"
                                                   >
                                                      <Minus size={12} />
                                                      Amortizar
                                                   </button>
                                                )}
                                                <button 
                                                   onClick={() => setSelectedSaleForContract(sale)} 
                                                   className="h-10 px-4 rounded-xl border border-line bg-white/5 text-gray-400 hover:text-gold hover:border-[rgba(255,215,0,0.3)] hover:bg-[rgba(255,215,0,0.05)] transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                   title="Ver Contrato"
                                                >
                                                   <FileText size={14} />
                                                   Visualizar Contrato
                                                </button>
                                                <button 
                                                   onClick={(e) => { e.stopPropagation(); handleDownloadContract(sale); }} 
                                                   className="h-10 px-4 rounded-xl border border-line bg-white/5 text-gray-400 hover:text-green-neon hover:border-[rgba(57,255,20,0.3)] hover:bg-[rgba(57,255,20,0.05)] transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                   title="Baixar PDF"
                                                >
                                                   <Download size={14} />
                                                   Salvar PDF
                                                </button>
                                                <button 
                                                   onClick={() => {
                                                      setSaleToEdit(sale);
                                                      setShowSaleForm(true);
                                                      setActiveView('sales');
                                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                                   }}
                                                   className="h-10 px-4 rounded-xl border border-line bg-white/5 text-gray-400 hover:text-gold hover:border-[rgba(255,215,0,0.3)] hover:bg-[rgba(255,215,0,0.05)] transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest cursor-pointer active:scale-95"
                                                   title="Editar Contrato"
                                                >
                                                   <Pencil size={14} />
                                                   Editar
                                                </button>
                                                <button 
                                                   onClick={() => openConfirm(
                                                      'Excluir Contrato Permanentemente', 
                                                      `Deseja realmente excluir o contrato de ${sale.client} (${money(sale.total)}) e todas as suas parcelas? Esta ação é irreversível.`, 
                                                      async () => {
                                                         const ok = await deleteSale(sale.id);
                                                         if (ok) showToast('Contrato excluído com sucesso!');
                                                      }
                                                   )} 
                                                   className="h-10 px-4 rounded-xl border border-line bg-white/5 text-gray-400 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest cursor-pointer active:scale-95"
                                                   title="Excluir Contrato"
                                                >
                                                   <Trash2 size={14} />
                                                   Excluir
                                                </button>
                                             </div>
                                          </div>

                                          {/* Cronograma de Liquidação */}
                                          <div className="flex flex-col gap-4">
                                             <div className="flex items-center justify-between border-l-2 border-[rgba(255,215,0,0.4)] pl-4 py-1">
                                                <div>
                                                   <h4 className="text-[11px] font-black uppercase text-gray-300 tracking-widest">Cronograma de Liquidação</h4>
                                                   <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">Ciclos de Pagamento e Quitação</p>
                                                </div>
                                             </div>
                                             
                                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                                {installments.filter(i => i.saleId === sale.id).sort((a,b) => a.number - b.number).map(inst => {
                                                   const isPaid = inst.status === 'Pago';
                                                   const dueDateObj = parseDateToMidnight(inst.dueDate);
                                                   
                                                   const isOverdue = !isPaid && dueDateObj.getTime() < todayTime.getTime();
                                                   const isDueToday = !isPaid && dueDateObj.getTime() === todayTime.getTime();

                                                   let cardStyles = 'border-line-strong bg-black/30 hover:border-[rgba(255,215,0,0.3)]';
                                                   let dotStyle = 'bg-[rgba(255,215,0,0.4)] animate-pulse';
                                                   let cycleLabel = `Ciclo ${inst.number}`;
                                                   let labelStyle = 'text-gray-500';

                                                   if (isPaid) {
                                                      cardStyles = 'border-[rgba(57,255,20,0.2)] bg-[rgba(57,255,20,0.05)]';
                                                      dotStyle = 'bg-green-neon';
                                                      labelStyle = 'text-green-500';
                                                   } else if (isOverdue) {
                                                      cardStyles = 'border-red-500/30 bg-red-500/5 hover:border-red-500/50';
                                                      dotStyle = 'bg-red-500 animate-pulse';
                                                      cycleLabel = `Ciclo ${inst.number} (Atrasado)`;
                                                      labelStyle = 'text-red-400';
                                                   } else if (isDueToday) {
                                                      cardStyles = 'border-purple-500/40 bg-purple-500/5 hover:border-purple-500/60';
                                                      dotStyle = 'bg-purple-500 animate-bounce';
                                                      cycleLabel = `Ciclo ${inst.number} (Vence Hoje)`;
                                                      labelStyle = 'text-purple-400';
                                                   }

                                                   return (
                                                      <div 
                                                         key={inst.id}
                                                         className={`p-4 rounded-2xl border transition-all ${cardStyles} flex flex-col gap-3 relative group/inst`}
                                                      >
                                                         <div className="flex items-center justify-between">
                                                            <span className={`text-[10px] font-black uppercase tracking-tighter ${labelStyle}`}>{cycleLabel}</span>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                                                         </div>
                                                         <div>
                                                            <p className="text-[13px] font-bold text-white tracking-wide">{money(inst.value)}</p>
                                                            <p className="text-[9px] font-black text-gray-500 uppercase mt-0.5">{formatLocalDateBR(inst.dueDate)}</p>
                                                         </div>
                                                         <div className="absolute inset-0 bg-[rgba(0,0,0,0.85)] flex items-center justify-center p-3 opacity-0 group-hover/inst:opacity-100 transition-all rounded-2xl backdrop-blur-sm">
                                                            {inst.status === 'Pendente' && (<>
                                                               <button 
                                                                  onClick={() => setSelectedInstallmentForPayment(inst)}
                                                                  className="hidden" style={{ display: 'none' }} />
                                                                   <div className="flex flex-col gap-1.5 w-full">
                                                                      <button 
                                                                         onClick={() => setSelectedInstallmentForPayment(inst)}
                                                                         className="w-full py-1.5 bg-gold text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl active:scale-95 px-1 font-black cursor-pointer leading-tight text-center"
                                                                      >
                                                                         Quitar
                                                                      </button>
                                                                      <button 
                                                                         onClick={() => shareInstallmentWhatsApp(sale, inst)}
                                                                         className="w-full py-1.5 bg-[#25D366] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl active:scale-95 px-1 font-black flex items-center justify-center gap-1 cursor-pointer leading-tight animate-view-enter"
                                                                      >
                                                                         <MessageCircle size={10} />
                                                                         Cobrar
                                                                      </button>
                                                                   </div>
                                                                   <button className="hidden" style={{ display: 'none' }}></button></>)}{false && (<button 
                                                               >
                                                                  Quitar
                                                               </button>
                                                            )}
                                                            {inst.status === 'Pago' && (
                                                               <button 
                                                                  onClick={() => setSelectedInstallmentForReceipt(inst)}
                                                                  className="w-full h-full bg-[rgba(255,255,255,0.1)] text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-[rgba(255,255,255,0.1)] px-1 font-extrabold"
                                                               >
                                                                  Recibo
                                                               </button>
                                                            )}
                                                         </div>
                                                      </div>
                                                   );
                                                })}
                                             </div>

                                             <div className="flex justify-end p-2 mt-2">
                                                <button 
                                                   onClick={() => shareSaleTableWhatsApp(sale)}
                                                   className="h-10 px-6 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-green-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all flex items-center gap-2"
                                                >
                                                   <MessageCircle size={14} />
                                                   Compartilhar Tabela WhatsApp
                                                </button>
                                             </div>
                                          </div>

                                       </div>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1 max-w-3xl mx-auto w-full">
                        {filteredClients.map(clientName => {
                          return (
                            <button 
                              key={clientName} 
                              onClick={() => setSelectedClient(clientName)}
                              className="group w-full flex items-center justify-between p-4 rounded-xl hover:bg-[rgba(255,255,255,0.03)] border border-transparent hover:border-line-strong transition-all text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-lg bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center text-xs font-black italic shadow-sm group-hover:bg-[rgba(255,215,0,0.1)] transition-colors shrink-0">
                                  {clientName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[15px] font-black text-gray-200 italic tracking-tight group-hover:text-white transition-colors">{clientName}</span>
                              </div>
                              <ArrowRight size={16} className="text-gray-700 group-hover:text-gold group-hover:translate-x-1 transition-all" />
                            </button>
                          );
                        })}
                        {clientsList.length === 0 && (
                          <div className="py-24 text-center">
                             <div className="opacity-20 mb-4 inline-block"><User size={64}/></div>
                             <p className="text-gray-600 font-black uppercase text-xs tracking-[0.4em]">Nenhum registro localizado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'stock' && (
                <div className="flex flex-col gap-6 animate-view-enter">
                  {/* TOP HEADER */}
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-1">
                    <div>
                      <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white italic uppercase">Estoque de Produtos</h2>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Gerenciamento, Custos e Disponibilidade de Ativos</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      <div className="relative group flex-1 min-w-[200px] sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
                        <input 
                          type="search" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar no estoque..." 
                          className="w-full h-11 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-[14px] pl-11 pr-4 outline-none focus:border-gold transition-all font-bold text-[11px] sm:text-xs text-white"
                        />
                      </div>
                      <button 
                        onClick={openCapitalManager} 
                        className="h-11 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                        title="Calibrar e atualizar valores investidos em lote"
                      >
                        <SlidersHorizontal size={15} />
                        <span>Atualizar Capital</span>
                      </button>
                      <button 
                        onClick={() => handleGlobalQuickPaymentClick()} 
                        className="h-11 px-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-neon rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <DollarSign size={15} />
                        <span className="hidden sm:inline">Quitar Parcela</span>
                      </button>
                      <button 
                        onClick={() => handleGlobalAdvanceClick()} 
                        className="h-11 px-4 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Zap size={15} />
                        <span className="hidden sm:inline">Antecipar</span>
                      </button>
                      <button 
                        onClick={() => { setShowAddProduct(true); setProductToEdit(null); setPreviewPhoto(null); }} 
                        className="h-11 px-6 bg-gold text-black rounded-xl sm:rounded-[14px] font-black uppercase text-[10px] sm:text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer shadow-lg"
                      >
                        <Plus size={18} />
                        Novo Produto
                      </button>
                    </div>
                  </div>

                  {/* ESTOQUE FINANCIAL OVERVIEW BENTO BANNER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
                    {/* Card 1: Capital Total Investido */}
                    <div className="glass-card p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-black/40 to-black/60 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Boxes size={20} />
                        </div>
                        <button
                          onClick={openCapitalManager}
                          className="h-7 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                          title="Atualizar custos de aquisição ou calibrar valores em lote"
                        >
                          <SlidersHorizontal size={11} />
                          <span>Atualizar Custos</span>
                        </button>
                      </div>
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 block">Capital Total Investido</span>
                        <strong className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight block mt-0.5">
                          {money(stockFinancials.totalInvested)}
                        </strong>
                        <p className="text-[9px] text-zinc-400 font-medium mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Atualizado automaticamente em tempo real
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Faturamento Bruto Projetado */}
                    <div className="glass-card p-5 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-black/40 to-black/60 rounded-2xl flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <TrendingUp size={20} />
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Preço Venda
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 block">Faturamento Projetado</span>
                        <strong className="text-2xl sm:text-3xl font-black text-blue-400 tracking-tight block mt-0.5">
                          {money(stockFinancials.totalProjectedSale)}
                        </strong>
                        <p className="text-[9px] text-zinc-400 font-medium mt-1">Valor total de venda do estoque</p>
                      </div>
                    </div>

                    {/* Card 3: Lucro Bruto Projetado */}
                    <div className="glass-card p-5 border border-green-500/20 bg-gradient-to-br from-green-500/10 via-black/40 to-black/60 rounded-2xl flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400">
                          <BadgeDollarSign size={20} />
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                          +{stockFinancials.marginPct}% margem
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-400/80 block">Lucro Bruto Estimado</span>
                        <strong className="text-2xl sm:text-3xl font-black text-green-400 tracking-tight block mt-0.5">
                          {money(stockFinancials.totalProjectedProfit)}
                        </strong>
                        <p className="text-[9px] text-zinc-400 font-medium mt-1">Faturamento menos custo de entrada</p>
                      </div>
                    </div>

                    {/* Card 4: Volume Físico */}
                    <div className="glass-card p-5 border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-black/60 rounded-2xl flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                          <Package size={20} />
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/20">
                          {stockFinancials.availableModels} Modelos
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 block">Volume em Estoque</span>
                        <strong className="text-2xl sm:text-3xl font-black text-white tracking-tight block mt-0.5">
                          {stockFinancials.totalUnits} <span className="text-sm font-semibold text-zinc-400">unidades</span>
                        </strong>
                        <p className="text-[9px] text-zinc-400 font-medium mt-1">Ativos físicos disponíveis</p>
                      </div>
                    </div>
                  </div>

                  {/* PRO TABULAR / ROW LEDGER STOCK */}
                  <div className="glass-card border border-line-strong overflow-hidden bg-black/40 backdrop-blur-md">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full border-collapse text-left min-w-[960px]">
                        <thead>
                          <tr className="border-b border-line-strong bg-black/80 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] h-14">
                            <th className="p-4 pl-6">Produto / Modelo (Edição em Linha)</th>
                            <th className="p-4 text-center w-32">Categoria</th>
                            <th className="p-4 text-center w-32">Custo Unitário (R$)</th>
                            <th className="p-4 text-center w-36">Total Investido (R$)</th>
                            <th className="p-4 text-center w-32">Valor Saída (R$)</th>
                            <th className="p-4 text-center w-44">Estoque (Qtd)</th>
                            <th className="p-4 text-center w-28">Estado</th>
                            <th className="p-4 pr-6 text-right w-32">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-gray-300">
                          {filteredProducts.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-16 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <Package size={48} className="text-gray-600 animate-pulse" />
                                  <h4 className="text-sm font-black uppercase tracking-widest text-white italic">Nenhum Produto Localizado</h4>
                                  <p className="text-[11px] text-gray-500 font-bold uppercase mt-1">Refine seus termos de busca ou cadastre um novo produto.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredProducts.map(p => {
                              const qty = p.quantity !== undefined ? p.quantity : 1;
                              const isVendido = qty <= 0 || p.status === 'Vendido';

                              const handleIncrement = () => {
                                const newQty = qty + 1;
                                const newStatus = newQty > 0 ? 'Disponivel' : 'Vendido';
                                updateProduct(p.id, { quantity: newQty, status: newStatus as any });
                                showToast(`Estoque de "${p.name}" atualizado para ${newQty}.`);
                              };

                              const handleDecrement = () => {
                                if (qty <= 0) return;
                                const newQty = qty - 1;
                                const newStatus = newQty > 0 ? 'Disponivel' : 'Vendido';
                                updateProduct(p.id, { quantity: newQty, status: newStatus as any });
                                showToast(`Estoque de "${p.name}" atualizado para ${newQty}.`);
                              };

                              const handleQtyChange = (valStr: string) => {
                                const newQty = Math.max(0, parseInt(valStr) || 0);
                                const newStatus = newQty > 0 ? 'Disponivel' : 'Vendido';
                                updateProduct(p.id, { quantity: newQty, status: newStatus as any });
                              };

                              return (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group/row h-16">
                                  {/* PRODUTO INFO & NAME INLINE */}
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                      <div className="relative group/avatar w-11 h-11 rounded-xl border border-line-strong bg-[#050505] overflow-hidden flex items-center justify-center shrink-0">
                                        {p.photo ? (
                                          <img src={p.photo} alt={p.name} className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-300" />
                                        ) : (
                                          <Package size={20} className="text-gray-600 group-hover/avatar:text-gold transition-colors" />
                                        )}
                                        <button 
                                          onClick={() => {
                                            setProductToEdit(p);
                                            setShowAddProduct(true);
                                            setPreviewPhoto(p.photo || null);
                                          }}
                                          className="absolute inset-0 bg-black/75 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                                          title="Alterar Imagem"
                                        >
                                          <Camera size={14} className="text-gold" />
                                        </button>
                                      </div>
                                      <div className="flex-1 max-w-[280px]">
                                        <input 
                                          type="text" 
                                          defaultValue={p.name} 
                                          onBlur={(e) => {
                                            const newName = e.target.value.trim();
                                            if (newName && newName !== p.name) {
                                              updateProduct(p.id, { name: newName });
                                              showToast(`Nome atualizado para "${newName}"`);
                                            }
                                          }}
                                          className="bg-transparent border border-transparent hover:border-[rgba(255,215,0,0.2)] focus:border-gold focus:bg-black/60 text-sm font-bold text-white uppercase italic tracking-tight py-1.5 px-3 rounded-lg w-full transition-all outline-none"
                                          placeholder="Nome do Produto"
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* CATEGORY SELECTOR */}
                                  <td className="p-4 text-center">
                                    <select 
                                      value={p.category} 
                                      onChange={(e) => {
                                        updateProduct(p.id, { category: e.target.value });
                                        showToast(`Categoria de "${p.name}" alterada para ${e.target.value}`);
                                      }}
                                      className="h-9 w-full max-w-[130px] bg-zinc-900 border border-line-strong rounded-lg px-2 text-xs font-bold text-gray-300 focus:border-gold outline-none cursor-pointer"
                                    >
                                      <option value="Celular">Celular</option>
                                      <option value="Eletrônico">Eletrônico</option>
                                      <option value="Hardware">Hardware</option>
                                      <option value="Acessório">Acessório</option>
                                    </select>
                                  </td>

                                  {/* COST PRICE INLINE */}
                                  <td className="p-4 text-center">
                                    <div className="flex items-center gap-1 bg-zinc-950 border border-line-strong rounded-lg px-2.5 h-9 w-28 mx-auto focus-within:border-amber-500 transition-colors" title="Clique para editar o custo unitário">
                                      <span className="text-[10px] text-amber-400 font-bold">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        defaultValue={p.cost !== undefined ? p.cost : 0} 
                                        onBlur={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          if (val !== p.cost) {
                                            updateProduct(p.id, { cost: val });
                                            showToast(`Custo de "${p.name}" atualizado com sucesso!`);
                                          }
                                        }}
                                        className="bg-transparent text-xs font-black text-white outline-none w-full min-w-0"
                                      />
                                    </div>
                                  </td>

                                  {/* TOTAL INVESTED IN THIS ITEM */}
                                  <td className="p-4 text-center">
                                    <div className="inline-flex flex-col items-center justify-center">
                                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-black text-xs">
                                        {money((Number(p.cost) || 0) * qty)}
                                      </span>
                                      <span className="text-[8px] text-zinc-500 uppercase font-bold mt-0.5">
                                        {qty}x de {money(Number(p.cost) || 0)}
                                      </span>
                                    </div>
                                  </td>

                                  {/* SALE PRICE INLINE */}
                                  <td className="p-4 text-center">
                                    <div className="flex items-center gap-1 bg-zinc-950 border border-[rgba(255,215,0,0.15)] rounded-lg px-2.5 h-9 w-28 mx-auto focus-within:border-gold transition-colors">
                                      <span className="text-[10px] text-gold font-bold">R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        defaultValue={p.sale} 
                                        onBlur={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          if (val !== p.sale) {
                                            updateProduct(p.id, { sale: val });
                                            showToast(`Preço de "${p.name}" atualizado.`);
                                          }
                                        }}
                                        className="bg-transparent text-xs font-black text-gold outline-none w-full min-w-0"
                                      />
                                    </div>
                                  </td>

                                  {/* STOCK QUANTITY MULTI COUNTER */}
                                  <td className="p-4">
                                    <div className="flex items-center justify-center gap-1.5 w-36 mx-auto">
                                      <button 
                                        onClick={handleDecrement}
                                        disabled={qty <= 0}
                                        className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] border border-line-strong hover:bg-[rgba(239,68,68,0.1)] hover:border-red-500/30 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                                        title="Diminuir Estoque"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <input 
                                        type="number"
                                        value={qty}
                                        onChange={(e) => handleQtyChange(e.target.value)}
                                        onBlur={() => showToast(`Estoque de "${p.name}" atualizado.`)}
                                        className="w-12 h-8 bg-black/60 border border-line-strong rounded-lg text-center font-black text-xs text-white focus:border-gold focus:outline-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button 
                                        onClick={handleIncrement}
                                        className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] border border-line-strong hover:bg-[rgba(57,255,20,0.1)] hover:border-green-neon/30 text-gray-400 hover:text-green-neon transition-all cursor-pointer flex items-center justify-center shrink-0"
                                        title="Aumentar Estoque"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  </td>

                                  {/* STATE DYNAMIC BADGE */}
                                  <td className="p-4 text-center">
                                    {isVendido ? (
                                      <span className="px-2.5 py-1 rounded-[8px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm">
                                        Vendido
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-[8px] text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-green-soft text-green-neon border border-[rgba(57,255,20,0.2)] shadow-sm">
                                        Disponível
                                      </span>
                                    )}
                                  </td>

                                  {/* QUICK ACTIONS ROW */}
                                  <td className="p-4 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => {
                                          setActiveView('sales');
                                          setShowSaleForm(true);
                                          setSaleToEdit(null);
                                        }}
                                        className="h-8 px-2.5 rounded-lg border border-gold/30 bg-gold/10 hover:bg-gold hover:text-black text-gold flex items-center gap-1.5 transition-all cursor-pointer active:scale-90 text-[9px] font-black uppercase tracking-wider"
                                        title="Registrar Venda Deste Produto"
                                      >
                                        <ShoppingBag size={12} />
                                        <span>Vender</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setProductToEdit(p);
                                          setShowAddProduct(true);
                                          setPreviewPhoto(p.photo || null);
                                        }}
                                        className="w-8 h-8 rounded-lg border border-line-strong text-gray-400 hover:text-gold hover:border-gold/30 flex items-center justify-center transition-all cursor-pointer active:scale-90 bg-black"
                                        title="Editar Detalhes"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openConfirm(
                                            'Excluir Produto',
                                            `Deseja realmente remover o modelo "${p.name}" do inventário comercial?`,
                                            () => {
                                              deleteProduct(p.id);
                                              showToast('Produto removido do inventário.');
                                            }
                                          );
                                        }}
                                        className="w-8 h-8 rounded-lg border border-line-strong text-gray-500 hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-90 bg-black"
                                        title="Remover"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'sales' && (
                <div className="flex flex-col gap-8 animate-view-enter">
                  {showSaleForm ? (() => {
                    const existingFirstInst = saleToEdit ? installments.find(i => i.saleId === saleToEdit.id && i.number === 1) : null;
                    const defaultFirstDue = existingFirstInst?.dueDate 
                      ? getLocalDateString(existingFirstInst.dueDate) 
                      : (saleToEdit?.date ? getLocalDateString(saleToEdit.date) : getFutureLocalDateString(30));
                    const currentSeller = saleToEdit?.sellerName || getSystemSellerName(settings, saleToEdit);

                    return (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 sm:p-10 glass-card max-w-3xl mx-auto w-full border border-[rgba(255,215,0,0.2)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      <div className="text-center mb-8 sm:mb-10">
                         <h2 className="text-xl sm:text-3xl font-black italic uppercase text-white tracking-tighter">{saleToEdit ? 'Editar Contrato / Venda' : 'Nova Venda & Contrato'}</h2>
                         <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Preencha os dados da operação comercial</p>
                      </div>
                      <form key={saleToEdit ? `edit-${saleToEdit.id}` : 'new-sale'} className="flex flex-col gap-4 sm:gap-6" onSubmit={async (e) => { 
                        e.preventDefault(); 
                        const f = e.target as any; 

                        const resolvedProductId = saleToEdit ? (saleToEdit.productId || f.productId?.value || '') : (f.productId?.value || '');
                        const parsedCost = f.costPrice?.value !== '' && !isNaN(Number(f.costPrice?.value)) 
                          ? Number(f.costPrice.value) 
                          : (saleToEdit?.costPrice !== undefined ? saleToEdit.costPrice : 0);
                        const parsedTotal = f.manualSalePrice?.value !== '' && !isNaN(Number(f.manualSalePrice?.value))
                          ? Number(f.manualSalePrice.value)
                          : (saleToEdit?.total || 0);
                        const parsedDown = f.downPayment?.value !== '' && !isNaN(Number(f.downPayment?.value))
                          ? Number(f.downPayment.value)
                          : (saleToEdit?.downPayment || 0);
                        const parsedInst = f.installments?.value !== '' && !isNaN(Number(f.installments?.value))
                          ? Math.max(1, Number(f.installments.value))
                          : (saleToEdit?.installmentsCount || 12);
                        const parsedInterestRate = isInterestOnlyForm && f.interestRate?.value !== '' && !isNaN(Number(f.interestRate?.value))
                          ? Number(f.interestRate.value)
                          : (isInterestOnlyForm ? (Number(interestRateForm) || 0) : 0);

                        const saleData = { 
                          productId: resolvedProductId, 
                          sellerName: f.sellerName?.value ? f.sellerName.value.trim() : currentSeller,
                          client: (f.client?.value || saleToEdit?.client || '').trim(), 
                          clientPhone: (f.clientPhone?.value || saleToEdit?.clientPhone || '').trim(), 
                          clientCpf: (f.clientCpf?.value || saleToEdit?.clientCpf || '').trim(), 
                          clientAddress: (f.clientAddress?.value || saleToEdit?.clientAddress || '').trim(),
                          installments: parsedInst, 
                          saleDate: f.saleDate?.value || (saleToEdit?.date ? getLocalDateString(saleToEdit.date) : getLocalDateString()),
                          firstDueDate: f.firstDueDate?.value || defaultFirstDue, 
                          percentageAdjustment: 0, 
                          manualSalePrice: parsedTotal, 
                          downPayment: parsedDown,
                          isInterestOnly: isInterestOnlyForm,
                          interestRate: parsedInterestRate,
                          costPrice: parsedCost
                        };

                        if (saleToEdit) {
                          const ok = await updateSaleFull(saleToEdit.id, saleData);
                          if (ok) showToast('Contrato e venda atualizados com sucesso!');
                          else showToast('Erro ao atualizar contrato.', 'error');
                        } else {
                          const ok = await registerSale(saleData);
                          if (ok) showToast('Venda e contrato cadastrados com sucesso!');
                          else showToast('Erro ao cadastrar venda.', 'error');
                        }
                        setShowSaleForm(false); 
                        setSaleToEdit(null);
                      }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Escolha o Ativo</label>
                             <select 
                               name="productId" 
                               required={!saleToEdit}
                               disabled={!!saleToEdit}
                               defaultValue={saleToEdit?.productId || ""}
                               className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 font-bold outline-none focus:border-gold transition-all text-xs sm:text-sm disabled:opacity-50"
                             >
                               <option value="">Selecione...</option>
                               {saleToEdit && <option value={saleToEdit.productId}>{saleToEdit.productName}</option>}
                               {products.filter(p => p.status === 'Disponivel').map(p => <option key={p.id} value={p.id} className="bg-black">{p.name} ({money(p.sale)})</option>)}
                             </select>
                          </div>

                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] sm:text-[10px] font-black text-gold uppercase ml-3">Vendedor no Contrato (Usuário do Sistema)</label>
                             <input 
                               name="sellerName" 
                               required 
                               defaultValue={currentSeller} 
                               placeholder="Nome do operador / vendedor" 
                               className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm text-gold" 
                             />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Nome do Comprador</label>
                              <input name="client" required defaultValue={saleToEdit?.client || ''} placeholder="Ex: João da Silva" className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm" />
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-2">
                                 <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">CPF</label>
                                 <input name="clientCpf" required defaultValue={saleToEdit?.clientCpf || ''} placeholder="000.000.000-00" className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm" />
                              </div>
                              <div className="flex flex-col gap-2">
                                 <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Contato</label>
                                 <input name="clientPhone" required defaultValue={saleToEdit?.clientPhone || ''} placeholder="(00) 00000-0000" className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm" />
                              </div>
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Endereço do Comprador</label>
                           <input name="clientAddress" defaultValue={saleToEdit?.clientAddress || ''} placeholder="Ex: Av. Paulista, 1000, Apto 12 - São Paulo / SP" className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm" />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Preço de Custo</label>
                              <div className="relative">
                                 <input name="costPrice" type="number" step="0.01" defaultValue={saleToEdit?.costPrice !== undefined ? saleToEdit.costPrice : ''} placeholder="0,00" className="w-full h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 pl-10 sm:pl-12 outline-none focus:border-gold transition-all font-black text-zinc-300 italic text-xs sm:text-sm" />
                                 <span className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Preço Final</label>
                              <div className="relative">
                                 <input name="manualSalePrice" type="number" step="0.01" required defaultValue={saleToEdit ? (saleToEdit.total) : ''} placeholder="0,00" className="w-full h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 pl-10 sm:pl-12 outline-none focus:border-gold transition-all font-black text-gold italic text-xs sm:text-sm" />
                                 <span className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-gold opacity-50 font-black italic">$</span>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Entrada</label>
                              <div className="relative">
                                 <input name="downPayment" type="number" step="0.01" defaultValue={saleToEdit?.downPayment || "0"} className="w-full h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 pl-10 sm:pl-12 outline-none focus:border-gold transition-all font-black text-white text-xs sm:text-sm" />
                                 <span className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Parcelas</label>
                              <input name="installments" type="number" defaultValue={saleToEdit?.installmentsCount || "12"} className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-black text-xs sm:text-sm" />
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gold uppercase ml-3">Data da Compra</label>
                              <input name="saleDate" type="date" required defaultValue={saleToEdit?.date ? getLocalDateString(saleToEdit.date) : getLocalDateString()} className="h-12 sm:h-14 bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.3)] rounded-xl sm:rounded-2xl px-4 sm:px-5 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm text-gold" />
                           </div>
                           <div className="flex flex-col gap-2">
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">1º Vencimento</label>
                              <input name="firstDueDate" type="date" required defaultValue={defaultFirstDue} className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-4 sm:px-5 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm" />
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Modalidade de Recebimento</label>
                           <input name="percentage" className="hidden" />
                           <select 
                             value={isInterestOnlyForm ? "interest_only" : "standard"}
                             onChange={(e) => setIsInterestOnlyForm(e.target.value === "interest_only")}
                             className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 font-bold outline-none focus:border-gold transition-all text-xs sm:text-sm cursor-pointer"
                           >
                             <option value="standard" className="bg-black">Venda Padrão (Amortização normal)</option>
                             <option value="interest_only" className="bg-black text-gold font-bold">Venda por Juros (Pagar somente os juros do total)</option>
                           </select>

                           {isInterestOnlyForm && (
                             <div className="flex flex-col gap-2 mt-4 animate-view-enter">
                               <label className="text-[9px] sm:text-[10px] font-black text-gold uppercase ml-3">Taxa de Juros Mensal (%)</label>
                               <div className="relative">
                                 <input 
                                   name="interestRate" 
                                   type="number" 
                                   step="0.01" 
                                   required 
                                   value={interestRateForm} 
                                   onChange={(e) => setInterestRateForm(e.target.value)} 
                                   placeholder="0,00" 
                                   className="w-full h-12 sm:h-14 bg-[rgba(255,215,0,0.02)] border border-[rgba(255,215,0,0.2)] rounded-xl sm:rounded-2xl px-5 sm:px-6 pl-10 sm:pl-12 outline-none focus:border-gold transition-all font-black text-gold italic text-xs sm:text-sm" 
                                 />
                                 <span className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-gold opacity-50 font-black italic">%</span>
                               </div>
                               <span className="text-[10px] text-gray-500 font-bold uppercase ml-3 mt-1 leading-relaxed">
                                 As parcelas do contrato serão equivalentes aos juros calculados sobre o preço do ativo, sem quitação do principal.
                               </span>
                             </div>
                           )}
                        </div>

                        <div className="flex flex-col gap-3 mt-4 sm:mt-6">
                           <button type="submit" className="h-14 sm:h-16 bg-gold text-black rounded-xl sm:rounded-[24px] font-black uppercase text-[10px] sm:text-xs shadow-[0_10px_30px_#ffd70033] hover:brightness-110 active:scale-95 transition-all">
                              {saleToEdit ? 'Atualizar Registro' : 'Confirmar Venda'}
                           </button>
                           <button type="button" onClick={() => { setShowSaleForm(false); setSaleToEdit(null); }} className="h-10 text-gray-500 font-black uppercase text-[9px] sm:text-[10px] tracking-widest">
                              Cancelar Operação
                           </button>
                        </div>
                      </form>
                    </motion.div>
                    );
                  })() : (
                    <div className="flex flex-col gap-4 sm:gap-8 animate-view-enter">
                      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-1">
                        <div className="w-full lg:w-auto">
                           <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white italic uppercase">Gestão de Recebíveis</h2>
                           <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Contratos, Vencimentos e Quitações</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                           <button 
                              onClick={() => handleGlobalQuickPaymentClick()} 
                              className="h-11 px-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-neon rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                           >
                              <DollarSign size={15} />
                              <span className="hidden sm:inline">Quitar Parcela</span>
                           </button>
                           <button 
                              onClick={() => handleGlobalAdvanceClick()} 
                              className="h-11 px-4 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                           >
                              <Zap size={15} />
                              <span>Antecipar</span>
                           </button>
                           <button 
                              onClick={handleDownloadReportPDF}
                              className="h-11 px-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                           >
                              <FileText size={15} />
                              <span className="hidden sm:inline">PDF</span>
                           </button>
                           <button onClick={() => { setShowSaleForm(true); setSaleToEdit(null); }} className="h-11 px-6 bg-white text-black hover:bg-gold transition-all rounded-xl sm:rounded-[14px] font-black uppercase text-[10px] sm:text-xs flex items-center gap-2 shadow-xl shrink-0 cursor-pointer">
                              <ShoppingBag size={18} />
                              Nova Operação
                           </button>
                        </div>
                      </div>

                      {/* Segmento de Status de Filtro */}
                      <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-4">
                         <div className="flex bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl p-1 gap-1">
                            <button 
                               type="button"
                               onClick={() => setFilterStatus('Todos')}
                               className={`h-9 px-5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${filterStatus === 'Todos' ? 'bg-gold text-black font-extrabold shadow-lg shadow-gold/10' : 'text-gray-400 hover:text-white'}`}
                            >
                               Ativos ({
                                  sales.filter(s => {
                                     const sInsts = installments.filter(i => i.saleId === s.id);
                                     return !(sInsts.length > 0 && sInsts.every(i => i.status === 'Pago'));
                                  }).length
                               })
                            </button>
                            <button 
                               type="button"
                               onClick={() => setFilterStatus('Atrasados')}
                               className={`h-9 px-5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${filterStatus === 'Atrasados' ? 'bg-red-500 text-white font-extrabold shadow-lg shadow-red-500/20' : 'text-red-400 hover:bg-red-500/5'}`}
                            >
                               Atrasados ({
                                  sales.filter(s => {
                                     const sInsts = installments.filter(i => i.saleId === s.id);
                                     if (sInsts.length > 0 && sInsts.every(i => i.status === 'Pago')) return false;
                                     const pendingInsts = sInsts.filter(i => i.status === 'Pendente');
                                     return pendingInsts.some(i => {
                                        const d = new Date(i.dueDate);
                                        d.setHours(0,0,0,0);
                                        return d.getTime() < todayTime.getTime();
                                     });
                                  }).length
                               })
                            </button>
                            <button 
                               type="button"
                               onClick={() => setFilterStatus('Hoje')}
                               className={`h-9 px-5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${filterStatus === 'Hoje' ? 'bg-purple-500 text-white font-extrabold shadow-lg shadow-purple-500/20' : 'text-purple-400 hover:bg-purple-500/5'}`}
                            >
                               Vence Hoje ({
                                  sales.filter(s => {
                                     const sInsts = installments.filter(i => i.saleId === s.id);
                                     if (sInsts.length > 0 && sInsts.every(i => i.status === 'Pago')) return false;
                                     const pendingInsts = sInsts.filter(i => i.status === 'Pendente');
                                     return pendingInsts.some(i => {
                                        const d = new Date(i.dueDate);
                                        d.setHours(0,0,0,0);
                                        return d.getTime() === todayTime.getTime();
                                     });
                                  }).length
                               })
                            </button>
                         </div>
                         
                         {searchTerm && (
                            <div className="text-gray-400 text-[10px] sm:text-xs font-black uppercase">
                               Busca por: <span className="text-gold italic">"{searchTerm}"</span>
                            </div>
                         )}
                      </div>

                      {filteredSales.length === 0 ? (
                        <div className={`glass-card p-20 border flex flex-col items-center justify-center text-center gap-6 animate-pulse ${filterStatus === 'Atrasados' ? 'border-red-500/30 bg-red-500/5' : filterStatus === 'Hoje' ? 'border-purple-500/30 bg-purple-500/5' : 'border-line bg-black/40'}`}>
                           <div className={`w-20 h-20 rounded-3xl grid place-items-center mb-2 ${filterStatus === 'Atrasados' ? 'bg-red-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.3)]' : filterStatus === 'Hoje' ? 'bg-purple-500 text-white shadow-[0_0_50px_rgba(168,85,247,0.3)]' : 'bg-gold/10 text-gold border border-gold/20'}`}>
                              {filterStatus === 'Atrasados' ? <AlertCircle size={40} /> : filterStatus === 'Hoje' ? <Calendar size={40} /> : <CheckCircle2 size={40} />}
                           </div>
                           <h3 className="text-3xl font-black italic uppercase text-white tracking-widest">
                             {filterStatus === 'Atrasados' 
                               ? 'Nenhum Contrato em Atraso' 
                               : filterStatus === 'Hoje' 
                                 ? 'Sem Vencimentos Programados' 
                                 : 'Nenhum Contrato Ativo'}
                           </h3>
                           <p className="max-w-md text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] leading-relaxed">
                             {filterStatus === 'Atrasados' 
                               ? 'Sua carteira de recebíveis está 100% em conformidade técnica. Não foram localizados registros de inadimplência pendente.' 
                               : filterStatus === 'Hoje' 
                                 ? 'Não existem ciclos operacionais com vencimento datado para o presente momento.'
                                 : 'Todos os contratos foram quitados integralmente e os cadastros dos clientes permanecem salvos na aba Clientes.'}
                           </p>
                           {filterStatus !== 'Todos' && (
                             <button onClick={() => setFilterStatus('Todos')} className="h-12 px-10 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                                Ver Todos os Contratos Ativos
                             </button>
                           )}
                        </div>
                      ) : (
                        <div className="glass-card border border-line-strong overflow-hidden bg-black/40 backdrop-blur-md">
                           <div className="overflow-x-auto custom-scrollbar">
                              <table className="w-full border-collapse text-left min-w-[1000px]">
                                 <thead>
                                    <tr className="border-b border-line-strong bg-black/80 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] h-14">
                                       <th className="p-4 pl-6">Comprador / Operação</th>
                                       <th className="p-4 text-center">Ativo Objeto</th>
                                       <th className="p-4 text-center">Valor Total</th>
                                       <th className="p-4 text-center">Margem Lucro</th>
                                       <th className="p-4 text-center">Quitação / Ciclos</th>
                                       <th className="p-4 text-center">Estado</th>
                                       <th className="p-4 pr-6 text-right w-64">Ações</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-gray-300">
                                    {filteredSales.map(sale => {
                                       const sInstallments = installments.filter(i => i.saleId === sale.id);
                                       const paidCount = sInstallments.filter(i => i.status === 'Pago').length;
                                       const totalCount = sale.installmentsCount;
                                       const progressPercent = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
                                       const isExpanded = expandedSaleId === sale.id;
                                       
                                       return (
                                          <Fragment key={sale.id}>
                                             <tr className="hover:bg-white/[0.02] transition-colors group/row h-20">
                                                
                                                {/* COMPRADOR */}
                                                <td className="p-4 pl-6 cursor-pointer" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                                                   <div className="flex items-center gap-3">
                                                      <div className="w-10 h-10 rounded-xl bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center font-black italic shadow-inner shrink-0 group-hover/row:bg-[rgba(255,215,0,0.1)] transition-colors">
                                                         {sale.client.charAt(0).toUpperCase()}
                                                      </div>
                                                      <div className="flex flex-col">
                                                         <strong className="text-white font-bold block text-sm uppercase truncate max-w-[200px]">{sale.client}</strong>
                                                         <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">ID: {sale.id.substring(0, 8)}</span>
                                                      </div>
                                                   </div>
                                                </td>

                                                {/* ATIVO */}
                                                <td className="p-4 text-center cursor-pointer" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                                                   <span className="text-xs font-bold text-gray-300 uppercase block">{sale.productName}</span>
                                                   <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider block mt-0.5">Venda: {formatLocalDateBR(sale.date || sale.createdAt)}</span>
                                                </td>

                                                {/* VALOR TOTAL */}
                                                <td className="p-4 text-center font-bold cursor-pointer" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                                                   <div className="flex flex-col items-center">
                                                      <strong className="text-white text-sm font-black tracking-wide">{money(sale.total)}</strong>
                                                      {sale.isInterestOnly ? (
                                                         <span className="px-1.5 py-0.5 rounded bg-[rgba(255,190,0,0.15)] text-gold border border-[rgba(255,190,0,0.25)] text-[8px] font-black uppercase tracking-wider mt-1.5">
                                                            Apenas Juros ({sale.interestRate}% a.m.)
                                                         </span>
                                                      ) : (
                                                         <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                                            {sale.installmentsCount}x de {money(sale.installmentValue)}
                                                         </span>
                                                      )}
                                                   </div>
                                                </td>

                                                {/* MARGEM LUCRO */}
                                                <td className="p-4 text-center cursor-pointer" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                                                   <strong className="text-green-neon text-sm font-bold block">+{money(sale.profit)}</strong>
                                                   <span className="text-[8px] text-gray-655 font-black uppercase tracking-widest block mt-0.5">ROI Esperado</span>
                                                </td>

                                                {/* QUITAÇÃO */}
                                                <td className="p-4 cursor-pointer" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                                                   <div className="flex flex-col items-center max-w-[150px] mx-auto w-full">
                                                      <div className="flex items-center gap-1.5 mb-1.5 justify-between w-full">
                                                         <span className="text-[9px] text-zinc-500 font-bold uppercase">Ciclos:</span>
                                                         <span className="text-[9px] text-gray-400 font-extrabold uppercase">{paidCount}/{totalCount} ({Math.round(progressPercent)}%)</span>
                                                      </div>
                                                      <div className="h-1.5 w-full bg-[rgba(255,255,255,0.05)] rounded-full border border-line-strong overflow-hidden">
                                                         <div className="h-full bg-gold transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                                                      </div>
                                                   </div>
                                                </td>

                                                {/* ESTADO */}
                                                <td className="p-4 text-center cursor-pointer" onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}>
                                                   <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line-strong bg-black/40">
                                                      <span className={`w-1.5 h-1.5 rounded-full ${sale.status === 'Ativa' ? 'bg-gold animate-pulse' : 'bg-green-neon'}`} />
                                                      <span className={`text-[9px] font-black uppercase tracking-widest ${sale.status === 'Ativa' ? 'text-gold' : 'text-green-neon'}`}>
                                                         {sale.status === 'Ativa' ? 'Ativa' : 'Liquidada'}
                                                      </span>
                                                   </div>
                                                </td>

                                                {/* AÇÕES COMPLETA */}
                                                <td className="p-4 pr-6 text-right">
                                                   <div className="flex items-center justify-end gap-1.5">
                                                      <button 
                                                         onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                                                         className={`h-8 px-2.5 rounded-lg border transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider cursor-pointer active:scale-90 shrink-0 ${
                                                            isExpanded 
                                                               ? 'bg-gold text-black border-gold font-extrabold shadow-lg shadow-gold/15' 
                                                               : 'border-line bg-white/5 text-gray-400 hover:text-white hover:border-white'
                                                         }`}
                                                         title={isExpanded ? "Ocultar Parcelas" : "Receber / Ver Parcelas"}
                                                      >
                                                         <DollarSign size={11} />
                                                         <span>Parcelas</span>
                                                         <ChevronDown size={11} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                      </button>

                                                      {installments.some(i => i.saleId === sale.id && i.status === 'Pendente') && (
                                                         <button
                                                           onClick={() => openAdvanceModal(sale)}
                                                           className="h-8 px-2.5 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold hover:text-black text-gold text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer active:scale-90 shrink-0"
                                                           title="Antecipar Parcelas com Desconto"
                                                         >
                                                           <Zap size={11} className="fill-gold/20" />
                                                           <span>Antecipar</span>
                                                         </button>
                                                      )}

                                                      {sale.isInterestOnly && sale.status === 'Ativa' && (
                                                         <button 
                                                            onClick={() => {
                                                               const pending = installments.find(i => i.saleId === sale.id && i.status === 'Pendente');
                                                               if (pending) {
                                                                  setSelectedInstallmentForPayment(pending);
                                                                  setPaymentType('amortization');
                                                                  setAmortizationAmount('');
                                                               } else {
                                                                  showToast('Não há parcelas pendentes para amortizar nesta venda.', 'error');
                                                               }
                                                            }}
                                                            className="h-8 w-8 rounded-lg border border-[rgba(255,190,0,0.3)] bg-[rgba(255,190,0,0.05)] text-amber-200 hover:bg-gold hover:text-black hover:border-gold transition-all grid place-items-center cursor-pointer active:scale-90"
                                                            title="Amortizar Valor"
                                                         >
                                                            <Minus size={13} />
                                                         </button>
                                                      )}
                                                      <button 
                                                         onClick={() => setSelectedSaleForContract(sale)} 
                                                         className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-gold hover:border-gold transition-all grid place-items-center active:scale-95 cursor-pointer"
                                                         title="Ver Contrato"
                                                      >
                                                         <FileText size={13} />
                                                      </button>
                                                      <button 
                                                         onClick={() => handleDownloadContract(sale)} 
                                                         className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-green-neon hover:border-green-neon transition-all grid place-items-center active:scale-95 cursor-pointer"
                                                         title="Salvar PDF"
                                                      >
                                                         <Download size={13} />
                                                      </button>
                                                      <button 
                                                         onClick={() => {
                                                            setSaleToEdit(sale);
                                                            setShowSaleForm(true);
                                                            setActiveView('sales');
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                         }}
                                                         className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-gold hover:border-gold transition-all grid place-items-center active:scale-95 cursor-pointer"
                                                         title="Editar Contrato"
                                                      >
                                                         <Pencil size={13} />
                                                      </button>
                                                      <button 
                                                         onClick={() => openConfirm(
                                                            'Excluir Contrato Permanentemente', 
                                                            `Deseja realmente excluir o contrato de ${sale.client} (${money(sale.total)}) e todas as suas parcelas? Esta ação é irreversível.`, 
                                                            async () => {
                                                               const ok = await deleteSale(sale.id);
                                                               if (ok) showToast('Contrato excluído com sucesso!');
                                                            }
                                                         )} 
                                                         className="h-8 w-8 rounded-lg border border-line bg-white/5 text-gray-400 hover:text-red-500 hover:border-red-500 transition-all grid place-items-center active:scale-95 cursor-pointer"
                                                         title="Excluir Contrato"
                                                      >
                                                         <Trash2 size={13} />
                                                      </button>
                                                   </div>
                                                </td>

                                             </tr>

                                             {isExpanded && (
                                                <tr className="bg-black/50 border-b border-line-strong">
                                                   <td colSpan={7} className="p-6">
                                                      <div className="flex flex-col gap-6 animate-view-enter">
                                                         
                                                         {/* Cronograma de Liquidação */}
                                                         <div className="flex flex-col gap-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-l-2 border-gold pl-4 py-1 gap-2">
                                                               <div>
                                                                  <h4 className="text-[11px] font-black uppercase text-gray-300 tracking-widest flex items-center gap-2">
                                                                    Cronograma de Liquidação
                                                                    {sInstallments.some(i => i.status === 'Pendente') && (
                                                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[8px] font-extrabold uppercase border border-amber-500/20">
                                                                        {sInstallments.filter(i => i.status === 'Pendente').length} pendente(s)
                                                                      </span>
                                                                    )}
                                                                  </h4>
                                                                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Clique em "Quitar" para receber a parcela ou em "Antecipar Parcelas" para aplicar desconto</p>
                                                               </div>
                                                               {sInstallments.some(i => i.status === 'Pendente') && (
                                                                 <button
                                                                   type="button"
                                                                   onClick={() => openAdvanceModal(sale)}
                                                                   className="self-start sm:self-auto h-8 px-4 bg-gradient-to-r from-amber-500/20 to-gold/30 hover:from-amber-500/40 hover:to-gold/50 border border-gold/40 text-gold hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                                                                 >
                                                                   <Zap size={13} className="text-gold fill-gold/20" />
                                                                   Antecipar Parcelas Selecionadas
                                                                 </button>
                                                               )}
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                                               {sInstallments.sort((a,b) => a.number - b.number).map(inst => {
                                                                  const isPaid = inst.status === 'Pago';
                                                                  const dueDateObj = parseDateToMidnight(inst.dueDate);
                                                                  
                                                                  const isOverdue = !isPaid && dueDateObj.getTime() < todayTime.getTime();
                                                                  const isDueToday = !isPaid && dueDateObj.getTime() === todayTime.getTime();

                                                                  let cardStyles = 'border-line-strong bg-black/30 hover:border-[rgba(255,215,0,0.3)]';
                                                                  let dotStyle = 'bg-[rgba(255,215,0,0.4)] animate-pulse';
                                                                  let cycleLabel = `Ciclo ${inst.number}`;
                                                                  let labelStyle = 'text-gray-500';

                                                                  if (isPaid) {
                                                                     cardStyles = 'border-[rgba(57,255,20,0.2)] bg-[rgba(57,255,20,0.05)]';
                                                                     dotStyle = 'bg-green-neon';
                                                                     labelStyle = 'text-green-500';
                                                                  } else if (isOverdue) {
                                                                     cardStyles = 'border-red-500/30 bg-red-500/5 hover:border-red-500/50';
                                                                     dotStyle = 'bg-red-500 animate-pulse';
                                                                     cycleLabel = `Ciclo ${inst.number} (Atrasado)`;
                                                                     labelStyle = 'text-red-400';
                                                                  } else if (isDueToday) {
                                                                     cardStyles = 'border-purple-500/40 bg-purple-500/5 hover:border-purple-500/60';
                                                                     dotStyle = 'bg-purple-500 animate-bounce';
                                                                     cycleLabel = `Ciclo ${inst.number} (Vence Hoje)`;
                                                                     labelStyle = 'text-purple-400';
                                                                  }

                                                                  return (
                                                                     <div 
                                                                        key={inst.id}
                                                                        className={`p-4 rounded-xl border transition-all ${cardStyles} flex flex-col gap-3 relative group/inst`}
                                                                     >
                                                                        <div className="flex items-center justify-between">
                                                                           <span className={`text-[10px] font-black uppercase tracking-tighter ${labelStyle}`}>{cycleLabel}</span>
                                                                           <div className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                                                                        </div>
                                                                        <div>
                                                                           <p className="text-[13px] font-bold text-white tracking-wide">{money(inst.value)}</p>
                                                                           <p className="text-[9px] font-black text-gray-500 uppercase mt-0.5">{formatLocalDateBR(inst.dueDate)}</p>
                                                                        </div>
                                                                        <div className="absolute inset-0 bg-[rgba(0,0,0,0.85)] flex items-center justify-center p-3 opacity-0 group-hover/inst:opacity-100 transition-all rounded-xl backdrop-blur-sm">
                                                                           {inst.status === 'Pendente' && (<>
                                                                              <button 
                                                                                 onClick={() => setSelectedInstallmentForPayment(inst)}
                                                                                 className="hidden" style={{ display: 'none' }} />
                                                                                  <div className="flex flex-col gap-1.5 w-full">
                                                                                     <button 
                                                                                        onClick={() => setSelectedInstallmentForPayment(inst)}
                                                                                        className="w-full py-1.5 bg-gold text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl active:scale-95 px-1 font-black cursor-pointer leading-tight text-center"
                                                                                     >
                                                                                        Quitar
                                                                                     </button>
                                                                                     <button 
                                                                                        onClick={() => shareInstallmentWhatsApp(sale, inst)}
                                                                                        className="w-full py-1.5 bg-[#25D366] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl active:scale-95 px-1 font-black flex items-center justify-center gap-1 cursor-pointer leading-tight animate-view-enter"
                                                                                     >
                                                                                        <MessageCircle size={10} />
                                                                                        Cobrar
                                                                                     </button>
                                                                                  </div>
                                                                                  <button className="hidden-second" style={{ display: 'none' }}></button></>)}{false && (<button 
                                                                              >
                                                                                 Quitar
                                                                              </button>
                                                                           )}
                                                                           {inst.status === 'Pago' && (
                                                                              <button 
                                                                                 onClick={() => setSelectedInstallmentForReceipt(inst)}
                                                                                 className="w-full h-full bg-[rgba(255,255,255,0.1)] text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-[rgba(255,255,255,0.1)] cursor-pointer font-bold"
                                                                              >
                                                                                 Recibo
                                                                              </button>
                                                                           )}
                                                                        </div>
                                                                     </div>
                                                                  );
                                                               })}
                                                            </div>

                                                            <div className="flex justify-end gap-3 mt-2 pr-1">
                                                               <button 
                                                                  onClick={() => shareSaleTableWhatsApp(sale)}
                                                                  className="h-9 px-4 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-green-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all flex items-center gap-1.5 cursor-pointer"
                                                               >
                                                                  <MessageCircle size={13} />
                                                                  Compartilhar WhatsApp
                                                               </button>
                                                            </div>
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
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeView === 'transactions' && (
                <div className="flex flex-col gap-4 sm:gap-8 animate-view-enter">
                  {/* Top Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[20px] sm:rounded-[24px] p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-[rgba(255,255,255,0.08)] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block font-sans">Acumulado Entradas</span>
                        <div className="w-8 h-8 rounded-lg bg-[rgba(255,215,0,0.05)] text-gold flex items-center justify-center border border-[rgba(255,215,0,0.1)]">
                          <Wallet size={16} />
                        </div>
                      </div>
                      <div>
                        <strong className="text-2xl sm:text-3xl font-bold text-white tracking-tight block font-sans">
                          {money(transactions.filter(t => t.type === 'entrada').reduce((acc, t) => acc + t.value, 0))}
                        </strong>
                        <span className="text-[10px] text-gray-500 font-medium block mt-1">Somas de valores de entrada em caixa</span>
                      </div>
                    </div>

                    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[20px] sm:rounded-[24px] p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-[rgba(255,255,255,0.08)] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block font-sans">Acumulado Parcelas</span>
                        <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.05)] text-green-500 flex items-center justify-center border border-[rgba(34,197,94,0.1)]">
                          <DollarSign size={16} />
                        </div>
                      </div>
                      <div>
                        <strong className="text-2xl sm:text-3xl font-bold text-white tracking-tight block font-sans">
                          {money(transactions.filter(t => t.type === 'parcela').reduce((acc, t) => acc + t.value, 0))}
                        </strong>
                        <span className="text-[10px] text-gray-500 font-medium block mt-1">Somas de parcelas recebidas liquidadas</span>
                      </div>
                    </div>

                    <div className="bg-[rgba(255,215,0,0.02)] border border-[rgba(255,215,0,0.08)] rounded-[20px] sm:rounded-[24px] p-6 flex flex-col gap-4 relative overflow-hidden group hover:border-[rgba(255,215,0,0.15)] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gold/80 uppercase tracking-widest block font-sans">Total Transacionado</span>
                        <div className="w-8 h-8 rounded-lg bg-[rgba(255,215,0,0.05)] text-gold flex items-center justify-center border border-[rgba(255,215,0,0.15)]">
                          <BadgeDollarSign size={16} />
                        </div>
                      </div>
                      <div>
                        <strong className="text-2xl sm:text-3xl font-bold text-gold tracking-tight block font-sans">
                          {money(transactions.reduce((acc, t) => acc + t.value, 0))}
                        </strong>
                        <span className="text-[10px] text-gold/60 font-medium block mt-1">Fluxo total conciliado no sistema</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Lists Card */}
                  <div className="glass-card border border-[rgba(255,255,255,0.05)] rounded-2xl sm:rounded-[32px] p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider font-sans">Histórico de Fluxo</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Exibindo {filteredTransactions.length} de {transactions.length} transações registradas</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Type Toggle buttons */}
                        <div className="flex bg-[rgba(0,0,0,0.3)] p-1 rounded-xl border border-line-strong">
                          <button
                            onClick={() => setTxTypeFilter('all')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              txTypeFilter === 'all'
                                ? 'bg-gold text-black italic font-sans'
                                : 'text-gray-400 hover:text-white font-sans'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            onClick={() => setTxTypeFilter('entrada')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              txTypeFilter === 'entrada'
                                ? 'bg-gold text-black italic font-sans'
                                : 'text-gray-400 hover:text-white font-sans'
                            }`}
                          >
                            Entradas
                          </button>
                          <button
                            onClick={() => setTxTypeFilter('parcela')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              txTypeFilter === 'parcela'
                                ? 'bg-gold text-black italic font-sans'
                                : 'text-gray-400 hover:text-white font-sans'
                            }`}
                          >
                            Parcelas
                          </button>
                        </div>

                        {/* Payment Method Selector */}
                        <select
                          value={txMethodFilter}
                          onChange={(e) => setTxMethodFilter(e.target.value)}
                          className="h-10 bg-[rgba(0,0,0,0.3)] border border-line-strong rounded-xl px-4 text-[10px] font-black uppercase tracking-wider text-white outline-none focus:border-gold transition-all cursor-pointer font-sans"
                        >
                          <option value="all" className="bg-black text-white">Meio de Pago (Todos)</option>
                          <option value="Pix" className="bg-black text-white">Pix</option>
                          <option value="Cartão de Crédito" className="bg-black text-white">Cartão de Crédito</option>
                          <option value="Cartão de Débito" className="bg-black text-white">Cartão de Débito</option>
                          <option value="Dinheiro" className="bg-black text-white">Dinheiro</option>
                          <option value="Transferência" className="bg-black text-white">Transferência</option>
                        </select>
                      </div>
                    </div>

                    {/* Search Field */}
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
                      <input
                        type="text"
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        placeholder="Buscar por cliente, produto de referência, método ou ID da transação..."
                        className="w-full h-12 bg-[rgba(0,0,0,0.3)] border border-line-strong rounded-xl pl-12 pr-6 outline-none focus:border-gold transition-all text-sm placeholder:text-gray-600 text-white font-sans"
                      />
                    </div>

                    {/* Transactions List */}
                    {filteredTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center gap-4 bg-[rgba(0,0,0,0.2)] rounded-2xl border border-dashed border-line-strong">
                        <AlertCircle size={36} className="text-gray-600 animate-pulse" />
                        <div>
                          <p className="text-white font-bold uppercase text-xs tracking-wider font-sans">Nenhuma transação encontrada</p>
                          <p className="text-[10px] text-gray-500 uppercase mt-1 font-sans">Altere os filtros de busca para conferir outros resultados</p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-line-strong text-left">
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans">Cliente / ID</th>
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans">Tipo / Operação</th>
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans">Produto</th>
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans">Meio de Pago</th>
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans">Data & Hora</th>
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans text-right">Valor Recebido</th>
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTransactions.map((tx) => (
                              <tr key={tx.id} className="border-b border-line-strong/40 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                                <td className="p-4">
                                  <div className="flex flex-col">
                                    <strong className="text-white font-bold text-sm uppercase font-sans">{tx.client}</strong>
                                    <span className="text-[8px] text-gray-500 font-bold tracking-widest uppercase mt-0.5 font-sans">ID: {tx.id.substring(0, 8)}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider font-sans ${
                                    tx.type === 'entrada'
                                      ? 'bg-gold/10 border border-gold/25 text-gold'
                                      : 'bg-green-neon/10 border border-green-neon/25 text-green-neon'
                                  }`}>
                                    {tx.label}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="text-gray-300 text-xs font-semibold uppercase font-sans">{tx.productName}</span>
                                </td>
                                <td className="p-4">
                                  <span className="text-gray-400 text-xs font-medium font-sans">{tx.paymentMethod}</span>
                                </td>
                                <td className="p-4">
                                  <span className="text-gray-400 text-xs font-sans">
                                    {formatLocalDateBR(tx.date, { showTime: true })}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <strong className="text-green-neon text-base font-bold font-sans">
                                    + {money(tx.value)}
                                  </strong>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={getWhatsAppShareLink(tx)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-[#25D366] text-[9px] font-black uppercase tracking-widest transition-all font-sans"
                                  >
                                    <MessageCircle size={12} />
                                    <span>WhatsApp</span>
                                  </a>
                                  <button
                                    onClick={() => {
                                      setSelectedInstallmentForReceipt({
                                        id: tx.id,
                                        client: tx.client,
                                        value: tx.value,
                                        number: tx.installmentDetails?.number || 1,
                                        total: tx.installmentDetails?.total || 1,
                                        productName: tx.productName,
                                        paidAt: tx.date,
                                        paymentMethod: tx.paymentMethod,
                                        type: tx.type
                                      });
                                    }}
                                    className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/20 text-gold text-[9px] font-black uppercase tracking-widest transition-all font-sans cursor-pointer"
                                    title="Visualizar e Baixar Recibo PDF"
                                  >
                                    <FileText size={11} />
                                    <span>Recibo</span>
                                  </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeView === 'reports' && (
                <MonthlyInstallmentsReport
                  sales={sales}
                  activeSales={activeSales}
                  installments={installments}
                  closings={closings}
                  settings={settings}
                  money={money}
                  onPayInstallment={(inst) => setSelectedInstallmentForPayment(inst)}
                  onViewReceipt={(inst) => setSelectedInstallmentForReceipt(inst)}
                  onDownloadPDF={handleDownloadReportPDF}
                  onCloseRegister={closeMonthlyRegister}
                  onDeleteClosing={deleteClosing}
                  initialTab={reportsTab}
                  onTabChange={setReportsTab}
                  showToast={showToast}
                />
              )}

              {activeView === 'simulation' && (
                <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 sm:gap-10 animate-view-enter">
                  <div className="flex flex-col gap-4 sm:gap-6">
                    <div className="glass-card p-6 sm:p-10 flex flex-col gap-6 border border-[rgba(255,255,255,0.05)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block pointer-events-none">
                         <Calculator size={80} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                          <span className="text-[9px] font-black uppercase text-gold tracking-widest">Simulador Comercial</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tighter">Engenharia Financeira</h3>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Cálculo de Preço À Vista & Parcelamento</p>
                      </div>
                      
                      <div className="flex flex-col gap-4 sm:gap-5">
                        {/* Puxar Produto do Estoque */}
                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] sm:text-[10px] font-black uppercase text-gold/80 ml-2 tracking-widest flex items-center justify-between">
                             <span>Puxar do Estoque (Opcional)</span>
                             <span className="text-gray-500 font-normal">Auto-preenche</span>
                           </label>
                           <select 
                             value={simSelectedProductId}
                             onChange={(e) => handleSelectProductForSim(e.target.value)}
                             className="h-12 bg-black border border-line-strong rounded-xl px-4 font-bold text-xs sm:text-sm text-white outline-none focus:border-gold transition-all cursor-pointer"
                           >
                             <option value="">Digitar Manualmente...</option>
                             {products.map(p => (
                               <option key={p.id} value={p.id}>
                                 {p.name} — À Vista: {money(p.sale)} (Estoque: {p.quantity || 0})
                               </option>
                             ))}
                           </select>
                        </div>

                        {/* Nome do Produto */}
                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Nome do Ativo / Modelo</label>
                           <input 
                             type="text" 
                             value={simProductName} 
                             onChange={(e) => setSimProductName(e.target.value)} 
                             className="h-12 sm:h-14 bg-black border border-line-strong rounded-xl sm:rounded-2xl px-5 font-black text-sm text-white italic outline-none focus:border-gold transition-all" 
                             placeholder="Ex: iPhone 15 Pro Max 256GB" 
                           />
                        </div>
                        
                        {/* Valor de À Vista do Produto */}
                        <div className="flex flex-col gap-2 relative bg-gold/[0.03] border border-gold/20 rounded-2xl p-4 sm:p-5">
                           <div className="flex items-center justify-between mb-1">
                             <label className="text-[10px] sm:text-[11px] font-black uppercase text-gold tracking-widest flex items-center gap-1.5">
                               <DollarSign size={14} className="text-gold" />
                               Valor À Vista do Produto
                             </label>
                             <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Preço Base</span>
                           </div>
                           <div className="relative">
                             <input 
                               type="number" 
                               step="0.01"
                               value={simCashPrice || ''} 
                               onChange={(e) => handleSimCashPriceChange(Number(e.target.value))} 
                               className="w-full h-12 sm:h-14 bg-black/80 border border-gold/30 rounded-xl px-5 font-black text-lg sm:text-xl text-gold italic outline-none focus:border-gold transition-all" 
                               placeholder="0,00" 
                             />
                             <div className="absolute right-4 top-3 text-gold font-black opacity-40 italic text-xs sm:text-sm">BRL (À VISTA)</div>
                           </div>
                           <p className="text-[8px] sm:text-[9px] text-gray-500 font-semibold mt-1">Preço unitário com desconto para pagamento imediato.</p>
                        </div>

                        {/* Valor de Entrada & Saldo Financiado */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="flex flex-col gap-1.5">
                             <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Entrada (Opcional)</label>
                             <input 
                               type="number" 
                               step="0.01"
                               value={simDownPayment || ''} 
                               onChange={(e) => handleSimDownPaymentChange(Number(e.target.value))} 
                               className="h-12 bg-black border border-line-strong rounded-xl px-4 font-bold text-sm text-blue-400 italic outline-none focus:border-gold transition-all" 
                               placeholder="0,00" 
                             />
                          </div>
                          <div className="flex flex-col gap-1.5">
                             <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Saldo a Parcelar (PV)</label>
                             <input 
                               type="number" 
                               step="0.01"
                               value={simValue || ''} 
                               onChange={(e) => {
                                 const v = Number(e.target.value);
                                 setSimValue(v);
                                 if (simCashPrice === 0) setSimCashPrice(v + simDownPayment);
                               }} 
                               className="h-12 bg-black border border-line-strong rounded-xl px-4 font-bold text-sm text-zinc-100 italic outline-none focus:border-gold transition-all" 
                               placeholder="0,00" 
                             />
                          </div>
                        </div>

                        {/* Valor da Parcela (PMT) */}
                        <div className="flex flex-col gap-2 relative">
                           <label className="text-[10px] font-black uppercase text-gray-400 ml-3 tracking-widest flex items-center justify-between">
                             <span>Valor da Parcela (PMT)</span>
                             <span className="text-gray-500 font-normal text-[9px]">Calcula taxa automaticamente</span>
                           </label>
                           <div className="relative">
                             <input 
                               type="number" 
                               step="0.01" 
                               value={simPmt} 
                               onFocus={() => setIsEditingPmt(true)}
                               onBlur={() => setIsEditingPmt(false)}
                               onChange={(e) => handleSimPmtChange(e.target.value)} 
                               className="w-full h-12 sm:h-14 bg-black border border-line-strong rounded-xl px-5 font-black text-lg text-amber-200 italic outline-none focus:border-gold transition-all" 
                               placeholder="0,00" 
                             />
                             <div className="absolute right-4 top-3 text-amber-200 font-black opacity-30 italic text-xs">BRL / MÊS</div>
                           </div>
                        </div>

                        {/* Taxa e Parcelas */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="flex flex-col gap-1.5">
                             <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Taxa Mensal (%)</label>
                             <input 
                               type="number" 
                               step="0.01"
                               value={simRate || ''} 
                               onChange={(e) => setSimRate(Number(e.target.value))} 
                               className="h-12 bg-black border border-line-strong rounded-xl px-4 font-black text-white italic outline-none focus:border-gold transition-all text-xs sm:text-sm" 
                               placeholder="0.00" 
                             />
                          </div>
                          <div className="flex flex-col gap-1.5">
                             <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Nº Parcelas</label>
                             <input 
                               type="number" 
                               min="1"
                               value={simInstallments || ''} 
                               onChange={(e) => setSimInstallments(Number(e.target.value))} 
                               className="h-12 bg-black border border-line-strong rounded-xl px-4 font-black text-white italic outline-none focus:border-gold transition-all text-xs sm:text-sm" 
                               placeholder="12" 
                             />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gold-soft border border-[rgba(255,215,0,0.1)] rounded-xl mt-1 shadow-inner">
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gold text-black flex items-center justify-center shrink-0 shadow-lg">
                               <BadgeDollarSign size={16} />
                            </div>
                            <div>
                               <h4 className="text-[10px] sm:text-xs font-black text-gold uppercase tracking-widest">Engenharia de Preços</h4>
                               <p className="text-[8px] sm:text-[9px] text-[rgba(255,215,0,0.7)] font-semibold uppercase mt-0.5 leading-relaxed">
                                 Ajuste o valor à vista, parcelas ou taxa mensal para gerar propostas comerciais instantâneas.
                               </p>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="glass-card p-5 border border-line-strong flex flex-col gap-3">
                       <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] flex items-center gap-2">
                          <Zap size={14} className="text-gold" /> Atalhos Rápidos de Taxa
                       </h4>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button onClick={() => { setSimRate(0); }} className="h-10 bg-[rgba(255,255,255,0.03)] border border-line hover:border-[rgba(255,215,0,0.3)] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all">0% Juros</button>
                          <button onClick={() => { setSimRate(2); }} className="h-10 bg-[rgba(255,255,255,0.03)] border border-line hover:border-[rgba(255,215,0,0.3)] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all">2.0% a.m.</button>
                          <button onClick={() => { setSimRate(3.5); }} className="h-10 bg-[rgba(255,255,255,0.03)] border border-line hover:border-[rgba(255,215,0,0.3)] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all">3.5% a.m.</button>
                          <button onClick={() => { setSimRate(5); }} className="h-10 bg-[rgba(255,255,255,0.03)] border border-line hover:border-[rgba(255,215,0,0.3)] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all">5.0% a.m.</button>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:gap-6 animate-view-enter" style={{ animationDelay: '0.1s' }}>
                    <div className="glass-card p-6 sm:p-10 bg-[rgba(0,0,0,0.4)] border border-line-strong flex flex-col relative overflow-hidden" id="simulation-content">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,215,0,0.5)] to-transparent opacity-30" />
                       
                       <div className="flex items-center justify-between mb-6 sm:mb-8 px-1">
                          <div>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] sm:text-xs font-black uppercase text-gold tracking-[0.3em]">Proposta Comercial</span>
                               <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">{new Date().toLocaleDateString('pt-BR')}</span>
                             </div>
                             <p className="text-sm sm:text-base text-white font-black italic uppercase mt-1">
                                {simProductName ? simProductName : 'Simulação de Venda Personalizada'}
                             </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 border border-[rgba(255,215,0,0.2)] rounded-xl sm:rounded-2xl bg-[rgba(255,215,0,0.05)] text-gold flex items-center justify-center shadow-inner shrink-0">
                             <Zap size={20} />
                          </div>
                       </div>

                      {(() => {
                        const i = simRate / 100;
                        const n = simInstallments || 1;
                        const pv = simValue || 0;
                        const rawPmt = i === 0 ? pv / n : pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                        const pmt = Math.round(rawPmt);
                        const totalInstallments = pmt * n;
                        const totalPrazo = totalInstallments + (simDownPayment || 0);
                        const effectiveCash = simCashPrice > 0 ? simCashPrice : (pv + (simDownPayment || 0));
                        const diffVal = totalPrazo - effectiveCash;
                        const diffPct = effectiveCash > 0 ? ((diffVal / effectiveCash) * 100).toFixed(1) : '0';

                        return (
                          <>
                            {/* Cards de Comparativo À Vista vs A Prazo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                              {/* Valor À Vista */}
                              <div className="p-5 sm:p-6 border border-gold/30 rounded-2xl bg-gold/[0.04] relative overflow-hidden flex flex-col justify-between">
                                <div>
                                  <span className="text-[9px] uppercase font-black text-gold/80 block mb-1 tracking-widest">Valor de À Vista</span>
                                  <strong className="text-2xl sm:text-3xl text-gold font-black block">{money(effectiveCash)}</strong>
                                </div>
                                <span className="text-[8px] text-gold/60 font-bold uppercase mt-3 pt-2 border-t border-gold/10">Preço Especial à Vista</span>
                              </div>

                              {/* Parcela Mensal */}
                              <div className="p-5 sm:p-6 border border-white/10 rounded-2xl bg-black/60 relative overflow-hidden flex flex-col justify-between">
                                <div>
                                  <span className="text-[9px] uppercase font-black text-gray-400 block mb-1 tracking-widest">Parcelamento ({n}x)</span>
                                  <strong className="text-2xl sm:text-3xl text-white font-black block">{money(pmt)}</strong>
                                </div>
                                <span className="text-[8px] text-gray-500 font-bold uppercase mt-3 pt-2 border-t border-white/5">Valor por parcela</span>
                              </div>

                              {/* Total a Prazo */}
                              <div className="p-5 sm:p-6 border border-green-500/30 rounded-2xl bg-green-500/[0.04] relative overflow-hidden flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                                <div>
                                  <span className="text-[9px] uppercase font-black text-green-400 block mb-1 tracking-widest">Total a Prazo</span>
                                  <strong className="text-2xl sm:text-3xl text-green-neon font-black block">{money(totalPrazo)}</strong>
                                </div>
                                <span className="text-[8px] text-green-500/80 font-bold uppercase mt-3 pt-2 border-t border-green-500/10">
                                  {diffVal > 0 ? `+${money(diffVal)} (+${diffPct}%)` : (diffVal === 0 ? '0% Juros (Mesmo preço)' : 'Com desconto')}
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Detalhamento da Engenharia da Venda */}
                            <div className="bg-black/60 border border-line-strong rounded-2xl p-5 sm:p-6 mb-6 flex flex-col gap-3">
                              <h5 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-white/5 pb-2">
                                Demonstrativo Comparativo de Condições
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-gray-500 uppercase font-black">Preço À Vista</span>
                                  <span className="font-bold text-gold text-sm">{money(effectiveCash)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-gray-500 uppercase font-black">Entrada Paga</span>
                                  <span className="font-bold text-blue-400 text-sm">{simDownPayment > 0 ? money(simDownPayment) : 'Sem Entrada'}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-gray-500 uppercase font-black">Saldo Parcelado</span>
                                  <span className="font-bold text-white text-sm">{money(pv)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-gray-500 uppercase font-black">Taxa de Juros</span>
                                  <span className="font-bold text-amber-200 text-sm">{simRate.toFixed(2)}% a.m.</span>
                                </div>
                              </div>
                            </div>

                            {/* Ações de Compartilhamento e Venda */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 sm:p-6 border border-dashed border-line-strong rounded-2xl bg-[rgba(255,255,255,0.02)] no-print">
                               <div className="flex items-center gap-3 w-full sm:w-auto">
                                  <div className="w-10 h-10 bg-gold text-black rounded-xl flex items-center justify-center shadow-lg shrink-0">
                                     <Share2 size={18} />
                                  </div>
                                  <div>
                                     <h5 className="text-xs sm:text-sm font-black text-white italic uppercase">Apresentar Proposta</h5>
                                     <p className="text-[9px] text-gray-500 font-semibold">Compartilhe no WhatsApp ou lance direto no estoque</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
                                   <button 
                                     onClick={downloadSimulationPDF}
                                     className="h-11 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                     title="Baixar PDF da Simulação"
                                   >
                                     <Download size={14} />
                                     PDF
                                   </button>
                                   <button 
                                     onClick={shareSimulationWhatsApp} 
                                     className="flex-1 sm:flex-initial h-11 px-5 bg-[#25D366] text-white rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                   >
                                     <MessageCircle size={15} />
                                     WhatsApp
                                   </button>
                                   <button 
                                     onClick={handleLaunchSaleFromSim}
                                     className="flex-1 sm:flex-initial h-11 px-5 bg-gold text-black rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                   >
                                     <Plus size={14} />
                                     Lançar Venda
                                   </button>
                                </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'settings' && (
                <div className="flex flex-col gap-6 sm:gap-8 animate-view-enter h-full">
                  {activeSettingsTab === null ? (
                    /* Elegant master choices layout appearing by themselves */
                    <div className="space-y-8 animate-view-enter">
                      <div className="text-center md:text-left">
                        <h3 className="text-2xl sm:text-3xl font-black italic uppercase text-zinc-100 tracking-tight logo-title">Ajustes da Conta</h3>
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-[0.3em]">Selecione uma categoria para configurar seu ecossistema Nexus Private</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {[
                          { id: 'profile', label: 'Operador', icon: User, desc: 'Configure seus dados pessoais, foto de identificação e conta do sistema.', labelHighlight: 'Identidade' },
                          { id: 'finance', label: 'Financeiro', icon: Wallet, desc: 'Cadastre nomes de favorecido, chaves de recebimento e chaves PIX de liquidez.', labelHighlight: 'Liquidez' },
                          { id: 'templates', label: 'WhatsApp', icon: MessageCircle, desc: 'Configure o template de mensagens para cobrança e envio de parcelas.', labelHighlight: 'Mensagens' },
                          { id: 'system', label: 'Sistema', icon: ShieldCheck, desc: 'Controle a segurança do banco, reset de registros locais e preferências do operador.', labelHighlight: 'Segurança' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setActiveSettingsTab(option.id)}
                            className="bg-[rgba(5,5,5,0.8)] hover:bg-[rgba(15,15,15,0.95)] border border-zinc-900 hover:border-gold/30 rounded-[32px] p-8 text-left transition-all duration-300 group relative overflow-hidden group/card shadow-2xl flex flex-col justify-between min-h-[250px] cursor-pointer"
                          >
                            {/* Inner ambient glow on hover */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(255,215,0,0.01)] group-hover/card:bg-[rgba(255,215,0,0.04)] rounded-full -mr-16 -mt-16 blur-2xl transition-all duration-500 pointer-events-none" />
                            
                            <div className="flex justify-between items-start">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-gray-500 group-hover/card:text-gold group-hover/card:border-gold/30 group-hover/card:bg-gold/5 flex items-center justify-center transition-all duration-500 shrink-0">
                                <option.icon size={22} className="sm:size-26" />
                              </div>
                              <span className="text-[8px] sm:text-[9px] font-black uppercase text-gold/60 tracking-widest bg-gold/5 border border-gold/10 px-3 py-1 rounded-full group-hover/card:border-gold/30 transition-all duration-500 leading-none">{option.labelHighlight}</span>
                            </div>

                            <div className="mt-8 space-y-2">
                              <h4 className="text-lg sm:text-xl font-black uppercase tracking-wide text-zinc-100 italic shrink-0 leading-none group-hover/card:text-white transition-colors logo-title">
                                {option.label}
                              </h4>
                              <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed font-semibold">
                                {option.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Detailed view of the configuration when selected */
                    <div className="space-y-6 animate-view-enter">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <button
                          onClick={() => setActiveSettingsTab(null)}
                          className="group flex items-center gap-3 px-6 h-12 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-gold/30 transition-all duration-300 w-fit cursor-pointer"
                        >
                          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                          Voltar aos Ajustes
                        </button>
                        
                        <div className="flex items-center gap-2 text-gold/80 text-[10px] tracking-widest uppercase bg-gold/5 px-3 py-1 border border-gold/10 rounded-full">
                           Ajuste Ativo: {activeSettingsTab === 'profile' ? 'Operador' : activeSettingsTab === 'finance' ? 'Financeiro' : activeSettingsTab === 'templates' ? 'WhatsApp' : 'Sistema'}
                        </div>
                      </div>

                      <div className="glass-card p-6 sm:p-10 border border-[rgba(255,255,255,0.05)] relative overflow-hidden min-h-[400px]">
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(255,215,0,0.05)] rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                        
                        {activeSettingsTab === 'profile' && (
                           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                              <div>
                                 <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter logo-title">Dados de Operador</h3>
                                 <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-[0.3em]">Configure suas informações de identificação</p>
                              </div>

                              {/* Operador Switcher */}
                              <div className="bg-zinc-950/40 border border-zinc-850 rounded-[24px] p-5">
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                       <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em]">Operador em uso do sistema</span>
                                       <p className="text-[11px] text-zinc-500 font-semibold">Alterne entre perfis de operadores. Cada um tem suas próprias chaves Pix e identificação.</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-gold/80 text-[10px] tracking-widest uppercase bg-gold/5 px-2.5 py-1 border border-gold/10 rounded-full w-fit">
                                       Ativo: <span className="font-black text-white ml-1 italic">{settings.currentOperator === 'operator2' ? 'Operador 2' : 'Operador 1'}</span>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 bg-black/60 p-1.5 border border-zinc-900 rounded-2xl">
                                    <button
                                       type="button"
                                       onClick={() => switchOperator('operator1')}
                                       className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer bg-gold text-black italic shadow-lg shadow-gold/10"
                                       style={{ backgroundColor: (settings.currentOperator || 'operator1') === 'operator1' ? 'var(--color-gold)' : 'transparent', color: (settings.currentOperator || 'operator1') === 'operator1' ? 'black' : '#71717a' }}
                                    >
                                       Operador 1 ({(settings.op1Name || 'Op 1').split(' ')[0]})
                                    </button>
                                    <button
                                       type="button"
                                       onClick={() => switchOperator('operator2')}
                                       className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-zinc-500 hover:text-zinc-300"
                                       style={{ backgroundColor: settings.currentOperator === 'operator2' ? 'var(--color-gold)' : 'transparent', color: settings.currentOperator === 'operator2' ? 'black' : '#71717a' }}
                                    >
                                       Operador 2 ({(settings.op2Name || 'Op 2').split(' ')[0]})
                                    </button>
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Nome Completo</label>
                                    <input value={settings.userName} onChange={(e) => setSettings({...settings, userName: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
                                 </div>
                                 <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Cargo</label>
                                    <input value={settings.userRole || ''} onChange={(e) => setSettings({...settings, userRole: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
                                 </div>
                                 <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Função</label>
                                    <input value={settings.userFunction || ''} onChange={(e) => setSettings({...settings, userFunction: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
                                 </div>
                                 <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">E-mail de Contato</label>
                                    <input value={settings.userEmail || ''} onChange={(e) => setSettings({...settings, userEmail: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
                                 </div>
                                 <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Foto de Perfil</label>
                                    <div className="flex items-center gap-6">
                                       <div className="w-24 h-24 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 relative group/avatar">
                                          {settings.profilePhoto ? (
                                             <img src={settings.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                                          ) : (
                                             <User size={32} className="text-zinc-700" />
                                          )}
                                          <label className="absolute inset-0 bg-[rgba(0,0,0,0.6)] opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                             <ImageIcon size={20} className="text-white" />
                                             <input 
                                                id="profile-upload"
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                   const file = e.target.files?.[0];
                                                   if (file) {
                                                      const reader = new FileReader();
                                                      reader.onloadend = () => {
                                                         setSettings({ ...settings, profilePhoto: reader.result as string });
                                                      };
                                                      reader.readAsDataURL(file);
                                                   }
                                                }} 
                                             />
                                          </label>
                                       </div>
                                       <div className="flex flex-col gap-2">
                                          <p className="text-[10px] text-zinc-500 font-bold uppercase">Escolha uma foto da biblioteca do seu dispositivo</p>
                                          <button 
                                             type="button"
                                             onClick={() => document.getElementById('profile-upload')?.click()}
                                             className="h-10 px-6 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] text-gold rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold hover:text-black transition-all text-left w-fit cursor-pointer"
                                          >
                                             Escolher Foto
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </motion.div>
                        )}

                        {activeSettingsTab === 'finance' && (
                           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                              <div>
                                 <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter logo-title">Fluxo de Caixa</h3>
                              </div>

                              {/* Operador Switcher */}
                              <div className="bg-zinc-950/40 border border-zinc-850 rounded-[24px] p-5">
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                       <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em]">Operador em uso do sistema</span>
                                       <p className="text-[11px] text-zinc-500 font-semibold">Alterne entre perfis de operadores. Cada um tem suas próprias chaves Pix e identificação.</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-gold/80 text-[10px] tracking-widest uppercase bg-gold/5 px-2.5 py-1 border border-gold/10 rounded-full w-fit">
                                       Ativo: <span className="font-black text-white ml-1 italic">{settings.currentOperator === 'operator2' ? 'Operador 2' : 'Operador 1'}</span>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 bg-black/60 p-1.5 border border-zinc-900 rounded-2xl">
                                    <button
                                       type="button"
                                       onClick={() => switchOperator('operator1')}
                                       className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer bg-gold text-black italic shadow-lg shadow-gold/10"
                                       style={{ backgroundColor: (settings.currentOperator || 'operator1') === 'operator1' ? 'var(--color-gold)' : 'transparent', color: (settings.currentOperator || 'operator1') === 'operator1' ? 'black' : '#71717a' }}
                                    >
                                       Operador 1 ({(settings.op1Name || 'Op 1').split(' ')[0]})
                                     </button>
                                    <button
                                       type="button"
                                       onClick={() => switchOperator('operator2')}
                                       className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-zinc-500 hover:text-zinc-300"
                                       style={{ backgroundColor: settings.currentOperator === 'operator2' ? 'var(--color-gold)' : 'transparent', color: settings.currentOperator === 'operator2' ? 'black' : '#71717a' }}
                                    >
                                       Operador 2 ({(settings.op2Name || 'Op 2').split(' ')[0]})
                                    </button>
                                 </div>
                              </div>

                              <div>
                                 <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-[0.3em]">Configurações de recebimento instantâneo</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Nome do Favorecido</label>
                                    <input value={settings.pixName} onChange={(e) => setSettings({...settings, pixName: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
                                 </div>
                                 <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Tipo de Chave</label>
                                    <select value={settings.pixType} onChange={(e) => setSettings({...settings, pixType: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all appearance-none cursor-pointer">
                                       <option value="CPF">CPF</option>
                                       <option value="CNPJ">CNPJ</option>
                                       <option value="E-mail">E-mail</option>
                                       <option value="Telefone">Telefone</option>
                                       <option value="Chave Aleatória">Chave Aleatória</option>
                                    </select>
                                 </div>
                                 <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Chave PIX Operacional</label>
                                    <input value={settings.pixKey} onChange={(e) => setSettings({...settings, pixKey: e.target.value})} placeholder="Seu pix para recebimento" className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
                                 </div>
                              </div>
                           </motion.div>
                        )}

                        {activeSettingsTab === 'templates' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                               <div>
                                  <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter logo-title">Template de Mensagem</h3>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-[0.3em]">Configure as notificações padrão de cobrança via WhatsApp</p>
                               </div>
                               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                  {/* Edit Section */}
                                  <div className="lg:col-span-7 flex flex-col gap-6">
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-3 tracking-widest">Texto da Notificação</label>
                                        <textarea 
                                           id="whatsappTemplateEditor"
                                           value={settings.whatsappTemplate || ''} 
                                           onChange={(e) => setSettings({...settings, whatsappTemplate: e.target.value})} 
                                           className="h-64 bg-black border border-zinc-800 rounded-3xl p-6 font-semibold text-zinc-200 outline-none focus:border-gold transition-all text-sm resize-none custom-scrollbar"
                                        />
                                     </div>
                                     <div className="space-y-3">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-3 block">Variáveis Disponíveis (Clique para inserir)</span>
                                        <div className="flex flex-wrap gap-2.5 bg-black/40 border border-zinc-900 rounded-2xl p-4">
                                           {[
                                              { tag: '{cliente}', label: 'Nome do Cliente' },
                                              { tag: '{produto}', label: 'Produto Adquirido' },
                                              { tag: '{parcela}', label: 'Nº da Parcela' },
                                              { tag: '{valor}', label: 'Valor Devido' },
                                              { tag: '{vencimento}', label: 'Data Vencimento' },
                                              { tag: '{chave_pix}', label: 'Chave PIX' },
                                              { tag: '{nome_pix}', label: 'Nome Beneficiário' },
                                           ].map(v => (
                                              <button
                                                 key={v.tag}
                                                 type="button"
                                                 onClick={() => {
                                                    const textarea = document.getElementById('whatsappTemplateEditor') as HTMLTextAreaElement;
                                                    if (textarea) {
                                                       const start = textarea.selectionStart;
                                                       const end = textarea.selectionEnd;
                                                       const text = settings.whatsappTemplate || '';
                                                       const updated = text.substring(0, start) + v.tag + text.substring(end);
                                                       setSettings({ ...settings, whatsappTemplate: updated });
                                                       setTimeout(() => {
                                                          textarea.focus();
                                                          textarea.setSelectionRange(start + v.tag.length, start + v.tag.length);
                                                       }, 50);
                                                    }
                                                 }}
                                                 className="px-3 py-1.5 bg-zinc-900 hover:bg-gold/10 hover:text-gold border border-zinc-850 hover:border-gold/30 rounded-xl text-[10px] font-bold text-zinc-400 transition-all cursor-pointer"
                                              >
                                                 {v.tag} <span className="text-[9px] opacity-60 font-medium font-sans">({v.label})</span>
                                              </button>
                                           ))}
                                        </div>
                                     </div>
                                  </div>

                                  {/* Live Mock Preview Section */}
                                  <div className="lg:col-span-5 flex flex-col gap-4">
                                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-3 block">Pré-visualização Dinâmica</span>
                                     <div className="bg-[#0b141a] border border-zinc-850 rounded-[32px] overflow-hidden flex flex-col min-h-[350px] shadow-2xl relative">
                                        {/* WhatsApp Chat Header */}
                                        <div className="bg-[#1f2c34] h-14 px-4 flex items-center gap-3 border-b border-zinc-800">
                                           <div className="w-9 h-9 rounded-full bg-zinc-700 font-black text-xs text-white flex items-center justify-center uppercase">
                                              CN
                                           </div>
                                           <div className="flex flex-col">
                                              <span className="text-xs font-bold text-white leading-tight">Canal de Cobrança</span>
                                              <span className="text-[9px] text-[#8696a0] leading-none font-medium">Online</span>
                                           </div>
                                        </div>

                                        {/* WhatsApp Chat Body BG */}
                                        <div className="flex-1 p-4 relative flex flex-col justify-end" style={{ backgroundImage: 'radial-gradient(circle, #101d24 0%, #0b141a 100%)' }}>
                                           {/* Message Bubble */}
                                           <div className="max-w-[90%] self-end bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-none px-3.5 py-2.5 text-xs relative shadow-md leading-relaxed whitespace-pre-wrap">
                                              {((settings.whatsappTemplate || '')
                                                 .replace(/{cliente}/g, 'Fulano de Souza')
                                                 .replace(/{produto}/g, 'Relógio Rolex Submariner')
                                                 .replace(/{parcela}/g, '1ª Parcela (1/5)')
                                                 .replace(/{valor}/g, 'R$ 4.500,00')
                                                 .replace(/{vencimento}/g, '15/10/2026')
                                                 .replace(/{chave_pix}/g, settings.pixKey || 'financeiro@nexus.com')
                                                 .replace(/{nome_pix}/g, settings.pixName || 'Nexus Commerce')) || 'Nenhum texto de template configurado.'}
                                              
                                              <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696a0] text-right">
                                                 <span>20:15</span>
                                                 <span className="text-[#53bdeb]">✓✓</span>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            </motion.div>
                         )}

                         {activeSettingsTab === 'system' && (
                           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
                              <div>
                                 <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter logo-title">Segurança e Dados</h3>
                                 <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-[0.3em]">Manutenção e integridade do sistema</p>
                              </div>
                              <div className="space-y-6">
                                 <div className="p-8 border border-[rgba(255,255,255,0.05)] rounded-3xl bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-sm font-black text-white italic uppercase logo-title">Tema Nexus Dark</span>
                                       <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Interface otimizada para performance</span>
                                    </div>
                                    <div className="w-14 h-7 bg-gold rounded-full flex items-center px-1">
                                       <div className="w-5 h-5 bg-black rounded-full shadow-lg ml-auto" />
                                    </div>
                                 </div>

                                 <div className="p-8 border border-[rgba(239,68,68,0.1)] rounded-3xl bg-red-500/[0.02] flex flex-col gap-6">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-sm font-black text-red-500 italic uppercase logo-title">Zona de Perigo</span>
                                       <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Ações irreversíveis no banco de dados</span>
                                    </div>
                                    <button 
                                       onClick={() => {
                                          openConfirm('Reset Total', 'Deseja realmente apagar todos os registros de ativos e clientes?', () => {
                                             localStorage.clear();
                                             window.location.reload();
                                          });
                                       }}
                                       type="button"
                                       className="h-14 w-full bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] text-red-500 border border-[rgba(239,68,68,0.2)] rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                                    >
                                       Deletar Todos os Dados Locais
                                    </button>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                     <button onClick={() => { setActiveView('dashboard'); showToast('Nexus sincronizado com sucesso.'); }} className="h-16 px-12 bg-white text-black rounded-2xl font-black uppercase text-xs shadow-2xl hover:bg-gold transition-all active:scale-95 flex items-center gap-3 cursor-pointer">
                        <Zap size={18} />
                        Sincronizar Nexus
                     </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* MODALS EXHAUSTIVE IMPLEMENTATION */}
        <AnimatePresence>
          {showAddProduct && (
            <div key="modal-add-product" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddProduct(false); setProductToEdit(null); setPreviewPhoto(null); }} className="absolute inset-0 bg-[rgba(0,0,0,0.9)] backdrop-blur-xl" /><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative glass-card w-full max-w-xl p-6 sm:p-12 bg-black">
              <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 italic uppercase text-center">{productToEdit ? 'Editar Produto' : 'Novo Produto'}</h3>
              <form className="space-y-4 sm:space-y-6" onSubmit={(e) => {
                e.preventDefault(); const f = e.target as any; const file = f.photo.files[0];
                const handleSuccess = (photoUrl?: string) => { 
                  const qtyVal = Number(f.quantity.value);
                  const newStatus = qtyVal > 0 ? 'Disponivel' : 'Vendido';
                  if (productToEdit) {
                    updateProduct(productToEdit.id, {
                      name: f.name.value,
                      cost: Number(f.cost.value),
                      sale: Number(f.sale.value),
                      category: f.category.value,
                      quantity: qtyVal,
                      status: newStatus as any,
                      photo: photoUrl || previewPhoto || undefined
                    });
                    showToast('Produto atualizado.');
                  } else {
                    addProduct({ 
                      name: f.name.value, 
                      cost: Number(f.cost.value), 
                      sale: Number(f.sale.value), 
                      category: f.category.value, 
                      quantity: qtyVal,
                      status: newStatus as any, 
                      photo: photoUrl 
                    }); 
                    showToast('Produto cadastrado.');
                  }
                  setShowAddProduct(false); setProductToEdit(null); setPreviewPhoto(null); 
                };
                if (file) { const reader = new FileReader(); reader.onload = (re) => handleSuccess(re.target?.result as string); reader.readAsDataURL(file); } else { handleSuccess(); }
              }}>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Modelo</label>
                  <input name="name" required defaultValue={productToEdit?.name || ''} placeholder="Nome do Modelo" className="w-full h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 font-bold outline-none focus:border-gold text-xs sm:text-sm text-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Categoria</label>
                    <select name="category" defaultValue={productToEdit?.category || 'Celular'} className="h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-4 sm:px-5 text-xs sm:text-sm text-white"><option>Celular</option><option>Eletrônico</option><option>Hardware</option><option>Acessório</option></select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Imagem</label>
                    <div className="relative h-12 sm:h-14 border border-line-strong rounded-xl flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase text-gray-500 overflow-hidden bg-zinc-900">
                      <ImageIcon size={18} /> {previewPhoto ? 'Pronto' : 'Escolher'} <input type="file" name="photo" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (re) => setPreviewPhoto(re.target?.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Custo de Aquisição (R$)</label>
                    <input name="cost" type="number" step="0.01" defaultValue={productToEdit?.cost !== undefined ? productToEdit.cost : ''} placeholder="0,00" className="w-full h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 text-white text-xs sm:text-sm font-bold outline-none focus:border-gold" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Valor de Saída / Venda (R$)</label>
                    <input name="sale" type="number" step="0.01" required defaultValue={productToEdit?.sale || ''} placeholder="0,00" className="w-full h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 text-gold text-xs sm:text-sm font-bold outline-none focus:border-gold" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Quantidade em Estoque</label>
                  <input name="quantity" type="number" min="0" required defaultValue={productToEdit?.quantity !== undefined ? productToEdit.quantity : 1} className="w-full h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 font-bold outline-none focus:border-gold text-xs sm:text-sm text-white" />
                </div>
                <button type="submit" className="w-full h-14 sm:h-16 bg-gold text-black rounded-2xl sm:rounded-3xl font-black uppercase text-[10px] sm:text-xs mt-2 sm:mt-4 shadow-2xl hover:brightness-110 active:scale-95 transition-all">{productToEdit ? 'Salvar' : 'Cadastrar'}</button>
                <button type="button" onClick={() => { setShowAddProduct(false); setProductToEdit(null); setPreviewPhoto(null); }} className="w-full h-10 text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">Cancelar</button>
              </form></motion.div>
            </div>
          )}

          {selectedSaleForContract && (
            <div key="modal-contract" className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 overflow-y-auto custom-scrollbar">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSaleForContract(null)} className="fixed inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-white w-full max-w-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh] rounded-2xl text-black font-sans my-auto">
                {/* Header de Ações UI (não sai na impressão) */}
                <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-2.5 no-print shadow-sm mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-black text-gold flex items-center justify-center font-black">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase text-black tracking-wider">Contrato de Compra e Venda</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedSaleForContract.client}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => handleDownloadContract(selectedSaleForContract)} 
                      disabled={isContractGenerating}
                      className="h-9 px-3.5 rounded-xl bg-black text-gold hover:bg-gold hover:text-black transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider shadow-md active:scale-95 cursor-pointer disabled:opacity-50" 
                      title="Baixar Arquivo PDF (1 Página A4)"
                    >
                      <Download size={14} />
                      <span>{isContractGenerating ? 'Gerando...' : 'Baixar PDF'}</span>
                    </button>
                    
                    <button 
                      onClick={() => handlePrintContract(selectedSaleForContract)} 
                      className="h-9 px-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer" 
                      title="Imprimir ou Salvar via Navegador"
                    >
                      <Printer size={14} />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <button 
                      onClick={() => handleShareContract(selectedSaleForContract)} 
                      className="h-9 px-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer" 
                      title="Compartilhar Arquivo PDF"
                    >
                      <Share2 size={14} />
                      <span className="hidden sm:inline">Compartilhar</span>
                    </button>

                    <button 
                      onClick={() => handleCopyContractText(selectedSaleForContract)} 
                      className="h-9 px-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer" 
                      title="Copiar Texto do Contrato"
                    >
                      <Copy size={14} />
                      <span className="hidden sm:inline">Copiar Texto</span>
                    </button>

                    <button 
                      onClick={() => {
                        const sale = selectedSaleForContract;
                        setSelectedSaleForContract(null);
                        setSaleToEdit(sale);
                        setShowSaleForm(true);
                        setActiveView('sales');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="h-9 px-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-800 hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer"
                      title="Editar este contrato"
                    >
                      <Pencil size={14} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <button 
                      onClick={() => {
                        const targetSale = selectedSaleForContract;
                        if (!targetSale) return;
                        openConfirm(
                          'Excluir Contrato Permanentemente',
                          `Deseja realmente excluir o contrato de ${targetSale.client} (${money(targetSale.total)}) e todas as suas parcelas? Esta ação é irreversível.`,
                          async () => {
                            setSelectedSaleForContract(null);
                            const ok = await deleteSale(targetSale.id);
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
                    const sellerName = getSystemSellerName(settings, selectedSaleForContract);
                    const cleanId = selectedSaleForContract.id.substring(0, 8).toUpperCase();
                    const dateFormatted = formatLocalDateBR(selectedSaleForContract.date || selectedSaleForContract.createdAt || new Date());
                    
                    let dueDay = '—';
                    if (installments && installments.length > 0) {
                      const matchingInst = installments.find(i => i.saleId === selectedSaleForContract.id);
                      if (matchingInst?.dueDate) {
                        dueDay = extractDueDay(matchingInst.dueDate);
                      }
                    }
                    if (dueDay === '—' && selectedSaleForContract.date) {
                      dueDay = extractDueDay(selectedSaleForContract.date);
                    }

                    const downPayment = selectedSaleForContract.downPayment || 0;
                    const installmentsCount = selectedSaleForContract.installmentsCount || 1;
                    const installmentVal = selectedSaleForContract.installmentValue || 0;
                    const isInterest = !!selectedSaleForContract.isInterestOnly;
                    const interestRate = selectedSaleForContract.interestRate || 0;

                    return (
                      <div className="max-w-[720px] mx-auto flex flex-col gap-3.5 leading-normal">
                        {/* Header Institucional */}
                        <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="text-[9.5px] font-black uppercase text-amber-700 tracking-widest block">{company}</span>
                            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                              Contrato de Compra e Venda
                            </h1>
                            <span className="text-[9px] text-slate-500 font-semibold">Instrumento Particular de Compromisso de Venda e Confissão de Dívida</span>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md font-mono text-[10px] font-black text-slate-900 inline-block">
                              Nº: CT-{cleanId}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">Emissão: <strong className="text-slate-800">{dateFormatted}</strong></div>
                          </div>
                        </div>

                        {/* Quadro-Resumo */}
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
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">Comprador(a)</span>
                              <strong className="text-slate-900 uppercase">{selectedSaleForContract.client}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">CPF / Documento</span>
                              <strong className="text-slate-900">{selectedSaleForContract.clientCpf || 'Registrado em Sistema'}</strong>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">Produto / Bem Alienado</span>
                              <strong className="text-slate-900 uppercase">{(selectedSaleForContract.productName || 'Produto Comercial').toUpperCase()}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">Valor Total da Operação</span>
                              <strong className="text-xs font-black text-slate-900">{money(selectedSaleForContract.total)}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">Entrada Liquidada</span>
                              <strong className={downPayment > 0 ? "text-emerald-700 font-bold" : "text-slate-600 font-medium"}>
                                {downPayment > 0 ? money(downPayment) : 'Sem entrada'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">Plano de Pagamento</span>
                              <strong className="text-slate-900">
                                {isInterest 
                                  ? `${installmentsCount} parcelas de juros de ${money(installmentVal)}` 
                                  : `${installmentsCount} parcelas de ${money(installmentVal)}`}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8.5px] uppercase tracking-wider">Vencimento Recorrente</span>
                              <strong className="text-slate-900">Todo dia {dueDay} de cada mês</strong>
                            </div>
                          </div>
                        </div>

                        {/* Cláusulas Contratuais */}
                        <div className="space-y-2 text-[10px] text-slate-600 pt-0.5">
                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">Cláusula 1ª – Das Partes Contratantes</strong>
                            <p className="text-justify">
                              Pelo presente instrumento, de um lado denominada(o) <strong>VENDEDOR(A)</strong>: <strong>{sellerName}</strong>; e de outro lado denominada(o) <strong>COMPRADOR(A)</strong>: <strong>{selectedSaleForContract.client.toUpperCase()}</strong>, CPF nº <strong>{selectedSaleForContract.clientCpf || 'N/A'}</strong>, telefone <strong>{selectedSaleForContract.clientPhone || 'N/A'}</strong>{selectedSaleForContract.clientAddress ? `, residente em ${selectedSaleForContract.clientAddress}` : ''}, firmam o presente compromisso de compra e venda mercantil.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">Cláusula 2ª – Do Objeto</strong>
                            <p className="text-justify">
                              O presente contrato tem por objeto a alienação do bem/serviço: <strong>{(selectedSaleForContract.productName || 'PRODUTO REGISTRADO').toUpperCase()}</strong>, entregue ou disponibilizado em perfeitas condições de uso, conferido e aceito pelo Comprador.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">Cláusula 3ª – Do Preço, Condições e Amortização</strong>
                            <p className="text-justify">
                              O valor integral estipulado é de <strong>{money(selectedSaleForContract.total)}</strong>, a ser liquidado conforme discriminado no Quadro-Resumo, com vencimento todo dia <strong>{dueDay}</strong> de cada mês subsequente. É assegurado ao Comprador o direito de realizar quitações antecipadas ou amortizações com o devido abatimento proporcional.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">Cláusula 4ª – Da Tolerância e Encargos por Atraso</strong>
                            <p className="text-justify">
                              Eventual atraso na quitação de parcelas acarretará em multa moratória de 2% (dois por cento) sobre a parcela vencida, acrescida de juros de 1% (um por cento) ao mês <em>pro rata die</em> até a efetiva quitação.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">Cláusula 5ª – Da Eficácia e Título Executivo</strong>
                            <p className="text-justify">
                              As partes reconhecem a plena validade jurídica deste instrumento eletrônico e seus respectivos comprovantes, constituindo confissão líquida, certa e exigível de dívida nos termos do art. 784, inciso III do Código de Processo Civil.
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-900 uppercase block mb-0.5 text-[9.5px]">Cláusula 6ª – Do Foro</strong>
                            <p className="text-justify">
                              Fica eleito o foro da comarca da sede do Vendedor para dirimir quaisquer dúvidas decorrentes do presente contrato.
                            </p>
                          </div>
                        </div>

                        {/* Assinaturas */}
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <p className="text-center text-[8.5px] text-slate-400 uppercase tracking-wider mb-5">
                            E por estarem de pleno acordo, firmam o presente compromisso.
                          </p>
                          <div className="grid grid-cols-2 gap-8 sm:gap-14 px-4">
                            <div className="text-center space-y-1">
                              <div className="h-[1.5px] bg-slate-700 w-full"></div>
                              <div className="flex flex-col">
                                <strong className="text-[9.5px] font-bold uppercase text-slate-900">{sellerName}</strong>
                                <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest">Vendedor(a)</span>
                              </div>
                            </div>
                            <div className="text-center space-y-1">
                              <div className="h-[1.5px] bg-slate-700 w-full"></div>
                              <div className="flex flex-col">
                                <strong className="text-[9.5px] font-bold uppercase text-slate-900">{selectedSaleForContract.client}</strong>
                                <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest">Comprador(a)</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rodapé de Autenticação */}
                        <div className="mt-3 pt-2 flex justify-between border-t border-dashed border-slate-200 text-[7.5px] text-slate-400 uppercase font-mono">
                          <span>Autenticação: {selectedSaleForContract.id.toUpperCase()}</span>
                          <span>Via Original Digital • Emissão: {dateFormatted}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}

          {selectedInstallmentForReceipt && (() => {
            const correspondingSale = sales.find(s => s.id === selectedInstallmentForReceipt.saleId || (selectedInstallmentForReceipt?.id && selectedInstallmentForReceipt.id.replace('entrada-', '') === s.id));
            const transactionDate = selectedInstallmentForReceipt.paidAt || selectedInstallmentForReceipt.date || new Date().toISOString();
            const cleanId = selectedInstallmentForReceipt.id.toUpperCase();
            
            return (
              <div key="modal-receipt" className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-12 overflow-y-auto backdrop-blur-md">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInstallmentForReceipt(null)} className="fixed inset-0 bg-[rgba(0,0,0,0.85)]" />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="relative bg-white w-full max-w-2xl p-6 sm:p-10 text-zinc-950 font-sans border-t-8 border-gold rounded-3xl shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                >
                  {/* Action buttons (fixed/sticky or absolute top-right, but outside the printed receipt) */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center justify-between pb-4 border-b border-zinc-100 no-print">
                     <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">Ações do Comprovante</span>
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={handleDownloadReceiptPDF} 
                          className="h-10 px-4 rounded-xl bg-zinc-900 text-white flex items-center gap-1.5 hover:bg-zinc-800 transition-all text-xs font-bold shadow-lg"
                        >
                          <Download size={14} />
                          <span>Baixar PDF</span>
                        </button>
                        <button 
                          onClick={handleShareReceipt} 
                          className="h-10 px-4 rounded-xl bg-gold text-black flex items-center gap-1.5 hover:bg-yellow-500 transition-all text-xs font-bold shadow-lg"
                        >
                          <Share2 size={14} />
                          <span>Compartilhar</span>
                        </button>
                        <button 
                          onClick={() => setSelectedInstallmentForReceipt(null)} 
                          className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow"
                        >
                          <X size={16} />
                        </button>
                     </div>
                  </div>

                  {/* Document printable container */}
                  <div id="receipt-content" className="bg-white p-4 sm:p-8 rounded-2xl border border-zinc-150 text-zinc-800 flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-zinc-200">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase font-extrabold tracking-widest text-gold">{settings.companyName || 'GESTÃO DE VENDAS'}</span>
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">COMPROVANTE DE RECEBIMENTO</h2>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase">Terminal de Operações Comerciais</span>
                      </div>
                      <div className="text-left sm:text-right flex flex-col sm:items-end gap-1">
                        <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[9px] font-mono text-zinc-750 font-black uppercase tracking-wider block">ID: {cleanId.substring(0, 12)}</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Emitido em: {formatLocalDateBR(transactionDate, { showTime: true })}</span>
                      </div>
                    </div>

                    {/* Transaction visual amount card */}
                    <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">Valor Liquidado</span>
                      <strong className="text-4xl sm:text-5xl font-black text-zinc-900 font-sans tracking-tight mt-1">{money(selectedInstallmentForReceipt.value)}</strong>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-[9px] font-black uppercase tracking-wider mt-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Transação Aprovada & Conciliada
                      </div>
                    </div>

                    {/* Explanatory description card */}
                    <div className="text-xs sm:text-sm text-zinc-700 leading-relaxed space-y-2 py-2">
                      <p>
                        Declaramos para os devidos fins que recebemos com sucesso de 
                        <strong className="text-zinc-900 font-extrabold uppercase"> {selectedInstallmentForReceipt.client}</strong>, 
                        o valor integral de <strong className="text-zinc-900 font-bold">{money(selectedInstallmentForReceipt.value)}</strong>.
                      </p>
                      <p>
                        Esta liquidação refere-se ao pagamento da {selectedInstallmentForReceipt.type === 'entrada' ? (
                          <strong className="text-zinc-900 font-semibold">Entrada Operacional / Sinal</strong>
                        ) : (
                          <>
                            parcela <strong className="text-zinc-900 font-extrabold">Nº {selectedInstallmentForReceipt.number}</strong> de um total de <strong className="text-zinc-900 font-bold">{selectedInstallmentForReceipt.total} parcelas</strong>
                          </>
                        )} da transação comercial vinculada ao produto de investimento: <strong className="italic text-zinc-900 font-semibold">{selectedInstallmentForReceipt.productName || correspondingSale?.productName || 'Produto Registrado'}</strong>.
                      </p>
                    </div>

                    {/* Explicit summary metadata table */}
                    <div className="border border-zinc-200 rounded-2xl overflow-hidden text-xs">
                      <div className="bg-zinc-50/50 p-3 sm:p-4 font-black uppercase tracking-wider border-b border-zinc-200 text-zinc-800 flex items-center justify-between">
                        <span>Especificações da Liquidação</span>
                        <span className="text-[9px] text-zinc-400 font-bold">Via do Cliente</span>
                      </div>
                      <div className="divide-y divide-zinc-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">Nome do Pagador (Cliente):</span>
                          <strong className="text-zinc-950 font-bold uppercase">{selectedInstallmentForReceipt.client}</strong>
                        </div>
                        {correspondingSale?.clientCpf && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                            <span className="text-zinc-500 font-semibold uppercase text-[10px]">Documento (CPF / CNPJ):</span>
                            <span className="text-zinc-950 font-mono font-bold">{correspondingSale.clientCpf}</span>
                          </div>
                        )}
                        {correspondingSale?.clientPhone && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                            <span className="text-zinc-500 font-semibold uppercase text-[10px]">Telefone de Contato:</span>
                            <span className="text-zinc-950 font-bold">{correspondingSale.clientPhone}</span>
                          </div>
                        )}
                        {correspondingSale?.clientAddress && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                            <span className="text-zinc-500 font-semibold uppercase text-[10px]">Endereço Fornecido:</span>
                            <span className="text-zinc-950 font-medium italic">{correspondingSale.clientAddress}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">Meio de Recebimento Utilizado:</span>
                          <strong className="text-zinc-950 uppercase font-black">{selectedInstallmentForReceipt.paymentMethod || 'PIX'}</strong>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">Vencimento Nominal da Parcela:</span>
                          <span className="text-zinc-950 font-bold">
                            {formatLocalDateBR(selectedInstallmentForReceipt.dueDate || transactionDate)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 p-3 sm:p-4 gap-1 hover:bg-zinc-50/30 transition-colors">
                          <span className="text-zinc-500 font-semibold uppercase text-[10px]">Protocolo de Autenticação Digital:</span>
                          <span className="text-zinc-900 font-mono tracking-wider font-semibold">{cleanId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer text */}
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase leading-relaxed text-center px-4 py-2 border border-zinc-100 rounded-xl">
                      Damos por este recibo plena, geral, expressa e irrevogável quitação do valor recebido e constante neste comprovante físico, para nada mais reivindicar a qualquer título referente a esta parcela específica.
                    </p>

                    {/* Foot/Signatures details */}
                    <div className="mt-4 pt-4 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end text-xs">
                      <div>
                        <span className="block text-[8px] text-zinc-400 font-extrabold uppercase tracking-wider">Emitido por terminal eletrônico</span>
                        <strong className="block text-zinc-900 font-extrabold uppercase mt-1">{settings.companyName || 'GESTÃO DE VENDAS'}</strong>
                        <span className="block text-[10px] text-zinc-500">{settings.city || 'São Paulo - SP'}</span>
                      </div>
                      <div className="flex flex-col sm:items-end text-left sm:text-right gap-1 font-mono text-[9px] text-zinc-400">
                        <span>CERTIFICADO DIGITALMENTE</span>
                        <span>SISTEMA INTEGRADO DE CONCILIAÇÃO</span>
                        <span>DATA LOG: {new Date(transactionDate).toISOString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}

          {selectedInstallmentForPayment && (() => {
            const correspondingSale = sales.find(s => s.id === selectedInstallmentForPayment.saleId);
            const isInterestOnly = correspondingSale?.isInterestOnly;

            // Resolve whether we are in amortization mode (only for interest-only sales)
            const isAmortizing = isInterestOnly && paymentType === 'amortization';
            
            const handleUnifiedPaymentSubmit = async () => {
              if (isAmortizing) {
                const amountVal = Number(amortizationAmount);
                if (isNaN(amountVal) || amountVal <= 0) {
                  showToast('Por favor, informe um valor de amortização válido maior que zero.', 'error');
                  return;
                }
                if (amountVal > correspondingSale.total) {
                  showToast(`O valor da amortização não pode ser maior que o saldo atual de ${money(correspondingSale.total)}.`, 'error');
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
                  paymentMethod 
                };
                setSelectedInstallmentForPayment(null);
                setSelectedInstallmentForReceipt(iCopy);
                showToast('Pagamento do ciclo confirmado com sucesso!');
              }
            };

            return (
              <div key="modal-payment" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInstallmentForPayment(null)} className="absolute inset-0 bg-[rgba(0,0,0,0.95)] backdrop-blur-md" />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-[440px] glass-card p-10 bg-[#0a0a0a] border border-[rgba(255,215,0,0.2)] shadow-2xl overflow-hidden rounded-[32px]">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gold shadow-[0_0_20px_#ffd70033]" />
                   <button onClick={() => setSelectedInstallmentForPayment(null)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors cursor-pointer"><X size={20}/></button>
                   
                   <div className="text-center mb-6">
                      <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                        {isInterestOnly ? 'Opções de Liquidação' : 'Liquidação de Ciclo'}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-widest leading-none">
                        {isInterestOnly ? 'Operação de Juros / ROI Ativo' : 'Processamento de Recebíveis'}
                      </p>
                   </div>

                   {/* Toggle options for Interest Only sales */}
                   {isInterestOnly && (
                     <div className="flex bg-zinc-950 border border-zinc-900 rounded-2xl p-1 mb-6 gap-1">
                       <button
                         type="button"
                         onClick={() => {
                           setPaymentType('interest');
                           setAmortizationAmount('');
                         }}
                         className={`flex-1 py-3 text-center rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                           paymentType === 'interest' 
                             ? 'bg-gold text-black font-extrabold' 
                             : 'text-zinc-500 hover:text-zinc-300'
                         }`}
                       >
                         Pagar Juros e Renovar 30 Dias
                       </button>
                       <button
                         type="button"
                         onClick={() => {
                           setPaymentType('amortization');
                           setAmortizationAmount('');
                         }}
                         className={`flex-1 py-3 text-center rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                           paymentType === 'amortization' 
                             ? 'bg-gold text-black font-extrabold' 
                             : 'text-zinc-500 hover:text-zinc-300'
                         }`}
                       >
                         Amortização
                       </button>
                     </div>
                   )}

                   {/* Main details box */}
                   <div className="p-8 bg-[rgba(0,0,0,0.6)] rounded-[24px] border border-[rgba(255,255,255,0.05)] text-center mb-6 shadow-inner relative group overflow-hidden">
                      <div className="absolute inset-0 bg-[rgba(255,215,0,0.05)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {isAmortizing ? (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase block tracking-[0.2em]">Valor da Amortização (R$)</label>
                          <div className="relative mt-2">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                            <input 
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={correspondingSale?.total || 9999999}
                              value={amortizationAmount}
                              onChange={(e) => setAmortizationAmount(e.target.value)}
                              placeholder="0,00"
                              className="w-full h-14 bg-zinc-900 border border-line-strong rounded-2xl pl-10 pr-4 font-bold outline-none focus:border-gold text-white text-center text-xl"
                              autoFocus
                            />
                          </div>
                          
                          {correspondingSale && (
                            <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-zinc-400 text-left space-y-1">
                              <div className="flex justify-between">
                                <span>Saldo Principal Atual:</span>
                                <span className="font-bold text-white">{money(correspondingSale.total)}</span>
                              </div>
                              {Number(amortizationAmount) > 0 && (
                                <>
                                  <div className="flex justify-between text-green-neon">
                                    <span>Novo Saldo Devedor:</span>
                                    <span className="font-extrabold">{money(Math.max(0, correspondingSale.total - Number(amortizationAmount)))}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Novo Juros Mensal Estimado ({correspondingSale.interestRate}%):</span>
                                    <span className="font-bold text-zinc-300 font-mono">
                                      {money(Math.max(0, correspondingSale.total - Number(amortizationAmount)) * (correspondingSale.interestRate || 0) / 100)}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-[10px] font-black text-gray-500 uppercase block mb-2 tracking-[0.3em]">
                            {isInterestOnly ? "Rendimento do Ciclo (Juros)" : "Montante Quitação"}
                          </span>
                          <strong className="text-4xl sm:text-5xl text-white font-black italic tracking-tighter drop-shadow-lg block">
                            {money(selectedInstallmentForPayment.value)}
                          </strong>
                          {isInterestOnly && (
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-2.5">
                              ROI esperado de {correspondingSale?.interestRate || 0}% sobre {money(correspondingSale?.total || 0)}
                            </p>
                          )}
                        </>
                      )}
                   </div>

                   {/* Subtitle warning for interestOnly renewal */}
                   {isInterestOnly && !isAmortizing && (
                     <div className="mb-6 p-4 rounded-xl bg-gold/5 border border-gold/10 text-[9px] text-zinc-400 uppercase tracking-wide leading-normal">
                       ✨ Ao confirmar o recebimento dos juros, a operação será automaticamente renovada por mais 30 dias com o mesmo ROI esperado.
                     </div>
                   )}

                   {/* Meio de pagamento */}
                   <div className="flex flex-col gap-2 mb-8">
                      <label className="text-[10px] font-black uppercase text-gray-600 ml-2 mb-1 text-left">Meio de Pagamento Verificado</label>
                      <div className="grid grid-cols-2 gap-2">
                         {['Pix', 'Dinheiro', 'Cartão', 'Transferência'].map(m => (
                           <button 
                              key={m} 
                              type="button"
                              onClick={() => {
                                 const mapping: Record<string, any> = {
                                   'Pix': 'Pix',
                                   'Dinheiro': 'Dinheiro',
                                   'Cartão': 'Cartão de Crédito',
                                   'Transferência': 'Transferência'
                                 };
                                 setPaymentMethod(mapping[m] || 'Pix');
                              }} 
                              className={`h-11 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative overflow-hidden group border ${
                                (paymentMethod === m || (m === 'Cartão' && (paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito')))
                                  ? 'bg-gold text-black border-gold font-extrabold' 
                                  : 'bg-[rgba(255,255,255,0.03)] text-gray-600 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,215,0,0.3)] hover:text-gray-300'
                              }`}
                           >
                              <span className="relative z-10">{m}</span>
                              {(paymentMethod === m || (m === 'Cartão' && (paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito'))) && (
                                 <motion.div layoutId="pay-active-unified" className="absolute inset-0 bg-gold" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                              )}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Apenas um botão de pagamento */}
                   <button 
                      onClick={handleUnifiedPaymentSubmit} 
                      className="w-full h-16 bg-green-neon text-black rounded-[24px] font-black uppercase text-xs shadow-[0_10px_30px_rgba(34,197,94,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                   >
                      <Zap size={20} />
                      {isAmortizing ? 'Confirmar Amortização' : (isInterestOnly ? 'Pagar Juros e Renovar' : 'Confirmar Quitação')}
                   </button>
                </motion.div>
              </div>
            );
          })()}

          {false && selectedSaleForAmortization && (
            <div key="modal-amortization" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSaleForAmortization(null)} className="absolute inset-0 bg-[rgba(0,0,0,0.95)] backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-[440px] glass-card p-10 bg-[#0a0a0a] border border-[rgba(255,215,0,0.2)] shadow-2xl overflow-hidden rounded-[32px]">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gold shadow-[0_0_20px_#ffd70033]" />
                 <button onClick={() => setSelectedSaleForAmortization(null)} className="absolute top-8 right-8 text-gray-400 hover:text-white transition-colors cursor-pointer"><X size={20}/></button>
                 
                 <div className="text-center mb-8">
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Amortização de Saldo</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1 tracking-widest leading-none">Redução de Dívida / Principal</p>
                 </div>

                 <div className="p-6 bg-zinc-950/60 rounded-2xl border border-zinc-900 mb-6 text-center">
                    <span className="text-[9px] font-black text-gray-500 uppercase block tracking-wider mb-1">Cliente / Produto</span>
                    <strong className="text-sm text-white font-bold block truncate max-w-full mb-3">{selectedSaleForAmortization.client} ({selectedSaleForAmortization.productName})</strong>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900">
                      <div>
                        <span className="text-[9px] font-black text-gray-500 uppercase block tracking-wider">Saldo Atual</span>
                        <strong className="text-base text-gold font-bold">{money(selectedSaleForAmortization.total)}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-500 uppercase block tracking-wider">Juros Mensal</span>
                        <strong className="text-base text-zinc-350 font-bold">{selectedSaleForAmortization.interestRate}% ({money(selectedSaleForAmortization.installmentValue)}/mês)</strong>
                      </div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-2 mb-6">
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-2">Valor da Amortização (R$)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        max={selectedSaleForAmortization.total}
                        value={amortizationAmount}
                        onChange={(e) => setAmortizationAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full h-14 bg-zinc-900 border border-line-strong rounded-2xl pl-12 pr-6 font-bold outline-none focus:border-gold text-white text-sm"
                      />
                    </div>
                    {amortizationAmount && !isNaN(Number(amortizationAmount)) && Number(amortizationAmount) > 0 && (
                      <div className="text-[10px] text-zinc-400 mt-1 font-semibold ml-2 text-left">
                        Novo saldo devedor após pagamento: <span className="text-green-neon">{money(Math.max(0, selectedSaleForAmortization.total - Number(amortizationAmount)))}</span>
                        {Number(amortizationAmount) >= selectedSaleForAmortization.total ? (
                          <span className="text-gold block mt-0.5">⚠️ Esta amortização liquidará completamente este contrato!</span>
                        ) : (
                          <span className="text-zinc-500 block mt-0.5">Novo valor estimado dos juros mensais: {money(Math.max(0, selectedSaleForAmortization.total - Number(amortizationAmount)) * (selectedSaleForAmortization.interestRate || 0) / 100)}</span>
                        )}
                      </div>
                    )}
                 </div>

                 <div className="flex flex-col gap-3 mb-8">
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-2 text-left">Meio de Pagamento Verificado</label>
                    <div className="grid grid-cols-2 gap-2">
                       {['Pix', 'Dinheiro', 'Cartão', 'Transferência'].map(m => (
                         <button 
                            key={m} 
                            type="button"
                            onClick={() => setAmortizationMethod(m as any)} 
                            className={`h-11 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all relative overflow-hidden group ${amortizationMethod === m ? 'bg-gold text-black font-extrabold' : 'bg-zinc-900 border border-zinc-800 text-gray-500 hover:text-gray-300'}`}
                         >
                            <span className="relative z-10">{m}</span>
                            {amortizationMethod === m && (
                               <motion.div layoutId="amort-active" className="absolute inset-0 bg-gold" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                            )}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button 
                    onClick={handleConfirmAmortization} 
                    className="w-full h-16 bg-gold text-black rounded-[20px] font-black uppercase text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                 >
                    <DollarSign size={18} />
                    Confirmar Amortização
                 </button>
              </motion.div>
            </div>
          )}

          {/* Modal de Antecipação de Parcelas */}
          {selectedSaleForAdvance && (
            <div key="modal-advance" className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div 
                className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
                onClick={() => setSelectedSaleForAdvance(null)} 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-zinc-950/90 border border-gold/30 rounded-[28px] p-6 sm:p-8 shadow-2xl backdrop-blur-xl my-8 overflow-hidden z-10 text-left"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-5 border-b border-white/10 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-gold/30 border border-gold/40 flex items-center justify-center text-gold shadow-inner">
                      <Zap size={24} className="fill-gold/20" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-gold tracking-widest block">Liquidação Antecipada</span>
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">Antecipar Parcelas</h3>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        {selectedSaleForAdvance.clientName} • {selectedSaleForAdvance.product}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSaleForAdvance(null)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Quick Global Discount Selector */}
                <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
                      <Percent size={13} className="text-gold" />
                      Desconto Padrão para Selecionadas:
                    </label>
                    <span className="text-xs font-bold text-gold">{advanceGlobalDiscount}% de desconto</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0, 5, 10, 15, 20, 25, 30].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSetGlobalDiscount(pct)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          advanceGlobalDiscount === pct 
                            ? 'bg-gold text-black border border-gold font-extrabold shadow-md scale-105' 
                            : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:border-gold/30'
                        }`}
                      >
                        {pct === 0 ? 'Sem Desconto' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Installments Table/List */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                      Selecione as Parcelas ({advanceSelectedInstIds.length}/{advancePendingInsts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (advanceSelectedInstIds.length === advancePendingInsts.length) {
                          setAdvanceSelectedInstIds([]);
                        } else {
                          const all = advancePendingInsts.map(i => i.id);
                          setAdvanceSelectedInstIds(all);
                        }
                      }}
                      className="text-[10px] font-extrabold text-gold hover:underline uppercase tracking-wider cursor-pointer"
                    >
                      {advanceSelectedInstIds.length === advancePendingInsts.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {advancePendingInsts.map(inst => {
                      const isSelected = advanceSelectedInstIds.includes(inst.id);
                      const currentDiscountPct = advanceCustomDiscounts[inst.id] ?? advanceGlobalDiscount ?? 0;
                      const origValue = inst.value || 0;
                      const discountVal = (origValue * currentDiscountPct) / 100;
                      const finalInstVal = Math.round(Math.max(0, origValue - discountVal));

                      return (
                        <div 
                          key={inst.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-amber-500/10 border-gold/40 text-white' 
                              : 'bg-white/[0.02] border-white/5 text-zinc-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectAdvanceInst(inst.id)}
                              className="w-5 h-5 rounded border-zinc-700 text-gold focus:ring-gold focus:ring-offset-0 bg-zinc-900 cursor-pointer accent-amber-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-white tracking-wider">
                                  Parcela {inst.number}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">
                                  Venc: {formatLocalDateBR(inst.dueDate)}
                                </span>
                              </div>
                              <span className="text-[11px] text-zinc-400 font-medium">
                                Original: <strong className="text-zinc-200">{money(origValue)}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Individual Discount Input & Final Rounded Value */}
                          {isSelected ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-gold/30 rounded-xl px-2.5 py-1">
                                <span className="text-[10px] font-black text-gold uppercase">% Desc:</span>
                                <input 
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={currentDiscountPct}
                                  onChange={(e) => handleCustomDiscountChange(inst.id, parseFloat(e.target.value))}
                                  className="w-12 bg-transparent text-center font-extrabold text-xs text-white outline-none"
                                />
                              </div>
                              <div className="text-right min-w-[90px]">
                                <span className="text-[9px] font-extrabold text-amber-400 uppercase block">A Pagar</span>
                                <span className="text-sm font-black text-white">{money(finalInstVal)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-zinc-500">Não Selecionada</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meio de pagamento */}
                <div className="mb-6">
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-2 tracking-wider">
                    Forma de Recebimento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Pix', label: 'PIX' },
                      { id: 'Cartão de Crédito', label: 'Cartão' },
                      { id: 'Dinheiro', label: 'Dinheiro' },
                      { id: 'Transferência', label: 'TED / DOC' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAdvancePaymentMethod(m.id as any)}
                        className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                          advancePaymentMethod === m.id
                            ? 'bg-gold text-black border-gold shadow-lg font-extrabold'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Totals & Summary Card */}
                <div className="p-5 bg-gradient-to-br from-black to-zinc-900 border border-gold/30 rounded-2xl mb-6 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-left w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Total Original:</span>
                      <strong className="text-zinc-200 line-through">{money(advanceCalculations.totalOriginal)}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-extrabold">
                      <span>Desconto Total:</span>
                      <span>-{money(advanceCalculations.totalDiscount)} ({advanceCalculations.effectiveDiscountPct}%)</span>
                    </div>
                  </div>

                  <div className="text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                    <span className="text-[10px] font-black text-gold uppercase tracking-widest block">
                      Valor Final Redondo a Receber
                    </span>
                    <strong className="text-3xl font-black text-white italic tracking-tight drop-shadow-md">
                      {money(advanceCalculations.totalFinal)}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSaleForAdvance(null)}
                    className="h-14 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-2xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer border border-white/10"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={advanceSelectedInstIds.length === 0}
                    onClick={handleConfirmAdvance}
                    className="h-14 bg-gradient-to-r from-gold to-amber-400 text-black rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap size={18} className="fill-black" />
                    Confirmar Antecipação ({money(advanceCalculations.totalFinal)})
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {confirmModal.show && (
            <div key="modal-confirm" className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[rgba(0,0,0,0.9)] backdrop-blur-md" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} />
              <div className="relative w-full max-w-sm glass-card p-10 bg-black text-center">
                <div className="w-16 h-16 rounded-3xl bg-[rgba(239,68,68,0.1)] text-red-500 grid place-items-center mx-auto mb-6"><X size={32}/></div>
                <h3 className="text-xl font-black uppercase mb-2">{confirmModal.title}</h3>
                <p className="text-gray-500 text-sm font-medium mb-10 leading-relaxed">{confirmModal.message}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="h-12 bg-[rgba(255,255,255,0.05)] rounded-xl uppercase text-[10px] font-black">Voltar</button>
                  <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, show: false })); }} className="h-12 bg-red-600 rounded-xl uppercase text-[10px] font-black">Prosseguir</button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <motion.div key="toast-notice" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-3xl shadow-2xl border backdrop-blur-md flex items-center gap-4 ${toast.type === 'success' ? 'bg-green-soft border-[rgba(57,255,20,0.3)] text-green-neon' : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-red-500'}`}>
              <Zap size={20} /> <span className="font-black uppercase text-xs tracking-widest">{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
