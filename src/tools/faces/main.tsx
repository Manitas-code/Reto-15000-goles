import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { bootFaces } from '../../shared/browser/faces';
import { App } from './App';
bootFaces();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
