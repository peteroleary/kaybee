import { useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BoardToolbar } from './components/BoardToolbar';
import { BoardCanvas } from './components/BoardCanvas';
import { ActivityDrawer } from './components/ActivityDrawer';
import { ModalHost } from './components/ModalHost';
import { GoalHome } from './features/goals/GoalHome';
import { OrchestratorDock } from './features/orchestrator/OrchestratorDock';
import { OrchestratorProvider } from './features/orchestrator/OrchestratorProvider';
import { useWorkspace } from './state/WorkspaceProvider';
import { useUiState } from './state/UiStateProvider';
import { useKeyboardShortcuts } from './state/useKeyboardShortcuts';

export default function App() {
  const workspace = useWorkspace();
  const ui = useUiState();

  useKeyboardShortcuts();

  // Default to the goal-first home surface once we know (goalsLoaded) the
  // user has zero goals — but only ever apply this once, so it doesn't yank
  // an active user back to /home the moment their last goal is deleted.
  const homeDefaultApplied = useRef(false);
  useEffect(() => {
    if (homeDefaultApplied.current || !workspace.goalsLoaded) return;
    homeDefaultApplied.current = true;
    if (workspace.goals.length === 0) ui.setAppMode('home');
  }, [workspace.goalsLoaded, workspace.goals, ui]);

  const boardVisible = ui.appMode === 'board' && !!workspace.activeBoard;

  return (
    <OrchestratorProvider>
      <div className="relative flex flex-col h-screen w-screen bg-bg-0 font-sans text-fg overflow-hidden select-none">
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        {/* Section 1: Global navbar — navigation + the agents-finish-goals
            loop. Board-scoped actions live in the toolbar below, which only
            exists while a board is visible. */}
        <Navbar
          boards={workspace.boards}
          activeBoardId={workspace.activeBoardId}
          onSelectBoard={(id) => {
            workspace.setActiveBoardId(id);
            ui.setAppMode('board');
          }}
          onOpenOrchestrator={ui.toggleDock}
          onOpenNewBoard={() => ui.openModal('newBoard')}
          onOpenSearch={() => ui.openModal('search')}
          onToggleActivity={() => ui.toggleActivity()}
          activityCount={workspace.activities.length}
          onOpenGoalCanvas={() => ui.setAppMode('home')}
          onOpenAgentRegistry={() => ui.openModal('agentRegistry')}
        />

        {/* Section 1b: board-context toolbar — only while a board is on
            screen, so the goal-first home stays clean. */}
        {boardVisible && (
          <BoardToolbar
            onAddList={() => workspace.handleAddList('right')}
            isHeatmapActive={ui.isHeatmapActive}
            onToggleHeatmap={ui.toggleHeatmap}
            smartFilterActive={ui.smartFilterActive}
            onToggleSmartFilter={ui.toggleSmartFilter}
            selectedTagFilter={ui.selectedTagFilter}
            onOpenTagManagerModal={() => ui.openModal('tagManager')}
            onOpenOverviewMap={() => ui.openModal('overviewMap')}
            onOpenInterconnect={() => ui.openModal('interconnect')}
            onOpenAnalytics={() => ui.openModal('analytics')}
            onOpenVoice={() => ui.openModal('voice')}
            onOpenThemeModal={() => ui.openModal('theme')}
            onOpenAutoArchiveModal={() => ui.openModal('autoArchive')}
            onOpenTemplates={() => ui.openModal('boardTemplate')}
            onOpenSaveTemplate={() => ui.openModal('saveTemplate')}
            onExportBoardImage={workspace.handleExportBoardImage}
            zoomLevel={ui.zoomLevel}
            onChangeZoom={(delta) => ui.changeZoom(delta)}
            onResetPan={() => ui.resetZoom()}
            currentRole={workspace.currentRole}
            onChangeRole={(role) => workspace.setCurrentRole(role)}
          />
        )}

        {/* Section 2: picks one of two surfaces — the goal-first home (no
            goals yet, no boards yet, or the user asked for it via the Goals
            button) or the board canvas — with the Orchestrator dock railed to
            the right of either. No router: this is the entire "navigation". */}
        <div className="flex flex-1 overflow-hidden">
          {!boardVisible ? (
            <GoalHome />
          ) : (
            <BoardCanvas
              board={workspace.activeBoard}
              onUpdateCardWidget={workspace.handleUpdateCardWidget}
              onOpenCardDetail={(card) => ui.openModal('cardDetail', card)}
              onRunAgentTask={workspace.handleRunAgentTask}
              onToggleTwoColumns={workspace.handleToggleTwoColumns}
              onResizeListWidth={workspace.handleResizeListWidth}
              onAddCard={workspace.handleAddCard}
              onSendChatMessage={workspace.handleSendChatMessage}
              onOpenListSettings={(list) => ui.openModal('listSettings', list)}
              onDeleteList={workspace.handleDeleteList}
              onDeleteCard={workspace.handleDeleteCard}
              onAddList={workspace.handleAddList}
              onMoveCard={workspace.handleMoveCard}
              onOpenVoiceModal={() => ui.openModal('voice')}
              onOpenAnalyticsModal={() => ui.openModal('analytics')}
              onOpenThemeModal={() => ui.openModal('theme')}
              onOpenAutoArchiveModal={() => ui.openModal('autoArchive')}
              smartFilterActive={ui.smartFilterActive}
              isHeatmapActive={ui.isHeatmapActive}
              selectedTagFilter={ui.selectedTagFilter}
              onSelectTagFilter={(tag) => ui.setSelectedTagFilter(tag)}
              currentRole={workspace.currentRole}
              zoomLevel={ui.zoomLevel}
              onUpdateCard={workspace.handleUpdateCard}
            />
          )}

          <OrchestratorDock />
        </div>
      </div>

      <ModalHost />

      {/* Activity Drawer */}
      <ActivityDrawer
        isOpen={ui.activityOpen}
        onClose={ui.toggleActivity}
        activities={workspace.activities}
      />
      </div>
    </OrchestratorProvider>
  );
}
