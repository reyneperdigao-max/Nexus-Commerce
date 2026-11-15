import {
  Search,
  SlidersHorizontal,
  DollarSign,
  Zap,
  Plus,
  Boxes,
  TrendingUp,
  BadgeDollarSign,
  Package,
  Camera,
  Minus,
  ShoppingBag,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Product } from '../../types';

interface StockFinancials {
  totalInvested: number;
  totalProjectedSale: number;
  totalProjectedProfit: number;
  totalUnits: number;
  availableModels: number;
  marginPct: string;
}

interface StockViewProps {
  products: Product[];
  filteredProducts: Product[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  stockFinancials: StockFinancials;
  money: (val: number) => string;
  onOpenCapitalManager: () => void;
  onQuickPayment: () => void;
  onQuickAdvance: () => void;
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onSellProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export function StockView({
  filteredProducts,
  searchTerm,
  setSearchTerm,
  stockFinancials,
  money,
  onOpenCapitalManager,
  onQuickPayment,
  onQuickAdvance,
  onNewProduct,
  onEditProduct,
  onUpdateProduct,
  onSellProduct,
  onDeleteProduct,
  onShowToast,
}: StockViewProps) {
  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      {/* Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Estoque de Produtos</h1>
          <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
            Controle de capital imobilizado, margem de venda e disponibilidade de ativos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              size={16}
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no estoque..."
              className="fintech-input w-full pl-10 pr-4"
            />
          </div>

          <button
            type="button"
            onClick={onOpenCapitalManager}
            className="h-11 px-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
            title="Ajustar valores investidos em lote"
          >
            <SlidersHorizontal size={15} />
            <span>Atualizar Capital</span>
          </button>

          <button
            type="button"
            onClick={onQuickPayment}
            className="h-11 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Quitar parcela pendente"
          >
            <DollarSign size={15} />
            <span className="hidden sm:inline">Quitar</span>
          </button>

          <button
            type="button"
            onClick={onQuickAdvance}
            className="h-11 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Antecipar parcelas"
          >
            <Zap size={15} className="text-gold" />
            <span className="hidden sm:inline">Antecipar</span>
          </button>

          <button
            type="button"
            onClick={onNewProduct}
            className="h-11 px-4 sm:px-5 bg-gold text-[#07090e] rounded-xl font-bold text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer shadow-[0_4px_14px_rgba(243,186,47,0.2)] whitespace-nowrap"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* KPIs Financeiros de Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-amber-500/25 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Boxes size={18} />
            </div>
            <button
              type="button"
              onClick={onOpenCapitalManager}
              className="h-7 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal size={11} />
              <span>Custos</span>
            </button>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-400 block">Capital em Estoque</span>
            <strong className="text-2xl font-bold text-amber-300 tracking-tight tabular-figure block mt-0.5">
              {money(stockFinancials.totalInvested)}
            </strong>
            <p className="text-[11px] text-zinc-500 mt-1">Custo total das unidades disponíveis</p>
          </div>
        </div>

        <div className="glass-card p-5 border-blue-500/25 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/12 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <TrendingUp size={18} />
            </div>
            <span className="text-[11px] font-medium text-blue-300">Valor de Venda</span>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-400 block">Faturamento Projetado</span>
            <strong className="text-2xl font-bold text-blue-400 tracking-tight tabular-figure block mt-0.5">
              {money(stockFinancials.totalProjectedSale)}
            </strong>
            <p className="text-[11px] text-zinc-500 mt-1">Potencial bruto de venda do estoque</p>
          </div>
        </div>

        <div className="glass-card p-5 border-emerald-500/25 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <BadgeDollarSign size={18} />
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 tabular-figure">
              {stockFinancials.marginPct}% margem
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-400 block">Lucro Bruto Estimado</span>
            <strong className="text-2xl font-bold text-emerald-400 tracking-tight tabular-figure block mt-0.5">
              {money(stockFinancials.totalProjectedProfit)}
            </strong>
            <p className="text-[11px] text-zinc-500 mt-1">Receita prevista menos custo de entrada</p>
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-zinc-200">
              <Package size={18} />
            </div>
            <span className="text-[11px] font-medium text-zinc-400 tabular-figure">
              {stockFinancials.availableModels} modelos
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-400 block">Volume Físico</span>
            <strong className="text-2xl font-bold text-white tracking-tight tabular-figure block mt-0.5">
              {stockFinancials.totalUnits} <span className="text-sm font-medium text-zinc-400">unidades</span>
            </strong>
            <p className="text-[11px] text-zinc-500 mt-1">Ativos disponíveis para venda</p>
          </div>
        </div>
      </div>

      {/* Lista Mobile (Cards Responsivos - Zero Overflow Horizontal) */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filteredProducts.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
            <Package size={36} className="text-zinc-600" />
            <h4 className="text-sm font-semibold text-white">Nenhum produto localizado</h4>
            <p className="text-xs text-zinc-500">Refine sua busca ou cadastre um novo produto no estoque.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const qty = p.quantity !== undefined ? p.quantity : 1;
            const isVendido = qty <= 0 || p.status === 'Vendido';

            const handleIncrement = () => {
              const newQty = qty + 1;
              onUpdateProduct(p.id, { quantity: newQty, status: newQty > 0 ? 'Disponivel' : 'Vendido' });
              onShowToast(`Estoque de "${p.name}" atualizado para ${newQty}.`);
            };

            const handleDecrement = () => {
              if (qty <= 0) return;
              const newQty = qty - 1;
              onUpdateProduct(p.id, { quantity: newQty, status: newQty > 0 ? 'Disponivel' : 'Vendido' });
              onShowToast(`Estoque de "${p.name}" atualizado para ${newQty}.`);
            };

            return (
              <div key={p.id} className="glass-card p-4 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl border border-white/[0.1] bg-[#07090e] overflow-hidden flex items-center justify-center shrink-0">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{p.name}</h4>
                      <span className="text-xs text-zinc-400">{p.category}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${
                      isVendido
                        ? 'bg-red-500/12 text-red-400 border border-red-500/25'
                        : 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25'
                    }`}
                  >
                    {isVendido ? 'Esgotado' : 'Disponível'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Custo Un.</span>
                    <strong className="text-zinc-200 font-semibold tabular-figure block mt-0.5">
                      {money(Number(p.cost) || 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Investido</span>
                    <strong className="text-amber-300 font-semibold tabular-figure block mt-0.5">
                      {money((Number(p.cost) || 0) * qty)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-zinc-500 block">Venda</span>
                    <strong className="text-gold font-bold tabular-figure block mt-0.5">{money(p.sale)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={qty <= 0}
                      className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.1] text-zinc-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                      aria-label="Diminuir estoque"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center text-sm font-bold text-white tabular-figure">{qty}</span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.1] text-zinc-300 flex items-center justify-center cursor-pointer"
                      aria-label="Aumentar estoque"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSellProduct(p)}
                      className="h-9 px-3 rounded-lg bg-gold/15 border border-gold/30 text-gold text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag size={13} />
                      <span>Vender</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditProduct(p)}
                      className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.1] text-zinc-300 flex items-center justify-center cursor-pointer"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(p)}
                      className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.1] text-zinc-400 hover:text-red-400 flex items-center justify-center cursor-pointer"
                      title="Remover"
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

      {/* Tabela Expandida Desktop */}
      <div className="hidden lg:block glass-card overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-zinc-400 h-12">
                <th className="px-5 py-3">Produto / Modelo</th>
                <th className="px-4 py-3 text-center w-36">Categoria</th>
                <th className="px-4 py-3 text-center w-32">Custo Un.</th>
                <th className="px-4 py-3 text-center w-36">Total Investido</th>
                <th className="px-4 py-3 text-center w-32">Valor Venda</th>
                <th className="px-4 py-3 text-center w-40">Quantidade</th>
                <th className="px-4 py-3 text-center w-28">Status</th>
                <th className="px-5 py-3 text-right w-40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-zinc-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={40} className="text-zinc-600" />
                      <h4 className="text-sm font-semibold text-white">Nenhum produto localizado</h4>
                      <p className="text-xs text-zinc-500">
                        Refine sua busca ou cadastre um novo produto no inventário.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const qty = p.quantity !== undefined ? p.quantity : 1;
                  const isVendido = qty <= 0 || p.status === 'Vendido';

                  const handleIncrement = () => {
                    const newQty = qty + 1;
                    onUpdateProduct(p.id, { quantity: newQty, status: newQty > 0 ? 'Disponivel' : 'Vendido' });
                    onShowToast(`Estoque de "${p.name}" atualizado para ${newQty}.`);
                  };

                  const handleDecrement = () => {
                    if (qty <= 0) return;
                    const newQty = qty - 1;
                    onUpdateProduct(p.id, { quantity: newQty, status: newQty > 0 ? 'Disponivel' : 'Vendido' });
                    onShowToast(`Estoque de "${p.name}" atualizado para ${newQty}.`);
                  };

                  const handleQtyChange = (valStr: string) => {
                    const newQty = Math.max(0, parseInt(valStr) || 0);
                    onUpdateProduct(p.id, { quantity: newQty, status: newQty > 0 ? 'Disponivel' : 'Vendido' });
                  };

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors h-16">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative group/avatar w-10 h-10 rounded-xl border border-white/[0.1] bg-[#07090e] overflow-hidden flex items-center justify-center shrink-0">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <Package size={18} className="text-zinc-500 group-hover/avatar:text-gold transition-colors" />
                            )}
                            <button
                              type="button"
                              onClick={() => onEditProduct(p)}
                              className="absolute inset-0 bg-black/75 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                              title="Alterar Imagem"
                            >
                              <Camera size={13} className="text-gold" />
                            </button>
                          </div>
                          <input
                            type="text"
                            defaultValue={p.name}
                            onBlur={(e) => {
                              const newName = e.target.value.trim();
                              if (newName && newName !== p.name) {
                                onUpdateProduct(p.id, { name: newName });
                                onShowToast(`Nome atualizado para "${newName}"`);
                              }
                            }}
                            className="bg-transparent border border-transparent hover:border-white/[0.1] focus:border-gold focus:bg-[#07090e] text-sm font-semibold text-white py-1.5 px-2.5 rounded-lg w-full max-w-[260px] transition-colors outline-none"
                            placeholder="Nome do Produto"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <select
                          value={p.category}
                          onChange={(e) => {
                            onUpdateProduct(p.id, { category: e.target.value });
                            onShowToast(`Categoria de "${p.name}" alterada para ${e.target.value}`);
                          }}
                          className="h-9 w-full max-w-[130px] bg-[#07090e] border border-white/[0.1] rounded-lg px-2.5 text-xs font-medium text-zinc-200 focus:border-gold outline-none cursor-pointer"
                        >
                          <option value="Celular">Celular</option>
                          <option value="Eletrônico">Eletrônico</option>
                          <option value="Hardware">Hardware</option>
                          <option value="Acessório">Acessório</option>
                        </select>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1 bg-[#07090e] border border-white/[0.1] rounded-lg px-2.5 h-9 w-28 mx-auto focus-within:border-amber-400 transition-colors">
                          <span className="text-[11px] text-amber-400 font-semibold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={p.cost !== undefined ? p.cost : 0}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val !== p.cost) {
                                onUpdateProduct(p.id, { cost: val });
                                onShowToast(`Custo de "${p.name}" atualizado!`);
                              }
                            }}
                            className="bg-transparent text-xs font-semibold text-white outline-none w-full min-w-0 tabular-figure"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xs font-semibold text-amber-300 tabular-figure">
                            {money((Number(p.cost) || 0) * qty)}
                          </span>
                          <span className="text-[10px] text-zinc-500 tabular-figure">
                            {qty}x de {money(Number(p.cost) || 0)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1 bg-[#07090e] border border-gold/25 rounded-lg px-2.5 h-9 w-28 mx-auto focus-within:border-gold transition-colors">
                          <span className="text-[11px] text-gold font-semibold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={p.sale}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              if (val !== p.sale) {
                                onUpdateProduct(p.id, { sale: val });
                                onShowToast(`Preço de "${p.name}" atualizado.`);
                              }
                            }}
                            className="bg-transparent text-xs font-bold text-gold outline-none w-full min-w-0 tabular-figure"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 w-32 mx-auto">
                          <button
                            type="button"
                            onClick={handleDecrement}
                            disabled={qty <= 0}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.1] hover:border-red-500/40 text-zinc-300 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center"
                            title="Diminuir Estoque"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={qty}
                            onChange={(e) => handleQtyChange(e.target.value)}
                            onBlur={() => onShowToast(`Estoque de "${p.name}" atualizado.`)}
                            className="w-11 h-8 bg-[#07090e] border border-white/[0.1] rounded-lg text-center font-bold text-xs text-white focus:border-gold tabular-figure [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={handleIncrement}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.1] hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer flex items-center justify-center"
                            title="Aumentar Estoque"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            isVendido
                              ? 'bg-red-500/12 text-red-400 border border-red-500/25'
                              : 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25'
                          }`}
                        >
                          {isVendido ? 'Vendido' : 'Disponível'}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSellProduct(p)}
                            className="h-8 px-2.5 rounded-lg border border-gold/30 bg-gold/10 hover:bg-gold hover:text-[#07090e] text-gold flex items-center gap-1 transition-colors cursor-pointer text-xs font-semibold"
                            title="Registrar venda deste produto"
                          >
                            <ShoppingBag size={12} />
                            <span>Vender</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditProduct(p)}
                            className="w-8 h-8 rounded-lg border border-white/[0.1] text-zinc-400 hover:text-gold hover:border-gold/40 flex items-center justify-center transition-colors cursor-pointer bg-white/[0.02]"
                            title="Editar produto"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(p)}
                            className="w-8 h-8 rounded-lg border border-white/[0.1] text-zinc-400 hover:text-red-400 hover:border-red-500/40 flex items-center justify-center transition-colors cursor-pointer bg-white/[0.02]"
                            title="Remover produto"
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
  );
}
