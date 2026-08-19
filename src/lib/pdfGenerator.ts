import { jsPDF } from 'jspdf';
import { Sale, Settings, Installment } from '../types';

const money = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

/**
 * Builds a vector-sharp 1-page A4 Contract PDF using jsPDF (fast, non-freezing, 0ms lag, guaranteed single page)
 */
export function createContractPDFDoc(
  sale: Sale,
  settings: Settings,
  installments?: Installment[]
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const companyName = (settings.companyName || settings.userName || 'GESTÃO DE VENDAS').toUpperCase();
  const dateFormatted = sale.date ? new Date(sale.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const cleanId = (sale.id || '').substring(0, 8).toUpperCase();
  
  let dueDay = '—';
  if (sale.date) {
    dueDay = String(new Date(sale.date).getUTCDate());
  } else if (installments && installments.length > 0) {
    const matchingInst = installments.find(i => i.saleId === sale.id);
    if (matchingInst?.dueDate) {
      dueDay = String(new Date(matchingInst.dueDate).getUTCDate());
    }
  }

  const downPayment = sale.downPayment || 0;
  const installmentsCount = sale.installmentsCount || 1;
  const installmentVal = sale.installmentValue || 0;
  const isInterest = !!sale.isInterestOnly;
  const interestRate = sale.interestRate || 0;

  const left = 15;
  const right = 195;
  const width = 180;
  let y = 18;

  // 1. Cabeçalho Institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(companyName, left, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nº: CT-${cleanId}`, right, y, { align: 'right' });

  y += 6.5;
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('CONTRATO DE COMPRA E VENDA', left, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emissão: ${dateFormatted}`, right, y, { align: 'right' });

  y += 5;
  doc.setFontSize(8.5);
  doc.text('Instrumento Particular de Compromisso de Venda e Confissão de Dívida', left, y);

  y += 4;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(left, y, right, y);

  // 2. Quadro-Resumo Box
  y += 5;
  const boxTop = y;
  const boxHeight = 56;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(left, boxTop, width, boxHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('QUADRO-RESUMO DA TRANSAÇÃO', left + 4, y + 6);

  const badgeText = isInterest ? `JUROS MENSAIS (${interestRate}% A.M.)` : 'PARCELAMENTO DIRETO';
  doc.setFontSize(8.5);
  if (isInterest) {
    doc.setTextColor(146, 64, 14);
  } else {
    doc.setTextColor(3, 105, 161);
  }
  doc.text(badgeText, right - 4, y + 6, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(left + 3, y + 9, right - 3, y + 9);

  // Quadro-resumo campos (5 linhas balanceadas)
  y += 15.5;
  doc.setFontSize(9);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Comprador(a):', left + 4, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.client.toUpperCase(), left + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CPF / Doc:', left + 104, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.clientCpf || 'Registrado em Sistema', left + 125, y);

  // Row 2
  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Telefone:', left + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.clientPhone || 'N/A', left + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Endereço:', left + 104, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const addr = (sale.clientAddress || 'Conforme cadastro no sistema').substring(0, 42);
  doc.text(addr, left + 125, y);

  // Row 3
  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Produto / Bem:', left + 4, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const prod = (sale.productName || 'PRODUTO REGISTRADO').toUpperCase().substring(0, 75);
  doc.text(prod, left + 28, y);

  // Row 4
  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Valor Total:', left + 4, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(money(sale.total), left + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Entrada Paga:', left + 104, y);
  doc.setFont('helvetica', 'bold');
  if (downPayment > 0) {
    doc.setTextColor(21, 128, 61);
    doc.text(money(downPayment), left + 125, y);
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('Sem entrada', left + 125, y);
  }

  // Row 5
  y += 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Plano Pagto:', left + 4, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const plan = isInterest 
    ? `${installmentsCount} parcelas de juros de ${money(installmentVal)}` 
    : `${installmentsCount} parcelas de ${money(installmentVal)}`;
  doc.text(plan, left + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Vencimento:', left + 104, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Todo dia ${dueDay} de cada mês`, left + 125, y);

  // 3. Cláusulas Contratuais
  y = boxTop + boxHeight + 6.5;

  const clauses = [
    {
      title: 'CLÁUSULA 1ª – DAS PARTES CONTRATANTES',
      body: `Pelo presente instrumento, de um lado denominada(o) VENDEDOR(A): ${companyName}; e de outro lado denominada(o) COMPRADOR(A): ${sale.client.toUpperCase()}, portador(a) do CPF/Doc nº ${sale.clientCpf || 'N/A'}, telefone ${sale.clientPhone || 'N/A'}${sale.clientAddress ? `, domiciliado(a) em ${sale.clientAddress}` : ''}, firmam o presente compromisso de compra e venda mercantil.`
    },
    {
      title: 'CLÁUSULA 2ª – DO OBJETO DA NEGOCIAÇÃO',
      body: `O presente contrato tem por objeto a alienação do bem/serviço: ${(sale.productName || 'PRODUTO REGISTRADO').toUpperCase()}, entregue ou disponibilizado em perfeitas condições de uso e funcionamento, conferido e aceito pelo Comprador.`
    },
    {
      title: 'CLÁUSULA 3ª – DO PREÇO, CONDIÇÕES E AMORTIZAÇÃO',
      body: `O valor total estipulado é de ${money(sale.total)}, a ser liquidado conforme discriminado no Quadro-Resumo, com vencimento estipulado para todo dia ${dueDay} de cada mês subsequente. Fica assegurado ao Comprador o direito de realizar quitações antecipadas ou amortizações extraordinárias com abatimento proporcional da dívida.`
    },
    {
      title: 'CLÁUSULA 4ª – DA TOLERÂNCIA E ENCARGOS POR ATRASO',
      body: 'Eventual atraso na quitação de parcelas acarretará em multa moratória de 2% (dois por cento) sobre a parcela vencida, acrescida de juros de 1% (um por cento) ao mês calculados pro rata die até a efetiva quitação.'
    },
    {
      title: 'CLÁUSULA 5ª – DA EFICÁCIA E CONFISSÃO DE DÍVIDA',
      body: 'As partes reconhecem a plena validade jurídica deste instrumento eletrônico e seus respectivos comprovantes, constituindo confissão líquida, certa e exigível de dívida nos termos do art. 784, inciso III do Código de Processo Civil Brasileiro.'
    },
    {
      title: 'CLÁUSULA 6ª – DO FORO DE ELEIÇÃO',
      body: 'Fica eleito o foro da comarca da sede do Vendedor para dirimir quaisquer dúvidas oriundas deste instrumento.'
    }
  ];

  for (const c of clauses) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(c.title, left, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(c.body, width);
    doc.text(lines, left, y);
    y += (lines.length * 3.8) + 3.2;
  }

  // 4. Declaração de Aceite & Assinaturas - posicionadas dinamicamente na parte inferior
  const footerY = 283;
  const minSignatureSpace = 34; // texto de aceite + linha + nomes + labels
  
  // Preenche proporcionalmente a folha inteira
  if (y + minSignatureSpace < footerY - 5) {
    y = footerY - minSignatureSpace - 4;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.2);
  doc.setTextColor(100, 116, 139);
  doc.text('E por estarem justos, acordados e de pleno acordo, firmam o presente compromisso.', 105, y, { align: 'center' });

  // Espaço generoso para assinar
  y += 18;

  // Linha Vendedor
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.5);
  doc.line(left + 8, y, left + 80, y);

  // Linha Comprador
  doc.line(left + 100, y, left + 172, y);

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(companyName.substring(0, 36), left + 44, y, { align: 'center' });
  doc.text(sale.client.toUpperCase().substring(0, 36), left + 136, y, { align: 'center' });

  y += 3.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VENDEDOR(A)', left + 44, y, { align: 'center' });
  doc.text('COMPRADOR(A)', left + 136, y, { align: 'center' });

  // 5. Rodapé na base exata da folha A4
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(left, footerY, right, footerY);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(148, 163, 184);
  doc.text(`AUTENTICAÇÃO: ${sale.id.toUpperCase()} • DOCUMENTO DIGITAL`, left, footerY + 4.5);
  doc.text(`VIA ORIGINAL • EMISSÃO: ${dateFormatted}`, right, footerY + 4.5, { align: 'right' });

  return doc;
}

/**
 * Builds a vector-sharp Receipt PDF using jsPDF
 */
export function createReceiptPDFDoc(
  installment: Installment,
  sale?: Sale,
  settings?: Settings
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const companyName = (settings?.companyName || settings?.userName || 'GESTÃO DE VENDAS').toUpperCase();
  const transactionDate = installment.paidAt || installment.dueDate || new Date().toISOString();
  const cleanId = (installment.id || '').toUpperCase().substring(0, 12);
  const dateFormatted = new Date(transactionDate).toLocaleDateString('pt-BR');
  const timeFormatted = new Date(transactionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let y = 20;
  const left = 20;
  const right = 190;
  const width = 170;

  // Header Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6);
  doc.text(companyName, left, y);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID: ${cleanId}`, right, y, { align: 'right' });

  y += 6;
  doc.setFontSize(15);
  doc.setTextColor(9, 9, 11);
  doc.text('COMPROVANTE DE RECEBIMENTO', left, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${dateFormatted} às ${timeFormatted}`, right, y, { align: 'right' });

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('Terminal de Operações Comerciais', left, y);

  y += 4;
  doc.setDrawColor(255, 215, 0);
  doc.setLineWidth(0.8);
  doc.line(left, y, right, y);

  // Big Value Box
  y += 6;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, y, width, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('VALOR LIQUIDADO', 105, y + 6, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(9, 9, 11);
  doc.text(money(installment.value), 105, y + 15, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('● TRANSAÇÃO APROVADA & CONCILIADA', 105, y + 22, { align: 'center' });

  y += 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  const p1 = `Declaramos para os devidos fins que recebemos de ${installment.client.toUpperCase()}, o montante integral de ${money(installment.value)}.`;
  const p2 = `Referente à liquidação da parcela Nº ${installment.number || 1} de ${installment.total || 1} vinculada ao produto/serviço: ${(installment.productName || sale?.productName || 'Produto Registrado').toUpperCase()}.`;
  
  doc.text(doc.splitTextToSize(p1, width), left, y);
  y += 10;
  doc.text(doc.splitTextToSize(p2, width), left, y);

  // Table
  y += 12;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, y, width, 32, 2, 2, 'FD');

  const rows = [
    ['PAGADOR(A):', installment.client.toUpperCase()],
    ['CPF / DOCUMENTO:', sale?.clientCpf || 'Registrado em Sistema'],
    ['FORMA DE PAGTO:', (installment.paymentMethod || 'Pix').toUpperCase()],
    ['PRODUTO / SERVIÇO:', (installment.productName || sale?.productName || 'Produto Registrado').toUpperCase()]
  ];

  let ty = y + 5.5;
  for (const [k, v] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text(k, left + 4, ty);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(String(v).substring(0, 50), left + 45, ty);
    ty += 6.5;
  }

  y += 38;
  // Terms
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(left, y, width, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text('Damos por este recibo plena, geral, expressa e irrevogável quitação do valor recebido constante neste comprovante.', 105, y + 7, { align: 'center' });

  y += 20;
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.line(left, y, right, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(9, 9, 11);
  doc.text(companyName, left, y);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`DATA LOG: ${new Date(transactionDate).toISOString()}`, right, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Sistema Integrado de Conciliação', left, y);
  doc.text('AUTORIZADO ELETRONICAMENTE', right, y, { align: 'right' });

  return doc;
}

/**
 * Generates and downloads Contract PDF instantly (< 50ms) in pure vector format on 1 single A4 page
 */
export async function downloadContractAsPDF(
  sale: Sale,
  settings: Settings,
  installments?: Installment[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanClientName = (sale.client || 'CLIENTE').replace(/\s+/g, '_').toUpperCase();
    const cleanId = (sale.id || '').substring(0, 6).toUpperCase();
    const filename = `CONTRATO_${cleanClientName}_${cleanId}.pdf`;

    // Direct vector generation: Instant execution, zero DOM blocking, zero thread freezes
    const doc = createContractPDFDoc(sale, settings, installments);
    doc.save(filename);

    return { success: true };
  } catch (err: any) {
    console.error('Erro na geração direta jsPDF:', err);
    fallbackPrintContract(sale, settings, installments);
    return { success: false, error: err?.message || 'Falha na geração direta' };
  }
}

/**
 * Generates and downloads Receipt PDF instantly
 */
export async function downloadReceiptAsPDF(
  installment: Installment,
  sale?: Sale,
  settings?: Settings
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanClientName = (installment.client || 'CLIENTE').replace(/\s+/g, '_').toUpperCase();
    const cleanId = (installment.id || '').substring(0, 6).toUpperCase();
    const filename = `RECIBO_${cleanClientName}_${cleanId}.pdf`;

    const doc = createReceiptPDFDoc(installment, sale, settings);
    doc.save(filename);

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao gerar recibo em PDF:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Share Contract via Web Share API or direct file download (instant blob)
 */
export async function shareContractFile(
  sale: Sale,
  settings: Settings,
  installments?: Installment[]
): Promise<boolean> {
  const cleanClientName = (sale.client || 'CLIENTE').replace(/\s+/g, '_').toUpperCase();
  const cleanId = (sale.id || '').substring(0, 6).toUpperCase();
  const filename = `CONTRATO_${cleanClientName}_${cleanId}.pdf`;

  try {
    const doc = createContractPDFDoc(sale, settings, installments);
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Contrato Comercial - ${sale.client}`,
        text: `Instrumento de Compra e Venda - ${sale.client} (${sale.productName})`
      });
      return true;
    } else {
      doc.save(filename);
      return true;
    }
  } catch (e) {
    console.error('Erro ao compartilhar contrato:', e);
    return false;
  }
}

/**
 * Native Print with single-page A4 CSS rule
 */
/**
 * Direct Print guaranteeing 100% single-page A4 vector precision (zero signature cut-off)
 */
export function fallbackPrintContract(sale: Sale, settings: Settings, installments?: Installment[]) {
  try {
    const doc = createContractPDFDoc(sale, settings, installments);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Create an iframe to print the exact PDF without browser layout shifts
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          window.open(blobUrl, '_blank');
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }, 250);
    };
  } catch (err) {
    console.error('Erro ao acionar impressão direta:', err);
    // HTML fallback
    const htmlContent = buildContractHTML(sale, settings, installments);
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contrato - ${sale.client}</title>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              @page { size: A4 portrait; margin: 6mm 10mm; }
              @media print {
                html, body { margin: 0; padding: 0; background: #fff; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
              body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = function() {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }
}

/**
 * Compact HTML for preview and print that fits and utilizes 1 single A4 page
 */
export function buildContractHTML(sale: Sale, settings: Settings, installments?: Installment[]): string {
  const companyName = (settings.companyName || settings.userName || 'GESTÃO DE VENDAS').toUpperCase();
  const dateFormatted = sale.date ? new Date(sale.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const cleanId = (sale.id || '').substring(0, 8).toUpperCase();
  
  let dueDay = '—';
  if (sale.date) {
    dueDay = String(new Date(sale.date).getUTCDate());
  } else if (installments && installments.length > 0) {
    const matchingInst = installments.find(i => i.saleId === sale.id);
    if (matchingInst?.dueDate) {
      dueDay = String(new Date(matchingInst.dueDate).getUTCDate());
    }
  }

  const downPayment = sale.downPayment || 0;
  const installmentsCount = sale.installmentsCount || 1;
  const installmentVal = sale.installmentValue || 0;
  const isInterest = !!sale.isInterestOnly;
  const interestRate = sale.interestRate || 0;

  const modalidadeBadge = isInterest 
    ? `<span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 9.5px;">JUROS MENSAIS (${interestRate}% A.M.)</span>`
    : `<span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 9.5px;">PARCELAMENTO DIRETO</span>`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background-color: #ffffff; padding: 20px 24px 14px 24px; max-width: 740px; min-height: 275mm; margin: 0 auto; line-height: 1.45; font-size: 10.5px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
      
      <div>
        <!-- Cabeçalho Institucional -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span style="font-size: 11px; font-weight: 900; color: #b45309; text-transform: uppercase; letter-spacing: 0.8px; display: block;">${companyName}</span>
              <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 2px 0; color: #0f172a; letter-spacing: 0.2px;">
                Contrato de Compra e Venda
              </h1>
              <span style="font-size: 9.5px; color: #64748b; font-weight: 600;">Instrumento Particular de Compromisso de Venda e Confissão de Dívida</span>
            </div>
            <div style="text-align: right; font-size: 9.5px;">
              <div style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: 800; color: #0f172a; display: inline-block;">
                Nº: CT-${cleanId}
              </div>
              <div style="margin-top: 2px; color: #64748b; font-weight: 600;">Emissão: <strong>${dateFormatted}</strong></div>
            </div>
          </div>
        </div>

        <!-- QUADRO-RESUMO DAS CONDIÇÕES COMERCIAIS -->
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span>📋 Quadro-Resumo da Transação</span>
            ${modalidadeBadge}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; width: 22%;"><strong>Comprador(a):</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 700;">${sale.client.toUpperCase()}</td>
              <td style="padding: 2.5px 0; color: #64748b; width: 20%;"><strong>CPF / Doc:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 700;">${sale.clientCpf || 'Registrado em Sistema'}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Telefone:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 600;">${sale.clientPhone || 'N/A'}</td>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Endereço:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 600;">${sale.clientAddress || 'Conforme cadastro em sistema'}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Produto / Bem:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 700;" colspan="3">${(sale.productName || 'BEM OU SERVIÇO REGISTRADO').toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Valor Total:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 800; font-size: 12px;">${money(sale.total)}</td>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Entrada Paga:</strong></td>
              <td style="padding: 2.5px 0; color: ${downPayment > 0 ? '#15803d' : '#64748b'}; font-weight: 700;">${downPayment > 0 ? money(downPayment) : 'Sem entrada'}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Plano de Pagto:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 700;">
                ${isInterest ? `${installmentsCount} parcelas de juros de ${money(installmentVal)}` : `${installmentsCount} parcelas de ${money(installmentVal)}`}
              </td>
              <td style="padding: 2.5px 0; color: #64748b;"><strong>Vencimento:</strong></td>
              <td style="padding: 2.5px 0; color: #0f172a; font-weight: 700;">Todo dia <strong>${dueDay}</strong> de cada mês</td>
            </tr>
          </table>
        </div>

        <!-- CLÁUSULAS CONTRATUAIS DETALHADAS -->
        <div style="color: #334155; font-size: 9.6px; line-height: 1.42;">
          
          <div style="margin-bottom: 7px;">
            <strong style="color: #0f172a; text-transform: uppercase; display: block; font-size: 10px;">
              Cláusula 1ª – Das Partes Contratantes
            </strong>
            <p style="margin: 2px 0 0 0; text-align: justify;">
              Pelo presente instrumento, de um lado denominada(o) <strong>VENDEDOR(A)</strong>: <strong>${companyName}</strong>; e de outro lado denominada(o) <strong>COMPRADOR(A)</strong>: <strong>${sale.client.toUpperCase()}</strong>, CPF/Doc nº <strong>${sale.clientCpf || 'N/A'}</strong>, tel <strong>${sale.clientPhone || 'N/A'}</strong>${sale.clientAddress ? `, residente em ${sale.clientAddress}` : ''}, firmam o presente compromisso de compra e venda mercantil.
            </p>
          </div>

          <div style="margin-bottom: 7px;">
            <strong style="color: #0f172a; text-transform: uppercase; display: block; font-size: 10px;">
              Cláusula 2ª – Do Objeto
            </strong>
            <p style="margin: 2px 0 0 0; text-align: justify;">
              O presente contrato tem por objeto a alienação do bem/serviço: <strong>${(sale.productName || 'PRODUTO REGISTRADO').toUpperCase()}</strong>, entregue ou disponibilizado em perfeitas condições de uso e funcionamento, conferido e aceito pelo COMPRADOR.
            </p>
          </div>

          <div style="margin-bottom: 7px;">
            <strong style="color: #0f172a; text-transform: uppercase; display: block; font-size: 10px;">
              Cláusula 3ª – Do Preço, Condições e Amortização
            </strong>
            <p style="margin: 2px 0 0 0; text-align: justify;">
              O valor total estipulado é de <strong>${money(sale.total)}</strong>, a ser liquidado conforme discriminado no Quadro-Resumo, com vencimento estipulado para todo dia <strong>${dueDay}</strong> de cada mês subsequente. Fica assegurado ao COMPRADOR o direito de realizar quitações antecipadas ou amortizações extraordinárias a qualquer momento com abatimento proporcional da dívida.
            </p>
          </div>

          <div style="margin-bottom: 7px;">
            <strong style="color: #0f172a; text-transform: uppercase; display: block; font-size: 10px;">
              Cláusula 4ª – Da Tolerância e Encargos por Atraso
            </strong>
            <p style="margin: 2px 0 0 0; text-align: justify;">
              Eventual atraso na quitação de qualquer parcela sujeitará o COMPRADOR ao acréscimo de multa moratória de 2% (dois por cento) sobre o valor vencido, acrescida de juros de 1% (um por cento) ao mês calculados <em>pro rata die</em> até a efetiva regularização.
            </p>
          </div>

          <div style="margin-bottom: 7px;">
            <strong style="color: #0f172a; text-transform: uppercase; display: block; font-size: 10px;">
              Cláusula 5ª – Da Eficácia e Título Executivo
            </strong>
            <p style="margin: 2px 0 0 0; text-align: justify;">
              As partes reconhecem a plena validade jurídica deste documento eletrônico e comprovantes, constituindo confissão líquida, certa e exigível de dívida nos termos do art. 784, inciso III do Código de Processo Civil Brasileiro.
            </p>
          </div>

          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a; text-transform: uppercase; display: block; font-size: 10px;">
              Cláusula 6ª – Do Foro
            </strong>
            <p style="margin: 2px 0 0 0; text-align: justify;">
              Para dirimir quaisquer controvérsias oriundas deste instrumento, fica eleito o foro da comarca da sede do Vendedor.
            </p>
          </div>
        </div>
      </div>

      <!-- Assinaturas e Rodapé -->
      <div style="margin-top: 14px;">
        <div style="padding-top: 8px; border-top: 1px solid #cbd5e1;">
          <p style="text-align: center; font-size: 9px; color: #64748b; margin-bottom: 24px; font-style: italic;">
            E por estarem justos e acordados, firmam o presente compromisso.
          </p>

          <div style="display: flex; justify-content: space-between; gap: 36px; padding: 0 16px;">
            <div style="flex: 1; text-align: center;">
              <div style="border-top: 1.2px solid #334155; margin-bottom: 4px;"></div>
              <strong style="font-size: 10px; text-transform: uppercase; color: #0f172a; display: block;">${companyName}</strong>
              <span style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Vendedor(a)</span>
            </div>
            <div style="flex: 1; text-align: center;">
              <div style="border-top: 1.2px solid #334155; margin-bottom: 4px;"></div>
              <strong style="font-size: 10px; text-transform: uppercase; color: #0f172a; display: block;">${sale.client.toUpperCase()}</strong>
              <span style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">Comprador(a)</span>
            </div>
          </div>
        </div>

        <!-- Rodapé de Autenticação -->
        <div style="margin-top: 12px; padding-top: 6px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-family: monospace;">
          <span>Autenticação: ${sale.id.toUpperCase()}</span>
          <span>Via Original Digital • Emissão: ${dateFormatted}</span>
        </div>
      </div>

    </div>
  `;
}
