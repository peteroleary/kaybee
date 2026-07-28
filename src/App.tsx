import { Navbar } from './components/Navbar';
import { BoardCanvas } from './components/BoardCanvas';
import { ActivityDrawer } from './components/ActivityDrawer';
import { ModalHost } from './components/ModalHost';
import { useWorkspace } from './state/WorkspaceProvider';
import { useUiState } from './state/UiStateProvider';
import { useKeyboardShortcuts } from './state/useKeyboardShortcuts';

export default function App() {
  const workspace = useWorkspace();
  const ui = useUiState();

  useKeyboardShortcuts();

  return (
    <div className="relative flex flex-col h-screen w-screen bg-bg-0 font-sans text-fg overflow-hidden select-none">
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        {/* Section 1: Single Master Navbar */}
        <Navbar
          boards={workspace.boards}
          activeBoardId={workspace.activeBoardId}
          onSelectBoard={(id) => workspace.setActiveBoardId(id)}
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
          onOpenGoalCanvas={() => ui.openModal('goalCanvas')}
        />

        {/* Section 2: Main Infinite Board Canvas */}
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
