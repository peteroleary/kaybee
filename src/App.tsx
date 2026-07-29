import { useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BoardCanvas } from './components/BoardCanvas';
import { ActivityDrawer } from './components/ActivityDrawer';
import { ModalHost } from './components/ModalHost';
import { GoalHome } from './features/goals/GoalHome';
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

  return (
    <div className="relative flex flex-col h-screen w-screen bg-bg-0 font-sans text-fg overflow-hidden select-none">
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        {/* Section 1: Single Master Navbar */}
        <Navbar
          boards={workspace.boards}
          activeBoardId={workspace.activeBoardId}
          onSelectBoard={(id) => {
            workspace.setActiveBoardId(id);
            ui.setAppMode('board');
          }}
          onOpenOrchestrator={() => ui.openModal('orchestrator')}
          onOpenInterconnect={() => ui.openModal('interconnect')}
          onOpenNewBoard={() => ui.openModal('newBoard')}
          onOpenSearch={() => ui.openModal('search')}
          onOpenTemplates={() => ui.openModal('boardTemplate')}
          onOpenSaveTemplate={() => ui.openModal('saveTemplate')}
          onOpenVoice={() => ui.openModal('voice')}
          onOpenAnalytics={() => ui.openModal('analytics')}
          onOpenOverviewMap={() => ui.openModal('overviewMap')}
          onExportBoardImage={workspace.handleExportBoardImage}
          smartFilterActive={ui.smartFilterActive}
          onToggleSmartFilter={ui.toggleSmartFilter}
          isHeatmapActive={ui.isHeatmapActive}
          onToggleHeatmap={ui.toggleHeatmap}
          onOpenThemeModal={() => ui.openModal('theme')}
          onOpenAutoArchiveModal={() => ui.openModal('autoArchive')}
          onAddList={() => workspace.handleAddList('right')}
          selectedTagFilter={ui.selectedTagFilter}
          onSelectTagFilter={(tag) => ui.setSelectedTagFilter(tag)}
          onOpenTagManagerModal={() => ui.openModal('tagManager')}
          currentRole={workspace.currentRole}
          onChangeRole={(role) => workspace.setCurrentRole(role)}
          zoomLevel={ui.zoomLevel}
          onChangeZoom={(delta) => ui.changeZoom(delta)}
          onResetPan={() => ui.resetZoom()}
          onToggleActivity={() => ui.toggleActivity()}
          activityCount={workspace.activities.length}
          onOpenGoalCanvas={() => ui.setAppMode('home')}
          onOpenAgentRegistry={() => ui.openModal('agentRegistry')}
        />

        {/* Section 2: picks one of two surfaces — the goal-first home (no
            goals yet, or the user asked for it via the Goals button) or the
            board canvas. No router: this is the entire "navigation". */}
        {ui.appMode === 'home' ? (
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
      </div>

      <ModalHost />

      {/* Activity Drawer */}
      <ActivityDrawer
        isOpen={ui.activityOpen}
        onClose={ui.toggleActivity}
        activities={workspace.activities}
      />
    </div>
  );
}
