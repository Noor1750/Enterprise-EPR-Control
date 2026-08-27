import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
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
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  reload
} from 'firebase/auth';
import fallbackConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Default session persistence configuration with fallback
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    setPersistence(auth, inMemoryPersistence).catch((err) => console.warn('Persistence fallback error:', err));
  });
} catch (err) {
  console.warn('Initial persistence error:', err);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('erp_real_google_token') || null;

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
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    // In Firebase Auth, Google OAuth credential provides the Google Access Token for Google Drive/Sheets APIs
    const token = credential?.accessToken || (await result.user.getIdToken());
    cachedAccessToken = token;
    localStorage.setItem('erp_real_google_token', token);
    
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/network-request-failed') {
      console.warn('Sign in popup was blocked by the browser. Please allow popups or open in a new tab.');
      throw error;
    }
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
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
    console.error('Email/Password sign in error:', error);
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
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const token = await userCredential.user.getIdToken();
    cachedAccessToken = token;
    return { user: userCredential.user, token };
  } catch (error: any) {
    console.error('User registration error:', error);
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
