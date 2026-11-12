import React, { useState } from 'react';
import { Sale, Settings } from '../types';
import { X, Copy, Check, MessageCircle, PenTool, ShieldCheck, ExternalLink, Link2 } from 'lucide-react';
import { getSigningLink, buildSigningWhatsAppText } from '../lib/signatureService';

interface ShareSigningLinkModalProps {
  sale: Sale;
  settings: Settings;
  onClose: () => void;
  onSignOnDevice: (sale: Sale) => void;
  onViewAudit?: (sale: Sale) => void;
}

export const ShareSigningLinkModal: React.FC<ShareSigningLinkModalProps> = ({
  sale,
  settings,
  onClose,
  onSignOnDevice,
  onViewAudit
}) => {
  const [copied, setCopied] = useState(false);
  const signingUrl = getSigningLink(sale.id);
  const isSigned = !!(sale.isSigned || sale.signature?.signed);
  const companyName = settings.companyName || 'NEXUS COMMERCE';

  const money = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const rawPhone = (sale.clientPhone || '').replace(/\D/g, '');
    const message = buildSigningWhatsAppText(sale.client, companyName, sale.id, signingUrl);
    const encoded = encodeURIComponent(message);
    const whatsappUrl = rawPhone
      ? `https://wa.me/55${rawPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Link2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Assinatura Eletrônica
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  CT-{(sale.id || '').substring(0, 8).toUpperCase()}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-1 text-white">
                Link de Assinatura do Cliente
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Informações da Operação */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Comprador</span>
              <strong className="text-sm font-bold text-white uppercase">{sale.client}</strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {sale.productName} • {money(sale.total)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Status</span>
              {isSigned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <ShieldCheck size={12} />
                  Assinado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <PenTool size={11} />
                  Pendente
                </span>
              )}
            </div>
          </div>

          {/* Campo com o Link Exato */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Link Único de Acesso do Cliente
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={signingUrl}
                className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 font-mono text-[11px] text-amber-300 outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              O cliente pode abrir este link direto em qualquer celular ou computador para assinar com o dedo ou mouse. Não exige login do sistema.
            </p>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <MessageCircle size={16} />
              <span>Enviar Link pelo WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOnDevice(sale);
              }}
              className="w-full py-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <PenTool size={15} />
              <span>Assinar Agora no Aparelho (Presencial)</span>
            </button>

            {isSigned && onViewAudit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewAudit(sale);
                }}
                className="w-full py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck size={15} />
                <span>Ver Certificado & Auditoria Jurídica</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
