import { CardItemData, ListConfig } from '../types';
import { useWorkspace } from '../state/WorkspaceProvider';
import { useUiState } from '../state/UiStateProvider';
import { CardDetailModal } from './CardDetailModal';
import { ListSettingsModal } from './ListSettingsModal';
import { BoardInterconnectModal } from './BoardInterconnectModal';
import { BoardTemplateModal } from './BoardTemplateModal';
import { CreateCardModal } from './CreateCardModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AnalyticsDashboardModal } from './AnalyticsDashboardModal';
import { VoiceActionModal } from './VoiceActionModal';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { AutoArchiveModal } from './AutoArchiveModal';
import { OverviewMapModal } from './OverviewMapModal';
import { TagManagerModal } from './TagManagerModal';
import { SaveTemplateModal } from './SaveTemplateModal';
import { NewBoardModal } from './NewBoardModal';
import { AgentRegistryModal } from '../features/agents/AgentRegistryModal';

export function ModalHost() {
  const workspace = useWorkspace();
  const ui = useUiState();
  const {
    boards,
    activeBoard,
    activeBoardId,
    customTemplates,
    customTagColors,
    handleSelectBoardTemplate,
    handleSaveTemplate,
    handleCreateCardWithData,
    handleSelectSearchResult,
    handleExecuteVoiceCommand,
    handleSelectBoardTheme,
    handleRunAutoArchive,
    handleRenameTag,
    handleDeleteTag,
    handleUpdateTagColor,
    handleUpdateCard,
    handleDeleteCard,
    handleRunAgentTask,
    handleUpdateList,
    handleAddConnection,
    handleRemoveConnection,
    handleCreateBoard,
  } = workspace;

  return (
    <>
      {/* Board Template Library Modal */}
      <BoardTemplateModal
        isOpen={ui.isOpen('boardTemplate')}
        onClose={() => ui.closeModal('boardTemplate')}
        onSelectTemplate={handleSelectBoardTemplate}
        activeBoardName={activeBoard?.name ?? ''}
        customTemplates={customTemplates}
        onOpenSaveTemplateModal={() => ui.openModal('saveTemplate')}
      />

      {/* Save Active Board as Template Modal — needs a real board */}
      {activeBoard && (
        <SaveTemplateModal
          isOpen={ui.isOpen('saveTemplate')}
          onClose={() => ui.closeModal('saveTemplate')}
          activeBoard={activeBoard}
          onSaveTemplate={handleSaveTemplate}
        />
      )}

      {/* Template-based Card Creation Modal — needs a real board */}
      {activeBoard && (
        <CreateCardModal
          isOpen={ui.isOpen('createCard')}
          onClose={() => ui.closeModal('createCard')}
          lists={activeBoard.lists}
          defaultListId={ui.modalPayload<string | null>('createCard') || undefined}
          onCreateCard={handleCreateCardWithData}
        />
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={ui.isOpen('search')}
        onClose={() => ui.closeModal('search')}
        boards={boards}
        onSelectSearchResult={handleSelectSearchResult}
      />

      {/* Analytics Dashboard Recharts Overlay */}
      <AnalyticsDashboardModal
        isOpen={ui.isOpen('analytics')}
        onClose={() => ui.closeModal('analytics')}
        boards={boards}
        activeBoardId={activeBoardId}
      />

      {/* Voice-to-Action Listener Modal */}
      <VoiceActionModal
        isOpen={ui.isOpen('voice')}
        onClose={() => ui.closeModal('voice')}
        onExecuteVoiceCommand={handleExecuteVoiceCommand}
      />

      {/* Board Theme & Background Selector Modal — needs a real board */}
      {activeBoard && (
        <ThemeSelectorModal
          isOpen={ui.isOpen('theme')}
          onClose={() => ui.closeModal('theme')}
          currentThemeId={activeBoard.theme || 'indigo-nebula'}
          onSelectTheme={handleSelectBoardTheme}
          boardName={activeBoard.name}
        />
      )}

      {/* Auto-Archive Routine Modal — needs a real board */}
      {activeBoard && (
        <AutoArchiveModal
          isOpen={ui.isOpen('autoArchive')}
          onClose={() => ui.closeModal('autoArchive')}
          board={activeBoard}
          onRunAutoArchive={handleRunAutoArchive}
        />
      )}

      {/* Overview Map & Dependency Graph Modal */}
      <OverviewMapModal
        isOpen={ui.isOpen('overviewMap')}
        onClose={() => ui.closeModal('overviewMap')}
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectCard={(card) => {
          ui.openModal('cardDetail', card);
          ui.closeModal('overviewMap');
        }}
      />

      {/* Global Tag Manager & Hashtag Filters Modal */}
      <TagManagerModal
        isOpen={ui.isOpen('tagManager')}
        onClose={() => ui.closeModal('tagManager')}
        boards={boards}
        selectedTagFilter={ui.selectedTagFilter}
        onSelectTagFilter={(tag) => ui.setSelectedTagFilter(tag)}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
        customTagColors={customTagColors}
        onUpdateTagColor={handleUpdateTagColor}
      />

      {/* Card Detail Modal */}
      <CardDetailModal
        card={ui.modalPayload<CardItemData>('cardDetail')}
        isOpen={ui.isOpen('cardDetail')}
        onClose={() => ui.closeModal('cardDetail')}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onRunAgentTask={handleRunAgentTask}
        availableBoards={boards}
      />

      {/* List Settings Modal */}
      <ListSettingsModal
        list={ui.modalPayload<ListConfig>('listSettings')}
        isOpen={ui.isOpen('listSettings')}
        onClose={() => ui.closeModal('listSettings')}
        onUpdateList={handleUpdateList}
        availableBoards={boards}
      />

      {/* Board Interconnectivity Modal */}
      <BoardInterconnectModal
        isOpen={ui.isOpen('interconnect')}
        onClose={() => ui.closeModal('interconnect')}
        boards={boards}
        onAddConnection={handleAddConnection}
        onRemoveConnection={handleRemoveConnection}
      />

      {/* New Board Creation Modal */}
      <NewBoardModal
        isOpen={ui.isOpen('newBoard')}
        onClose={() => ui.closeModal('newBoard')}
        onCreateBoard={(name, category) => {
          handleCreateBoard(name, category);
          ui.closeModal('newBoard');
        }}
      />

      {/* Agent Registry Modal */}
      <AgentRegistryModal isOpen={ui.isOpen('agentRegistry')} onClose={() => ui.closeModal('agentRegistry')} />
    </>
  );
}
