import React, { createContext, useCallback, useContext, useReducer, useState } from 'react';

export type ModalName =
  | 'interconnect'
  | 'boardTemplate'
  | 'createCard'
  | 'search'
  | 'analytics'
  | 'voice'
  | 'theme'
  | 'autoArchive'
  | 'overviewMap'
  | 'tagManager'
  | 'saveTemplate'
  | 'newBoard'
  | 'cardDetail'
  | 'listSettings'
  | 'agentRegistry';

const MODAL_NAMES: ModalName[] = [
  'interconnect',
  'boardTemplate',
  'createCard',
  'search',
  'analytics',
  'voice',
  'theme',
  'autoArchive',
  'overviewMap',
  'tagManager',
  'saveTemplate',
  'newBoard',
  'cardDetail',
  'listSettings',
  'agentRegistry',
];

interface ModalState {
  open: Record<ModalName, boolean>;
  payload: Partial<Record<ModalName, unknown>>;
}

type ModalAction =
  | { type: 'OPEN'; name: ModalName; hasPayload: boolean; payload?: unknown }
  | { type: 'CLOSE'; name: ModalName };

function createInitialModalState(): ModalState {
  const open = {} as Record<ModalName, boolean>;
  MODAL_NAMES.forEach(name => {
    open[name] = false;
  });
  return { open, payload: {} };
}

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN':
      return {
        open: { ...state.open, [action.name]: true },
        payload: action.hasPayload ? { ...state.payload, [action.name]: action.payload } : state.payload,
      };
    case 'CLOSE':
      return {
        open: { ...state.open, [action.name]: false },
        payload: { ...state.payload, [action.name]: null },
      };
    default:
      return state;
  }
}

export interface UiApi {
  openModal(name: ModalName, ...payloadArgs: [unknown?]): void;
  closeModal(name: ModalName): void;
  isOpen(name: ModalName): boolean;
  modalPayload<T>(name: ModalName): T | null;
  activityOpen: boolean;
  toggleActivity(): void;
  zoomLevel: number;
  changeZoom(delta: number): void;
  resetZoom(): void;
  smartFilterActive: boolean;
  toggleSmartFilter(): void;
  isHeatmapActive: boolean;
  toggleHeatmap(): void;
  selectedTagFilter: string | null;
  setSelectedTagFilter(t: string | null): void;
  appMode: 'home' | 'board';
  setAppMode(m: 'home' | 'board'): void;
  /** Orchestrator dock (right rail) visibility — replaces the old 'orchestrator' modal. */
  dockOpen: boolean;
  setDockOpen(open: boolean): void;
  toggleDock(): void;
}

const UiStateContext = createContext<UiApi | null>(null);

export const UiStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, dispatch] = useReducer(modalReducer, undefined, createInitialModalState);
  const [activityOpen, setActivityOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [smartFilterActive, setSmartFilterActive] = useState(false);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<'home' | 'board'>('board');
  const [dockOpen, setDockOpen] = useState(false);

  const openModal = useCallback((name: ModalName, ...payloadArgs: [unknown?]) => {
    dispatch({ type: 'OPEN', name, hasPayload: payloadArgs.length > 0, payload: payloadArgs[0] });
  }, []);

  const closeModal = useCallback((name: ModalName) => {
    dispatch({ type: 'CLOSE', name });
  }, []);

  const isOpen = useCallback((name: ModalName) => modalState.open[name], [modalState]);

  const modalPayload = useCallback(
    <T,>(name: ModalName): T | null => (modalState.payload[name] ?? null) as T | null,
    [modalState]
  );

  const toggleActivity = useCallback(() => setActivityOpen(prev => !prev), []);

  const changeZoom = useCallback((delta: number) => {
    setZoomLevel(prev => Math.min(1.25, Math.max(0.75, prev + delta)));
  }, []);

  const resetZoom = useCallback(() => setZoomLevel(1.0), []);

  const toggleSmartFilter = useCallback(() => setSmartFilterActive(prev => !prev), []);
  const toggleHeatmap = useCallback(() => setIsHeatmapActive(prev => !prev), []);
  const toggleDock = useCallback(() => setDockOpen(prev => !prev), []);

  const value: UiApi = {
    openModal,
    closeModal,
    isOpen,
    modalPayload,
    activityOpen,
    toggleActivity,
    zoomLevel,
    changeZoom,
    resetZoom,
    smartFilterActive,
    toggleSmartFilter,
    isHeatmapActive,
    toggleHeatmap,
    selectedTagFilter,
    setSelectedTagFilter,
    appMode,
    setAppMode,
    dockOpen,
    setDockOpen,
    toggleDock,
  };

  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
};

export function useUiState(): UiApi {
  const ctx = useContext(UiStateContext);
  if (!ctx) throw new Error('useUiState must be used within UiStateProvider');
  return ctx;
}
