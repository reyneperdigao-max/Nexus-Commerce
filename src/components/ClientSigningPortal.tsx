import React, { useState, useEffect, useCallback } from 'react';
import { Sale, Settings, Installment, SignatureAudit } from '../types';
import { SignaturePad } from './SignaturePad';
import { 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  Lock, 
  AlertCircle, 
  Sparkles,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { downloadContractAsPDF, getSystemSellerName } from '../lib/pdfGenerator';
import { formatLocalDateBR, extractDueDay } from '../lib/dateUtils';
import { 
  fetchClientPublicIp, 
  generateDocumentHash, 
  formatAuditTimestampBR 
} from '../lib/signatureService';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

interface ClientSigningPortalProps {
  saleId: string;
  sales: Sale[];
  settings: Settings;
  installments: Installment[];
  isLoading?: boolean;
  onSaveSignature: (saleId: string, audit: SignatureAudit) => Promise<boolean>;
  onExitPortal?: () => void;
}

export const ClientSigningPortal: React.FC<ClientSigningPortalProps> = ({
  saleId,
  sales,
  settings,
  installments,
  isLoading = false,
  onSaveSignature,
  onExitPortal
}) => {
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signedAuditOverride, setSignedAuditOverride] = useState<SignatureAudit | null>(null);

  const [remoteSale, setRemoteSale] = useState<Sale | null>(null);
  const [remoteSettings, setRemoteSettings] = useState<Settings | null>(null);
  const [remoteInstallments, setRemoteInstallments] = useState<Installment[]>([]);
  const [isFetchingRemote, setIsFetchingRemote] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const cleanId = (saleId || '').trim();
  const normalizedTarget = cleanId.replace(/^CT-/i, '').toLowerCase();

  // Localiza a venda no estado sincronizado ou no fallback remoto direto (sem falsos positivos em string vazia)
  const matchedFromState = cleanId
    ? sales.find(s => {
        const sid = String(s.id || '').trim();
        return sid === cleanId || (normalizedTarget.length >= 4 && sid.toLowerCase().startsWith(normalizedTarget));
      })
    : undefined;

  const baseSale = matchedFromState || remoteSale;
  const sale: Sale | null = baseSale
    ? signedAuditOverride
      ? {
          ...baseSale,
          signature: signedAuditOverride,
          isSigned: true,
          signatureImage: signedAuditOverride.signatureImage,
          signedAt: signedAuditOverride.signedAt,
          signerIp: signedAuditOverride.signerIp,
          signerUserAgent: signedAuditOverride.signerUserAgent,
          signatureHash: signedAuditOverride.signatureHash
        }
      : baseSale
    : null;

  const effectiveSettings = remoteSettings || settings;
  const effectiveInstallments = installments.length > 0 ? installments : remoteInstallments;

  const loadDirectFromFirestore = useCallback(async () => {
    if (!cleanId) {
      setIsFetchingRemote(false);
      return;
    }

    setIsFetchingRemote(true);
    setFetchError(null);

    try {
      let foundSale: Sale | null = null;

      // 1. Tenta buscar pelo ID exato
      const saleSnap = await getDoc(doc(db, 'sales', cleanId));
      if (saleSnap.exists()) {
        foundSale = { ...(saleSnap.data() as Sale), id: saleSnap.id };
      } else if (normalizedTarget.length >= 4) {
        // 2. Fallback para códigos curtos (ex: CT-XXXXXXXX ou prefixo)
        const allSalesSnap = await getDocs(collection(db, 'sales'));
        const matchedDoc = allSalesSnap.docs.find(d =>
          d.id.toLowerCase().startsWith(normalizedTarget)
        );
        if (matchedDoc) {
          foundSale = { ...(matchedDoc.data() as Sale), id: matchedDoc.id };
        }
      }

      if (foundSale) {
        setRemoteSale(foundSale);
        const instQuery = query(collection(db, 'installments'), where('saleId', '==', foundSale.id));
        const instSnap = await getDocs(instQuery);
        if (!instSnap.empty) {
          setRemoteInstallments(instSnap.docs.map(d => ({ ...(d.data() as Installment), id: d.id })));
        }
      }

      const settingsSnap = await getDoc(doc(db, 'settings', 'config'));
      if (settingsSnap.exists()) {
        setRemoteSettings(settingsSnap.data() as Settings);
      }
    } catch (err: any) {
      console.warn('Busca direta do contrato para assinatura:', err?.code || err);
      if (err?.code === 'permission-denied') {
        setFetchError('Permissão negada ao consultar o contrato no servidor.');
      }
    } finally {
      setIsFetchingRemote(false);
    }
  }, [cleanId, normalizedTarget]);

  // Escuta em tempo real do documento específico (garante recuperação mesmo em rede lenta)
  useEffect(() => {
    if (!cleanId) {
      setIsFetchingRemote(false);
      return;
    }

    loadDirectFromFirestore();

    const unsubDoc = onSnapshot(
      doc(db, 'sales', cleanId),
      (snap) => {
        if (snap.exists()) {
          setRemoteSale({ ...(snap.data() as Sale), id: snap.id });
          setIsFetchingRemote(false);
        }
      },
      (err) => {
        if (err?.code === 'permission-denied') {
          setFetchError('Permissão negada ao acessar o contrato.');
          setIsFetchingRemote(false);
        }
      }
    );

    return () => unsubDoc();
  }, [cleanId, retryToken, loadDirectFromFirestore]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const money = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (!sale && (isLoading || isFetchingRemote)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Carregando Contrato Seguro</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Buscando instrumento contratual e autenticando canal de assinatura digital...
          </p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={30} />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Contrato Não Encontrado</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {fetchError || 'O documento solicitado não foi localizado ou pode ter sido encerrado. Verifique o link recebido com o vendedor.'}
          </p>
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => setRetryToken(prev => prev + 1)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              <span>Tentar Novamente</span>
            </button>
            {onExitPortal && (
              <button
                type="button"
                onClick={onExitPortal}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Voltar ao Painel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const clientDisplayName = sale.client || 'Cliente';
  const clientUpper = clientDisplayName.toUpperCase();
  const isAlreadySigned = !!(sale.isSigned || sale.signature?.signed);
  const companyName = (effectiveSettings.companyName || 'NEXUS COMMERCE').toUpperCase();
  const sellerName = getSystemSellerName(effectiveSettings, sale);
  const dateFormatted = formatLocalDateBR(sale.date || sale.createdAt || new Date());
  const contractCode = (sale.id || '').substring(0, 8).toUpperCase();

  let dueDay = '—';
  if (effectiveInstallments && effectiveInstallments.length > 0) {
    const matchingInst = effectiveInstallments.find(i => i.saleId === sale.id);
    if (matchingInst?.dueDate) {
      dueDay = extractDueDay(matchingInst.dueDate);
    }
  }
  if (dueDay === '—' && sale.date) {
    dueDay = extractDueDay(sale.date);
  }

  const downPayment = sale.downPayment || 0;
  const installmentsCount = sale.installmentsCount || 1;
  const installmentVal = sale.installmentValue || 0;
  const isInterest = !!sale.isInterestOnly;
  const interestRate = sale.interestRate || 0;

  const handleSignatureCapture = (hasSig: boolean, dataUrl: string) => {
    setHasSignature(hasSig);
    setSignatureDataUrl(dataUrl);
    setSubmitError(null);
  };

  const handleSubmitSignature = async () => {
    if (!agreed) {
      setSubmitError('Você deve marcar a caixa de concordância com os termos do contrato.');
      return;
    }
    if (!hasSignature || !signatureDataUrl) {
      setSubmitError('Por favor, desenhe sua assinatura no quadro indicado antes de confirmar.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // 1. Captura de Metadados Jurídicos (Auditoria Digital)
      const clientIp = await fetchClientPublicIp();
      const nowIso = new Date().toISOString();
      const formattedTimestamp = formatAuditTimestampBR(nowIso);
      const userAgent = navigator.userAgent;

      // 2. Geração do Hash de Integridade SHA-256
      const payloadToHash = `${sale.id}|${sale.clientCpf || ''}|${sale.total}|${nowIso}|${clientIp}|${signatureDataUrl.substring(0, 150)}`;
      const signatureHash = await generateDocumentHash(payloadToHash);

      // 3. Estruturação do Pacote de Auditoria
      const auditData: SignatureAudit = {
        signed: true,
        signatureImage: signatureDataUrl,
        signedAt: nowIso,
        signedAtFormatted: formattedTimestamp,
        signerName: clientDisplayName,
        signerCpf: sale.clientCpf || 'Registrado em Sistema',
        signerIp: clientIp,
        signerUserAgent: userAgent,
        signatureHash: signatureHash,
        acceptedTerms: true,
        authMethod: 'Assinatura Eletrônica Touch/Mouse com Metadados Jurídicos (MP 2.200-2/2001 e Art. 784, III CPC)'
      };

      // 4. Gravação atômica no Banco de Dados
      const ok = await onSaveSignature(sale.id, auditData);
      if (ok) {
        setSignedAuditOverride(auditData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitError('Não foi possível gravar a assinatura no momento. Verifique sua conexão e tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro ao processar assinatura eletrônica:', err);
      setSubmitError('Ocorreu um erro ao processar sua assinatura: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    await downloadContractAsPDF(sale, effectiveSettings, effectiveInstallments);
  };

  const auditHash = sale.signature?.signatureHash || sale.signatureHash;
  const auditIp = sale.signature?.signerIp || sale.signerIp;
  const auditTime = sale.signature?.signedAtFormatted || (sale.signedAt ? formatAuditTimestampBR(sale.signedAt) : undefined);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-6 sm:py-12 px-3 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">

        {/* Topo Institucional */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-3xl backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
              <ShieldCheck size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 block">
                Portal Seguro de Assinatura Digital
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                {companyName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold">
              CONTRATO CT-{contractCode}
            </span>
            {onExitPortal && (
              <button
                onClick={onExitPortal}
                className="px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar ao Painel
              </button>
            )}
          </div>
        </header>

        {/* Banner de Status */}
        {isAlreadySigned ? (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-emerald-950/80 border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                  Documento Autenticado e Bloqueado
                </span>
                <h2 className="text-base sm:text-lg font-black text-white mt-1">
                  Contrato Assinado com Sucesso!
                </h2>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Assinado eletronicamente por <strong>{clientDisplayName}</strong> em {auditTime || formatAuditTimestampBR(sale.signedAt)}.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              <span>Baixar Contrato (PDF)</span>
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/30 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                Aguardando Aceite Digital
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Olá, {clientDisplayName}!
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Revise os termos e condições abaixo e realize a sua assinatura digital no final da página para formalizar sua aquisição.
              </p>
            </div>
          </div>
        )}

        {/* DOCUMENTO OFICIAL DO CONTRATO */}
        <section className="bg-white text-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
          
          {/* Cabeçalho do Documento */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-amber-700 tracking-tight">
                {companyName}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Instrumento Particular de Compromisso de Venda e Confissão de Dívida
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="font-mono font-bold text-xs text-slate-900 block">
                Nº: CT-{contractCode}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Emissão: {dateFormatted}
              </span>
            </div>
          </div>

          {/* Quadro-Resumo da Transação */}
          <div className="border border-slate-300 rounded-2xl p-4 sm:p-5 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Quadro-Resumo da Transação
              </h3>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                {isInterest ? `Juros Mensais (${interestRate}% a.m.)` : 'Parcelamento Direto'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comprador(a)
                </span>
                <strong className="text-slate-900 uppercase text-xs">{clientDisplayName}</strong>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  CPF / Documento
                </span>
                <strong className="text-slate-900 text-xs">{sale.clientCpf || 'Registrado em Sistema'}</strong>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Telefone de Contato
                </span>
                <span className="text-slate-700 font-semibold">{sale.clientPhone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Endereço
                </span>
                <span className="text-slate-700">{sale.clientAddress || 'Conforme cadastro no sistema'}</span>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Ativo / Bem Comercial Alienado
                </span>
                <strong className="text-slate-900 text-xs uppercase">
                  {(sale.productName || 'PRODUTO REGISTRADO').toUpperCase()}
                </strong>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Total da Operação
                </span>
                <strong className="text-sm font-black text-slate-950">{money(sale.total)}</strong>
                {downPayment > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                    Entrada Paga: {money(downPayment)}
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Condições de Pagamento
                </span>
                <strong className="text-slate-900 text-xs">
                  {isInterest 
                    ? `${installmentsCount} parcelas de juros de ${money(installmentVal)}`
                    : `${installmentsCount} parcelas fixas de ${money(installmentVal)}`}
                </strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Vencimento: Todo dia <strong>{dueDay}</strong> de cada mês
                </span>
              </div>
            </div>
          </div>

          {/* Cláusulas Contratuais */}
          <div className="space-y-3.5 text-xs text-slate-700 pt-2">
            <div>
              <strong className="text-slate-900 uppercase block text-[10.5px] font-black mb-1">
                Cláusula 1ª – Das Partes Contratantes
              </strong>
              <p className="text-justify leading-relaxed">
                Pelo presente instrumento, de um lado denominada(o) <strong>VENDEDOR(A)</strong>: <strong>{sellerName}</strong>; e de outro lado denominada(o) <strong>COMPRADOR(A)</strong>: <strong>{clientUpper}</strong>, CPF nº <strong>{sale.clientCpf || 'N/A'}</strong>, telefone <strong>{sale.clientPhone || 'N/A'}</strong>{sale.clientAddress ? `, domiciliado(a) em ${sale.clientAddress}` : ''}, firmam o presente compromisso de compra e venda mercantil.
              </p>
            </div>

            <div>
              <strong className="text-slate-900 uppercase block text-[10.5px] font-black mb-1">
                Cláusula 2ª – Do Objeto da Negociação
              </strong>
              <p className="text-justify leading-relaxed">
                O presente contrato tem por objeto a alienação do bem/serviço: <strong>{(sale.productName || 'PRODUTO REGISTRADO').toUpperCase()}</strong>, entregue ou disponibilizado em perfeitas condições de uso e funcionamento, conferido e aceito pelo Comprador.
              </p>
            </div>

            <div>
              <strong className="text-slate-900 uppercase block text-[10.5px] font-black mb-1">
                Cláusula 3ª – Do Preço, Condições e Amortização
              </strong>
              <p className="text-justify leading-relaxed">
                O valor total estipulado é de <strong>{money(sale.total)}</strong>, a ser liquidado conforme discriminado no Quadro-Resumo, com vencimento estipulado para todo dia <strong>{dueDay}</strong> de cada mês subsequente. Fica assegurado ao Comprador o direito de realizar quitações antecipadas ou amortizações extraordinárias a qualquer momento com abatimento proporcional da dívida.
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border-l-4 border-amber-500 rounded-r-xl">
              <strong className="text-amber-950 uppercase block text-[10.5px] font-black mb-1">
                Cláusula 4ª – Da Tolerância, Encargos e Bloqueio por Atraso
              </strong>
              <p className="text-justify text-slate-800 leading-relaxed">
                Eventual atraso na quitação de parcelas acarretará multa moratória de 2% (dois por cento) sobre o valor vencido, acrescida de juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso (<em>pro rata die</em>) até a efetiva quitação. O atraso superior a 5 (cinco) dias corridos da data de vencimento autoriza o VENDEDOR a realizar o bloqueio do funcionamento do aparelho de forma remota, sendo o desbloqueio efetuado em até 24 horas após a confirmação do pagamento integral do débito e encargos. Fica expressamente proibida qualquer tentativa de remoção, formatação clandestina ou burla do sistema de segurança do dispositivo pelo comprador, sob pena de vencimento antecipado de todo o saldo devedor.
              </p>
            </div>

            <div>
              <strong className="text-slate-900 uppercase block text-[10.5px] font-black mb-1">
                Cláusula 5ª – Da Eficácia e Confissão de Dívida
              </strong>
              <p className="text-justify leading-relaxed">
                As partes reconhecem a plena validade jurídica deste instrumento eletrônico e seus respectivos comprovantes, constituindo confissão líquida, certa e exigível de dívida nos termos do art. 784, inciso III do Código de Processo Civil Brasileiro.
              </p>
            </div>

            <div>
              <strong className="text-slate-900 uppercase block text-[10.5px] font-black mb-1">
                Cláusula 6ª – Do Foro de Eleição
              </strong>
              <p className="text-justify leading-relaxed">
                Fica eleito o foro da comarca da sede do Vendedor para dirimir quaisquer dúvidas decorrentes do presente instrumento.
              </p>
            </div>
          </div>

          {/* Área de Assinaturas no Documento */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-center text-[10px] text-slate-400 italic mb-8">
              E por estarem justos, acordados e de pleno acordo, firmam o presente compromisso.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-4 items-end">
              {/* Vendedor */}
              <div className="text-center space-y-1">
                <div className="h-[1.5px] bg-slate-700 w-full mb-2"></div>
                <strong className="text-xs font-black uppercase text-slate-900 block">
                  {sellerName}
                </strong>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                  Vendedor(a) • {companyName}
                </span>
              </div>

              {/* Comprador */}
              <div className="text-center space-y-1 flex flex-col items-center">
                {isAlreadySigned && (sale.signatureImage || sale.signature?.signatureImage) ? (
                  <div className="mb-1 flex flex-col items-center">
                    <img 
                      src={sale.signatureImage || sale.signature?.signatureImage} 
                      alt="Assinatura Comprador" 
                      className="max-h-16 max-w-[200px] object-contain filter contrast-125"
                    />
                    <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                      ✓ Assinado Eletronicamente
                    </span>
                  </div>
                ) : (
                  <div className="h-10 flex items-center justify-center text-slate-300 text-[10px] italic">
                    (Assinatura no formulário abaixo)
                  </div>
                )}
                <div className="h-[1.5px] bg-slate-700 w-full mb-2"></div>
                <strong className="text-xs font-black uppercase text-slate-900 block">
                  {clientDisplayName}
                </strong>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                  Comprador(a) • CPF: {sale.clientCpf || 'Registrado'}
                </span>
              </div>
            </div>

            {/* Rodapé de Autenticação */}
            {isAlreadySigned && auditHash ? (
              <div className="mt-8 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[9px] text-emerald-950 font-mono space-y-1">
                <div className="flex flex-col sm:flex-row justify-between gap-1 font-bold break-all">
                  <span>HASH SHA-256: {auditHash}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-emerald-800 gap-1">
                  <span>IP ASSINANTE: {auditIp || 'Registrado'}</span>
                  <span>DATA/HORA: {auditTime} • MP 2.200-2/2001</span>
                </div>
              </div>
            ) : (
              <div className="mt-8 pt-3 border-t border-dashed border-slate-200 flex flex-col sm:flex-row justify-between text-[9px] text-slate-400 font-mono gap-1">
                <span>AUTENTICAÇÃO: {(sale.id || '').toUpperCase()}</span>
                <span>VIA DIGITAL • MP 2.200-2/2001 e CPC ART. 784</span>
              </div>
            )}
          </div>
        </section>

        {/* ÁREA DE CAPTURA DE ASSINATURA ELETRÔNICA (Para o Cliente Assinar) */}
        {!isAlreadySigned && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Campo de Assinatura Eletrônica
                </h3>
                <p className="text-xs text-slate-400">
                  Preencha sua assinatura manuscrita abaixo para emitir o aceite digital
                </p>
              </div>
            </div>

            {/* Componente Canvas SignaturePad */}
            <SignaturePad 
              onSignatureChange={handleSignatureCapture} 
              disabled={isSubmitting}
            />

            {/* Caixa de Seleção Obrigatória de Aceite */}
            <label className="flex items-start gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
                className="w-5 h-5 mt-0.5 rounded-lg text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 border-slate-700 bg-slate-900 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-slate-200 leading-relaxed select-none">
                <strong>Li e concordo integralmente com os termos deste contrato</strong> de compra e venda mercantil, declarando verdadeiras as informações prestadas e assumindo as obrigações estipuladas.
              </span>
            </label>

            {/* Informação sobre os metadados jurídicos */}
            <div className="flex items-start gap-2.5 px-3 py-2 text-[10.5px] text-slate-400">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Para sua segurança e validade perante o Art. 784 do CPC, este sistema registrará o <strong>endereço IP público</strong>, <strong>carimbo de data/hora</strong> e <strong>identificador do seu navegador</strong> no momento da confirmação.
              </span>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Botão de Confirmação */}
            <button
              type="button"
              onClick={handleSubmitSignature}
              disabled={!agreed || !hasSignature || isSubmitting}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                !agreed || !hasSignature || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Autenticando e Gravando Assinatura...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirmar e Assinar Contrato Digitalmente</span>
                </>
              )}
            </button>
          </section>
        )}

        {/* Rodapé Institucional */}
        <footer className="text-center text-[10px] text-slate-500 py-4">
          <p>{companyName} • Gestão Comercial Segura & Transações Confiáveis</p>
          <p className="mt-0.5 font-mono">Assinatura Eletrônica em Conformidade com a Lei Federal Brasileira nº 14.063/2020</p>
        </footer>

      </div>
    </div>
  );
};
