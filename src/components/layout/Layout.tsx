import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { NavigationCard } from './NavigationCard';
import { HeroCard } from './HeroCard';
import { UserAccount } from '../../lib/auth';
import { SettingsAndProfileModal } from './SettingsAndProfileModal';
import { ThemeCustomizerModal } from './ThemeCustomizerModal';
import { getThemeConfig, subscribeTheme, ThemeConfig } from '../../lib/themeManager';
import { SimsimModal } from '../ai/SimsimModal';
import { ProductModal } from '../products/ProductModal';
import { ExpenseModal } from '../treasury/ExpenseModal';
import { CustomerModal } from '../customers/CustomerModal';
import { SupplierModal } from '../suppliers/SupplierModal';
import { NewPurchaseModal } from '../purchases/NewPurchaseModal';
import { storage } from '../../lib/storage';

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
  const [simsimOpen, setSimsimOpen] = useState(false);

  // Quick Action Modals triggered by Simsim
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => getThemeConfig());

  useEffect(() => {
    return subscribeTheme((newCfg) => {
      setThemeConfig({ ...newCfg });
    });
  }, []);

  return (
    <div
      key={`${themeConfig.palette}-${themeConfig.mode}-${themeConfig.font}`}
      className="min-h-screen flex flex-col font-sans w-full overflow-x-hidden transition-colors duration-200"
      style={{
        backgroundColor: 'var(--theme-page-bg, #f8fafc)',
        color: 'var(--theme-text-color, #0f172a)',
      }}
    >
      {/* 1. Header with Brand Logo, Simsim AI Button, and Settings Gear */}
      <Header
        onGoHome={() => onSelectTab('dashboard')}
        currentUser={currentUser}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        onLogout={onLogout}
        onNavigateToTab={onSelectTab}
        onOpenSimsim={() => setSimsimOpen(true)}
      />

      {/* 2. Main Responsive Content Area */}
      <main className="flex-1 p-2.5 sm:p-5 md:p-6 lg:p-8 focus:outline-none w-full">
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

      {/* 5. Simsim AI Interactive Assistant Modal */}
      <SimsimModal
        isOpen={simsimOpen}
        onClose={() => setSimsimOpen(false)}
        onNavigate={(tab) => {
          onSelectTab(tab);
        }}
        onOpenProductModal={() => setProductModalOpen(true)}
        onOpenExpenseModal={() => setExpenseModalOpen(true)}
        onOpenPurchaseModal={() => setPurchaseModalOpen(true)}
        onOpenCustomerModal={() => setCustomerModalOpen(true)}
        onOpenSupplierModal={() => setSupplierModalOpen(true)}
      />

      {/* 6. Quick Action Modals triggered by Simsim */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSaved={() => storage.hydrate()}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={() => storage.hydrate()}
      />

      <NewPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSaved={() => storage.hydrate()}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={() => storage.hydrate()}
      />

      <SupplierModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSaved={() => storage.hydrate()}
      />
    </div>
  );
};
