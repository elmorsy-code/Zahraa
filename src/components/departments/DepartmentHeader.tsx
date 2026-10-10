import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Warehouse,
  Landmark,
  BarChart3,
  ChevronLeft,
  ArrowRight,
  Layers,
} from 'lucide-react';

export interface DepartmentTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface DepartmentHeaderProps {
  deptId: string;
  title: string;
  subtitle: string;
  tagline?: string;
  icon: React.ComponentType<{ className?: string }>;
  themeColor: 'emerald' | 'amber' | 'blue' | 'teal' | 'purple' | 'rose' | 'sky';
  tabs: DepartmentTabItem[];
  activeSubTab: string;
  onSelectSubTab: (subTabId: string) => void;
  onNavigateHome: () => void;
  onSwitchDept?: (deptId: string) => void;
  extraActions?: React.ReactNode;
}

const colorMap = {
  emerald: {
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
    border: 'border-emerald-200',
    activeTabBg: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30',
    topGradient: 'from-emerald-500/10 via-white to-white',
    accentText: 'text-emerald-700',
  },
  amber: {
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    iconBg: 'bg-amber-600 text-white shadow-amber-500/20',
    border: 'border-amber-200',
    activeTabBg: 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30',
    topGradient: 'from-amber-500/10 via-white to-white',
    accentText: 'text-amber-800',
  },
  blue: {
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    iconBg: 'bg-blue-600 text-white shadow-blue-500/20',
    border: 'border-blue-200',
    activeTabBg: 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30',
    topGradient: 'from-blue-500/10 via-white to-white',
    accentText: 'text-blue-700',
  },
  teal: {
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    iconBg: 'bg-teal-600 text-white shadow-teal-500/20',
    border: 'border-teal-200',
    activeTabBg: 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30',
    topGradient: 'from-teal-500/10 via-white to-white',
    accentText: 'text-teal-700',
  },
  purple: {
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    iconBg: 'bg-purple-600 text-white shadow-purple-500/20',
    border: 'border-purple-200',
    activeTabBg: 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30',
    topGradient: 'from-purple-500/10 via-white to-white',
    accentText: 'text-purple-700',
  },
  rose: {
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    iconBg: 'bg-rose-600 text-white shadow-rose-500/20',
    border: 'border-rose-200',
    activeTabBg: 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30',
    topGradient: 'from-rose-500/10 via-white to-white',
    accentText: 'text-rose-700',
  },
  sky: {
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    iconBg: 'bg-sky-600 text-white shadow-sky-500/20',
    border: 'border-sky-200',
    activeTabBg: 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-600/30',
    topGradient: 'from-sky-500/10 via-white to-white',
    accentText: 'text-sky-700',
  },
};

export const DepartmentHeader: React.FC<DepartmentHeaderProps> = ({
  title,
  subtitle,
  tagline,
  icon: Icon,
  themeColor,
  tabs,
  activeSubTab,
  onSelectSubTab,
  onNavigateHome,
  extraActions,
}) => {
  const theme = colorMap[themeColor] || colorMap.emerald;

  return (
    <div className={`card-box border-2 ${theme.border} p-5 sm:p-6 mb-6 bg-gradient-to-b ${theme.topGradient} shadow-xs`}>
      {/* Top Bar: Breadcrumb + Return to Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <button
            onClick={onNavigateHome}
            type="button"
            className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة التحكم الرئيسية</span>
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <span className="font-black text-slate-900 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            {title}
          </span>
        </div>

        <button
          onClick={onNavigateHome}
          type="button"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      {/* Main Department Title & Action Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${theme.iconBg}`}>
            <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {title}
              </h1>
              <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                صفحة القسم المستقلة
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
              {subtitle} {tagline ? `— ${tagline}` : ''}
            </p>
          </div>
        </div>

        {/* Extra Action Buttons if provided */}
        {extraActions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {extraActions}
          </div>
        )}
      </div>

      {/* Department Sub-Tabs / Tools Switcher */}
      {tabs.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-200/80">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-slate-500 font-black pl-1 shrink-0 hidden sm:inline">
              أدوات وشاشات القسم:
            </span>
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectSubTab(tab.id)}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer whitespace-nowrap select-none ${
                    isActive
                      ? theme.activeTabBg
                      : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
