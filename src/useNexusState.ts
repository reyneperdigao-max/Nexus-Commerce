import { useState, useEffect } from 'react';
import { Product, Sale, Installment, Settings, Closing } from './types';
import { db, handleFirestoreError, OperationType, cleanData } from './lib/firebase';
import { getLocalDateString } from './lib/dateUtils';
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
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      setProducts(data);
      saveCached('products', data);
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'products');
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale));
      setSales(data);
      saveCached('sales', data);
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'sales');
    });

    const unsubInstallments = onSnapshot(collection(db, 'installments'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Installment));
      setInstallments(data);
      saveCached('installments', data);
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'installments');
    });

    const unsubClosings = onSnapshot(collection(db, 'closings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Closing));
      setClosings(data);
      saveCached('closings', data);
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'closings');
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
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.GET, 'settings/config');
    });

    return () => {
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
    const product = products.find(p => p.id === data.productId);
    if (!product) return false;

    const salePrice = data.manualSalePrice || product.sale;
    const adjustAmount = (salePrice * data.percentageAdjustment) / 100;
    const finalTotal = salePrice + adjustAmount;
    
    let installmentValue = 0;
    if (data.isInterestOnly) {
      installmentValue = finalTotal * ((data.interestRate || 0) / 100);
    } else {
      const remainingToFinance = Math.max(0, finalTotal - data.downPayment);
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
      client: data.client,
      clientPhone: data.clientPhone,
      clientCpf: data.clientCpf,
      clientAddress: data.clientAddress || '',
      total: finalTotal,
      downPayment: data.downPayment,
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
    const batch = writeBatch(db);
    batch.set(doc(db, 'sales', saleId), cleanData(newSale));
    
    if (currentQty > 1) {
      batch.update(doc(db, 'products', product.id), { 
        quantity: currentQty - 1,
        status: 'Disponivel'
      });
    } else {
      batch.update(doc(db, 'products', product.id), { 
        quantity: 0,
        status: 'Vendido'
      });
    }

    const [y, m, d] = data.firstDueDate.split('-').map(Number);
    for (let i = 1; i <= data.installments; i++) {
      const dueDate = new Date(y, m - 1 + (i - 1), d, 12, 0, 0);
      if (dueDate.getDate() !== d) dueDate.setDate(0);
      
      const instId = crypto.randomUUID();
      batch.set(doc(db, 'installments', instId), cleanData({
        id: instId,
        saleId: saleId,
        client: data.client,
        productName: product.name,
        number: i,
        total: data.installments,
        value: installmentValue,
        dueDate: dueDate.toISOString(),
        status: 'Pendente'
      }));
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch/registerSale');
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
  }): Promise<boolean> => {
    const cleanId = (id || '').trim();
    const sale = sales.find(s => s.id === cleanId || s.id === id);
    if (!sale) {
      console.error('Venda não encontrada para atualização:', id);
      return false;
    }

    const productId = data.productId || sale.productId;
    const product = products.find(p => p.id === productId);
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
      productId: productId,
      productName: productName,
      sellerName: data.sellerName || sale.sellerName || defaultSeller
    };

    // Atualização imediata do estado local
    setSales(prev => prev.map(s => (s.id === cleanId || s.id === id) ? { ...s, ...updatedSale, id: s.id } as Sale : s));

    const batch = writeBatch(db);
    batch.set(doc(db, 'sales', cleanId), cleanData(updatedSale), { merge: true });

    const firstInst = installments.find(i => (i.saleId === cleanId || i.saleId === id) && i.number === 1);
    const existingDue = firstInst?.dueDate ? getLocalDateString(firstInst.dueDate) : '';
    const dueDateChanged = Boolean(data.firstDueDate && existingDue && data.firstDueDate !== existingDue);
    const needsRegen = sale.installmentsCount !== installmentsCount || 
                       Math.abs(sale.total - finalTotal) > 0.01 || 
                       Boolean(sale.isInterestOnly) !== Boolean(data.isInterestOnly) ||
                       (data.isInterestOnly && sale.interestRate !== data.interestRate) ||
                       dueDateChanged;

    let newInstallmentsList: Installment[] = [];

    if (needsRegen && data.firstDueDate) {
      // Exclui parcelas antigas no Firestore
      installments.filter(i => i.saleId === cleanId || i.saleId === id).forEach(i => {
        batch.delete(doc(db, 'installments', i.id));
      });

      const [y, m, d] = data.firstDueDate.split('-').map(Number);
      for (let i = 1; i <= installmentsCount; i++) {
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

      setInstallments(prev => [
        ...prev.filter(i => i.saleId !== cleanId && i.saleId !== id),
        ...newInstallmentsList
      ]);
    } else {
      installments.filter(i => i.saleId === cleanId || i.saleId === id).forEach(i => {
        batch.set(doc(db, 'installments', i.id), cleanData({ 
          client: (data.client || '').trim(),
          productName: productName
        }), { merge: true });
      });

      setInstallments(prev => prev.map(i => (i.saleId === cleanId || i.saleId === id) 
        ? { ...i, client: (data.client || '').trim(), productName } 
        : i
      ));
    }

    try {
      await batch.commit();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar venda/contrato no lote, tentando setDoc direto:', err);
      try {
        await setDoc(doc(db, 'sales', cleanId), cleanData(updatedSale), { merge: true });
        return true;
      } catch (fallbackErr) {
        console.error('Falha no fallback de atualização do contrato:', fallbackErr);
        handleFirestoreError(fallbackErr, OperationType.WRITE, `sales/${cleanId}`);
        return false;
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
    deleteClosing
  };
}
