import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Bell,
  User,
  LogOut,
  Sun,
  Moon,
  Shield,
  ClipboardList,
  Database,
  BarChart4,
  Wrench,
  Activity,
  CheckCircle2,
  Radio,
  ExternalLink,
  ChevronDown,
  Camera,
  Image
} from 'lucide-react';
import AdminLogoModal from './AdminLogoModal';

export interface SelectCodeHeaderProps {
  currentUser: {
    username: string;
    role: string;
    email?: string;
  };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadNotifsCount: number;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  handleLogout: () => void;
  getIsTabAllowed?: (role: string, tab: string) => boolean;
  isSyncing?: boolean;
  companyLogo?: string;
  onUpdateLogo?: (newLogo: string) => void;
  triggerMessage?: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const SelectCodeHeader: React.FC<SelectCodeHeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  unreadNotifsCount,
  isDarkMode,
  setIsDarkMode,
  handleLogout,
  getIsTabAllowed = (_role: string, _tab: string) => true,
  isSyncing = false,
  companyLogo,
  onUpdateLogo,
  triggerMessage = () => {}
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const logoSrc = companyLogo || '/path-to-logo.png';

  // Close mobile menu on tab switch or window resize
  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Map roles to Arabic labels and styling
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return { label: 'مدير النظام', bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'Manager':
        return { label: 'مدير العمليات', bg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 'TechnicalSupport':
        return { label: 'الدعم الفني', bg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
      case 'Monitoring':
        return { label: 'المتابعة والجودة', bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'User':
      default:
        return { label: 'مستشار مبيعات', bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  // Navigation Items with role permission gating
  const navigationItems = [
    {
      key: 'reports_center',
      label: currentUser.role === 'TechnicalSupport' || currentUser.role === 'Monitoring' ? 'لوحة المؤشرات والتحليلات' : 'لوحة المؤشرات التنفيذية',
      shortLabel: 'لوحة المؤشرات',
      icon: BarChart4,
      allowed: getIsTabAllowed(currentUser.role, 'reports_center'),
      badge: 'Executive',
      badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300/40'
    },
    {
      key: 'register',
      label: 'تسجيل المبيعات والزيارات',
      shortLabel: 'تسجيل الزيارات',
      icon: ClipboardList,
      allowed: getIsTabAllowed(currentUser.role, 'register')
    },
    {
      key: 'data',
      label: currentUser.role === 'TechnicalSupport' || currentUser.role === 'Monitoring' ? 'سجل الزيارات والعملاء' : 'سجل الزيارات وإدارة البيانات',
      shortLabel: 'سجل البيانات',
      icon: Database,
      allowed: getIsTabAllowed(currentUser.role, 'data')
    },
    {
      key: 'reports',
      label: 'التقارير الميدانية والمحاسبية',
      shortLabel: 'التقارير الميدانية',
      icon: BarChart4,
      allowed: getIsTabAllowed(currentUser.role, 'reports')
    },
    {
      key: 'support',
      label: 'قسم الدعم الفني والمهام',
      shortLabel: 'الدعم الفني',
      icon: Wrench,
      allowed: getIsTabAllowed(currentUser.role, 'support')
    },
    {
      key: 'monitoring',
      label: 'قسم المتابعة وضمان الجودة',
      shortLabel: 'المتابعة والجودة',
      icon: Activity,
      allowed: getIsTabAllowed(currentUser.role, 'monitoring')
    },
    {
      key: 'rbac_users',
      label: 'إدارة الموظفين والصلاحيات (RBAC)',
      shortLabel: 'صلاحيات الموظفين',
      icon: Shield,
      allowed: getIsTabAllowed(currentUser.role, 'rbac_users')
    },
    {
      key: 'notifications',
      label: 'مركز التنبيهات والإشعارات',
      shortLabel: 'التنبيهات',
      icon: Bell,
      allowed: getIsTabAllowed(currentUser.role, 'notifications'),
      badgeCount: unreadNotifsCount
    }
  ];

  const allowedTabs = navigationItems.filter(item => item.allowed);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[88px] sm:min-h-[104px] py-2.5 gap-3">
          
          {/* 1. BRAND IDENTITY: Logo + Company Name */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Hamburger Toggle (Min 44x44px touch target) */}
            <button
              id="mobile-nav-toggle-btn"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 -mr-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة الرئيسية'}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              ) : (
                <Menu className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              )}
            </button>

            {/* Brand Logo & Name */}
            <div 
              onClick={() => handleTabClick('reports_center')}
              className="flex items-center gap-3 sm:gap-4 cursor-pointer group"
              title="Select Code CRM Dashboard"
            >
              {/* User-requested Logo component with graceful fallback */}
              <div 
                className="relative flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-700/90 shadow-sm group-hover:border-teal-500/80 transition-all overflow-hidden p-0 shrink-0"
                title={currentUser.role === 'Admin' ? 'انقر لتغيير شعار الشركة (مدير النظام)' : 'Select Code Logo'}
                onClick={(e) => {
                  if (currentUser.role === 'Admin') {
                    e.stopPropagation();
                    setIsLogoModalOpen(true);
                  }
                }}
              >
                <img
                  src={logoSrc}
                  alt="Select Code Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/select-code-logo.svg';
                  }}
                />
                {currentUser.role === 'Admin' && (
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-2xl">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>

              {/* Company Typography */}
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg sm:text-2xl tracking-tight leading-none font-sans">
                    <span className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">Select</span> <span className="text-[#0d9488] dark:text-[#2dd4bf] group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">Code</span>
                  </span>
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 rounded-md">
                    CRM
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-bold tracking-normal mt-1 hidden xs:block">
                  نظام إدارة علاقات العملاء والعمليات الميدانية
                </p>
              </div>
            </div>
          </div>

          {/* 2. LIVE SYNC BADGE (DESKTOP & TABLET) */}
          <div className="hidden md:flex items-center">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shadow-xs"
              title="مزامنة حية فورية ومباشرة مع قاعدة بيانات Cloud Firestore"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>مزامنة سحابية مباشرة</span>
            </div>
          </div>

          {/* 3. QUICK ACTION ITEMS: Notifications, Theme, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Compact Live Sync Indicator for Mobile */}
            <div 
              className="md:hidden flex items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"
              title="سحابة Firestore متصلة"
            >
              <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>

            {/* Notifications Button with Badge */}
            <button
              id="header-notifications-btn"
              type="button"
              onClick={() => handleTabClick('notifications')}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                activeTab === 'notifications'
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-900'
              }`}
              title="مركز التنبيهات والإشعارات"
              aria-label="مركز التنبيهات"
            >
              <Bell className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono font-black text-[9px] h-5 w-5 rounded-full flex items-center justify-center shadow-xs animate-bounce">
                  {unreadNotifsCount > 99 ? '+99' : unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="header-theme-toggle-btn"
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={isDarkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
              aria-label="تبديل وضع الألوان"
            >
              {isDarkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-700" />
              )}
            </button>

            {/* User Profile Info & Logout */}
            <div className="hidden sm:flex items-center gap-2 pl-1 border-r border-slate-200 dark:border-slate-700 pr-3">
              <div className="text-right">
                <span className="text-xs font-black text-slate-900 dark:text-white block leading-tight">
                  {currentUser.username}
                </span>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full border ${roleInfo.bg} mt-0.5`}>
                  {roleInfo.label}
                </span>
              </div>

              {/* Logout Button */}
              <button
                id="header-logout-btn"
                type="button"
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-all cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="تسجيل الخروج بأمان"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs Bar (Horizontal Tabs) */}
      <div className="hidden lg:block border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 py-2 overflow-x-auto no-scrollbar" aria-label="أقسام لوحة التحكم">
            {allowedTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`nav-tab-${tab.key}`}
                  type="button"
                  onClick={() => handleTabClick(tab.key)}
                  className={`group px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                    isActive
                      ? 'bg-[#0d9488] text-white border-[#0d9488] shadow-xs'
                      : 'bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-teal-600'
                  }`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                      isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {tab.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer (< 1024px) */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-menu"
          className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl animate-fadeIn"
        >
          {/* Mobile User Card & Status */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {currentUser.username}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${roleInfo.bg}`}>
                    {roleInfo.label}
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                    • متصل الآن
                  </span>
                </div>
              </div>
            </div>

            {/* Logout button on mobile */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 cursor-pointer min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>

          {/* Navigation Items List with touch-friendly min 48px height */}
          <div className="p-3 space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
            {allowedTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabClick(tab.key)}
                  className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-between cursor-pointer border ${
                    isActive
                      ? 'bg-[#0d9488] text-white border-[#0d9488] shadow-sm'
                      : 'bg-white dark:bg-slate-850 text-slate-750 dark:text-slate-200 border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`} />
                    <span>{tab.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {tab.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                        isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                    {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-rose-500 text-white">
                        {tab.badgeCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Sync details footer */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-bold px-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>سحابة البيانات: Firestore متزامنة فورياً</span>
            </div>
            <span className="font-mono text-[10px]">v3.5 - Select Code</span>
          </div>
        </div>
      )}

      {/* ADMIN LOGO MODAL */}
      {currentUser.role === 'Admin' && isLogoModalOpen && (
        <AdminLogoModal
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
          currentLogo={logoSrc}
          onLogoUpdated={(newLogoUrl) => {
            onUpdateLogo?.(newLogoUrl);
          }}
          triggerMessage={triggerMessage}
        />
      )}
    </header>
  );
};
export default SelectCodeHeader;
