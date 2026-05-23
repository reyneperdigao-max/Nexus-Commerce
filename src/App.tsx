import { useState, Fragment, useEffect, useMemo } from 'react';
import { useNexusState } from './useNexusState';
import { Sidebar } from './components/Sidebar';
import { Logo, Topbar, DashboardStats } from './components/CommonUI';
import { AnimatePresence, motion } from 'motion/react';
import { Boxes, Plus, X, Search, ImagePlus, User, Wallet, ShoppingBag, ArrowLeft, ArrowRight, BadgeDollarSign, Activity, Zap, History, ChevronDown, Pencil, FileText, Download, DollarSign, Share2, Calculator, Package, MessageCircle, ShieldCheck, Lock, Mail, Image as ImageIcon, AlertCircle, Calendar } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { auth } from './lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const { products, sales, installments, closings, settings, setSettings, addProduct, deleteProduct, registerSale, deleteSale, deleteClient, updateProduct, updateSaleFull, payInstallment, closeMonthlyRegister } = useNexusState();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

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
    return sales.filter(s => s.createdAt > lastClosingDate);
  }, [sales, lastClosingDate]);

  const [activeView, setActiveView] = useState('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleFormSelectedProductId, setSaleFormSelectedProductId] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any>(null);
  const [saleToEdit, setSaleToEdit] = useState<any>(null);
  const [isInterestOnlyForm, setIsInterestOnlyForm] = useState(false);
  const [interestRateForm, setInterestRateForm] = useState<string | number>(5);

  useEffect(() => {
    if (saleToEdit) {
      setIsInterestOnlyForm(saleToEdit.isInterestOnly || false);
      setInterestRateForm(saleToEdit.interestRate !== undefined ? saleToEdit.interestRate : 5);
    } else {
      setIsInterestOnlyForm(false);
      setInterestRateForm(5);
    }
  }, [saleToEdit, showSaleForm]);

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
  const [selectedInstallmentForPayment, setSelectedInstallmentForPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro' | 'Transferência'>('Pix');
  const [selectedInstallmentForReceipt, setSelectedInstallmentForReceipt] = useState<any>(null);

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
  const [simRate, setSimRate] = useState<number>(0);
  const [simInstallments, setSimInstallments] = useState<number>(12);

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleConfirmPayment = async () => {
    if (!selectedInstallmentForPayment) return;
    
    await payInstallment(selectedInstallmentForPayment.id, paymentMethod);
    
    const installment = { ...selectedInstallmentForPayment, status: 'Pago', paidAt: new Date().toISOString(), paymentMethod };
    setSelectedInstallmentForPayment(null);
    setSelectedInstallmentForReceipt(installment);
    showToast('Pagamento confirmado com sucesso!');
  };

  const handleShareReceipt = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;
    try {
      const opt: any = {
        margin: [10, 10],
        filename: 'recibo.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      const worker = html2pdf().set(opt).from(element);
      const pdfBlob = await worker.output('blob');
      const file = new File([pdfBlob], `RECIBO_${selectedInstallmentForReceipt.id.substring(0,8)}.pdf`, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Recibo Comercial', text: `Recibo de pagamento - ${selectedInstallmentForReceipt.client}` });
      } else {
        worker.save();
        showToast('Compartilhamento não suportado. O arquivo foi baixado.');
      }
    } catch (error) {
      showToast('Erro ao processar o compartilhamento.', 'error');
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('contract-content');
    if (!element || !selectedSaleForContract) {
      showToast('Erro: Conteúdo do contrato não encontrado.', 'error');
      return;
    }
    
    showToast('Gerando PDF do contrato...');
    
    const opt = {
      margin: [10, 10],
      filename: `CONTRATO_${selectedSaleForContract.client.replace(/\s+/g, '_').toUpperCase()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore - html2pdf is often not typed correctly
      await html2pdf().set(opt).from(element).save();
      showToast('Download do contrato concluído!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showToast('Falha ao gerar PDF.', 'error');
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
    const pmt = i === 0 ? simValue / simInstallments : (simValue * i * Math.pow(1 + i, simInstallments)) / (Math.pow(1 + i, simInstallments) - 1);
    const productText = simProductName ? `💎 *Ativo:* ${simProductName}\n` : '';
    const text = `*SIMULAÇÃO - ${date}*\n\n${productText}📦 *Parcelas:* ${simInstallments}x\n💰 *Valor:* ${money(pmt)}\n📊 *Total:* ${money(pmt * simInstallments)}`;
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
      const dueDate = new Date(inst.dueDate).toLocaleDateString('pt-BR');
      const statusIcon = inst.status === 'Pago' ? ' ✅' : '';
      text += `• ${String(idx + 1).padStart(2, '0')}º Vencimento: ${dueDate}${statusIcon}\n`;
    });
    
    text += `\n_Gerado por Nexus Commerce em ${date}_`;
    
    window.open(`https://wa.me/${sale.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getWhatsAppShareLink = (tx: any) => {
    const valueStr = money(tx.value);
    const dateStr = new Date(tx.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const typeLabel = tx.type === 'entrada' ? 'Valor de Entrada' : `Parcela ${tx.installmentDetails?.number}/${tx.installmentDetails?.total}`;

    const text = `*COMPROVANTE DE RECEBIMENTO* ✅\n` +
                 `----------------------------------------\n` +
                 `Olá, *${tx.client}*!\n\n` +
                 `Confirmamos com sucesso o recebimento do seguinte pagamento:\n\n` +
                 `• *Operação:* ${typeLabel}\n` +
                 `• *Ativo/Produto:* ${tx.productName}\n` +
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
    const matchesSearch = !searchTerm || [s.client, s.productName, s.status].some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === 'Atrasados') {
      const hasOverdue = installments.some(i => {
        if (i.saleId !== s.id || i.status !== 'Pendente') return false;
        const d = new Date(i.dueDate);
        d.setHours(0,0,0,0);
        return d.getTime() < todayTime.getTime();
      });
      return matchesSearch && hasOverdue;
    }
    
    if (filterStatus === 'Hoje') {
      const hasDueToday = installments.some(i => {
        if (i.saleId !== s.id || i.status !== 'Pendente') return false;
        const d = new Date(i.dueDate);
        d.setHours(0,0,0,0);
        return d.getTime() === todayTime.getTime();
      });
      return matchesSearch && hasDueToday;
    }
    
    return matchesSearch;
  });
  const filteredInstallments = installments.filter(i => {
    const matchesSearch = !searchTerm || [i.client, i.productName, i.status].some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
    const day = (new Date(i.dueDate).getUTCDate()).toString();
    return matchesSearch && (!filterDay || day === filterDay);
  });
  const clientsList = Array.from(new Set(sales.map(s => s.client))) as string[];
  const filteredClients = clientsList.filter(c => !searchTerm || c.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!authReady) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col md:flex-row relative overflow-hidden font-sans select-none">
        {/* Atmosphere Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[rgba(24,24,27,0.2)] via-transparent to-transparent" />
          <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-[rgba(255,215,0,0.05)] rounded-full blur-[120px] animate-pulse" />
        </div>

        {/* Left Side: Brand Experience */}
        <div className="hidden md:flex md:w-[60%] relative flex-col justify-between p-20 z-10">
          <Logo />

          <div className="max-w-2xl">
             <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
                <h1 className="text-7xl font-black text-white leading-tight tracking-tighter">
                   A Nova Era do<br />
                   <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">Comércio de Ativos</span>
                </h1>
                
                <div className="mt-16 grid grid-cols-2 gap-12">
                   <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] border-l-2 border-gold pl-4">Segurança</h4>
                      <p className="text-zinc-500 text-xs font-medium leading-relaxed">Infraestrutura baseada em nuvem com criptografia de ponta a ponta.</p>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] border-l-2 border-gold pl-4">Performance</h4>
                      <p className="text-zinc-500 text-xs font-medium leading-relaxed">Algoritmos inteligentes para gestão de liquidez instantânea.</p>
                   </div>
                </div>
             </motion.div>
          </div>

          <div className="flex flex-col gap-1">
             <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">© 2026 NEXUS SOLUTIONS</p>
          </div>
        </div>

        {/* Right Side: Floating Login Card */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px]"
          >
            {/* Mobile Branding Only */}
            <div className="md:hidden flex flex-col items-center mb-10">
               <Logo className="scale-125" />
            </div>

            <div className="bg-[rgba(15,15,17,0.8)] backdrop-blur-3xl p-8 sm:p-14 border border-[rgba(255,255,255,0.05)] rounded-3xl sm:rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
               <div className="mb-8 sm:mb-12">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Acesso Restrito</h3>
                  <p className="text-gold text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] mt-2">NEXUS COMMERCE SOLUTIONS</p>
               </div>

               <form className="space-y-4 sm:y-6" onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }}>
                  <div className="space-y-2 group">
                     <label className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-gold">E-MAIL</label>
                     <div className="relative">
                        <Mail className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-gold transition-colors" size={16} />
                        <input 
                           type="email" 
                           required 
                           placeholder="email@nexuscommerce.com" 
                           className="w-full h-14 sm:h-16 bg-[rgba(26,26,28,0.6)] border border-[rgba(39,39,42,0.5)] rounded-xl sm:rounded-2xl pl-14 sm:pl-16 pr-6 outline-none focus:border-[rgba(255,215,0,0.3)] text-xs sm:text-sm font-medium text-white transition-all placeholder:text-zinc-700" 
                        />
                     </div>
                  </div>

                  <div className="space-y-2 group">
                     <label className="text-[9px] sm:text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-gold">SENHA</label>
                     <div className="relative">
                        <Lock className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-gold transition-colors" size={16} />
                        <input 
                           type="password" 
                           required 
                           placeholder="••••••••••••" 
                           className="w-full h-14 sm:h-16 bg-[rgba(26,26,28,0.6)] border border-[rgba(39,39,42,0.5)] rounded-xl sm:rounded-2xl pl-14 sm:pl-16 pr-6 outline-none focus:border-[rgba(255,215,0,0.3)] text-xs sm:text-sm font-medium text-white transition-all placeholder:text-zinc-700 tracking-widest" 
                        />
                     </div>
                  </div>

                  <button 
                     type="submit" 
                     className="relative w-full h-14 sm:h-16 mt-6 sm:mt-10 overflow-hidden rounded-xl sm:rounded-2xl group/btn active:scale-95 transition-all duration-300"
                  >
                     {/* Blue/Cyan Gradient Button with Shimmer */}
                     <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-white to-blue-400 group-hover:via-blue-300 transition-all duration-700" />
                     <div className="absolute inset-[1px] bg-[#020202] rounded-[15px] opacity-10" />
                     <div className="relative flex items-center justify-center h-full">
                        <span className="text-[11px] font-black uppercase text-white tracking-[0.4em] drop-shadow-sm">Entrar</span>
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-bg-[rgba(255,255,255,0.2)] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  </button>
               </form>
            </div>
            
            <div className="mt-8 text-center opacity-30">
               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.6em]">Verificação de Identidade Segura</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen bg-bg-main text-white">
      <Sidebar activeView={activeView} setActiveView={setActiveView} collapsed={collapsed} setCollapsed={setCollapsed} settings={settings} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} onLogout={() => setIsAuthenticated(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar 
          onOpenSettings={() => setActiveView('settings')} 
          onOpenMobileMenu={() => setIsMobileOpen(true)} 
          viewTitle={activeView === 'reports' ? 'Relatório Mensal' : activeView === 'dashboard' ? 'Sinergia Comercial' : activeView === 'stock' ? 'Controle de Ativos' : activeView === 'sales' ? 'Gestão de Recebíveis' : activeView === 'transactions' ? 'Histórico de Transações' : activeView === 'clients' ? 'Relacionamento' : activeView === 'settings' ? 'Configurações de Sistema' : 'Simulador de Preços'} 
        />
        <div className="p-4 sm:p-8 overflow-x-hidden custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {activeView === 'dashboard' && (
                <div className="flex flex-col gap-4 sm:gap-8 animate-view-enter">
                  <DashboardStats 
                    products={products} 
                    sales={sales} 
                    installments={installments} 
                    closings={closings}
                    onNavigate={(view, filter) => {
                      setActiveView(view);
                      if (filter) setFilterStatus(filter as any);
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
                        {sales.slice(-5).reverse().map(sale => (
                          <div 
                            key={sale.id} 
                            onClick={() => { setActiveView('sales'); setSearchTerm(sale.client); }}
                            className="p-4 sm:p-5 bg-[rgba(255,255,255,0.02)] border border-line rounded-2xl flex items-center justify-between group hover:bg-[rgba(255,215,0,0.05)] transition-all cursor-pointer active:scale-95"
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center border border-[rgba(255,215,0,0.1)] shrink-0">
                                <ShoppingBag size={16} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-black text-white italic text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[160px] uppercase tracking-tighter">{sale.productName}</span>
                                <span className="text-[8px] sm:text-[9px] text-gray-600 font-bold uppercase truncate">{sale.client}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-white italic text-xs sm:text-base">{money(sale.total)}</p>
                              <span className="text-[8px] sm:text-[9px] text-green-neon font-black uppercase">KPI OK</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card p-6 sm:p-8 flex flex-col gap-6">
                      <div 
                        onClick={() => setActiveView('stock')}
                        className="cursor-pointer group/header hover:opacity-80 transition-opacity"
                      >
                        <h3 className="text-base sm:text-lg font-black italic uppercase text-white tracking-widest">Ativos em Destaque</h3>
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

                        <div className="glass-card p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                           <h4 className="text-[10px] sm:text-xs font-black uppercase text-gray-500 tracking-[0.3em] flex items-center gap-2">
                              <Zap size={14} className="text-gold" /> Ações Rápidas
                           </h4>
                           <button onClick={() => { setSearchTerm(selectedClient!); setActiveView('sales'); }} className="h-11 sm:h-12 w-full glass hover:bg-[rgba(255,255,255,0.05)] border border-line rounded-xl sm:rounded-2xl flex items-center justify-between px-5 sm:px-6 text-[10px] sm:text-[11px] font-black uppercase tracking-widest group transition-all">
                              <span>Cobranças</span>
                              <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                           </button>
                           <button onClick={() => { setActiveView('sales'); setShowSaleForm(true); }} className="h-11 sm:h-12 w-full bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] hover:bg-[rgba(255,215,0,0.2)] text-gold rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all">
                              <ShoppingBag size={16} /> Nova Venda
                           </button>
                        </div>
                      </div>

                      {/* Histórico Comercial do Cliente */}
                      <div className="flex flex-col gap-4 sm:gap-6">
                        <section className="glass-card overflow-hidden">
                          <div className="p-4 sm:p-6 border-b border-line flex items-center justify-between">
                            <div>
                              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                                <History size={18} className="text-gold" /> Histórico Comercial
                              </h3>
                            </div>
                            <span className="pill text-[8px] sm:text-[10px]">Total: {sales.filter(s => s.client === selectedClient).length}</span>
                          </div>
                          
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[500px]">
                              <thead>
                                <tr className="border-b border-line text-[9px] sm:text-[11px] uppercase text-gray-500 font-black">
                                  <th className="p-4 sm:p-5">Ativo</th>
                                  <th className="p-4 sm:p-5">Valor</th>
                                  <th className="p-4 sm:p-5">Lucro</th>
                                  <th className="p-4 sm:p-5">Progresso</th>
                                  <th className="p-4 sm:p-5 text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[rgba(18,18,18,0.3)]">
                                {sales.filter(s => s.client === selectedClient).map(sale => (
                                  <tr key={sale.id} className="group hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                                    <td className="p-4 sm:p-5">
                                      <strong className="text-white font-bold block text-xs sm:text-sm uppercase truncate max-w-[120px]">{sale.productName}</strong>
                                      <span className="text-[8px] sm:text-[9px] text-gray-600 font-bold uppercase">ID: {sale.id.substring(0, 6)}</span>
                                    </td>
                                    <td className="p-4 sm:p-5 font-bold text-white text-xs sm:text-sm">{money(sale.total)}</td>
                                    <td className="p-4 sm:p-5 font-bold text-green-neon text-[11px] sm:text-sm">{money(sale.profit)}</td>
                                    <td className="p-4 sm:p-5">
                                       <div className="flex items-center gap-2">
                                          <div className="h-1 flex-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden border border-line-strong min-w-[50px]">
                                             <div 
                                                className="h-full bg-gold" 
                                                style={{ width: `${(installments.filter(i => i.saleId === sale.id && i.status === 'Pago').length / sale.installmentsCount) * 100}%` }}
                                             />
                                          </div>
                                          <span className="text-[8px] font-black text-gray-500 uppercase">{installments.filter(i => i.saleId === sale.id && i.status === 'Pago').length}/{sale.installmentsCount}</span>
                                       </div>
                                    </td>
                                    <td className="p-4 sm:p-5 text-right">
                                         <button 
                                            onClick={() => setSelectedSaleForContract(sale)}
                                            className="h-8 w-8 sm:h-9 sm:w-9 bg-[rgba(255,255,255,0.05)] border border-line rounded-lg sm:rounded-xl flex items-center justify-center hover:border-gold hover:text-gold transition-all ml-auto"
                                         >
                                            <FileText size={14} />
                                         </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
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
                <div className="flex flex-col gap-8 animate-view-enter">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                    <div>
                      <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white italic uppercase">Estoque de Ativos</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gold transition-colors" size={16} />
                        <input 
                          type="search" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar no estoque..." 
                          className="w-full h-11 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-[14px] pl-11 pr-4 outline-none focus:border-gold transition-all font-bold text-[11px] sm:text-xs"
                        />
                      </div>
                      <button onClick={() => setShowAddProduct(true)} className="h-11 px-6 bg-gold text-black rounded-xl sm:rounded-[14px] font-black uppercase text-[10px] sm:text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shrink-0 w-full sm:w-auto justify-center">
                        <Plus size={18} />
                        Novo Ativo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="glass-card group overflow-hidden flex flex-col border border-line-strong hover:border-[rgba(255,215,0,0.3)] transition-all duration-300">
                        <div className="aspect-[16/10] bg-[#050505] relative overflow-hidden flex items-center justify-center border-b border-[rgba(18,18,18,0.3)]">
                           {p.photo ? (
                             <img src={p.photo} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-[rgba(255,215,0,0.1)] bg-gradient-to-br from-[rgba(255,215,0,0.05)] to-transparent">
                               <Package size={48} />
                             </div>
                           )}
                           <div className="absolute top-4 left-4 z-10">
                             <span className={`px-3 py-1 rounded-[10px] text-[9px] font-black uppercase tracking-widest border shadow-lg ${p.status === 'Disponivel' ? 'bg-green-soft text-green-neon border-[rgba(57,255,20,0.2)]' : 'bg-gold-soft text-gold border-[rgba(255,215,0,0.2)]'}`}>
                               {p.status === 'Disponivel' ? 'Em Estoque' : 'Vendido'}
                             </span>
                           </div>
                           
                           {/* Overlay de ações rapidas no hover */}
                           <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center gap-3 transition-all duration-300 opacity-0 group-hover:opacity-100 z-20">
                              <button 
                                onClick={() => {
                                  setProductToEdit(p);
                                  setShowAddProduct(true);
                                  setPreviewPhoto(p.photo || null);
                                }}
                                className="w-10 h-10 rounded-xl bg-white text-black hover:bg-gold transition-colors flex items-center justify-center shadow-2xl active:scale-90"
                                title="Editar"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirm(
                                    'Excluir Ativo',
                                    'Deseja realmente remover este item do inventário?',
                                    () => {
                                      deleteProduct(p.id);
                                      showToast('Item removido do estoque.');
                                    }
                                  );
                                }}
                                className="w-10 h-10 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center justify-center shadow-2xl active:scale-90"
                                title="Excluir"
                              >
                                <X size={18} />
                              </button>
                           </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex-1">
                            <span className="text-[10px] font-black text-[rgba(255,215,0,0.6)] uppercase tracking-[0.2em]">{p.category}</span>
                            <h3 className="text-lg font-black text-white italic tracking-tight truncate mt-1 uppercase">{p.name}</h3>
                          </div>

                          <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Custo Real</span>
                               <span className="text-sm font-black text-gray-400">{money(p.cost)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[rgba(18,18,18,0.3)]">
                               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor Saída</span>
                               <span className="text-xl font-black text-gold italic">{money(p.sale)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button 
                      onClick={() => { setShowAddProduct(true); setProductToEdit(null); setPreviewPhoto(null); }}
                      className="border border-dashed border-line-strong rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 text-center group hover:border-[rgba(255,215,0,0.4)] hover:bg-[rgba(255,215,0,0.05)] transition-all duration-300 min-h-[350px]"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gold-soft text-gold grid place-items-center group-hover:scale-110 transition-transform shadow-lg border border-[rgba(255,215,0,0.1)]">
                        <Plus size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-white italic">Novo Ativo</h4>
                        <p className="text-[11px] text-gray-500 font-bold uppercase mt-1 tracking-wider leading-relaxed">Clique para adicionar<br/>ao inventário comercial</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {activeView === 'sales' && (
                <div className="flex flex-col gap-8 animate-view-enter">
                  {showSaleForm ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 sm:p-10 glass-card max-w-3xl mx-auto w-full border border-[rgba(255,215,0,0.2)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      <div className="text-center mb-8 sm:mb-10">
                         <h2 className="text-xl sm:text-3xl font-black italic uppercase text-white tracking-tighter">{saleToEdit ? 'Editar Operação' : 'Nova Venda'}</h2>
                      </div>
                      <form className="flex flex-col gap-4 sm:gap-6" onSubmit={(e) => { 
                        e.preventDefault(); 
                        const f = e.target as any; 
                        const saleData = { 
                          productId: f.productId.value, 
                          client: f.client.value, 
                          clientPhone: f.clientPhone.value, 
                          clientCpf: f.clientCpf.value, 
                          clientAddress: f.clientAddress?.value || "",
                          installments: Number(f.installments.value), 
                          firstDueDate: f.date.value, 
                          percentageAdjustment: 0, 
                          manualSalePrice: Number(f.manualSalePrice.value), 
                          downPayment: Number(f.downPayment.value),
                          isInterestOnly: isInterestOnlyForm,
                          interestRate: isInterestOnlyForm ? Number(f.interestRate?.value || 0) : 0
                        };

                        if (saleToEdit) {
                          updateSaleFull(saleToEdit.id, saleData);
                          showToast('Venda atualizada com sucesso!');
                        } else {
                          registerSale(saleData);
                          showToast('Venda comercializada com sucesso!');
                        }
                        setShowSaleForm(false); 
                        setSaleToEdit(null);
                      }}>
                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">Escolha o Ativo</label>
                           <select 
                             name="productId" 
                             required 
                             disabled={!!saleToEdit}
                             defaultValue={saleToEdit?.productId || ""}
                             className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 font-bold outline-none focus:border-gold transition-all text-xs sm:text-sm disabled:opacity-50"
                           >
                             <option value="">Selecione...</option>
                             {saleToEdit && <option value={saleToEdit.productId}>{saleToEdit.productName}</option>}
                             {products.filter(p => p.status === 'Disponivel').map(p => <option key={p.id} value={p.id} className="bg-black">{p.name} ({money(p.sale)})</option>)}
                           </select>
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

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                              <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-3">1º Vencimento</label>
                              <input name="date" type="date" required defaultValue={saleToEdit?.date ? new Date(saleToEdit.date).toISOString().split('T')[0] : ''} className="h-12 sm:h-14 bg-[rgba(0,0,0,0.4)] border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 outline-none focus:border-gold transition-all font-bold text-xs sm:text-sm" />
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
                  ) : (
                    <div className="flex flex-col gap-4 sm:gap-8">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                        <div className="w-full sm:w-auto">
                           <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white italic uppercase">Gestão de Recebíveis</h2>
                        </div>
                        <button onClick={() => { setShowSaleForm(true); setSaleToEdit(null); }} className="h-11 px-8 bg-white text-black hover:bg-gold transition-all rounded-xl sm:rounded-[14px] font-black uppercase text-[10px] sm:text-xs flex items-center gap-2 shadow-xl shrink-0 w-full sm:w-auto justify-center">
                           <ShoppingBag size={18} />
                           Nova Operação
                        </button>
                      </div>

                      {filteredSales.length === 0 && filterStatus !== 'Todos' ? (
                        <div className={`glass-card p-20 border flex flex-col items-center justify-center text-center gap-6 animate-pulse ${filterStatus === 'Atrasados' ? 'border-red-500/30 bg-red-500/5' : 'border-purple-500/30 bg-purple-500/5'}`}>
                           <div className={`w-20 h-20 rounded-3xl grid place-items-center mb-2 ${filterStatus === 'Atrasados' ? 'bg-red-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'bg-purple-500 text-white shadow-[0_0_50px_rgba(168,85,247,0.3)]'}`}>
                              {filterStatus === 'Atrasados' ? <AlertCircle size={40} /> : <Calendar size={40} />}
                           </div>
                           <h3 className="text-3xl font-black italic uppercase text-white tracking-widest">
                             {filterStatus === 'Atrasados' ? 'Nenhum Contrato em Atraso' : 'Sem Vencimentos Programados'}
                           </h3>
                           <p className="max-w-md text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] leading-relaxed">
                             {filterStatus === 'Atrasados' 
                               ? 'Sua carteira de recebíveis está 100% em conformidade técnica. Não foram localizados registros de inadimplência pendente.' 
                               : 'Não existem ciclos operacionais com vencimento datado para o presente momento.'}
                           </p>
                           <button onClick={() => setFilterStatus('Todos')} className="h-12 px-10 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                              Ver Todos os Contratos
                           </button>
                        </div>
                      ) : (
                        <section className="glass-card overflow-hidden border border-line-strong">
                        <div className="overflow-x-auto custom-scrollbar">
                           <table className="w-full min-w-[1000px] text-left">
                              <thead>
                                 <tr className="border-b border-line text-[11px] uppercase text-gray-500 font-black">
                                    <th className="p-6 font-black tracking-widest">Contrato / Cliente</th>
                                    <th className="p-6 font-black tracking-widest">Instrumento</th>
                                    <th className="p-6 font-black tracking-widest">Valor Operacional</th>
                                    <th className="p-6 font-black tracking-widest text-green-neon">Margem Lucro</th>
                                    <th className="p-6 font-black tracking-widest">Status / Ciclo</th>
                                    <th className="p-6 font-black tracking-widest text-right">Controle</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-[rgba(18,18,18,0.3)]">
                                 {filteredSales.map(sale => (
                                    <Fragment key={sale.id}>
                                    <tr className="group hover:bg-[rgba(255,255,255,0.03)] transition-all duration-300">
                                       <td className="p-6">
                                          <div className="flex flex-col">
                                             <strong className="text-white font-bold text-sm uppercase">{sale.client}</strong>
                                             {sale.clientAddress && (
                                                <span className="text-[10px] text-gray-400 mt-0.5 font-medium truncate max-w-[250px] block" title={sale.clientAddress}>
                                                  📍 {sale.clientAddress}
                                                </span>
                                             )}
                                            <span className="text-[9px] text-gray-500 font-bold uppercase mt-1">Protocal ID: {sale.id.substring(0, 8)}</span>
                                          </div>
                                       </td>
                                       <td className="p-6">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center border border-[rgba(255,215,0,0.1)] shrink-0">
                                              <ShoppingBag size={14} />
                                            </div>
                                            <span className="text-gray-300 text-[13px] font-semibold truncate max-w-[140px] uppercase">{sale.productName}</span>
                                          </div>
                                       </td>
                                       <td className="p-6">
                                          <div className="flex flex-col">
                                             <strong className="font-bold text-white text-lg">{money(sale.total)}</strong>
                                             <div className="flex items-center gap-1.5 mt-0.5">
                                                 <span className="text-[9px] text-gray-600 font-bold uppercase">{sale.installmentsCount}x {money(sale.installmentValue)}</span>
                                                 {sale.isInterestOnly && (
                                                    <span className="px-1.5 py-0.5 rounded bg-[rgba(255,215,0,0.1)] text-gold border border-[rgba(255,215,0,0.2)] text-[8px] font-black uppercase tracking-wider">
                                                       Apenas Juros ({sale.interestRate}%)
                                                    </span>
                                                 )}
                                              </div>
                                          </div>
                                       </td>
                                       <td className="p-6">
                                          <div className="flex flex-col">
                                            <span className="text-green-neon font-black text-sm">+{money(sale.profit)}</span>
                                            <span className="text-[9px] text-gray-600 font-bold uppercase">ROI Operacional</span>
                                          </div>
                                       </td>
                                       <td className="p-6">
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className={`w-2 h-2 rounded-full ${sale.status === 'Ativa' ? 'bg-gold animate-pulse' : 'bg-green-neon'}`} />
                                              <span className={`text-[10px] font-black uppercase tracking-widest ${sale.status === 'Ativa' ? 'text-gold-200' : 'text-green-neon'}`}>
                                                {sale.status === 'Ativa' ? 'Operacional' : 'Liquidado'}
                                              </span>
                                            </div>
                                            <div className="h-1 w-full max-w-[100px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
                                               <div className="h-full bg-gold" style={{ width: `${(installments.filter(i => i.saleId === sale.id && i.status === 'Pago').length / sale.installmentsCount) * 100}%` }} />
                                            </div>
                                          </div>
                                       </td>
                                       <td className="p-6 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <button 
                                              onClick={() => setSelectedSaleForContract(sale)} 
                                              className="w-10 h-10 rounded-xl border border-line bg-[rgba(255,255,255,0.02)] text-gray-400 hover:text-gold hover:border-[rgba(255,215,0,0.3)] hover:bg-[rgba(255,215,0,0.05)] transition-all flex items-center justify-center group/btn shadow-inner"
                                              title="Ver Contrato"
                                            >
                                              <FileText size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                              onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setSelectedSaleForContract(sale);
                                                // Pequeno delay para garantir que o modal abra e o elemento exista
                                                setTimeout(() => {
                                                  const element = document.getElementById('contract-content');
                                                  if (element) {
                                                    const opt = {
                                                      margin: [10, 10],
                                                      filename: `CONTRATO_${sale.client.replace(/\s+/g, '_').toUpperCase()}.pdf`,
                                                      image: { type: 'jpeg', quality: 0.98 },
                                                      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                                                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                                    };
                                                    // @ts-ignore
                                                    html2pdf().set(opt).from(element).save();
                                                    showToast('Baixando contrato...');
                                                  }
                                                }, 300);
                                              }} 
                                              className="w-10 h-10 rounded-xl border border-line bg-[rgba(255,255,255,0.02)] text-gray-400 hover:text-green-neon hover:border-[rgba(57,255,20,0.3)] hover:bg-[rgba(57,255,20,0.05)] transition-all flex items-center justify-center group/btn shadow-inner"
                                              title="Baixar PDF"
                                            >
                                              <Download size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                              onClick={() => {
                                                setSaleToEdit(sale);
                                                setShowSaleForm(true);
                                              }}
                                              className="w-10 h-10 rounded-xl border border-line bg-[rgba(255,255,255,0.02)] text-gray-400 hover:text-gold hover:border-[rgba(255,215,0,0.3)] hover:bg-[rgba(255,215,0,0.05)] transition-all flex items-center justify-center group/btn shadow-inner"
                                              title="Editar Venda"
                                            >
                                              <Pencil size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                              onClick={() => openConfirm('Estornar Operação', 'Deseja anular este registro comercial?', () => deleteSale(sale.id))} 
                                              className="w-10 h-10 rounded-xl border border-line bg-[rgba(255,255,255,0.02)] text-gray-400 hover:text-red-500 hover:border-[rgba(239,68,68,0.3)] hover:bg-red-500/5 transition-all flex items-center justify-center group/btn active:scale-95 shadow-inner"
                                            >
                                              <X size={18} />
                                            </button>
                                          </div>
                                       </td>
                                    </tr>
                                    <tr>
                                      <td colSpan={6} className="px-8 py-5 bg-[rgba(0,0,0,0.4)] shadow-inner">
                                        <div className="flex flex-col gap-4">
                                          <div className="flex items-center justify-between border-l-2 border-[rgba(255,215,0,0.4)] pl-4 py-1">
                                            <div>
                                               <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Cronograma de Liquidação</h4>
                                               <p className="text-[9px] text-gray-600 font-bold uppercase mt-1">Ciclos de Pagamento e Quitação</p>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                            {installments.filter(i => i.saleId === sale.id).sort((a,b) => a.number - b.number).map(inst => (
                                              <div 
                                                key={inst.id}
                                                className={`p-4 rounded-2xl border transition-all ${inst.status === 'Pago' ? 'border-[rgba(57,255,20,0.2)] bg-[rgba(57,255,20,0.05)]' : 'border-line-strong bg-[rgba(0,0,0,0.2)] hover:border-[rgba(255,215,0,0.3)]'} flex flex-col gap-3 relative group/inst`}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">Ciclo {inst.number}</span>
                                                  <div className={`w-1.5 h-1.5 rounded-full ${inst.status === 'Pago' ? 'bg-green-neon' : 'bg-[rgba(255,215,0,0.4)] animate-pulse'}`} />
                                                </div>
                                                <div>
                                                  <p className="text-[13px] font-bold text-white tracking-wide">{money(inst.value)}</p>
                                                  <p className="text-[9px] font-black text-gray-500 uppercase mt-0.5">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                                <div className="absolute inset-0 bg-[rgba(0,0,0,0.8)] flex items-center justify-center p-2 opacity-0 group-hover/inst:opacity-100 transition-all rounded-2xl backdrop-blur-sm">
                                                  {inst.status === 'Pendente' && (
                                                    <button 
                                                      onClick={() => setSelectedInstallmentForPayment(inst)}
                                                      className="w-full h-full bg-gold text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95"
                                                    >
                                                      Quitar
                                                    </button>
                                                  )}
                                                  {inst.status === 'Pago' && (
                                                    <button 
                                                      onClick={() => setSelectedInstallmentForReceipt(inst)}
                                                      className="w-full h-full bg-[rgba(255,255,255,0.1)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-[rgba(255,255,255,0.1)]"
                                                    >
                                                      Recibo
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex justify-end px-2">
                                            <button 
                                              onClick={() => shareSaleTableWhatsApp(sale)}
                                              className="h-10 px-6 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-green-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all flex items-center gap-2"
                                            >
                                              <MessageCircle size={14} />
                                              Compartilhar Tabela WhatsApp
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                    </Fragment>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                      </section>
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
                        placeholder="Buscar por cliente, ativo de referência, método ou ID da transação..."
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
                              <th className="p-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-sans">Ativo / Produto</th>
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
                                    {new Date(tx.date).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <strong className="text-green-neon text-base font-bold font-sans">
                                    + {money(tx.value)}
                                  </strong>
                                </td>
                                <td className="p-4 text-center">
                                  <a
                                    href={getWhatsAppShareLink(tx)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-[#25D366] text-[9px] font-black uppercase tracking-widest transition-all font-sans"
                                  >
                                    <MessageCircle size={12} />
                                    <span>WhatsApp</span>
                                  </a>
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
                <div className="flex flex-col gap-6 sm:gap-8 animate-view-enter">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                     <div>
                        <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white italic uppercase">Relatório de Resultados</h2>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Dados Consolidados do Ciclo Comercial Aberto</p>
                     </div>
                  </div>

                  {/* Bento Grid dos Dados Ativos do Ciclo Atual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="glass-card p-6 border border-zinc-850 flex flex-col justify-between h-[150px] relative overflow-hidden group">
                      <div className="absolute right-3 top-3 opacity-5 text-white"><DollarSign size={80} /></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Lucro do Ciclo Atual</span>
                      <strong className="text-3xl font-black text-gold">{money(activeSales.reduce((acc, s) => acc + (s.profit || 0), 0))}</strong>
                      <span className="text-[9px] text-zinc-400">Total acumulado desde o último fechamento</span>
                    </div>

                    <div className="glass-card p-6 border border-zinc-850 flex flex-col justify-between h-[150px] relative overflow-hidden group">
                      <div className="absolute right-3 top-3 opacity-5 text-white"><ShoppingBag size={80} /></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Vendas no Ciclo</span>
                      <strong className="text-3xl font-black text-white">{activeSales.length} Uni.</strong>
                      <span className="text-[9px] text-zinc-400">Contratos fechados e faturados</span>
                    </div>

                    <div className="glass-card p-6 border border-zinc-850 flex flex-col justify-between h-[150px] relative overflow-hidden group">
                      <div className="absolute right-3 top-3 opacity-5 text-white"><Activity size={80} /></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Volume de Negócios</span>
                      <strong className="text-3xl font-black text-green-neon">{money(activeSales.reduce((acc, s) => acc + (s.total || 0), 0))}</strong>
                      <span className="text-[9px] text-zinc-400">Faturamento total contratualizado</span>
                    </div>

                    <div className="glass-card p-6 border border-zinc-850 flex flex-col justify-between h-[150px] relative overflow-hidden group">
                      <div className="absolute right-3 top-3 opacity-5 text-white"><Wallet size={80} /></div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Valor em Entradas</span>
                      <strong className="text-3xl font-black text-blue-400">{money(activeSales.reduce((acc, s) => acc + (s.downPayment || 0), 0))}</strong>
                      <span className="text-[9px] text-zinc-400">Capital imediato em tesouraria</span>
                    </div>
                  </div>

                  {/* Seção de Fechamento de Caixa */}
                  <div className="glass-card p-6 border border-amber-500/20 bg-amber-500/[0.02] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <h3 className="text-sm font-black text-amber-200 uppercase tracking-wider">Consolidar Período e Fechar Caixa</h3>
                      </div>
                      <p className="text-xs text-amber-100/60 max-w-xl">
                        Ao realizar o fechamento do caixa mensal, o montante de lucro ativo de <strong className="text-gold font-bold">{money(activeSales.reduce((acc, s) => acc + (s.profit || 0), 0))}</strong> e as informações deste ciclo serão arquivados. O card de lucros do dashboard será reiniciado em zero para iniciar um novo ciclo comercial.
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0 items-center">
                      <input 
                        type="text"
                        placeholder="Ex: Maio de 2026"
                        id="closingPeriodInput"
                        className="h-11 px-4 bg-black/60 border border-zinc-700 rounded-xl outline-none text-xs font-semibold text-white focus:border-gold min-w-[150px]"
                      />
                      <button
                        onClick={() => {
                          const inputEl = document.getElementById('closingPeriodInput') as HTMLInputElement;
                          const periodVal = inputEl?.value?.trim() || `Ciclo - ${new Date().toLocaleDateString('pt-BR')}`;
                          const currentActiveProfit = activeSales.reduce((acc, s) => acc + (s.profit || 0), 0);
                          const currentActiveRevenue = activeSales.reduce((acc, s) => acc + (s.total || 0), 0);
                          const currentActiveCount = activeSales.length;

                          if (currentActiveCount === 0) {
                            showToast('Nenhuma operação ativa para ser fechada neste ciclo!');
                            return;
                          }
                          if (confirm(`Confirmar encerramento de período? O lucro ativo de ${money(currentActiveProfit)} será zerado e arquivado para iniciar um novo ciclo.`)) {
                            closeMonthlyRegister(periodVal, currentActiveProfit, currentActiveRevenue, currentActiveCount);
                            if (inputEl) inputEl.value = '';
                            showToast('Encerramento efetuado com absoluto sucesso!');
                          }
                        }}
                        className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[10px] sm:text-xs tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
                      >
                        Fechar Caixa
                      </button>
                    </div>
                  </div>

                  {/* Histórico de Fechamentos */}
                  <div className="glass-card border border-line-strong overflow-hidden">
                    <div className="p-6 border-b border-line-strong flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-black italic uppercase text-white">Ciclos Consolidados (Arquivados)</h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Histórico completo de períodos encerrados</p>
                      </div>
                      <span className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest">{closings?.length || 0} Fechamentos</span>
                    </div>

                    {!closings || closings.length === 0 ? (
                      <div className="p-12 text-center text-gray-500 uppercase font-black text-xs tracking-widest">
                        Nenhum encerramento de caixa arquivado até o momento.
                      </div>
                    ) : (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[700px]">
                          <thead>
                            <tr className="border-b border-line text-[10px] uppercase text-zinc-500 font-black bg-white/2">
                              <th className="p-5 font-black tracking-widest">Período Consolidado</th>
                              <th className="p-5 font-black tracking-widest text-center">Data de Fechamento</th>
                              <th className="p-5 font-black tracking-widest text-center">Quantidade de Vendas</th>
                              <th className="p-5 font-black tracking-widest text-center">Capital Movimentado</th>
                              <th className="p-5 font-black tracking-widest text-green-neon text-right">Lucro Líquido Arquivado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {closings
                              .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
                              .map((c) => (
                                <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="p-5 font-black text-sm text-white italic uppercase">
                                    📁 {c.periodName}
                                  </td>
                                  <td className="p-5 text-xs text-zinc-400 font-bold uppercase text-center">
                                    {new Date(c.closedAt).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="p-5 text-sm text-zinc-200 font-bold text-center">
                                    {c.salesCount} venda(s)
                                  </td>
                                  <td className="p-5 text-sm text-zinc-200 font-bold text-center">
                                    {money(c.totalSales || 0)}
                                  </td>
                                  <td className="p-5 text-sm font-black text-green-neon text-right">
                                    {money(c.profit || 0)}
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

              {activeView === 'simulation' && (
                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 sm:gap-10 animate-view-enter">
                  <div className="flex flex-col gap-4 sm:gap-6">
                    <div className="glass-card p-6 sm:p-10 flex flex-col gap-6 sm:gap-8 border border-[rgba(255,255,255,0.05)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                         <Calculator size={80} />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tighter">Engenharia Financeira</h3>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Cálculo de Viabilidade e Price</p>
                      </div>
                      
                      <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="flex flex-col gap-2">
                           <label className="text-[10px] font-black uppercase text-gray-500 ml-3 tracking-widest">Nome do Ativo</label>
                           <input type="text" value={simProductName} onChange={(e) => setSimProductName(e.target.value)} className="h-12 sm:h-14 bg-black border border-line-strong rounded-xl sm:rounded-2xl px-6 font-black text-sm text-white italic outline-none focus:border-gold transition-all" placeholder="Opcional: Ex. iPhone 15 Pro" />
                        </div>
                        
                        <div className="flex flex-col gap-2 relative">
                           <label className="text-[10px] font-black uppercase text-gray-500 ml-3 tracking-widest">Valor do Ativo (PV)</label>
                           <input type="number" value={simValue || ''} onChange={(e) => setSimValue(Number(e.target.value))} className="h-14 sm:h-16 bg-black border border-line-strong rounded-xl sm:rounded-[24px] px-6 sm:px-8 font-black text-lg sm:text-xl text-gold italic outline-none focus:border-gold transition-all" placeholder="0,00" />
                           <div className="absolute right-6 top-[3rem] sm:top-[3.25rem] text-gold font-black opacity-30 italic text-sm">BRL</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-500 ml-3 tracking-widest">Taxa Mensal (%)</label>
                             <input type="number" value={simRate || ''} onChange={(e) => setSimRate(Number(e.target.value))} className="h-12 sm:h-14 bg-black border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 font-black text-white italic outline-none focus:border-gold transition-all text-xs sm:text-base" placeholder="0.00" />
                          </div>
                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-500 ml-3 tracking-widest">Nº Parcelas</label>
                             <input type="number" value={simInstallments || ''} onChange={(e) => setSimInstallments(Number(e.target.value))} className="h-12 sm:h-14 bg-black border border-line-strong rounded-xl sm:rounded-2xl px-5 sm:px-6 font-black text-white italic outline-none focus:border-gold transition-all text-xs sm:text-base" placeholder="12" />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 bg-gold-soft border border-[rgba(255,215,0,0.1)] rounded-xl sm:rounded-[28px] mt-2 shadow-inner">
                         <div className="flex items-start gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gold text-black flex items-center justify-center shrink-0 shadow-lg">
                               <BadgeDollarSign size={18} />
                            </div>
                            <div>
                               <h4 className="text-[10px] sm:text-xs font-black text-gold uppercase tracking-widest">Análise de Risco</h4>
                               <p className="text-[8px] sm:text-[9px] text-[rgba(255,215,0,0.6)] font-bold uppercase mt-1 leading-relaxed italic">Validar score do cliente antes de formalizar.</p>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="glass-card p-6 border border-line-strong flex flex-col gap-4">
                       <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] flex items-center gap-2">
                          <Zap size={14} className="text-gold" /> Atalhos Rápidos
                       </h4>
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => { setSimRate(2); setSimInstallments(12); }} className="h-12 bg-[rgba(255,255,255,0.03)] border border-line hover:border-[rgba(255,215,0,0.3)] rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all">Padrão 2%</button>
                          <button onClick={() => { setSimRate(0); setSimInstallments(12); }} className="h-12 bg-[rgba(255,255,255,0.03)] border border-line hover:border-[rgba(255,215,0,0.3)] rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all">Sem Juros</button>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:gap-6 animate-view-enter" style={{ animationDelay: '0.1s' }}>
                    <div className="glass-card p-6 sm:p-12 bg-[rgba(0,0,0,0.4)] border border-line-strong flex flex-col relative overflow-hidden" id="simulation-content">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,215,0,0.5)] to-transparent opacity-30" />
                       
                       <div className="flex items-center justify-between mb-8 sm:mb-16 px-2">
                          <div>
                             <h4 className="text-[10px] sm:text-xs font-black uppercase text-gray-600 tracking-[0.4em]">Projeção Operacional</h4>
                             <p className="text-[8px] sm:text-[9px] text-gray-700 font-bold uppercase mt-1">
                                {simProductName ? `Ativo: ${simProductName}` : 'Simulação para proposta comercial'}
                             </p>
                          </div>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 border border-[rgba(255,215,0,0.2)] rounded-xl sm:rounded-2xl bg-[rgba(255,215,0,0.05)] text-gold flex items-center justify-center shadow-inner">
                             <Zap size={20} sm:size={24} />
                          </div>
                       </div>

                      {(() => {
                        const i = simRate / 100;
                        const n = simInstallments || 1;
                        const pv = simValue || 0;
                        const pmt = i === 0 ? pv / n : pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-16">
                              <div className="p-6 sm:p-10 border border-[rgba(255,255,255,0.05)] rounded-2xl sm:rounded-[40px] bg-[rgba(0,0,0,0.6)] shadow-2xl relative overflow-hidden group/card text-center sm:text-left">
                                <span className="text-[9px] sm:text-[10px] uppercase font-black text-gray-500 block mb-2 sm:mb-3 tracking-[0.3em]">Custo Mensal</span>
                                <strong className="text-3xl sm:text-5xl text-gold font-bold block">{money(pmt)}</strong>
                              </div>
                              <div className="p-6 sm:p-10 border border-[rgba(255,255,255,0.05)] rounded-2xl sm:rounded-[40px] bg-[rgba(0,0,0,0.6)] shadow-2xl relative overflow-hidden group/card text-center sm:text-left">
                                <span className="text-[9px] sm:text-[10px] uppercase font-black text-gray-500 block mb-2 sm:mb-3 tracking-[0.3em]">Total Quitação</span>
                                <strong className="text-3xl sm:text-5xl text-green-neon font-bold block">{money(pmt * n)}</strong>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 p-6 sm:p-8 border border-dashed border-line-strong rounded-2xl sm:rounded-[32px] bg-[rgba(255,255,255,0.02)] no-print">
                               <div className="flex items-center gap-4 w-full sm:w-auto">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white text-black rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                                     <Share2 size={20} sm:size={24} />
                                  </div>
                                  <div>
                                     <h5 className="text-[11px] sm:text-sm font-black text-white italic uppercase">Apresentar Proposta</h5>
                                  </div>
                               </div>
                               <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                                  <button onClick={shareSimulationWhatsApp} className="flex-1 sm:flex-none h-12 sm:h-14 px-6 bg-green-neon text-black rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-xl active:scale-95">WhatsApp</button>
                                  <button onClick={downloadSimulationPDF} className="flex-1 sm:flex-none h-12 sm:h-14 px-6 bg-gold text-black rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs shadow-xl active:scale-95">PDF</button>
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {[
                          { id: 'profile', label: 'Operador', icon: User, desc: 'Configure seus dados pessoais, foto de identificação e conta do sistema.', labelHighlight: 'Identidade' },
                          { id: 'finance', label: 'Financeiro', icon: Wallet, desc: 'Cadastre nomes de favorecido, chaves de recebimento e chaves PIX de liquidez.', labelHighlight: 'Liquidez' },
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
                           Ajuste Ativo: {activeSettingsTab === 'profile' ? 'Operador' : activeSettingsTab === 'finance' ? 'Financeiro' : 'Sistema'}
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest">Nome Completo</label>
                                    <input value={settings.userName} onChange={(e) => setSettings({...settings, userName: e.target.value})} className="h-16 bg-black border border-zinc-800 rounded-2xl px-6 font-black text-white italic outline-none focus:border-gold transition-all" />
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
              <h3 className="text-xl sm:text-2xl font-black mb-6 sm:mb-8 italic uppercase text-center">{productToEdit ? 'Editar Ativo' : 'Novo Ativo'}</h3>
              <form className="space-y-4 sm:space-y-6" onSubmit={(e) => {
                e.preventDefault(); const f = e.target as any; const file = f.photo.files[0];
                const handleSuccess = (photoUrl?: string) => { 
                  if (productToEdit) {
                    updateProduct(productToEdit.id, {
                      name: f.name.value,
                      cost: Number(f.cost.value),
                      sale: Number(f.sale.value),
                      category: f.category.value,
                      photo: photoUrl || previewPhoto || undefined
                    });
                    showToast('Ativo atualizado.');
                  } else {
                    addProduct({ name: f.name.value, cost: Number(f.cost.value), sale: Number(f.sale.value), category: f.category.value, status: 'Disponivel', photo: photoUrl }); 
                    showToast('Ativo cadastrado.');
                  }
                  setShowAddProduct(false); setProductToEdit(null); setPreviewPhoto(null); 
                };
                if (file) { const reader = new FileReader(); reader.onload = (re) => handleSuccess(re.target?.result as string); reader.readAsDataURL(file); } else { handleSuccess(); }
              }}>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Modelo</label>
                  <input name="name" required defaultValue={productToEdit?.name || ''} placeholder="Nome do Modelo" className="w-full h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 font-bold outline-none focus:border-gold text-xs sm:text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Categoria</label>
                    <select name="category" defaultValue={productToEdit?.category || 'Celular'} className="h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-4 sm:px-5 text-xs sm:text-sm"><option>Celular</option><option>Eletrônico</option><option>Hardware</option><option>Acessório</option></select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Imagem</label>
                    <div className="relative h-12 sm:h-14 border border-line-strong rounded-xl flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase text-gray-500 overflow-hidden bg-zinc-900">
                      <ImageIcon size={18} /> {previewPhoto ? 'Pronto' : 'Escolher'} <input type="file" name="photo" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (re) => setPreviewPhoto(re.target?.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Custo</label>
                    <input name="cost" type="number" step="0.01" required defaultValue={productToEdit?.cost || ''} placeholder="R$" className="h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 text-xs sm:text-sm" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase ml-2">Venda</label>
                    <input name="sale" type="number" step="0.01" required defaultValue={productToEdit?.sale || ''} placeholder="R$" className="h-12 sm:h-14 bg-zinc-900 border border-line-strong rounded-xl px-5 text-gold text-xs sm:text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full h-14 sm:h-16 bg-gold text-black rounded-2xl sm:rounded-3xl font-black uppercase text-[10px] sm:text-xs mt-2 sm:mt-4 shadow-2xl hover:brightness-110 active:scale-95 transition-all">{productToEdit ? 'Salvar' : 'Cadastrar'}</button>
                <button type="button" onClick={() => { setShowAddProduct(false); setProductToEdit(null); setPreviewPhoto(null); }} className="w-full h-10 text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">Cancelar</button>
              </form></motion.div>
            </div>
          )}

          {selectedSaleForContract && (
            <div key="modal-contract" className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6 overflow-y-auto custom-scrollbar">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSaleForContract(null)} className="fixed inset-0 bg-[rgba(0,0,0,0.9)] backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="relative bg-white w-full max-w-4xl p-8 sm:p-20 shadow-2xl overflow-hidden min-h-screen sm:min-h-0 sm:rounded-sm text-black font-sans">
                {/* Header de Ações UI (não sai na impressão) */}
                <div className="absolute top-8 right-8 flex gap-4 no-print">
                   <button onClick={downloadPDF} className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-black hover:text-white transition-all shadow-sm" title="Salvar PDF">
                      <Download size={20} />
                   </button>
                   <button onClick={() => setSelectedSaleForContract(null)} className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                      <X size={20} />
                   </button>
                </div>

                <div id="contract-content" className="bg-white p-10 sm:p-12 font-serif text-zinc-900 print:p-6">
                  <div className="max-w-[750px] mx-auto flex flex-col gap-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <h1 className="text-xl font-bold tracking-tight uppercase leading-tight max-w-lg mx-auto text-black">
                        Instrumento Particular de Compromisso de Venda e Compra
                      </h1>
                      <div className="flex justify-center gap-8 text-[8px] text-zinc-400 font-bold uppercase tracking-widest border-t border-zinc-100 pt-2">
                        <span>Documento: {selectedSaleForContract.id.substring(0, 8).toUpperCase()}</span>
                        <span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {/* Section I */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-black"></div>
                        <h2 className="text-base font-bold uppercase tracking-tight text-black">I. Das Partes Contratantes</h2>
                      </div>
                      <div className="space-y-2 text-xs leading-relaxed text-zinc-800 px-2">
                        <p><strong>VENDEDOR(A):</strong> {settings.companyName || settings.userName.toUpperCase()}, através deste terminal.</p>
                        <p><strong>COMPRADOR(A):</strong> {selectedSaleForContract.client.toUpperCase()}, CPF {selectedSaleForContract.clientCpf || 'N/A'}, telefone {selectedSaleForContract.clientPhone || 'N/A'}{selectedSaleForContract.clientAddress ? `, residente no endereço: ${selectedSaleForContract.clientAddress}` : ''}, devidamente qualificado no registro desta transação.</p>
                      </div>
                    </div>

                    {/* Section II */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-black"></div>
                        <h2 className="text-base font-bold uppercase tracking-tight text-black">II. Do Objeto e Valor</h2>
                      </div>
                      <div className="space-y-2 text-xs leading-relaxed text-zinc-800 px-2">
                        <p>O presente contrato tem por objeto a alienação de: <strong>{selectedSaleForContract.productName.toUpperCase()}</strong>.</p>
                        <p>Valor total da transação: <strong>{money(selectedSaleForContract.total)}</strong>.{selectedSaleForContract.isInterestOnly && " (Operação vinculada à modalidade de Venda por Juros - cobrança limitada à taxa de rendibilidade mensal sobre o principal)"}</p>
                        
                        <div className="mt-3 border-2 border-black rounded-xl p-4 text-center bg-zinc-50">
                           <strong className="text-base font-bold uppercase tracking-tight text-black">
                            {selectedSaleForContract.isInterestOnly ? `${selectedSaleForContract.installmentsCount} Parcelas (Apenas Juros de ${money(selectedSaleForContract.installmentValue)}) [${selectedSaleForContract.interestRate}% a.m.]` : `${selectedSaleForContract.installmentsCount} Parcelas de ${money(selectedSaleForContract.installmentValue)}`} — Vencimento Todo Dia {selectedSaleForContract.date ? new Date(selectedSaleForContract.date).getUTCDate() : (installments.find(i => i.saleId === selectedSaleForContract.id)?.dueDate ? new Date(installments.find(i => i.saleId === selectedSaleForContract.id)!.dueDate).getUTCDate() : '—')}
                           </strong>
                        </div>
                      </div>
                    </div>

                    {/* Section III */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-black"></div>
                        <h2 className="text-base font-bold uppercase tracking-tight text-black">III. Cláusulas Gerais</h2>
                      </div>
                      <div className="space-y-2 text-[11px] leading-relaxed text-zinc-700 px-2">
                        <p><strong>3.1 Inadimplemento:</strong> Atrasos implicarão em multa de 2% e juros de 1% ao mês.</p>
                        <p><strong>3.2 Validade:</strong> As partes reconhecem este registro digital como prova de contrato e confissão de dívida.</p>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-12 grid grid-cols-2 gap-16 px-4">
                      <div className="text-center space-y-2">
                        <div className="h-[1px] bg-zinc-300 w-full"></div>
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-[10px] font-bold uppercase text-black">{settings.companyName || settings.userName}</strong>
                          <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Vendedor</span>
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="h-[1px] bg-zinc-300 w-full"></div>
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-[10px] font-bold uppercase text-black">{selectedSaleForContract.client}</strong>
                          <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Comprador</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 flex justify-between border-t border-zinc-100">
                      <span className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest">Registro de Venda Comercial</span>
                      <span className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest">Link de Autenticação: {selectedSaleForContract.id.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {selectedInstallmentForReceipt && (
            <div key="modal-receipt" className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-12 overflow-y-auto backdrop-blur-md">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInstallmentForReceipt(null)} className="fixed inset-0 bg-[rgba(0,0,0,0.95)]" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-xl p-8 sm:p-20 text-blue-950 font-serif border-t-8 border-gold min-h-screen sm:min-h-0">
                <div id="receipt-content" className="flex flex-col gap-12">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col italic">
                      <h2 className="text-3xl font-black text-blue-950 tracking-tighter">NEXUS</h2>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Commerce & Logistics</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black uppercase text-gold block">Protocolo</span>
                       <span className="text-lg font-black italic">{selectedInstallmentForReceipt.id.substring(0,8)}</span>
                    </div>
                  </div>

                  <div className="text-center py-10 border-y border-gray-100 flex flex-col items-center">
                    <h3 className="text-6xl font-black text-blue-950 italic tracking-tighter">{money(selectedInstallmentForReceipt.value)}</h3>
                    <p className="text-[10px] font-bold uppercase text-gray-400 mt-6 tracking-[0.4em]">Quitação de Ciclo Operacional</p>
                  </div>

                  <div className="space-y-6 text-[15px] leading-relaxed text-gray-800">
                    <p>Confirmamos o recebimento de <strong className="uppercase border-b border-gray-300 pb-0.5 text-blue-950">{selectedInstallmentForReceipt.client}</strong> referente à liquidação da parcela <strong className="italic text-blue-950">Nº {selectedInstallmentForReceipt.number}/{selectedInstallmentForReceipt.total}</strong> relacionada ao ativo <strong className="text-blue-950 italic">{selectedInstallmentForReceipt.productName}</strong>.</p>
                    <p>Damos por este instrumento plena e total quitação pelo valor transacionado nesta data.</p>
                  </div>

                  <div className="pt-20 text-center">
                    <p className="font-black border-t border-gray-200 mt-4 pt-6 uppercase text-sm tracking-widest text-blue-950">{settings.companyName || 'NEXUS COMMERCE'}</p>
                    <p className="text-[10px] text-gray-400 mt-3 uppercase font-bold tracking-[0.2em] italic">{new Date().toLocaleDateString('pt-BR')} — {settings.city || 'Brazil'}</p>
                  </div>
                </div>
                <div className="absolute top-8 right-8 flex gap-3 no-print">
                   <button onClick={handleShareReceipt} className="w-12 h-12 rounded-2xl bg-[rgba(255,215,0,0.1)] text-gold flex items-center justify-center hover:bg-gold hover:text-black transition-all shadow-xl active:scale-90"><Share2 size={20} /></button>
                   <button onClick={() => setSelectedInstallmentForReceipt(null)} className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-xl active:scale-90"><X size={20} /></button>
                </div>
              </motion.div>
            </div>
          )}

          {selectedInstallmentForPayment && (
            <div key="modal-payment" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInstallmentForPayment(null)} className="absolute inset-0 bg-[rgba(0,0,0,0.95)] backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-[420px] glass-card p-10 bg-[#0a0a0a] border border-[rgba(255,215,0,0.2)] shadow-2xl overflow-hidden rounded-[32px]">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gold shadow-[0_0_20px_#ffd70033]" />
                 <button onClick={() => setSelectedInstallmentForPayment(null)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
                 
                 <div className="text-center mb-10">
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Liquidação de Ciclo</h3>
                    <p className="text-[10px] text-gray-600 font-bold uppercase mt-1 tracking-widest leading-none">Processamento de Recebíveis</p>
                 </div>

                 <div className="p-10 bg-[rgba(0,0,0,0.6)] rounded-[32px] border border-[rgba(255,255,255,0.05)] text-center mb-10 shadow-inner relative group overflow-hidden">
                    <div className="absolute inset-0 bg-[rgba(255,215,0,0.05)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-black text-gray-500 uppercase block mb-3 tracking-[0.3em]">Montante Quitação</span>
                    <strong className="text-5xl text-white font-black italic tracking-tighter drop-shadow-lg">{money(selectedInstallmentForPayment.value)}</strong>
                 </div>

                 <div className="flex flex-col gap-3 mb-10">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-4 mb-1">Método Verificado</label>
                    <div className="grid grid-cols-2 gap-3">
                       {['Pix', 'Dinheiro', 'Cartão', 'Transferência'].map(m => (
                         <button 
                            key={m} 
                            onClick={() => setPaymentMethod(m as any)} 
                            className={`h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${paymentMethod === m ? 'bg-gold text-black' : 'bg-[rgba(255,255,255,0.03)] text-gray-600 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,215,0,0.3)] hover:text-gray-300'}`}
                         >
                            <span className="relative z-10">{m}</span>
                            {paymentMethod === m && (
                               <motion.div layoutId="pay-active" className="absolute inset-0 bg-gold" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                            )}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button 
                    onClick={handleConfirmPayment} 
                    className="w-full h-16 bg-green-neon text-black rounded-[24px] font-black uppercase text-xs shadow-[0_10px_30px_rgba(34,197,94,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    <Zap size={20} />
                    Confirmar Quitação
                 </button>
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
