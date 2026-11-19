import { useState, useEffect, useCallback, useRef } from 'react';
import { type User, sendEmailVerification } from 'firebase/auth';
import { Product, Sale, Installment, Settings, Closing, SignatureAudit } from './types';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  cleanData,
  isPrincipalOwnerEmail,
  PRINCIPAL_OWNER_EMAIL,
} from './lib/firebase';
import { getLocalDateString, parseDateSafe, extractDueDay } from './lib/dateUtils';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';

export interface MigrationState {
  status: 'idle' | 'migrating' | 'completed' | 'needs_verification' | 'error';
  counts?: {
    products: number;
    sales: number;
    installments: number;
    closings: number;
  };
  errorMessage?: string;
}

const DEFAULT_WHATSAPP_TEMPLATE =
  'Olá, {cliente}! Passando para lembrar que a sua parcela {parcela} do produto {produto} no valor de {valor} vence em {vencimento}.\n\nPara facilitar o pagamento, você pode utilizar a chave Pix abaixo:\nChave Pix: {chave_pix}\nBeneficiário: {nome_pix}\n\nSe tiver qualquer dúvida, fique à vontade para falar conosco!';

function buildDefaultSettings(user: User | null): Settings {
  const isOwner = isPrincipalOwnerEmail(user?.email);
  const displayName = isOwner
    ? 'EDIEIK BRENO'
    : user?.displayName?.trim() || user?.email?.split('@')[0] || 'Operador';
  const email = user?.email || (isOwner ? PRINCIPAL_OWNER_EMAIL : '');

  return {
    userName: displayName,
    userRole: isOwner ? 'CEO / Diretor Comercial' : 'Administrador',
    userFunction: isOwner ? 'Vendas & Negócios' : 'Gestão Comercial',
    userEmail: email,
    pixName: '',
    pixKey: '',
    pixType: 'Pix',
    companyName: 'Nexus Commerce',
    companyDocument: '',
    companyPhone: '',
    companyAddress: '',
    city: '',
    currency: 'BRL',
    language: 'pt-BR',
    theme: 'dark',
    whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
    currentOperator: 'operator1',
    capitalSyncV2: true,
    op1Name: displayName,
    op1Role: isOwner ? 'Diretor Comercial' : 'Administrador',
    op1Function: isOwner ? 'Vendas & Negócios' : 'Gestão Comercial',
    op1Email: email,
    op1PixName: '',
    op1PixKey: '',
    op1PixType: 'Pix',
    op2Name: 'Operador 2',
    op2Role: 'Financeiro',
    op2Function: 'Controle de Recebimentos',
    op2Email: '',
    op2PixName: '',
    op2PixKey: '',
    op2PixType: 'Pix',
  };
}

const loadUserCached = <T>(uid: string | undefined, key: string, fallback: T): T => {
  if (!uid || typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`nexus_cache_u_${uid}_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Failed to parse cache for ${key}`, e);
  }
  return fallback;
};

const saveUserCached = (uid: string | undefined, key: string, data: any) => {
  if (!uid || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`nexus_cache_u_${uid}_${key}`, JSON.stringify(data));
  } catch {}
};

const loadLegacyLocalCached = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`nexus_cache_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return fallback;
};

function sanitizeProductForFirestore(raw: any, id: string): Product {
  const status: 'Disponivel' | 'Vendido' = raw?.status === 'Vendido' ? 'Vendido' : 'Disponivel';
  const cleanImei = typeof raw?.imei === 'string' && raw.imei.trim() ? raw.imei.trim().slice(0, 64) : undefined;
  return cleanData({
    id,
    name: String(raw?.name || 'Produto').slice(0, 200),
    category: String(raw?.category || 'Geral').slice(0, 120),
    imei: cleanImei,
    photo: typeof raw?.photo === 'string' && raw.photo.length <= 750000 ? raw.photo : undefined,
    cost: Number.isFinite(Number(raw?.cost)) ? Number(raw.cost) : 0,
    sale: Number.isFinite(Number(raw?.sale)) ? Number(raw.sale) : 0,
    quantity: Number.isFinite(Number(raw?.quantity)) ? Number(raw.quantity) : 1,
    status,
    createdAt: String(raw?.createdAt || new Date().toISOString()).slice(0, 64),
  });
}

function sanitizeSignatureAudit(sig: any): SignatureAudit | undefined {
  if (!sig || typeof sig !== 'object') return undefined;
  return cleanData({
    signed: Boolean(sig.signed),
    signatureImage:
      typeof sig.signatureImage === 'string' && sig.signatureImage.length <= 900000
        ? sig.signatureImage
        : undefined,
    signedAt: sig.signedAt ? String(sig.signedAt).slice(0, 64) : undefined,
    signedAtFormatted: sig.signedAtFormatted ? String(sig.signedAtFormatted).slice(0, 80) : undefined,
    signerName: sig.signerName ? String(sig.signerName).slice(0, 200) : undefined,
    signerCpf: sig.signerCpf ? String(sig.signerCpf).slice(0, 40) : undefined,
    signerIp: sig.signerIp ? String(sig.signerIp).slice(0, 128) : undefined,
    signerUserAgent: sig.signerUserAgent ? String(sig.signerUserAgent).slice(0, 1024) : undefined,
    signatureHash: sig.signatureHash ? String(sig.signatureHash).slice(0, 128) : undefined,
    acceptedTerms: typeof sig.acceptedTerms === 'boolean' ? sig.acceptedTerms : undefined,
    authMethod: sig.authMethod ? String(sig.authMethod).slice(0, 300) : undefined,
  });
}

function sanitizeSaleForFirestore(raw: any, id: string): Sale {
  const status: 'Ativa' | 'Liquidada' = raw?.status === 'Liquidada' ? 'Liquidada' : 'Ativa';
  const cleanImei =
    typeof raw?.productImei === 'string' && raw.productImei.trim()
      ? raw.productImei.trim().slice(0, 64)
      : undefined;
  return cleanData({
    id,
    productId: String(raw?.productId || '').slice(0, 128),
    productName: String(raw?.productName || 'Produto Comercial').slice(0, 200),
    productImei: cleanImei,
    client: String(raw?.client || 'Cliente').slice(0, 200),
    clientPhone: String(raw?.clientPhone || '').slice(0, 40),
    clientCpf: raw?.clientCpf !== undefined ? String(raw.clientCpf).slice(0, 40) : undefined,
    clientRg:
      raw?.clientRg !== undefined && String(raw.clientRg).trim()
        ? String(raw.clientRg).trim().slice(0, 40)
        : undefined,
    clientAddress: raw?.clientAddress !== undefined ? String(raw.clientAddress).slice(0, 400) : undefined,
    total: Number.isFinite(Number(raw?.total)) ? Number(raw.total) : 0,
    downPayment: Number.isFinite(Number(raw?.downPayment)) ? Number(raw.downPayment) : 0,
    profit: Number.isFinite(Number(raw?.profit)) ? Number(raw.profit) : 0,
    installmentsCount: Number.isFinite(Number(raw?.installmentsCount)) ? Number(raw.installmentsCount) : 1,
    installmentValue: Number.isFinite(Number(raw?.installmentValue)) ? Number(raw.installmentValue) : 0,
    date: String(raw?.date || getLocalDateString()).slice(0, 64),
    status,
    createdAt: String(raw?.createdAt || new Date().toISOString()).slice(0, 64),
    isInterestOnly: typeof raw?.isInterestOnly === 'boolean' ? raw.isInterestOnly : undefined,
    interestRate: Number.isFinite(Number(raw?.interestRate)) ? Number(raw.interestRate) : undefined,
    costPrice: Number.isFinite(Number(raw?.costPrice)) ? Number(raw.costPrice) : undefined,
    sellerName: raw?.sellerName ? String(raw.sellerName).slice(0, 200) : undefined,
    isSigned: typeof raw?.isSigned === 'boolean' ? raw.isSigned : undefined,
    signatureImage:
      typeof raw?.signatureImage === 'string' && raw.signatureImage.length <= 750000
        ? raw.signatureImage
        : undefined,
    signedAt: raw?.signedAt ? String(raw.signedAt).slice(0, 64) : undefined,
    signerIp: raw?.signerIp ? String(raw.signerIp).slice(0, 128) : undefined,
    signerUserAgent: raw?.signerUserAgent ? String(raw.signerUserAgent).slice(0, 512) : undefined,
    signatureHash: raw?.signatureHash ? String(raw.signatureHash).slice(0, 128) : undefined,
    signature: sanitizeSignatureAudit(raw?.signature),
  });
}

function sanitizeInstallmentForFirestore(raw: any, id: string): Installment {
  const status: 'Pendente' | 'Pago' = raw?.status === 'Pago' ? 'Pago' : 'Pendente';
  return cleanData({
    id,
    saleId: String(raw?.saleId || '').slice(0, 128),
    client: String(raw?.client || 'Cliente').slice(0, 200),
    productName: String(raw?.productName || 'Produto').slice(0, 200),
    number: Number.isFinite(Number(raw?.number)) ? Number(raw.number) : 1,
    total: Number.isFinite(Number(raw?.total)) ? Number(raw.total) : 1,
    value: Number.isFinite(Number(raw?.value)) ? Number(raw.value) : 0,
    dueDate: String(raw?.dueDate || new Date().toISOString()).slice(0, 64),
    status,
    paidAt: raw?.paidAt ? String(raw.paidAt).slice(0, 64) : undefined,
    paymentMethod: raw?.paymentMethod ? String(raw.paymentMethod).slice(0, 80) : undefined,
    originalValue: Number.isFinite(Number(raw?.originalValue)) ? Number(raw.originalValue) : undefined,
    discountPercentage: Number.isFinite(Number(raw?.discountPercentage)) ? Number(raw.discountPercentage) : undefined,
    discountAmount: Number.isFinite(Number(raw?.discountAmount)) ? Number(raw.discountAmount) : undefined,
    isAdvanced: typeof raw?.isAdvanced === 'boolean' ? raw.isAdvanced : undefined,
  });
}

function sanitizeClosingForFirestore(raw: any, id: string): Closing {
  return cleanData({
    id,
    closedAt: String(raw?.closedAt || new Date().toISOString()).slice(0, 64),
    periodName: String(raw?.periodName || 'Fechamento').slice(0, 200),
    profit: Number.isFinite(Number(raw?.profit)) ? Number(raw.profit) : 0,
    totalSales: Number.isFinite(Number(raw?.totalSales)) ? Number(raw.totalSales) : 0,
    salesCount: Number.isFinite(Number(raw?.salesCount)) ? Number(raw.salesCount) : 0,
  });
}

function sanitizeSettingsForFirestore(raw: any): Settings {
  return cleanData({
    userName: raw?.userName !== undefined ? String(raw.userName).slice(0, 200) : undefined,
    userRole: raw?.userRole !== undefined ? String(raw.userRole).slice(0, 120) : undefined,
    userFunction: raw?.userFunction !== undefined ? String(raw.userFunction).slice(0, 120) : undefined,
    userEmail: raw?.userEmail !== undefined ? String(raw.userEmail).slice(0, 320) : undefined,
    profilePhoto:
      typeof raw?.profilePhoto === 'string' && raw.profilePhoto.length <= 750000
        ? raw.profilePhoto
        : undefined,
    pixName: raw?.pixName !== undefined ? String(raw.pixName).slice(0, 200) : undefined,
    pixKey: raw?.pixKey !== undefined ? String(raw.pixKey).slice(0, 200) : undefined,
    pixType: raw?.pixType !== undefined ? String(raw.pixType).slice(0, 60) : undefined,
    companyName: raw?.companyName !== undefined ? String(raw.companyName).slice(0, 200) : undefined,
    companyDocument: raw?.companyDocument !== undefined ? String(raw.companyDocument).slice(0, 80) : undefined,
    companyPhone: raw?.companyPhone !== undefined ? String(raw.companyPhone).slice(0, 60) : undefined,
    companyAddress: raw?.companyAddress !== undefined ? String(raw.companyAddress).slice(0, 400) : undefined,
    city: raw?.city !== undefined ? String(raw.city).slice(0, 120) : undefined,
    currency: raw?.currency !== undefined ? String(raw.currency).slice(0, 16) : undefined,
    language: raw?.language !== undefined ? String(raw.language).slice(0, 16) : undefined,
    theme: raw?.theme === 'light' ? 'light' : 'dark',
    whatsappTemplate: raw?.whatsappTemplate !== undefined ? String(raw.whatsappTemplate).slice(0, 4000) : undefined,
    currentOperator: raw?.currentOperator === 'operator2' ? 'operator2' : 'operator1',
    capitalSyncV2: typeof raw?.capitalSyncV2 === 'boolean' ? raw.capitalSyncV2 : undefined,
    op1Name: raw?.op1Name !== undefined ? String(raw.op1Name).slice(0, 200) : undefined,
    op1Role: raw?.op1Role !== undefined ? String(raw.op1Role).slice(0, 120) : undefined,
    op1Function: raw?.op1Function !== undefined ? String(raw.op1Function).slice(0, 120) : undefined,
    op1Email: raw?.op1Email !== undefined ? String(raw.op1Email).slice(0, 320) : undefined,
    op1Photo:
      typeof raw?.op1Photo === 'string' && raw.op1Photo.length <= 750000 ? raw.op1Photo : undefined,
    op1PixName: raw?.op1PixName !== undefined ? String(raw.op1PixName).slice(0, 200) : undefined,
    op1PixKey: raw?.op1PixKey !== undefined ? String(raw.op1PixKey).slice(0, 200) : undefined,
    op1PixType: raw?.op1PixType !== undefined ? String(raw.op1PixType).slice(0, 60) : undefined,
    op2Name: raw?.op2Name !== undefined ? String(raw.op2Name).slice(0, 200) : undefined,
    op2Role: raw?.op2Role !== undefined ? String(raw.op2Role).slice(0, 120) : undefined,
    op2Function: raw?.op2Function !== undefined ? String(raw.op2Function).slice(0, 120) : undefined,
    op2Email: raw?.op2Email !== undefined ? String(raw.op2Email).slice(0, 320) : undefined,
    op2Photo:
      typeof raw?.op2Photo === 'string' && raw.op2Photo.length <= 750000 ? raw.op2Photo : undefined,
    op2PixName: raw?.op2PixName !== undefined ? String(raw.op2PixName).slice(0, 200) : undefined,
    op2PixKey: raw?.op2PixKey !== undefined ? String(raw.op2PixKey).slice(0, 200) : undefined,
    op2PixType: raw?.op2PixType !== undefined ? String(raw.op2PixType).slice(0, 60) : undefined,
  }) as Settings;
}

function buildPublicContractPayload(
  sale: Sale,
  ownerUid: string,
  settings: Settings,
  firstDueDate?: string
) {
  const effectiveDueDate = firstDueDate || sale.date || sale.createdAt;
  const dueDay = effectiveDueDate ? extractDueDay(effectiveDueDate) : '—';
  return cleanData({
    saleId: sale.id,
    ownerUid,
    productName: String(sale.productName || 'Produto Comercial').slice(0, 200),
    productImei:
      typeof sale.productImei === 'string' && sale.productImei.trim()
        ? sale.productImei.trim().slice(0, 64)
        : undefined,
    client: String(sale.client || 'Cliente').slice(0, 200),
    clientPhone: sale.clientPhone ? String(sale.clientPhone).slice(0, 40) : undefined,
    clientCpf: sale.clientCpf ? String(sale.clientCpf).slice(0, 40) : undefined,
    clientRg:
      sale.clientRg && String(sale.clientRg).trim()
        ? String(sale.clientRg).trim().slice(0, 40)
        : undefined,
    clientAddress: sale.clientAddress ? String(sale.clientAddress).slice(0, 400) : undefined,
    total: Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0,
    downPayment: Number.isFinite(Number(sale.downPayment)) ? Number(sale.downPayment) : 0,
    installmentsCount: Number.isFinite(Number(sale.installmentsCount)) ? Number(sale.installmentsCount) : 1,
    installmentValue: Number.isFinite(Number(sale.installmentValue)) ? Number(sale.installmentValue) : 0,
    date: String(sale.date || getLocalDateString()).slice(0, 64),
    firstDueDate: effectiveDueDate ? String(effectiveDueDate).slice(0, 64) : undefined,
    dueDay: String(dueDay || '—').slice(0, 16),
    status: sale.status === 'Liquidada' ? 'Liquidada' : 'Ativa',
    createdAt: String(sale.createdAt || new Date().toISOString()).slice(0, 64),
    isInterestOnly: typeof sale.isInterestOnly === 'boolean' ? sale.isInterestOnly : undefined,
    interestRate: Number.isFinite(Number(sale.interestRate)) ? Number(sale.interestRate) : undefined,
    sellerName: sale.sellerName ? String(sale.sellerName).slice(0, 200) : undefined,
    companyName: settings.companyName ? String(settings.companyName).slice(0, 200) : 'Nexus Commerce',
    companyDocument: settings.companyDocument ? String(settings.companyDocument).slice(0, 80) : undefined,
    companyPhone: settings.companyPhone ? String(settings.companyPhone).slice(0, 60) : undefined,
    companyAddress: settings.companyAddress ? String(settings.companyAddress).slice(0, 400) : undefined,
    isSigned: Boolean(sale.isSigned || sale.signature?.signed),
    signatureImage:
      typeof (sale.signatureImage || sale.signature?.signatureImage) === 'string' &&
      String(sale.signatureImage || sale.signature?.signatureImage).length <= 750000
        ? sale.signatureImage || sale.signature?.signatureImage
        : undefined,
    signedAt: sale.signedAt || sale.signature?.signedAt ? String(sale.signedAt || sale.signature?.signedAt).slice(0, 64) : undefined,
    signerIp: sale.signerIp || sale.signature?.signerIp ? String(sale.signerIp || sale.signature?.signerIp).slice(0, 128) : undefined,
    signerUserAgent:
      sale.signerUserAgent || sale.signature?.signerUserAgent
        ? String(sale.signerUserAgent || sale.signature?.signerUserAgent).slice(0, 512)
        : undefined,
    signatureHash:
      sale.signatureHash || sale.signature?.signatureHash
        ? String(sale.signatureHash || sale.signature?.signatureHash).slice(0, 128)
        : undefined,
    signature: sanitizeSignatureAudit(sale.signature),
    updatedAt: new Date().toISOString(),
  });
}

async function commitBatchedWrites(
  operations: Array<{ ref: any; data: any; merge?: boolean }>
) {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      if (op.merge) {
        batch.set(op.ref, op.data, { merge: true });
      } else {
        batch.set(op.ref, op.data);
      }
    });
    await batch.commit();
  }
}

export function useNexusState(user: User | null) {
  const uid = user?.uid;

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [settings, setSettings] = useState<Settings>(() => buildDefaultSettings(null));
  const [migrationState, setMigrationState] = useState<MigrationState>({ status: 'idle' });

  const migrationRunningRef = useRef(false);
  const syncedPublicIdsRef = useRef<Set<string>>(new Set());

  const mergeSettingsWithDefaults = useCallback(
    (rawSettings: Partial<Settings>, targetUser: User): Settings => {
      const defaults = buildDefaultSettings(targetUser);
      const isOwner = isPrincipalOwnerEmail(targetUser.email);
      const currentOperator = rawSettings.currentOperator || 'operator1';

      const rawOp1 = rawSettings.op1Name ?? rawSettings.userName;
      const op1Name =
        rawOp1 && rawOp1.toLowerCase() !== 'nexus commerce' && rawOp1.toLowerCase() !== 'empresa'
          ? rawOp1
          : defaults.op1Name || defaults.userName;

      const op1Role = rawSettings.op1Role ?? rawSettings.userRole ?? defaults.op1Role ?? 'Administrador';
      const op1Function =
        rawSettings.op1Function ?? rawSettings.userFunction ?? defaults.op1Function ?? 'Gestão Comercial';
      const op1Email =
        rawSettings.op1Email ?? rawSettings.userEmail ?? targetUser.email ?? defaults.op1Email ?? '';
      const op1Photo = rawSettings.op1Photo ?? rawSettings.profilePhoto;
      const op1PixName = rawSettings.op1PixName ?? rawSettings.pixName ?? '';
      const op1PixKey = rawSettings.op1PixKey ?? rawSettings.pixKey ?? '';
      const op1PixType = rawSettings.op1PixType ?? rawSettings.pixType ?? 'Pix';

      const op2Name = rawSettings.op2Name ?? (isOwner ? 'Operador 2' : 'Operador 2');
      const op2Role = rawSettings.op2Role ?? (isOwner ? 'Diretor' : 'Financeiro');
      const op2Function = rawSettings.op2Function ?? 'Controle de Recebimentos';
      const op2Email = rawSettings.op2Email ?? '';
      const op2Photo = rawSettings.op2Photo;
      const op2PixName = rawSettings.op2PixName ?? '';
      const op2PixKey = rawSettings.op2PixKey ?? '';
      const op2PixType = rawSettings.op2PixType ?? 'Pix';

      const activeName = currentOperator === 'operator2' ? op2Name : op1Name;
      const activeRole = currentOperator === 'operator2' ? op2Role : op1Role;
      const activeFunction = currentOperator === 'operator2' ? op2Function : op1Function;
      const activeEmail = currentOperator === 'operator2' ? op2Email : op1Email;
      const activePhoto = currentOperator === 'operator2' ? op2Photo : op1Photo;
      const activePixName = currentOperator === 'operator2' ? op2PixName : op1PixName;
      const activePixKey = currentOperator === 'operator2' ? op2PixKey : op1PixKey;
      const activePixType = currentOperator === 'operator2' ? op2PixType : op1PixType;

      return {
        ...defaults,
        ...rawSettings,
        currentOperator,
        userName: activeName,
        userRole: activeRole,
        userFunction: activeFunction,
        userEmail: activeEmail,
        profilePhoto: activePhoto,
        pixName: activePixName,
        pixKey: activePixKey,
        pixType: activePixType,
        op1Name,
        op1Role,
        op1Function,
        op1Email,
        op1Photo,
        op1PixName,
        op1PixKey,
        op1PixType,
        op2Name,
        op2Role,
        op2Function,
        op2Email,
        op2Photo,
        op2PixName,
        op2PixKey,
        op2PixType,
      };
    },
    []
  );

  // One-time idempotent legacy migration exclusively for nexuscommercevendas@gmail.com
  const runPrincipalOwnerMigration = useCallback(async (targetUser: User) => {
    if (!isPrincipalOwnerEmail(targetUser.email) || migrationRunningRef.current) return;
    migrationRunningRef.current = true;

    try {
      const targetUid = targetUser.uid;
      const migrationRef = doc(db, 'users', targetUid, 'settings', 'migration');
      const migrationSnap = await getDoc(migrationRef);

      if (migrationSnap.exists() && migrationSnap.data()?.completed === true) {
        setMigrationState({
          status: 'completed',
          counts: migrationSnap.data()?.counts,
        });
        return;
      }

      // Ensure fresh auth token claim (e.g. after verifying email)
      try {
        await targetUser.reload();
        await targetUser.getIdToken(true);
      } catch {}

      const refreshedUser = auth.currentUser || targetUser;
      if (!refreshedUser.emailVerified) {
        setMigrationState({ status: 'needs_verification' });
        const sessionKey = `nexus_verif_sent_${targetUid}`;
        try {
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, '1');
            await sendEmailVerification(refreshedUser).catch(() => {});
          }
        } catch {}
        return;
      }

      setMigrationState({ status: 'migrating' });

      // Read legacy root collections from Firestore (read-only) + user's existing collection docs
      const [
        legacyProdSnap,
        legacySalesSnap,
        legacyInstSnap,
        legacyClosingsSnap,
        legacySettingsSnap,
        userProdSnap,
        userSalesSnap,
        userInstSnap,
        userClosingsSnap,
        userSettingsSnap,
      ] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'installments')),
        getDocs(collection(db, 'closings')),
        getDoc(doc(db, 'settings', 'config')),
        getDocs(collection(db, 'users', targetUid, 'products')),
        getDocs(collection(db, 'users', targetUid, 'sales')),
        getDocs(collection(db, 'users', targetUid, 'installments')),
        getDocs(collection(db, 'users', targetUid, 'closings')),
        getDoc(doc(db, 'users', targetUid, 'settings', 'config')),
      ]);

      const existingUserProductIds = new Set(userProdSnap.docs.map((d) => d.id));
      const existingUserSaleIds = new Set(userSalesSnap.docs.map((d) => d.id));
      const existingUserInstIds = new Set(userInstSnap.docs.map((d) => d.id));
      const existingUserClosingIds = new Set(userClosingsSnap.docs.map((d) => d.id));

      // Combine Firestore root docs with any legacy localStorage fallback (without overwriting)
      const productMap = new Map<string, Product>();
      legacyProdSnap.docs.forEach((d) => {
        productMap.set(d.id, sanitizeProductForFirestore(d.data(), d.id));
      });
      loadLegacyLocalCached<Product[]>('products', []).forEach((p) => {
        if (p?.id && !productMap.has(p.id)) {
          productMap.set(p.id, sanitizeProductForFirestore(p, p.id));
        }
      });

      const saleMap = new Map<string, Sale>();
      legacySalesSnap.docs.forEach((d) => {
        saleMap.set(d.id, sanitizeSaleForFirestore(d.data(), d.id));
      });
      loadLegacyLocalCached<Sale[]>('sales', []).forEach((s) => {
        if (s?.id && !saleMap.has(s.id)) {
          saleMap.set(s.id, sanitizeSaleForFirestore(s, s.id));
        }
      });

      const instMap = new Map<string, Installment>();
      legacyInstSnap.docs.forEach((d) => {
        instMap.set(d.id, sanitizeInstallmentForFirestore(d.data(), d.id));
      });
      loadLegacyLocalCached<Installment[]>('installments', []).forEach((i) => {
        if (i?.id && !instMap.has(i.id)) {
          instMap.set(i.id, sanitizeInstallmentForFirestore(i, i.id));
        }
      });

      const closingMap = new Map<string, Closing>();
      legacyClosingsSnap.docs.forEach((d) => {
        closingMap.set(d.id, sanitizeClosingForFirestore(d.data(), d.id));
      });
      loadLegacyLocalCached<Closing[]>('closings', []).forEach((c) => {
        if (c?.id && !closingMap.has(c.id)) {
          closingMap.set(c.id, sanitizeClosingForFirestore(c, c.id));
        }
      });

      const legacySettingsRaw = legacySettingsSnap.exists()
        ? legacySettingsSnap.data()
        : loadLegacyLocalCached<Settings | null>('settings', null);
      const effectiveMigratedSettings = legacySettingsRaw
        ? sanitizeSettingsForFirestore(legacySettingsRaw)
        : buildDefaultSettings(refreshedUser);

      const batchOps: Array<{ ref: any; data: any; merge?: boolean }> = [];

      productMap.forEach((prod, id) => {
        if (!existingUserProductIds.has(id)) {
          batchOps.push({
            ref: doc(db, 'users', targetUid, 'products', id),
            data: prod,
          });
        }
      });

      const instBySaleId = new Map<string, Installment[]>();
      instMap.forEach((inst) => {
        const list = instBySaleId.get(inst.saleId) || [];
        list.push(inst);
        instBySaleId.set(inst.saleId, list);
      });

      saleMap.forEach((sale, id) => {
        if (!existingUserSaleIds.has(id)) {
          const cleanMigratedSale =
            effectiveMigratedSettings.capitalSyncV2 === true
              ? sale
              : { ...sale, costPrice: 0, profit: 0 };
          batchOps.push({
            ref: doc(db, 'users', targetUid, 'sales', id),
            data: cleanMigratedSale,
          });
        }
        const saleInsts = (instBySaleId.get(id) || []).sort((a, b) => a.number - b.number);
        batchOps.push({
          ref: doc(db, 'publicContracts', id),
          data: buildPublicContractPayload(
            sale,
            targetUid,
            effectiveMigratedSettings,
            saleInsts[0]?.dueDate
          ),
        });
      });

      instMap.forEach((inst, id) => {
        if (!existingUserInstIds.has(id)) {
          batchOps.push({
            ref: doc(db, 'users', targetUid, 'installments', id),
            data: inst,
          });
        }
      });

      closingMap.forEach((closing, id) => {
        if (!existingUserClosingIds.has(id)) {
          batchOps.push({
            ref: doc(db, 'users', targetUid, 'closings', id),
            data: closing,
          });
        }
      });

      if (legacySettingsRaw && !userSettingsSnap.exists()) {
        batchOps.push({
          ref: doc(db, 'users', targetUid, 'settings', 'config'),
          data: effectiveMigratedSettings,
        });
      }

      if (batchOps.length > 0) {
        await commitBatchedWrites(batchOps);
      }

      const counts = {
        products: productMap.size,
        sales: saleMap.size,
        installments: instMap.size,
        closings: closingMap.size,
      };

      await setDoc(migrationRef, {
        completed: true,
        migratedAt: new Date().toISOString(),
        sourceEmail: PRINCIPAL_OWNER_EMAIL,
        counts,
      });

      setMigrationState({ status: 'completed', counts });
    } catch (err: any) {
      console.error('Erro ao vincular dados anteriores à conta principal:', err);
      if (err?.code === 'permission-denied') {
        setMigrationState({ status: 'needs_verification' });
      } else {
        setMigrationState({
          status: 'error',
          errorMessage: err?.message || 'Erro ao migrar dados anteriores.',
        });
      }
    } finally {
      migrationRunningRef.current = false;
    }
  }, []);

  const retryLegacyMigration = useCallback(async () => {
    const activeUser = auth.currentUser || user;
    if (!activeUser) return;
    await runPrincipalOwnerMigration(activeUser);
  }, [user, runPrincipalOwnerMigration]);

  // Reset state immediately when user changes & attach strictly scoped Firestore listeners
  useEffect(() => {
    if (!user || !uid) {
      setProducts([]);
      setSales([]);
      setInstallments([]);
      setClosings([]);
      setSettings(buildDefaultSettings(null));
      setMigrationState({ status: 'idle' });
      setIsInitialLoading(false);
      syncedPublicIdsRef.current.clear();
      return;
    }

    // Load only THIS user's isolated local cache (never shared across users)
    const cachedProducts = loadUserCached<Product[]>(uid, 'products', []);
    const cachedSales = loadUserCached<Sale[]>(uid, 'sales', []);
    const cachedInstallments = loadUserCached<Installment[]>(uid, 'installments', []);
    const cachedClosings = loadUserCached<Closing[]>(uid, 'closings', []);
    const cachedSettings = loadUserCached<Settings | null>(uid, 'settings', null);

    setProducts(cachedProducts);
    setSales(cachedSales);
    setInstallments(cachedInstallments);
    setClosings(cachedClosings);
    setSettings(cachedSettings ? mergeSettingsWithDefaults(cachedSettings, user) : buildDefaultSettings(user));
    setMigrationState({ status: 'idle' });
    syncedPublicIdsRef.current.clear();

    const hasUserCache = cachedSales.length > 0 || cachedProducts.length > 0;
    setIsInitialLoading(!hasUserCache);

    // Ensure user profile doc exists
    const ensureUserProfile = async () => {
      try {
        const profileRef = doc(db, 'users', uid);
        const existingSnap = await getDoc(profileRef);
        const nowIso = new Date().toISOString();
        const existingCreatedAt = existingSnap.exists() ? existingSnap.data()?.createdAt : undefined;
        await setDoc(
          profileRef,
          cleanData({
            uid,
            email: String(user.email || '').slice(0, 320),
            displayName: user.displayName ? String(user.displayName).slice(0, 200) : undefined,
            createdAt: existingCreatedAt || nowIso,
            updatedAt: nowIso,
          })
        );
      } catch (err: any) {
        if (err?.code !== 'unavailable') {
          console.warn('Perfil de usuário notice:', err?.code || err);
        }
      }
    };

    ensureUserProfile();

    if (isPrincipalOwnerEmail(user.email)) {
      runPrincipalOwnerMigration(user);
    }

    let loadedProducts = false;
    let loadedSales = false;
    let settingsChecked = false;
    let settingsHasV2 = false;
    let latestSalesDocs: Sale[] = [];
    let latestRawSettings: Partial<Settings> = {};
    let v2ResetTriggered = false;

    const maybeRunCapitalResetV2 = async () => {
      if (v2ResetTriggered || !settingsChecked || !loadedSales || settingsHasV2) return;
      v2ResetTriggered = true;
      try {
        const salesNeedingZero = latestSalesDocs.filter(
          (s) => (Number(s.costPrice) || 0) !== 0 || (Number(s.profit) || 0) !== 0
        );
        if (salesNeedingZero.length > 0) {
          const CHUNK = 350;
          for (let i = 0; i < salesNeedingZero.length; i += CHUNK) {
            const batch = writeBatch(db);
            salesNeedingZero.slice(i, i + CHUNK).forEach((s) => {
              batch.update(doc(db, 'users', uid, 'sales', s.id), {
                costPrice: 0,
                profit: 0,
              });
            });
            await batch.commit();
          }
          const zeroedLocal = latestSalesDocs.map((s) => ({ ...s, costPrice: 0, profit: 0 }));
          setSales(zeroedLocal);
          saveUserCached(uid, 'sales', zeroedLocal);
        }

        const nextSettings = mergeSettingsWithDefaults({ ...latestRawSettings, capitalSyncV2: true }, user);
        await setDoc(doc(db, 'users', uid, 'settings', 'config'), sanitizeSettingsForFirestore(nextSettings));
        setSettings(nextSettings);
        saveUserCached(uid, 'settings', nextSettings);
      } catch (err) {
        console.warn('Capital V2 baseline reset notice:', err);
      }
    };

    const checkFinished = () => {
      if (loadedProducts && loadedSales) {
        setIsInitialLoading(false);
      }
    };

    const safetyTimer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1800);

    const unsubProducts = onSnapshot(
      collection(db, 'users', uid, 'products'),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Product));
        setProducts(data);
        saveUserCached(uid, 'products', data);
        loadedProducts = true;
        checkFinished();
      },
      (err) => {
        console.warn('Snapshot notice [user products]:', err?.code || err);
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.LIST, `users/${uid}/products`);
        }
        loadedProducts = true;
        checkFinished();
      }
    );

    const unsubSales = onSnapshot(
      collection(db, 'users', uid, 'sales'),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Sale));
        latestSalesDocs = data;
        setSales(data);
        saveUserCached(uid, 'sales', data);
        loadedSales = true;
        checkFinished();
        maybeRunCapitalResetV2();
      },
      (err) => {
        console.warn('Snapshot notice [user sales]:', err?.code || err);
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.LIST, `users/${uid}/sales`);
        }
        loadedSales = true;
        checkFinished();
      }
    );

    const unsubInstallments = onSnapshot(
      collection(db, 'users', uid, 'installments'),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Installment));
        setInstallments(data);
        saveUserCached(uid, 'installments', data);
      },
      (err) => {
        console.warn('Snapshot notice [user installments]:', err?.code || err);
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.LIST, `users/${uid}/installments`);
        }
      }
    );

    const unsubClosings = onSnapshot(
      collection(db, 'users', uid, 'closings'),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Closing));
        setClosings(data);
        saveUserCached(uid, 'closings', data);
      },
      (err) => {
        console.warn('Snapshot notice [user closings]:', err?.code || err);
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.LIST, `users/${uid}/closings`);
        }
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'users', uid, 'settings', 'config'),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const rawSettings = docSnapshot.data() as Settings;
          latestRawSettings = rawSettings;
          settingsHasV2 = rawSettings?.capitalSyncV2 === true;
          const merged = mergeSettingsWithDefaults(rawSettings, user);
          setSettings(merged);
          saveUserCached(uid, 'settings', merged);
        } else {
          latestRawSettings = {};
          settingsHasV2 = false;
        }
        settingsChecked = true;
        maybeRunCapitalResetV2();
      },
      (err) => {
        console.warn('Snapshot notice [user settings]:', err?.code || err);
        if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.GET, `users/${uid}/settings/config`);
        }
      }
    );

    // Real-time sync of customer signatures submitted via public link (?sign=<saleId>)
    const unsubPublicSignatures = onSnapshot(
      query(collection(db, 'publicContracts'), where('ownerUid', '==', uid)),
      async (snapshot) => {
        for (const change of snapshot.docs) {
          const pub = change.data();
          if (!pub?.isSigned) continue;
          const saleId = change.id;
          try {
            const saleRef = doc(db, 'users', uid, 'sales', saleId);
            const saleSnap = await getDoc(saleRef);
            if (saleSnap.exists() && !saleSnap.data()?.isSigned) {
              await updateDoc(
                saleRef,
                cleanData({
                  isSigned: true,
                  signature: pub.signature,
                  signatureImage: pub.signatureImage,
                  signedAt: pub.signedAt,
                  signerIp: pub.signerIp,
                  signerUserAgent: pub.signerUserAgent,
                  signatureHash: pub.signatureHash,
                })
              );
            }
          } catch (syncErr) {
            console.warn('Sincronização de assinatura pública:', syncErr);
          }
        }
      },
      (err) => {
        console.warn('Snapshot notice [publicContracts]:', err?.code || err);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubProducts();
      unsubSales();
      unsubInstallments();
      unsubClosings();
      unsubSettings();
      unsubPublicSignatures();
    };
  }, [user, uid, mergeSettingsWithDefaults, runPrincipalOwnerMigration]);

  // Ensure every sale owned by the current user has an up-to-date publicContracts mirror for ?sign= links
  const syncPublicContract = useCallback(
    async (sale: Sale, currentSettings?: Settings, saleInstallments?: Installment[]) => {
      if (!uid || !sale?.id) return;
      try {
        const effSettings = currentSettings || settings;
        const firstInst = (saleInstallments || installments)
          .filter((i) => i.saleId === sale.id)
          .sort((a, b) => a.number - b.number)[0];
        const payload = buildPublicContractPayload(sale, uid, effSettings, firstInst?.dueDate);
        await setDoc(doc(db, 'publicContracts', sale.id), payload);
        syncedPublicIdsRef.current.add(sale.id);
      } catch (err) {
        console.warn('Sync publicContract notice:', err);
      }
    },
    [uid, settings, installments]
  );

  // Lazily backfill publicContracts for any loaded sales not yet mirrored in this session
  useEffect(() => {
    if (!uid || sales.length === 0) return;
    const missing = sales.filter((s) => s.id && !syncedPublicIdsRef.current.has(s.id));
    if (missing.length === 0) return;

    missing.forEach((sale) => {
      syncedPublicIdsRef.current.add(sale.id);
    });

    (async () => {
      for (const sale of missing) {
        try {
          const pubRef = doc(db, 'publicContracts', sale.id);
          const pubSnap = await getDoc(pubRef);
          if (!pubSnap.exists()) {
            const firstInst = installments
              .filter((i) => i.saleId === sale.id)
              .sort((a, b) => a.number - b.number)[0];
            const fallbackImei = products.find((p) => p.id === sale.productId)?.imei;
            const enrichedSale =
              sale.productImei || !fallbackImei ? sale : { ...sale, productImei: fallbackImei };
            await setDoc(pubRef, buildPublicContractPayload(enrichedSale, uid, settings, firstInst?.dueDate));
          }
        } catch {}
      }
    })();
  }, [uid, sales, installments, products, settings]);

  const saveSettings = async (newSettings: Settings) => {
    if (!uid) return;
    try {
      const updated = { ...newSettings };
      const currentOperator = updated.currentOperator || 'operator1';

      if (currentOperator === 'operator1') {
        updated.op1Name = updated.userName;
        updated.op1Role = updated.userRole;
        updated.op1Function = updated.userFunction;
        updated.op1Email = updated.userEmail;
        updated.op1Photo = updated.profilePhoto;
        updated.op1PixName = updated.pixName;
        updated.op1PixKey = updated.pixKey;
        updated.op1PixType = updated.pixType;
      } else {
        updated.op2Name = updated.userName;
        updated.op2Role = updated.userRole;
        updated.op2Function = updated.userFunction;
        updated.op2Email = updated.userEmail;
        updated.op2Photo = updated.profilePhoto;
        updated.op2PixName = updated.pixName;
        updated.op2PixKey = updated.pixKey;
        updated.op2PixType = updated.pixType;
      }

      const sanitized = sanitizeSettingsForFirestore(updated);
      await setDoc(doc(db, 'users', uid, 'settings', 'config'), sanitized);
      setSettings(updated);
      saveUserCached(uid, 'settings', updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/settings/config`);
    }
  };

  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>) => {
    if (!uid) return;
    const id = crypto.randomUUID();
    const newProduct = sanitizeProductForFirestore(
      {
        ...p,
        quantity: p.quantity !== undefined ? p.quantity : 1,
        createdAt: new Date().toISOString(),
      },
      id
    );
    try {
      await setDoc(doc(db, 'users', uid, 'products', id), newProduct);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/products/${id}`);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!uid) return;
    try {
      const sanitizedUpdates: Partial<Product> = { ...updates };
      if ('imei' in sanitizedUpdates) {
        sanitizedUpdates.imei =
          typeof sanitizedUpdates.imei === 'string' ? sanitizedUpdates.imei.trim().slice(0, 64) : '';
      }
      await updateDoc(doc(db, 'users', uid, 'products', id), cleanData(sanitizedUpdates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/products/${id}`);
    }
  };

  const registerSale = async (data: {
    productId: string;
    client: string;
    clientPhone: string;
    clientCpf: string;
    clientRg?: string;
    clientAddress?: string;
    installments: number;
    saleDate?: string;
    firstDueDate: string;
    percentageAdjustment: number;
    manualSalePrice: number;
    downPayment: number;
    isInterestOnly?: boolean;
    interestRate?: number;
    costPrice?: number;
    sellerName?: string;
    productImei?: string;
  }): Promise<boolean> => {
    if (!uid) return false;
    try {
      const cleanProdId = (data.productId || '').trim();
      const matchedProduct = products.find(
        (p) => p.id === cleanProdId || p.id === data.productId || String(p.id).trim() === cleanProdId
      );
      const productExistsInStock = Boolean(matchedProduct);

      const product: Product = matchedProduct || {
        id: cleanProdId || crypto.randomUUID(),
        name: 'Ativo Comercial',
        cost: data.costPrice || 0,
        sale: data.manualSalePrice || 0,
        category: 'Geral',
        status: 'Vendido',
        createdAt: new Date().toISOString(),
        quantity: 0,
      };

      const salePrice = data.manualSalePrice || product.sale || 0;
      const adjustAmount = (salePrice * (data.percentageAdjustment || 0)) / 100;
      const finalTotal = salePrice + adjustAmount;

      let installmentValue = 0;
      if (data.isInterestOnly) {
        installmentValue = finalTotal * ((data.interestRate || 0) / 100);
      } else {
        const remainingToFinance = Math.max(0, finalTotal - (data.downPayment || 0));
        installmentValue = data.installments > 0 ? remainingToFinance / data.installments : 0;
      }

      const costForProfit =
        data.costPrice !== undefined && Number.isFinite(Number(data.costPrice))
          ? Math.max(0, Number(data.costPrice))
          : 0;
      const profit = costForProfit > 0 ? Number((finalTotal - costForProfit).toFixed(2)) : 0;

      const defaultSeller =
        settings.userName && settings.userName.toLowerCase() !== 'nexus commerce'
          ? settings.userName
          : (settings.currentOperator === 'operator2' ? settings.op2Name : settings.op1Name) ||
            settings.userName ||
            'Operador';

      const actualSaleDate = data.saleDate || getLocalDateString();
      const saleId = crypto.randomUUID();
      const resolvedProductImei = (data.productImei || product.imei || '').trim().slice(0, 64);
      const newSale = sanitizeSaleForFirestore(
        {
          id: saleId,
          productId: product.id,
          productName: product.name,
          productImei: resolvedProductImei || undefined,
          client: (data.client || '').trim(),
          clientPhone: (data.clientPhone || '').trim(),
          clientCpf: (data.clientCpf || '').trim(),
          clientRg: (data.clientRg || '').trim() || undefined,
          clientAddress: (data.clientAddress || '').trim(),
          total: finalTotal,
          downPayment: data.downPayment || 0,
          profit: profit,
          installmentsCount: data.installments,
          installmentValue: installmentValue,
          date: actualSaleDate,
          status: 'Ativa',
          createdAt: new Date().toISOString(),
          isInterestOnly: data.isInterestOnly || false,
          interestRate: data.interestRate || 0,
          costPrice: costForProfit,
          sellerName: data.sellerName || defaultSeller,
        },
        saleId
      );

      const currentQty = product.quantity !== undefined ? product.quantity : 1;
      const updatedProductQty = currentQty > 1 ? currentQty - 1 : 0;
      const updatedProductStatus = currentQty > 1 ? 'Disponivel' : 'Vendido';

      const parsedDate = parseDateSafe(data.firstDueDate) || {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      };
      const y = parsedDate.year;
      const m = parsedDate.month;
      const d = parsedDate.day;

      const newInstallmentsList: Installment[] = [];
      for (let i = 1; i <= data.installments; i++) {
        const dueDate = new Date(y, m - 1 + (i - 1), d, 12, 0, 0);
        if (dueDate.getDate() !== d) dueDate.setDate(0);

        const instId = crypto.randomUUID();
        newInstallmentsList.push(
          sanitizeInstallmentForFirestore(
            {
              id: instId,
              saleId: saleId,
              client: (data.client || '').trim(),
              productName: product.name,
              number: i,
              total: data.installments,
              value: installmentValue,
              dueDate: dueDate.toISOString(),
              status: 'Pendente',
            },
            instId
          )
        );
      }

      const publicContractPayload = buildPublicContractPayload(
        newSale,
        uid,
        settings,
        newInstallmentsList[0]?.dueDate
      );

      // Update local state immediately
      setSales((prev) => [newSale, ...prev.filter((s) => s.id !== saleId)]);
      setInstallments((prev) => [...prev.filter((i) => i.saleId !== saleId), ...newInstallmentsList]);
      if (productExistsInStock) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, quantity: updatedProductQty, status: updatedProductStatus } : p
          )
        );
      }

      saveUserCached(uid, 'sales', [newSale, ...sales.filter((s) => s.id !== saleId)]);
      saveUserCached(uid, 'installments', [
        ...installments.filter((i) => i.saleId !== saleId),
        ...newInstallmentsList,
      ]);
      if (productExistsInStock) {
        saveUserCached(
          uid,
          'products',
          products.map((p) =>
            p.id === product.id ? { ...p, quantity: updatedProductQty, status: updatedProductStatus } : p
          )
        );
      }

      syncedPublicIdsRef.current.add(saleId);

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'users', uid, 'sales', saleId), newSale);
        batch.set(doc(db, 'publicContracts', saleId), publicContractPayload);

        if (productExistsInStock && product.id) {
          batch.update(doc(db, 'users', uid, 'products', product.id), {
            quantity: updatedProductQty,
            status: updatedProductStatus,
          });
        }

        for (const inst of newInstallmentsList) {
          batch.set(doc(db, 'users', uid, 'installments', inst.id), inst);
        }

        await batch.commit();
        return true;
      } catch (err: any) {
        console.warn('Erro ao gravar lote de venda no Firestore, tentando persistência direta:', err);
        try {
          await setDoc(doc(db, 'users', uid, 'sales', saleId), newSale);
          await setDoc(doc(db, 'publicContracts', saleId), publicContractPayload);
          if (productExistsInStock && product.id) {
            await updateDoc(doc(db, 'users', uid, 'products', product.id), {
              quantity: updatedProductQty,
              status: updatedProductStatus,
            });
          }
          for (const inst of newInstallmentsList) {
            await setDoc(doc(db, 'users', uid, 'installments', inst.id), inst);
          }
          return true;
        } catch (innerErr: any) {
          console.error('Falha no fallback de gravação da venda:', innerErr);
          if (innerErr?.code !== 'unavailable') {
            handleFirestoreError(innerErr, OperationType.WRITE, `users/${uid}/sales/${saleId}`);
          }
          return true;
        }
      }
    } catch (fatalErr) {
      console.error('Erro inesperado em registerSale:', fatalErr);
      return false;
    }
  };

  const deleteSale = async (id: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const cleanId = (id || '').trim();
      const sale = sales.find((s) => s.id === cleanId || s.id === id);

      setSales((prev) => prev.filter((s) => s.id !== cleanId && s.id !== id));
      setInstallments((prev) => prev.filter((i) => i.saleId !== cleanId && i.saleId !== id));
      if (sale && sale.productId) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === sale.productId
              ? { ...p, quantity: (p.quantity !== undefined ? p.quantity : 0) + 1, status: 'Disponivel' }
              : p
          )
        );
      }

      const batch = writeBatch(db);

      if (sale && sale.productId) {
        const p = products.find((prod) => prod.id === sale.productId);
        if (p) {
          const currentQty = p.quantity !== undefined ? p.quantity : 0;
          batch.update(doc(db, 'users', uid, 'products', sale.productId), {
            quantity: currentQty + 1,
            status: 'Disponivel',
          });
        }
      }

      batch.delete(doc(db, 'users', uid, 'sales', cleanId));
      batch.delete(doc(db, 'publicContracts', cleanId));
      if (cleanId !== id) {
        batch.delete(doc(db, 'users', uid, 'sales', id));
        batch.delete(doc(db, 'publicContracts', id));
      }

      const saleInstallments = installments.filter((i) => i.saleId === cleanId || i.saleId === id);
      saleInstallments.forEach((i) => {
        batch.delete(doc(db, 'users', uid, 'installments', i.id));
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error('Erro no lote do Firestore ao excluir contrato, acionando fallback:', err);
      try {
        const cleanId = (id || '').trim();
        await deleteDoc(doc(db, 'users', uid, 'sales', cleanId));
        await deleteDoc(doc(db, 'publicContracts', cleanId)).catch(() => {});
        const saleInstallments = installments.filter((i) => i.saleId === cleanId || i.saleId === id);
        for (const inst of saleInstallments) {
          await deleteDoc(doc(db, 'users', uid, 'installments', inst.id)).catch(() => {});
        }
        return true;
      } catch (fallbackErr) {
        console.error('Erro no fallback de exclusão de contrato:', fallbackErr);
        handleFirestoreError(fallbackErr, OperationType.DELETE, `users/${uid}/sales/${id}`);
        return false;
      }
    }
  };

  const deleteClient = async (clientName: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const clientSales = sales.filter((s) => s.client === clientName);

      setSales((prev) => prev.filter((s) => s.client !== clientName));
      setInstallments((prev) => prev.filter((i) => i.client !== clientName));

      const batch = writeBatch(db);

      clientSales.forEach((s) => {
        if (s.productId) {
          const p = products.find((prod) => prod.id === s.productId);
          if (p) {
            const currentQty = p.quantity !== undefined ? p.quantity : 0;
            batch.update(doc(db, 'users', uid, 'products', s.productId), {
              quantity: currentQty + 1,
              status: 'Disponivel',
            });
          }
        }
        batch.delete(doc(db, 'users', uid, 'sales', s.id));
        batch.delete(doc(db, 'publicContracts', s.id));
      });

      const clientInstallments = installments.filter((i) => i.client === clientName);
      clientInstallments.forEach((i) => {
        batch.delete(doc(db, 'users', uid, 'installments', i.id));
      });

      await batch.commit();
      return true;
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/deleteClient`);
      return false;
    }
  };

  const payInstallment = async (id: string, paymentMethod: string) => {
    if (!uid) return;
    try {
      const inst = installments.find((i) => i.id === id);
      if (!inst) return;
      const correspondingSale = sales.find((s) => s.id === inst.saleId);

      const batch = writeBatch(db);

      batch.update(
        doc(db, 'users', uid, 'installments', id),
        cleanData({
          status: 'Pago',
          paidAt: new Date().toISOString(),
          paymentMethod,
        })
      );

      if (correspondingSale?.isInterestOnly) {
        const baseDate = inst.dueDate ? new Date(inst.dueDate) : new Date();
        const nextDueDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() + 1,
          baseDate.getDate(),
          12
        );

        if (nextDueDate.getDate() !== baseDate.getDate()) {
          nextDueDate.setDate(0);
        }

        const instId = crypto.randomUUID();
        const nextNumber = inst.number + 1;
        const newTotal = Math.max(correspondingSale.installmentsCount, nextNumber);

        batch.update(doc(db, 'users', uid, 'sales', correspondingSale.id), {
          installmentsCount: newTotal,
        });

        batch.set(
          doc(db, 'users', uid, 'installments', instId),
          sanitizeInstallmentForFirestore(
            {
              id: instId,
              saleId: correspondingSale.id,
              client: inst.client,
              productName: inst.productName,
              number: nextNumber,
              total: newTotal,
              value:
                correspondingSale.installmentValue !== undefined
                  ? correspondingSale.installmentValue
                  : inst.value,
              dueDate: nextDueDate.toISOString(),
              status: 'Pendente',
            },
            instId
          )
        );
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/installments/${id}`);
    }
  };

  const amortizeSale = async (saleId: string, amount: number, paymentMethod: string) => {
    if (!uid) return;
    try {
      const cleanSaleId = (saleId || '').trim();
      const sale = sales.find((s) => s.id === cleanSaleId || s.id === saleId);
      if (!sale) return;

      const numAmount = Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
      const newTotal = Number(Math.max(0, sale.total - numAmount).toFixed(2));
      const isLiquidated = newTotal <= 0.009;

      let newInstallmentValue = 0;
      if (isLiquidated) {
        newInstallmentValue = 0;
      } else if (sale.isInterestOnly) {
        newInstallmentValue = Number((newTotal * ((Number(sale.interestRate) || 0) / 100)).toFixed(2));
      } else {
        const pendingCount = installments.filter(
          (i) => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente'
        ).length;
        newInstallmentValue = pendingCount > 0 ? Number((newTotal / pendingCount).toFixed(2)) : 0;
      }
      const newStatus = isLiquidated ? 'Liquidada' : 'Ativa';

      const updatedSaleObj: Sale = {
        ...sale,
        total: newTotal,
        installmentValue: newInstallmentValue,
        status: newStatus,
      };

      setSales((prev) =>
        prev.map((s) => (s.id === cleanSaleId || s.id === saleId ? updatedSaleObj : s))
      );

      const batch = writeBatch(db);

      batch.update(doc(db, 'users', uid, 'sales', cleanSaleId), {
        total: newTotal,
        installmentValue: newInstallmentValue,
        status: newStatus,
      });

      batch.set(
        doc(db, 'publicContracts', cleanSaleId),
        buildPublicContractPayload(updatedSaleObj, uid, settings)
      );

      const amortInstId = crypto.randomUUID();
      const nextNumber =
        installments.filter((i) => i.saleId === cleanSaleId || i.saleId === saleId).length + 1;

      const amortInst = sanitizeInstallmentForFirestore(
        {
          id: amortInstId,
          saleId: cleanSaleId,
          client: sale.client,
          productName: `${sale.productName} (Amortização de Principal)`,
          number: nextNumber,
          total: Math.max(sale.installmentsCount, nextNumber),
          value: numAmount,
          dueDate: new Date().toISOString(),
          status: 'Pago',
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod,
        },
        amortInstId
      );

      batch.set(doc(db, 'users', uid, 'installments', amortInstId), amortInst);

      if (isLiquidated) {
        const pending = installments.filter(
          (i) => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente'
        );
        pending.forEach((p) => {
          batch.delete(doc(db, 'users', uid, 'installments', p.id));
        });
        setInstallments((prev) => [
          ...prev.filter(
            (i) => !((i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente')
          ),
          amortInst,
        ]);
      } else {
        const pending = installments.filter(
          (i) => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente'
        );
        pending.forEach((p) => {
          batch.update(doc(db, 'users', uid, 'installments', p.id), {
            value: newInstallmentValue,
          });
        });
        setInstallments((prev) => [
          ...prev.map((i) =>
            (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente'
              ? { ...i, value: newInstallmentValue }
              : i
          ),
          amortInst,
        ]);
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/sales/${saleId}/amortize`);
    }
  };

  const updateSaleFull = async (
    id: string,
    data: {
      productId?: string;
      client: string;
      clientPhone: string;
      clientCpf: string;
      clientRg?: string;
      clientAddress?: string;
      installments: number;
      saleDate?: string;
      firstDueDate?: string;
      percentageAdjustment: number;
      manualSalePrice: number;
      downPayment: number;
      isInterestOnly?: boolean;
      interestRate?: number;
      costPrice?: number;
      sellerName?: string;
      productImei?: string;
    },
    fallbackSale?: Partial<Sale>
  ): Promise<boolean> => {
    if (!uid) return false;
    const cleanId = (id || '').trim();
    let sale = sales.find(
      (s) => s.id === cleanId || s.id === id || String(s.id).trim() === cleanId
    );
    if (!sale && fallbackSale) {
      sale = fallbackSale as Sale;
    }
    if (!sale) {
      sale = {
        id: cleanId,
        productId: data.productId || '',
        productName: 'Produto Comercial',
        client: data.client,
        clientPhone: data.clientPhone,
        total: data.manualSalePrice,
        downPayment: data.downPayment,
        profit: 0,
        installmentsCount: data.installments,
        installmentValue: 0,
        date: data.saleDate || getLocalDateString(),
        status: 'Ativa',
        createdAt: new Date().toISOString(),
      };
    }

    if (sale.isSigned || sale.signature?.signed) {
      console.warn('Tentativa de editar contrato já assinado bloqueada:', cleanId);
      return false;
    }

    const oldProductId = sale.productId;
    const newProductId = data.productId || oldProductId;
    const product = products.find((p) => p.id === newProductId);
    const productName = product?.name || sale.productName || 'Produto Comercial';

    const salePrice =
      data.manualSalePrice !== undefined && Number.isFinite(data.manualSalePrice) && data.manualSalePrice > 0
        ? data.manualSalePrice
        : product?.sale || sale.total || 0;

    const adjustAmount = (salePrice * (Number(data.percentageAdjustment) || 0)) / 100;
    const finalTotal = Math.max(0, salePrice + adjustAmount);
    const installmentsCount = Math.max(1, Number(data.installments) || 1);
    const downPayment = Number.isFinite(data.downPayment) ? Math.max(0, data.downPayment) : 0;

    let installmentValue = 0;
    if (data.isInterestOnly) {
      installmentValue = finalTotal * ((Number(data.interestRate) || 0) / 100);
    } else {
      const remainingToFinance = Math.max(0, finalTotal - downPayment);
      installmentValue = installmentsCount > 0 ? remainingToFinance / installmentsCount : 0;
    }

    const costForProfit =
      data.costPrice !== undefined && Number.isFinite(data.costPrice)
        ? Math.max(0, data.costPrice)
        : sale.costPrice !== undefined
          ? Math.max(0, sale.costPrice)
          : 0;
    const profit = costForProfit > 0 ? Number((finalTotal - costForProfit).toFixed(2)) : 0;

    const defaultSeller =
      settings.userName && settings.userName.toLowerCase() !== 'nexus commerce'
        ? settings.userName
        : (settings.currentOperator === 'operator2' ? settings.op2Name : settings.op1Name) ||
          settings.userName ||
          'Operador';

    const resolvedProductImei =
      data.productImei !== undefined
        ? String(data.productImei).trim().slice(0, 64)
        : oldProductId !== newProductId
          ? (product?.imei || '').trim().slice(0, 64)
          : (sale.productImei || product?.imei || '').trim().slice(0, 64);

    const updatedSaleDate = data.saleDate || sale.date || getLocalDateString();
    const cleanRg = (data.clientRg !== undefined ? data.clientRg : sale.clientRg || '').trim().slice(0, 40);
    const updatedSaleFields: Partial<Sale> = {
      client: (data.client || '').trim(),
      clientPhone: data.clientPhone || '',
      clientCpf: data.clientCpf || '',
      clientRg: cleanRg || undefined,
      clientAddress: data.clientAddress || '',
      total: finalTotal,
      downPayment: downPayment,
      profit: profit,
      installmentsCount: installmentsCount,
      installmentValue: installmentValue,
      date: updatedSaleDate,
      isInterestOnly: Boolean(data.isInterestOnly),
      interestRate: Number(data.interestRate) || 0,
      costPrice: costForProfit,
      productId: newProductId,
      productName: productName,
      productImei: resolvedProductImei || undefined,
      sellerName: data.sellerName || sale.sellerName || defaultSeller,
    };

    const fullUpdatedSale = sanitizeSaleForFirestore({ ...sale, ...updatedSaleFields }, cleanId);
    if (!resolvedProductImei) {
      delete fullUpdatedSale.productImei;
    }
    if (!cleanRg) {
      delete fullUpdatedSale.clientRg;
    }

    setSales((prev) => {
      const exists = prev.some((s) => s.id === cleanId || s.id === id);
      const updated = exists
        ? prev.map((s) => (s.id === cleanId || s.id === id ? fullUpdatedSale : s))
        : [...prev, fullUpdatedSale];
      saveUserCached(uid, 'sales', updated);
      return updated;
    });

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'sales', cleanId), fullUpdatedSale);

    if (oldProductId && newProductId && oldProductId !== newProductId) {
      const oldProd = products.find((p) => p.id === oldProductId);
      if (oldProd) {
        const restoredQty = (oldProd.quantity !== undefined ? oldProd.quantity : 0) + 1;
        batch.update(doc(db, 'users', uid, 'products', oldProductId), {
          quantity: restoredQty,
          status: 'Disponivel',
        });
        setProducts((prev) =>
          prev.map((p) =>
            p.id === oldProductId ? { ...p, quantity: restoredQty, status: 'Disponivel' } : p
          )
        );
      }
      if (product) {
        const newQty = Math.max(0, (product.quantity !== undefined ? product.quantity : 1) - 1);
        const newStatus = newQty === 0 ? 'Vendido' : 'Disponivel';
        batch.update(doc(db, 'users', uid, 'products', newProductId), {
          quantity: newQty,
          status: newStatus,
        });
        setProducts((prev) =>
          prev.map((p) =>
            p.id === newProductId ? { ...p, quantity: newQty, status: newStatus } : p
          )
        );
      }
    }

    const firstInst = installments.find(
      (i) => (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) && i.number === 1
    );
    const existingDue = firstInst?.dueDate ? getLocalDateString(firstInst.dueDate) : '';
    const dueDateChanged = Boolean(data.firstDueDate && existingDue && data.firstDueDate !== existingDue);
    const needsRegen =
      sale.installmentsCount !== installmentsCount ||
      Math.abs((sale.total || 0) - finalTotal) > 0.01 ||
      Boolean(sale.isInterestOnly) !== Boolean(data.isInterestOnly) ||
      (data.isInterestOnly && sale.interestRate !== data.interestRate) ||
      dueDateChanged;

    let effectiveFirstDue = existingDue || data.firstDueDate;

    if (needsRegen && (data.firstDueDate || existingDue)) {
      const targetDueDateStr = data.firstDueDate || existingDue;
      const parsedDate = parseDateSafe(targetDueDateStr) || {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
      };
      const y = parsedDate.year;
      const m = parsedDate.month;
      const d = parsedDate.day;

      const existingPaid = installments.filter(
        (i) =>
          (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) &&
          i.status === 'Pago'
      );
      const paidNumbers = new Set(existingPaid.map((i) => i.number));

      installments
        .filter(
          (i) =>
            (i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId) &&
            i.status !== 'Pago'
        )
        .forEach((i) => {
          batch.delete(doc(db, 'users', uid, 'installments', i.id));
        });

      existingPaid.forEach((paidInst) => {
        batch.update(
          doc(db, 'users', uid, 'installments', paidInst.id),
          cleanData({
            client: (data.client || '').trim(),
            productName: productName,
            total: installmentsCount,
          })
        );
      });

      const newInstallmentsList: Installment[] = [];
      for (let i = 1; i <= installmentsCount; i++) {
        if (paidNumbers.has(i)) continue;

        const dueDate = new Date(y, m - 1 + (i - 1), d, 12, 0, 0);
        if (dueDate.getDate() !== d) dueDate.setDate(0);

        const instId = crypto.randomUUID();
        const newInst = sanitizeInstallmentForFirestore(
          {
            id: instId,
            saleId: cleanId,
            client: (data.client || '').trim(),
            productName: productName,
            number: i,
            total: installmentsCount,
            value: installmentValue,
            dueDate: dueDate.toISOString(),
            status: 'Pendente',
          },
          instId
        );
        newInstallmentsList.push(newInst);
        batch.set(doc(db, 'users', uid, 'installments', instId), newInst);
      }

      if (newInstallmentsList[0]?.dueDate) {
        effectiveFirstDue = newInstallmentsList[0].dueDate;
      }

      const updatedPaidList = existingPaid.map((p) => ({
        ...p,
        client: (data.client || '').trim(),
        productName: productName,
        total: installmentsCount,
      }));

      setInstallments((prev) => {
        const next = [
          ...prev.filter((i) => String(i.saleId).trim() !== cleanId && i.saleId !== id),
          ...updatedPaidList,
          ...newInstallmentsList,
        ];
        saveUserCached(uid, 'installments', next);
        return next;
      });
    } else {
      installments
        .filter((i) => i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId)
        .forEach((i) => {
          batch.update(
            doc(db, 'users', uid, 'installments', i.id),
            cleanData({
              client: (data.client || '').trim(),
              productName: productName,
            })
          );
        });

      setInstallments((prev) => {
        const next = prev.map((i) =>
          i.saleId === cleanId || i.saleId === id || String(i.saleId).trim() === cleanId
            ? { ...i, client: (data.client || '').trim(), productName }
            : i
        );
        saveUserCached(uid, 'installments', next);
        return next;
      });
    }

    batch.set(
      doc(db, 'publicContracts', cleanId),
      buildPublicContractPayload(fullUpdatedSale, uid, settings, effectiveFirstDue)
    );

    try {
      await batch.commit();
      return true;
    } catch (err: any) {
      console.warn('Erro ao atualizar venda/contrato no lote, tentando persistência direta:', err);
      try {
        await setDoc(doc(db, 'users', uid, 'sales', cleanId), fullUpdatedSale);
        await setDoc(
          doc(db, 'publicContracts', cleanId),
          buildPublicContractPayload(fullUpdatedSale, uid, settings, effectiveFirstDue)
        );
        return true;
      } catch (fallbackErr: any) {
        console.error('Falha no fallback de atualização do contrato:', fallbackErr);
        if (fallbackErr?.code !== 'unavailable') {
          handleFirestoreError(fallbackErr, OperationType.WRITE, `users/${uid}/sales/${cleanId}`);
        }
        return true;
      }
    }
  };

  const advanceInstallments = async (
    saleId: string,
    items: Array<{ id: string; discountPercentage: number }>,
    paymentMethod: string
  ) => {
    if (!uid) return;
    try {
      const cleanSaleId = (saleId || '').trim();
      const sale = sales.find((s) => s.id === cleanSaleId || s.id === saleId);
      if (!sale) return;

      const batch = writeBatch(db);
      const itemMap = new Map(items.map((item) => [item.id, item.discountPercentage]));

      const targetInstallments = installments.filter((i) => itemMap.has(i.id));
      if (targetInstallments.length === 0) return;

      const updatedInstallmentsMap = new Map<string, Partial<Installment>>();

      targetInstallments.forEach((inst) => {
        const discountPct = Number(itemMap.get(inst.id)) || 0;
        const origValue = Number(inst.value) || 0;
        const discountVal = Number(((origValue * discountPct) / 100).toFixed(2));
        const finalVal = Number(Math.max(0, origValue - discountVal).toFixed(2));

        const updateData: Partial<Installment> = {
          status: 'Pago',
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethod,
          value: finalVal,
          originalValue: origValue,
          discountPercentage: discountPct,
          discountAmount: discountVal,
          isAdvanced: true,
        };

        updatedInstallmentsMap.set(inst.id, updateData);
        batch.update(doc(db, 'users', uid, 'installments', inst.id), cleanData(updateData));
      });

      const targetIds = new Set(items.map((i) => i.id));
      const remainingPending = installments.filter(
        (i) => (i.saleId === cleanSaleId || i.saleId === saleId) && i.status === 'Pendente' && !targetIds.has(i.id)
      );
      const isNowLiquidated = remainingPending.length === 0;

      if (isNowLiquidated) {
        batch.update(doc(db, 'users', uid, 'sales', cleanSaleId), {
          status: 'Liquidada',
        });
        batch.update(doc(db, 'publicContracts', cleanSaleId), {
          status: 'Liquidada',
          updatedAt: new Date().toISOString(),
        });

        setSales((prev) =>
          prev.map((s) => (s.id === cleanSaleId || s.id === saleId ? { ...s, status: 'Liquidada' } : s))
        );
      }

      setInstallments((prev) =>
        prev.map((inst) => {
          if (updatedInstallmentsMap.has(inst.id)) {
            return { ...inst, ...updatedInstallmentsMap.get(inst.id) } as Installment;
          }
          return inst;
        })
      );

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/sales/${saleId}/advanceInstallments`);
    }
  };

  const closeMonthlyRegister = async (
    periodName: string,
    profit: number,
    totalSales: number,
    salesCount: number
  ) => {
    if (!uid) return;
    const id = crypto.randomUUID();
    const newClosing = sanitizeClosingForFirestore(
      {
        id,
        closedAt: new Date().toISOString(),
        periodName,
        profit,
        totalSales,
        salesCount,
      },
      id
    );
    try {
      await setDoc(doc(db, 'users', uid, 'closings', id), newClosing);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/closings/${id}`);
    }
  };

  const deleteClosing = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'closings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/closings/${id}`);
    }
  };

  const saveDigitalSignature = async (saleId: string, audit: SignatureAudit): Promise<boolean> => {
    try {
      const cleanId = (saleId || '').trim();
      if (!cleanId) return false;

      const sanitizedAudit = sanitizeSignatureAudit(audit);
      const signatureUpdates = cleanData({
        signature: sanitizedAudit,
        isSigned: true,
        signatureImage: sanitizedAudit?.signatureImage,
        signedAt: sanitizedAudit?.signedAt,
        signerIp: sanitizedAudit?.signerIp,
        signerUserAgent: sanitizedAudit?.signerUserAgent,
        signatureHash: sanitizedAudit?.signatureHash,
      });

      const isOwnedByCurrentUser = Boolean(uid && sales.some((s) => s.id === cleanId || s.id === saleId));

      if (uid && isOwnedByCurrentUser) {
        setSales((prev) =>
          prev.map((s) =>
            s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
              ? { ...s, ...signatureUpdates }
              : s
          )
        );
        const currentCached = loadUserCached<Sale[]>(uid, 'sales', []);
        const updatedCache = currentCached.map((s) =>
          s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
            ? { ...s, ...signatureUpdates }
            : s
        );
        saveUserCached(uid, 'sales', updatedCache);

        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid, 'sales', cleanId), signatureUpdates);

        const matchedSale = sales.find((s) => s.id === cleanId || s.id === saleId);
        if (matchedSale) {
          const updatedSale = { ...matchedSale, ...signatureUpdates } as Sale;
          const firstInst = installments
            .filter((i) => i.saleId === cleanId)
            .sort((a, b) => a.number - b.number)[0];
          batch.set(
            doc(db, 'publicContracts', cleanId),
            buildPublicContractPayload(updatedSale, uid, settings, firstInst?.dueDate)
          );
        }

        const result = await Promise.race([
          batch.commit().then(() => 'synced' as const),
          new Promise<'queued'>((resolve) => setTimeout(() => resolve('queued'), 3500)),
        ]);

        if (result === 'queued') {
          console.warn('Assinatura enfileirada para sincronização offline.');
        }
        return true;
      }

      // Public external signing (?sign=<saleId>) without seller authentication
      await updateDoc(doc(db, 'publicContracts', cleanId), {
        ...signatureUpdates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar assinatura digital no Firestore:', err);
      if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.UPDATE, `publicContracts/${saleId}`);
        return false;
      }
      if (err?.code !== 'unavailable') {
        return false;
      }
      return true;
    }
  };

  const resetDigitalSignature = async (saleId: string): Promise<boolean> => {
    if (!uid) return false;
    const cleanId = (saleId || '').trim();
    if (!cleanId) return false;

    const stripSignatureFromSale = (sale: Sale): Sale => {
      const next: Sale = { ...sale, isSigned: false };
      delete next.signature;
      delete next.signatureImage;
      delete next.signedAt;
      delete next.signerIp;
      delete next.signerUserAgent;
      delete next.signatureHash;
      return next;
    };

    try {
      let matchedSale = sales.find(
        (s) => s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
      );

      if (!matchedSale) {
        const snap = await getDoc(doc(db, 'users', uid, 'sales', cleanId));
        if (snap.exists()) {
          matchedSale = { id: snap.id, ...snap.data() } as Sale;
        }
      }

      setSales((prev) =>
        prev.map((s) =>
          s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
            ? stripSignatureFromSale(s)
            : s
        )
      );
      const currentCached = loadUserCached<Sale[]>(uid, 'sales', []);
      const updatedCache = currentCached.map((s) =>
        s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
          ? stripSignatureFromSale(s)
          : s
      );
      saveUserCached(uid, 'sales', updatedCache);

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid, 'sales', cleanId), {
        isSigned: false,
        signature: deleteField(),
        signatureImage: deleteField(),
        signedAt: deleteField(),
        signerIp: deleteField(),
        signerUserAgent: deleteField(),
        signatureHash: deleteField(),
      });

      if (matchedSale) {
        const unsignedSale = stripSignatureFromSale(matchedSale);
        const firstInst = installments
          .filter((i) => i.saleId === cleanId || i.saleId === saleId)
          .sort((a, b) => a.number - b.number)[0];
        batch.set(
          doc(db, 'publicContracts', cleanId),
          buildPublicContractPayload(unsignedSale, uid, settings, firstInst?.dueDate)
        );
      }

      const result = await Promise.race([
        batch.commit().then(() => 'synced' as const),
        new Promise<'queued'>((resolve) => setTimeout(() => resolve('queued'), 3500)),
      ]);

      if (result === 'queued') {
        console.warn('Reset de assinatura enfileirado para sincronização offline.');
      }
      return true;
    } catch (err: any) {
      console.error('Erro ao refazer assinatura digital no Firestore:', err);
      if (err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/sales/${cleanId}`);
        return false;
      }
      return true;
    }
  };

  const updateSaleCostPrice = async (saleId: string, costPrice: number): Promise<boolean> => {
    if (!uid) return false;
    const cleanId = (saleId || '').trim();
    if (!cleanId) return false;

    const sale = sales.find(
      (s) => s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
    );
    if (!sale) return false;

    const safeCost =
      Number.isFinite(Number(costPrice)) && Number(costPrice) > 0
        ? Number(Number(costPrice).toFixed(2))
        : 0;

    let newProfit = 0;
    if (safeCost > 0) {
      if (sale.isInterestOnly) {
        const saleInsts = installments.filter(
          (i) => i.saleId === cleanId || i.saleId === saleId || String(i.saleId).trim() === cleanId
        );
        const interestTotal = saleInsts.reduce((acc, i) => acc + (Number(i.value) || 0), 0);
        newProfit = Number(((Number(sale.total) || 0) + interestTotal - safeCost).toFixed(2));
      } else {
        newProfit = Number(((Number(sale.total) || 0) - safeCost).toFixed(2));
      }
    }

    const updatedSales = sales.map((s) =>
      s.id === cleanId || s.id === saleId || String(s.id).trim() === cleanId
        ? { ...s, costPrice: safeCost, profit: newProfit }
        : s
    );
    setSales(updatedSales);
    saveUserCached(uid, 'sales', updatedSales);

    try {
      await updateDoc(doc(db, 'users', uid, 'sales', cleanId), {
        costPrice: safeCost,
        profit: newProfit,
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar valor pago no aparelho:', err);
      if (err?.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/sales/${cleanId}`);
        return false;
      }
      return true;
    }
  };


  return {
    products,
    sales,
    installments,
    closings,
    settings,
    setSettings: saveSettings,
    addProduct,
    deleteProduct,
    registerSale,
    payInstallment,
    amortizeSale,
    advanceInstallments,
    updateSaleFull,
    updateSaleCostPrice,
    updateProduct,
    setInstallments,
    deleteSale,
    deleteClient,
    closeMonthlyRegister,
    deleteClosing,
    saveDigitalSignature,
    resetDigitalSignature,
    syncPublicContract,
    isInitialLoading,
    migrationState,
    retryLegacyMigration,
  };
}
