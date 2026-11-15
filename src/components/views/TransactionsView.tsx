import { Wallet, DollarSign, BadgeDollarSign, Search, AlertCircle, MessageCircle, FileText } from 'lucide-react';
import { formatLocalDateBR } from '../../lib/dateUtils';

interface TransactionsViewProps {
  transactions: any[];
  filteredTransactions: any[];
  txSearch: string;
  setTxSearch: (val: string) => void;
  txTypeFilter: 'all' | 'entrada' | 'parcela';
  setTxTypeFilter: (val: 'all' | 'entrada' | 'parcela') => void;
  txMethodFilter: string;
  setTxMethodFilter: (val: string) => void;
  money: (val: number) => string;
  getWhatsAppShareLink: (tx: any) => string;
  onViewReceipt: (tx: any) => void;
}

export function TransactionsView({
  transactions,
  filteredTransactions,
  txSearch,
  setTxSearch,
  txTypeFilter,
  setTxTypeFilter,
  txMethodFilter,
  setTxMethodFilter,
  money,
  getWhatsAppShareLink,
  onViewReceipt,
}: TransactionsViewProps) {
  const totalEntradas = transactions
    .filter((t) => t.type === 'entrada')
    .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
  const totalParcelas = transactions
    .filter((t) => t.type === 'parcela')
    .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
  const totalConciliado = transactions.reduce((acc, t) => acc + (Number(t.value) || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Transações & Recebimentos</h1>
        <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
          Registro cronológico de entradas, quitações de parcelas e comprovantes emitidos
        </p>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Acumulado Entradas</span>
            <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center border border-gold/25">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-white tracking-tight block tabular-figure">
              {money(totalEntradas)}
            </strong>
            <span className="text-[11px] text-zinc-500 block mt-1">Valores de sinal e entrada em caixa</span>
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Acumulado Parcelas</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-white tracking-tight block tabular-figure">
              {money(totalParcelas)}
            </strong>
            <span className="text-[11px] text-zinc-500 block mt-1">Soma das parcelas liquidadas</span>
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col gap-3 border-gold/25">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gold/90">Total Transacionado</span>
            <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center border border-gold/25">
              <BadgeDollarSign size={16} />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-gold tracking-tight block tabular-figure">
              {money(totalConciliado)}
            </strong>
            <span className="text-[11px] text-zinc-400 block mt-1">Fluxo total conciliado no sistema</span>
          </div>
        </div>
      </div>

      {/* Painel de Filtros & Histórico */}
      <div className="glass-card p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Histórico de Fluxo</h3>
            <p className="text-xs text-zinc-400 mt-0.5 tabular-figure">
              Exibindo {filteredTransactions.length} de {transactions.length} transações
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex bg-[#07090e] p-1 rounded-xl border border-white/[0.08]">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'entrada', label: 'Entradas' },
                  { id: 'parcela', label: 'Parcelas' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTxTypeFilter(t.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    txTypeFilter === t.id ? 'bg-gold text-[#07090e]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select
              value={txMethodFilter}
              onChange={(e) => setTxMethodFilter(e.target.value)}
              className="fintech-select text-xs"
            >
              <option value="all">Meio de Pagamento (Todos)</option>
              <option value="Pix">Pix</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
            </select>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            size={16}
          />
          <input
            type="search"
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            placeholder="Buscar por cliente, produto, método ou ID..."
            className="fintech-input w-full pl-10 pr-4"
          />
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-3 bg-white/[0.02] rounded-xl border border-dashed border-white/[0.1]">
            <AlertCircle size={32} className="text-zinc-600" />
            <div>
              <p className="text-white font-semibold text-sm">Nenhuma transação encontrada</p>
              <p className="text-xs text-zinc-500 mt-1">Altere os filtros para visualizar outros resultados</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 lg:hidden">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="text-sm font-semibold text-white block truncate">{tx.client}</strong>
                      <span className="text-xs text-zinc-400 block truncate mt-0.5">{tx.productName}</span>
                    </div>
                    <strong className="text-sm font-bold text-emerald-400 tabular-figure shrink-0">
                      +{money(tx.value)}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        tx.type === 'entrada'
                          ? 'bg-gold/12 text-gold border border-gold/25'
                          : 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25'
                      }`}
                    >
                      {tx.label}
                    </span>
                    <span className="tabular-figure">
                      {tx.paymentMethod} · {formatLocalDateBR(tx.date, { showTime: true })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                    <a
                      href={getWhatsAppShareLink(tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 rounded-lg bg-[#25D366]/12 border border-[#25D366]/25 text-[#25D366] text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onViewReceipt(tx)}
                      className="h-9 rounded-lg bg-gold/12 border border-gold/25 text-gold text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={13} />
                      <span>Recibo PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-zinc-400 h-11">
                    <th className="px-4 py-3">Cliente / ID</th>
                    <th className="px-4 py-3">Operação</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Data & Hora</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors h-16">
                      <td className="px-4 py-3">
                        <strong className="text-white font-semibold text-sm block">{tx.client}</strong>
                        <span className="text-[11px] text-zinc-500 font-mono tabular-figure">
                          #{tx.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            tx.type === 'entrada'
                              ? 'bg-gold/12 border border-gold/25 text-gold'
                              : 'bg-emerald-500/12 border border-emerald-500/25 text-emerald-400'
                          }`}
                        >
                          {tx.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300 font-medium">{tx.productName}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{tx.paymentMethod}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400 tabular-figure">
                        {formatLocalDateBR(tx.date, { showTime: true })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <strong className="text-emerald-400 text-sm font-bold tabular-figure">
                          +{money(tx.value)}
                        </strong>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={getWhatsAppShareLink(tx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 text-[#25D366] text-xs font-semibold transition-colors"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => onViewReceipt(tx)}
                            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/25 text-gold text-xs font-semibold transition-colors cursor-pointer"
                            title="Visualizar e Baixar Recibo PDF"
                          >
                            <FileText size={13} />
                            <span>Recibo</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
