import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { UiStateProvider } from './state/UiStateProvider.tsx';
import { WorkspaceProvider } from './state/WorkspaceProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <UiStateProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </UiStateProvider>
    </AuthProvider>
  </StrictMode>,
);
