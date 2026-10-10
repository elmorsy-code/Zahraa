import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { LoginScreen } from './components/auth/LoginScreen';
import { SupabaseConfigScreen } from './components/auth/SupabaseConfigScreen';
import { InitialAdminSetupScreen } from './components/auth/InitialAdminSetupScreen';
import { authService, UserAccount } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase';
import { storage } from './lib/storage';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { PosScreen } from './components/pos/PosScreen';
import { SalesInvoicesList } from './components/sales/SalesInvoicesList';
import { CustomersList } from './components/customers/CustomersList';
import { CustomerAccountsReport } from './components/customers/CustomerAccountsReport';
import { PurchaseInvoicesList } from './components/purchases/PurchaseInvoicesList';
import { SuppliersList } from './components/suppliers/SuppliersList';
import { WarehousesStock } from './components/inventory/WarehousesStock';
import { StockMovementsList } from './components/inventory/StockMovementsList';
import { ProductsList } from './components/products/ProductsList';
import { TreasuryScreen } from './components/treasury/TreasuryScreen';
import { OldLedgersScreen } from './components/old_ledgers/OldLedgersScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { UsersPermissionsScreen } from './components/users/UsersPermissionsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

export default function App() {
  const [isConfigured, setIsConfigured] = useState<boolean>(() => isSupabaseConfigured());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribeAuth = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      if (user) {
        storage.hydrate();
      }
    });

    initApp();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const initApp = async () => {
    setIsCheckingAuth(true);
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setIsCheckingAuth(false);
      return;
    }

    try {
      const user = await authService.initSession();
      setCurrentUser(user);

      if (user) {
        await storage.hydrate();
      } else {
        const usersExist = await authService.checkHasAnyUsers();
        setHasUsers(usersExist);
      }
    } catch (err) {
      console.warn('Initialization error:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleRetryConfig = () => {
    initApp();
  };

  // 1. If Supabase is not configured (missing env vars)
  if (!isConfigured) {
    return <SupabaseConfigScreen onRetry={handleRetryConfig} />;
  }

  // 2. Loading state while checking auth session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white font-sans gap-3">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <span className="text-base font-bold text-slate-300">جارٍ التحقق من الاتصال والمصادقة...</span>
      </div>
    );
  }

  // 3. If not logged in, render real Supabase Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          storage.hydrate();
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // Handle logout
  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  // Check role-based permission for requested tab
  const isAllowed = authService.canAccessTab(activeTab, currentUser.role);

  const renderContent = () => {
    if (!isAllowed) {
      return (
        <div className="card-box p-8 sm:p-12 border-2 border-rose-300 bg-white text-center space-y-6 max-w-2xl mx-auto my-8 shadow-md">
          <div className="flex justify-center">
            <div className="p-4 bg-rose-100 text-rose-700 rounded-3xl">
              <ShieldAlert className="w-12 h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              عفواً، هذه الشاشة غير مصرح بها لحسابك
            </h2>
            <p className="text-base font-bold text-slate-600">
              أنت مسجل حالياً بدور: <span className="text-rose-700 font-black">{currentUser.roleNameAr}</span>. لا يمتلك هذا الدور صلاحية الوصول إلى هذه الصفحة.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base cursor-pointer shadow-xs"
            >
              <span>العودة للوحة المؤشرات الرئيسية</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            onNavigate={(tab) => {
              if (authService.canAccessTab(tab, currentUser.role)) {
                setActiveTab(tab);
              } else {
                setActiveTab(tab);
              }
            }}
            onOpenPos={() => {
              if (authService.canAccessTab('pos', currentUser.role)) {
                setActiveTab('pos');
              }
            }}
          />
        );

      case 'pos':
        return <PosScreen />;

      case 'sales':
        return <SalesInvoicesList />;

      case 'customers':
        return <CustomersList initialOpenLedger={false} />;

      case 'customer_ledgers':
        return <CustomerAccountsReport />;

      case 'purchases':
        return <PurchaseInvoicesList />;

      case 'suppliers':
        return <SuppliersList />;

      case 'warehouse_main':
        return <WarehousesStock initialLocationType="warehouse" />;

      case 'warehouse_shop':
        return <WarehousesStock initialLocationType="shop" />;

      case 'transfers':
        return <WarehousesStock initialLocationType="warehouse" />;

      case 'products':
        return <ProductsList />;

      case 'stock_movements':
        return <StockMovementsList />;

      case 'treasury':
      case 'payments':
        return <TreasuryScreen />;

      case 'old_ledgers':
        return <OldLedgersScreen />;

      case 'reports':
        return <ReportsScreen />;

      case 'users':
        return <UsersPermissionsScreen />;

      case 'settings':
        return <SettingsScreen />;

      default:
        return (
          <DashboardOverview
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenPos={() => setActiveTab('pos')}
          />
        );
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={(tab) => setActiveTab(tab)}
      onOpenPos={() => {
        if (authService.canAccessTab('pos', currentUser.role)) {
          setActiveTab('pos');
        }
      }}
      currentUser={currentUser}
      onLogout={handleLogout}
      onUserUpdated={(updated) => setCurrentUser(updated)}
    >
      {renderContent()}
    </Layout>
  );
}
