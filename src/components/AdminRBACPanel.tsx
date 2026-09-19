import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Check, 
  X, 
  Lock, 
  UserCheck, 
  UserX, 
  KeyRound, 
  AlertCircle, 
  Loader2, 
  ListFilter, 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  UserCog,
  ArrowRightLeft,
  Image,
  Camera
} from 'lucide-react';
import { Customer, Visit } from '../types';
import TransferCustomersModal from './TransferCustomersModal';
import AdminLogoModal from './AdminLogoModal';

interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring';
  assignedReps: string[];
  isActive: boolean;
  createdAt?: string;
  permissions?: string[];
}

const PERMISSION_CATEGORIES = [
  {
    title: 'صلاحيات العملاء (Customers)',
    permissions: [
      { key: 'customer_view', label: 'عرض العملاء (View Customers)' },
      { key: 'customer_add', label: 'إضافة عميل (Add Customers)' },
      { key: 'customer_edit', label: 'تعديل ونقل عميل (Edit Customers)' },
      { key: 'customer_delete', label: 'حذف عميل (Delete Customers)' },
    ]
  },
  {
    title: 'صلاحيات الزيارات (Visits)',
    permissions: [
      { key: 'visit_view', label: 'عرض الزيارات السابقة (View Visits)' },
      { key: 'visit_add', label: 'إضافة زيارات (Add Visits)' },
      { key: 'visit_edit', label: 'تعديل زيارات (Edit Visits)' },
      { key: 'visit_delete', label: 'حذف زيارات (Delete Visits)' },
    ]
  },
  {
    title: 'صلاحيات التقارير (Reports)',
    permissions: [
      { key: 'reports_view', label: 'تصفح التقارير المتقدمة (View Reports)' },
      { key: 'reports_export', label: 'تصدير التقارير والإكسل (Export Reports)' },
    ]
  },
  {
    title: 'صلاحيات إدارة المستخدمين والـ RBAC',
    permissions: [
      { key: 'user_view', label: 'تصفح حسابات الطاقم (View Users)' },
      { key: 'user_add', label: 'تأسيس حساب جديد (Add Users)' },
      { key: 'user_edit', label: 'تعديل أو الحظر اللحظي للمستخدم (Edit Users)' },
      { key: 'user_delete', label: 'إلغاء حساب مستخدم تجميدياً (Delete Users)' },
    ]
  },
  {
    title: 'صلاحيات ممثلي ومناديب المبيعات',
    permissions: [
      { key: 'salesrep_view', label: 'عرض مناديب المبيعات (View Sales Representatives)' },
      { key: 'salesrep_add', label: 'تسجيل وإدخال مندوب مبيعات (Add Sales Representatives)' },
      { key: 'salesrep_edit', label: 'تعديل ممثلي المبيعات (Edit Sales Representatives)' },
      { key: 'salesrep_delete', label: 'حذف مندوب مبيعات (Delete Sales Representatives)' },
    ]
  }
];

interface Log {
  id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

interface AdminRBACPanelProps {
  salesRepsList: string[];
  currentUser: any;
  triggerMessage: (type: 'success' | 'error' | 'info', text: string) => void;
  softDeletedVisits?: any[];
  onRestoreVisit?: (id: string) => void;
  onAddSalesRep?: (name: string) => void;
  onEditSalesRep?: (oldName: string, newName: string) => void;
  onRemoveSalesRep?: (name: string) => void;
  customers?: Customer[];
  visits?: Visit[];
  onTransferSuccess?: (result: any) => void;
  companyLogo?: string;
  onUpdateLogo?: (newLogo: string) => void;
}

export function AdminRBACPanel({ 
  salesRepsList, 
  currentUser, 
  triggerMessage,
  softDeletedVisits = [],
  onRestoreVisit,
  onAddSalesRep,
  onEditSalesRep,
  onRemoveSalesRep,
  customers = [],
  visits = [],
  onTransferSuccess,
  companyLogo = '/path-to-logo.png',
  onUpdateLogo
}: AdminRBACPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Transfer Customers Modal States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceRep, setTransferSourceRep] = useState('');

  // Admin Logo Modal States
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  // Sales Reps Management States
  const [newRepNameInput, setNewRepNameInput] = useState('');
  const [showRepsListPopover, setShowRepsListPopover] = useState(false);
  const [showManageRepsModal, setShowManageRepsModal] = useState(false);
  const [editingRepName, setEditingRepName] = useState<string | null>(null);
  const [editingRepValue, setEditingRepValue] = useState('');
  const [modalNewRepInput, setModalNewRepInput] = useState('');
  const [repSearchQuery, setRepSearchQuery] = useState('');

  const handleAddRepDirect = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      triggerMessage('error', 'يرجى كتابة اسم المندوب أولاً');
      return;
    }
    if (trimmed === 'أخرى' || trimmed === 'الكل') {
      triggerMessage('error', 'هذا الاسم محجوز للنظام');
      return;
    }
    const cleanList = salesRepsList.filter(n => n !== 'الكل');
    if (cleanList.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      triggerMessage('error', `المندوب [${trimmed}] مسجل بالفعل في النظام`);
      return;
    }
    if (onAddSalesRep) {
      onAddSalesRep(trimmed);
      setNewRepNameInput('');
      setModalNewRepInput('');
    }
  };

  const handleStartEditRep = (name: string) => {
    setEditingRepName(name);
    setEditingRepValue(name);
  };

  const handleCancelEditRep = () => {
    setEditingRepName(null);
    setEditingRepValue('');
  };

  const handleSaveEditRep = (oldName: string) => {
    const trimmed = editingRepValue.trim();
    if (!trimmed) {
      triggerMessage('error', 'اسم المندوب لا يمكن أن يكون فارغاً');
      return;
    }
    if (trimmed === oldName) {
      setEditingRepName(null);
      setEditingRepValue('');
      return;
    }
    if (trimmed === 'أخرى' || trimmed === 'الكل') {
      triggerMessage('error', 'هذا الاسم محجوز للنظام');
      return;
    }
    const cleanList = salesRepsList.filter(n => n !== 'الكل' && n !== oldName);
    if (cleanList.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      triggerMessage('error', `الاسم [${trimmed}] مسجل بالفعل لمندوب آخر`);
      return;
    }
    if (onEditSalesRep) {
      onEditSalesRep(oldName, trimmed);
    }
    setEditingRepName(null);
    setEditingRepValue('');
  };

  const handleDeleteRep = (name: string) => {
    if (name === 'أخرى') {
      triggerMessage('error', 'لا يمكن حذف المندوب الافتراضي "أخرى"');
      return;
    }
    if (confirm(`هل أنت متأكد من رغبتك في حذف المندوب [${name}]؟ سيتم تحديث حصص وإسنادات الصلاحيات تلقائياً.`)) {
      if (onRemoveSalesRep) {
        onRemoveSalesRep(name);
      }
    }
  };

  const filteredModalReps = salesRepsList
    .filter(name => name !== 'الكل' && name !== 'أخرى')
    .filter(name => !repSearchQuery.trim() || name.toLowerCase().includes(repSearchQuery.trim().toLowerCase()));

  // Sub-tabs: 'users' | 'logs' | 'recycle_bin'
  const [rbacSubTab, setRbacSubTab] = useState<'users' | 'logs' | 'recycle_bin'>('users');

  // Default dynamic permissions map for roles
  const DEFAULT_ROLE_PERMISSIONS: Record<'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring', string[]> = {
    Admin: [
      'customer_view', 'customer_add', 'customer_edit', 'customer_delete',
      'visit_view', 'visit_add', 'visit_edit', 'visit_delete',
      'reports_view', 'reports_export',
      'user_view', 'user_add', 'user_edit', 'user_delete',
      'salesrep_view', 'salesrep_add', 'salesrep_edit', 'salesrep_delete'
    ],
    Manager: [
      'customer_view', 'customer_add', 'customer_edit',
      'visit_view', 'visit_add', 'visit_edit',
      'reports_view', 'reports_export',
      'user_view',
      'salesrep_view', 'salesrep_add', 'salesrep_edit'
    ],
    User: [
      'customer_view', 'customer_add', 'customer_edit',
      'visit_view', 'visit_add', 'visit_edit',
      'reports_view',
      'salesrep_view'
    ],
    TechnicalSupport: [
      'customer_view',
      'visit_view',
      'reports_view',
      'salesrep_view'
    ],
    Monitoring: [
      'customer_view',
      'visit_view',
      'reports_view',
      'salesrep_view'
    ]
  };

  // New user form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring'>('User');
  const [newAssignedReps, setNewAssignedReps] = useState<string[]>([]);
  const [newPermissions, setNewPermissions] = useState<string[]>(DEFAULT_ROLE_PERMISSIONS['User']);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Edit user states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editAssignedReps, setEditAssignedReps] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring'>('User');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Handlers for automatic dynamic permission selection on role change
  const handleNewRoleChange = (role: 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring') => {
    setNewRole(role);
    setNewPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  };

  const handleEditRoleChange = (role: 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring') => {
    setEditRole(role);
    setEditPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  };
  const [showEditRepsModal, setShowEditRepsModal] = useState(false);

  // Password reset states
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const token = localStorage.getItem('sales_visit_crm_auth_token');

  const fetchUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(data.users || []);
      } else {
        triggerMessage('error', data.error || 'فشل تحميل قائمة المستخدمين');
      }
    } catch (err) {
      triggerMessage('error', 'خطأ في الاتصال بالسيرفر أثناء جلب المستخدمين');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(data.logs || []);
      } else {
        triggerMessage('error', data.error || 'فشل تحميل سجل الرقابة والأمان');
      }
    } catch (err) {
      triggerMessage('error', 'خطأ اتصال أثناء جلب سجل العمليات');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [rbacSubTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      triggerMessage('error', 'يرجى مراجعة ملء الحقول؛ اسم المستخدم وكلمة المرور مطلوبة');
      return;
    }
    if (newPassword.length < 4) {
      triggerMessage('error', 'رمز المرور يجب أن يتشكل من ٤ خانات على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
          assignedReps: newAssignedReps,
          permissions: newPermissions
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        triggerMessage('success', `تم إنشاء العضوية لـ "${data.user.username}" بنجاح!`);
        setShowAddUserModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewAssignedReps([]);
        setNewPermissions(DEFAULT_ROLE_PERMISSIONS['User']);
        setNewRole('User');
        fetchUsers();
        fetchLogs();
      } else {
        triggerMessage('error', data.error || 'تعذر إضافة المستخدم الجديد');
      }
    } catch (err) {
      triggerMessage('error', 'خطأ اتصال أثناء تسجيل عضوية جديدة');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermissionInNewUser = (key: string) => {
    if (newPermissions.includes(key)) {
      setNewPermissions(newPermissions.filter(p => p !== key));
    } else {
      setNewPermissions([...newPermissions, key]);
    }
  };

  const togglePermissionInEditUser = (key: string) => {
    if (editPermissions.includes(key)) {
      setEditPermissions(editPermissions.filter(p => p !== key));
    } else {
      setEditPermissions([...editPermissions, key]);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser.id) {
      triggerMessage('error', 'تحذير أمني: يمنع تجميد أو قفل حسابك الفعال لتفادي سد منافذ تحكم الإدارة');
      return;
    }

    try {
      const nextActiveState = !user.isActive;
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: nextActiveState })
      });
      const data = await res.json();
      if (data.status === 'success') {
        triggerMessage('success', `تم تحديث حالة تفعيل حساب الزميل "${user.username}"`);
        fetchUsers();
        fetchLogs();
      } else {
        triggerMessage('error', data.error || 'فشلت معالجة تغيير حالة الحساب');
      }
    } catch (err) {
      triggerMessage('error', 'حدث خطأ شبكة أثناء تغيير حالة الحساب');
    }
  };

  const handleOpenEditReps = (user: User) => {
    setEditingUser(user);
    setEditAssignedReps(user.assignedReps || []);
    setEditRole(user.role);
    setEditPermissions(user.permissions || []);
    setShowEditRepsModal(true);
  };

  const handleSaveRepsAndRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: editRole,
          assignedReps: editAssignedReps,
          permissions: editPermissions
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        triggerMessage('success', `تم تحديث حصص المندوبين والدور للحساب بنجاح!`);
        setShowEditRepsModal(false);
        setEditingUser(null);
        fetchUsers();
        fetchLogs();
      } else {
        triggerMessage('error', data.error || 'فشل تحديث معلومات الحساب');
      }
    } catch (err) {
      triggerMessage('error', 'خطأ أثناء محاولة تعديل الصلاحيات والحصص');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReset = (user: User) => {
    setResettingUser(user);
    setNewResetPassword('');
    setShowResetModal(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (!newResetPassword || newResetPassword.trim().length < 4) {
      triggerMessage('error', 'يرجى كتابة رمز جديد لا يقل عن ٤ خانات');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${resettingUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newResetPassword })
      });
      const data = await res.json();
      if (data.status === 'success') {
        triggerMessage('success', `تم تغيير رمز المرور بنجاح للمستخدم "${resettingUser.username}" وسيطلب منه تسجيل الدخول مجدداً`);
        setShowResetModal(false);
        setResettingUser(null);
        fetchUsers();
        fetchLogs();
      } else {
        triggerMessage('error', data.error || 'فشلت عملية تغيير الرمز');
      }
    } catch (err) {
      triggerMessage('error', 'خطأ في الربط الرقمي مع السيرفر');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRepInNewUser = (rep: string) => {
    if (newAssignedReps.includes(rep)) {
      setNewAssignedReps(newAssignedReps.filter(r => r !== rep));
    } else {
      setNewAssignedReps([...newAssignedReps, rep]);
    }
  };

  const toggleRepInEditUser = (rep: string) => {
    if (editAssignedReps.includes(rep)) {
      setEditAssignedReps(editAssignedReps.filter(r => r !== rep));
    } else {
      setEditAssignedReps([...editAssignedReps, rep]);
    }
  };

  return (
    <div className="bg-[#f8fafc] w-full min-h-screen text-slate-900 flex flex-col font-sans select-none animate-fadeIn" style={{ direction: 'rtl' }}>
      
      {/* LOCAL SUB-TAB NAV */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">نظام إدارة الصلاحيات المتقدم (RBAC)</h2>
            <p className="text-[10px] text-slate-550 font-bold">صلاحيات حجب ورؤية المندوبين بالتوازن مع سجل الأمن السيبراني والرقابة للزيارات الميدانية</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setRbacSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
              rbacSubTab === 'users'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>قائمة المستخدمين والصلاحيات</span>
          </button>
          <button
            onClick={() => setRbacSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
              rbacSubTab === 'logs'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>سجل الرقابة ووقائع الأمن</span>
          </button>
          <button
            onClick={() => setRbacSubTab('recycle_bin')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
              rbacSubTab === 'recycle_bin'
                ? 'bg-rose-900 text-white shadow-md shadow-rose-900/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="text-sm">♻️</span>
            <span>سلة المحذوفات ({softDeletedVisits.length})</span>
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl w-full mx-auto flex-1 space-y-6">
        {rbacSubTab === 'users' ? (
          <div className="space-y-6">
            
            {/* INSTRUCTIONS / HEADER STAT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs text-right flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 mb-2">تعليمات تهيئة مستشاري المبيعات:</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                    ١) يمكن لمدير النظام حصراً إضافة وتعديل حصص المناديب وتأسيس حسابات مستشاري المبيعات مفرزة.<br />
                    ٢) الحسابات من فئة <span className="text-indigo-600 font-black">مدير نظام (Admin)</span> تمتلك رؤية عامة مطلقة وشاملة.<br />
                    ٣) الحسابات من فئة <span className="text-amber-600 font-bold">مستشار مبيعات (User)</span> تكون مقيدة برؤية العمليات المسندة فقط.
                  </p>
                </div>
                {/* Logo & Branding Management */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-slate-200 p-0 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                      <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-black text-slate-900 block">شعار النظام</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold">يملأ كامل حجم الإطار المكبر في الهيدر وكافة الشاشات</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="rbac-change-logo-btn"
                    onClick={() => setIsLogoModalOpen(true)}
                    className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>تغيير الشعار 📷</span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-black">إجمالي منتسبي النظام</span>
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-2xl font-black text-slate-900 font-mono">{users.length}</span>
                  <span className="text-[10px] text-slate-550 block font-bold mt-1">حسابات نشطة ومعطلة تحت المتابعة</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>توليد حساب مستخدم جديد</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between relative">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-black">إدارة مناديب المبيعات</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-right flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {salesRepsList.filter(name => name !== 'الكل' && name !== 'أخرى').length}
                      </span>
                      <span className="text-[10px] text-slate-550 block font-bold mt-1">المناديب المسجلين بالبرنامج</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        id="rbac-transfer-customers-btn"
                        onClick={() => {
                          setTransferSourceRep('');
                          setIsTransferModalOpen(true);
                        }}
                        className="text-[10px] font-black text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="نقل وإسناد عملاء مندوب إلى مندوب آخر"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>نقل العملاء ⇄</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManageRepsModal(true)}
                        className="text-[10px] font-black text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="إدارة كاملة: إضافة، تعديل مسميات، وحذف المناديب"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>إدارة المناديب ⚙️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRepsListPopover(!showRepsListPopover)}
                        className="text-[9.5px] font-black text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-xl transition-all"
                        title="عرض قائمة سريعة"
                      >
                        <span>قائمة 👀</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Add Rep Inline Form */}
                <div className="mt-3">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="اسم المندوب الجديد..."
                      value={newRepNameInput}
                      onChange={(e) => setNewRepNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRepDirect(newRepNameInput);
                        }
                      }}
                      className="flex-1 text-[10.5px] font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-850 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 text-right font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRepDirect(newRepNameInput)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10.5px] rounded-xl flex items-center gap-1 justify-center transition-all cursor-pointer shadow-3xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Popover to list, edit and remove representatives */}
                {showRepsListPopover && (
                  <div className="absolute right-4 left-4 bottom-20 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-right flex flex-col max-h-72 animate-scaleUp">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] font-black text-slate-900">
                          المناديب ({salesRepsList.filter(n => n !== 'الكل' && n !== 'أخرى').length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRepsListPopover(false);
                            setShowManageRepsModal(true);
                          }}
                          className="text-[9px] font-black text-indigo-600 hover:underline bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          نافذة الإدارة ⚙️
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowRepsListPopover(false);
                          handleCancelEditRep();
                        }}
                        className="text-slate-450 hover:text-slate-650 p-1 font-black text-xs cursor-pointer"
                      >
                        إغلاق ✕
                      </button>
                    </div>
                    <div className="overflow-y-auto flex-1 space-y-1.5 max-h-48 pr-1 pl-1">
                      {salesRepsList.filter(name => name !== 'الكل' && name !== 'أخرى').map((name) => {
                        const isEditingThis = editingRepName === name;
                        return (
                          <div key={name} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10.5px] font-black text-slate-800">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingRepValue}
                                  onChange={(e) => setEditingRepValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEditRep(name);
                                    } else if (e.key === 'Escape') {
                                      handleCancelEditRep();
                                    }
                                  }}
                                  className="flex-1 text-[10.5px] font-black p-1.5 rounded-lg bg-white border border-indigo-300 text-slate-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditRep(name)}
                                  className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-black cursor-pointer"
                                  title="حفظ"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditRep}
                                  className="p-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[9.5px] font-black cursor-pointer"
                                  title="إلغاء"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="truncate max-w-[130px]">{name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditRep(name)}
                                    className="p-1 px-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-lg transition-all text-[9.5px] font-black cursor-pointer"
                                    title="تعديل اسم المندوب"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRep(name)}
                                    className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-lg transition-all text-[9.5px] font-black cursor-pointer"
                                    title="حذف هذا المندوب"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {salesRepsList.filter(name => name !== 'الكل' && name !== 'أخرى').length === 0 && (
                        <div className="text-center py-6 text-[10px] text-slate-400 font-bold">لا يوجد مناديب مسجلين حالياً.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* USERS TABLE */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-3xs p-6 text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900">سجل أسماء وجداول الحصص الموزعة:</h3>
                <button 
                  onClick={fetchUsers}
                  className="text-[10.5px] font-black text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {loadingUsers && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>تحديث الجدول</span>
                </button>
              </div>

              {loadingUsers && users.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-400">جاري تجميع وفك تشفير جداول الصلاحيات السيبرانية...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-xs">
                  لا يوجد مستخدمون حالياً. يرجى تهيئة مستخدم جديد.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px]">
                        <th className="p-3.5 font-black whitespace-nowrap">اسم الحساب</th>
                        <th className="p-3.5 font-black whitespace-nowrap">الرتبة والدور</th>
                        <th className="p-3.5 font-black whitespace-nowrap">المندوبين المسندين</th>
                        <th className="p-3.5 font-black whitespace-nowrap">الصلاحيات الممنوحة</th>
                        <th className="p-3.5 font-black whitespace-nowrap text-center">حالة الحساب</th>
                        <th className="p-3.5 font-black whitespace-nowrap text-center">إجراءات التحكم والتحوير</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5 font-black text-slate-900">{u.username}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black ${
                              u.role === 'Admin' 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : u.role === 'Manager'
                                  ? 'bg-blue-50 text-blue-700'
                                  : u.role === 'TechnicalSupport'
                                    ? 'bg-purple-50 text-purple-700'
                                    : u.role === 'Monitoring'
                                      ? 'bg-teal-50 text-teal-700'
                                      : 'bg-amber-50 text-amber-700'
                            }`}>
                              {u.role === 'Admin' ? 'مدير نظام (System Administrator)' : 
                               u.role === 'Manager' ? 'مدير قسم (Manager)' : 
                               u.role === 'TechnicalSupport' ? 'موظف دعم فني (Technical Support Employee)' : 
                               u.role === 'Monitoring' ? 'موظف مراقبة وجلسات (Monitoring Employee)' : 
                               'مندوب مبيعات (Sales Representative)'}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-550 max-w-xs truncate" title={u.assignedReps?.join('، ')}>
                            {u.role === 'Admin' ? (
                              <span className="text-indigo-600 font-black">صلاحية تامة على كل المندوبين والعملاء</span>
                            ) : u.role === 'Manager' && (u.assignedReps || []).length === 0 ? (
                              <span className="text-teal-605 font-black">صلاحية عامة على كل المندوبين</span>
                            ) : (u.assignedReps || []).length === 0 ? (
                              <span className="text-rose-600 font-bold">⚠️ لم تسند حصص (لا يرى أي بيانات!)</span>
                            ) : (
                              <span>{(u.assignedReps || []).join('، ')}</span>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-normal max-w-sm">
                            {u.role === 'Admin' ? (
                              <span className="text-[10px] bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded font-black text-slate-500">كل الصلاحيات دون قيود</span>
                            ) : (u.permissions || []).length === 0 ? (
                              <span className="text-[10px] bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-rose-500 font-bold">بدون صلاحيات معينة</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(u.permissions || []).map(p => {
                                  // Translate permission key to friendly label
                                  const labelAr = p === 'customer_view' ? 'عرض عملاء' :
                                                  p === 'customer_add' ? 'إضافة عملاء' :
                                                  p === 'customer_edit' ? 'تعديل عملاء' :
                                                  p === 'customer_delete' ? 'حذف عملاء' :
                                                  p === 'visit_view' ? 'عرض زيارات' :
                                                  p === 'visit_add' ? 'إضافة زيارات' :
                                                  p === 'visit_edit' ? 'تعديل زيارات' :
                                                  p === 'visit_delete' ? 'حذف زيارات' :
                                                  p === 'reports_view' ? 'عرض تقارير' :
                                                  p === 'reports_export' ? 'تصدير تقارير' :
                                                  p === 'user_view' ? 'عرض أعضاء' :
                                                  p === 'user_add' ? 'إضافة أعضاء' :
                                                  p === 'user_edit' ? 'تعديل أعضاء' :
                                                  p === 'user_delete' ? 'حذف أعضاء' :
                                                  p === 'salesrep_view' ? 'عرض مناديب' :
                                                  p === 'salesrep_add' ? 'إضافة مناديب' :
                                                  p === 'salesrep_edit' ? 'تعديل مناديب' :
                                                  p === 'salesrep_delete' ? 'حذف مناديب' : p;
                                  return (
                                    <span key={p} className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded">
                                      {labelAr}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black ${
                              u.isActive 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                              {u.isActive ? 'نشط ومصرح' : 'مجمد ومعطل'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex gap-2 items-center justify-center">
                              <button
                                onClick={() => handleOpenEditReps(u)}
                                className="px-2.5 py-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-black text-[10px] rounded-lg cursor-pointer transition-all"
                              >
                                تعديل الحصص والصلاحية
                              </button>
                              <button
                                onClick={() => handleOpenReset(u)}
                                className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                              >
                                رمز جديد
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg border text-[10px] cursor-pointer transition-all ${
                                  u.isActive 
                                    ? 'border-rose-200 text-rose-700 bg-rose-50/15 hover:bg-rose-50'
                                    : 'border-emerald-200 text-emerald-700 bg-emerald-50/15 hover:bg-emerald-50'
                                }`}
                                title={u.isActive ? "تعطيل الحساب وتجميده فورا" : "تنشيط وإتاحة الحساب"}
                              >
                                {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : rbacSubTab === 'logs' ? (
          <div className="space-y-6">
            
            {/* AUDIT LOG PANEL */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-3xs p-6 text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black text-slate-900">سجل المراقبة والرقابة الأمنية الفوري لـ Select CRM:</h3>
                </div>
                <button 
                  onClick={fetchLogs}
                  className="text-[10.5px] font-black text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {loadingLogs && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>تحديث الأنشطة</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-bold">
                يقوم هذا السجل برصد كافة النشاطات السيبرانية الحساسة، محاولات الدخول الخاطئة والمشبوهة، تهيئة الرموز وتلاعب الصلاحيات لإثبات الشفافية وحماية أعمال المبيعات الميدانية.
              </p>

              {loadingLogs && logs.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-400">جاري قراءة سجلات الخادم الآمن والشيفرات...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-xs">
                  لا توجد سجلات حالية.
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[500px] border border-slate-100 rounded-2xl">
                  <div className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const isDanger = log.action.includes('failed') || log.action.includes('unauthorized') || log.action === 'deactivate_user';
                      const isSuccess = log.action.includes('created') || log.action.includes('success');
                      
                      return (
                        <div key={log.id} className="p-4 hover:bg-slate-50/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-right">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs text-slate-900">{log.username || 'خارجي/مجهول'}</span>
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-black ${
                                isDanger 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                  : isSuccess 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                                {log.action}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-600 font-bold">{log.details}</p>
                          </div>
                          
                          <span className="text-[9.5px] text-slate-400 font-mono" dir="ltr">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-SA') : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="space-y-6">
            
            {/* RECYCLE BIN PANEL */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-3xs p-6 text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">♻️</span>
                  <h3 className="text-xs font-black text-slate-900">سلة المحذوفات المؤقتة والاسترداد الآمن للزيارات:</h3>
                </div>
                <div className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] rounded-lg font-black border border-rose-100/50">
                  سجلات معلقة ({softDeletedVisits.length})
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                تظهر هنا كافة سجلات وتفاصيل الزيارات الميدانية التي تم إزالتها بواسطة المدير. يمكن للمسؤول استعادة أي سجل بكامل تفاصيله وبيانات العميل الموثقة سلفاً وإعادة إدراجها للمزامنة وسلاسل الصفقات النشطة بضغطة زر.
              </p>

              {softDeletedVisits.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">🍃</span>
                  <span>سلة المحذوفات نظيفة تماماً ولا توجد عناصر محذوفة حالياً!</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[9.5px]">
                        <th className="p-3.5 font-black">معرف السجل</th>
                        <th className="p-3.5 font-black">اسم التاجر العميل</th>
                        <th className="p-3.5 font-black">المندوب المسؤول</th>
                        <th className="p-3.5 font-black text-right font-sans">توع الزيارة</th>
                        <th className="p-3.5 font-black text-right font-sans">توقيت الحدث</th>
                        <th className="p-3.5 font-black text-center">استرداد السجل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-black text-slate-700">
                      {softDeletedVisits.map((v: any, idx: number) => (
                        <tr key={v.id || idx} className="hover:bg-slate-50/20 text-[11px]">
                          <td className="p-3.5 font-mono text-[10px] text-zinc-500">{v.id}</td>
                          <td className="p-3.5 font-bold text-slate-900">{v.customerName}</td>
                          <td className="p-3.5 text-slate-600">{v.repName}</td>
                          <td className="p-3.5 text-right font-sans">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                              v.visitType === 'زيارة جديدة' 
                                ? 'bg-teal-50 text-teal-700 border-teal-100' 
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                              {v.visitType}
                            </span>
                          </td>
                          <td className="p-3.5 text-right text-slate-400 font-mono text-[10.5px]" dir="ltr">
                            {new Date(v.timestamp).toLocaleString('ar-SA')}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (onRestoreVisit) {
                                  onRestoreVisit(v.id);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black transition-all hover:scale-[1.03] active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-3xs"
                            >
                              <span>استعادة السجل النشط 🔄</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ==================== CREATE USER DIALOG overlay ==================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl text-right animate-scaleUp relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">إنشاء وتأسيس حساب مستخدم جديد</h3>
              </div>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded-lg hover:bg-slate-55 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">اسم الحساب المسجل (اسم المبيعات):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: AhmedSaleh"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700">كلمة المرور الابتدائية (الرمز السري):</label>
                  <input
                    type="password"
                    required
                    placeholder="حد أدنى ٤ خانات"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700">نوع ورتبة الموظف الجديد:</label>
                  <select
                    value={newRole}
                    onChange={(e) => handleNewRoleChange(e.target.value as 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring')}
                    className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="User">مندوب مبيعات (Sales Representative)</option>
                    <option value="TechnicalSupport">موظف دعم فني (Technical Support Employee)</option>
                    <option value="Monitoring">موظف مراقبة وجلسات (Monitoring Employee)</option>
                    <option value="Manager">مدير قسم (Manager)</option>
                    <option value="Admin">مدير نظام ومسؤول (System Administrator)</option>
                  </select>
                </div>
              </div>

              {newRole !== 'Admin' && (
                <div className="space-y-2 border-t border-slate-100 pt-3 text-right">
                  <span className="text-[11px] font-black text-slate-800 block">إسناد وتوزيع حصص المندوبين (الحارس الأمني لطاقم المبيعات):</span>
                  <p className="text-[10px] text-slate-400 font-bold mb-2">
                    {newRole === 'Manager' 
                      ? 'اختياري للمدير: إذا أبقيته فارغاً سيتمكن من تصفح كافة المناديب والعملاء. أما إذا تم إسناد مناديب محددين، ستنحصر رؤيته وعملياته في هؤلاء حصراً.' 
                      : newRole === 'User'
                        ? 'إلزامي للمستشار: يمكنك إسناد مندوب أو أكثر لتقييد رؤيته للعملاء وسجل الزيارات والتقارير بمجموع هؤلاء فقط.'
                        : 'اختياري لموظفي الدعم والمراقبة لتحديد نطاق عمل الحساب بمندوبين محددين إن رغبت.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-150">
                    {salesRepsList.filter(name => name !== 'الكل' && name !== 'أخرى').map((rep) => {
                      const isChecked = newAssignedReps.includes(rep);
                      return (
                        <button
                          type="button"
                          key={rep}
                          onClick={() => toggleRepInNewUser(rep)}
                          className={`p-2 rounded-lg text-right text-[10.5px] font-black flex items-center justify-between transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-indigo-600 text-white shadow-3xs' 
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-150'
                          }`}
                        >
                          <span>{rep}</span>
                          {isChecked ? <Check className="w-3.5 h-3.5 text-white" /> : <span className="w-3.5 h-3.5 rounded border border-slate-350"></span>}
                        </button>
                      );
                    })}
                  </div>
                  {newAssignedReps.length === 0 && newRole === 'User' && (
                    <span className="text-[9.5px] text-rose-500 font-black block">💡 تنبيه: إذا لم يتم إسناد أي مندوب، لن يرى الحساب المحدود أي بيانات زيارات أو عملاء.</span>
                  )}
                </div>
              )}

              {/* Advanced Permissions Assign Checklist inside Creating user popup */}
              <div className="space-y-3 border-t border-slate-100 pt-3 text-right">
                <span className="text-[11px] font-black text-slate-800 block">إعداد الصلاحيات المفصلة للعمليات (Granular Operations Permissions):</span>
                <p className="text-[10px] text-slate-400 font-bold mb-2">
                  {newRole === 'Admin' ? '💡 حساب مدير النظام (Admin) يمتلك كافة الصلاحيات بشكل كامل ومطلق وتلقائياً دون شروط.' : 'اختر الصلاحيات الفردية بعناية لتعديل نطاق عمل الحساب.'}
                </p>

                {newRole !== 'Admin' && (
                  <div className="space-y-4 max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-150 text-right">
                    {PERMISSION_CATEGORIES.map((cat, idx) => (
                      <div key={idx} className="space-y-2 border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                        <h4 className="text-[10px] font-extrabold text-indigo-700">{cat.title}</h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {cat.permissions.map((perm) => {
                            const isChecked = newPermissions.includes(perm.key);
                            return (
                              <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-slate-700 hover:text-slate-900 justify-start select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermissionInNewUser(perm.key)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 accent-indigo-600"
                                />
                                <span>{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء التأسيس
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl shadow-xs hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>توليد حساب الحماية</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT ASSIGNMENT & ROLES MODAL ==================== */}
      {showEditRepsModal && editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl text-right animate-scaleUp relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">تعديل حصص ورؤية المندوبين لـ ({editingUser.username})</h3>
              </div>
              <button 
                onClick={() => {
                  setShowEditRepsModal(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveRepsAndRole} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">تحديث نوع ورتبة الموظف:</label>
                <select
                  value={editRole}
                  onChange={(e) => handleEditRoleChange(e.target.value as 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring')}
                  className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800"
                >
                  <option value="User">مندوب مبيعات (Sales Representative)</option>
                  <option value="TechnicalSupport">موظف دعم فني (Technical Support Employee)</option>
                  <option value="Monitoring">موظف مراقبة وجلسات (Monitoring Employee)</option>
                  <option value="Manager">مدير قسم (Manager)</option>
                  <option value="Admin">مدير نظام ومسؤول (System Administrator)</option>
                </select>
              </div>

              {editRole !== 'Admin' && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-black text-slate-800 block">حصص المندوبين والعملاء المسندة للحساب:</span>
                  <p className="text-[10px] text-slate-450 font-bold mb-2">
                    {editRole === 'Manager' 
                      ? 'اختياري للمدير: إذا أبقيته فارغاً سيتمكن من تصفح كافة المناديب والعملاء. أما إذا تم إسناد مناديب محددين، ستنحصر رؤيته وعملياته في هؤلاء حصراً.' 
                      : editRole === 'User'
                        ? 'إلزامي للمستشار: يرجى تحديد المناديب والعملاء المسند إليهم هذا الحساب حصراً.'
                        : 'اختياري لموظفي الدعم والمراقبة لتحديد نطاق عمل الحساب بمندوبين محددين إن رغبت.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-150">
                    {salesRepsList.filter(name => name !== 'الكل' && name !== 'أخرى').map((rep) => {
                      const isChecked = editAssignedReps.includes(rep);
                      return (
                        <button
                          type="button"
                          key={rep}
                          onClick={() => toggleRepInEditUser(rep)}
                          className={`p-2 rounded-lg text-right text-[10.5px] font-black flex items-center justify-between transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-indigo-600 text-white shadow-3xs' 
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-150'
                          }`}
                        >
                          <span>{rep}</span>
                          {isChecked ? <Check className="w-3.5 h-3.5 text-white" /> : <span className="w-3.5 h-3.5 rounded border border-slate-350"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Advanced Permissions Assign Checklist inside Editing user popup */}
              <div className="space-y-3 border-t border-slate-100 pt-3 text-right">
                <span className="text-[11px] font-black text-slate-800 block">تعديل الصلاحيات الفردية للحساب (Edit Granular Permissions):</span>
                <p className="text-[10px] text-slate-400 font-bold mb-2">
                  {editRole === 'Admin' ? '💡 حساب مدير النظام (Admin) يمتلك كافة صلاحيات القراءة والتعديل والحذف عامةً دون تقييد.' : 'قم بتعديل الامتيازات التفصيلية وتفعيل/تعطيل صلاحيات الاستخدام.'}
                </p>

                {editRole !== 'Admin' && (
                  <div className="space-y-4 max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-150 text-right">
                    {PERMISSION_CATEGORIES.map((cat, idx) => (
                      <div key={idx} className="space-y-2 border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                        <h4 className="text-[10px] font-extrabold text-indigo-700">{cat.title}</h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {cat.permissions.map((perm) => {
                            const isChecked = editPermissions.includes(perm.key);
                            return (
                              <label key={perm.key} className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-slate-700 hover:text-slate-900 justify-start select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermissionInEditUser(perm.key)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 accent-indigo-600"
                                />
                                <span>{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRepsModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl shadow-xs hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ الصلاحيات المعدلة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== RESET PASSWORD DIALOG OVERLAY ==================== */}
      {showResetModal && resettingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-right animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">إعادة تعيين الرمز السري للمستخدم</h3>
              </div>
              <button 
                onClick={() => {
                  setShowResetModal(false);
                  setResettingUser(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <p className="text-[10px] text-slate-500 font-bold leading-normal">
                المستهدف: الزميل <span className="text-slate-900 font-black">"{resettingUser.username}"</span>.<br />
                تنبيه: سيؤدي تعديل هذا الرمز لإنهاء وطرد الجلسات الفعالة للزميل من جهاز الهاتف ومطالبته بتسجيل الدخول الفوري مجدداً.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700">رمز المرور الجديد:</label>
                <input
                  type="password"
                  required
                  placeholder="لا يقل عن ٤ خانات"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResettingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء التغيير
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تبديل الرمز وطرد الجلسات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MANAGE SALES REPS MODAL (ADD, EDIT, DELETE) ==================== */}
      {showManageRepsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full border border-slate-100 shadow-2xl text-right animate-scaleUp relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">إدارة مناديب المبيعات</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black">
                      {salesRepsList.filter(name => name !== 'الكل' && name !== 'أخرى').length} مندوب مسجل
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">إضافة مناديب جدد، تعديل أسمائهم، أو حذفهم من النظام وتحديث السجلات المرتبطة</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowManageRepsModal(false);
                  setEditingRepName(null);
                  setEditingRepValue('');
                  setRepSearchQuery('');
                  setModalNewRepInput('');
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Quick Add Section */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 mb-3 space-y-2">
              <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>إضافة مندوب مبيعات جديد:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أدخل اسم المندوب الجديد بالكامل..."
                  value={modalNewRepInput}
                  onChange={(e) => setModalNewRepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRepDirect(modalNewRepInput);
                    }
                  }}
                  className="flex-1 text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-right"
                />
                <button
                  type="button"
                  onClick={() => handleAddRepDirect(modalNewRepInput)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مندوب</span>
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث في قائمة المناديب..."
                value={repSearchQuery}
                onChange={(e) => setRepSearchQuery(e.target.value)}
                className="w-full text-xs font-bold pr-8 pl-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15 text-right"
              />
            </div>

            {/* Reps List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 pl-1 max-h-[45vh]">
              {filteredModalReps.map((repName, idx) => {
                const isEditing = editingRepName === repName;

                return (
                  <div 
                    key={repName} 
                    className={`p-3 rounded-2xl border transition-all ${
                      isEditing 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' 
                        : 'bg-white hover:bg-slate-50 border-slate-150'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingRepValue}
                            onChange={(e) => setEditingRepValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEditRep(repName);
                              } else if (e.key === 'Escape') {
                                handleCancelEditRep();
                              }
                            }}
                            className="flex-1 text-xs font-black p-2 rounded-xl bg-white border border-indigo-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditRep(repName)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
                            title="حفظ التعديل"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditRep}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                            title="إلغاء التعديل"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>إلغاء</span>
                          </button>
                        </div>
                        <p className="text-[9.5px] text-indigo-600 font-bold">
                          💡 عند حفظ الاسم، سيتم تحديث حصص المندوبين في الحسابات وسجلات الزيارات والعملاء تلقائياً.
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-800 font-mono font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900">{repName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferSourceRep(repName);
                              setIsTransferModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-150 rounded-xl text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-all"
                            title="نقل وإسناد عملاء هذا المندوب إلى مندوب آخر"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>نقل العملاء</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditRep(repName)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-xl text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-all"
                            title="تعديل اسم المندوب"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRep(repName)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 rounded-xl text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-all"
                            title="حذف هذا المندوب"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredModalReps.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold text-xs">
                  {repSearchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد مناديب مسجلين في النظام'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-2 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold">
                إجمالي المناديب: {salesRepsList.filter(n => n !== 'الكل' && n !== 'أخرى').length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowManageRepsModal(false);
                  setEditingRepName(null);
                  setEditingRepValue('');
                  setRepSearchQuery('');
                  setModalNewRepInput('');
                }}
                className="px-5 py-2 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER CUSTOMERS MODAL */}
      {isTransferModalOpen && (
        <TransferCustomersModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          salesReps={salesRepsList}
          customers={customers}
          visits={visits}
          initialSourceRep={transferSourceRep}
          onTransferSuccess={(result) => {
            onTransferSuccess?.(result);
            fetchLogs();
          }}
          triggerMessage={triggerMessage}
        />
      )}

      {/* ADMIN LOGO MODAL */}
      {isLogoModalOpen && (
        <AdminLogoModal
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
          currentLogo={companyLogo}
          onLogoUpdated={(newLogo) => {
            onUpdateLogo?.(newLogo);
          }}
          triggerMessage={triggerMessage}
        />
      )}

    </div>
  );
}
