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
    userName: 'Administrador',
    userRole: 'CEO / Diretor Comercial',
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
    theme: 'dark'
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

    const unsubSettings = onSnapshot(doc(db, 'settings', 'config'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as Settings);
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
    
    const profit = finalTotal - product.cost;

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
      interestRate: data.interestRate || 0
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
          value: inst.value,
          dueDate: nextDueDate.toISOString(),
          status: 'Pendente'
        }));
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `installments/${id}`);
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
    const profit = finalTotal - product.cost;

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
      interestRate: data.interestRate || 0
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
    updateSaleFull,
    updateProduct,
    setInstallments,
    deleteSale,
    deleteClient,
    closeMonthlyRegister
  };
}
