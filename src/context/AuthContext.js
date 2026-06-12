import { createContext, useContext, useEffect, useState } from 'react';
import { Storage } from '../api/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // undefined = still initialising, null = logged out, string = logged in
  const [userToken, setUserToken] = useState(undefined);
  const [user,      setUser]      = useState(null);

  // ── Rehydrate token on app start ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await Storage.getItem('userToken');
        setUserToken(token ?? null);
      } catch {
        setUserToken(null);
      }
    })();
  }, []);

  const login = async (token, userData = null) => {
    await Storage.setItem('userToken', token);
    setUserToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await Storage.removeItem('userToken');
    await Storage.removeItem('userData');
    setUserToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      userToken,
      user,
      setUser,
      login,
      logout,
      isLoggedIn:      !!userToken,
      isLoading:  userToken === undefined, // ← renamed to match _layout.jsx
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);