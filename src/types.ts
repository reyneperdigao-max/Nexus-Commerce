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
}

export interface Settings {
  userName: string;
  userRole: string;
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
}
