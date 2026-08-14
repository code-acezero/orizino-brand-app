"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface UniversalSaveAction {
  id?: string;
  label?: string;
  isSaving?: boolean;
  isDirty?: boolean;
  onSave: () => Promise<any> | void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  onReject?: () => void;
  canReject?: boolean;
}

interface UniversalSaveContextType {
  activeAction: UniversalSaveAction | null;
  registerSaveAction: (action: UniversalSaveAction | null) => void;
  triggerSave: () => void;
  triggerUndo: () => void;
  triggerRedo: () => void;
  triggerReject: () => void;
}

const UniversalSaveContext = createContext<UniversalSaveContextType>({
  activeAction: null,
  registerSaveAction: () => {},
  triggerSave: () => {},
  triggerUndo: () => {},
  triggerRedo: () => {},
  triggerReject: () => {},
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

  const triggerUndo = useCallback(() => {
    if (activeAction?.onUndo && activeAction.canUndo !== false) {
      activeAction.onUndo();
    }
  }, [activeAction]);

  const triggerRedo = useCallback(() => {
    if (activeAction?.onRedo && activeAction.canRedo !== false) {
      activeAction.onRedo();
    }
  }, [activeAction]);

  const triggerReject = useCallback(() => {
    if (activeAction?.onReject && activeAction.canReject !== false) {
      activeAction.onReject();
    }
  }, [activeAction]);

  return (
    <UniversalSaveContext.Provider
      value={{
        activeAction,
        registerSaveAction,
        triggerSave,
        triggerUndo,
        triggerRedo,
        triggerReject,
      }}
    >
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
