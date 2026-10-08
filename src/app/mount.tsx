import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../shared/i18n/provider';
import { IdentityProvider } from '../shared/identity/provider';
import { TeamProvider } from '../shared/stadiums/provider';

export function mountPage(
  element: ReactNode,
  options: { teamPicker: boolean } = { teamPicker: false },
) {
  const root = document.getElementById('root');
  if (!root) throw new Error('Page mount is missing');
  const reactRoot = createRoot(root);
  reactRoot.render(
    <StrictMode>
      <IdentityProvider>
        <LanguageProvider>
          <TeamProvider autoPrompt={options.teamPicker}>{element}</TeamProvider>
        </LanguageProvider>
      </IdentityProvider>
    </StrictMode>,
  );
  return () => reactRoot.unmount();
}
