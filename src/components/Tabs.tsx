import React from 'react';
import { UserRole } from '../types';
import { Language } from '../utils/i18n';
import { LayoutDashboard, Calendar, TrendingUp, Receipt, Users, MapPin, UserPlus, Settings as SettingsIcon, FileText, FileSpreadsheet } from 'lucide-react';

export type TabType = 'summary' | 'attendance' | 'income' | 'expenses' | 'workers' | 'sites' | 'contractor_bill' | 'quotations' | 'users' | 'settings';

interface TabsProps {
  role: UserRole;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  lang?: Language;
}

export const Tabs: React.FC<TabsProps> = ({ role, activeTab, onSelectTab, lang = 'bn' }) => {
  const isEn = lang === 'en';

  const allTabs: { id: TabType; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { id: 'summary', label: isEn ? 'Dashboard' : 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-4 h-4" />, ownerOnly: true },
    { id: 'attendance', label: isEn ? 'Attendance' : 'হাজিরা', icon: <Calendar className="w-4 h-4" /> },
    { id: 'income', label: isEn ? 'Income' : 'আয়', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'expenses', label: isEn ? 'Expenses' : 'খরচ', icon: <Receipt className="w-4 h-4" /> },
    { id: 'workers', label: isEn ? 'Workers' : 'কর্মী', icon: <Users className="w-4 h-4" />, ownerOnly: true },
    { id: 'sites', label: isEn ? 'Sites' : 'সাইট', icon: <MapPin className="w-4 h-4" />, ownerOnly: true },
    { id: 'contractor_bill', label: isEn ? 'Bill Invoice' : 'বিল প্যাড', icon: <FileText className="w-4 h-4" />, ownerOnly: true },
    { id: 'quotations', label: isEn ? 'Quotations' : 'কোটেশন', icon: <FileSpreadsheet className="w-4 h-4" />, ownerOnly: true },
    { id: 'users', label: isEn ? 'Users' : 'ব্যবহারকারী', icon: <UserPlus className="w-4 h-4" />, ownerOnly: true },
    { id: 'settings', label: isEn ? 'Settings' : 'সেটিংস', icon: <SettingsIcon className="w-4 h-4" />, ownerOnly: true },
  ];

  const visibleTabs = allTabs.filter(t => !t.ownerOnly || role === 'owner');

  return (
    <nav className="no-print bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-2 sticky top-[57px] z-30 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center overflow-x-auto no-scrollbar py-2 gap-1.5 md:gap-2">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[var(--copper)] to-[var(--amber)] text-zinc-950 shadow-md font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-primary)]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
