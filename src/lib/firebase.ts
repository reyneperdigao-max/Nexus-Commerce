import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const signOut = () => auth.signOut();

// Connection Test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase connected successfully.");
  } catch (error: any) {
    if (error?.code === 'unavailable' || (error instanceof Error && error.message.includes('offline'))) {
      console.warn("Firebase client is operating in offline/cached mode.");
    } else {
      console.warn("Firebase connection check status:", error?.message || error);
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
    },
    operationType,
    path
  };

  // Gracefully handle offline or transient network disconnection
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
