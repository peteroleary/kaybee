import React, { createContext, useContext } from 'react';
import { AutonomyEngineApi } from '../../lib/autonomy/useRunEngine';
import { DEFAULT_AUTONOMY_POLICY } from '../../lib/autonomy/types';

/** Signed-out / engine-absent fallback: nothing runs, nothing is persisted. */
export const DISABLED_AUTONOMY_API: AutonomyEngineApi = {
  available: false,
  isLeader: false,
  policy: DEFAULT_AUTONOMY_POLICY,
  runs: [],
  runningCount: 0,
  queuedCount: 0,
  blocked: [],
  setAutonomyEnabled: async () => undefined,
  savePolicy: async () => undefined,
  runCardNow: async () => null,
  cancelRun: async () => undefined,
};

const AutonomyContext = createContext<AutonomyEngineApi>(DISABLED_AUTONOMY_API);

/** WorkspaceProvider mounts the engine (useRunEngine) and publishes its API
 *  here so chrome-level UI (AutonomyPill, run console) can read run state
 *  without owning the engine lifecycle. */
export const AutonomyProvider: React.FC<{ api: AutonomyEngineApi; children: React.ReactNode }> = ({
  api,
  children,
}) => {
  return <AutonomyContext.Provider value={api}>{children}</AutonomyContext.Provider>;
};

export function useAutonomy(): AutonomyEngineApi {
  return useContext(AutonomyContext);
}
