import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  emailPasswordSignIn,
  registerUserAccount,
  sendPasswordReset,
  sendVerificationEmail,
  refreshUserAuth,
  logout, 
  setAccessToken 
} from './lib/firebase';
import { createSpreadsheet, getRange, appendRow } from './lib/sheets';
import Layout from './components/Layout';
import EnterpriseLogin from './components/auth/EnterpriseLogin';
import AuthStatusScreens from './components/auth/AuthStatusScreens';
import { Loader2 } from 'lucide-react';
import { getCompanyName } from './lib/appSettings';
import { 
  UserSecurityScope, 
  DEFAULT_ADMIN_SCOPE, 
  SUPER_ADMIN_EMAILS, 
  parseUserSecurityScope, 
  enrichUserWithEmployeeData,
  recordSecurityAuditLog 
} from './lib/security';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStepText, setLoadingStepText] = useState('Signing you in...');
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(
    localStorage.getItem('erp_spreadsheet_id') || import.meta.env.VITE_SPREADSHEET_ID || 'local-storage-db'
  );
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Authorization States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authStatusType, setAuthStatusType] = useState<'not-registered' | 'inactive' | 'verification-required' | 'setup-incomplete' | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [userAccessLevels, setUserAccessLevels] = useState<string[]>([]);
  const [userSecurityScope, setUserSecurityScope] = useState<UserSecurityScope>(DEFAULT_ADMIN_SCOPE);

  // Load and subscribe to Firebase Auth state
  useEffect(() => {
    const handleForceLogout = () => {
      logout().then(() => {
        setUser(null);
        setToken(null);
        setIsAuthorized(null);
        setAuthStatusType(null);
      });
    };

    const handleDatabaseNotFound = () => {
      console.warn('Google Sheet was not found or inaccessible, seamlessly using local storage database.');
      localStorage.setItem('erp_spreadsheet_id', 'local-storage-db');
      setSpreadsheetId('local-storage-db');
    };

    window.addEventListener('force-logout', handleForceLogout);
    window.addEventListener('database-not-found', handleDatabaseNotFound);

    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setLoadingStepText('Loading your access permissions...');
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthorized(null);
        setAuthStatusType(null);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      window.removeEventListener('force-logout', handleForceLogout);
      window.removeEventListener('database-not-found', handleDatabaseNotFound);
    };
  }, []);

  // Perform RBAC & Security Scope verification whenever user or spreadsheetId changes
  useEffect(() => {
    if (!user) {
      setIsAuthorized(null);
      setAuthStatusType(null);
      setIsLoading(false);
      return;
    }

    const verifyUserAuthorization = async () => {
      setLoadingStepText('Loading your access permissions...');
      try {
        const [usersDataRaw, empDataRaw] = await Promise.all([
          getRange(spreadsheetId || 'local-storage-db', 'Users!A:Z').catch(() => []),
          getRange(spreadsheetId || 'local-storage-db', 'Employees!A:Z').catch(() => [])
        ]);

        const usersData = usersDataRaw.length > 1 ? usersDataRaw.slice(1) : [];
        const employeesData = empDataRaw.length > 1 ? empDataRaw.slice(1) : [];
        const userEmailLower = (user.email || '').toLowerCase();

        // 1. Super Admin Authorization
        if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower)) {
          const adminFound = usersData.find(u => u[0] && u[0].toLowerCase() === userEmailLower);
          let adminScope = parseUserSecurityScope(adminFound, user.email || '');
          adminScope = enrichUserWithEmployeeData(adminScope, employeesData);

          setUserSecurityScope(adminScope);
          setUserAccessLevels(['All']);
          setIsAuthorized(true);
          setAuthStatusType(null);
          setLoadingStepText('Loading your workspace...');
          setIsLoading(false);

          recordSecurityAuditLog({
            adminEmail: userEmailLower,
            targetUser: userEmailLower,
            role: 'Admin',
            module: 'Authentication',
            actionType: 'Login Success (Super Admin)',
            previousPermission: 'None',
            newPermission: 'Full System Control',
            source: 'Admin Override',
            reason: 'Master Super Administrator logged in successfully.'
          });
          return;
        }

        // 2. Look up user record in Users database
        const foundUserRow = usersData.find(u => u[0] && u[0].toLowerCase() === userEmailLower);

        if (!foundUserRow) {
          // User is authenticated in Firebase, but not registered in ERP database
          setIsAuthorized(false);
          setAuthStatusType('not-registered');
          setAuthErrorMsg('Your account is authenticated, but you are not registered in the application user registry. Please contact the administrator.');
          setIsLoading(false);

          recordSecurityAuditLog({
            adminEmail: 'System Security',
            targetUser: userEmailLower || 'Unknown',
            role: 'Unregistered',
            module: 'Authentication',
            actionType: 'Access Denied (Unregistered)',
            previousPermission: 'None',
            newPermission: 'Blocked',
            source: 'System Default',
            reason: `Authenticated user ${userEmailLower} attempted access but is not registered in Users registry.`
          });
          return;
        }

        // 3. Check Account Status
        const userStatus = String(foundUserRow[3] || 'Active').trim();
        if (userStatus.toLowerCase() !== 'active') {
          setIsAuthorized(false);
          setAuthStatusType('inactive');
          setAuthErrorMsg('Your application account is currently inactive or suspended. Please contact your administrator.');
          setIsLoading(false);

          recordSecurityAuditLog({
            adminEmail: 'System Security',
            targetUser: userEmailLower,
            role: String(foundUserRow[2] || 'User'),
            module: 'Authentication',
            actionType: 'Access Blocked (Inactive User)',
            previousPermission: 'Active',
            newPermission: 'Blocked',
            source: 'System Default',
            reason: `Inactive user ${userEmailLower} blocked from workspace access.`
          });
          return;
        }

        // 4. Parse & Enrich Security Scope
        let parsedScope = parseUserSecurityScope(foundUserRow, user.email || '');
        parsedScope = enrichUserWithEmployeeData(parsedScope, employeesData);

        // 5. Check if user access is incomplete (missing role)
        if (!parsedScope.role) {
          setIsAuthorized(false);
          setAuthStatusType('setup-incomplete');
          setAuthErrorMsg('Your account has been authenticated, but some required settings (role or department) have not been configured yet.');
          setIsLoading(false);
          return;
        }

        // 6. Complete Authorization Success
        setUserSecurityScope(parsedScope);
        setUserAccessLevels(parsedScope.accessLevel);
        setIsAuthorized(true);
        setAuthStatusType(null);
        setLoadingStepText('Loading your workspace...');
        setIsLoading(false);

        recordSecurityAuditLog({
          adminEmail: userEmailLower,
          targetUser: userEmailLower,
          role: parsedScope.role,
          module: 'Authentication',
          actionType: 'Login Success',
          previousPermission: 'None',
          newPermission: parsedScope.role,
          source: 'Role Default',
          reason: `User ${userEmailLower} signed in and loaded effective permissions successfully.`
        });

      } catch (err) {
        console.error('Authorization verification error:', err);
        setIsAuthorized(false);
        setAuthStatusType('not-registered');
        setAuthErrorMsg('Failed to verify access permissions with the application database.');
        setIsLoading(false);
      }
    };

    verifyUserAuthorization();
  }, [user, spreadsheetId]);

  /**
   * Resolve an Employee ID or identifier to its registered Email in the system.
   */
  const resolveIdentifierToEmail = useCallback(async (identifier: string): Promise<string> => {
    const cleanId = identifier.trim();
    if (cleanId.includes('@')) {
      return cleanId.toLowerCase();
    }

    const cleanUpper = cleanId.toUpperCase();

    // Check special admin abbreviations
    if (cleanUpper === 'ADMIN' || cleanUpper === 'ADMIN-001') {
      return 'smltrimsbd@gmail.com';
    }
    if (cleanUpper === 'ADMIN-002' || cleanUpper === 'NOOR') {
      return 'noor.alam1750@gmail.com';
    }

    // Search Users & Employees sheet for matching Employee ID
    try {
      const [usersDataRaw, empDataRaw] = await Promise.all([
        getRange(spreadsheetId || 'local-storage-db', 'Users!A:Z').catch(() => []),
        getRange(spreadsheetId || 'local-storage-db', 'Employees!A:Z').catch(() => [])
      ]);

      const users = usersDataRaw.length > 1 ? usersDataRaw.slice(1) : [];
      const employees = empDataRaw.length > 1 ? empDataRaw.slice(1) : [];

      // Check Users sheet: column [9] is Employee_ID, column [0] is Username/Email
      const foundInUsers = users.find(u => (u[9] && u[9].trim().toUpperCase() === cleanUpper) || (u[0] && u[0].trim().toUpperCase() === cleanUpper));
      if (foundInUsers && foundInUsers[0] && foundInUsers[0].includes('@')) {
        return foundInUsers[0].trim().toLowerCase();
      }

      // Check Employees sheet: column [0] is ID_No
      const foundInEmp = employees.find(e => e[0] && e[0].trim().toUpperCase() === cleanUpper);
      if (foundInEmp) {
        // If employee exists, find their mapped user row or fallback email
        const empName = (foundInEmp[1] || '').trim().toLowerCase();
        const userByName = users.find(u => (u[10] && u[10].trim().toLowerCase() === empName) || (u[0] && u[0].toLowerCase().includes(cleanId.toLowerCase())));
        if (userByName && userByName[0] && userByName[0].includes('@')) {
          return userByName[0].trim().toLowerCase();
        }
      }
    } catch (_) {}

    // Fallback: If not found, return as-is
    return cleanId.toLowerCase();
  }, [spreadsheetId]);

  /**
   * Handle Email & Password Login with Firebase + Employee ID resolution.
   */
  const handleEmailPasswordLogin = async (inputIdentifier: string, password: string, rememberMe: boolean) => {
    setIsLoading(true);
    setLoginErrorMsg(null);
    setLoadingStepText('Signing you in...');

    try {
      const targetEmail = await resolveIdentifierToEmail(inputIdentifier);

      try {
        // Attempt standard Firebase Authentication
        const result = await emailPasswordSignIn(targetEmail, password, rememberMe);
        setUser(result.user);
        setToken(result.token);
        setAccessToken(result.token);
      } catch (authErr: any) {
        const errCode = authErr?.code || '';

        // Check if user is an authorized admin or registered local user that needs initial Firebase provisioning
        const isSuperAdmin = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === targetEmail);
        const isDefaultPassword = password === 'Samia@628';

        if ((errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') && isSuperAdmin && isDefaultPassword) {
          // Initialize Firebase user account for Super Admin on the fly
          try {
            const registered = await registerUserAccount(targetEmail, password);
            setUser(registered.user);
            setToken(registered.token);
            setAccessToken(registered.token);
            return;
          } catch (regErr) {
            console.warn('Initial admin provisioning failed, falling back to database auth:', regErr);
          }
        }

        // Check against registered database users
        try {
          const usersDataRaw = await getRange(spreadsheetId || 'local-storage-db', 'Users!A:Z').catch(() => []);
          const users = usersDataRaw.length > 1 ? usersDataRaw.slice(1) : [];
          const foundDbUser = users.find(u => u[0] && u[0].trim().toLowerCase() === targetEmail);

          if (foundDbUser && foundDbUser[1] === password) {
            if (foundDbUser[3] !== 'Active') {
              setLoginErrorMsg('Your application account is currently inactive. Please contact your administrator.');
              setIsLoading(false);
              return;
            }

            // Sync user to Firebase Auth so next time standard Firebase verification succeeds
            try {
              const registered = await registerUserAccount(targetEmail, password);
              setUser(registered.user);
              setToken(registered.token);
              setAccessToken(registered.token);
              return;
            } catch (_) {
              // Create mock Firebase-like authenticated session
              const mockUser = {
                uid: 'user-' + Date.now(),
                email: targetEmail,
                displayName: foundDbUser[10] || targetEmail.split('@')[0],
                emailVerified: true
              } as any;
              setUser(mockUser);
              const realToken = localStorage.getItem('erp_real_google_token') || 'auth-token-' + Date.now();
              setToken(realToken);
              setAccessToken(realToken);
              return;
            }
          }
        } catch (_) {}

        // Map Firebase error codes to friendly messages
        if (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found') {
          setLoginErrorMsg('Email/Employee ID or password is incorrect.');
        } else if (errCode === 'auth/too-many-requests') {
          setLoginErrorMsg('Too many unsuccessful login attempts. Please wait a moment or reset your password.');
        } else if (errCode === 'auth/network-request-failed') {
          setLoginErrorMsg('Unable to connect to the authentication server. Please check your internet connection.');
        } else {
          setLoginErrorMsg('Authentication failed. Please verify your credentials and try again.');
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login process error:', err);
      setLoginErrorMsg('An unexpected error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  /**
   * Handle Google Sign-In with popup.
   */
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setIsPopupBlocked(false);
    setLoginErrorMsg(null);
    setLoadingStepText('Connecting to Google...');

    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setAccessToken(result.accessToken);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setIsLoading(false);
      } else if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/network-request-failed') {
        setIsPopupBlocked(true);
        setIsLoading(false);
      } else {
        console.error('Google login failed:', err);
        setLoginErrorMsg('Google authentication failed. Please try again.');
        setIsLoading(false);
      }
    }
  };

  /**
   * Handle Password Reset Request.
   */
  const handleForgotPassword = async (identifier: string) => {
    const targetEmail = await resolveIdentifierToEmail(identifier);
    await sendPasswordReset(targetEmail);
    recordSecurityAuditLog({
      adminEmail: targetEmail,
      targetUser: targetEmail,
      role: 'User',
      module: 'Authentication',
      actionType: 'Password Reset Requested',
      previousPermission: 'None',
      newPermission: 'Reset Link Sent',
      source: 'User Override',
      reason: `Password reset instructions requested for ${targetEmail}.`
    });
  };

  /**
   * Resend Email Verification link.
   */
  const handleResendVerification = async () => {
    if (user) {
      await sendVerificationEmail(user);
    }
  };

  /**
   * Refresh Email Verification status.
   */
  const handleRefreshVerification = async () => {
    if (user) {
      const updatedUser = await refreshUserAuth(user);
      setUser({ ...updatedUser });
    }
  };

  /**
   * Logout Handler.
   */
  const handleLogout = async () => {
    if (user?.email) {
      recordSecurityAuditLog({
        adminEmail: user.email,
        targetUser: user.email,
        role: userSecurityScope.role || 'User',
        module: 'Authentication',
        actionType: 'User Logout',
        previousPermission: userSecurityScope.role || 'User',
        newPermission: 'None',
        source: 'User Override',
        reason: `User ${user.email} signed out from workspace.`
      });
    }

    await logout();
    setUser(null);
    setToken(null);
    setIsAuthorized(null);
    setAuthStatusType(null);
    setLoginErrorMsg(null);
  };

  /**
   * Initialize Global ERP Database in Google Sheets (for Admin first-time setup).
   */
  const handleSetupERP = async () => {
    if (!user) return;
    setIsSettingUp(true);
    try {
      const newSpreadsheetId = await createSpreadsheet();
      
      // Add current Admin user
      await appendRow(newSpreadsheetId, 'Users!A:E', [
        [user.email || 'unknown', 'OAUTH_GOOGLE', 'Admin', 'Active', 'All']
      ]);

      localStorage.setItem('erp_spreadsheet_id', newSpreadsheetId);
      setSpreadsheetId(newSpreadsheetId);
    } catch (err) {
      console.warn('Google Sheets setup failed, defaulting to local storage database:', err);
      localStorage.setItem('erp_spreadsheet_id', 'local-storage-db');
      setSpreadsheetId('local-storage-db');
    } finally {
      setIsSettingUp(false);
    }
  };

  // 1. Loading Screen
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-300">
            {loadingStepText}
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State -> Enterprise Login Screen
  if (!user) {
    return (
      <EnterpriseLogin
        onEmailPasswordLogin={handleEmailPasswordLogin}
        onGoogleLogin={handleGoogleLogin}
        onForgotPassword={handleForgotPassword}
        isLoading={isLoading}
        loadingStepText={loadingStepText}
        isPopupBlocked={isPopupBlocked}
        onClearPopupBlocked={() => setIsPopupBlocked(false)}
        errorMessage={loginErrorMsg}
        onClearError={() => setLoginErrorMsg(null)}
      />
    );
  }

  // 3. Authenticated but Authorization Denied or Needs Attention
  if (user && isAuthorized === false && authStatusType) {
    return (
      <AuthStatusScreens
        type={authStatusType}
        userEmail={user.email}
        message={authErrorMsg}
        onLogout={handleLogout}
        onResendVerification={handleResendVerification}
        onRefreshVerification={handleRefreshVerification}
        isAdmin={SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === (user.email || '').toLowerCase())}
      />
    );
  }

  // 4. Initial Database Setup for First-time Admin
  if (!spreadsheetId) {
    const isUserSuperAdmin = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === (user.email || '').toLowerCase());
    if (!isUserSuperAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
          <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Database Not Configured</h2>
            <p className="text-slate-600 text-xs leading-relaxed">
              The master Google Sheets database is not yet linked. Please ask the System Administrator (<span className="font-semibold">smltrimsbd@gmail.com</span>) to initialize the database.
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xl">
          <h2 className="text-xl font-bold text-slate-900">Welcome, System Administrator</h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            Initialize your centralized Google Sheets & Drive database for {getCompanyName()}.
          </p>
          <button
            onClick={handleSetupERP}
            disabled={isSettingUp}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
          >
            {isSettingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialize Global Database'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 5. Authorized Enterprise Application Layout
  return (
    <Layout
      user={user}
      spreadsheetId={spreadsheetId}
      onLogout={handleLogout}
      accessLevels={userAccessLevels}
      userSecurityScope={userSecurityScope}
    />
  );
}
