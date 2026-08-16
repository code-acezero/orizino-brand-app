"use client";
import React, { createContext, useContext, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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

let currentAction: UniversalSaveAction | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function registerSaveActionGlobal(action: UniversalSaveAction | null) {
  if (currentAction === action) return;
  if (!currentAction && !action) return;

  if (
    currentAction &&
    action &&
    currentAction.id === action.id &&
    currentAction.label === action.label &&
    currentAction.isSaving === action.isSaving &&
    currentAction.isDirty === action.isDirty &&
    currentAction.canUndo === action.canUndo &&
    currentAction.canRedo === action.canRedo &&
    currentAction.canReject === action.canReject &&
    currentAction.onSave === action.onSave &&
    currentAction.onUndo === action.onUndo &&
    currentAction.onRedo === action.onRedo &&
    currentAction.onReject === action.onReject
  ) {
    currentAction = action;
    return;
  }

  currentAction = action;
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return currentAction;
}

export const UniversalSaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export function useUniversalSave() {
  const activeAction = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const triggerSave = useCallback(() => {
    if (currentAction?.onSave && !currentAction.isSaving) {
      currentAction.onSave();
    }
  }, []);

  const triggerUndo = useCallback(() => {
    if (currentAction?.onUndo && currentAction.canUndo !== false) {
      currentAction.onUndo();
    }
  }, []);

  const triggerRedo = useCallback(() => {
    if (currentAction?.onRedo && currentAction.canRedo !== false) {
      currentAction.onRedo();
    }
  }, []);

  const triggerReject = useCallback(() => {
    if (currentAction?.onReject && currentAction.canReject !== false) {
      currentAction.onReject();
    }
  }, []);

  return {
    activeAction,
    registerSaveAction: registerSaveActionGlobal,
    triggerSave,
    triggerUndo,
    triggerRedo,
    triggerReject,
  };
}

/**
 * Convenient hook for any page, tab, or component to register its save action with the universal floating save button.
 */
export function useRegisterUniversalSave(
  action: UniversalSaveAction | null,
  _deps?: any[]
) {
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    registerSaveActionGlobal(actionRef.current);
  });

  useEffect(() => {
    return () => {
      if (currentAction === actionRef.current) {
        registerSaveActionGlobal(null);
      }
    };
  }, []);
}

/**
 * Generic undo/redo state management hook that effortlessly powers Universal Save undo, redo, and reject actions.
 */
export function useUndoRedoState<T>(
  initialState: T | (() => T),
  options: { maxHistory?: number } = {}
) {
  const maxHistory = options.maxHistory ?? 50;

  const [state, _setState] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const initialSavedRef = useRef<T>(
    typeof initialState === "function" ? (initialState as () => T)() : initialState
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const pastRef = useRef(past);
  pastRef.current = past;

  const futureRef = useRef(future);
  futureRef.current = future;

  const setInitial = useCallback((newInitial: T | ((prev: T) => T)) => {
    const resolved =
      typeof newInitial === "function"
        ? (newInitial as (prev: T) => T)(stateRef.current)
        : newInitial;
    initialSavedRef.current = resolved;
    stateRef.current = resolved;
    _setState(resolved);
    setPast([]);
    setFuture([]);
  }, []);

  const setState = useCallback(
    (action: React.SetStateAction<T>) => {
      const current = stateRef.current;
      const next =
        typeof action === "function"
          ? (action as (prev: T) => T)(current)
          : action;

      try {
        if (JSON.stringify(current) === JSON.stringify(next)) {
          return;
        }
      } catch {
        if (current === next) return;
      }

      setPast((prevPast) => {
        const updated = [...prevPast, current];
        if (updated.length > maxHistory) {
          return updated.slice(updated.length - maxHistory);
        }
        return updated;
      });

      setFuture([]);
      stateRef.current = next;
      _setState(next);
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    const currentPast = pastRef.current;
    if (currentPast.length === 0) return;

    const previous = currentPast[currentPast.length - 1];
    const newPast = currentPast.slice(0, -1);
    const current = stateRef.current;

    setPast(newPast);
    setFuture((prevFuture) => [current, ...prevFuture]);
    stateRef.current = previous;
    _setState(previous);
  }, []);

  const redo = useCallback(() => {
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return;

    const next = currentFuture[0];
    const newFuture = currentFuture.slice(1);
    const current = stateRef.current;

    setFuture(newFuture);
    setPast((prevPast) => [...prevPast, current]);
    stateRef.current = next;
    _setState(next);
  }, []);

  const reject = useCallback(() => {
    const initial = initialSavedRef.current;
    stateRef.current = initial;
    _setState(initial);
    setPast([]);
    setFuture([]);
  }, []);

  const isDirty = React.useMemo(() => {
    try {
      return JSON.stringify(state) !== JSON.stringify(initialSavedRef.current);
    } catch {
      return past.length > 0;
    }
  }, [state, past.length]);

  return [
    state,
    setState,
    {
      undo,
      redo,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      reject,
      canReject: isDirty || past.length > 0,
      setInitial,
      reset: reject,
      pastCount: past.length,
      futureCount: future.length,
      isDirty,
    },
  ] as const;
}

