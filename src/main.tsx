import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { AgentProvider } from './state/AgentProvider.tsx';
import { UiStateProvider } from './state/UiStateProvider.tsx';
import { WorkspaceProvider } from './state/WorkspaceProvider.tsx';
import { GuestGoalView } from './features/share/GuestGoalView.tsx';
import { parseShareHash } from './features/share/shareApi.ts';
import './index.css';

// Guest share links (#/share/<token>) bypass the owner app entirely — no
// auth, no providers, just the read-only goal view and its comments.
const shareToken = parseShareHash(window.location.hash);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareToken ? (
      <GuestGoalView token={shareToken} />
    ) : (
      <AuthProvider>
        <UiStateProvider>
          <WorkspaceProvider>
            <AgentProvider>
              <App />
            </AgentProvider>
          </WorkspaceProvider>
        </UiStateProvider>
      </AuthProvider>
    )}
  </StrictMode>,
);
