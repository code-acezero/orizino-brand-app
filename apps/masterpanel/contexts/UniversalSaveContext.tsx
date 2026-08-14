"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface UniversalSaveAction {
  id?: string;
  label?: string;
  isSaving?: boolean;
  isDirty?: boolean;
  onSave: () => Promise<any> | void;
}

interface UniversalSaveContextType {
  activeAction: UniversalSaveAction | null;
  registerSaveAction: (action: UniversalSaveAction | null) => void;
  triggerSave: () => void;
}

const UniversalSaveContext = createContext<UniversalSaveContextType>({
  activeAction: null,
  registerSaveAction: () => {},
  triggerSave: () => {},
});

export const UniversalSaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAction, setActiveAction] = useState<UniversalSaveAction | null>(null);

  const registerSaveAction = useCallback((action: UniversalSaveAction | null) => {
    setActiveAction(action);
  }, []);

  const triggerSave = useCallback(() => {
    if (activeAction?.onSave && !activeAction.isSaving) {
      activeAction.onSave();
    }
  }, [activeAction]);

  return (
    <UniversalSaveContext.Provider value={{ activeAction, registerSaveAction, triggerSave }}>
      {children}
    </UniversalSaveContext.Provider>
  );
};

export const useUniversalSave = () => useContext(UniversalSaveContext);

/**
 * Convenient hook for any page, tab, or component to register its save action with the universal floating save button.
 */
export function useRegisterUniversalSave(
  action: UniversalSaveAction | null,
  deps: any[] = []
) {
  const { registerSaveAction } = useUniversalSave();

  useEffect(() => {
    if (action) {
      registerSaveAction(action);
    } else {
      registerSaveAction(null);
    }
    return () => {
      registerSaveAction(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
