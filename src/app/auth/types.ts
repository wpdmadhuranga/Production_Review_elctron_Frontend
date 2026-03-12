export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (token: string) => void;
  signOut: () => void;
}
