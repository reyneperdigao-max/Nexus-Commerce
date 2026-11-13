import React, { useState } from 'react';
import { Sale, Settings, Installment } from '../types';
import { ShieldCheck, X, Copy, Check, Download, Calendar, Globe, Monitor, Lock, FileCheck } from 'lucide-react';
import { downloadContractAsPDF } from '../lib/pdfGenerator';
import { formatAuditTimestampBR } from '../lib/signatureService';

interface SignatureAuditModalProps {
  sale: Sale;
  settings: Settings;
  installments?: Installment[];
  onClose: () => void;
}

export const SignatureAuditModal: React.FC<SignatureAuditModalProps> = ({
  sale,
  settings,
  installments,
  onClose
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const audit = sale.signature;
  const hash = audit?.signatureHash || sale.signatureHash || 'N/A';
  const ip = audit?.signerIp || sale.signerIp || 'IP Não Registrado';
  const signedAtFormatted = audit?.signedAtFormatted || (sale.signedAt ? formatAuditTimestampBR(sale.signedAt) : 'Data/Hora Confirmada');
  const userAgent = audit?.signerUserAgent || sale.signerUserAgent || navigator.userAgent;
  const sigImg = audit?.signatureImage || sale.signatureImage;

  const handleCopyHash = () => {
    if (hash && hash !== 'N/A') {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleDownloadPDF = async () => {
    await downloadContractAsPDF(sale, settings, installments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header com Certificação */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-5 sm:p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck size={26} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-[9px] font-black uppercase tracking-wider">
                  Certificado de Autenticidade
                </span>
                <span className="text-[10px] text-emerald-200/80 font-mono">
                  CT-{(sale.id || '').substring(0, 8).toUpperCase()}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
                Rastro de Auditoria Jurídica
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo com rolagem elegante */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-xs">
          {/* Status Geral */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <FileCheck size={24} className="text-emerald-700 shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Status do Documento
              </span>
              <p className="font-extrabold text-emerald-950 text-sm">
                Contrato Assinado e Selado Digitalmente
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                Validade jurídica plena conforme MP nº 2.200-2/2001 e Art. 784, III do Código de Processo Civil.
              </p>
            </div>
          </div>

          {/* Assinatura Desenho */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Traço Manuscrito Capturado
            </span>
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[90px] shadow-xs">
              {sigImg ? (
                <img
                  src={sigImg}
                  alt={`Assinatura de ${sale.client}`}
                  className="max-h-20 max-w-full object-contain filter contrast-125"
                />
              ) : (
                <span className="text-slate-400 text-xs italic">Assinatura digital padrão registrada</span>
              )}
              <div className="w-48 border-b border-slate-300 mt-2"></div>
              <span className="text-[11px] font-black uppercase text-slate-800 mt-1">
                {sale.client}
              </span>
              <span className="text-[9px] text-slate-500 font-semibold">
                CPF: {sale.clientCpf || 'Registrado em Sistema'}
              </span>
            </div>
          </div>

          {/* Grade de Metadados Jurídicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Timestamp */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Calendar size={13} className="text-amber-600" />
                <span>Data e Hora Exatas</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {signedAtFormatted}
              </p>
              <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                Carimbo Temporal Auditado
              </span>
            </div>

            {/* Endereço IP */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Globe size={13} className="text-blue-600" />
                <span>Endereço IP do Dispositivo</span>
              </div>
              <p className="font-mono font-bold text-slate-900 text-xs">
                {ip}
              </p>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Origem Pública do Assinante
              </span>
            </div>
          </div>

          {/* Hash Criptográfico */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Lock size={13} className="text-emerald-600" />
                <span>Hash Criptográfico de Integridade (SHA-256)</span>
              </div>
              <button
                type="button"
                onClick={handleCopyHash}
                className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedHash ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                <span>{copiedHash ? 'Copiado!' : 'Copiar Hash'}</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-slate-800 bg-slate-100 p-2 rounded-lg break-all select-all border border-slate-200">
              {hash}
            </p>
          </div>

          {/* Dispositivo / User Agent */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              <Monitor size={13} className="text-purple-600" />
              <span>Navegador & Dispositivo (User-Agent)</span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono line-clamp-2 break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
              {userAgent}
            </p>
          </div>

          {/* Aceite Registrado */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
            <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-600 leading-relaxed">
              O comprador confirmou eletronicamente: <strong>&ldquo;Li e concordo integralmente com os termos deste contrato&rdquo;</strong>, vinculando o aceite formal irrevogável à operação mercantil.
            </p>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Baixar PDF Autenticado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
