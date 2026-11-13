import { useState, useEffect } from 'react';
import { Product, Sale, Installment, Settings, Closing, SignatureAudit } from './types';
import { db, handleFirestoreError, OperationType, cleanData } from './lib/firebase';
import { getLocalDateString, parseDateSafe } from './lib/dateUtils';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  writeBatch
} from 'firebase/firestore';

const loadCached = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`nexus_cache_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Failed to parse cache for ${key}`, e);
  }
  return fallback;
};

const saveCached = (key: string, data: any) => {
  try {
    localStorage.setItem(`nexus_cache_${key}`, JSON.stringify(data));
  } catch {}
};

export function useNexusState() {
  const hasLocalCache = Boolean(
    typeof window !== 'undefined' && 
    (localStorage.getItem('nexus_cache_sales') || localStorage.getItem('nexus_cache_products'))
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(!hasLocalCache);
  const [products, setProducts] = useState<Product[]>(() => loadCached<Product[]>('products', []));
  const [sales, setSales] = useState<Sale[]>(() => loadCached<Sale[]>('sales', []));
  const [installments, setInstallments] = useState<Installment[]>(() => loadCached<Installment[]>('installments', []));
  const [closings, setClosings] = useState<Closing[]>(() => loadCached<Closing[]>('closings', []));
  const [settings, setSettings] = useState<Settings>(() => loadCached<Settings>('settings', {
    userName: 'EDIEIK BRENO',
    userRole: 'CEO / Diretor Comercial',
    userFunction: 'Vendas & Negócios',
    userEmail: 'admin@nexus.com',
    pixName: '',
    pixKey: '',
    pixType: 'Pix',
    companyName: 'Nexus Commerce',
    companyDocument: '',
    companyPhone: '',
    companyAddress: '',
    currency: 'BRL',
    language: 'pt-BR',
    theme: 'dark',
    whatsappTemplate: 'Olá, {cliente}! Passando para lembrar que a sua parcela {parcela} do produto {produto} no valor de {valor} vence em {vencimento}.\n\nPara facilitar o pagamento, você pode utilizar a chave Pix abaixo:\nChave Pix: {chave_pix}\nBeneficiário: {nome_pix}\n\nSe tiver qualquer dúvida, fique à vontade para falar conosco!',
    currentOperator: 'operator1',
    op1Name: 'EDIEIK BRENO',
    op1Role: 'Diretor Comercial',
    op1Function: 'Vendas & Negócios',
    op1Email: 'op1@nexus.com',
    op1PixName: '',
    op1PixKey: '',
    op1PixType: 'Pix',
    op2Name: 'Operador 2',
    op2Role: 'Financeiro',
    op2Function: 'Controle de Recebimentos',
    op2Email: 'op2@nexus.com',
    op2PixName: '',
    op2PixKey: '',
    op2PixType: 'Pix'
  }));

  // Real-time synchronization
  useEffect(() => {
    let loadedProducts = false;
    let loadedSales = false;

    const checkFinished = () => {
      if (loadedProducts && loadedSales) {
        setIsInitialLoading(false);
      }
    };

    // Safety fallback so loading never hangs
    const safetyTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      setProducts(data);
      saveCached('products', data);
      loadedProducts = true;
      checkFinished();
    }, (err) => {
      console.warn("Snapshot notice [products]:", err?.code || err);
      if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
      loadedProducts = true;
      checkFinished();
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale));
      setSales(data);
      saveCached('sales', data);
      loadedSales = true;
      checkFinished();
    }, (err) => {
      console.warn("Snapshot notice [sales]:", err?.code || err);
      if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.LIST, 'sales');
      }
      loadedSales = true;
      checkFinished();
    });

    const unsubInstallments = onSnapshot(collection(db, 'installments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Installment));
      setInstallments(data);
      saveCached('installments', data);
    }, (err) => {
      console.warn("Snapshot notice [installments]:", err?.code || err);
      if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.LIST, 'installments');
      }
    });

    const unsubClosings = onSnapshot(collection(db, 'closings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Closing));
      setClosings(data);
      saveCached('closings', data);
    }, (err) => {
      console.warn("Snapshot notice [closings]:", err?.code || err);
      if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.LIST, 'closings');
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const rawSettings = docSnapshot.data() as Settings;
        const currentOperator = rawSettings.currentOperator || 'operator1';

        const rawOp1 = rawSettings.op1Name ?? rawSettings.userName;
        const op1Name = (rawOp1 && rawOp1.toLowerCase() !== 'nexus commerce' && rawOp1.toLowerCase() !== 'empresa')
          ? rawOp1
          : 'EDIEIK BRENO';
        const op1Role = rawSettings.op1Role ?? rawSettings.userRole ?? 'Financeiro';
        const op1Function = rawSettings.op1Function ?? rawSettings.userFunction ?? 'Vendas & Negócios';
        const op1Email = rawSettings.op1Email ?? rawSettings.userEmail ?? 'op1@nexus.com';
        const op1Photo = rawSettings.op1Photo ?? rawSettings.profilePhoto;
        const op1PixName = rawSettings.op1PixName ?? rawSettings.pixName ?? '';
        const op1PixKey = rawSettings.op1PixKey ?? rawSettings.pixKey ?? '';
        const op1PixType = rawSettings.op1PixType ?? rawSettings.pixType ?? 'Pix';

        const op2Name = rawSettings.op2Name ?? 'Operador 2';
        const op2Role = rawSettings.op2Role ?? 'Diretor';
        const op2Function = rawSettings.op2Function ?? 'Controle de Recebimentos';
        const op2Email = rawSettings.op2Email ?? 'op2@nexus.com';
        const op2Photo = rawSettings.op2Photo;
        const op2PixName = rawSettings.op2PixName ?? '';
        const op2PixKey = rawSettings.op2PixKey ?? '';
        const op2PixType = rawSettings.op2PixType ?? 'Pix';

        const activeName = currentOperator === 'operator2' ? op2Name : op1Name;
        const activeRole = currentOperator === 'operator2' ? op2Role : op1Role;
        const activeFunction = currentOperator === 'operator2' ? op2Function : op1Function;
        const activeEmail = currentOperator === 'operator2' ? op2Email : op1Email;
        const activePhoto = currentOperator === 'operator2' ? op2Photo : op1Photo;
        const activePixName = currentOperator === 'operator2' ? op2PixName : op1PixName;
        const activePixKey = currentOperator === 'operator2' ? op2PixKey : op1PixKey;
        const activePixType = currentOperator === 'operator2' ? op2PixType : op1PixType;

        const mergedSettings: Settings = {
          ...rawSettings,
          currentOperator,
          userName: activeName,
          userRole: activeRole,
          userFunction: activeFunction,
          userEmail: activeEmail,
          profilePhoto: activePhoto,
          pixName: activePixName,
          pixKey: activePixKey,
          pixType: activePixType,
          op1Name, op1Role, op1Function, op1Email, op1Photo, op1PixName, op1PixKey, op1PixType,
          op2Name, op2Role, op2Function, op2Email, op2Photo, op2PixName, op2PixKey, op2PixType,
        };

        setSettings(mergedSettings);
        saveCached('settings', mergedSettings);
      }
    }, (err) => {
      console.warn("Snapshot notice [settings]:", err?.code || err);
      if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.GET, 'settings/config');
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubProducts();
      unsubSales();
      unsubInstallments();
      unsubClosings();
      unsubSettings();
    };
  }, []);

  const saveSettings = async (newSettings: Settings) => {
    try {
      const currentOperator = newSettings.currentOperator || 'operator1';

      if (currentOperator === 'operator1') {
        newSettings.op1Name = newSettings.userName;
        newSettings.op1Role = newSettings.userRole;
        newSettings.op1Function = newSettings.userFunction;
        newSettings.op1Email = newSettings.userEmail;
        newSettings.op1Photo = newSettings.profilePhoto;
        newSettings.op1PixName = newSettings.pixName;
        newSettings.op1PixKey = newSettings.pixKey;
        newSettings.op1PixType = newSettings.pixType;
      } else {
        newSettings.op2Name = newSettings.userName;
        newSettings.op2Role = newSettings.userRole;
        newSettings.op2Function = newSettings.userFunction;
        newSettings.op2Email = newSettings.userEmail;
        newSettings.op2Photo = newSettings.profilePhoto;
        newSettings.op2PixName = newSettings.pixName;
        newSettings.op2PixKey = newSettings.pixKey;
        newSettings.op2PixType = newSettings.pixType;
      }

      await setDoc(doc(db, 'settings', 'config'), cleanData(newSettings));
      setSettings(newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/config');
    }
  };

  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const newProduct: Product = {
      ...p,
      quantity: p.quantity !== undefined ? p.quantity : 1,
      id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'products', id), cleanData(newProduct));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), cleanData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const registerSale = async (data: {
    productId: string;
    client: string;
    clientPhone: string;
    clientCpf: string;
    clientAddress?: string;
    installments: number;
    saleDate?: string;
    firstDueDate: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
    isInterestOnly?: boolean;
    interestRate?: number;
    costPrice?: number;
    sellerName?: string;
  }): Promise<boolean> => {
    try {
      const cleanProdId = (data.productId || '').trim();
      let product = products.find(p => p.id === cleanProdId || p.id === data.productId || String(p.id).trim() === cleanProdId);
      
      // Fallback if product not found in memory (e.g. freshly created or ID mismatch)
      if (!product) {
        console.warn('Produto não encontrado exatamente por ID, buscando correspondência ou fallback:', cleanProdId);
        product = {
          id: cleanProdId || crypto.randomUUID(),
          name: 'Ativo Comercial',
          cost: data.costPrice || 0,
          sale: data.manualSalePrice || 0,
          category: 'Geral',
          status: 'Vendido',
          createdAt: new Date().toISOString(),
          quantity: 0
        };
      }

      const salePrice = data.manualSalePrice || product.sale || 0;
      const adjustAmount = (salePrice * (data.percentageAdjustment || 0)) / 100;
      const finalTotal = salePrice + adjustAmount;
      
      let installmentValue = 0;
      if (data.isInterestOnly) {
        installmentValue = finalTotal * ((data.interestRate || 0) / 100);
      } else {
        const remainingToFinance = Math.max(0, finalTotal - (data.downPayment || 0));
        installmentValue = data.installments > 0 ? remainingToFinance / data.installments : 0;
      }
      
      const costForProfit = data.costPrice !== undefined ? data.costPrice : (product.cost || 0);
      const profit = finalTotal - costForProfit;

      const defaultSeller = (settings.userName && settings.userName.toLowerCase() !== 'nexus commerce')
        ? settings.userName
        : ((settings.currentOperator === 'operator2' ? settings.op2Name : settings.op1Name) || 'EDIEIK BRENO');

      const actualSaleDate = data.saleDate || getLocalDateString();
      const saleId = crypto.randomUUID();
      const newSale: Sale = {
        id: saleId,
        productId: product.id,
        productName: product.name,
        client: (data.client || '').trim(),
        clientPhone: (data.clientPhone || '').trim(),
        clientCpf: (data.clientCpf || '').trim(),
        clientAddress: (data.clientAddress || '').trim(),
        total: finalTotal,
        downPayment: data.downPayment || 0,
        profit: profit,
        installmentsCount: data.installments,
        installmentValue: installmentValue,
        date: actualSaleDate,
        status: 'Ativa',
        createdAt: new Date().toISOString(),
        isInterestOnly: data.isInterestOnly || false,
        interestRate: data.interestRate || 0,
        costPrice: costForProfit,
        sellerName: data.sellerName || defaultSeller
      };

      const currentQty = product.quantity !== undefined ? product.quantity : 1;
      const updatedProductQty = currentQty > 1 ? currentQty - 1 : 0;
      const updatedProductStatus = currentQty > 1 ? 'Disponivel' : 'Vendido';

      const parsedDate = parseDateSafe(data.firstDueDate) || {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate()
      };
      const y = parsedDate.year;
      const m = parsedDate.month;
      const d = parsedDate.day;

      const newInstallmentsList: Installment[] = [];
      for (let i = 1; i <= data.installments; i++) {
        const dueDate = new Date(y, m - 1 + (i - 1), d, 12, 0, 0);
        if (dueDate.getDate() !== d) dueDate.setDate(0);
        
        const instId = crypto.randomUUID();
        newInstallmentsList.push({
          id: instId,
          saleId: saleId,
          client: (data.client || '').trim(),
          productName: product.name,
          number: i,
          total: data.installments,
          value: installmentValue,
          dueDate: dueDate.toISOString(),
          status: 'Pendente'
        });
      }

      const cleanSale = cleanData(newSale);
      const cleanInstallments = newInstallmentsList.map(cleanData);

      // Atualização imediata do estado local (UI reativa e fluida)
      setSales(prev => [cleanSale, ...prev.filter(s => s.id !== saleId)]);
      setInstallments(prev => [...prev.filter(i => i.saleId !== saleId), ...cleanInstallments]);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: updatedProductQty, status: updatedProductStatus } : p));

      // Salva no cache local para persistência instantânea
      saveCached('sales', [cleanSale, ...sales.filter(s => s.id !== saleId)]);
      saveCached('installments', [...installments.filter(i => i.saleId !== saleId), ...cleanInstallments]);
      saveCached('products', products.map(p => p.id === product.id ? { ...p, quantity: updatedProductQty, status: updatedProductStatus } : p));

      // Gravação em lote no Firestore
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'sales', saleId), cleanSale);
        
        if (product.id) {
          batch.set(doc(db, 'products', product.id), { 
            quantity: updatedProductQty,
            status: updatedProductStatus
          }, { merge: true });
        }

        for (const inst of cleanInstallments) {
          batch.set(doc(db, 'installments', inst.id), inst);
        }

        await batch.commit();
        return true;
      } catch (err: any) {
        console.warn('Erro ao gravar lote de venda no Firestore, tentando persistência direta (fallback):', err);
        try {
          await setDoc(doc(db, 'sales', saleId), cleanSale, { merge: true });
          if (product.id) {
            await setDoc(doc(db, 'products', product.id), { 
              quantity: updatedProductQty, 
              status: updatedProductStatus 
            }, { merge: true });
          }
          for (const inst of cleanInstallments) {
            await setDoc(doc(db, 'installments', inst.id), inst, { merge: true });
          }
          return true;
        } catch (innerErr: any) {
          console.error('Falha no fallback de gravação da venda:', innerErr);
          if (innerErr?.code !== 'unavailable') {
            handleFirestoreError(innerErr, OperationType.WRITE, `sales/${saleId}`);
          }
          // Mesmo em modo offline temporário, o estado local e cache já foram atualizados com sucesso
          return true;
        }
      }
    } catch (fatalErr) {
      console.error('Erro inesperado em registerSale:', fatalErr);
      return false;
    }
  };

  const deleteSale = async (id: string): Promise<boolean> => {
    try {
      const cleanId = (id || '').trim();
      const sale = sales.find(s => s.id === cleanId || s.id === id);
      
      // Atualização imediata do estado local (garante remoção instantânea no Dashboard e em todas as telas)
      setSales(prev => prev.filter(s => s.id !== cleanId && s.id !== id));
      setInstallments(prev => prev.filter(i => i.saleId !== cleanId && i.saleId !== id));
      if (sale && sale.productId) {
        setProducts(prev => prev.map(p => p.id === sale.productId ? { ...p, quantity: (p.quantity !== undefined ? p.quantity : 0) + 1, status: 'Disponivel' } : p));
      }

      const batch = writeBatch(db);
      
      if (sale && sale.productId) {
        const p = products.find(prod => prod.id === sale.productId);
        if (p) {
          const currentQty = p.quantity !== undefined ? p.quantity : 0;
          batch.set(doc(db, 'products', sale.productId), { 
            quantity: currentQty + 1,
            status: 'Disponivel' 
          }, { merge: true });
        }
      }
      
      batch.delete(doc(db, 'sales', cleanId));
      if (cleanId !== id) {
        batch.delete(doc(db, 'sales', id));
      }
      
      const saleInstallments = installments.filter(i => i.saleId === cleanId || i.saleId === id);
      saleInstallments.forEach(i => {
        batch.delete(doc(db, 'installments', i.id));
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error('Erro no lote do Firestore ao excluir contrato, acionando fallback individual:', err);
      try {
        const cleanId = (id || '').trim();
        await deleteDoc(doc(db, 'sales', cleanId));
        if (cleanId !== id) {
          await deleteDoc(doc(db, 'sales', id)).catch(() => {});
        }
        const saleInstallments = installments.filter(i => i.saleId === cleanId || i.saleId === id);
        for (const inst of saleInstallments) {
          await deleteDoc(doc(db, 'installments', inst.id)).catch(() => {});
        }
        return true;
      } catch (fallbackErr) {
        console.error('Erro no fallback de exclusão de contrato:', fallbackErr);
        handleFirestoreError(fallbackErr, OperationType.DELETE, `sales/${id}`);
        return false;
      }
    }
  };

  const deleteClient = async (clientName: string): Promise<boolean> => {
    try {
      const clientSales = sales.filter(s => s.client === clientName);
      
      // Atualização imediata do estado local
      setSales(prev => prev.filter(s => s.client !== clientName));
      setInstallments(prev => prev.filter(i => i.client !== clientName));

      const batch = writeBatch(db);
      
      clientSales.forEach(s => {
        if (s.productId) {
          const p = products.find(prod => prod.id === s.productId);
          if (p) {
            const currentQty = p.quantity !== undefined ? p.quantity : 0;
            batch.set(doc(db, 'products', s.productId), { 
              quantity: currentQty + 1,
              status: 'Disponivel' 
            }, { merge: true });
          }
        }
        batch.delete(doc(db, 'sales', s.id));
      });

      const clientInstallments = installments.filter(i => i.client === clientName);
      clientInstallments.forEach(i => {
        batch.delete(doc(db, 'installments', i.id));
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      handleFirestoreError(err, OperationType.WRITE, 'batch/deleteClient');
      return false;
    }
  };

  const payInstallment = async (id: string, paymentMethod: string) => {
    try {
      const inst = installments.find(i => i.id === id);
      if (!inst) return;
      const correspondingSale = sales.find(s => s.id === inst.saleId);

      const batch = writeBatch(db);

      batch.update(doc(db, 'installments', id), cleanData({
        status: 'Pago',
        paidAt: new Date().toISOString(),
        paymentMethod
      }));

      if (correspondingSale?.isInterestOnly) {
        // Automatically renew for 30 days
        const baseDate = inst.dueDate ? new Date(inst.dueDate) : new Date();
        const nextDueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate(), 12);
        
        if (nextDueDate.getDate() !== baseDate.getDate()) {
          nextDueDate.setDate(0);
        }

        const instId = crypto.randomUUID();
        const nextNumber = inst.number + 1;
        const newTotal = Math.max(correspondingSale.installmentsCount, nextNumber);

        batch.update(doc(db, 'sales', correspondingSale.id), {
          installmentsCount: newTotal
        });

        batch.set(doc(db, 'installments', instId), cleanData({
          id: instId,
          saleId: correspondingSale.id,
          client: inst.client,
          productName: inst.productName,
          number: nextNumber,
          total: newTotal,
          value: correspondingSale.installmentValue !== undefined ? correspondingSale.installmentValue : inst.value,
          dueDate: nextDueDate.toISOString(),
          status: 'Pendente'
        }));
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `installments/${id}`);
    }
  };

  const amortizeSale = async (saleId: string, amount: number, paymentMethod: string) => {
    try {
      const cleanSaleId = (saleId || '').trim();
      const sale = sales.find(s => s.id === cleanSaleId || s.id === saleId);
      if (!sale) return;

      const numAmount = Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
      const newTotal = Number(Math.max(0, sale.total - numAmount).toFixed(2));
      const isLiquidated = newTotal <= 0.009;
      
      let newInstallmentValue = 0;
      if (isLiquidated) {
        newInstallmentValue = 0;
      } else if (sale.isInterestOnly) {
        newInstallmentValue = Number((newTotal * ((Number(sale.interestRate) || 0) / 100)).toFixed(2));
      } else {
        const pendingCount = installments.filter(i => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente').length;
        newInstallmentValue = pendingCount > 0 ? Number((newTotal / pendingCount).toFixed(2)) : 0;
      }
      const newStatus = isLiquidated ? 'Liquidada' : 'Ativa';

      // Atualização imediata do estado local
      setSales(prev => prev.map(s => (s.id === cleanSaleId || s.id === saleId) ? {
        ...s,
        total: newTotal,
        installmentValue: newInstallmentValue,
        status: newStatus
      } : s));

      const batch = writeBatch(db);

      batch.set(doc(db, 'sales', cleanSaleId), {
        total: newTotal,
        installmentValue: newInstallmentValue,
        status: newStatus
      }, { merge: true });

      // Registrar o pagamento correspondente à amortização no histórico de parcelas pagas
      const amortInstId = crypto.randomUUID();
      const nextNumber = (installments.filter(i => i.saleId === cleanSaleId || i.saleId === saleId).length) + 1;
      
      const amortInst: Installment = {
        id: amortInstId,
        saleId: cleanSaleId,
        client: sale.client,
        productName: `${sale.productName} (Amortização de Principal)`,
        number: nextNumber,
        total: Math.max(sale.installmentsCount, nextNumber),
        value: numAmount,
        dueDate: new Date().toISOString(),
        status: 'Pago',
        paidAt: new Date().toISOString(),
        paymentMethod: paymentMethod
      };

      batch.set(doc(db, 'installments', amortInstId), cleanData(amortInst));

      if (isLiquidated) {
        // Remover parcelas pendentes já que o contrato foi totalmente quitado
        const pending = installments.filter(i => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente');
        pending.forEach(p => {
          batch.delete(doc(db, 'installments', p.id));
        });
        setInstallments(prev => [
          ...prev.filter(i => !( (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente' )),
          amortInst
        ]);
      } else {
        // Atualizar todas as parcelas pendentes ativas para o novo valor
        const pending = installments.filter(i => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente');
        pending.forEach(p => {
          batch.set(doc(db, 'installments', p.id), {
            value: newInstallmentValue
          }, { merge: true });
        });
        setInstallments(prev => [
          ...prev.map(i => ((i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente') ? { ...i, value: newInstallmentValue } : i),
          amortInst
        ]);
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}/amortize`);
    }
  };

  const updateSaleFull = async (id: string, data: {
    productId?: string;
    client: string;
    clientPhone: string;
    clientCpf: string;
    clientAddress?: string;
    installments: number;
    saleDate?: string;
    firstDueDate?: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
    isInterestOnly?: boolean;
    interestRate?: number;
    costPrice?: number;
    sellerName?: string;
  }, fallbackSale?: Partial<Sale>): Promise<boolean> => {
    const cleanId = (id || '').trim();
    let sale = sales.find(s => s.id === cleanId || s.id === id || String(s.id).trim() === cleanId);
    if (!sale && fallbackSale) {
      sale = fallbackSale as Sale;
    }
    if (!sale) {
      console.warn('Venda não encontrada em cache para atualização, utilizando dados fornecidos:', id);
      sale = {
        id: cleanId,
        productId: data.productId || '',
        productName: 'Produto Comercial',
        client: data.client,
        clientPhone: data.clientPhone,
        total: data.manualSalePrice,
        downPayment: data.downPayment,
        profit: 0,
        installmentsCount: data.installments,
        installmentValue: 0,
        date: data.saleDate || getLocalDateString(),
        status: 'Ativa',
        createdAt: new Date().toISOString()
      };
    }

    if (sale.isSigned || sale.signature?.signed) {
      console.warn('Tentativa de editar contrato já assinado bloqueada:', cleanId);
      return false;
    }

    const oldProductId = sale.productId;
    const newProductId = data.productId || oldProductId;
    const product = products.find(p => p.id === newProductId);
    const productName = product?.name || sale.productName || 'Produto Comercial';

    const salePrice = (data.manualSalePrice !== undefined && Number.isFinite(data.manualSalePrice) && data.manualSalePrice > 0)
      ? data.manualSalePrice 
      : (product?.sale || sale.total || 0);

    const adjustAmount = (salePrice * (Number(data.percentageAdjustment) || 0)) / 100;
    const finalTotal = Math.max(0, salePrice + adjustAmount);
    const installmentsCount = Math.max(1, Number(data.installments) || 1);
    const downPayment = Number.isFinite(data.downPayment) ? Math.max(0, data.downPayment) : 0;
    
    let installmentValue = 0;
    if (data.isInterestOnly) {
      installmentValue = finalTotal * ((Number(data.interestRate) || 0) / 100);
    } else {
      const remainingToFinance = Math.max(0, finalTotal - downPayment);
      installmentValue = installmentsCount > 0 ? remainingToFinance / installmentsCount : 0;
    }
    
    const costForProfit = (data.costPrice !== undefined && Number.isFinite(data.costPrice))
      ? data.costPrice 
      : (sale.costPrice !== undefined ? sale.costPrice : (product?.cost || 0));
    const profit = finalTotal - costForProfit;

    const defaultSeller = (settings.userName && settings.userName.toLowerCase() !== 'nexus commerce')
      ? settings.userName
      : ((settings.currentOperator === 'operator2' ? settings.op2Name : settings.op1Name) || 'EDIEIK BRENO');

    const updatedSaleDate = data.saleDate || sale.date || getLocalDateString();
    const updatedSale: Partial<Sale> = {
      client: (data.client || '').trim(),
      clientPhone: data.clientPhone || '',
      clientCpf: data.clientCpf || '',
      clientAddress: data.clientAddress || '',
      total: finalTotal,
      downPayment: downPayment,
      profit: profit,
      installmentsCount: installmentsCount,
      installmentValue: installmentValue,
      date: updatedSaleDate,
      isInterestOnly: Boolean(data.isInterestOnly),
      interestRate: Number(data.interestRate) || 0,
      costPrice: costForProfit,
      productId: newProductId,
      productName: productName,
      sellerName: data.sellerName || sale.sellerName || defaultSeller
    };

    // Atualização imediata do estado local
    setSales(prev => {
      const exists = prev.some(s => s.id === cleanId || s.id === id);
      const updated = exists 
        ? prev.map(s => (s.id === cleanId || s.id === id) ? { ...s, ...updatedSale, id: s.id } as Sale : s)
        : [...prev, { ...sale, ...updatedSale, id: cleanId } as Sale];
      saveCached('sales', updated);
      return updated;
    });

    const batch = writeBatch(db);
    batch.set(doc(db, 'sales', cleanId), cleanData(updatedSale), { merge: true });

    // Se o ativo associado foi alterado, ajusta o estoque do ativo anterior e do novo ativo
    if (oldProductId && newProductId && oldProductId !== newProductId) {
      const oldProd = products.find(p => p.id === oldProductId);
      if (oldProd) {
        const restoredQty = (oldProd.quantity !== undefined ? oldProd.quantity : 0) + 1;
        batch.set(doc(db, 'products', oldProductId), { quantity: restoredQty, status: 'Disponivel' }, { merge: true });
        setProducts(prev => prev.map(p => p.id === oldProductId ? { ...p, quantity: restoredQty, status: 'Disponivel' } : p));
      }
      if (product) {
        const newQty = Math.max(0, (product.quantity !== undefined ? product.quantity : 1) - 1);
        const newStatus = newQty === 0 ? 'Vendido' : 'Disponivel';
        batch.set(doc(db, 'products', newProductId), { quantity: newQty, status: newStatus }, { merge: true });
        setProducts(prev => prev.map(p => p.id === newProductId ? { ...p, quantity: newQty, status: newStatus } : p));
      }
    }

    const firstInst = installments.find(i => (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) && i.number === 1);
    const existingDue = firstInst?.dueDate ? getLocalDateString(firstInst.dueDate) : '';
    const dueDateChanged = Boolean(data.firstDueDate && existingDue && data.firstDueDate !== existingDue);
    const needsRegen = sale.installmentsCount !== installmentsCount || 
                       Math.abs((sale.total || 0) - finalTotal) > 0.01 || 
                       Boolean(sale.isInterestOnly) !== Boolean(data.isInterestOnly) ||
                       (data.isInterestOnly && sale.interestRate !== data.interestRate) ||
                       dueDateChanged;

    let newInstallmentsList: Installment[] = [];

    if (needsRegen && (data.firstDueDate || existingDue)) {
      const targetDueDateStr = data.firstDueDate || existingDue;
      const parsedDate = parseDateSafe(targetDueDateStr) || { 
        year: new Date().getFullYear(), 
        month: new Date().getMonth() + 1, 
        day: new Date().getDate() 
      };
      const y = parsedDate.year;
      const m = parsedDate.month;
      const d = parsedDate.day;

      const existingPaid = installments.filter(i => (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) && i.status === 'Pago');
      const paidNumbers = new Set(existingPaid.map(i => i.number));

      // Exclui apenas parcelas pendentes antigas no Firestore
      installments.filter(i => (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) && i.status !== 'Pago').forEach(i => {
        batch.delete(doc(db, 'installments', i.id));
      });

      // Atualiza dados cadastrais (cliente, produto) das parcelas já pagas sem apagar o pagamento
      existingPaid.forEach(paidInst => {
        batch.set(doc(db, 'installments', paidInst.id), cleanData({
          client: (data.client || '').trim(),
          productName: productName,
          total: installmentsCount
        }), { merge: true });
      });

      for (let i = 1; i <= installmentsCount; i++) {
        if (paidNumbers.has(i)) {
          continue;
        }

        const dueDate = new Date(y, m - 1 + (i - 1), d, 12, 0, 0);
        if (dueDate.getDate() !== d) dueDate.setDate(0);
        
        const instId = crypto.randomUUID();
        const newInst: Installment = {
          id: instId,
          saleId: cleanId,
          client: (data.client || '').trim(),
          productName: productName,
          number: i,
          total: installmentsCount,
          value: installmentValue,
          dueDate: dueDate.toISOString(),
          status: 'Pendente'
        };
        newInstallmentsList.push(newInst);
        batch.set(doc(db, 'installments', instId), cleanData(newInst));
      }

      const updatedPaidList = existingPaid.map(p => ({
        ...p,
        client: (data.client || '').trim(),
        productName: productName,
        total: installmentsCount
      }));

      setInstallments(prev => {
        const next = [
          ...prev.filter(i => String(i.saleId).trim() !== cleanId && i.saleId !== id),
          ...updatedPaidList,
          ...newInstallmentsList
        ];
        saveCached('installments', next);
        return next;
      });
    } else {
      installments.filter(i => i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId).forEach(i => {
        batch.set(doc(db, 'installments', i.id), cleanData({ 
          client: (data.client || '').trim(),
          productName: productName
        }), { merge: true });
      });

      setInstallments(prev => {
        const next = prev.map(i => (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) 
          ? { ...i, client: (data.client || '').trim(), productName } 
          : i
        );
        saveCached('installments', next);
        return next;
      });
    }

    try {
      await batch.commit();
      return true;
    } catch (err: any) {
      console.warn('Erro ao atualizar venda/contrato no lote, tentando persistência direta:', err);
      try {
        await setDoc(doc(db, 'sales', cleanId), cleanData(updatedSale), { merge: true });
        return true;
      } catch (fallbackErr: any) {
        console.error('Falha no fallback de atualização do contrato:', fallbackErr);
        if (fallbackErr?.code !== 'unavailable') {
          handleFirestoreError(fallbackErr, OperationType.WRITE, `sales/${cleanId}`);
        }
        return true;
      }
    }
  };

  const advanceInstallments = async (
    saleId: string,
    items: Array<{ id: string; discountPercentage: number }>,
    paymentMethod: string
  ) => {
    try {
      const cleanSaleId = (saleId || '').trim();
      const sale = sales.find(s => s.id === cleanSaleId || s.id === saleId);
      if (!sale) return;

      const batch = writeBatch(db);
      const itemMap = new Map(items.map(item => [item.id, item.discountPercentage]));

      const targetInstallments = installments.filter(i => itemMap.has(i.id));
      if (targetInstallments.length === 0) return;

      const updatedInstallmentsMap = new Map<string, Partial<Installment>>();

      targetInstallments.forEach(inst => {
        const discountPct = Number(itemMap.get(inst.id)) || 0;
        const origValue = Number(inst.value) || 0;
        const discountVal = Number(((origValue * discountPct) / 100).toFixed(2));
        const finalVal = Number(Math.max(0, origValue - discountVal).toFixed(2));

        const updateData: Partial<Installment> = {
          status: 'Pago',
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod,
          value: finalVal,
          originalValue: origValue,
          discountPercentage: discountPct,
          discountAmount: discountVal,
          isAdvanced: true
        };

        updatedInstallmentsMap.set(inst.id, updateData);

        batch.set(doc(db, 'installments', inst.id), cleanData(updateData), { merge: true });
      });

      const targetIds = new Set(items.map(i => i.id));
      const remainingPending = installments.filter(i => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente' && !targetIds.has(i.id));
      const isNowLiquidated = remainingPending.length === 0;

      if (isNowLiquidated) {
        batch.set(doc(db, 'sales', cleanSaleId), {
          status: 'Liquidada'
        }, { merge: true });

        setSales(prev => prev.map(s => (s.id === cleanSaleId || s.id === saleId) ? { ...s, status: 'Liquidada' } : s));
      }

      setInstallments(prev => prev.map(inst => {
        if (updatedInstallmentsMap.has(inst.id)) {
          return { ...inst, ...updatedInstallmentsMap.get(inst.id) } as Installment;
        }
        return inst;
      }));

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}/advanceInstallments`);
    }
  };

  const closeMonthlyRegister = async (periodName: string, profit: number, totalSales: number, salesCount: number) => {
    const id = crypto.randomUUID();
    const newClosing: Closing = {
      id,
      closedAt: new Date().toISOString(),
      periodName,
      profit,
      totalSales,
      salesCount
    };
    try {
      await setDoc(doc(db, 'closings', id), cleanData(newClosing));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `closings/${id}`);
    }
  };

  const deleteClosing = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'closings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `closings/${id}`);
    }
  };

  const saveDigitalSignature = async (saleId: string, audit: SignatureAudit): Promise<boolean> => {
    try {
      const cleanId = (saleId || '').trim();
      
      const signatureUpdates = {
        signature: audit,
        isSigned: true,
        signatureImage: audit.signatureImage,
        signedAt: audit.signedAt,
        signerIp: audit.signerIp,
        signerUserAgent: audit.signerUserAgent,
        signatureHash: audit.signatureHash
      };

      // Atualização imediata do estado em memória
      setSales(prev => prev.map(s => (s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId) ? {
        ...s,
        ...signatureUpdates
      } : s));

      // Atualização imediata do cache local para persistência instantânea
      const currentCached = loadCached<Sale[]>('sales', []);
      const updatedCache = currentCached.map(s => (s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId) ? {
        ...s,
        ...signatureUpdates
      } : s);
      saveCached('sales', updatedCache);

      // Persistência no Firestore com merge (com limite de espera para não travar em redes lentas/offline; persistentLocalCache garante fila local)
      const cleanedUpdates = cleanData(signatureUpdates);
      const writePromise = setDoc(doc(db, 'sales', cleanId), cleanedUpdates, { merge: true });

      const result = await Promise.race([
        writePromise.then(() => 'synced' as const),
        new Promise<'queued'>((resolve) => setTimeout(() => resolve('queued'), 3000))
      ]);

      if (result === 'queued') {
        writePromise.catch((err) => {
          console.warn('Sincronização posterior da assinatura digital:', err?.code || err);
        });
      }

      return true;
    } catch (err: any) {
      console.error('Erro ao salvar assinatura digital no Firestore:', err);
      if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}/signature`);
        return false;
      }
      if (err?.code !== 'unavailable') {
        console.warn('Assinatura mantida em cache local após erro de rede:', err?.message || err);
      }
      return true;
    }
  };

  return {
    products,
    sales,
    installments,
    closings,
    settings,
    setSettings: saveSettings,
    addProduct,
    deleteProduct,
    registerSale,
    payInstallment,
    amortizeSale,
    advanceInstallments,
    updateSaleFull,
    updateProduct,
    setInstallments,
    deleteSale,
    deleteClient,
    closeMonthlyRegister,
    deleteClosing,
    saveDigitalSignature,
    isInitialLoading
  };
}
