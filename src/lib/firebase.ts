import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  initializeAuth,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  setPersistence,
  reload
} from 'firebase/auth';
import fallbackConfig from '../../firebase-applet-config.json';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey || "AIzaSyDoM_pgx0UsLfKQv9JTk-SBGf0uIbskYmI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain || "enterprise-erp-8a176.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId || "enterprise-erp-8a176",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket || "enterprise-erp-8a176.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId || "170156314374",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId || "1:170156314374:web:97331195bf044089399887"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Patch browserPopupRedirectResolver to prevent known Firebase Auth bug:
// "INTERNAL ASSERTION FAILED: Pending promise was never set"
// This occurs when popup closures or race conditions cause resolve/reject to be called
// after cleanup has already set this.pendingPromise to null.
try {
  const resolverAny = browserPopupRedirectResolver as any;
  if (resolverAny && typeof resolverAny._initialize === 'function') {
    const origInit = resolverAny._initialize.bind(resolverAny);
    resolverAny._initialize = async function (authObj: any) {
      const manager = await origInit(authObj);
      if (manager && typeof manager.registerConsumer === 'function' && !manager.__safeGuarded) {
        manager.__safeGuarded = true;
        const origRegister = manager.registerConsumer.bind(manager);
        manager.registerConsumer = function (consumer: any) {
          if (consumer) {
            const origResolve = consumer.resolve;
            const origReject = consumer.reject;
            if (typeof origResolve === 'function') {
              consumer.resolve = function (val: any) {
                if (!this.pendingPromise) {
                  return;
                }
                return origResolve.call(this, val);
              };
            }
            if (typeof origReject === 'function') {
              consumer.reject = function (err: any) {
                if (!this.pendingPromise) {
                  return;
                }
                return origReject.call(this, err);
              };
            }
          }
          return origRegister(consumer);
        };
      }
      return manager;
    };
  }
} catch (e) {
  console.warn('Could not patch browserPopupRedirectResolver:', e);
}

// Safe initialization with popup redirect resolver and multi-tiered persistence fallback
// Prioritizing browserLocalPersistence avoids transient IndexedDB "Database is closing/hidden" errors in iframes and background tabs
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, indexedDBLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch (_) {
  try {
    authInstance = getAuth(app);
  } catch (err) {
    console.warn('Fallback getAuth initialization:', err);
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

let cachedAccessToken: string | null = localStorage.getItem('erp_real_google_token') || null;
let activeGoogleSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

/**
 * Listen for authentication state changes and handle session resumption.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        const idToken = await user.getIdToken();
        const effectiveToken = cachedAccessToken || idToken;
        if (onAuthSuccess) {
          onAuthSuccess(user, effectiveToken);
        }
      } catch (err) {
        console.error('Failed to retrieve user ID token:', err);
        if (cachedAccessToken && onAuthSuccess) {
          onAuthSuccess(user, cachedAccessToken);
        } else if (onAuthFailure) {
          onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Authenticate with Google via Firebase popup.
 * Serialized to prevent concurrent popup collisions and assertion failures.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (activeGoogleSignInPromise) {
    return activeGoogleSignInPromise;
  }

  activeGoogleSignInPromise = (async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // In Firebase Auth, Google OAuth credential provides the Google Access Token for Google Drive/Sheets APIs
      const token = credential?.accessToken || (await result.user.getIdToken());
      cachedAccessToken = token;
      localStorage.setItem('erp_real_google_token', token);
      
      return { user: result.user, accessToken: token };
    } catch (error: any) {
      const errMsg = error?.message || error?.toString?.() || '';
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        errMsg.includes('Pending promise was never set')
      ) {
        return null;
      }
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/network-request-failed') {
        console.warn('Sign in popup was blocked by the browser. Please allow popups or open in a new tab.');
        throw error;
      }
      if (error?.code === 'auth/unauthorized-domain') {
        console.warn(`Firebase Auth unauthorized domain: ${window.location.hostname}. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.`);
        throw error;
      }
      console.warn('Google Sign in attempt:', error?.code || error?.message || error);
      throw error;
    } finally {
      activeGoogleSignInPromise = null;
    }
  })();

  return activeGoogleSignInPromise;
};

/**
 * Authenticate with Email & Password via Firebase Auth.
 */
export const emailPasswordSignIn = async (
  email: string, 
  password: string, 
  rememberMe = true
): Promise<{ user: User; token: string }> => {
  try {
    // Set requested persistence
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    } catch (_) {
      // In restricted iframes, persistence fallback is handled gracefully
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const token = await userCredential.user.getIdToken();
    cachedAccessToken = token;
    return { user: userCredential.user, token };
  } catch (error: any) {
    console.warn('Email/Password sign in attempt:', error?.code || error?.message || error);
    throw error;
  }
};

/**
 * Register a user account in Firebase Auth (Admin provision or sync).
 */
export const registerUserAccount = async (
  email: string, 
  password: string
): Promise<{ user: User; token: string }> => {
  if (!password || password.length < 6) {
    const err: any = new Error('Password should be at least 6 characters (auth/weak-password)');
    err.code = 'auth/weak-password';
    throw err;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const token = await userCredential.user.getIdToken();
    cachedAccessToken = token;
    return { user: userCredential.user, token };
  } catch (error: any) {
    console.warn('User registration validation:', error?.code || error?.message || error);
    throw error;
  }
};

/**
 * Send Firebase password reset email.
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Send Email Verification link to the currently logged in user.
 */
export const sendVerificationEmail = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error: any) {
    console.error('Email verification send error:', error);
    throw error;
  }
};

/**
 * Refresh user state to check if email has been verified.
 */
export const refreshUserAuth = async (user: User): Promise<User> => {
  try {
    await reload(user);
    return auth.currentUser || user;
  } catch (error: any) {
    console.error('Failed to reload user:', error);
    return user;
  }
};

/**
 * Update cached access token for Google API requests.
 */
export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem('erp_real_google_token', token);
};

/**
 * Retrieve cached token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && auth.currentUser) {
    try {
      cachedAccessToken = await auth.currentUser.getIdToken();
    } catch (_) {}
  }
  if (!cachedAccessToken) {
    window.dispatchEvent(new Event('force-logout'));
  }
  return cachedAccessToken;
};

/**
 * Enterprise Logout - cleans all auth tokens and session states.
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  } finally {
    cachedAccessToken = null;
    localStorage.removeItem('erp_real_google_token');
  }
};
