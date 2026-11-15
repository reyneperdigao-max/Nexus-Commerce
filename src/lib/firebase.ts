import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  linkWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const PRINCIPAL_OWNER_EMAIL = 'nexuscommercevendas@gmail.com';

export function isPrincipalOwnerEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === PRINCIPAL_OWNER_EMAIL;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signIn = signInWithGoogle;
export const signOut = () => firebaseSignOut(auth);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

export async function registerWithEmail(email: string, password: string, displayName?: string) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    } catch {
      // Non-fatal profile display name error
    }
  }
  try {
    await sendEmailVerification(credential.user);
  } catch {
    // Non-fatal verification email dispatch error
  }
  return credential;
}

export const resetPasswordEmail = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());

export async function resendVerificationEmail() {
  if (!auth.currentUser) {
    throw new Error('Nenhum usuário autenticado no momento.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function linkAccountWithGoogle() {
  if (!auth.currentUser) {
    return signInWithPopup(auth, googleProvider);
  }
  return linkWithPopup(auth.currentUser, googleProvider);
}

export function translateFirebaseAuthError(error: unknown): string {
  const code = (error as any)?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Acesse a aba "Entrar" ou redefina sua senha.';
    case 'auth/weak-password':
      return 'A senha deve conter pelo menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.';
    case 'auth/missing-password':
      return 'Informe sua senha para continuar.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada no Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'Provedor E-mail/Senha não habilitado no Firebase Console. Ative em Authentication → Sign-in method → E-mail/senha ou entre com Google.';
    case 'auth/popup-closed-by-user':
      return 'Autenticação com Google cancelada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login do Google. Permita pop-ups para continuar.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado no Firebase Authentication. Adicione este domínio em Authentication → Settings → Authorized domains.';
    case 'auth/credential-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return 'Esta conta Google já está vinculada. Clique em "Entrar com Google" para acessar.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Não foi possível concluir a autenticação. Tente novamente.';
  }
}

// Connection Test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
  } catch (error: any) {
    if (error?.code === 'unavailable' || (error instanceof Error && error.message.includes('offline'))) {
      console.warn('Firebase client is operating in offline/cached mode.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';
  const errInfo = {
    error: errMsg,
    code: errCode,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (errCode === 'unavailable' || errCode === 'failed-precondition' || errMsg.toLowerCase().includes('offline')) {
    console.warn(`[Firestore Offline/Unavailable] Operation: ${operationType} on ${path}:`, errMsg);
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (operationType === OperationType.LIST || operationType === OperationType.GET) {
    return;
  }
  throw new Error(JSON.stringify(errInfo));
}

export function cleanData<T extends object>(data: T): T {
  const clean: any = {};
  Object.keys(data).forEach((key) => {
    const value = (data as any)[key];
    if (value === undefined) return;
    if (typeof value === 'number' && isNaN(value)) {
      clean[key] = 0;
      return;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = cleanData(value);
      return;
    }
    clean[key] = value;
  });
  return clean as T;
}
