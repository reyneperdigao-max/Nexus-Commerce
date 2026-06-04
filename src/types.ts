/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  cost: number;
  sale: number;
  category: string;
  status: 'Disponivel' | 'Vendido';
  photo?: string;
  createdAt: string;
  quantity?: number;
}

export interface Installment {
  id: string;
  saleId: string;
  client: string;
  productName: string;
  number: number;
  total: number;
  value: number;
  dueDate: string;
  status: 'Pendente' | 'Pago';
  paidAt?: string;
  paymentMethod?: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  client: string;
  clientPhone: string;
  clientCpf?: string;
  total: number;
  downPayment: number;
  profit: number;
  installmentsCount: number;
  installmentValue: number;
  date: string;
  status: 'Ativa' | 'Liquidada';
  createdAt: string;
  isInterestOnly?: boolean;
  interestRate?: number;
  clientAddress?: string;
  costPrice?: number;
}

export interface Settings {
  userName: string;
  userRole: string;
  userFunction?: string;
  userEmail: string;
  profilePhoto?: string;
  pixName: string;
  pixKey: string;
  pixType: string;
  companyName: string;
  companyDocument?: string;
  companyPhone?: string;
  companyAddress?: string;
  currency: string;
  language: string;
  theme: 'dark' | 'light';
  whatsappTemplate?: string;
  currentOperator?: 'operator1' | 'operator2';
  op1Name?: string;
  op1Role?: string;
  op1Function?: string;
  op1Email?: string;
  op1Photo?: string;
  op1PixName?: string;
  op1PixKey?: string;
  op1PixType?: string;
  op2Name?: string;
  op2Role?: string;
  op2Function?: string;
  op2Email?: string;
  op2Photo?: string;
  op2PixName?: string;
  op2PixKey?: string;
  op2PixType?: string;
}

export interface Closing {
  id: string;
  closedAt: string;
  periodName: string;
  profit: number;
  totalSales: number;
  salesCount: number;
}

