import React, { createContext, useContext } from 'react';
import { useOrchestratorState, type OrchestratorApi } from './useOrchestrator';

const OrchestratorContext = createContext<OrchestratorApi | null>(null);

/**
 * Single shared orchestrator instance mounted at the App level — the dock,
 * GoalHome, and any future surface must observe the same threads, the same
 * active thread, and the same in-flight turn (a second useOrchestratorState
 * instance would have its own selection state and double-send).
 */
export const OrchestratorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useOrchestratorState();
  return <OrchestratorContext.Provider value={value}>{children}</OrchestratorContext.Provider>;
};

export function useOrchestrator(): OrchestratorApi {
  const ctx = useContext(OrchestratorContext);
  if (!ctx) throw new Error('useOrchestrator must be used within OrchestratorProvider');
  return ctx;
}
