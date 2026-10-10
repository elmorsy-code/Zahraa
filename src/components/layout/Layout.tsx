import React, { useState } from 'react';
import { Header } from './Header';
import { NavigationCard } from './NavigationCard';
import { HeroCard } from './HeroCard';
import { UserAccount } from '../../lib/auth';
import { SettingsAndProfileModal } from './SettingsAndProfileModal';
import { ThemeCustomizerModal } from './ThemeCustomizerModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenPos: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
  onUserUpdated?: (user: UserAccount) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  onOpenPos,
  currentUser,
  onLogout,
  onUserUpdated,
}) => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col font-sans w-full overflow-x-hidden transition-colors duration-200"
      style={{
        backgroundColor: 'var(--theme-page-bg, #f8fafc)',
        color: 'var(--theme-text-color, #0f172a)',
      }}
    >
      {/* 1. Clean Header: ONLY Brand Logo (Centered) and Settings Gear (Far-left) */}
      <Header
        onGoHome={() => onSelectTab('dashboard')}
        currentUser={currentUser}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        onLogout={onLogout}
        onNavigateToTab={onSelectTab}
      />

      {/* 2. Main Responsive Content Area */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 focus:outline-none w-full">
        <div className="max-w-[1920px] mx-auto w-full">
          {/* Master Hero Card on dashboard view (above department cards) */}
          {activeTab === 'dashboard' && (
            <HeroCard
              onOpenPos={onOpenPos}
              onNavigate={onSelectTab}
              currentUser={currentUser}
            />
          )}

          {/* Distinctive Department Cards Navigation (Placed right under the hero) */}
          <NavigationCard
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            onOpenPos={onOpenPos}
            currentUser={currentUser}
            onLogout={onLogout}
          />

          {/* Page Body Content */}
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* 3. Global Settings & Profile Modal (Triggered by the Header Gear Icon) */}
      <SettingsAndProfileModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentUser={currentUser}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        onNavigateToTab={(tab) => {
          onSelectTab(tab);
          setSettingsModalOpen(false);
        }}
        onUserUpdated={onUserUpdated}
      />

      {/* 4. Global Theme & Fonts Customizer Modal */}
      <ThemeCustomizerModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </div>
  );
};
