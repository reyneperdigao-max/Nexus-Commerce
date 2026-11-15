import {
  BadgeDollarSign,
  Calculator,
  Download,
  MessageCircle,
  Plus,
  Share2,
  Zap,
} from 'lucide-react';
import { Product } from '../../types';

interface SimulationViewProps {
  products: Product[];
  simSelectedProductId: string;
  simProductName: string;
  setSimProductName: (val: string) => void;
  simCashPrice: number;
  simDownPayment: number;
  simValue: number;
  setSimValue: (val: number) => void;
  setSimCashPrice: (val: number) => void;
  simPmt: string;
  simRate: number;
  setSimRate: (val: number) => void;
  simInstallments: number;
  setSimInstallments: (val: number) => void;
  setIsEditingPmt: (val: boolean) => void;
  onSelectProductForSim: (productId: string) => void;
  onSimCashPriceChange: (val: number) => void;
  onSimDownPaymentChange: (val: number) => void;
  onSimPmtChange: (val: string) => void;
  onDownloadSimulationPDF: () => void;
  onShareSimulationWhatsApp: () => void;
  onLaunchSaleFromSim: () => void;
  money: (val: number) => string;
}

export function SimulationView({
  products,
  simSelectedProductId,
  simProductName,
  setSimProductName,
  simCashPrice,
  simDownPayment,
  simValue,
  setSimValue,
  setSimCashPrice,
  simPmt,
  simRate,
  setSimRate,
  simInstallments,
  setSimInstallments,
  setIsEditingPmt,
  onSelectProductForSim,
  onSimCashPriceChange,
  onSimDownPaymentChange,
  onSimPmtChange,
  onDownloadSimulationPDF,
  onShareSimulationWhatsApp,
  onLaunchSaleFromSim,
  money,
}: SimulationViewProps) {
  const i = simRate / 100;
  const n = simInstallments > 0 ? simInstallments : 1;
  const pv = simValue > 0 ? simValue : 0;
  const denominator = Math.pow(1 + i, n) - 1;
  const rawPmt =
    i === 0 || denominator <= 0
      ? n > 0
        ? pv / n
        : 0
      : (pv * (i * Math.pow(1 + i, n))) / denominator;
  const safeRawPmt = Number.isFinite(rawPmt) && !Number.isNaN(rawPmt) ? rawPmt : 0;
  const pmt = Math.round(safeRawPmt * 100) / 100;
  const totalInstallments = Math.round(pmt * n * 100) / 100;
  const totalPrazo = Math.round((totalInstallments + (simDownPayment || 0)) * 100) / 100;
  const effectiveCash = simCashPrice > 0 ? simCashPrice : pv + (simDownPayment || 0);
  const diffVal = totalPrazo - effectiveCash;
  const diffPct = effectiveCash > 0 ? ((diffVal / effectiveCash) * 100).toFixed(1) : '0';

  return (
    <div className="flex flex-col gap-6 animate-view-enter">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Simulador Financeiro</h1>
        <p className="text-xs sm:text-[13px] text-zinc-400 mt-0.5">
          Calcule planos à vista e parcelados, simule juros compostos e gere propostas instantâneas
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Painel de Parâmetros */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          <div className="glass-card p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                  <Calculator size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Parâmetros da Proposta</h2>
                  <p className="text-[11px] text-zinc-400">Configure valores, entrada e taxa</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Puxar Produto do Estoque */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                  <span>Importar do Estoque (Opcional)</span>
                  <span className="text-[11px] text-zinc-500">Auto-preenche</span>
                </label>
                <select
                  value={simSelectedProductId}
                  onChange={(e) => onSelectProductForSim(e.target.value)}
                  className="fintech-select"
                >
                  <option value="">Digitar manualmente...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — À Vista: {money(p.sale)} (Estoque: {p.quantity || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome do Produto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-300">Nome do Ativo / Modelo</label>
                <input
                  type="text"
                  value={simProductName}
                  onChange={(e) => setSimProductName(e.target.value)}
                  className="fintech-input"
                  placeholder="Ex: iPhone 15 Pro Max 256GB"
                />
              </div>

              {/* Valor À Vista */}
              <div className="p-4 rounded-xl bg-gold/[0.04] border border-gold/25 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gold flex items-center gap-1.5">
                    <BadgeDollarSign size={14} />
                    Valor À Vista do Produto (R$)
                  </label>
                  <span className="text-[10px] font-medium text-gold/80">Preço Base</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={simCashPrice || ''}
                  onChange={(e) => onSimCashPriceChange(Number(e.target.value))}
                  className="h-12 bg-[#07090e] border border-gold/30 rounded-xl px-4 font-bold text-lg text-gold outline-none focus:border-gold tabular-figure"
                  placeholder="0,00"
                />
                <p className="text-[11px] text-zinc-400">
                  Preço unitário de referência para pagamento imediato.
                </p>
              </div>

              {/* Entrada & Saldo Financiado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Entrada (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simDownPayment || ''}
                    onChange={(e) => onSimDownPaymentChange(Number(e.target.value))}
                    className="fintech-input text-sky-400 font-semibold tabular-figure"
                    placeholder="0,00"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Saldo a Parcelar (PV)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simValue || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSimValue(v);
                      if (simCashPrice === 0) setSimCashPrice(v + simDownPayment);
                    }}
                    className="fintech-input font-semibold tabular-figure"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Valor da Parcela (PMT) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                  <span>Valor da Parcela (PMT)</span>
                  <span className="text-[11px] text-zinc-500">Recalcula a taxa automaticamente</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={simPmt}
                    onFocus={() => setIsEditingPmt(true)}
                    onBlur={() => setIsEditingPmt(false)}
                    onChange={(e) => onSimPmtChange(e.target.value)}
                    className="fintech-input w-full pr-20 font-bold text-amber-200 tabular-figure"
                    placeholder="0,00"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-zinc-500 pointer-events-none">
                    BRL/mês
                  </span>
                </div>
              </div>

              {/* Taxa & Parcelas */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Taxa Mensal (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simRate || ''}
                    onChange={(e) => setSimRate(Number(e.target.value))}
                    className="fintech-input font-semibold tabular-figure"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Nº de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={simInstallments || ''}
                    onChange={(e) => setSimInstallments(Number(e.target.value))}
                    className="fintech-input font-semibold tabular-figure"
                    placeholder="12"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos de Taxa */}
          <div className="glass-card p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
              <Zap size={14} className="text-gold" />
              Atalhos Rápidos de Taxa Mensal
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[0, 2, 3.5, 5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSimRate(rate)}
                  className={`h-10 rounded-xl text-xs font-semibold border transition-all cursor-pointer tabular-figure ${
                    simRate === rate
                      ? 'bg-gold text-[#07090e] border-gold'
                      : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-gold/35 hover:text-white'
                  }`}
                >
                  {rate === 0 ? '0%' : `${rate}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Proposta Gerada */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          <div id="simulation-content" className="glass-card p-5 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gold uppercase tracking-wider">Proposta Comercial</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] text-zinc-400">
                    {new Date().toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                  {simProductName || 'Simulação de Venda Personalizada'}
                </h2>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <Zap size={20} />
              </div>
            </div>

            {/* Cards Comparativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 sm:p-5 rounded-xl bg-gold/[0.04] border border-gold/25 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-medium text-gold/85 block mb-1">Valor À Vista</span>
                  <strong className="text-2xl font-bold text-gold block tabular-figure tracking-tight">
                    {money(effectiveCash)}
                  </strong>
                </div>
                <span className="text-[11px] text-zinc-400 pt-2 border-t border-gold/15">
                  Pagamento imediato
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-[#07090e]/70 border border-white/[0.08] flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-medium text-zinc-400 block mb-1">Parcelamento ({n}x)</span>
                  <strong className="text-2xl font-bold text-white block tabular-figure tracking-tight">
                    {money(pmt)}
                  </strong>
                </div>
                <span className="text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
                  Valor mensal da parcela
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/25 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-medium text-emerald-400 block mb-1">Total a Prazo</span>
                  <strong className="text-2xl font-bold text-emerald-400 block tabular-figure tracking-tight">
                    {money(totalPrazo)}
                  </strong>
                </div>
                <span className="text-[11px] text-emerald-400/80 pt-2 border-t border-emerald-500/15 tabular-figure">
                  {diffVal > 0
                    ? `+${money(diffVal)} (+${diffPct}%)`
                    : diffVal === 0
                      ? '0% Juros (Mesmo preço)'
                      : 'Condição com desconto'}
                </span>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#07090e]/60 border border-white/[0.07] flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-zinc-300 pb-2 border-b border-white/[0.06]">
                Demonstrativo Comparativo de Condições
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] text-zinc-500 block">Preço À Vista</span>
                  <strong className="text-sm font-bold text-gold tabular-figure">{money(effectiveCash)}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Entrada</span>
                  <strong className="text-sm font-bold text-sky-400 tabular-figure">
                    {simDownPayment > 0 ? money(simDownPayment) : 'Sem Entrada'}
                  </strong>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Saldo Parcelado</span>
                  <strong className="text-sm font-bold text-white tabular-figure">{money(pv)}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Taxa Aplicada</span>
                  <strong className="text-sm font-bold text-amber-300 tabular-figure">
                    {simRate.toFixed(2)}% a.m.
                  </strong>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold text-[#07090e] flex items-center justify-center shrink-0">
                  <Share2 size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Apresentar Proposta</h4>
                  <p className="text-xs text-zinc-400">Exporte em PDF, envie no WhatsApp ou lance como venda</p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDownloadSimulationPDF}
                  className="h-10 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onShareSimulationWhatsApp}
                  className="h-10 px-3.5 rounded-xl bg-[#25D366] hover:brightness-110 text-[#07090e] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onLaunchSaleFromSim}
                  className="h-10 px-4 rounded-xl bg-gold hover:brightness-110 text-[#07090e] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_14px_rgba(243,186,47,0.22)]"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Lançar Venda</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
