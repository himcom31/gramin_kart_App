import { createContext, useContext, useState } from 'react';
import { Storage } from '../api/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // undefined = still initialising, null = logged out, string = logged in
  const [userToken, setUserToken] = useState(() => Storage.getItem('userToken') ?? null);
  const [user,      setUser]      = useState(null);

  const login = (token, userData = null) => {
    Storage.setItem('userToken', token);
    setUserToken(token);
    setUser(userData);
  };

  const logout = () => {
    // Clear every key you ever write on login
    Storage.removeItem('userToken');
    Storage.removeItem('userData');
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
      isLoggedIn: !!userToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);