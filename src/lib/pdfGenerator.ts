import html2pdf from 'html2pdf.js';
import { Sale, Settings, Installment } from '../types';

const money = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// Helper to safely obtain the html2pdf instance in any build environment
function getHtml2PdfInstance() {
  const h2p: any = (html2pdf as any).default || html2pdf;
  if (typeof h2p === 'function') {
    return h2p;
  }
  if (typeof (window as any).html2pdf === 'function') {
    return (window as any).html2pdf;
  }
  return h2p;
}

export function buildContractHTML(sale: Sale, settings: Settings, installments?: Installment[]): string {
  const companyName = (settings.companyName || settings.userName || 'GESTÃO DE VENDAS').toUpperCase();
  const dateFormatted = sale.date ? new Date(sale.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const cleanId = (sale.id || '').substring(0, 8).toUpperCase();
  
  // Calculate due day
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
    ? `<span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 10px;">Venda por Juros Mensais (${interestRate}% a.m.)</span>`
    : `<span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 10px;">Parcelamento Padrão com Amortização</span>`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; padding: 36px 44px; max-width: 780px; margin: 0 auto; line-height: 1.55; font-size: 12px;">
      
      <!-- Cabeçalho Institucional -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span style="font-size: 11px; font-weight: 900; color: #b45309; text-transform: uppercase; letter-spacing: 1.5px; display: block;">${companyName}</span>
            <h1 style="font-size: 17px; font-weight: 900; text-transform: uppercase; margin: 4px 0 2px 0; color: #0f172a; letter-spacing: 0.3px;">
              Contrato de Compra e Venda
            </h1>
            <span style="font-size: 10px; color: #64748b; font-weight: 600;">Instrumento Particular de Compromisso de Venda e Confissão de Dívida</span>
          </div>
          <div style="text-align: right; font-size: 10px;">
            <div style="background-color: #f1f5f9; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: 800; color: #0f172a; display: inline-block;">
              Nº: CT-${cleanId}
            </div>
            <div style="margin-top: 4px; color: #64748b; font-weight: 600;">Data: <strong>${dateFormatted}</strong></div>
          </div>
        </div>
      </div>

      <!-- QUADRO-RESUMO DAS CONDIÇÕES COMERCIAIS (Clareza para o Cliente) -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <span>📋 Quadro-Resumo da Transação</span>
          ${modalidadeBadge}
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 26%;"><strong>Comprador(a):</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${sale.client.toUpperCase()}</td>
            <td style="padding: 4px 0; color: #64748b; width: 20%;"><strong>CPF / Doc:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${sale.clientCpf || 'Registrado em Sistema'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Produto / Serviço:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;" colspan="3">${(sale.productName || 'BEM OU SERVIÇO REGISTRADO').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Valor Total:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 800; font-size: 13px;">${money(sale.total)}</td>
            <td style="padding: 4px 0; color: #64748b;"><strong>Entrada Paga:</strong></td>
            <td style="padding: 4px 0; color: ${downPayment > 0 ? '#15803d' : '#64748b'}; font-weight: 700;">${downPayment > 0 ? money(downPayment) : 'Sem entrada'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Plano de Pagamento:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">
              ${isInterest ? `${installmentsCount} parcelas de rendimento de ${money(installmentVal)}` : `${installmentsCount} parcelas de ${money(installmentVal)}`}
            </td>
            <td style="padding: 4px 0; color: #64748b;"><strong>Vencimento:</strong></td>
            <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">Todo dia <strong>${dueDay}</strong> de cada mês</td>
          </tr>
        </table>
      </div>

      <!-- CLÁUSULAS CONTRATUAIS DETALHADAS -->
      <div style="color: #334155; font-size: 11px; line-height: 1.6;">
        
        <!-- Cláusula 1 -->
        <div style="margin-bottom: 12px;">
          <strong style="color: #0f172a; text-transform: uppercase; display: block; margin-bottom: 3px;">
            Cláusula 1ª – Das Partes Contratantes
          </strong>
          <p style="margin: 0; text-align: justify;">
            Pelo presente instrumento, de um lado denominada(o) <strong>VENDEDOR(A)</strong>: <strong>${companyName}</strong>; e de outro lado denominada(o) <strong>COMPRADOR(A)</strong>: <strong>${sale.client.toUpperCase()}</strong>, portador(a) do CPF/Documento nº <strong>${sale.clientCpf || 'N/A'}</strong>, telefone <strong>${sale.clientPhone || 'N/A'}</strong>${sale.clientAddress ? `, domiciliado(a) em ${sale.clientAddress}` : ''}, têm entre si justo e contratado o presente compromisso de compra e venda mercantil.
          </p>
        </div>

        <!-- Cláusula 2 -->
        <div style="margin-bottom: 12px;">
          <strong style="color: #0f172a; text-transform: uppercase; display: block; margin-bottom: 3px;">
            Cláusula 2ª – Do Objeto
          </strong>
          <p style="margin: 0; text-align: justify;">
            O presente contrato tem por finalidade a comercialização do bem/serviço: <strong>${(sale.productName || 'PRODUTO REGISTRADO').toUpperCase()}</strong>, entregue ou disponibilizado em perfeitas condições de uso e funcionamento, tendo o COMPRADOR examinado e concordado expressamente com suas características.
          </p>
        </div>

        <!-- Cláusula 3 -->
        <div style="margin-bottom: 12px;">
          <strong style="color: #0f172a; text-transform: uppercase; display: block; margin-bottom: 3px;">
            Cláusula 3ª – Do Preço, Condições e Pagamento
          </strong>
          <p style="margin: 0 0 4px 0; text-align: justify;">
            O valor total da negociação é de <strong>${money(sale.total)}</strong>, a ser liquidado conforme discriminado no Quadro-Resumo, com vencimento estipulado para todo dia <strong>${dueDay}</strong> de cada mês subsequente até a completa liquidação.
          </p>
          <p style="margin: 0; text-align: justify; color: #475569;">
            <em>Parágrafo Único (Amortização e Quitação Antecipada):</em> Fica assegurado ao COMPRADOR o direito de realizar quitações antecipadas ou amortizações extraordinárias a qualquer momento, com o devido abatimento proporcional do saldo devedor.
          </p>
        </div>

        <!-- Cláusula 4 -->
        <div style="margin-bottom: 12px;">
          <strong style="color: #0f172a; text-transform: uppercase; display: block; margin-bottom: 3px;">
            Cláusula 4ª – Da Tolerância e Encargos por Atraso
          </strong>
          <p style="margin: 0; text-align: justify;">
            Eventual atraso na quitação de qualquer parcela sujeitará o COMPRADOR ao acréscimo de multa moratória simples de 2% (dois por cento) sobre o valor vencido, acrescida de juros legais de 1% (um por cento) ao mês calculados <em>pro rata die</em> até a data da efetiva regularização.
          </p>
        </div>

        <!-- Cláusula 5 -->
        <div style="margin-bottom: 12px;">
          <strong style="color: #0f172a; text-transform: uppercase; display: block; margin-bottom: 3px;">
            Cláusula 5ª – Da Eficácia e Título Executivo
          </strong>
          <p style="margin: 0; text-align: justify;">
            As partes reconhecem a plena validade jurídica e probatória deste documento eletrônico e dos comprovantes de pagamento vinculados, constituindo confissão líquida, certa e exigível de dívida nos termos do art. 784, inciso III do Código de Processo Civil Brasileiro.
          </p>
        </div>

        <!-- Cláusula 6 -->
        <div style="margin-bottom: 16px;">
          <strong style="color: #0f172a; text-transform: uppercase; display: block; margin-bottom: 3px;">
            Cláusula 6ª – Do Foro
          </strong>
          <p style="margin: 0; text-align: justify;">
            Para dirimir quaisquer controvérsias oriundas deste instrumento que não puderem ser resolvidas de comum acordo entre as partes, fica eleito o foro da comarca da sede do Vendedor.
          </p>
        </div>
      </div>

      <!-- Declaração de Aceite & Assinaturas -->
      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1;">
        <p style="text-align: center; font-size: 10px; color: #64748b; margin-bottom: 32px;">
          E por estarem justos e acordados com todas as cláusulas e condições descritas, firmam o presente compromisso.
        </p>

        <div style="display: flex; justify-content: space-between; gap: 40px; padding: 0 10px;">
          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1.5px solid #334155; margin-bottom: 6px;"></div>
            <strong style="font-size: 11px; text-transform: uppercase; color: #0f172a; display: block;">${companyName}</strong>
            <span style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Vendedor(a)</span>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1.5px solid #334155; margin-bottom: 6px;"></div>
            <strong style="font-size: 11px; text-transform: uppercase; color: #0f172a; display: block;">${sale.client.toUpperCase()}</strong>
            <span style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Comprador(a)</span>
          </div>
        </div>
      </div>

      <!-- Rodapé de Autenticação -->
      <div style="margin-top: 24px; padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; text-transform: uppercase; font-family: monospace;">
        <span>Autenticação: ${sale.id.toUpperCase()}</span>
        <span>Via Original Digital • Emissão: ${dateFormatted}</span>
      </div>
    </div>
  `;
}

export function buildReceiptHTML(installment: Installment, sale?: Sale, settings?: Settings): string {
  const companyName = (settings?.companyName || settings?.userName || 'GESTÃO DE VENDAS').toUpperCase();
  const transactionDate = installment.paidAt || installment.dueDate || new Date().toISOString();
  const cleanId = (installment.id || '').toUpperCase();

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; background-color: #ffffff; padding: 32px 36px; max-width: 680px; margin: 0 auto; line-height: 1.5; font-size: 12px; border: 1px solid #e4e4e7; border-radius: 12px;">
      
      <!-- Cabeçalho -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #ffd700; margin-bottom: 20px;">
        <div>
          <span style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 1.5px; display: block;">${companyName}</span>
          <h1 style="font-size: 18px; font-weight: 900; color: #09090b; margin: 4px 0 2px 0; text-transform: uppercase;">Comprovante de Recebimento</h1>
          <span style="font-size: 9px; color: #71717a; font-weight: 700; text-transform: uppercase;">Terminal de Operações Comerciais</span>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; padding: 4px 8px; background-color: #f4f4f5; border-radius: 6px; font-size: 9px; font-family: monospace; font-weight: 800; color: #27272a;">ID: ${cleanId.substring(0, 12)}</span>
          <div style="font-size: 9px; color: #71717a; margin-top: 4px; font-weight: 600;">
            ${new Date(transactionDate).toLocaleDateString('pt-BR')} às ${new Date(transactionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <!-- Valor -->
      <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 10px; font-weight: 800; color: #71717a; text-transform: uppercase; letter-spacing: 1.5px; display: block;">Valor Liquidado</span>
        <div style="font-size: 32px; font-weight: 900; color: #09090b; margin: 4px 0;">${money(installment.value)}</div>
        <div style="display: inline-block; padding: 3px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase;">
          ● Transação Aprovada & Conciliada
        </div>
      </div>

      <!-- Texto Declaratório -->
      <div style="font-size: 12px; color: #3f3f46; margin-bottom: 20px; line-height: 1.6;">
        <p style="margin: 6px 0;">
          Declaramos para os devidos fins que recebemos de <strong style="color: #09090b; text-transform: uppercase;">${installment.client}</strong>, o montante integral de <strong style="color: #09090b;">${money(installment.value)}</strong>.
        </p>
        <p style="margin: 6px 0;">
          Referente à liquidação da parcela <strong style="color: #09090b;">Nº ${installment.number || 1} de ${installment.total || 1}</strong> da transação comercial vinculada ao produto: <strong style="color: #09090b;">${installment.productName || sale?.productName || 'Produto Registrado'}</strong>.
        </p>
      </div>

      <!-- Especificações -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <tbody>
          <tr style="background-color: #f9fafb; border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 8px 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; width: 45%;">Nome do Pagador:</td>
            <td style="padding: 8px 12px; font-weight: 800; color: #111827; text-transform: uppercase;">${installment.client}</td>
          </tr>
          ${sale?.clientCpf ? `
          <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 8px 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">CPF / Documento:</td>
            <td style="padding: 8px 12px; font-family: monospace; font-weight: 700; color: #111827;">${sale.clientCpf}</td>
          </tr>` : ''}
          ${sale?.clientPhone ? `
          <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 8px 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Telefone:</td>
            <td style="padding: 8px 12px; font-weight: 600; color: #111827;">${sale.clientPhone}</td>
          </tr>` : ''}
          <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 8px 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Meio de Recebimento:</td>
            <td style="padding: 8px 12px; font-weight: 800; color: #111827; text-transform: uppercase;">${installment.paymentMethod || 'PIX'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 8px 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Vencimento Nominal:</td>
            <td style="padding: 8px 12px; font-weight: 600; color: #111827;">${installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('pt-BR') : '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-weight: 700; text-transform: uppercase;">Autenticação:</td>
            <td style="padding: 8px 12px; font-family: monospace; font-weight: 600; color: #4b5563;">${cleanId}</td>
          </tr>
        </tbody>
      </table>

      <!-- Termos -->
      <div style="padding: 10px 14px; background-color: #f4f4f5; border-radius: 8px; font-size: 9px; color: #71717a; text-align: center; margin-bottom: 20px; line-height: 1.4;">
        Damos por este recibo plena, geral, expressa e irrevogável quitação do valor recebido constante neste comprovante, para nada mais reivindicar referente a esta parcela específica.
      </div>

      <!-- Rodapé -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 12px; border-top: 1px solid #e4e4e7; font-size: 9px; color: #71717a;">
        <div>
          <strong style="color: #09090b; text-transform: uppercase;">${companyName}</strong>
          <div>Sistema Integrado de Conciliação</div>
        </div>
        <div style="text-align: right; font-family: monospace; font-size: 8px;">
          <div>DATA LOG: ${new Date(transactionDate).toISOString()}</div>
          <div>AUTORIZADO ELETRONICAMENTE</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Executes a high-compatibility PDF generation and download
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

    const htmlContent = buildContractHTML(sale, settings, installments);

    // Create a clean offscreen container with explicit standard styling (avoiding OKLCH)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.width = '750px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.zIndex = '-9999';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollY: 0,
        scrollX: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    const h2p = getHtml2PdfInstance();
    await h2p().set(opt).from(container).save();

    // Clean up
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Falha ao gerar PDF via html2pdf:', err);
    // Fallback: trigger print window
    fallbackPrintContract(sale, settings, installments);
    return { success: false, error: err?.message || 'Falha na geração direta' };
  }
}

/**
 * Fallback / Direct Print with native print dialog (allows saving directly as PDF in vector quality)
 */
export function fallbackPrintContract(sale: Sale, settings: Settings, installments?: Installment[]) {
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
            body { margin: 0; padding: 20px; background: #fff; font-family: 'Times New Roman', Georgia, serif; }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; size: A4 portrait; }
            }
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
  } else {
    // If popup is blocked, create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contrato - ${sale.client}</title>
            <style>
              body { margin: 0; padding: 15px; font-family: 'Times New Roman', Georgia, serif; }
              @page { margin: 15mm; size: A4 portrait; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
}

/**
 * Share Contract via Web Share API or file download
 */
export async function shareContractFile(
  sale: Sale,
  settings: Settings,
  installments?: Installment[]
): Promise<boolean> {
  const cleanClientName = (sale.client || 'CLIENTE').replace(/\s+/g, '_').toUpperCase();
  const cleanId = (sale.id || '').substring(0, 6).toUpperCase();
  const filename = `CONTRATO_${cleanClientName}_${cleanId}.pdf`;
  const htmlContent = buildContractHTML(sale, settings, installments);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '750px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, scrollX: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const h2p = getHtml2PdfInstance();
    const worker = h2p().set(opt).from(container);
    const pdfBlob = await worker.output('blob');

    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }

    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Contrato Comercial - ${sale.client}`,
        text: `Instrumento de Compra e Venda - ${sale.client} (${sale.productName})`
      });
      return true;
    } else {
      // Fallback save
      await worker.save();
      return true;
    }
  } catch (e) {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    console.error(e);
    return false;
  }
}
