/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Visit, Customer, SalesRep, VisitType, CustomerStatus, InterestLevel, VisitSource, MonitoringRepTask } from './types';
import { 
  getStoredData, 
  setStoredData, 
  initStorageData 
} from './data/mockData';
import { normalizeDateToISO, parseDateTimeToMs } from './utils';
import ReportsView from './components/ReportsView';
import CustomersView from './components/CustomersView';
import EditVisitModal from './components/EditVisitModal';
import VisitDetailModal from './components/VisitDetailModal';
import { LoginOverlay } from './components/LoginOverlay';
import { AdminRBACPanel } from './components/AdminRBACPanel';
import TechnicalSupportView from './components/TechnicalSupportView';
import MonitoringView from './components/MonitoringView';
import NotificationsCenter from './components/NotificationsCenter';
import ReportsCenter from './components/ReportsCenter';
import SelectCodeHeader from './components/SelectCodeHeader';
import { 
  Shield, 
  LogOut, 
  Users,
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  CheckSquare, 
  AlertCircle, 
  Copy, 
  Check, 
  Link2, 
  RefreshCw, 
  Download, 
  Trash2, 
  PlusCircle, 
  HelpCircle, 
  CloudLightning, 
  Settings, 
  Search, 
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  User,
  Phone,
  Briefcase,
  MapPin,
  Clock,
  Navigation,
  Bell,
  AlertTriangle,
  BarChart4,
  ClipboardList,
  Wrench,
  Activity,
  Upload,
  Database,
  FileJson,
  Smartphone,
  X,
  Edit,
  Filter,
  LayoutGrid,
  Table,
  Coins,
  Eye,
  Sun,
  Moon,
  ShieldAlert,
  BellOff,
  RotateCcw
} from 'lucide-react';

// Helper to generate a completely unique customer ID
const generateUniqueCustId = (existingCustomers: Customer[]): string => {
  const usedIds = new Set(existingCustomers.map(c => c.id));
  let maxIdNum = 0;
  existingCustomers.forEach(c => {
    const match = c.id.match(/^CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) {
        maxIdNum = num;
      }
    }
  });
  let counter = maxIdNum + 1;
  while (true) {
    const candidate = `CUST-${String(counter).padStart(3, '0')}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
    counter++;
  }
};

// Helper to ensure all customers have strictly unique IDs
const sanitizeCustomersList = (list: Customer[]): Customer[] => {
  const seenIds = new Set<string>();
  const sanitized: Customer[] = [];
  list.forEach(cust => {
    let sanitizedId = cust.id;
    if (!sanitizedId || seenIds.has(sanitizedId)) {
      let counter = 1;
      while (true) {
        const candidate = `CUST-${String(counter).padStart(3, '0')}`;
        if (!seenIds.has(candidate)) {
          sanitizedId = candidate;
          break;
        }
        counter++;
      }
    }
    seenIds.add(sanitizedId);
    sanitized.push({
      ...cust,
      id: sanitizedId
    });
  });
  return sanitized;
};

// Helper to recompute entire customer database based on visit logs to keep lists synchronized
const recomputeCustomersFromVisits = (allVisits: Visit[], existingCustomers: Customer[]): Customer[] => {
  // Group visits by customer name
  const customerGroups: { [key: string]: Visit[] } = {};
  allVisits.forEach(v => {
    if (!v.customerName) return;
    const key = v.customerName.trim();
    if (!customerGroups[key]) {
      customerGroups[key] = [];
    }
    customerGroups[key].push(v);
  });

  // Sort visits for each customer by timestamp/date ascending
  Object.keys(customerGroups).forEach(name => {
    customerGroups[name].sort((a, b) => {
      const dateA = a.timestamp || '';
      const dateB = b.timestamp || '';
      return dateA.localeCompare(dateB);
    });
  });

  // Build existing customer lookup and ID set
  const usedIds = new Set<string>();
  let maxIdNum = 0;
  existingCustomers.forEach(c => {
    usedIds.add(c.id);
    const match = c.id.match(/^CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) {
        maxIdNum = num;
      }
    }
  });

  const nextIdCounter = { current: maxIdNum + 1 };

  const updatedCustomers: Customer[] = [];
  const processedNames = new Set<string>();

  Object.entries(customerGroups).forEach(([name, custVisits]) => {
    const firstVisit = custVisits[0];
    const lastVisit = custVisits[custVisits.length - 1];
    const keyLower = name.toLowerCase().trim();

    const findLastField = (list: Visit[], accessor: (v: Visit) => string | undefined) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const val = accessor(list[i]);
        if (val && val !== '--' && val.trim() !== '') return val;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const val = accessor(list[i]);
        if (val) return val;
      }
      return '';
    };

    const phone = findLastField(custVisits, v => v.phone);
    const whatsapp = findLastField(custVisits, v => v.whatsapp);
    const email = findLastField(custVisits, v => v.email);
    const activity = findLastField(custVisits, v => v.activityType);
    const requestedProduct = findLastField(custVisits, v => v.requestedProduct);
    const contactPerson = findLastField(custVisits, v => v.contactPerson);
    const address = findLastField(custVisits, v => v.address);
    const province = findLastField(custVisits, v => v.province);

    let latitude: number | undefined;
    let longitude: number | undefined;
    for (let i = custVisits.length - 1; i >= 0; i--) {
      if (custVisits[i].latitude !== undefined) {
        latitude = custVisits[i].latitude;
        longitude = custVisits[i].longitude;
        break;
      }
    }

    const existing = existingCustomers.find(c => c.name.toLowerCase().trim() === keyLower);
    
    let custId = '';
    if (existing) {
      custId = existing.id;
    } else {
      while (true) {
        const candidate = `CUST-${String(nextIdCounter.current).padStart(3, '0')}`;
        nextIdCounter.current += 1;
        if (!usedIds.has(candidate)) {
          usedIds.add(candidate);
          custId = candidate;
          break;
        }
      }
    }

    const resolvedRepName = existing?.repName || lastVisit?.repName || firstVisit?.repName || '';
    const resolvedRepId = existing?.repId || lastVisit?.repId || firstVisit?.repId || '';

    updatedCustomers.push({
      id: custId,
      name,
      repName: resolvedRepName,
      repId: resolvedRepId,
      activity: activity || existing?.activity || '--',
      requestedProduct: requestedProduct || existing?.requestedProduct || 'POS',
      contactPerson: contactPerson || existing?.contactPerson || '--',
      phone: phone || existing?.phone || '',
      whatsapp: whatsapp || existing?.whatsapp || phone || '',
      email: email || existing?.email || '',
      address: address || existing?.address || '',
      province: province || existing?.province || '',
      firstVisitDate: firstVisit.timestamp ? firstVisit.timestamp.split('T')[0] : (existing?.firstVisitDate || ''),
      lastVisitDate: lastVisit.timestamp ? lastVisit.timestamp.split('T')[0] : (existing?.lastVisitDate || ''),
      visitsCount: custVisits.length,
      currentStatus: lastVisit.customerStatus || existing?.currentStatus || 'عميل محتمل',
      opportunityValue: lastVisit.expectedOpportunityValue || existing?.opportunityValue || 0,
      latitude: latitude !== undefined ? latitude : existing?.latitude,
      longitude: longitude !== undefined ? longitude : existing?.longitude
    });

    processedNames.add(keyLower);
  });

  // Bring along existing customers not found in the visit list
  existingCustomers.forEach(existing => {
    const keyLower = existing.name.toLowerCase().trim();
    if (!processedNames.has(keyLower)) {
      updatedCustomers.push(existing);
    }
  });

  return sanitizeCustomersList(updatedCustomers);
};

const getIsTabAllowed = (role: string, tab: string): boolean => {
  if (role === 'Admin') return true;
  if (role === 'Manager') {
    return ['register', 'data', 'reports', 'support', 'monitoring', 'reports_center', 'notifications'].includes(tab);
  }
  if (role === 'TechnicalSupport') {
    return ['data', 'support', 'reports_center', 'notifications'].includes(tab);
  }
  if (role === 'Monitoring') {
    return ['data', 'monitoring', 'reports_center', 'notifications'].includes(tab);
  }
  if (role === 'User') {
    return ['register', 'data', 'reports', 'reports_center', 'notifications'].includes(tab);
  }
  return false;
};

export default function App() {
  // Initialize mock records on load and clear old demo entries once
  useEffect(() => {
    try {
      const hasClearedDemo = localStorage.getItem('sales_visit_crm_demo_data_cleared_v3') === 'true';
      if (!hasClearedDemo) {
        localStorage.removeItem('sales_visit_crm_visits');
        localStorage.removeItem('sales_visit_crm_customers');
        localStorage.setItem('sales_visit_crm_demo_data_cleared_v3', 'true');
        setVisits([]);
        setCustomers([]);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    initStorageData();
  }, []);



  // PWA (Progressive Web App) installation states & installers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAHelpModal, setShowPWAHelpModal] = useState<boolean>(false);
  const [pwaInstallStatus, setPwaInstallStatus] = useState<'not-installed' | 'prompt-ready' | 'installed'>('not-installed');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallStatus('prompt-ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Dynamic detection if already opened as a standalone screen icon
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setPwaInstallStatus('installed');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User prompt response installer: ${outcome}`);
        setDeferredPrompt(null);
        setPwaInstallStatus('installed');
        triggerMessage('success', 'رائع! جاري تثبيت تطبيق CRM المبيعات كأيقونة سريعة لتسهيل مبيعاتك اليومية.');
      } catch (err) {
        console.error('Error launching native PWA installer prompt:', err);
      }
    } else {
      // Launch custom guidance modal (with beautiful images and instructions for Safari & Android browsers)
      setShowPWAHelpModal(true);
    }
  };

   // ==================== ROLE-BASED ACCESS CONTROL (RBAC) STATE ====================
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('sales_visit_crm_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Automatically validate active session on mount
  useEffect(() => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCurrentUser(data.user);
          localStorage.setItem('sales_visit_crm_user', JSON.stringify(data.user));
        } else {
          handleLogout();
        }
      })
      .catch((err) => {
        console.warn('Authentication token offline check, keeping local active state:', err);
      });
    }
  }, []);

  // Load and sync unread notifications count
  useEffect(() => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token && currentUser) {
      const loadUnreadCount = () => {
        fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.notifications) {
            const unread = data.notifications.filter((n: any) => !n.isRead).length;
            setUnreadNotifsCount(unread);
          }
        })
        .catch(err => console.warn('Error loading unread notification count', err));
      };
      
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Sync state with cloud Firestore database on login or user shift
  useEffect(() => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token && currentUser) {
      fetch('/api/visits', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.visits) {
          setRawVisits(data.visits);
        }
      })
      .catch(err => console.error('Error fetching visits from database:', err));

      fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.customers) {
          setRawCustomers(data.customers);
        }
      })
      .catch(err => console.error('Error fetching customers from database:', err));
    }
  }, [currentUser]);

  const handleLogout = async () => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('sales_visit_crm_auth_token');
    localStorage.removeItem('sales_visit_crm_user');
    setCurrentUser(null);
    setActiveTab('register');
    triggerMessage('info', 'تم تسجيل الخروج الآمن وإنهاء الجلسة بنجاح.');
  };

  // Main lists loaded from storage
  const [rawVisits, setRawVisits] = useState<Visit[]>(() => {
    // Make sure we filter out deleted visits even on initial local load safely
    let deletedIds: string[] = [];
    try {
      const savedDeleted = localStorage.getItem('sales_visit_crm_deleted_visit_ids');
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) {
          deletedIds = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not parse deleted visit IDs from localStorage:", e);
    }
    const localVisits: Visit[] = getStoredData('visits', []);
    return localVisits.filter(v => v && v.id && !deletedIds.includes(v.id));
  });
  const [rawCustomers, setRawCustomers] = useState<Customer[]>(() => {
    return sanitizeCustomersList(getStoredData('customers', []));
  });

  // Reactively enforce role-based row-level permissions on data lists
  const visits = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return rawVisits;
    const allowed = currentUser.assignedReps || [];
    return rawVisits.filter(v => allowed.includes(v.repName));
  }, [rawVisits, currentUser]);

  const customers = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return rawCustomers;
    const allowed = currentUser.assignedReps || [];
    // Standard User: can only access details of customers assigned to their active reps or who received a visit from their assigned representatives
    const allowedCustomerNames = new Set(visits.map(v => (v.customerName || '').trim().toLowerCase()));
    return rawCustomers.filter(c => {
      if (!c.name) return false;
      const keyLower = c.name.trim().toLowerCase();
      
      // Directly assigned via repName
      if (c.repName && allowed.includes(c.repName)) {
        return true;
      }
      
      // Fallback: Has visits belonging to allowed reps
      return allowedCustomerNames.has(keyLower);
    });
  }, [rawCustomers, visits, currentUser]);

  // Read-Write set methods that write back to raw state and local storage perfectly
  const setVisits = (val: Visit[] | ((prev: Visit[]) => Visit[])) => {
    setRawVisits(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return next;
    });
  };

  const setCustomers = (val: Customer[] | ((prev: Customer[]) => Customer[])) => {
    setRawCustomers(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return sanitizeCustomersList(next);
    });
  };

  const [deletedVisitIds, setDeletedVisitIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sales_visit_crm_deleted_visit_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [softDeletedVisits, setSoftDeletedVisits] = useState<Visit[]>(() => {
    try {
      const saved = localStorage.getItem('sales_visit_crm_soft_deleted_visits');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'register' | 'reports' | 'data' | 'rbac_users' | 'support' | 'monitoring' | 'notifications' | 'reports_center'>('register');
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [dataSubTab, setDataSubTab] = useState<'visits' | 'customers'>('visits');
  const [alertsTab, setAlertsTab] = useState<'active' | 'dismissed'>('active');
  const [dismissingReminderVisit, setDismissingReminderVisit] = useState<Visit | null>(null);
  const [dismissReasonInput, setDismissReasonInput] = useState<string>('');
  const [dismissSubmitting, setDismissSubmitting] = useState<boolean>(false);

  // Monitoring Sales Rep Tasks States
  const [monitoringRepTasks, setMonitoringRepTasks] = useState<MonitoringRepTask[]>([]);
  const [loadingRepTasks, setLoadingRepTasks] = useState<boolean>(false);
  const [selectedRepTaskForFeedback, setSelectedRepTaskForFeedback] = useState<MonitoringRepTask | null>(null);
  const [repTaskFeedbackText, setRepTaskFeedbackText] = useState<string>('');
  const [savingRepTaskFeedback, setSavingRepTaskFeedback] = useState<boolean>(false);

  // System Branding / Logo State
  const [companyLogo, setCompanyLogo] = useState<string>(() => {
    try {
      return localStorage.getItem('sales_visit_crm_company_logo') || '/path-to-logo.png';
    } catch {
      return '/path-to-logo.png';
    }
  });

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.status === 'success' && data.settings?.companyLogo) {
          setCompanyLogo(data.settings.companyLogo);
          try {
            localStorage.setItem('sales_visit_crm_company_logo', data.settings.companyLogo);
          } catch {}
        }
      } catch (err) {
        console.warn('Could not fetch system settings:', err);
      }
    };
    fetchCompanySettings();
  }, []);

  const handleUpdateLogo = (newLogoUrl: string) => {
    setCompanyLogo(newLogoUrl);
    try {
      localStorage.setItem('sales_visit_crm_company_logo', newLogoUrl);
    } catch {}
  };

  const handleTransferSuccess = (result: {
    transferredCount: number;
    updatedVisitsCount: number;
    sourceRep: string;
    targetRep: string;
    transferredCustomerNames: string[];
  }) => {
    setRawCustomers(prev => {
      const updated = prev.map(c => {
        if (result.transferredCustomerNames.includes(c.name)) {
          return { ...c, repName: result.targetRep, updatedAt: new Date().toISOString() };
        }
        return c;
      });
      try {
        localStorage.setItem('sales_visit_crm_customers', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (result.updatedVisitsCount > 0) {
      setRawVisits(prev => {
        const updated = prev.map(v => {
          if (result.transferredCustomerNames.includes(v.customerName) && v.repName === result.sourceRep) {
            return { ...v, repName: result.targetRep };
          }
          return v;
        });
        try {
          localStorage.setItem('sales_visit_crm_visits', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    triggerMessage('success', `تم بنجاح نقل ${result.transferredCount} عميل من "${result.sourceRep}" إلى "${result.targetRep}" وتحديث كافة السجلات.`);
  };

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sales_visit_crm_theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        localStorage.setItem('sales_visit_crm_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('sales_visit_crm_theme', 'light');
      }
    } catch (_) {}
  }, [isDarkMode]);

  // Automatically adjust activeTab to a permitted tab when currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.role) {
      if (!getIsTabAllowed(currentUser.role, activeTab)) {
        if (currentUser.role === 'TechnicalSupport') {
          setActiveTab('support');
        } else if (currentUser.role === 'Monitoring') {
          setActiveTab('monitoring');
        } else {
          setActiveTab('register');
        }
      }
    }
  }, [currentUser]);


  // Form states
  const [visitType, setVisitType] = useState<VisitType>('زيارة جديدة');
  const [repName, setRepName] = useState('حسام عيد');
  const [isCustomRep, setIsCustomRep] = useState(false);
  const [customRepName, setCustomRepName] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('');
  const [activityType, setActivityType] = useState('');
  const [requestedProduct, setRequestedProduct] = useState('POS');
  const [contactPerson, setContactPerson] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [needs, setNeeds] = useState('');
  const [interestLevel, setInterestLevel] = useState<InterestLevel>('متوسط');
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus>('عميل محتمل');
  const [opportunityValue, setOpportunityValue] = useState<string>('0');
  const [visitSource, setVisitSource] = useState<VisitSource>('زيارة ميدانية');

  // Follow-up states
  const [existingCustomerName, setExistingCustomerName] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editModeVisitId, setEditModeVisitId] = useState<string | null>(null);

  // Filter existing customers by name containing letters or matching phone number
  const filteredExistingCustomers = React.useMemo(() => {
    const query = existingCustomerName.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(query);
      const phoneMatch = c.phone ? c.phone.includes(query) : false;
      return nameMatch || phoneMatch;
    });
  }, [customers, existingCustomerName]);

  // Geolocation states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Advanced filters, layout, and modal states for custom visits log (Edit/Delete) screen
  const [dataViewMode, setDataViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedVisitTypeFilter, setSelectedVisitTypeFilter] = useState<string>('الكل');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('الكل');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('الكل');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('الكل');
  
  const [editingModalVisit, setEditingModalVisit] = useState<Visit | null>(null);
  const [viewingModalVisit, setViewingModalVisit] = useState<Visit | null>(null);

  // UI state feedback
  const [isDraftClick, setIsDraftClick] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [infoMessage, setInfoMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);

  const [confirmReasonText, setConfirmReasonText] = useState('');

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    showReasonInput?: boolean;
    onConfirm: (reason?: string) => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    showReasonInput: false,
    onConfirm: () => {}
  });

  const provinces = [
    'المحافظة الوسطى (الرياض)',
    'المحافظة الغربية (جدة)',
    'المحافظة الشرقية (الدمام)',
    'المحافظة الشمالية (تبوك)',
    'المنطقة الجنوبية (أبها)',
    'منطقة مكة المكرمة',
    'المدينة المنورة',
    'القصيم'
  ];

  const activities = [
    'ERP & accounting - نظام إدارة موارد وحسابات',
    'POS & Inventory - كاشير ومستودعات مطاعم ومقاهي',
    'ERP systems wholesale - مبيعات جملة وتجارة عامة',
    'POS systems retail - نقاط بيع وتجزئة ملابس وأغذية',
    'Medical Systems & HR - أنظمة طبية وموارد بشرية',
    'Custom solutions - برمجيات وحلول مخصصة'
  ];

  const [rawSalesRepsList, setRawSalesRepsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sales_visit_crm_custom_reps');
      return saved ? JSON.parse(saved) : ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'رنا', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
    } catch (e) {
      return ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'رنا', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
    }
  });

  const fetchSalesReps = async () => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token || !currentUser || currentUser.role !== 'Admin') return;
    try {
      const res = await fetch('/api/admin/salesreps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRawSalesRepsList(data.salesReps);
        localStorage.setItem('sales_visit_crm_custom_reps', JSON.stringify(data.salesReps));
      }
    } catch (e) {
      console.error('Error fetching sales reps:', e);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      fetchSalesReps();
    }
  }, [currentUser]);

  const handleAddSalesRep = async (name: string) => {
    if (!name || !name.trim()) return;
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/salesreps', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRawSalesRepsList(data.salesReps);
        localStorage.setItem('sales_visit_crm_custom_reps', JSON.stringify(data.salesReps));
        triggerMessage('success', `تم إضافة المندوب [${name.trim()}] إلى النظام بنجاح!`);
      } else {
        triggerMessage('error', data.error || 'فشل إضافة المندوب');
      }
    } catch (e: any) {
      triggerMessage('error', 'حدث خطأ أثناء الاتصال بالخادم لإضافة المندوب');
    }
  };

  const handleRemoveSalesRep = async (name: string) => {
    if (!name) return;
    if (name === 'أخرى') {
      triggerMessage('error', 'لا يمكن حذف المندوب الافتراضي');
      return;
    }
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/salesreps/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRawSalesRepsList(data.salesReps);
        localStorage.setItem('sales_visit_crm_custom_reps', JSON.stringify(data.salesReps));
        triggerMessage('success', `تم حذف المندوب [${name}] من النظام بنجاح!`);
      } else {
        triggerMessage('error', data.error || 'فشل حذف المندوب');
      }
    } catch (e: any) {
      triggerMessage('error', 'حدث خطأ أثناء الاتصال بالخادم لحذف المندوب');
    }
  };

  const handleEditSalesRep = async (oldName: string, newName: string) => {
    if (!oldName || !newName || !newName.trim()) return;
    const trimmedNew = newName.trim();
    if (oldName === trimmedNew) return;
    if (oldName === 'أخرى') {
      triggerMessage('error', 'لا يمكن تعديل المندوب الافتراضي "أخرى"');
      return;
    }
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/salesreps/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName: trimmedNew })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRawSalesRepsList(data.salesReps);
        localStorage.setItem('sales_visit_crm_custom_reps', JSON.stringify(data.salesReps));
        
        // Update local visits state and storage
        setVisits(prev => {
          const updated = prev.map(v => v.repName === oldName ? { ...v, repName: trimmedNew } : v);
          setStoredData('visits', updated);
          return updated;
        });

        // Update local customers state and storage
        setCustomers(prev => {
          const updated = prev.map(c => c.repName === oldName ? { ...c, repName: trimmedNew } : c);
          setStoredData('customers', updated);
          return updated;
        });

        triggerMessage('success', `تم تعديل اسم المندوب من [${oldName}] إلى [${trimmedNew}] بنجاح!`);
      } else {
        triggerMessage('error', data.error || 'فشل تعديل اسم المندوب');
      }
    } catch (e: any) {
      triggerMessage('error', 'حدث خطأ أثناء الاتصال بالخادم لتعديل اسم المندوب');
    }
  };

  const handleDismissReminder = async (visitId: string, reason?: string) => {
    setDismissSubmitting(true);
    const token = localStorage.getItem('sales_visit_crm_auth_token') || '';
    const finalReason = reason && reason.trim() ? reason.trim() : 'تمت إزالة التذكير يدوياً';
    const nowIso = new Date().toISOString();
    const username = currentUser?.username || 'مستخدم';

    try {
      if (token) {
        const res = await fetch(`/api/visits/${visitId}/dismiss-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: finalReason })
        });
        const data = await res.json();
        if (data.status === 'success' && data.visit) {
          setVisits(prev => {
            const updated = prev.map(v => v.id === visitId ? data.visit : v);
            setStoredData('visits', updated);
            return updated;
          });
          triggerMessage('success', 'تمت إزالة تذكير المتابعة بنجاح!');
          setDismissingReminderVisit(null);
          setDismissReasonInput('');
          setDismissSubmitting(false);
          return;
        }
      }

      // Fallback local update
      setVisits(prev => {
        const updated = prev.map(v => v.id === visitId ? {
          ...v,
          reminderDismissed: true,
          reminderDismissedAt: nowIso,
          reminderDismissedBy: username,
          reminderDismissReason: finalReason
        } : v);
        setStoredData('visits', updated);
        return updated;
      });
      triggerMessage('success', 'تمت إزالة تذكير المتابعة بنجاح!');
    } catch (err) {
      setVisits(prev => {
        const updated = prev.map(v => v.id === visitId ? {
          ...v,
          reminderDismissed: true,
          reminderDismissedAt: nowIso,
          reminderDismissedBy: username,
          reminderDismissReason: finalReason
        } : v);
        setStoredData('visits', updated);
        return updated;
      });
      triggerMessage('success', 'تمت إزالة تذكير المتابعة بنجاح!');
    } finally {
      setDismissingReminderVisit(null);
      setDismissReasonInput('');
      setDismissSubmitting(false);
    }
  };

  const handleRestoreReminder = async (visitId: string) => {
    const token = localStorage.getItem('sales_visit_crm_auth_token') || '';
    try {
      if (token) {
        const res = await fetch(`/api/visits/${visitId}/restore-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.status === 'success' && data.visit) {
          setVisits(prev => {
            const updated = prev.map(v => v.id === visitId ? data.visit : v);
            setStoredData('visits', updated);
            return updated;
          });
          triggerMessage('success', 'تمت إعادة تفعيل تذكير المتابعة بنجاح!');
          return;
        }
      }

      // Fallback local update
      setVisits(prev => {
        const updated = prev.map(v => v.id === visitId ? {
          ...v,
          reminderDismissed: false,
          reminderDismissedAt: undefined,
          reminderDismissedBy: undefined,
          reminderDismissReason: undefined
        } : v);
        setStoredData('visits', updated);
        return updated;
      });
      triggerMessage('success', 'تمت إعادة تفعيل تذكير المتابعة بنجاح!');
    } catch (err) {
      setVisits(prev => {
        const updated = prev.map(v => v.id === visitId ? {
          ...v,
          reminderDismissed: false,
          reminderDismissedAt: undefined,
          reminderDismissedBy: undefined,
          reminderDismissReason: undefined
        } : v);
        setStoredData('visits', updated);
        return updated;
      });
      triggerMessage('success', 'تمت إعادة تفعيل تذكير المتابعة بنجاح!');
    }
  };

  // Fetch Sales Rep Tasks from Monitoring & Quality Department
  const fetchMonitoringRepTasks = async () => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token || !currentUser) return;
    try {
      setLoadingRepTasks(true);
      const res = await fetch('/api/monitoring/rep-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMonitoringRepTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching rep tasks:', err);
    } finally {
      setLoadingRepTasks(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchMonitoringRepTasks();
    }
  }, [currentUser, activeTab]);

  const handleStartRepTask = async (task: MonitoringRepTask) => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/monitoring/rep-tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'In Progress' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMonitoringRepTasks(prev => prev.map(t => t.id === task.id ? data.task : t));
        triggerMessage('success', 'تم بدء تنفيذ المهمة الميدانية بنجاح');
      }
    } catch (err) {
      triggerMessage('error', 'حدث خطأ أثناء تحديث حالة المهمة');
    }
  };

  const handleOpenRepTaskFeedback = (task: MonitoringRepTask) => {
    setSelectedRepTaskForFeedback(task);
    setRepTaskFeedbackText(task.repFeedback || '');
  };

  const handleSaveRepTaskCompletion = async () => {
    if (!selectedRepTaskForFeedback) return;
    if (!repTaskFeedbackText.trim()) {
      triggerMessage('error', 'يرجى كتابة تقرير وإفادة المندوب عن نتائج الزيارة والتواصل');
      return;
    }
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (!token) return;

    setSavingRepTaskFeedback(true);
    try {
      const res = await fetch(`/api/monitoring/rep-tasks/${selectedRepTaskForFeedback.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'Completed',
          repFeedback: repTaskFeedbackText.trim()
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMonitoringRepTasks(prev => prev.map(t => t.id === selectedRepTaskForFeedback.id ? data.task : t));
        setSelectedRepTaskForFeedback(null);
        setRepTaskFeedbackText('');
        triggerMessage('success', 'تم حفظ تقرير وإنجاز المهمة وإبلاغ قسم الجودة والمتابعة بنجاح!');
      } else {
        triggerMessage('error', data.error || 'فشل تسجيل إنجاز المهمة');
      }
    } catch (err) {
      triggerMessage('error', 'حدث خطأ أثناء حفظ إنجاز المهمة');
    } finally {
      setSavingRepTaskFeedback(false);
    }
  };

  const handlePrefillVisitFromRepTask = (task: MonitoringRepTask) => {
    setVisitType('زيارة متابعة');
    setExistingCustomerName(task.customerName);
    setCustomerName(task.customerName);
    if (task.customerPhone) {
      setPhone(task.customerPhone);
      setWhatsapp(task.customerPhone);
    }
    if (task.customerAddress) {
      setProvince(task.customerAddress);
    }
    if (task.repName) {
      setRepName(task.repName);
    }
    setSummary(`متابعة ميدانية بتكليف من قسم المتابعة والجودة: [${task.title}] - ${task.description || ''}`);
    setFollowUpNotes(`تكليف قسم الجودة: ${task.title}`);

    const el = document.getElementById('visit-entry-form-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    triggerMessage('info', `تم استيراد بيانات العميل (${task.customerName}) لتسجيل الزيارة الميدانية!`);
  };

  // Filter tasks for active user
  const userMonitoringRepTasks = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Monitoring') {
      return monitoringRepTasks;
    }
    const allowed = currentUser.assignedReps || [];
    return monitoringRepTasks.filter(t => 
      t.repName === currentUser.name || 
      t.repName === currentUser.username || 
      allowed.includes(t.repName)
    );
  }, [monitoringRepTasks, currentUser]);

  const pendingUserRepTasks = userMonitoringRepTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');

  const salesRepsList = React.useMemo(() => {
    if (!currentUser) return rawSalesRepsList.filter(name => name !== 'أخرى');
    
    // Check if the user is Admin or Manager or has the permission to add representatives
    const canAddRep = currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.permissions?.includes('salesrep_add');
    
    if (currentUser.role === 'Admin' || currentUser.role === 'Manager') {
      return canAddRep ? rawSalesRepsList : rawSalesRepsList.filter(name => name !== 'أخرى');
    }
    
    const allowed = currentUser.assignedReps || [];
    return rawSalesRepsList.filter(name => {
      if (name === 'أخرى') {
        return canAddRep;
      }
      return allowed.includes(name) || name === 'الكل';
    });
  }, [currentUser, rawSalesRepsList]);

  const salesReps: SalesRep[] = React.useMemo(() => {
    return salesRepsList.filter(name => name !== 'أخرى').map((name, index) => ({
      id: `REP-0${index + 1}`,
      name: name,
      email: `${name}@select-code.com`,
      visitsCount: visits.filter(v => v.repName === name).length
    }));
  }, [visits, salesRepsList]);

  // Handle phone check warning
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (!val) {
      setPhoneWarning(null);
      return;
    }
    const dup = visits.find(v => v.phone === val && v.visitType === 'زيارة جديدة');
    if (dup) {
      setPhoneWarning(`⚠️ تنبيه: هاتف العميل مسجل مسبقاً باسم "${dup.customerName}". يمكنك المتابعة أو تبديل نوع الزيارة لدراسة صفقة جديدة.`);
    } else {
      setPhoneWarning(null);
    }
  };

  // Helper messages helper
  const triggerMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setInfoMessage({ type, text });
    setTimeout(() => setInfoMessage(null), 6000);
  };

  // Get current device GPS location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      triggerMessage('error', 'متصفحك لا يدعم تحديد الموقع الجغرافي (GPS).');
      return;
    }
    setIsLocating(true);

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsLocating(false);
          triggerMessage('success', `📍 تم العثور على موقعك الجغرافي بنجاح! خط العرض: ${position.coords.latitude.toFixed(5)}، خط الطول: ${position.coords.longitude.toFixed(5)}`);
        },
        (error) => {
          // If high accuracy failed and we haven't tried low accuracy, try low accuracy
          if (highAccuracy) {
            console.warn('Geolocation high accuracy failed, retrying with standard accuracy...');
            tryGetPosition(false);
            return;
          }

          setIsLocating(false);
          console.error('Geolocation error summary:', {
            code: error.code,
            message: error.message
          });

          let errorMsg = 'فشل الحصول على إحداثيات الموقع.';
          if (error.code === 1) {
            errorMsg = 'تم رفض إذن الوصول للموقع الجغرافي. يرجى تفعيل صلاحية الموقع من إعدادات المتصفح أو فتح الرابط في نافذة جديدة لضمان عمل الـ GPS.';
          } else if (error.code === 2) {
            errorMsg = 'موقعك الجغرافي غير متاح حالياً، يرجى تشغيل الـ GPS بالموبايل أو الجهاز.';
          } else if (error.code === 3) {
            errorMsg = 'انتهت مهلة البحث المحددة لجلب إحداثيات الموقع.';
          }
          triggerMessage('error', `⚠️ ${errorMsg}`);
        },
        { 
          enableHighAccuracy: highAccuracy, 
          timeout: highAccuracy ? 6000 : 12000, 
          maximumAge: 60000 
        }
      );
    };

    // Begin with high accuracy setup first, fallback to standard on failure
    tryGetPosition(true);
  };



  // Switch tab and smooth-scroll to the New Visit form directly (perfect mobile fast execution)
  const handleQuickOpenNewVisitForm = () => {
    setActiveTab('register');
    setVisitType('زيارة جديدة');
    setTimeout(() => {
      const container = document.getElementById('visit-entry-form-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Also focus on input field if possible
        const input = document.querySelector('input[placeholder*="شركة المنارة"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }
    }, 120);
  };

  // Download complete dataset containing both 'visits' and 'customers' offline as standard JSON backup
  const handleDownloadJSONBackup = () => {
    try {
      const backupData = {
        app: "Sales Visit CRM",
        backup_date: new Date().toISOString(),
        version: "1.0",
        visits: visits,
        customers: customers
      };
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanDate = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `نسخة_احتياطية_CRM_${cleanDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerMessage('success', '📥 تم تصدير وتنزيل ملف النسخة الاحتياطية (JSON) بنجاح! احتفظ بالملف بأمان لتتمكن من استعادة البيانات في أي وقت.');
    } catch (error) {
      console.error('Backup download error:', error);
      triggerMessage('error', '⚠️ فشل إنشاء وتنزيل ملف النسخة الاحتياطية.');
    }
  };

  // Restore/Import data safely from previously downloaded CRM backup JSON file
  const handleUploadJSONBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      triggerMessage('error', '⚠️ ملف النسخة الاحتياطية المختار يجب أن يكون بصيغة (.json) فقط.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupObj = JSON.parse(content);

        if (!backupObj || (!Array.isArray(backupObj.visits) && !Array.isArray(backupObj.customers))) {
          triggerMessage('error', '⚠️ ملف النسخة الاحتياطية غير صالح أو تالف. يرجى اختيار ملف نسخة احتياطية .json صحيح صادر عن هذا البرنامج.');
          return;
        }

        const restoredVisits = Array.isArray(backupObj.visits) ? backupObj.visits : [];
        const restoredCustomers = Array.isArray(backupObj.customers) ? backupObj.customers : [];

        if (restoredVisits.length === 0 && restoredCustomers.length === 0) {
          triggerMessage('info', '⚠️ تنبيه: الملف المحدد لا يحتوي على أي زيارات أو عملاء مسجلين.');
          return;
        }

        let mergedVisits = [...visits];
        let visitNew = 0;
        let visitUpdated = 0;
        restoredVisits.forEach((v: Visit) => {
          if (!v.id) return;
          const idx = mergedVisits.findIndex(mv => mv.id === v.id);
          if (idx !== -1) {
            mergedVisits[idx] = v;
            visitUpdated++;
          } else {
            mergedVisits.unshift(v);
            visitNew++;
          }
        });

        let mergedCustomers = [...customers];
        let custNew = 0;
        let custUpdated = 0;
        restoredCustomers.forEach((c: Customer) => {
          if (!c.id) return;
          const idx = mergedCustomers.findIndex(mc => mc.id === c.id);
          if (idx !== -1) {
            mergedCustomers[idx] = c;
            custUpdated++;
          } else {
            mergedCustomers.unshift(c);
            custNew++;
          }
        });

        setVisits(mergedVisits);
        setStoredData('visits', mergedVisits);

        setCustomers(mergedCustomers);
        setStoredData('customers', mergedCustomers);

        triggerMessage('success', `✨ تم استيراد واستعادة النسخة الاحتياطية بنجاح! الزيارات: (جديد: ${visitNew}، تم تحديثه: ${visitUpdated}) | العملاء: (جديد: ${custNew}، تم تحديثه: ${custUpdated}).`);
      } catch (err: any) {
        console.error('JSON Restore Error:', err);
        triggerMessage('error', `⚠️ حدث خطأ أثناء قراءة واستيراد ملف النسخة الاحتياطية: ${err.message || err}`);
      }
    };
    reader.readAsText(file, 'utf-8');
  };
  // Edit Individual local Record
  const handleEditRow = (id: string) => {
    const visit = visits.find(v => v.id === id);
    if (!visit) return;
    
    // Check 24 hour limit for editing
    if (visit.timestamp) {
      const visitTime = new Date(visit.timestamp).getTime();
      const now = Date.now();
      const hoursDelta = (now - visitTime) / (1000 * 60 * 60);
      
      if (hoursDelta > 24) {
        triggerMessage('error', 'نعتذر، لا يمكن تعديل بيانات الزيارة بعد مرور 24 ساعة من تسجيلها.');
        return;
      }
    }
    
    // Switch to register tab and populate fields
    setActiveTab('register');
    setEditModeVisitId(id);
    setVisitType(visit.visitType);
    
    if (salesRepsList.includes(visit.repName)) {
      setRepName(visit.repName);
      setIsCustomRep(false);
    } else {
      setRepName('other');
      setCustomRepName(visit.repName);
      setIsCustomRep(true);
    }
    
    // Pre-populate all React state inputs
    setCustomerName(visit.customerName || '');
    setExistingCustomerName(visit.customerName || '');
    setPhone(visit.phone || '');
    setWhatsapp(visit.whatsapp || visit.phone || '');
    setEmail(visit.email || '');
    setProvince(visit.province || '');
    setActivityType(visit.activityType || '');
    setRequestedProduct(visit.requestedProduct || 'POS');
    setContactPerson(visit.contactPerson || '');
    setJobTitle(visit.jobTitle || '');
    setSummary(visit.summary || '');
    setNeeds(visit.needs || '');
    setInterestLevel((visit.interestLevel as InterestLevel) || 'متوسط');
    setCustomerStatus(visit.customerStatus);
    setOpportunityValue(visit.expectedOpportunityValue?.toString() || visit.opportunityValue?.toString() || '0');
    setVisitSource((visit.visitSource as VisitSource) || 'زيارة ميدانية');
    setFollowUpNotes(visit.summary || visit.followUpNotes || '');
    
    if (visit.latitude && visit.longitude) {
      setLatitude(visit.latitude);
      setLongitude(visit.longitude);
    } else {
      setLatitude(null);
      setLongitude(null);
    }
    
    setNextStep(visit.nextStep || '');
    setNextFollowUpDate(visit.nextFollowUpDate || '');
    
    setTimeout(() => {
      const formEl = document.getElementById('visit-entry-form-container');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 120);
    triggerMessage('info', 'وضع التعديل قيد التفعيل. أدخل تعديلاتك ثم احفظ، ويمكن التعديل خلال 24 ساعة كحد أقصى من تسجيلها.');
  };

  // Cancel Edit Mode Function
  const handleCancelEdit = () => {
    setCustomerName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setContactPerson('');
    setJobTitle('');
    setSummary('');
    setNeeds('');
    setOpportunityValue('0');
    setVisitSource('زيارة ميدانية');
    setExistingCustomerName('');
    setFollowUpNotes('');
    setNextStep('');
    setNextFollowUpDate('');
    setLatitude(null);
    setLongitude(null);
    setEditModeVisitId(null);
    triggerMessage('info', 'تم إلغاء وضع التعديل والعودة للتسجيل الجديد.');
  };

  // Log Admin Audit Trail to Server secure rbac logs
  const logAdminAction = async (action: 'edit' | 'delete' | 'restore', originalData: any, modifiedData: any, reason?: string) => {
    if (currentUser?.role !== 'Admin') return;
    
    let detailsText = `الرمز: ${originalData?.id || modifiedData?.id || 'N/A'}\n`;
    if (reason) {
      detailsText += `سبب الإجراء: ${reason}\n`;
    }
    detailsText += `البيانات الأصلية:\n${JSON.stringify(originalData, null, 2)}\n`;
    if (modifiedData) {
      detailsText += `البيانات المعدلة:\n${JSON.stringify(modifiedData, null, 2)}`;
    } else {
      detailsText += `البيانات المعدلة: لا يوجد (حذف السجل)`;
    }

    try {
      const token = localStorage.getItem('sales_visit_crm_auth_token');
      await fetch('/api/admin/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: action === 'edit' ? 'تعديل سجل زيارة' : action === 'delete' ? 'حذف سجل زيارة' : 'استعادة سجل زيارة',
          details: detailsText
        })
      });
    } catch (err) {
      console.error('Failed to save audit log to server:', err);
    }
  };

  // Restore Soft-Deleted Visit by Administrator
  const handleRestoreVisit = async (visitId: string) => {
    if (currentUser?.role !== 'Admin') {
      triggerMessage('error', 'غير مصرح: استعادة المحذوفات تقتصر على مدير النظام فقط.');
      return;
    }

    const visitToRestore = softDeletedVisits.find(v => v.id === visitId);
    if (!visitToRestore) {
      triggerMessage('error', 'عذراً، لم يتم العثور على سجل الزيارة المطلوب في سلة المحذوفات.');
      return;
    }

    // 1. Log the restore action
    logAdminAction('restore', visitToRestore, visitToRestore);

    // 2. Remove from softDeletedVisits
    const updatedSoftDeleted = softDeletedVisits.filter(v => v.id !== visitId);
    setSoftDeletedVisits(updatedSoftDeleted);
    try {
      localStorage.setItem('sales_visit_crm_soft_deleted_visits', JSON.stringify(updatedSoftDeleted));
    } catch (e) {
      console.warn(e);
    }

    // 3. Remove from deletedVisitIds
    const updatedDeletedIds = deletedVisitIds.filter(id => id !== visitId);
    setDeletedVisitIds(updatedDeletedIds);
    try {
      localStorage.setItem('sales_visit_crm_deleted_visit_ids', JSON.stringify(updatedDeletedIds));
    } catch (e) {
      console.warn(e);
    }

    // 4. Add back to visits
    const updatedVisits = [visitToRestore, ...visits];
    setVisits(updatedVisits);
    setStoredData('visits', updatedVisits);

    // Recalculate customers
    const updatedCusts = recomputeCustomersFromVisits(updatedVisits, customers);
    setCustomers(updatedCusts);
    setStoredData('customers', updatedCusts);

    triggerMessage('success', 'تمت استعادة السجل المستهدف بنجاح إلى القوائم النشطة.');
  };

  // Delete Individual local Record
  const handleDeleteRow = (id: string, bypassConfirm = false, deletionReason = '') => {
    const visitToDelete = visits.find(v => v.id === id);
    if (!visitToDelete) return;

    if (currentUser.role !== 'Admin' && !currentUser.permissions?.includes('visit_delete')) {
      triggerMessage('error', 'غير مصرح: لا يمتلك هذا الحساب صلاحية حذف السجلات.');
      return;
    }

    if (bypassConfirm !== true) {
      setConfirmModal({
        isOpen: true,
        title: 'تأكيد حذف السجل سحابياً ومحلياً 🗑️',
        message: 'هل أنت متأكد من حذف هذا السجل؟ سيتم نقله إلى سلة المحذوفات وحفظ المعاملة في سجل الرقابة التابع للمدير.',
        showReasonInput: true,
        onConfirm: (reason) => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          handleDeleteRow(id, true, reason || '');
        }
      });
      return;
    }

    // 1. Log the deletion admin action!
    logAdminAction('delete', visitToDelete, null, deletionReason);

    // 2. Soft-delete: add to softDeletedVisits
    const updatedSoftDeleted = [visitToDelete, ...softDeletedVisits];
    setSoftDeletedVisits(updatedSoftDeleted);
    try {
      localStorage.setItem('sales_visit_crm_soft_deleted_visits', JSON.stringify(updatedSoftDeleted));
    } catch (e) {
      console.warn(e);
    }

    // 3. Update main visits lists
    const filtered = visits.filter(v => v.id !== id);
    setVisits(filtered);
    setStoredData('visits', filtered);

    // 4. Update deleted ids list
    const updatedDeletedIds = Array.from(new Set([...deletedVisitIds, id]));
    setDeletedVisitIds(updatedDeletedIds);
    try {
      localStorage.setItem('sales_visit_crm_deleted_visit_ids', JSON.stringify(updatedDeletedIds));
    } catch (e) {
      console.warn(e);
    }

    // Recalculate
    const updatedCusts = recomputeCustomersFromVisits(filtered, customers);
    setCustomers(updatedCusts);
    setStoredData('customers', updatedCusts);

    // Sync deletion and customer modifications to Cloud Firestore DB
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token) {
      fetch(`/api/visits/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          console.log("Deleted visit from Firestore.");
        }
      })
      .catch(err => console.error(err));

      // Overwrite/sync all customers to keep them completely updated in Firestore
      updatedCusts.forEach(cust => {
        fetch(`/api/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ customer: cust })
        }).catch(err => console.error(err));
      });
    }

    triggerMessage('success', 'تم نقل السجل إلى سلة المحذوفات وتحديث سحابة Firestore بنجاح!');
  };

  // Transfer / Assign Customer to another representative (Admin feature)
  const handleTransferCustomer = async (customerId: string, newRepName: string) => {
    if (currentUser.role !== 'Admin') {
      triggerMessage('error', 'خطأ: هذه الصلاحية خاصة بمسؤول النظام فقط!');
      return;
    }

    const targetCust = customers.find(c => c.id === customerId);
    if (!targetCust) return;

    const newRepId = isCustomSalespersonName(newRepName) ? 'REP-CUSTOM' : `REP-0${salesRepsList.indexOf(newRepName) + 1}`;
    const originalRep = targetCust.repName || 'غير معين';

    // 1. Update Customer Record
    const updatedCusts = rawCustomers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          repName: newRepName,
          repId: newRepId
        };
      }
      return c;
    });

    setRawCustomers(updatedCusts);
    setStoredData('customers', updatedCusts);

    // 2. Update all associated Visit records
    const updatedVisits = rawVisits.map(v => {
      if ((v.customerName || '').trim().toLowerCase() === targetCust.name.trim().toLowerCase()) {
        return {
          ...v,
          repName: newRepName,
          repId: newRepId
        };
      }
      return v;
    });

    setRawVisits(updatedVisits);
    setStoredData('visits', updatedVisits);

    // 3. Log to Admin Audit Trail
    logAdminAction(
      'edit',
      null,
      `نقل العميل [${targetCust.name}] من [${originalRep}] إلى [${newRepName}] ونقل كافة زيارات ورخص المبيعات التابعة له.`
    );

    triggerMessage('success', `تم نقل ملكية العميل [${targetCust.name}] إلى المندوب [${newRepName}]، وتحديث جميع سجلات الزيارات المترتبة بنجاح!`);


  };

  // Helper helper to detect unregistered salesperson names
  function isCustomSalespersonName(name: string) {
    return !salesRepsList.includes(name);
  }

  // Clear all local database records
  const handleResetLocalStorage = (bypassConfirm = false) => {
    if (bypassConfirm !== true) {
      setConfirmModal({
        isOpen: true,
        title: 'تصفير قاعدة البيانات ⚠️',
        message: 'تحذير هام: سيقوم هذا الخيار بمسح جميع سجلات الزيارات والعملاء المسجلة محلياً في جهازك بالكامل وتصفير جداول الصفحة. هل تأمل الموافقة؟',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          handleResetLocalStorage(true);
        }
      });
      return;
    }
    setVisits([]);
    setCustomers([]);
    setDeletedVisitIds([]);
    try {
      localStorage.removeItem('sales_visit_crm_deleted_visit_ids');
    } catch (e) {
      console.warn(e);
    }
    setStoredData('visits', []);
    setStoredData('customers', []);
    triggerMessage('info', 'تم صفير وتأكيد قاعدة البيانات بنجاح.');
  };

  // Download directly as Excel-compatible CSV with UTF-8 BOM
  const handleDownloadExcel = () => {
    if (visits.length === 0) {
      triggerMessage('error', 'لا توجد أي سجلات حالياً لتصديرها كملف Excel!');
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic compatibility
    const headers = [
      "معرف الزيارة",
      "التاريخ والوقت",
      "اسم المندوب",
      "نوع الزيارة",
      "مصدر الزيارة",
      "اسم العميل",
      "الهاتف",
      "واتساب",
      "بريد العميل",
      "العنوان",
      "نوع النشاط / المجال",
      "حالة العميل الحالية",
      "الميزانية المقدرة (ر.س)",
      "تفاصيل / ملخص الزيارة والاهتمامات",
      "ملاحظات المتابعة / الخطوة التالية",
      "تاريخ المتابعة القادم"
    ];

    csvContent += headers.join(",") + "\n";

    visits.forEach(v => {
      const row = [
        v.id || "",
        v.timestamp ? new Date(v.timestamp).toLocaleString('ar-SA') : "",
        v.repName || "",
        v.visitType || "",
        v.visitSource || "زيارة ميدانية",
        v.customerName ? `"${v.customerName.replace(/"/g, '""')}"` : "",
        v.phone || "",
        v.whatsapp || "",
        v.email || "",
        v.province || "",
        v.activityType ? `"${v.activityType.replace(/"/g, '""')}"` : "",
        v.customerStatus || "",
        v.expectedOpportunityValue || 0,
        v.summary ? `"${v.summary.replace(/"/g, '""').replace(/\n/g, ' ')}"` : "",
        v.nextStep ? `"${v.nextStep.replace(/"/g, '""').replace(/\n/g, ' ')}"` : "",
        v.nextFollowUpDate || ""
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_مبيعات_اكسل_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerMessage('success', 'رائع! تم تحميل ملف الـ Excel (CSV) المتكامل والجاهز للاستخدام مطلعاً باللغة العربية بنجاح.');
  };

  // Helper function to parse CSV robustly with support for Arabic Excel (commas and semicolons)
  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    const firstLine = text.split('\n').find(l => l.trim().length > 0) || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const sep = semicolonCount > commaCount ? ';' : ',';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === sep && !inQuotes) {
        row.push(currentValue);
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue);
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          result.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    if (currentValue !== '' || row.length > 0) {
      row.push(currentValue);
      if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
        result.push(row);
      }
    }

    return result;
  };

  // Download empty template for bulk visits registration
  const handleDownloadTemplate = () => {
    const headers = [
      "رقم الزيارة (اتركه فارغاً لزيارة جديدة أو أدخل رقم زيارة موجود لتعديله)",
      "تاريخ الزيارة (اختياري مثال: 2026-06-18)",
      "اسم المندوب (مطلوب)",
      "نوع الزيارة (زيارة جديدة أو زيارة متابعة)",
      "مصدر الزيارة (زيارة ميدانية، بيانات عملاء، اعلان سوشيل مديا، ترشيح، غير ذلك)",
      "اسم العميل (مطلوب)",
      "الهاتف (مطلوب للجديدة)",
      "واتساب (اختياري)",
      "البريد الإلكتروني",
      "المحافظة",
      "نوع النشاط / المجال",
      "حالة العميل (عميل محتمل، مهتم جداً، متعاقد، غير مهتم)",
      "الميزانية المتوقعة (أرقام فقط)",
      "ملخص الزيارة والاهتمامات",
      "الخطوة التالية",
      "تاريخ المتابعة القادم (مثال: 2026-06-25)"
    ];

    const sampleRow1 = [
      "VIS-101",
      "2026-06-18",
      "حسام عيد",
      "زيارة جديدة",
      "زيارة ميدانية",
      "شركة العناية الطبية المحدودة",
      "0555555552",
      "0555555552",
      "contact@medicalcare.com",
      "الرياض",
      "مستلزمات طبية",
      "عميل محتمل",
      "25000",
      "العميل يطلب نظام حجز ذكي ومتابعة مبيعات متكاملة لعياداته",
      "تجهيز عرض سعر نظام الحجز وإرساله غداً صباحاً",
      "2026-06-25"
    ];

    const sampleRow2 = [
      "",
      "2026-06-18",
      "مهند",
      "زيارة متابعة",
      "بيانات عملاء",
      "شركة الرواد للتجارة",
      "0544444441",
      "",
      "",
      "جدة",
      "تجارة عامة",
      "مهتم جداً",
      "12000",
      "جلسة نقاش ثانية لتوضيح تفاصيل العقد والدعم الفني",
      "مراجعة التعديلات النهائية على مسودة العقد قبل التوقيع",
      "2026-06-22"
    ];

    const data = [headers, sampleRow1, sampleRow2];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths so text is perfectly readable
    worksheet['!cols'] = [
      { wch: 18 }, // ID
      { wch: 15 }, // Date
      { wch: 18 }, // Rep
      { wch: 15 }, // Type
      { wch: 18 }, // Source
      { wch: 25 }, // Customer
      { wch: 15 }, // Phone
      { wch: 15 }, // Whatsapp
      { wch: 25 }, // Email
      { wch: 12 }, // Province
      { wch: 18 }, // Activity
      { wch: 15 }, // Status
      { wch: 15 }, // Budget
      { wch: 35 }, // Summary
      { wch: 35 }, // Next step
      { wch: 15 }  // Follow up
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "نموذج تسجيل الزيارات");
    
    // Write in binary XLSX format
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "نموذج_تسجيل_الزيارات_الجماعي.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerMessage('success', 'رائع! تم تنزيل شيت Excel (.xlsx) المنسق كنموذج جاهز لتعبئة مبيعاتك وزياراتك دفعة واحدة وبدقة كاملة للغة العربية.');
  };

  // Upload and Parse Template Excel (.xlsx, .xls) and CSV files
  const handleUploadCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let rows: string[][] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse with xlsx package
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet structure to raw 2D array
        const rawJson = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        rows = rawJson.map((r: any) => {
          if (Array.isArray(r)) {
            return r.map(cell => String(cell ?? "").trim());
          }
          return [];
        });
      } else {
        // Text CSV file fallback
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string || '');
          reader.onerror = (err) => reject(err);
          reader.readAsText(file, 'utf-8');
        });

        if (!text) {
          triggerMessage('error', 'الملف المحدد فارغ أو غير متوافق!');
          return;
        }

        rows = parseCSV(text);
      }

      if (rows.length <= 1) {
        triggerMessage('error', 'لا توجد صفوف بيانات كافية للاستيراد في الملف!');
        return;
      }

      // Detect headers inside rows[0]
      const fileHeaders = rows[0].map(h => String(h || "").trim());
      
      // Let's search if "رقم الزيارة" is among the headers, or if any cells match keywords
      let idIdx = fileHeaders.findIndex(h => h.includes("رقم الزيارة") || h.includes("معرف الزيارة") || h.toLowerCase() === "id" || h.toLowerCase() === "رقم_الزيارة");
      let dateIdx = fileHeaders.findIndex(h => h.includes("تاريخ الزيارة") || (h.includes("تاريخ") && !h.includes("المتابعة")) || h.toLowerCase() === "date" || h.toLowerCase() === "تاريخ");
      let repIdx = fileHeaders.findIndex(h => h.includes("اسم المندوب") || h.includes("المندوب") || h.toLowerCase().includes("rep") || h.toLowerCase().includes("user"));
      let typeIdx = fileHeaders.findIndex(h => h.includes("نوع الزيارة") || h.toLowerCase().includes("type"));
      let sourceIdx = fileHeaders.findIndex(h => h.includes("مصدر الزيارة") || h.toLowerCase().includes("source"));
      let customerIdx = fileHeaders.findIndex(h => h.includes("اسم العميل") || h.includes("العميل") || h.toLowerCase().includes("customer") || h.toLowerCase().includes("client") || h.toLowerCase() === "اسم_العميل");
      let phoneIdx = fileHeaders.findIndex(h => h.includes("الهاتف") || h.includes("تلفون") || h.includes("رقم الموبايل") || h.toLowerCase().includes("phone") || h.toLowerCase().includes("mobile") || h.toLowerCase() === "الهاتف");
      let whatsappIdx = fileHeaders.findIndex(h => h.includes("واتساب") || h.includes("الواتس") || h.toLowerCase().includes("whatsapp"));
      let emailIdx = fileHeaders.findIndex(h => h.includes("البريد") || h.includes("إيميل") || h.toLowerCase().includes("email"));
      let provinceIdx = fileHeaders.findIndex(h => h.includes("المحافظة") || h.includes("المنطقة") || h.toLowerCase().includes("province") || h.toLowerCase().includes("city"));
      let activityIdx = fileHeaders.findIndex(h => h.includes("النشاط") || h.includes("المجال") || h.toLowerCase().includes("activity"));
      let statusIdx = fileHeaders.findIndex(h => h.includes("حالة") || h.includes("الحالة") || h.toLowerCase().includes("status"));
      let budgetIdx = fileHeaders.findIndex(h => h.includes("الميزانية") || h.includes("القيمة") || h.toLowerCase().includes("budget") || h.toLowerCase().includes("value") || h.toLowerCase().includes("opportunity"));
      let summaryIdx = fileHeaders.findIndex(h => h.includes("ملخص") || h.includes("الاهتمامات") || h.toLowerCase().includes("summary") || h.toLowerCase().includes("notes"));
      let nextStepIdx = fileHeaders.findIndex(h => h.includes("الخطوة التالية") || h.includes("الإجراء القادم") || h.toLowerCase().includes("step"));
      let followUpDateIdx = fileHeaders.findIndex(h => h.includes("تاريخ المتابعة") || h.toLowerCase().includes("follow"));

      // Standard positions based on header sizes if not detected
      const hasIdCol = idIdx !== -1 || fileHeaders[0]?.includes("رقم");

      if (customerIdx === -1) {
        if (hasIdCol) {
          idIdx = 0; dateIdx = 1; repIdx = 2; typeIdx = 3; sourceIdx = 4; customerIdx = 5;
          phoneIdx = 6; whatsappIdx = 7; emailIdx = 8; provinceIdx = 9; activityIdx = 10;
          statusIdx = 11; budgetIdx = 12; summaryIdx = 13; nextStepIdx = 14; followUpDateIdx = 15;
        } else {
          idIdx = -1; dateIdx = 0; repIdx = 1; typeIdx = 2; sourceIdx = 3; customerIdx = 4;
          phoneIdx = 5; whatsappIdx = 6; emailIdx = 7; provinceIdx = 8; activityIdx = 9;
          statusIdx = 10; budgetIdx = 11; summaryIdx = 12; nextStepIdx = 13; followUpDateIdx = 14;
        }
      }

      // Check if first row is a header is true to skip
      let startIdx = 1;

      const parsedVisits: Visit[] = [];
      let skippedCount = 0;

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) {
          continue;
        }

        const valAtIndex = (idx: number, fallback: string = "") => {
          if (idx === -1 || idx >= row.length) return fallback;
          return String(row[idx] ?? "").trim();
        };

        const visitIdInput = valAtIndex(idIdx);
        const rawDate = valAtIndex(dateIdx);
        const repNameInput = valAtIndex(repIdx);
        const parsedTypeRaw = valAtIndex(typeIdx);
        const visitTypeInput: VisitType = (parsedTypeRaw === "زيارة تابعة" || parsedTypeRaw === "زيارة متابعة") ? "زيارة متابعة" : "زيارة جديدة";
        const visitSourceInputRaw = valAtIndex(sourceIdx);
        const visitSourceInput: VisitSource = ['زيارة ميدانية', 'بيانات عملاء', 'اعلان سوشيل مديا', 'ترشيح', 'غير ذلك'].includes(visitSourceInputRaw)
          ? (visitSourceInputRaw as VisitSource)
          : 'زيارة ميدانية';
        const clientNameInput = valAtIndex(customerIdx);
        const phoneInput = valAtIndex(phoneIdx);
        const whatsappInput = valAtIndex(whatsappIdx) || phoneInput;
        const emailInput = valAtIndex(emailIdx);
        const provinceInput = valAtIndex(provinceIdx);
        const activityInput = valAtIndex(activityIdx);
        const statusInputRaw = valAtIndex(statusIdx);
        const statusInput: CustomerStatus = ['عميل محتمل', 'مهتم جداً', 'متعاقد', 'غير مهتم'].includes(statusInputRaw)
          ? (statusInputRaw as CustomerStatus)
          : 'عميل محتمل';
        const budgetInput = Number(valAtIndex(budgetIdx).replace(/[^0-9.]/g, '')) || 0;
        const summaryInput = valAtIndex(summaryIdx);
        const nextStepInput = valAtIndex(nextStepIdx);
        const followUpDateInput = valAtIndex(followUpDateIdx);

        // Skip placeholder / header samples
        if (!clientNameInput || clientNameInput.includes("شركة العناية") || clientNameInput.includes("الرواد للتجارة") || clientNameInput.includes("مطلوب")) {
          if (!clientNameInput) {
            skippedCount++;
          }
          continue;
        }

        // Generate or validate timestamp
        let visitTimestamp = new Date().toISOString();
        if (rawDate) {
          const parsedMs = Date.parse(rawDate);
          if (!isNaN(parsedMs)) {
            visitTimestamp = new Date(parsedMs).toISOString();
          }
        }

        // Determine Visit ID
        let visitId = visitIdInput;
        if (!visitId) {
          visitId = `VIS-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
        }

        const newVisit: Visit = {
          id: visitId,
          timestamp: visitTimestamp,
          repId: `REP-CSV-${Math.floor(Math.random() * 1000)}`,
          repName: repNameInput || "مندوب مبيعات خارجي",
          visitType: visitTypeInput,
          visitSource: visitSourceInput,
          customerName: clientNameInput,
          activityType: activityInput,
          contactPerson: "--",
          phone: phoneInput,
          whatsapp: whatsappInput,
          email: emailInput,
          province: provinceInput,
          summary: summaryInput,
          needs: "",
          interestLevel: "متوسط",
          nextStep: nextStepInput,
          nextFollowUpDate: followUpDateInput,
          customerStatus: statusInput,
          expectedOpportunityValue: budgetInput
        };

        parsedVisits.push(newVisit);
      }

      if (parsedVisits.length === 0) {
        triggerMessage('error', `لم يتم استيراد أي زيارات جديدة! تأكد من التنسيق وإضافة بيانات صحيحة.`);
        return;
      }

      // Merge state - respect Visit ID
      const updatedVisits = [...visits];
      let addCount = 0;
      let editCount = 0;

      parsedVisits.forEach(newV => {
        const index = updatedVisits.findIndex(v => v.id === newV.id);
        if (index !== -1) {
          // Update the existing visit with that ID!
          updatedVisits[index] = newV;
          editCount++;
        } else {
          // Insert as brand new visit
          updatedVisits.unshift(newV);
          addCount++;
        }
      });

      setVisits(updatedVisits);
      setStoredData('visits', updatedVisits);

      // Update customer statistics
      let updatedCustomers = [...customers];
      parsedVisits.forEach(v => {
        const clientNameLower = v.customerName.toLowerCase();
        const customerIndex = updatedCustomers.findIndex(c => c.name.toLowerCase() === clientNameLower);
        
        if (customerIndex === -1) {
          // Register as a new Customer
          const newCustId = generateUniqueCustId(updatedCustomers);
          const newCustomer: Customer = {
            id: newCustId,
            name: v.customerName,
            activity: v.activityType || '--',
            requestedProduct: '',
            contactPerson: '--',
            phone: v.phone,
            whatsapp: v.whatsapp,
            email: v.email,
            address: '',
            province: v.province,
            firstVisitDate: v.timestamp.split('T')[0],
            lastVisitDate: v.timestamp.split('T')[0],
            visitsCount: 1,
            currentStatus: v.customerStatus,
            opportunityValue: v.expectedOpportunityValue
          };
          updatedCustomers = [newCustomer, ...updatedCustomers];
        } else {
          // Update existing record
          const existing = updatedCustomers[customerIndex];
          updatedCustomers[customerIndex] = {
            ...existing,
            lastVisitDate: v.timestamp.split('T')[0],
            visitsCount: existing.visitsCount + 1,
            currentStatus: v.customerStatus,
            opportunityValue: v.expectedOpportunityValue > 0 ? v.expectedOpportunityValue : existing.opportunityValue
          };
        }
      });
      setCustomers(updatedCustomers);
      setStoredData('customers', updatedCustomers);

      const totalProcessed = parsedVisits.length;

      // Save newly imported records to the Firestore Database
      const token = localStorage.getItem('sales_visit_crm_auth_token');
      if (token) {
        parsedVisits.forEach(v => {
          fetch('/api/visits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ visit: v })
          }).catch(err => console.error(err));
        });

        updatedCustomers.forEach(cust => {
          fetch(`/api/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ customer: cust })
          }).catch(err => console.error(err));
        });
      }

      triggerMessage('success', `تم استيراد وتسجيل ${totalProcessed} زيارة بنجاح (تم إنشاء ${addCount} وتعديل ${editCount}) وحفظها في قاعدة بيانات Firestore السحابية!`);

      // Clean file input
      if (e.target) e.target.value = '';

    } catch (err: any) {
      console.error("Excel/CSV Read Error:", err);
      triggerMessage('error', `حدث خطأ أثناء فحص وقراءة ملف البيانات: ${err.message}`);
    }
  };

  // Form submission handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalizedCustomerName = visitType === 'زيارة جديدة' 
      ? customerName.trim() 
      : existingCustomerName.trim();

    if (!finalizedCustomerName) {
      triggerMessage('error', 'يرجى إدخال اسم العميل أولاً لإتمام التسجيل.');
      return;
    }

    const actualRepName = isCustomRep ? customRepName.trim() : repName;
    if (!actualRepName) {
      triggerMessage('error', 'يرجى تحديد أو إدخال اسم المندوب.');
      return;
    }

    const originalVisit = editModeVisitId ? visits.find(v => v.id === editModeVisitId) : null;
    const resolvedIsSubmitted = true; // All visits are fully saved and active directly, draft mode is removed

    const timestampForVisit = editModeVisitId 
      ? originalVisit?.timestamp || new Date().toISOString()
      : new Date().toISOString();

    // Build standard visit payload matching database interface
    const newVisit: Visit = {
      id: editModeVisitId || `VIS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timestampForVisit,
      repId: isCustomRep ? 'REP-CUSTOM' : `REP-0${salesRepsList.indexOf(repName) + 1}`,
      repName: actualRepName,
      visitSource: visitSource,
      visitType: visitType,
      customerName: finalizedCustomerName,
      activityType: visitType === 'زيارة جديدة' ? activityType : 'زيارة تابعة',
      requestedProduct: visitType === 'زيارة جديدة' ? requestedProduct : '',
      contactPerson: contactPerson,
      jobTitle: jobTitle,
      phone: phone,
      whatsapp: whatsapp || phone,
      email: email,
      province: province,
      summary: visitType === 'زيارة جديدة' ? summary : followUpNotes,
      needs: needs,
      interestLevel: interestLevel,
      nextStep: nextStep,
      nextFollowUpDate: nextFollowUpDate,
      customerStatus: customerStatus,
      expectedOpportunityValue: Number(opportunityValue) || 0,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      isSubmitted: resolvedIsSubmitted
    };

    if (currentUser?.role === 'Admin' && originalVisit) {
      logAdminAction('edit', originalVisit, newVisit);
    }

    // Update state and save
    let updatedVisits = [...visits];
    if (editModeVisitId) {
      const idx = updatedVisits.findIndex(v => v.id === editModeVisitId);
      if (idx !== -1) {
        updatedVisits[idx] = newVisit;
      }
    } else {
      updatedVisits = [newVisit, ...visits];
    }
    setVisits(updatedVisits);
    setStoredData('visits', updatedVisits);

    // Track/update customer database record via stable recomputation
    const updatedCustomers = recomputeCustomersFromVisits(updatedVisits, customers);
    setCustomers(updatedCustomers);
    setStoredData('customers', updatedCustomers);

    // Force real-time persistence of visit and recalculated customer records into Firestore DB
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token) {
      const url = editModeVisitId ? `/api/visits/${editModeVisitId}` : '/api/visits';
      const method = editModeVisitId ? 'PUT' : 'POST';
      fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ visit: newVisit })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          console.log("Visit saved to Cloud database.");
        }
      })
      .catch(err => console.error(err));

      // Sync customer profiles with Cloud Firestore Database
      updatedCustomers.forEach(cust => {
        fetch(`/api/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ customer: cust })
        }).catch(err => console.error(err));
      });
    }

    triggerMessage('success', 'تم حفظ زيارة العميل ومخرجات البيانات ونقلها لسحابة Firestore بنجاح!');

    // Reset Form Fields
    setCustomerName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setContactPerson('');
    setJobTitle('');
    setSummary('');
    setNeeds('');
    setOpportunityValue('0');
    setVisitSource('زيارة ميدانية');
    setExistingCustomerName('');
    setFollowUpNotes('');
    setNextStep('');
    setNextFollowUpDate('');
    setLatitude(null);
    setLongitude(null);
    setEditModeVisitId(null);
  };



  const filteredVisits = visits.filter(v => {
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = !query || (
      (v.customerName && v.customerName.toLowerCase().includes(query)) ||
      (v.repName && v.repName.toLowerCase().includes(query)) ||
      (v.phone && v.phone.includes(query)) ||
      (v.province && v.province.toLowerCase().includes(query)) ||
      (v.id && v.id.toLowerCase().includes(query))
    );

    const matchesType = selectedVisitTypeFilter === 'الكل' || v.visitType === selectedVisitTypeFilter;
    const matchesRep = selectedRepFilter === 'الكل' || v.repName === selectedRepFilter;
    const matchesStatus = selectedStatusFilter === 'الكل' || v.customerStatus === selectedStatusFilter;
    const matchesProduct = selectedProductFilter === 'الكل' || v.requestedProduct === selectedProductFilter;

    return matchesSearch && matchesType && matchesRep && matchesStatus && matchesProduct;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center" dir="rtl">
        <LoginOverlay 
          onLoginSuccess={(user, token) => {
            localStorage.setItem('sales_visit_crm_auth_token', token);
            localStorage.setItem('sales_visit_crm_user', JSON.stringify(user));
            setCurrentUser(user);
          }}
          triggerMessage={triggerMessage}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans select-none" dir="rtl">
      
      {/* SELECT CODE BRANDED HEADER & RESPONSIVE NAVIGATION */}
      <SelectCodeHeader
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifsCount={unreadNotifsCount}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        handleLogout={handleLogout}
        getIsTabAllowed={getIsTabAllowed}
        companyLogo={companyLogo}
        onUpdateLogo={handleUpdateLogo}
        triggerMessage={triggerMessage}
      />

      {/* GLOBAL NOTIFICATION BAR */}
      {infoMessage && (
        <div className="px-6 pt-4">
          <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all text-right animate-fadeIn ${
            infoMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-150 text-emerald-900' 
              : infoMessage.type === 'error' 
                ? 'bg-rose-50 border-rose-150 text-rose-900'
                : 'bg-teal-50 border-teal-150 text-teal-900'
          }`}>
            {infoMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : infoMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-bold font-sans leading-relaxed">
              {infoMessage.text}
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO COLUMN WORKSPACE OR REPORTS */}
      {!getIsTabAllowed(currentUser.role, activeTab) ? (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <div className="bg-white border border-rose-150 rounded-3xl p-8 shadow-md text-center max-w-xl mx-auto space-y-6 my-12" dir="rtl">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600 animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2 text-right">
              <h2 className="text-xl font-black text-rose-700 text-center">عذراً، محاولة وصول غير مصرحة! (Access Denied)</h2>
              <p className="text-xs text-slate-600 leading-relaxed font-bold text-center mt-2">
                ليس لديك الصلاحيات الكافية لزيارة قسم <span className="text-rose-600 font-extrabold font-mono">"{activeTab}"</span> بموجب دورك الوظيفي الحالي: 
                <span className="text-indigo-600 font-extrabold font-sans">
                  {currentUser.role === 'Manager' ? ' مدير قسم' : 
                   currentUser.role === 'TechnicalSupport' ? ' موظف دعم فني' : 
                   currentUser.role === 'Monitoring' ? ' موظف مراقبة وجلسات' : 
                   currentUser.role === 'User' ? ' مندوب مبيعات' :
                   ' موظف غير معروف'}
                </span>.
              </p>
            </div>
            <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl text-right text-[11px] text-rose-800 leading-normal font-bold">
              🔒 تم حظر هذا الإجراء تلقائياً بواسطة نظام الحماية وجدار الأمان الخاص بـ CRM. لقد تم تسجيل هذه المحاولة في سجل التدقيق الأمني لمدير النظام.
            </div>
            <button
              onClick={() => {
                if (currentUser.role === 'TechnicalSupport') {
                  setActiveTab('support');
                } else if (currentUser.role === 'Monitoring') {
                  setActiveTab('monitoring');
                } else {
                  setActiveTab('register');
                }
              }}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
            >
              <span>العودة إلى القسم الآمن والمصرح لك به ⏎</span>
            </button>
          </div>
        </main>
      ) : activeTab === 'reports' ? (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <ReportsView 
            visits={visits}
            customers={customers}
            salesReps={salesReps}
            token={localStorage.getItem('sales_visit_crm_auth_token') || ''}
            onTransferSuccess={handleTransferSuccess}
            triggerMessage={triggerMessage}
          />
        </main>
      ) : activeTab === 'rbac_users' && currentUser.role === 'Admin' ? (
        <AdminRBACPanel 
          salesRepsList={rawSalesRepsList} 
          currentUser={currentUser} 
          triggerMessage={triggerMessage} 
          softDeletedVisits={softDeletedVisits}
          onRestoreVisit={handleRestoreVisit}
          onAddSalesRep={handleAddSalesRep}
          onEditSalesRep={handleEditSalesRep}
          onRemoveSalesRep={handleRemoveSalesRep}
          customers={customers}
          visits={visits}
          onTransferSuccess={handleTransferSuccess}
          companyLogo={companyLogo}
          onUpdateLogo={handleUpdateLogo}
        />
      ) : activeTab === 'support' ? (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <TechnicalSupportView 
            currentUser={currentUser} 
            customers={customers} 
            token={localStorage.getItem('sales_visit_crm_auth_token') || ''} 
          />
        </main>
      ) : activeTab === 'monitoring' ? (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <MonitoringView 
            currentUser={currentUser} 
            customers={customers} 
            token={localStorage.getItem('sales_visit_crm_auth_token') || ''} 
            salesRepsList={rawSalesRepsList.filter(name => name !== 'أخرى')}
          />
        </main>
      ) : activeTab === 'reports_center' ? (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <ReportsCenter 
            currentUser={currentUser} 
            token={localStorage.getItem('sales_visit_crm_auth_token') || ''} 
          />
        </main>
      ) : activeTab === 'notifications' ? (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <NotificationsCenter 
            currentUser={currentUser} 
            token={localStorage.getItem('sales_visit_crm_auth_token') || ''} 
            onNotificationReadCountChange={(count) => setUnreadNotifsCount(count)}
          />
        </main>
      ) : activeTab === 'register' ? (
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* DAILY FOLLOW-UP ALERTS SECTION */}
        {(currentUser.role !== 'TechnicalSupport' && currentUser.role !== 'Monitoring') && (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          
          const relevantVisits = visits.filter(v => {
            if (!v.nextFollowUpDate) return false;

            // Check if there is a newer visit recorded for this customer in visits
            const hasSubsequentVisit = visits.some(otherV => {
              if (otherV.customerName !== v.customerName || otherV.id === v.id) return false;
              const otherMs = parseDateTimeToMs(otherV.timestamp);
              const thisMs = parseDateTimeToMs(v.timestamp);
              if (otherMs > thisMs) return true;
              if (otherMs === thisMs) {
                return visits.indexOf(otherV) > visits.indexOf(v);
              }
              return false;
            });
            if (hasSubsequentVisit) return false;

            const isClosed = v.customerStatus === 'تم التعاقد' || v.customerStatus === 'غير مهتم';
            return !isClosed;
          });

          const activeAlerts = relevantVisits.filter(v => {
            return !v.reminderDismissed && v.nextFollowUpDate! <= todayStr;
          }).sort((a, b) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || ''));

          const dismissedAlerts = relevantVisits.filter(v => {
            return !!v.reminderDismissed;
          }).sort((a, b) => (b.reminderDismissedAt || '').localeCompare(a.reminderDismissedAt || ''));

          return (
            <div className="bg-white border border-slate-100/90 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-rose-100 pb-3 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                    <Bell className="w-5 h-5 text-rose-600 shrink-0" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-black text-slate-900">تنبيهات المتابعة اليومية والعملاء المستحقين</h3>
                    <p className="text-[10px] text-slate-500 font-bold">العملاء والصفقات المخطط الاتصال بهم اليوم أو تجاوزوا الموعد المحدد</p>
                  </div>
                </div>

                {/* Tabs to toggle between Active alerts and Manually Dismissed alerts */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAlertsTab('active')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      alertsTab === 'active'
                        ? 'text-rose-700 bg-rose-50 border border-rose-200'
                        : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <span>تنبيهات نشطة ({activeAlerts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertsTab('dismissed')}
                    className={`text-[10px] px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      alertsTab === 'dismissed'
                        ? 'text-slate-900 bg-slate-100 border border-slate-300'
                        : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-transparent'
                    }`}
                    title="عرض التنبيهات التي تم إلغاؤها أو إزالتها يدوياً مع إمكانية استعادتها"
                  >
                    <BellOff className="w-3 h-3 text-slate-400" />
                    <span>تنبيهات مزالة يدوياً ({dismissedAlerts.length})</span>
                  </button>
                </div>
              </div>

              {alertsTab === 'active' ? (
                activeAlerts.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 font-bold text-xs flex flex-col items-center justify-center gap-2 opacity-90">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <span>🎉 كل المتابعات مكتملة! لا توجد مواعيد مستحقة فائتة أو مجدولة لليوم. عمل رائع!</span>
                    {dismissedAlerts.length > 0 && (
                      <p className="text-[10px] text-slate-400 font-medium">
                        (هناك {dismissedAlerts.length} تنبيهات تمت إزالتها يدوياً يمكنك مراجعتها أو استعادتها من تبويب "تنبيهات مزالة يدوياً")
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeAlerts.map((v) => {
                      const isOverdue = v.nextFollowUpDate! < todayStr;
                      
                      return (
                        <div 
                          key={v.id} 
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-right ${
                            isOverdue 
                              ? 'bg-rose-50/40 border-rose-200/50 hover:bg-rose-50' 
                              : 'bg-amber-50/40 border-amber-200/50 hover:bg-amber-50'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[11px] font-black text-slate-800">{v.customerName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                                isOverdue 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isOverdue ? '⚠️ متأخرة' : '📆 موعد اليوم'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-550 font-bold font-sans">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">المندوب: {v.repName}</span>
                              </div>
                              <div className="flex items-center gap-1 font-mono justify-end">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span dir="ltr">{v.nextFollowUpDate}</span>
                              </div>
                            </div>

                            {v.nextStep && (
                              <p className="text-[10px] text-slate-700 leading-relaxed font-bold border-t border-dashed border-slate-100 pt-1.5 mt-1">
                                <span className="text-teal-700">الخطوة القادمة:</span> {v.nextStep}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 items-center justify-between border-t border-slate-100/40 pt-2 shrink-0">
                            {/* Manual Dismiss Reminder Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setDismissingReminderVisit(v);
                                setDismissReasonInput('');
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200/80 font-black text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="إزالة هذا التذكير يدوياً من التنبيهات النشطة"
                            >
                              <BellOff className="w-2.5 h-2.5 shrink-0 text-rose-600" />
                              <span>إزالة التذكير</span>
                            </button>

                            <div className="flex gap-1.5 items-center">
                              {v.phone && (
                                <a
                                  href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <span>واتساب</span>
                                </a>
                              )}
                              {v.latitude && v.longitude && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  <span>خرائط</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Dismissed Alerts List */
                dismissedAlerts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-bold text-xs flex flex-col items-center justify-center gap-2">
                    <Bell className="w-7 h-7 text-slate-400" />
                    <span>لا توجد أي تذكيرات تمت إزالتها يدوياً حتى الآن.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dismissedAlerts.map((v) => {
                      return (
                        <div 
                          key={v.id} 
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3 text-right"
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[11px] font-black text-slate-800">{v.customerName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 bg-slate-200 text-slate-700 flex items-center gap-1">
                                <BellOff className="w-2.5 h-2.5" />
                                <span>تمت الإزالة يدوياً</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-bold font-sans">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">المندوب: {v.repName}</span>
                              </div>
                              <div className="flex items-center gap-1 font-mono justify-end">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span dir="ltr">{v.nextFollowUpDate}</span>
                              </div>
                            </div>

                            {v.reminderDismissReason && (
                              <div className="p-2 bg-white rounded-xl border border-slate-200/70 text-[9.5px] text-slate-700 space-y-0.5 mt-1">
                                <div className="font-black text-rose-750">سبب الإزالة:</div>
                                <div className="font-sans leading-relaxed">{v.reminderDismissReason}</div>
                                {v.reminderDismissedBy && (
                                  <div className="text-[8.5px] text-slate-400 font-mono pt-1">
                                    بواسطة: {v.reminderDismissedBy} {v.reminderDismissedAt ? `(${new Date(v.reminderDismissedAt).toLocaleDateString('ar-EG')})` : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreReminder(v.id)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-black text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="استعادة هذا التذكير وإعادته للتنبيهات النشطة"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                              <span>استعادة التذكير النشط ↺</span>
                            </button>

                            {v.phone && (
                              <a
                                href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>واتساب</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          );
        })()}

        {/* Sales Rep Tasks from Monitoring & Quality Department */}
        {userMonitoringRepTasks.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-blue-50/50 border border-indigo-100 rounded-3xl p-6 shadow-xs relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-indigo-100/70 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span>مهام وتكليفات واردة من قسم المتابعة والجودة</span>
                    {pendingUserRepTasks.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                        {pendingUserRepTasks.length} بانتظار الإنجاز
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    تكليفات ميدانية موجهة للمندوب بناءً على نتائج مكالمات الجودة ورضى العملاء
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-bold">
                إجمالي التكليفات: {userMonitoringRepTasks.length} مهمة
              </div>
            </div>

            {/* Rep Tasks Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {userMonitoringRepTasks.map(task => {
                const isOverdue = task.dueDate && new Date(task.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && task.status !== 'Completed';
                const isCompleted = task.status === 'Completed';

                return (
                  <div 
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all text-right ${
                      isCompleted 
                        ? 'bg-emerald-50/40 border-emerald-100 opacity-80' 
                        : isOverdue 
                        ? 'bg-rose-50/60 border-rose-200 shadow-sm' 
                        : 'bg-white border-indigo-100 shadow-sm hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          task.priority === 'Urgent' ? 'bg-rose-600 text-white' :
                          task.priority === 'High' ? 'bg-amber-500 text-white' :
                          task.priority === 'Medium' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {task.priority === 'Urgent' ? '🔴 عاجل جداً' :
                           task.priority === 'High' ? '🟠 مرتفع' :
                           task.priority === 'Medium' ? '🔵 متوسط' : '⚪ عادي'}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {task.status === 'Completed' ? '✓ تم الإنجاز' :
                           task.status === 'In Progress' ? '⌛ قيد التنفيذ' :
                           '⏳ بانتظار البدء'}
                        </span>

                        <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                          {task.taskType}
                        </span>
                      </div>

                      {task.dueDate && (
                        <span className={`text-[10px] font-mono font-bold ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                          📅 {task.dueDate}
                        </span>
                      )}
                    </div>

                    {/* Task Title & Customer */}
                    <div className="mt-2.5">
                      <h4 className="text-xs font-black text-slate-800 leading-snug">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-900">👤 العميل: {task.customerName}</span>
                        {task.customerPhone && (
                          <span className="font-mono text-slate-500 text-[10px]">({task.customerPhone})</span>
                        )}
                      </div>
                    </div>

                    {/* Description / Instructions */}
                    {task.description && (
                      <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-indigo-900 block mb-0.5 font-bold">توجيهات قسم الجودة:</strong>
                        <p className="whitespace-pre-line leading-relaxed">{task.description}</p>
                      </div>
                    )}

                    {/* Rep Feedback if completed */}
                    {task.repFeedback && (
                      <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                        <strong className="block mb-0.5 font-bold">إفادة وتقرير المندوب:</strong>
                        <p className="whitespace-pre-line leading-relaxed">{task.repFeedback}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {task.customerPhone && (
                          <a
                            href={`https://wa.me/${task.customerPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>واتساب العميل</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePrefillVisitFromRepTask(task)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-black text-[10px] rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>تسجيل زيارة للعميل 📋</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {task.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleStartRepTask(task)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-xl transition-all cursor-pointer"
                          >
                            بدء التنفيذ
                          </button>
                        )}

                        {task.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRepTaskFeedback(task)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            تسجيل إنجاز التكليف
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TWO COLUMN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMN 1: INTENSIVE REPORT ENTRY FORM (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
          <div id="visit-entry-form-container" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs relative">
            
            {editModeVisitId && (
              <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200/75 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-right">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Edit className="w-4 h-4 text-amber-750" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900">أنت الآن في وضع تعديل بيانات الزيارة</h4>
                    <p className="text-[10px] text-amber-700/90 font-bold font-mono">الرقم المعرف: #{editModeVisitId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-3xs"
                >
                  إلغاء التعديل ✕
                </button>
              </div>
            )}
            
            {/* Branded Title Banner */}
            <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-teal-600 tracking-wider font-mono">INTAKE DATA ENTRY_</span>
                <h2 className="text-base font-black text-slate-900">استمارة تسجيل تفاصيل الزيارة</h2>
              </div>
              <span className="text-xs text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-lg">التاريخ والوقت تلقائي</span>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              {/* 1. Visit Type Selector */}
              <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setVisitType('زيارة جديدة')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    visitType === 'زيارة جديدة'
                      ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ➕ زيارة جديدة لعميل (أول لقاء)
                </button>
                <button
                  type="button"
                  onClick={() => setVisitType('زيارة متابعة')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    visitType === 'زيارة متابعة'
                      ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🔄 زيارة متابعة (إكمال عقد/تعديل)
                </button>
              </div>

              {/* 2. Representative Name Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>المندوب المسؤول:</span>
                  </label>
                  {!isCustomRep ? (
                    <select
                      value={repName}
                      onChange={(e) => {
                        if (e.target.value === 'أخرى') {
                          setIsCustomRep(true);
                          setCustomRepName('');
                        } else {
                          setRepName(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                    >
                      {salesRepsList.map(rep => (
                        <option key={rep} value={rep}>{rep}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="اكتب اسم المندوب هنا..."
                        value={customRepName}
                        onChange={(e) => setCustomRepName(e.target.value)}
                        className="flex-1 text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomRep(false);
                          setRepName(salesRepsList[0]);
                        }}
                        className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Customer Name */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>اسم الشركة / المحل التجاري:</span>
                  </label>
                  {visitType === 'زيارة جديدة' ? (
                    <input
                      type="text"
                      placeholder="مثال: شركة المنارة للمقاولات"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                      required
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث بالحروف الأولى لاسم الشركة أو برقم الهاتف..."
                        value={existingCustomerName}
                        onChange={(e) => {
                          setExistingCustomerName(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 250)}
                        className="w-full text-xs font-bold p-3 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all text-right"
                        required
                        autoComplete="off"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      
                      {/* Search results dropdown listing */}
                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100/70">
                          {filteredExistingCustomers.length === 0 ? (
                            <div className="p-4 text-xs text-slate-400 text-center font-bold">
                              لا يوجد عملاء يطابقون بحثك (بالاسم أو برقم الهاتف)
                            </div>
                          ) : (
                            filteredExistingCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => {
                                  setExistingCustomerName(c.name);
                                  setCustomerStatus(c.currentStatus);
                                  // Pre-populate other fields with selected customer details to save agent time
                                  if (c.phone) setPhone(c.phone);
                                  if (c.whatsapp) setWhatsapp(c.whatsapp);
                                  if (c.province) setProvince(c.province);
                                  if (c.activity) setActivityType(c.activity);
                                  if (c.requestedProduct) setRequestedProduct(c.requestedProduct);
                                  if (c.contactPerson) setContactPerson(c.contactPerson);
                                  if (c.latitude) setLatitude(c.latitude);
                                  if (c.longitude) setLongitude(c.longitude);
                                  setIsDropdownOpen(false);
                                }}
                                className="w-full text-right p-3 hover:bg-teal-50/50 transition-colors flex items-center justify-between gap-3 cursor-pointer text-xs"
                              >
                                <div className="flex flex-col gap-1 text-right">
                                  <span className="font-black text-slate-900">{c.name}</span>
                                  {c.phone && (
                                    <span className="text-[10px] text-teal-600 font-bold font-mono flex items-center gap-1 justify-end">
                                      <span dir="ltr">{c.phone}</span>
                                      <span>📞</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                                    📍 {c.province || 'لا يوجد عنوان'}
                                  </span>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold ${
                                    c.currentStatus === 'تم التعاقد' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-teal-50 text-teal-700 border border-teal-100'
                                  }`}>
                                    {c.currentStatus}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Visit Source (مصدر الزيارة) - Only render for new visits */}
              {visitType === 'زيارة جديدة' && (
                <div className="space-y-2 mt-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-teal-600 rotate-45" />
                    <span>مصدر الزيارة:</span>
                  </label>
                  <select
                    value={visitSource}
                    onChange={(e) => setVisitSource(e.target.value as VisitSource)}
                    className="w-full p-3 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
                  >
                    <option value="زيارة ميدانية">زيارة ميدانية</option>
                    <option value="بيانات عملاء">بيانات عملاء</option>
                    <option value="اعلان سوشيل مديا">اعلان سوشيل مديا</option>
                    <option value="ترشيح">ترشيح</option>
                    <option value="غير ذلك">غير ذلك</option>
                  </select>
                </div>
              )}

              {/* DYNAMIC SUBSECTION VISITS BASED ON CHOICE */}
              {visitType === 'زيارة جديدة' ? (
                /* NEW CUSTOMER FIELDS */
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* Phone Warnings and Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        <span>الهاتف (مسؤول الاتصال):</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="مثال: 0501234567"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">رقم واتساب العميل (اختياري):</label>
                      <input
                        type="tel"
                        placeholder="مثال: 0501234567"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {phoneWarning && (
                    <div className="p-3 bg-amber-50 text-amber-900 text-[10px] rounded-xl border border-amber-250 font-bold leading-relaxed">
                      {phoneWarning}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-700">العنوان:</label>
                      <input
                        type="text"
                        placeholder="أدخل عنوان العميل بالتفصيل..."
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all text-right"
                        required
                      />
                      <div className="mt-1.5 space-y-1">
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          disabled={isLocating}
                          className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 active:bg-teal-200 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 border border-teal-100"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{isLocating ? 'جاري جلب إحداثيات الموقع الحالي...' : '📍 تحديد لوكيشن العميل الحالي'}</span>
                        </button>
                        {latitude && longitude && (
                          <div className="text-[10px] text-emerald-800 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/65 font-bold flex flex-col gap-1 text-right">
                            <span className="flex items-center gap-1 justify-end">
                              <span>إحداثيات الموقع محفوظة بنجاح! ({latitude.toFixed(5)}, {longitude.toFixed(5)})</span>
                              <span className="p-0.5 rounded bg-emerald-150 inline-block text-[8px] px-1 font-mono text-emerald-900">GPS</span>
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 justify-end hover:underline"
                            >
                              <span>🗺️ فتح اللوكيشن على خرائط جوجل</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">نوع النشاط (مثال: ملابس، جوالات، مصنع):</label>
                      <input
                        type="text"
                        placeholder="نوع نشاط العميل..."
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all text-right"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">المنتج المطلوب:</label>
                      <select
                        value={requestedProduct}
                        onChange={(e) => setRequestedProduct(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                      >
                        <option value="POS">POS</option>
                        <option value="ERP">ERP</option>
                        <option value="غير ذلك">غير ذلك</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">الشخص المسؤول بالشركة:</label>
                      <input
                        type="text"
                        placeholder="عبد العزيز الفوزان"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">المسمى الوظيفي للمسؤول:</label>
                      <input
                        type="text"
                        placeholder="مدير المشتريات"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">البريد الإلكتروني للعميل:</label>
                      <input
                        type="email"
                        placeholder="client@select-code.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">ملخص الزيارة والاهتمامات (التفاصيل):</label>
                    <textarea
                      placeholder="يرجى كتابة ما حدث في الزيارة، الاحتياجات والبرمجيات التي أبدى العميل اهتماماً بها..."
                      rows={3}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                    ></textarea>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">احتياج العميل الأساسي المكتشف:</label>
                    <input
                      type="text"
                      placeholder="مثال: ربط مستودعات فرع الرياض وجدة بنقاط البيع المركزية"
                      value={needs}
                      onChange={(e) => setNeeds(e.target.value)}
                      className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                /* FOLLOWUP VISIT FIELDS */
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">ملخص الخطوة التابعة وملاحظات المتابعة التراكمية:</label>
                    <textarea
                      placeholder="اكتب مقتطفات تقدم الاتفاق، كإعداد عقود أو استلام الدفعات أو مراجعة عروض الأسعار فنيّاً..."
                      rows={4}
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* COMMON REMAINING FIELDS FOR COMBINED VALUE */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">حالة العميل الحالية (تصنيف CRM):</label>
                  <select
                    value={customerStatus}
                    onChange={(e) => setCustomerStatus(e.target.value as CustomerStatus)}
                    className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                  >
                    <option value="عميل محتمل">عميل محتمل (أول تواصل)</option>
                    <option value="جاري المتابعة">جاري المتابعة والدراسة</option>
                    <option value="تم إرسال عرض سعر">تم إرسال عرض سعر رسمي</option>
                    <option value="تفاوض">تفاوض نهائي ومراجعة العقود</option>
                    <option value="تم التعاقد">🎉 تم التعاقد واستلام الدفعة</option>
                    <option value="غير مهتم">غير مهتم بالأعمال المعروضة</option>
                  </select>
                </div>
              </div>

              {/* NEXT STEP SCHEDULING */}
              <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-150/40 space-y-4">
                <span className="text-[10px] font-bold text-teal-700 block bg-teal-100/60 px-2 py-0.5 rounded-md w-max">التخطيط والمتابعة القادمة</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">الإجراء القادم المخطط له:</label>
                    <input
                      type="text"
                      placeholder="مثال: تقديم النسخة التجريبية للمحاسبين"
                      value={nextStep}
                      onChange={(e) => setNextStep(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-850 focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>موعد المتابعة القادمة:</span>
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-850 focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 focus:outline-none transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

                {/* SUBMIT BUTTON */}
              <div className="flex flex-col sm:flex-row gap-3">
                {editModeVisitId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="sm:w-1/3 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>إلغاء التعديل ✕</span>
                  </button>
                )}
                {editModeVisitId ? (
                  <button
                    type="submit"
                    onClick={() => setIsDraftClick(false)}
                    className="flex-1 py-4 px-6 text-white rounded-2xl text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/15"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>{currentUser.role === 'Admin' ? 'حفظ وعكس تعديل المشرف على السجل 💾' : 'حفظ التعديلات على الزيارة 💾'}</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    onClick={() => setIsDraftClick(false)}
                    className="flex-1 py-4 px-6 text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/15 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4.5 h-4.5" />
                    <span>حفظ الزيارة مباشرة 💾</span>
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>

        {/* COLUMN 2: EXTREMELY INTUITIVE SHEETS CONNECTOR & EXCEL CONTROL HUB (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section A: Active Cloud Database Status */}
          {currentUser.role === 'Admin' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-[9px] font-bold text-teal-600 font-mono">DATABASE STATUS</span>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>اتصال قاعدة البيانات السحابية</span>
                </h3>
              </div>

              <div className="space-y-4 text-right">
                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse mt-1.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-900">سحابة Firestore نشطة وتعمل بكفاءة</h4>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                      يتم حفظ ومزامنة جميع الزيارات، تقارير المبيعات، ومخططات العملاء تلقائياً ومباشرة على قاعدة البيانات السحابية كمصدر وحيد وموحد للبيانات لجميع المستخدمين.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">إجمالي الزيارات</span>
                    <span className="text-base font-black text-slate-900 font-mono">{visits.length}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">العملاء النشطين</span>
                    <span className="text-base font-black text-slate-900 font-mono">{customers.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section B2: Mobile App Shortcut (PWA) Install Hub */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-[9px] font-bold text-teal-600 font-mono">MOBILE INSTANT SHORTCUT</span>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 font-sans">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>أيقونة الفتح السريع وتثبيت التطبيق على الجوال</span>
              </h3>
            </div>

            <div className="space-y-4 text-right">
              <div className="flex items-center gap-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                <img
                  src="/pwa_icon_512.jpg"
                  alt="CRM App Icon"
                  className="w-14 h-14 rounded-2xl shadow-md border border-slate-200/80 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 text-right">
                  <h4 className="text-xs font-black text-slate-900">CRM المبيعات والزيارات</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">تثبيت كـ تطبيق ذكي مستقل على هاتفك للدخول بكبسة زر واحدة وبدون كتابة روابط!</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {pwaInstallStatus === 'installed' ? (
                  <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-center text-[11px] font-black text-teal-800">
                    🎉 مبروك! هذا التطبيق مثبت بالفعل ومفتوح كأيقونة شاشة مستقلة على جهازك.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePWAInstall}
                    className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 hover:scale-[1.01] text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    style={{ boxShadow: '0 8px 16px -3px rgba(13, 148, 136, 0.25)' }}
                  >
                    <Smartphone className="w-4 h-4 text-teal-100 animate-pulse" />
                    <span>تنزيل وتثبيت الأيقونة السريعة على الجوال 📱</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPWAHelpModal(true)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer"
                >
                  كيف يمكنني التثبيت يدوياً على (iPhone / Android)؟ ℹ️
                </button>
              </div>
            </div>
          </div>

          {/* Section B: Offline JSON Backup & Recovery Hub */}
          {currentUser.role === 'Admin' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-[9px] font-bold text-teal-600 font-mono">OFFLINE DATA BACKUP</span>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 font-sans">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>النسخ الاحتياطي واستعادة البيانات المفقودة (JSON)</span>
                </h3>
              </div>

              <div className="space-y-4 text-right">
                <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                  احتفظ بنسخة من بياناتك في أمان تام! نوصيك بتنزيل نسخة احتياطية لجميع العملاء والزيارات كملف <code className="bg-slate-50 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px]">.json</code> مشفر لحمايتها من الضياع التام في حال مسح المتصفح أو تهيئة الجهاز، ومن ثم يمكنك استيرادها دفعة واحدة لاستعادة كامل الداتا.
                </p>

                <div className="space-y-3 pt-2">
                  {/* Download JSON Backup Button */}
                  <button
                    type="button"
                    onClick={handleDownloadJSONBackup}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FileJson className="w-4 h-4 text-teal-400" />
                    <span>تنزيل نسخة احتياطية كاملة (.json) 📥</span>
                  </button>

                  {/* Upload JSON Backup Form Field */}
                  <div className="relative group border border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-4 transition-all text-center bg-slate-50/55 hover:bg-teal-50/10 cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      id="restore-json-input"
                      onChange={handleUploadJSONBackup}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title="اختر ملف النسخة الاحتياطية لاستعادتها"
                    />
                    <div className="space-y-1.5 pointer-events-none">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700 flex items-center justify-center mx-auto transition-all">
                        <Database className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-xs font-black text-slate-705 group-hover:text-teal-900 transition-all">
                        اضغط هنا لرفع واستعادة ملف النسخة الاحتياطية (.json) 📤
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold leading-normal">
                        سيتم دمج البيانات المرفوعة مع البيانات الموجودة حالياً بالمجال بذكاء لمنع التكرار
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section C: Dynamic Bulk Excel/CSV Visits Recording Tool */}
          {currentUser.role === 'Admin' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[9px] font-bold text-teal-600 font-mono">BULK REGISTRATION HUB</span>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>تسجيل مبيعات وزيارات جماعي (Excel)</span>
              </h3>
            </div>

            <div className="space-y-4 text-right">
              <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                يمكنك الآن تسجيل عدد كبير من مبيعات وزيارات المندوبين دفعة واحدة عبر ملف Excel/CSV المنسق. قم بتنزيل الشيت الفارغ أولاً لملء الداتا المطلوبة بكفاءة عالية ومن ثم ارفعه مباشرة للتطبيق لتحديث الذاكرة وبدء المزامنة.
              </p>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* 1. Download Blank Excel Template */}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full py-3 px-4 bg-teal-50 hover:bg-teal-105 text-teal-900 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-teal-200/50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-600" />
                  <span>تنزيل شيت Excel الفارغ (نموذج الزيارات) 📥</span>
                </button>

                {/* 2. Drag & Drop or Select Excel/CSV Area */}
                <div className="relative group border border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-4 transition-all text-center bg-slate-50/55 hover:bg-teal-50/10">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleUploadCSVFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="اختر ملف الزيارات المكتمل"
                  />
                  <div className="space-y-1.5 pointer-events-none">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700 flex items-center justify-center mx-auto transition-all">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-xs font-black text-slate-705 group-hover:text-teal-900 transition-all">
                      اضغط هنا لرفع واستيراد شيت الزيارات المكتمل (Excel / CSV) 📤
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold leading-normal">
                      يدعم ملفات الاكسل الحديثة (.xlsx, .xls) والملفات القياسية (.csv)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Section B: Data Security & Backup Hub (Arabic instructions) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[9px] font-bold text-teal-600 font-mono">DATA SECURITY & TIPS</span>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                <span>نصائح أمنية وإرشادية لحفظ البيانات والملفات</span>
              </h3>
            </div>

            {/* Security points */}
            <div className="space-y-4 text-right">
              <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-bold">
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">١</span>
                  <p>
                    يتم ترحيل وحفظ جميع مدخلاتك بشكل آمن وتلقائي على خوادم السحابة المشفرة في الوقت الفعلي بمجرد تسجيل الزيارة.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">٢</span>
                  <p>
                    نوصي بـ <b>تحميل نسخة احتياطية (JSON)</b> دورية وحفظها محلياً على جهازك لضمان وجود سجل احتياطي دون اتصال بالإنترنت في أي وقت.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">٣</span>
                  <p>
                    تأكد دائماً من استخدام حسابك الشخصي وكلمة المرور المشفرة لضمان صلاحياتك المناسبة ومنع تداخل البيانات مع الأجهزة الأخرى.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      </main>
      ) : (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          
          {/* 1. DATA MONITOR QUICK COUNTERS GRID */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white border border-slate-200/50 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between text-right">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">إجمالي الزيارات المعروضة</span>
                <span className="text-xl font-black text-slate-900 font-mono">{filteredVisits.length}</span>
                <span className="text-[8px] text-slate-400 block font-bold">من أصل {visits.length} زيارات مسجلة</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 select-none">
                <Database className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white border border-slate-200/50 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between text-right">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">الزيارات الجديدة والعملاء</span>
                <span className="text-xl font-black text-teal-600 font-mono">
                  {visits.filter(v => v.visitType === 'زيارة جديدة').length}
                </span>
                <span className="text-[8px] text-teal-600/80 block font-bold">تسجيل جهات بيعية جديدة</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 select-none">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white border border-slate-200/50 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between text-right">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">زيارات ومتابعات الصفقات</span>
                <span className="text-xl font-black text-blue-600 font-mono">
                  {visits.filter(v => v.visitType === 'زيارة متابعة').length}
                </span>
                <span className="text-[8px] text-blue-600/85 block font-bold">تتبع تقدم صفقات العملاء</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 select-none">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-white border border-slate-200/50 p-4.5 rounded-2xl shadow-3xs flex items-center justify-between text-right">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold block">إجمالي الفرص المالية المتوقعة</span>
                <span className="text-sm font-black text-amber-600 font-mono truncate max-w-[130px] block">
                  {visits.reduce((sum, v) => sum + (Number(v.expectedOpportunityValue || v.opportunityValue) || 0), 0).toLocaleString('ar-SA')} ر.س
                </span>
                <span className="text-[8px] text-amber-600/80 block font-bold">القيمة المالية الكلية للصفقات</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 select-none">
                <Coins className="w-5 h-5" />
              </div>
            </div>
          </section>

          {/* Sub-Tabs Selector inside Data View */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 max-w-sm mr-auto font-sans relative shadow-3xs" dir="rtl">
            <button
              onClick={() => setDataSubTab('visits')}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                dataSubTab === 'visits'
                  ? 'bg-white text-teal-850 shadow-xs'
                  : 'text-slate-500 hover:text-slate-850 font-bold'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>جدول مبيعات وزيارات المناديب ({filteredVisits.length})</span>
            </button>
            <button
              onClick={() => setDataSubTab('customers')}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                dataSubTab === 'customers'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-500 hover:text-indigo-850 font-bold'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>دليل الحسابات والعملاء ({customers.length})</span>
            </button>
          </div>

          {dataSubTab === 'visits' ? (
            /* 2. CHRONICLE MODULE WITH ADVANCED FILTERS */
            <section className="bg-white border border-slate-150 p-6 rounded-3xl shadow-xs mt-0 space-y-6">
            
            {/* Header Title with quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1 text-right">
                <span className="text-[9px] font-bold text-teal-600 font-mono">DATA STOCKS MONITOR</span>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 justify-end">
                  <span>سجل ودفتر الزيارات والحسابات النشطة ({filteredVisits.length})</span>
                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold">
                  تصفح وتقصّي تقارير الزيارات الميدانية وعملاء المناديب مع التحكم بالتعديل والحذف المنظم سحابياً.
                </p>
              </div>
              
              {/* Reset memory and Excel exports */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="py-2.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs rounded-xl shadow-md shadow-teal-600/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel (CSV) 📥</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleResetLocalStorage}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  title="تصفير الجدول وتفريغ الذاكرة المحلية"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تصفير الذاكرة</span>
                </button>
              </div>
            </div>

            {/* 3. MULTI-FILTER CONTROL BAR */}
            <div className="bg-slate-50/75 p-4 rounded-2xl border border-slate-200/50 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-2 text-slate-700">
                <Filter className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-black">أدوات الفلترة والبحث المتقدم السريعة</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-right font-sans">
                
                {/* Search query box */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">البحث النصي الشامل</span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث باسم العميل أو المندوب..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-555/15"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Filter visit level type */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">نوع المعاينة والزيارة</span>
                  <select
                    value={selectedVisitTypeFilter}
                    onChange={(e) => setSelectedVisitTypeFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-750 font-bold outline-none text-right cursor-pointer"
                  >
                    <option value="الكل">كل أنواع الزيارات (الكل)</option>
                    <option value="زيارة جديدة">زيارة تسجيل أولى (جديدة)</option>
                    <option value="زيارة متابعة">زيارات تتبع صفقات (متابعة)</option>
                  </select>
                </div>

                {/* Filter sales manager representative */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">بحسب المندوب المسؤول</span>
                  <select
                    value={selectedRepFilter}
                    onChange={(e) => setSelectedRepFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-750 font-bold outline-none text-right cursor-pointer"
                  >
                    <option value="الكل">كل المناديب المتاحين</option>
                    {Array.from(new Set(visits.map(v => v.repName).filter(Boolean))).map((name, i) => (
                      <option key={i} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter sales client status */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">بحسب الحالة البيعية للعميل</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-slate-750 font-bold outline-none text-right cursor-pointer"
                  >
                    <option value="الكل">كل الحالات البيعية (مفتوحة ومغلقة)</option>
                    <option value="عميل محتمل">عميل محتمل</option>
                    <option value="جاري المتابعة">جاري المتابعة</option>
                    <option value="تم إرسال عرض سعر">تم إرسال عرض السعر</option>
                    <option value="تفاوض">تفاوض نهائي</option>
                    <option value="تم التعاقد">تم التعاقد والبيع 🎉</option>
                    <option value="غير مهتم">غير مهتم / مستبعد</option>
                  </select>
                </div>

              </div>

              {/* View toggle layout control */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-150 pt-3 gap-2.5">
                <span className="text-[10px] text-slate-450 font-extrabold text-right">ملاحظة: تتيح أزرار التعديل تعديلاً فورياً داخل نافذة منبثقة دون مغادرة الصفحة والمساس ببيانات مسوداتك!</span>
                
                <div className="flex bg-slate-200/65 p-1 rounded-xl border border-slate-250/50 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setDataViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                      dataViewMode === 'cards'
                        ? 'bg-white text-teal-850 shadow-3xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3 text-amber-500" />
                    <span>عرض كبطاقات بنتو 🗃️</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                      dataViewMode === 'table'
                        ? 'bg-white text-teal-850 shadow-3xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Table className="w-3 h-3 text-teal-650" />
                    <span>عرض جدول مفصل 📊</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. RECORDS CONTAINER AREA */}
            <div className="transition-all select-text">
              {filteredVisits.length === 0 ? (
                <div className="p-12 text-center text-slate-450 bg-slate-50 border border-dashed rounded-2xl flex flex-col items-center justify-center space-y-2 select-none">
                  <AlertCircle className="w-9 h-9 text-slate-300 animate-pulse" />
                  <p className="font-sans font-black text-xs text-slate-500">لم نعثر على سجلات مطابقة للفلترة أو البحث المدخل حالياً.</p>
                  <p className="text-[10px] text-slate-400 font-bold">تأكد من تصفير الفلاتر ومسح الكلمات أعلاه لعرض السجلات المخزنة.</p>
                </div>
              ) : dataViewMode === 'cards' ? (
                
                /* CARDS VIEW (AMAZING BENTO RESPONSIVE CARDS) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                  {filteredVisits.map((v) => (
                    <div 
                      key={v.id} 
                      className="bg-white border hover:border-amber-450 border-slate-150 rounded-2xl p-5 shadow-3xs hover:shadow-xs transition-all flex flex-col justify-between text-right relative group overflow-hidden"
                    >
                      {/* Glow indicator line on top */}
                      <div className={`absolute top-0 inset-x-0 h-1 ${
                        v.visitType === 'زيارة جديدة' ? 'bg-teal-500' : 'bg-blue-500'
                      }`} />

                      <div className="space-y-3.5">
                        {/* Card Header metadata */}
                        <div className="flex justify-between items-center text-[10px] pb-1 border-b border-gray-100">
                          <span className="font-mono text-slate-450 font-bold font-sans">
                            {v.timestamp ? new Date(v.timestamp).toLocaleString('ar-SA', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                          </span>
                          <div className="flex gap-1.5 items-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              v.visitType === 'زيارة جديدة' 
                                ? 'bg-teal-50 text-teal-700' 
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {v.visitType}
                            </span>
                            <span className="font-mono bg-slate-100 text-slate-500 font-black px-1.5 py-0.5 rounded">
                              {v.id}
                            </span>
                          </div>
                        </div>

                        {/* Customer Company Name & Representative */}
                        <div className="space-y-1">
                          <h4 
                            onClick={() => setViewingModalVisit(v)}
                            className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors cursor-pointer leading-tight font-sans"
                          >
                            {v.customerName}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-start">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>المندوب: <b className="text-slate-800">{v.repName}</b></span>
                            <span className="text-slate-200">|</span>
                            <span>{v.province?.replace('(جدة)', '').replace('(الرياض)', '').replace('(الدمام)', '').trim() || '--'}</span>
                          </p>
                        </div>

                        {/* Commercial product & opportunity expected values */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                          <div>
                            <span className="text-slate-400 block font-bold mb-0.5">الحالة البيعية</span>
                            <span className="font-black text-slate-800">{v.customerStatus}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold mb-0.5">المنتج والصفقة</span>
                            <span className="font-black text-slate-850 truncate block">
                              {v.requestedProduct || v.activityType || 'متابعة الصفقات'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] items-center">
                          {/* Financial Value */}
                          <div>
                            <span className="text-slate-400 block font-bold">القيمة المتوقعة</span>
                            <span className="font-black text-teal-700 font-mono text-xs">
                              {v.expectedOpportunityValue || v.opportunityValue ? (Number(v.expectedOpportunityValue || v.opportunityValue) || 0).toLocaleString('ar-SA') : '0'} ريال
                            </span>
                          </div>

                          {/* Quick Phone buttons */}
                          <div>
                            <span className="text-slate-400 block font-bold mb-0.5 text-left">اتصال ذكي</span>
                            <div className="flex gap-1 justify-end">
                              {v.phone && (
                                <>
                                  <a 
                                    href={`tel:${v.phone}`}
                                    className="p-1 px-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded border border-sky-205 font-bold text-[9px] flex items-center gap-0.5 whitespace-nowrap"
                                    title="اتصال هاتفي مباشر"
                                  >
                                    <Phone className="w-2.5 h-2.5 text-sky-600" />
                                    <span>اتصل</span>
                                  </a>
                                  <a 
                                    href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    rel="noopener noreferrer"
                                    className="p-1 px-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-150 rounded font-bold text-[9px] flex items-center gap-0.5 whitespace-nowrap"
                                    title="مراسلة واتساب فورية"
                                  >
                                    <span>واتس</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Summary excerpt with custom font support */}
                        <div className="p-2.5 bg-slate-50/50 rounded-xl text-[10px] text-slate-500 leading-normal border border-slate-100 line-clamp-2 max-h-12 overflow-hidden select-text font-semibold">
                          <b className="text-slate-600 block mb-0.5 text-[9px]">وقائع وجند الاجتماع الميداني:</b>
                          {v.summary || v.followUpNotes || '--'}
                        </div>

                        {/* Next dates if applicable */}
                        {v.nextStep && (
                          <div className="text-[9px] text-amber-700 bg-amber-50/55 p-1 px-2 rounded-lg border border-amber-100/75 flex justify-between font-bold">
                            <span>التالي: {v.nextStep}</span>
                            <span className="font-mono">{v.nextFollowUpDate || ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Card actions footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingModalVisit(v)}
                          className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all shadow-3xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>عرض التفاصيل</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingModalVisit(v)}
                            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-750 border border-amber-150 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                            title="تعديل هذا التقرير"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                            <span>تعديل</span>
                          </button>
                          
                          {(currentUser.role === 'Admin' || currentUser.permissions?.includes('visit_delete')) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(v.id)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-750 border border-rose-150 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                              title="حذف هذا السجل نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                
                /* DETAILED CLASSIC TABLE VIEW (RE-STYLED AND HIGHLY POLISHED) */
                <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                  <table className="w-full text-right text-xs border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px]">
                        <th className="p-3.5 font-black whitespace-nowrap">رقم الزيارة</th>
                        <th className="p-3.5 font-black whitespace-nowrap">التاريخ والوقت</th>
                        <th className="p-3.5 font-black whitespace-nowrap">المندوب</th>
                        <th className="p-3.5 font-black whitespace-nowrap font-sans text-right">نوع الـزيارة</th>
                        <th className="p-3.5 font-black whitespace-nowrap">العميل والمؤسسة</th>
                        <th className="p-3.5 font-black whitespace-nowrap text-center text-center">المنتج والتفاصيل</th>
                        <th className="p-3.5 font-black whitespace-nowrap font-sans">الهاتف</th>
                        <th className="p-3.5 font-black whitespace-nowrap">المحافظة</th>
                        <th className="p-3.5 font-black whitespace-nowrap">وقائع المقابلة الميدانية</th>
                        <th className="p-3.5 font-black whitespace-nowrap text-right">الفرصة الدورية</th>
                        <th className="p-3.5 font-black whitespace-nowrap">حالة الصفقة</th>
                        <th className="p-3.5 font-black whitespace-nowrap text-center">إجراءات التحكم والمساندة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisits.map((v) => (
                        <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/55 transition-colors">
                          <td className="p-3.5 font-black text-slate-500 font-mono whitespace-nowrap">
                            <span 
                              onClick={() => setViewingModalVisit(v)}
                              className="hover:underline cursor-pointer text-teal-700"
                            >
                              {v.id}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono">
                            {v.timestamp ? new Date(v.timestamp).toLocaleString('ar-SA', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                          </td>
                          <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{v.repName}</td>
                          <td className="p-3.5 whitespace-nowrap text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              v.visitType === 'زيارة جديدة' 
                                ? 'bg-teal-50 text-teal-700' 
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {v.visitType}
                            </span>
                          </td>
                          <td className="p-3.5 font-black text-slate-900 whitespace-nowrap">{v.customerName}</td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {v.requestedProduct ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[9px] font-bold">
                                {v.requestedProduct}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold font-mono">--</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-650 whitespace-nowrap">{v.phone || '--'}</td>
                          <td className="p-3.5 text-slate-600 max-w-xs truncate" title={v.province || ''}>
                            {v.province || '--'}
                          </td>
                          <td className="p-3.5 text-slate-500 max-w-xs truncate font-medium" title={v.summary || v.followUpNotes}>
                            {v.summary || v.followUpNotes || '--'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-teal-700 whitespace-nowrap text-right">
                            {v.expectedOpportunityValue || v.opportunityValue ? (Number(v.expectedOpportunityValue || v.opportunityValue) || 0).toLocaleString('ar-SA') : '0'} ر.س
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                              v.customerStatus === 'تم التعاقد' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : v.customerStatus === 'غير مهتم'
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : v.customerStatus === 'تفاوض'
                                ? 'bg-amber-55 bg-amber-50 text-amber-700 border-amber-100'
                                : v.customerStatus === 'تم إرسال عرض سعر'
                                ? 'bg-blue-50 text-blue-700 border-blue-105'
                                : v.customerStatus === 'جاري المتابعة'
                                ? 'bg-sky-50 text-sky-700 border-sky-100'
                                : 'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                              {v.customerStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingModalVisit(v)}
                                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all hover:scale-105 cursor-pointer shadow-3xs"
                                title="عرض التفاصيل الكاملة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingModalVisit(v)}
                                className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 rounded-xl transition-all hover:scale-105 cursor-pointer"
                                title="تعديل هذا السجل"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              
                              {(currentUser.role === 'Admin' || currentUser.permissions?.includes('visit_delete')) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(v.id)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl transition-all hover:scale-105 cursor-pointer"
                                  title="حذف هذا السجل نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
          ) : (
            <CustomersView
              customers={customers}
              currentUser={currentUser}
              salesRepsList={salesRepsList}
              onTransferCustomer={handleTransferCustomer}
              onNavigateToForm={() => {
                setActiveTab('register');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>
      )}

      {/* Custom Edit Visit pop-up modal */}
      <EditVisitModal
        isOpen={editingModalVisit !== null}
        visit={editingModalVisit}
        onClose={() => setEditingModalVisit(null)}
        customers={customers}
        onSave={(updatedVisit) => {
          const original = visits.find(v => v.id === updatedVisit.id);
          if (currentUser?.role === 'Admin' && original) {
            logAdminAction('edit', original, updatedVisit);
          }
          const updatedVisits = visits.map(v => v.id === updatedVisit.id ? updatedVisit : v);
          setVisits(updatedVisits);
          setStoredData('visits', updatedVisits);
          
          const updatedCustomers = recomputeCustomersFromVisits(updatedVisits, customers);
          setCustomers(updatedCustomers);
          setStoredData('customers', updatedCustomers);

          // Real-time persist editing to cloud Firestore DB
          const token = localStorage.getItem('sales_visit_crm_auth_token');
          if (token) {
            fetch(`/api/visits/${updatedVisit.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ visit: updatedVisit })
            })
            .then(res => res.json())
            .then(data => {
              if (data.status === 'success') {
                console.log("Visit edit resolved on cloud.");
              }
            })
            .catch(err => console.error(err));

            // Sync updated customer details to Cloud Database
            updatedCustomers.forEach(cust => {
              fetch(`/api/customers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ customer: cust })
              }).catch(err => console.error(err));
            });
          }

          triggerMessage('success', 'تم حفظ التعديلات البيعية وتحديث سحابة Firestore بنجاح! 👍');
          setEditingModalVisit(null);
        }}
        provinces={provinces}
        activities={activities}
        salesRepsList={salesRepsList}
      />

      {/* Custom Detail Viewer pop-up modal */}
      <VisitDetailModal
        isOpen={viewingModalVisit !== null}
        visit={viewingModalVisit}
        onClose={() => setViewingModalVisit(null)}
      />


      {/* FOOTER METRICS AND CREDITS */}
      <footer className="py-8 text-center text-[11px] text-slate-400 font-bold">
        <p>نظام تسجيل مبيعات المحمول المبسط مدمج الذكاء لشركة Select Code © ٢٠٢٦</p>
        <p className="text-slate-400 mt-1">تطبيق قائم على الذاكرة الآمنة بالتكامل السحابي المباشر</p>
      </footer>

      {/* Modal for Manual Dismissal of Reminder */}
      {dismissingReminderVisit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl text-right animate-scaleUp relative overflow-hidden select-text">
            <div className="flex flex-col items-center text-center pb-2">
              <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-600">
                <BellOff className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1 font-sans">
                إزالة تذكير المتابعة يدوياً
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-bold max-w-xs">
                سيتم إخفاء هذا التنبيه من قائمة التذكيرات النشطة، مع حفظ سجل الإلغاء للرقابة وإمكانية استعادته في أي وقت.
              </p>
            </div>

            {/* Target reminder details */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100/90 text-xs space-y-1.5 my-3">
              <div className="flex justify-between items-center text-slate-800 font-black">
                <span>العميل:</span>
                <span className="text-teal-700">{dismissingReminderVisit.customerName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-bold text-[11px]">
                <span>المندوب المتابع:</span>
                <span>{dismissingReminderVisit.repName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-bold text-[11px]">
                <span>موعد التذكير:</span>
                <span className="font-mono" dir="ltr">{dismissingReminderVisit.nextFollowUpDate}</span>
              </div>
              {dismissingReminderVisit.nextStep && (
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span className="font-black text-slate-700">المطلوب:</span> {dismissingReminderVisit.nextStep}
                </div>
              )}
            </div>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[10.5px] font-black text-slate-600 block">
                اختر سبب الإزالة السريع (أو اكتب سبباً مخصصاً):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'تم التواصل هاتفياً وحسم المتابعة',
                  'طلب العميل تأجيل الموعد لاحقاً',
                  'تم الاتفاق والتعاقد بنجاح',
                  'العميل غير مهتم بالخدمة حالياً',
                  'تم التعامل خارج النظام'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDismissReasonInput(chip)}
                    className={`text-[9.5px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      dismissReasonInput === chip
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Text Input */}
            <div className="w-full text-right mb-1">
              <input
                type="text"
                value={dismissReasonInput}
                onChange={(e) => setDismissReasonInput(e.target.value)}
                placeholder="أدخل سبباً أو ملاحظة لإزالة التذكير..."
                className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 font-bold"
              />
            </div>
            
            <div className="flex items-center justify-center gap-3 mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={dismissSubmitting}
                onClick={() => {
                  setDismissingReminderVisit(null);
                  setDismissReasonInput('');
                }}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer text-center"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={dismissSubmitting}
                onClick={() => {
                  if (dismissingReminderVisit) {
                    handleDismissReminder(dismissingReminderVisit.id, dismissReasonInput);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-600/10 text-center flex items-center justify-center gap-1.5"
              >
                <BellOff className="w-3.5 h-3.5" />
                <span>{dismissSubmitting ? 'جاري الحفظ...' : 'تأكيد إزالة التذكير'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rep Task Completion & Feedback Modal */}
      {selectedRepTaskForFeedback && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl text-right animate-scaleUp relative select-text">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <span>تسجيل إنجاز التكليف وإفادة قسم المتابعة والجودة</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedRepTaskForFeedback(null);
                  setRepTaskFeedbackText('');
                }}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-black text-slate-800">{selectedRepTaskForFeedback.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">العميل: <strong>{selectedRepTaskForFeedback.customerName}</strong></div>
                {selectedRepTaskForFeedback.description && (
                  <div className="text-[10px] text-indigo-700 mt-1.5 pt-1.5 border-t border-slate-200">
                    التوجيهات: {selectedRepTaskForFeedback.description}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 block mb-1">
                  تقرير وإفادة المندوب عن نتائج التواصل والزيارة: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={repTaskFeedbackText}
                  onChange={(e) => setRepTaskFeedbackText(e.target.value)}
                  rows={4}
                  placeholder="اكتب تفاصيل الزيارة والتواصل مع العميل، وما تم الاتفاق عليه..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={savingRepTaskFeedback}
                onClick={() => {
                  setSelectedRepTaskForFeedback(null);
                  setRepTaskFeedbackText('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingRepTaskFeedback}
                onClick={handleSaveRepTaskCompletion}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/10 flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                <span>{savingRepTaskFeedback ? 'جاري الحفظ...' : 'تأكيد وإتمام التكليف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl text-right animate-scaleUp relative overflow-hidden select-text">
            <div className="flex flex-col items-center text-center pb-2">
              <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-600 animate-pulse">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-2 font-sans">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-bold max-w-xs">
                {confirmModal.message}
              </p>
            </div>

            {confirmModal.showReasonInput && (
              <div className="w-full text-right mt-3 mb-1">
                <label className="text-[10px] font-black text-slate-500 block mb-1">سبب الحذف (اختياري / موجه لسجلات الرقابة):</label>
                <input
                  type="text"
                  value={confirmReasonText}
                  onChange={(e) => setConfirmReasonText(e.target.value)}
                  placeholder="مثال: خطأ في تسعير العقد أو تكرار الإدخال..."
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 font-bold"
                />
              </div>
            )}
            
            <div className="flex items-center justify-center gap-3 mt-6 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setConfirmReasonText('');
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-10 border border-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer text-center"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onConfirm) {
                    confirmModal.onConfirm(confirmReasonText);
                  }
                  setConfirmReasonText('');
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-600/10 text-center"
              >
                نعم، تأكيد الحذف 🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Manual Installation Guide Modal */}
      {showPWAHelpModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fadeIn" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl text-right relative overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPWAHelpModal(false)}
              className="absolute top-4 left-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors z-10 cursor-pointer"
              title="إغلاق التلميح"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-slate-100 mb-5">
              <div className="w-16 h-16 rounded-2xl shadow-md border border-slate-100 mx-auto overflow-hidden mb-3">
                <img
                  src="/pwa_icon_512.jpg"
                  alt="CRM System Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-base font-black text-slate-900">تثبيت أيقونة CRM المبيعات السريع</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1">تابع الخطوات أدناه لإضافة أيقونة تشغيل مباشرة على شاشة هاتف الجوال</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* iPhone iOS section */}
              <div className="p-3.5 bg-sky-50/55 rounded-2xl border border-sky-100/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-extrabold text-[10px] flex items-center justify-center">1</span>
                  <h4 className="text-xs font-black text-sky-950">هواتف آيفون (iPhone Safari)</h4>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-700 font-extrabold space-y-1.5 leading-relaxed text-right pl-3 border-r-2 border-sky-200 pr-2">
                  <li>افتح هذا البورتال في تطبيق متصفح <span className="text-sky-700 font-black">Safari</span> الخاص بآيفون.</li>
                  <li>اضغط على زر <span className="text-sky-700 font-black">"مشاركة" (Share)</span> الموجود في شريط الأدوات بأسفل شاشة سفاري.</li>
                  <li>اسحب الخيارات المفتوحة لأسفل واضغط على تبويب <span className="text-sky-700 font-black">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</li>
                  <li>اضغط على كلمة <span className="text-teal-600 font-black">"إضافة"</span> في الزاوية العلوية لتأكيد تثبيت الأيقونة على الشاشة الفورية.</li>
                </ol>
              </div>

              {/* Android section */}
              <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-extrabold text-[10px] flex items-center justify-center">2</span>
                  <h4 className="text-xs font-black text-teal-950">هواتف أندرويد (Google Chrome)</h4>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-700 font-extrabold space-y-1.5 leading-relaxed text-right pl-3 border-r-2 border-teal-200 pr-2">
                  <li>افتح هذا الرابط في متصفح <span className="text-teal-700 font-black">Google Chrome</span> لهاتفك.</li>
                  <li>اضغط على أيقونة <span className="text-teal-700 font-black">القائمة الثلاث نقاط (⋮)</span> في الزاوية العلوية للمتصفح.</li>
                  <li>اختر <span className="text-teal-700 font-black">"تثبيت التطبيق" (Install app)</span> أو <span className="text-teal-700 font-black">"إضافة إلى الشاشة الرئيسية"</span>.</li>
                  <li>أكد التثبيت لتبدأ في تسجيل مبيعاتك بكبسة زر واحدة ومن أي مكان!</li>
                </ol>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPWAHelpModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl cursor-pointer text-center transition-all active:scale-[0.98]"
              >
                فهمت، سأقوم بالتثبيت الآن 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (MOBILE ONLY QUICK VISIT ACCESS) */}
      <div className="fixed bottom-6 left-6 z-[45] lg:hidden">
        <button
          id="mobile-quick-visit-btn"
          type="button"
          onClick={handleQuickOpenNewVisitForm}
          className="flex items-center gap-2 px-5 py-3.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-full shadow-2xl transition-all cursor-pointer font-black text-xs border border-teal-500 hover:scale-[1.03]"
          style={{ boxShadow: '0 12px 24px -4px rgba(13, 148, 136, 0.45)' }}
        >
          <PlusCircle className="w-4.5 h-4.5 text-teal-100" />
          <span>زيارة جديدة 📝</span>
        </button>
      </div>

    </div>
  );
}
