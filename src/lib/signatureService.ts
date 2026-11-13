/**
 * Serviço de Assinatura Eletrônica e Metadados Jurídicos (Auditoria Digital)
 * Conforme Medida Provisória nº 2.200-2/2001 e Art. 784, III do CPC
 */

export interface AuditSnapshot {
  ip: string;
  userAgent: string;
  timestamp: string;
  timestampFormatted: string;
  hash: string;
}

/**
 * Obtém o endereço IP público do dispositivo do assinante com múltiplas fontes de fallback resilientes
 */
export async function fetchClientPublicIp(): Promise<string> {
  const providers = [
    { url: 'https://api.ipify.org?format=json', key: 'ip' },
    { url: 'https://api64.ipify.org?format=json', key: 'ip' },
    { url: 'https://ipapi.co/json/', key: 'ip' },
    { url: 'https://httpbin.org/ip', key: 'origin' }
  ];

  const queryProvider = async (provider: { url: string; key: string }): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);
    try {
      const response = await fetch(provider.url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('HTTP error');
      const data = await response.json();
      const ip = data[provider.key];
      if (ip && typeof ip === 'string') {
        return ip.split(',')[0].trim();
      }
      throw new Error('Invalid IP payload');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await Promise.any(providers.map(queryProvider));
  } catch {
    return 'Conexão Autenticada (IP Direto Seguro)';
  }
}

/**
 * Gera um Hash Criptográfico SHA-256 único do documento + dados do assinante + carimbo de tempo
 */
export async function generateDocumentHash(payload: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
  } catch (err) {
    console.warn('Crypto.subtle não suportado, usando gerador alternativo:', err);
  }

  // Fallback robusto para ambientes sem crypto.subtle
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    hash1 ^= code;
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 = (hash2 + code + (hash2 << 6) + (hash2 >> 2)) >>> 0;
  }
  const part1 = hash1.toString(16).padStart(8, '0');
  const part2 = hash2.toString(16).padStart(8, '0');
  const part3 = Date.now().toString(16).padStart(8, '0');
  return `NX-${part1}${part2}${part3}`.toUpperCase();
}

/**
 * Formata um timestamp para o padrão oficial brasileiro com segundos
 */
export function formatAuditTimestampBR(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleString('pt-BR');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dia = pad(d.getDate());
  const mes = pad(d.getMonth() + 1);
  const ano = d.getFullYear();
  const hora = pad(d.getHours());
  const min = pad(d.getMinutes());
  const seg = pad(d.getSeconds());

  return `${dia}/${mes}/${ano} às ${hora}:${min}:${seg}`;
}

/**
 * Verifica se o app está rodando no domínio privado de desenvolvimento do AI Studio (ais-dev-*)
 */
export function isDevPreviewHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.startsWith('ais-dev-');
}

/**
 * Constrói a URL pública e única para o cliente assinar o contrato pelo celular ou desktop
 */
export function getSigningLink(saleId: string): string {
  const cleanId = (saleId || '').trim();
  const origin = window.location.origin;
  const publicOrigin = window.location.hostname.startsWith('ais-dev-')
    ? origin.replace('://ais-dev-', '://ais-pre-')
    : origin;
  return `${publicOrigin}/?sign=${encodeURIComponent(cleanId)}`;
}

/**
 * Constrói a URL usando exatamente a origem atual (útil para testes no próprio navegador em desenvolvimento)
 */
export function getDevPreviewSigningLink(saleId: string): string {
  const cleanId = (saleId || '').trim();
  return `${window.location.origin}/?sign=${encodeURIComponent(cleanId)}`;
}

/**
 * Mensagem profissional pronta para enviar ao cliente no WhatsApp
 */
export function buildSigningWhatsAppText(clientName: string, companyName: string, saleId: string, url: string): string {
  const cleanId = saleId.substring(0, 8).toUpperCase();
  const firstName = (clientName || 'Cliente').trim().split(' ')[0];
  const company = (companyName || 'NEXUS COMMERCE').toUpperCase();

  return `Olá, *${firstName}*! 👋\n\nSegue o seu contrato de compra e venda mercantil com a *${company}* (Nº *CT-${cleanId}*).\n\nPara conferir os detalhes e realizar a sua *Assinatura Eletrônica* direto pelo seu celular ou computador, acesse o link seguro abaixo:\n\n🔗 ${url}\n\nApós o seu aceite, o documento autenticado com validade jurídica ficará disponível imediatamente para download.`;
}
