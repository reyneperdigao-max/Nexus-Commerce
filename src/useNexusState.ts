import { useState, useEffect } from 'react';
import { Product, Sale, Installment, Settings } from './types';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
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
  const [settings, setSettings] = useState<Settings>({
    userName: 'Administrador',
    userRole: 'CEO / Diretor Comercial',
    userEmail: 'admin@nexus.com',
    pixName: '',
    pixKey: '',
    pixType: 'Pix',
    companyName: 'NexusCommerce Solutions',
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
      unsubSettings();
    };
  }, []);

  const saveSettings = async (newSettings: Settings) => {
    try {
      await setDoc(doc(db, 'settings', 'config'), newSettings);
      setSettings(newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/config');
    }
  };

  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const newProduct: Product = {
      ...p,
      id,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'products', id), newProduct);
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
      await updateDoc(doc(db, 'products', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const registerSale = async (data: {
    productId: string;
    client: string;
    clientPhone: string;
    clientCpf: string;
    installments: number;
    firstDueDate: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
  }) => {
    const product = products.find(p => p.id === data.productId);
    if (!product) return;

    const salePrice = data.manualSalePrice || product.sale;
    const adjustAmount = (salePrice * data.percentageAdjustment) / 100;
    const finalTotal = salePrice + adjustAmount;
    const remainingToFinance = finalTotal - data.downPayment;
    const installmentValue = remainingToFinance / data.installments;
    const profit = finalTotal - product.cost;

    const saleId = crypto.randomUUID();
    const newSale: Sale = {
      id: saleId,
      productId: product.id,
      productName: product.name,
      client: data.client,
      clientPhone: data.clientPhone,
      clientCpf: data.clientCpf,
      total: finalTotal,
      downPayment: data.downPayment,
      profit: profit,
      installmentsCount: data.installments,
      installmentValue: installmentValue,
      date: data.firstDueDate,
      status: 'Ativa',
      createdAt: new Date().toISOString()
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'sales', saleId), newSale);
    batch.update(doc(db, 'products', product.id), { status: 'Vendido' });

    const [y, m, d] = data.firstDueDate.split('-').map(Number);
    for (let i = 1; i <= data.installments; i++) {
      const dueDate = new Date(y, m - 1 + (i - 1), d, 12);
      if (dueDate.getDate() !== d) dueDate.setDate(0);
      
      const instId = crypto.randomUUID();
      batch.set(doc(db, 'installments', instId), {
        id: instId,
        saleId: saleId,
        client: data.client,
        productName: product.name,
        number: i,
        total: data.installments,
        value: installmentValue,
        dueDate: dueDate.toISOString(),
        status: 'Pendente'
      });
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
      batch.update(doc(db, 'products', sale.productId), { status: 'Disponivel' });
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
      batch.update(doc(db, 'products', s.productId), { status: 'Disponivel' });
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
      await updateDoc(doc(db, 'installments', id), {
        status: 'Pago',
        paidAt: new Date().toISOString(),
        paymentMethod
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `installments/${id}`);
    }
  };

  const updateSaleFull = async (id: string, data: {
    client: string;
    clientPhone: string;
    clientCpf: string;
    installments: number;
    firstDueDate: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
  }) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    const product = products.find(p => p.id === sale.productId);
    if (!product) return;

    const salePrice = data.manualSalePrice || product.sale;
    const adjustAmount = (salePrice * data.percentageAdjustment) / 100;
    const finalTotal = salePrice + adjustAmount;
    const remainingToFinance = finalTotal - data.downPayment;
    const installmentValue = remainingToFinance / data.installments;
    const profit = finalTotal - product.cost;

    const batch = writeBatch(db);

    const updatedSale: Partial<Sale> = {
      client: data.client,
      clientPhone: data.clientPhone,
      clientCpf: data.clientCpf,
      total: finalTotal,
      downPayment: data.downPayment,
      profit: profit,
      installmentsCount: data.installments,
      installmentValue: installmentValue,
      date: data.firstDueDate,
    };

    batch.update(doc(db, 'sales', id), updatedSale);

    const needsRegen = sale.installmentsCount !== data.installments || 
                       sale.total !== finalTotal || 
                       sale.date !== data.firstDueDate;

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
        batch.set(doc(db, 'installments', instId), {
          id: instId,
          saleId: id,
          client: data.client,
          productName: product.name,
          number: i,
          total: data.installments,
          value: installmentValue,
          dueDate: dueDate.toISOString(),
          status: 'Pendente'
        });
      }
    } else {
      installments.filter(i => i.saleId === id).forEach(i => {
        batch.update(doc(db, 'installments', i.id), { client: data.client });
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch/updateSaleFull');
    }
  };

  return {
    products,
    sales,
    installments,
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
    deleteClient
  };
}
