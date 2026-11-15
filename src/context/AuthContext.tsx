import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserEntity, RoleEntity } from '@/database/types';
import { authorizationService } from '@/services/auth/AuthorizationService';
import { authService } from '@/services/auth/AuthService';
import { PermissionKey } from '@/types/permissions';

interface AuthContextType {
  currentUser: UserEntity | null;
  currentRole: RoleEntity | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  isLoading: boolean;
  updateSelfProfile: (input: { name: string; username: string }) => Promise<UserEntity>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  currentRole: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  hasPermission: () => false,
  isLoading: false, // Default to false since there's no auto-login
  updateSelfProfile: async () => { throw new Error('Not implemented'); },
  refreshCurrentUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);
  const [currentRole, setCurrentRole] = useState<RoleEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state initially in case authorizationService already has a session
  useEffect(() => {
    setCurrentUser(authorizationService.getCurrentUser());
    setCurrentRole(authorizationService.getCurrentRole());
  }, []);

  const refreshCurrentUser = async () => {
    const user = authorizationService.getCurrentUser();
    if (user) {
      await authorizationService.setCurrentUser(user.id);
      setCurrentUser(authorizationService.getCurrentUser());
      setCurrentRole(authorizationService.getCurrentRole());
    }
  };

  const updateSelfProfile = async (input: { name: string; username: string }): Promise<UserEntity> => {
    if (!currentUser) throw new Error('Pengguna belum masuk');
    const { userService } = await import('@/services/user/UserService');
    const updated = await userService.updateSelfProfile(currentUser.id, input);
    setCurrentUser(updated);
    return updated;
  };

  const login = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const user = await authService.authenticateWithPin(pin);
      if (user) {
        setCurrentUser(authorizationService.getCurrentUser());
        setCurrentRole(authorizationService.getCurrentRole());
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentRole(null);
  };

  const hasPermission = (permission: PermissionKey) => {
    return authorizationService.hasPermission(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isAuthenticated: !!currentUser,
        login,
        logout,
        hasPermission,
        isLoading,
        updateSelfProfile,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
