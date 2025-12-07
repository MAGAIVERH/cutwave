"use client";

import { createContext, useContext, useState } from "react";

type AuthUIContextType = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  openAuthSheet: () => void;
  closeAuthSheet: () => void;
};

const AuthUIContext = createContext<AuthUIContextType | null>(null);

export function AuthUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AuthUIContext.Provider
      value={{
        isOpen,
        setOpen: setIsOpen,
        openAuthSheet: () => setIsOpen(true),
        closeAuthSheet: () => setIsOpen(false),
      }}
    >
      {children}
    </AuthUIContext.Provider>
  );
}

export function useAuthUI() {
  const ctx = useContext(AuthUIContext);
  if (!ctx) {
    throw new Error("useAuthUI must be used within AuthUIProvider");
  }
  return ctx;
}
