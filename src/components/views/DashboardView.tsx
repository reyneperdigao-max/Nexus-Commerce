import {
  Plus,
  ShoppingBag,
  FileText,
  Pencil,
  Trash2,
  Package,
  ArrowUpRight,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import { DashboardStats } from '../CommonUI';
import { Closing, Installment, Product, Sale, Settings } from '../../types';
import { formatLocalDateBR } from '../../lib/dateUtils';

interface DashboardViewProps {
  settings: Settings;
  products: Product[];
  sales: Sale[];
  installments: Installment[];
  closings: Closing[];
  isInitialLoading: boolean;
  hideDashboardValues: boolean;
  money: (val: number) => string;
  onNavigate: (view: string, filter?: string) => void;
  onNewSale: () => void;
  onViewContract: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  onSelectStockProduct: (productName: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export function DashboardView({
  settings,
  products,
  sales,
  installments,
  closings,
  isInitialLoading,
  hideDashboardValues,
  money,
  onNavigate,
  onNewSale,
  onViewContract,
  onEditSale,
  onDeleteSale,
  onSelectStockProduct,
  onShowToast,
}: DashboardViewProps) {
  const firstName = settings.userName
    ? settings.userName.trim().split(' ')[0].charAt(0).toUpperCase() +
      settings.userName.trim().split(' ')[0].slice(1).toLowerCase()
    : 'Operador';

  const recentSales = sales.slice(-6).reverse();
  const featuredProducts = products
    .filter((p) => (p.quantity !== undefined ? p.quantity > 0 : p.status === 'Disponivel'))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6 sm:gap-7 animate-view-enter">
      {/* Header Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Olá, <span className="text-gold">{firstName}</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
            Visão consolidada do capital investido, recebíveis e faturamento realizado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="h-10 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Relatório & Caixa
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center gap-2 px-4 h-10 bg-gold hover:brightness-110 text-[#07090e] font-bold text-xs tracking-tight rounded-xl transition-all shadow-[0_4px_16px_rgba(243,186,47,0.22)] active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nova Operação</span>
          </button>
        </div>
      </div>

      {/* Cards Financeiros e Operacionais */}
      <DashboardStats
        products={products}
        sales={sales}
        installments={installments}
        closings={closings}
        hideValues={hideDashboardValues}
        onNavigate={onNavigate}
      />

      {/* Split Principal (2 Colunas Desktop / Stack Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Fluxo Recente (7 colunas no desktop) */}
        <div className="lg:col-span-7 glass-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Operações Recentes</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Últimos contratos emitidos na plataforma</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Ver todas</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-2.5 flex-1">
            {isInitialLoading && sales.length === 0 ? (
              <div className="p-10 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center gap-3 text-center my-auto">
                <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">Sincronizando contratos...</span>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="p-10 bg-white/[0.02] border border-dashed border-white/[0.1] rounded-xl flex flex-col items-center justify-center gap-3 text-center my-auto">
                <ShoppingBag size={28} className="text-zinc-600" />
                <div>
                  <p className="text-sm font-semibold text-zinc-300">Nenhuma operação registrada</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Clique em &quot;Nova Operação&quot; para lançar sua primeira venda.
                  </p>
                </div>
              </div>
            ) : (
              recentSales.map((sale) => {
                const signed = Boolean(sale.isSigned || sale.signature?.signed);
                return (
                  <div
                    key={sale.id}
                    className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onViewContract(sale)}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1 text-left"
                      title="Visualizar contrato"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0 font-bold text-sm">
                        {sale.client?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 text-sm truncate group-hover:text-gold transition-colors">
                            {sale.productName}
                          </span>
                          {signed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 shrink-0">
                              <ShieldCheck size={12} /> Assinado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400/90 shrink-0">
                              <PenTool size={11} /> Pendente
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-400 truncate mt-0.5">
                          {sale.client} · {formatLocalDateBR(sale.date || sale.createdAt)}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-white text-sm tabular-figure">
                          {hideDashboardValues ? 'R$ ••••••' : money(sale.total)}
                        </p>
                        <span className="text-[11px] text-zinc-400 tabular-figure block">
                          {sale.installmentsCount || 1}x de{' '}
                          {hideDashboardValues ? 'R$ •••' : money(sale.installmentValue)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pl-2 sm:border-l border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => onViewContract(sale)}
                          className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-gold hover:border-gold/40 transition-colors grid place-items-center cursor-pointer"
                          title="Visualizar Contrato"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (signed) {
                              onShowToast(
                                'Este contrato já possui assinatura digital vinculada e está bloqueado para edições.',
                                'error'
                              );
                              return;
                            }
                            onEditSale(sale);
                          }}
                          className={`h-9 w-9 rounded-lg border transition-colors grid place-items-center ${
                            signed
                              ? 'border-white/[0.06] bg-white/[0.01] text-zinc-600 cursor-not-allowed'
                              : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-gold hover:border-gold/40 cursor-pointer'
                          }`}
                          title={signed ? 'Contrato Assinado (Edição bloqueada)' : 'Editar Contrato'}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSale(sale)}
                          className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors grid place-items-center cursor-pointer"
                          title="Excluir Contrato"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Produtos em Destaque (5 colunas no desktop) */}
        <div className="lg:col-span-5 glass-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Estoque em Destaque</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Ativos disponíveis para venda imediata</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Ver estoque</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="p-10 bg-white/[0.02] border border-dashed border-white/[0.1] rounded-xl flex flex-col items-center justify-center gap-3 text-center flex-1">
              <Package size={28} className="text-zinc-600" />
              <div>
                <p className="text-sm font-semibold text-zinc-300">Estoque sem itens disponíveis</p>
                <p className="text-xs text-zinc-500 mt-0.5">Cadastre novos ativos na aba Estoque.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 flex-1 content-start">
              {featuredProducts.map((product) => {
                const qty = product.quantity !== undefined ? product.quantity : 1;
                return (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => onSelectStockProduct(product.name)}
                    className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col gap-2.5 group hover:border-gold/35 hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
                  >
                    <div className="w-full aspect-[4/3] rounded-lg bg-[#07090e] border border-white/[0.06] overflow-hidden relative">
                      {product.photo ? (
                        <img
                          src={product.photo}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gold/25">
                          <Package size={24} />
                        </div>
                      )}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-[10px] font-semibold text-zinc-200 tabular-figure">
                        {qty} un.
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-100 truncate">{product.name}</h4>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-sm font-bold text-gold tabular-figure truncate">
                          {hideDashboardValues ? 'R$ ••••••' : money(product.sale)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
