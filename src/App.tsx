import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, setAccessToken } from './lib/firebase';
import { createSpreadsheet, getRange, appendRow } from './lib/sheets';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const FIXED_SPREADSHEET_ID = '1XSyh1o18PuQgSu3IoSbT9EcDHE08n-Gz8pA0kp8LxJ0';
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(import.meta.env.VITE_SPREADSHEET_ID || FIXED_SPREADSHEET_ID || localStorage.getItem('erp_spreadsheet_id'));
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [userAccessLevels, setUserAccessLevels] = useState<string[]>([]);

  useEffect(() => {
    const handleForceLogout = () => {
      alert('Your database connection has expired. Please log in again using "Continue with Google" to refresh the connection.');
      logout().then(() => {
        setUser(null);
        setToken(null);
      });
    };
    const handleDatabaseNotFound = () => {
      alert('The configured Google Sheets database was not found or access was denied. It may have been deleted, or you might not have access to it with this Google account. Please contact the administrator or set up a new database.');
      localStorage.removeItem('erp_spreadsheet_id');
      setSpreadsheetId(null);
    };
    window.addEventListener('force-logout', handleForceLogout);
    window.addEventListener('database-not-found', handleDatabaseNotFound);

    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    );
    return () => {
      unsubscribe();
      window.removeEventListener('force-logout', handleForceLogout);
      window.removeEventListener('database-not-found', handleDatabaseNotFound);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAuthorized(null);
      return;
    }
    if (user.email === 'noor.alam1750@gmail.com') {
      setIsAuthorized(true);
      setUserAccessLevels(['All']);
      return;
    }
    if (token === 'mock-token-for-admin') {
       setIsAuthorized(true);
       // Do not override userAccessLevels, as it was set during login
       return;
    }
    
    if (spreadsheetId) {
       const check = async () => {
         try {
           const usersData = await getRange(spreadsheetId, 'Users!A:Z');
           const found = usersData.find(u => u[0] && u[0].toLowerCase() === user.email?.toLowerCase());
           if (found && found[3] === 'Active') {
             setIsAuthorized(true);
             setUserAccessLevels(found[4] ? found[4].split(',').map(s => s.trim()) : []);
           } else {
             setIsAuthorized(false);
             setAuthErrorMsg(found ? 'Your account is inactive. Please contact admin.' : 'Need admin approval to access the system.');
           }
         } catch (err) {
           console.error('Authorization check failed:', err);
           setIsAuthorized(false);
           setAuthErrorMsg('Failed to check authorization. The database might not be accessible.');
         }
       };
       check();
    } else {
       setIsAuthorized(false);
       setAuthErrorMsg('No database configured. Please wait for admin setup.');
    }
  }, [user, token, spreadsheetId]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        localStorage.setItem('erp_real_google_token', result.accessToken);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User closed the popup, silently ignore
        console.log('User closed the login popup');
      } else {
        console.error('Login failed:', err);
        alert('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupERP = async () => {
    if (!user) return;
    setIsSettingUp(true);
    try {
      const newSpreadsheetId = await createSpreadsheet();
      
      // Add this user as Admin
      await appendRow(newSpreadsheetId, 'Users!A:E', [
        [user.email || 'unknown', 'OAUTH_GOOGLE', 'Admin', 'Active', 'All']
      ]);

      localStorage.setItem('erp_spreadsheet_id', newSpreadsheetId);
      setSpreadsheetId(newSpreadsheetId);
    } catch (err) {
      console.error('Failed to setup ERP:', err);
      alert('Failed to setup ERP. Ensure you have granted Google Sheets permissions.');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  if (isLoading || (user && isAuthorized === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user && isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-sm border border-[#E6E9ED] text-center shadow-sm">
          <h2 className="text-xl font-medium text-[#73879C]">Access Denied</h2>
          <p className="text-[#73879C] text-sm mt-4">
            {authErrorMsg}
          </p>
          <button onClick={handleLogout} className="mt-8 text-sm text-[#73879C] hover:text-[#2A3F54]">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 p-10 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-medium text-[#73879C]">
              <i className="font-black not-italic text-[#73879C] mr-2">FRU</i>
              Management
            </h2>
            <p className="mt-2 text-sm text-[#73879C]">
              Sign in to access the system
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            const username = formData.get('username') as string;
            const password = formData.get('password') as string;

            if (username === 'noor.alam1750@gmail.com' && password === 'Samia@628') {
              setUser({ uid: 'admin-1', email: 'noor.alam1750@gmail.com', displayName: 'Admin' } as any);
              const realToken = localStorage.getItem('erp_real_google_token') || 'mock-token-for-admin';
              setToken(realToken);
              setAccessToken(realToken);
            } else {
              const localUsers = JSON.parse(localStorage.getItem('erp_local_users') || '[]');
              const foundUser = localUsers.find((u: any) => u[0] === username && u[1] === password);
              if (foundUser) {
                if (foundUser[3] !== 'Active') {
                  alert('Your account is inactive. Please contact admin.');
                  return;
                }
                setUser({ uid: 'user-' + Date.now(), email: username, displayName: username.split('@')[0] } as any);
                const realToken = localStorage.getItem('erp_real_google_token') || 'mock-token-for-admin';
                setToken(realToken);
                setAccessToken(realToken);
                // Set access levels properly
                const levels = foundUser[4] ? foundUser[4].split(',').map((s: string) => s.trim()) : [];
                setTimeout(() => {
                  setUserAccessLevels(levels);
                  setIsAuthorized(true); // Authorize them directly since we validated locally
                }, 100);
              } else {
                alert("Invalid username or password.");
              }
            }
          }}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="mb-4">
                <input
                  name="username"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-[#E6E9ED] placeholder-[#73879C] text-[#73879C] rounded-sm focus:outline-none focus:ring-[#1ABB9C] focus:border-[#1ABB9C] sm:text-sm bg-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)]"
                  placeholder="Username or Email"
                />
              </div>
              <div className="mb-4">
                <input
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-[#E6E9ED] placeholder-[#73879C] text-[#73879C] rounded-sm focus:outline-none focus:ring-[#1ABB9C] focus:border-[#1ABB9C] sm:text-sm bg-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)]"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-sm text-white bg-[#337AB7] hover:bg-[#286090] focus:outline-none"
              >
                Log in
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E6E9ED]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#F7F7F7] text-[#73879C]">Or for Admin/Database Setup</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleLogin}
                className="w-full flex justify-center py-3 px-4 border border-[#E6E9ED] rounded-sm shadow-sm text-sm font-medium text-[#73879C] bg-white hover:bg-gray-50 focus:outline-none transition-colors"
              >
                <img className="h-5 w-5 mr-2" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
                Continue with Google (Refresh Token)
              </button>
            </div>
            
            <p className="mt-4 text-xs text-center text-red-500">
              Note: If you cannot add data or export, the database connection has expired. The Admin MUST click "Continue with Google" to refresh it.
            </p>
          </div>
          
          <div className="mt-8 text-sm text-[#73879C] border-t border-[#E6E9ED] pt-6">
            <p>©2026 All Rights Reserved.</p>
            <p>FRU Employee Management System.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!spreadsheetId) {
    if (user.email !== 'noor.alam1750@gmail.com') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8 font-sans">
          <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-sm border border-[#E6E9ED] text-center shadow-sm">
            <h2 className="text-xl font-medium text-[#73879C]">Database Not Configured</h2>
            <p className="text-[#73879C] text-sm mt-4 mb-6">
              The administrator has not configured the global database. 
              <br/><br/>
              Please ask the Administrator (noor.alam1750@gmail.com) to log in and set up the database, and share the Google Sheet ID with you.
            </p>
            <div className="mt-6 border-t border-[#E6E9ED] pt-6">
              <p className="text-[13px] text-[#73879C] mb-2">If you have the database ID, paste it here:</p>
              <input 
                type="text" 
                placeholder="Paste Google Sheet ID here" 
                className="w-full px-3 py-2 border border-[#E6E9ED] rounded-sm mb-2 text-[13px] text-[#73879C] focus:outline-none focus:border-[#1ABB9C]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      localStorage.setItem('erp_spreadsheet_id', val);
                      setSpreadsheetId(val);
                    }
                  }
                }}
              />
            </div>
            
            <button onClick={handleLogout} className="text-[13px] text-[#73879C] hover:text-[#2A3F54] mt-4">
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-sm border border-[#E6E9ED] text-center shadow-sm">
          <h2 className="text-xl font-medium text-[#73879C]">Welcome, Admin</h2>
          <p className="text-[#73879C] text-sm mt-4 mb-6">
            It looks like this is your first time. We need to set up the Google Sheets database for the ERP system.
          </p>
          <button
            onClick={handleSetupERP}
            disabled={isSettingUp}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-sm text-sm font-medium text-white bg-[#26B99A] hover:bg-[#169F85] disabled:opacity-50 transition-colors"
          >
            {isSettingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Database'}
          </button>
          
          <div className="mt-6 border-t border-[#E6E9ED] pt-6">
            <p className="text-[13px] text-[#73879C] mb-2">Or connect to an existing database:</p>
            <input 
              type="text" 
              placeholder="Paste Google Sheet ID here" 
              className="w-full px-3 py-2 border border-[#E6E9ED] rounded-sm mb-2 text-[13px] text-[#73879C] focus:outline-none focus:border-[#1ABB9C]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    localStorage.setItem('erp_spreadsheet_id', val);
                    setSpreadsheetId(val);
                  }
                }
              }}
            />
          </div>
          
          <button onClick={handleLogout} className="text-[13px] text-[#73879C] hover:text-[#2A3F54] mt-4">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <Layout user={user} spreadsheetId={spreadsheetId} onLogout={handleLogout} accessLevels={userAccessLevels} />;
}
