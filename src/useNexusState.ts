import { useState, useEffect } from 'react';
import { Product, Sale, Installment, Settings, Closing } from './types';
import { db, handleFirestoreError, OperationType, cleanData } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  writeBatch
} from 'firebase/firestore';

export function useNexusState() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [settings, setSettings] = useState<Settings>({
    userName: 'Operador 1',
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
    op1Name: 'Operador 1',
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
  });

  // Real-time synchronization
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'products');
    });

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale)));
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'sales');
    });

    const unsubInstallments = onSnapshot(collection(db, 'installments'), (snapshot) => {
      setInstallments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Installment)));
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'installments');
    });

    const unsubClosings = onSnapshot(collection(db, 'closings'), (snapshot) => {
      setClosings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Closing)));
    }, (err) => {
      if (err.code !== 'permission-denied') handleFirestoreError(err, OperationType.LIST, 'closings');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const rawSettings = docSnapshot.data() as Settings;
        const currentOperator = rawSettings.currentOperator || 'operator1';

        const op1Name = rawSettings.op1Name ?? rawSettings.userName ?? 'Operador 1';
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

        setSettings({
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
        });
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
    firstDueDate: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
    isInterestOnly?: boolean;
    interestRate?: number;
    costPrice?: number;
  }) => {
    const product = products.find(p => p.id === data.productId);
    if (!product) return;

    const salePrice = data.manualSalePrice || product.sale;
    const adjustAmount = (salePrice * data.percentageAdjustment) / 100;
    const finalTotal = salePrice + adjustAmount;
    
    let installmentValue = 0;
    if (data.isInterestOnly) {
      installmentValue = finalTotal * ((data.interestRate || 0) / 100);
    } else {
      const remainingToFinance = finalTotal - data.downPayment;
      installmentValue = remainingToFinance / data.installments;
    }
    
    const costForProfit = data.costPrice !== undefined ? data.costPrice : (product.cost || 0);
    const profit = finalTotal - costForProfit;

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
      date: data.firstDueDate,
      status: 'Ativa',
      createdAt: new Date().toISOString(),
      isInterestOnly: data.isInterestOnly || false,
      interestRate: data.interestRate || 0,
      costPrice: costForProfit
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
      const dueDate = new Date(y, m - 1 + (i - 1), d, 12);
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

  const deleteSale = async (id: string) => {
    const sale = sales.find(s => s.id === id);
    const batch = writeBatch(db);
    
    if (sale) {
      const p = products.find(prod => prod.id === sale.productId);
      const currentQty = p && p.quantity !== undefined ? p.quantity : 0;
      batch.update(doc(db, 'products', sale.productId), { 
        quantity: currentQty + 1,
        status: 'Disponivel' 
      });
    }
    
    batch.delete(doc(db, 'sales', id));
    
    const saleInstallments = installments.filter(i => i.saleId === id);
    saleInstallments.forEach(i => {
      batch.delete(doc(db, 'installments', i.id));
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch/deleteSale');
    }
  };

  const deleteClient = async (clientName: string) => {
    const clientSales = sales.filter(s => s.client === clientName);
    const batch = writeBatch(db);
    
    clientSales.forEach(s => {
      const p = products.find(prod => prod.id === s.productId);
      const currentQty = p && p.quantity !== undefined ? p.quantity : 0;
      batch.update(doc(db, 'products', s.productId), { 
        quantity: currentQty + 1,
        status: 'Disponivel' 
      });
      batch.delete(doc(db, 'sales', s.id));
    });

    const clientInstallments = installments.filter(i => i.client === clientName);
    clientInstallments.forEach(i => {
      batch.delete(doc(db, 'installments', i.id));
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch/deleteClient');
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
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;

      const batch = writeBatch(db);

      const newTotal = Math.max(0, sale.total - amount);
      const isLiquidated = newTotal <= 0;
      
      const newInstallmentValue = isLiquidated ? 0 : newTotal * ((sale.interestRate || 0) / 100);
      const newStatus = isLiquidated ? 'Liquidada' : 'Ativa';

      batch.update(doc(db, 'sales', saleId), {
        total: newTotal,
        installmentValue: newInstallmentValue,
        status: newStatus
      });

      // Registrar o pagamento correspondente à amortização no histórico de parcelas pagas
      const amortInstId = crypto.randomUUID();
      const nextNumber = (installments.filter(i => i.saleId === saleId).length) + 1;
      
      batch.set(doc(db, 'installments', amortInstId), cleanData({
        id: amortInstId,
        saleId: saleId,
        client: sale.client,
        productName: `${sale.productName} (Amortização de Principal)`,
        number: nextNumber,
        total: Math.max(sale.installmentsCount, nextNumber),
        value: amount,
        dueDate: new Date().toISOString(),
        status: 'Pago',
        paidAt: new Date().toISOString(),
        paymentMethod: paymentMethod
      }));

      if (isLiquidated) {
        // Remover parcelas pendentes já que o contrato foi totalmente quitado
        const pending = installments.filter(i => i.saleId === saleId && i.status === 'Pendente');
        pending.forEach(p => {
          batch.delete(doc(db, 'installments', p.id));
        });
      } else {
        // Atualizar todas as parcelas pendentes ativas para o novo valor de juros reduzido proporcionalmente
        const pending = installments.filter(i => i.saleId === saleId && i.status === 'Pendente');
        pending.forEach(p => {
          batch.update(doc(db, 'installments', p.id), {
            value: newInstallmentValue
          });
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sales/${saleId}/amortize`);
    }
  };

  const updateSaleFull = async (id: string, data: {
    client: string;
    clientPhone: string;
    clientCpf: string;
    clientAddress?: string;
    installments: number;
    firstDueDate: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
    isInterestOnly?: boolean;
    interestRate?: number;
    costPrice?: number;
  }) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    const product = products.find(p => p.id === sale.productId);
    if (!product) return;

    const salePrice = data.manualSalePrice || product.sale;
    const adjustAmount = (salePrice * data.percentageAdjustment) / 100;
    const finalTotal = salePrice + adjustAmount;
    
    let installmentValue = 0;
    if (data.isInterestOnly) {
      installmentValue = finalTotal * ((data.interestRate || 0) / 100);
    } else {
      const remainingToFinance = finalTotal - data.downPayment;
      installmentValue = remainingToFinance / data.installments;
    }
    
    const costForProfit = data.costPrice !== undefined ? data.costPrice : (sale.costPrice !== undefined ? sale.costPrice : (product.cost || 0));
    const profit = finalTotal - costForProfit;

    const batch = writeBatch(db);

    const updatedSale: Partial<Sale> = {
      client: data.client,
      clientPhone: data.clientPhone,
      clientCpf: data.clientCpf,
      clientAddress: data.clientAddress || '',
      total: finalTotal,
      downPayment: data.downPayment,
      profit: profit,
      installmentsCount: data.installments,
      installmentValue: installmentValue,
      date: data.firstDueDate,
      isInterestOnly: data.isInterestOnly || false,
      interestRate: data.interestRate || 0,
      costPrice: costForProfit
    };

    batch.update(doc(db, 'sales', id), cleanData(updatedSale));

    const needsRegen = sale.installmentsCount !== data.installments || 
                       sale.total !== finalTotal || 
                       sale.date !== data.firstDueDate ||
                       sale.isInterestOnly !== data.isInterestOnly ||
                       sale.interestRate !== data.interestRate;

    if (needsRegen) {
      // Delete old
      installments.filter(i => i.saleId === id).forEach(i => {
        batch.delete(doc(db, 'installments', i.id));
      });

      const [y, m, d] = data.firstDueDate.split('-').map(Number);
      for (let i = 1; i <= data.installments; i++) {
        const dueDate = new Date(y, m - 1 + (i - 1), d, 12);
        if (dueDate.getDate() !== d) dueDate.setDate(0);
        
        const instId = crypto.randomUUID();
        batch.set(doc(db, 'installments', instId), cleanData({
          id: instId,
          saleId: id,
          client: data.client,
          productName: product.name,
          number: i,
          total: data.installments,
          value: installmentValue,
          dueDate: dueDate.toISOString(),
          status: 'Pendente'
        }));
      }
    } else {
      installments.filter(i => i.saleId === id).forEach(i => {
        batch.update(doc(db, 'installments', i.id), cleanData({ client: data.client }));
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch/updateSaleFull');
    }
  };

  const advanceInstallments = async (
    saleId: string,
    items: Array<{ id: string; discountPercentage: number }>,
    paymentMethod: string
  ) => {
    try {
      const sale = sales.find(s => s.id === saleId);
      if (!sale) return;

      const batch = writeBatch(db);
      const itemMap = new Map(items.map(item => [item.id, item.discountPercentage]));

      const targetInstallments = installments.filter(i => itemMap.has(i.id));
      if (targetInstallments.length === 0) return;

      targetInstallments.forEach(inst => {
        const discountPct = itemMap.get(inst.id) || 0;
        const origValue = inst.value;
        const discountVal = (origValue * discountPct) / 100;
        const finalVal = Math.round(Math.max(0, origValue - discountVal));

        batch.update(doc(db, 'installments', inst.id), cleanData({
          status: 'Pago',
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod,
          value: finalVal,
          originalValue: origValue,
          discountPercentage: discountPct,
          discountAmount: Math.round(discountVal),
          isAdvanced: true
        }));
      });

      const targetIds = new Set(items.map(i => i.id));
      const remainingPending = installments.filter(i => i.saleId === saleId && i.status === 'Pendente' && !targetIds.has(i.id));
      if (remainingPending.length === 0) {
        batch.update(doc(db, 'sales', saleId), {
          status: 'Liquidada'
        });
      }

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
    closeMonthlyRegister
  };
}
