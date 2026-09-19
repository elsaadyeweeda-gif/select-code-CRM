/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, SupportTask, SupportNote, UserAccount } from '../types';
import { 
  Wrench, Plus, Clock, User, Calendar, AlertTriangle, 
  CheckCircle, MessageSquare, Search, Filter, Trash2, 
  FileText, Clipboard, ChevronDown, RefreshCw, Star, ArrowLeft
} from 'lucide-react';

interface TechnicalSupportViewProps {
  currentUser: UserAccount;
  customers: Customer[];
  token: string;
}

export default function TechnicalSupportView({ 
  currentUser, 
  customers,
  token
}: TechnicalSupportViewProps) {
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [supportEmployees, setSupportEmployees] = useState<UserAccount[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'trials'>('list');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected Task for Details View
  const [selectedTask, setSelectedTask] = useState<SupportTask | null>(null);
  const [notes, setNotes] = useState<SupportNote[]>([]);
  const [newNote, setNewNote] = useState<string>('');
  const [noteType, setNoteType] = useState<'general' | 'visit' | 'installation' | 'demo'>('general');

  // Create Task Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [supportCustomerSearch, setSupportCustomerSearch] = useState<string>('');
  const [showSupportCustomerDropdown, setShowSupportCustomerDropdown] = useState<boolean>(false);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>(
    currentUser?.role === 'TechnicalSupport' ? currentUser.id : ''
  );

  // Handle outside click for support customer dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const container = document.getElementById('support-customer-search-container');
      if (container && !container.contains(e.target as Node)) {
        setShowSupportCustomerDropdown(false);
      }
    };
    if (showSupportCustomerDropdown) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showSupportCustomerDropdown]);
  const [taskType, setTaskType] = useState<SupportTask['taskType']>('Final Version Installation');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<SupportTask['priority']>('Medium');

  // Conditional Fields
  const [demoDate, setDemoDate] = useState<string>('');
  const [demoTime, setDemoTime] = useState<string>('');
  const [demoObjective, setDemoObjective] = useState<string>('');
  const [demoNotes, setDemoNotes] = useState<string>('');

  const [trialStartDate, setTrialStartDate] = useState<string>('');
  const [trialExpirationDate, setTrialExpirationDate] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Transfer to Trial Board State
  const [showTransferForm, setShowTransferForm] = useState<boolean>(false);
  const [transferStartDate, setTransferStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferExpirationDate, setTransferExpirationDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Reset transfer form when selected task changes
  useEffect(() => {
    setShowTransferForm(false);
    setTransferStartDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setTransferExpirationDate(d.toISOString().split('T')[0]);
    setTransferNotes('');
  }, [selectedTask]);

  // Fetch support tasks & support employees
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Tasks
      const resTasks = await fetch('/api/support/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataTasks = await resTasks.json();
      if (dataTasks.status === 'success') {
        setTasks(dataTasks.tasks);
      } else {
        setError(dataTasks.error);
      }

      // Fetch Support Employees
      const resEmps = await fetch('/api/users/support', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataEmps = await resEmps.json();
      if (dataEmps.status === 'success') {
        setSupportEmployees(dataEmps.users);
      }
    } catch (err: any) {
      setError('خطأ في الاتصال بالخادم وتحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Fetch notes for selected task
  const fetchNotes = async (taskId: string) => {
    try {
      const res = await fetch(`/api/support/notes/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotes(data.notes);
      }
    } catch (err) {
      console.error('Error loading notes', err);
    }
  };

  useEffect(() => {
    if (selectedTask) {
      fetchNotes(selectedTask.id);
    }
  }, [selectedTask]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedCustomerId || !assignedEmployeeId || !description) {
      setError('يرجى ملء جميع الحقول المطلوبة واختيار الموظف والعميل');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    const employee = supportEmployees.find(u => u.id === assignedEmployeeId);

    if (!customer || !employee) {
      setError('العميل أو موظف الدعم المحدد غير صالح');
      return;
    }

    const taskId = 'TSK-' + Math.floor(100000 + Math.random() * 900000);

    const taskPayload: Partial<SupportTask> = {
      id: taskId,
      customerId: customer.id,
      customerName: customer.name,
      assignedEmployeeId: employee.id,
      assignedEmployeeName: employee.username,
      taskType,
      description,
      priority,
      status: 'New',
      assignedAt: new Date().toISOString(),
      // Conditional Demo fields
      demoDate: taskType === 'Demo Presentation' ? demoDate : null,
      demoTime: taskType === 'Demo Presentation' ? demoTime : null,
      demoObjective: taskType === 'Demo Presentation' ? demoObjective : null,
      demoNotes: taskType === 'Demo Presentation' ? demoNotes : null,
      // Conditional Trial fields
      trialStartDate: taskType === 'Trial Version Installation' ? trialStartDate : null,
      trialExpirationDate: taskType === 'Trial Version Installation' ? trialExpirationDate : null,
    };

    try {
      const res = await fetch('/api/support/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ task: taskPayload })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccess('تم تسجيل وإسناد مهمة الدعم الفني بنجاح!');
        // Reset fields
        setSelectedCustomerId('');
        setSupportCustomerSearch('');
        setAssignedEmployeeId(currentUser?.role === 'TechnicalSupport' ? currentUser.id : '');
        setDescription('');
        setDemoDate('');
        setDemoTime('');
        setDemoObjective('');
        setDemoNotes('');
        setTrialStartDate('');
        setTrialExpirationDate('');
        
        // Refresh Tasks
        fetchData();
        setActiveSubTab('list');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('خطأ في إرسال البيانات وحفظ المهمة');
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (taskId: string, status: SupportTask['status']) => {
    try {
      const res = await fetch(`/api/support/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Update local tasks list
        setTasks(prev => prev.map(t => t.id === taskId ? { 
          ...t, 
          status, 
          startedAt: status === 'In Progress' ? new Date().toISOString() : t.startedAt,
          completedAt: status === 'Completed' ? new Date().toISOString() : t.completedAt
        } : t));
        
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(prev => prev ? { 
            ...prev, 
            status,
            startedAt: status === 'In Progress' ? new Date().toISOString() : prev.startedAt,
            completedAt: status === 'Completed' ? new Date().toISOString() : prev.completedAt
          } : null);
        }
        setSuccess('تم تحديث حالة المهمة وتسجيل النشاط');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('خطأ في الاتصال وتحديث الحالة');
    }
  };

  // Handle Add Note / Action Report
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedTask) return;

    try {
      const res = await fetch(`/api/support/tasks/${selectedTask.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote, type: noteType })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotes(prev => [data.note, ...prev]);
        setNewNote('');
        setSuccess('تم حفظ التقرير والتعليق بنجاح');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('حدث خطأ أثناء حفظ التعليق');
    }
  };

  // Handle transferring customer to Trial Version Installation board/dashboard
  const handleTransferToTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const customer = customers.find(c => c.id === selectedTask.customerId);
    if (!customer) {
      setError('تعذر العثور على بيانات العميل في النظام');
      setLoading(false);
      return;
    }

    const taskId = 'TSK-' + Math.floor(100000 + Math.random() * 900000);
    const taskPayload = {
      id: taskId,
      customerId: customer.id,
      customerName: customer.name,
      assignedEmployeeId: currentUser.id,
      assignedEmployeeName: currentUser.username,
      taskType: 'Trial Version Installation' as const,
      description: transferNotes.trim() || `تم تفعيل رخصة ونقل العميل إلى لوحة النسخ التجريبية بعد إتمام مهمة: ${selectedTask.taskType}`,
      priority: 'High' as const,
      status: 'In Progress' as const,
      assignedAt: new Date().toISOString(),
      trialStartDate: transferStartDate,
      trialExpirationDate: transferExpirationDate,
    };

    try {
      // 1. Create the Trial Installation Support Task
      const resTask = await fetch('/api/support/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ task: taskPayload })
      });
      const dataTask = await resTask.json();

      if (dataTask.status !== 'success') {
        throw new Error(dataTask.error || 'فشل تفعيل رخصة النسخة التجريبية للعميل');
      }

      // 2. Update Customer\'s currentStatus to \'جاري المتابعة\'
      await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer: {
            ...customer,
            currentStatus: 'جاري المتابعة'
          }
        })
      });

      // 3. Add transition note to the current task
      const transitionNoteText = `🧪 تم نقل العميل بنجاح إلى لوحة النسخ التجريبية. تاريخ بدء الترخيص: ${transferStartDate}، تاريخ الانتهاء: ${transferExpirationDate}. المهمة المرجعية الجديدة: ${taskId}`;
      await fetch(`/api/support/tasks/${selectedTask.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: transitionNoteText, type: 'general' })
      });

      // 4. Update the current task status to 'Completed' to remove it from active tasks
      await fetch(`/api/support/tasks/${selectedTask.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Completed' })
      });

      // 4b. Update all other active tasks for this customer to 'Completed' so they are removed from active tasks
      const activeTasksForCustomer = tasks.filter(t => t.customerId === customer.id && t.id !== selectedTask.id && t.status !== 'Completed' && t.status !== 'Cancelled');
      await Promise.all(activeTasksForCustomer.map(t => 
        fetch(`/api/support/tasks/${t.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'Completed' })
        })
      ));

      setSuccess('تم تفعيل الفترة التجريبية ونقل العميل بنجاح إلى لوحة النسخ التجريبية وإتمام كافة المهام الفنية والنشطة المتعلقة به بنجاح! 🧪✨');
      setShowTransferForm(false);
      setSelectedTask(null);

      // Reload tasks & trial list
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء نقل العميل إلى لوحة النسخ التجريبية');
    } finally {
      setLoading(false);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    // Exclude Trial Version Installation tasks from the main active tasks list as they belong to the Trials Board (لوحة النسخ التجريبية)
    if (t.taskType === 'Trial Version Installation') return false;

    const matchesSearch = t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate Trial Installations Stats
  const trialTasks = tasks.filter(t => t.taskType === 'Trial Version Installation' && t.trialExpirationDate);
  const nowStr = new Date().toISOString().split('T')[0];

  const trialStats = {
    active: trialTasks.filter(t => t.trialExpirationDate && t.trialExpirationDate >= nowStr && t.status !== 'Completed').length,
    expired: trialTasks.filter(t => t.trialExpirationDate && t.trialExpirationDate < nowStr).length,
    upcoming: trialTasks.filter(t => {
      if (!t.trialExpirationDate || t.trialExpirationDate < nowStr) return false;
      const diff = new Date(t.trialExpirationDate).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 7;
    }).length,
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" id="tech-support-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-100 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-teal-600 animate-spin-slow" />
            <span>قسم الدعم الفني وتكامل الأنظمة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة طلبات التثبيت، النسخ التجريبية، التدريب، المتابعة، والشكاوى الفنية وحلها
          </p>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData()}
            className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-lg transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-100">
            صلاحيتك: {
              currentUser.role === 'Admin' ? 'مدير نظام' :
              currentUser.role === 'Manager' ? 'مشرف عام' :
              currentUser.role === 'TechnicalSupport' ? 'موظف دعم فني' : 'مستشار مبيعات'
            }
          </div>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Sub-Tabs Selector */}
      {!selectedTask && (
        <div className="flex bg-slate-50 p-1 rounded-xl mb-6 border border-slate-100 w-fit">
          <button
            onClick={() => { setActiveSubTab('list'); setSuccess(null); setError(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            قائمة المهام المسندة ({filteredTasks.length})
          </button>

          {(currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'TechnicalSupport') && (
            <button
              onClick={() => { 
                setActiveSubTab('create'); 
                setSuccess(null); 
                setError(null); 
                if (currentUser.role === 'TechnicalSupport') {
                  setAssignedEmployeeId(currentUser.id);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeSubTab === 'create' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-teal-700'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>{currentUser.role === 'TechnicalSupport' ? 'عمل مهمة بنفسي 🛠️' : 'إسناد مهمة جديدة'}</span>
            </button>
          )}

          <button
            onClick={() => { setActiveSubTab('trials'); setSuccess(null); setError(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'trials' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-700'
            }`}
          >
            لوحة النسخ التجريبية ({trialTasks.length})
          </button>
        </div>
      )}

      {/* Detail Panel View (If task selected) */}
      {selectedTask ? (
        <div className="space-y-6">
          {/* Back Header */}
          <button
            onClick={() => setSelectedTask(null)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-600 transition-all mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة لجدول المهام</span>
          </button>

          {/* Task Header info */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  {selectedTask.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  selectedTask.priority === 'Urgent' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                  selectedTask.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                  selectedTask.priority === 'Medium' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  الأولوية: {selectedTask.priority}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800 mt-2">
                {selectedTask.taskType} - {selectedTask.customerName}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>المهندس المسؤول: <strong>{selectedTask.assignedEmployeeName}</strong></span>
              </p>
            </div>

            {/* Status Switcher (For assigned employee or Admin) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <span className="text-xs font-bold text-slate-500">حالة المهمة:</span>
              <div className="flex flex-wrap gap-1">
                {(['New', 'In Progress', 'Waiting Customer Response', 'Completed', 'Cancelled'] as SupportTask['status'][]).map(st => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedTask.id, st)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                      selectedTask.status === st
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {
                      st === 'New' ? 'جديدة' :
                      st === 'In Progress' ? 'قيد العمل' :
                      st === 'Waiting Customer Response' ? 'بانتظار العميل' :
                      st === 'Completed' ? 'مكتملة' : 'ملغاة'
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Two-Column Detail Body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Information Details */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 border-b pb-1.5">بيانات عامة</h4>
                
                <div className="text-xs space-y-2">
                  <p className="flex justify-between">
                    <span className="text-slate-400">تاريخ الإسناد:</span>
                    <span className="font-bold font-mono text-slate-600">{selectedTask.assignedAt.slice(0, 10)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">بدء العمل:</span>
                    <span className="font-bold font-mono text-slate-600">
                      {selectedTask.startedAt ? selectedTask.startedAt.slice(0, 10) : 'لم يبدأ بعد'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">تاريخ الانتهاء:</span>
                    <span className="font-bold font-mono text-slate-600">
                      {selectedTask.completedAt ? selectedTask.completedAt.slice(0, 10) : 'قيد المتابعة'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">بواسطة:</span>
                    <span className="font-bold text-slate-600">{selectedTask.createdBy}</span>
                  </p>
                </div>
              </div>

              {(() => {
                const taskCustomer = customers.find(c => 
                  c.id === selectedTask.customerId || 
                  (c.name && selectedTask.customerName && c.name.toLowerCase().trim() === selectedTask.customerName.toLowerCase().trim())
                );
                if (!taskCustomer) return null;
                return (
                  <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-150 space-y-3 text-right" dir="rtl">
                    <h4 className="text-xs font-bold text-indigo-950 border-b pb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>بيانات العميل المستبينة للمهندس 📞</span>
                    </h4>
                    <div className="text-xs space-y-2">
                      <p className="flex justify-between">
                        <span className="text-slate-400">اسم العميل:</span>
                        <strong className="text-slate-800">{taskCustomer.name}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">الهاتف/الجوال:</span>
                        <strong className="text-slate-800 font-mono" dir="ltr">{taskCustomer.phone || '--'}</strong>
                      </p>
                      {taskCustomer.contactPerson && (
                        <p className="flex justify-between">
                          <span className="text-slate-400">الشخص المسؤول:</span>
                          <strong className="text-slate-800">{taskCustomer.contactPerson}</strong>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span className="text-slate-400">العنوان والمحافظة:</span>
                        <strong className="text-slate-800">{taskCustomer.province || taskCustomer.address || '--'}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">الحالة البيعية الحالية:</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          {taskCustomer.currentStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Transfer Customer to Trial board */}
              {selectedTask.taskType !== 'Trial Version Installation' && (
                <div className="p-4 bg-gradient-to-br from-teal-50/50 to-amber-50/30 rounded-xl border border-teal-100 space-y-3 text-right" dir="rtl">
                  <h4 className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                    <span className="text-base">🧪</span>
                    <span>نقل العميل إلى لوحة النسخ التجريبية</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    بإمكانك تفعيل فترة تجريبية لهذا العميل ونقله تلقائياً إلى لوحة متابعة التراخيص والنسخ التجريبية لتتبع حالته والتحذيرات.
                  </p>

                  {!showTransferForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransferForm(true);
                        setTransferNotes(`تفعيل رخصة تجريبية للعميل تلقائياً بعد إتمام مهمة: ${selectedTask.taskType}`);
                      }}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>بدء التفعيل ونقل العميل 🚀</span>
                    </button>
                  ) : (
                    <form onSubmit={handleTransferToTrial} className="space-y-3 border-t border-teal-100 pt-3 text-right">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-600">تاريخ بدء الفترة التجريبية *</label>
                        <input
                          type="date"
                          value={transferStartDate}
                          onChange={(e) => setTransferStartDate(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-600">تاريخ انتهاء فترة التجربة *</label>
                        <input
                          type="date"
                          value={transferExpirationDate}
                          onChange={(e) => setTransferExpirationDate(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-600">وصف أو ملاحظات الترخيص</label>
                        <textarea
                          value={transferNotes}
                          onChange={(e) => setTransferNotes(e.target.value)}
                          placeholder="اكتب أي ملاحظات فنية حول هذه الرخصة التجريبية..."
                          className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-white min-h-[50px] leading-relaxed"
                        />
                      </div>

                      <div className="flex gap-2 pt-1.5">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          {loading ? 'جاري الحفظ...' : 'تأكيد النقل والتفعيل 🧪'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTransferForm(false)}
                          className="px-3 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Demo Presentation Specific details */}
              {selectedTask.taskType === 'Demo Presentation' && (
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-3">
                  <h4 className="text-xs font-bold text-amber-800 border-b pb-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>تفاصيل العرض التقديمي (Demo)</span>
                  </h4>
                  <div className="text-xs space-y-2">
                    <p>
                      <span className="text-slate-500">التاريخ والوقت: </span>
                      <strong className="text-slate-700 font-mono">{selectedTask.demoDate} {selectedTask.demoTime}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">الهدف الأساسي: </span>
                      <span className="text-slate-700 font-bold block bg-white p-2 rounded mt-1 border border-slate-100">{selectedTask.demoObjective || 'غير محدد'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">ملاحظات التحضير: </span>
                      <span className="text-slate-600 block bg-white p-2 rounded mt-1 border border-slate-100 text-justify">{selectedTask.demoNotes || 'لا يوجد'}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Trial Installation specific details */}
              {selectedTask.taskType === 'Trial Version Installation' && (
                <div className="bg-sky-50/40 p-4 rounded-xl border border-sky-100 space-y-3">
                  <h4 className="text-xs font-bold text-sky-800 border-b pb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                    <span>تفاصيل الفترة التجريبية (Trial)</span>
                  </h4>
                  <div className="text-xs space-y-2">
                    <p className="flex justify-between">
                      <span className="text-slate-500">تاريخ بدء التجربة: </span>
                      <strong className="text-slate-700 font-mono">{selectedTask.trialStartDate}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">تاريخ انتهاء التجربة: </span>
                      <strong className="text-slate-700 font-mono text-rose-600">{selectedTask.trialExpirationDate}</strong>
                    </p>
                    <div className="p-2 bg-white rounded border border-slate-100 text-[10px] mt-2 text-slate-500">
                      سيقوم النظام بإرسال تذكيرات تلقائية بانتهاء الرخصة قبل 7 أيام و 3 أيام ويوم انتهائها للمهندس والإدارة.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description & Interactive Comments / Notes */}
            <div className="lg:col-span-2 space-y-4">
              {/* Description */}
              <div className="p-4 bg-white rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>الوصف والعمل المطلوب:</span>
                </h4>
                <p className="text-xs text-slate-800 leading-relaxed text-justify bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                  {selectedTask.description}
                </p>
              </div>

              {/* Comments & Action Reports log */}
              <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1 border-b pb-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <span>سجل الإجراءات والتقارير الفنية الملحقة ({notes.length})</span>
                </h4>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="اكتب تفاصيل الإجراء الفني المتخذ، أو تفاصيل الزيارة والتثبيت، أو أي ملاحظات..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:outline-none bg-white min-h-[70px]"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500">نوع التقرير:</span>
                      <select
                        value={noteType}
                        onChange={(e: any) => setNoteType(e.target.value)}
                        className="text-[10px] p-1.5 rounded border border-slate-200 bg-white"
                      >
                        <option value="general">ملاحظة عامة</option>
                        <option value="visit">تقرير زيارة فنية</option>
                        <option value="installation">تقرير تثبيت رخصة</option>
                        <option value="demo">تقرير تقديم عرض تجريبي</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                    >
                      حفظ التقرير
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {notes.length === 0 ? (
                    <p className="text-[10px] text-center text-slate-400 py-6">لا توجد تقارير أو ملاحظات مسجلة لهذه المهمة حالياً</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className="p-3 bg-slate-50/40 rounded-xl border border-slate-100 text-xs">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">{n.author}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                              n.type === 'visit' ? 'bg-amber-100 text-amber-800' :
                              n.type === 'installation' ? 'bg-indigo-100 text-indigo-800' :
                              n.type === 'demo' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200/70 text-slate-600'
                            }`}>
                              {
                                n.type === 'visit' ? 'تقرير زيارة' :
                                n.type === 'installation' ? 'تثبيت رخصة' :
                                n.type === 'demo' ? 'تقرير عرض' : 'ملاحظة عامة'
                              }
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(n.timestamp).toLocaleString('ar-EG')}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-justify whitespace-pre-wrap">
                          {n.note}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Dashboard Tabs Content */
        <div>
          {/* 1. Tasks List Sub-Tab */}
          {activeSubTab === 'list' && (
            <div className="space-y-4">
              {/* Search & Filter bar */}
              <div className="flex flex-col md:flex-row gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن مهمة، عميل، أو وصف عمل فني..."
                    className="w-full text-xs pr-9 pl-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 font-bold text-slate-600"
                  >
                    <option value="all">كل الحالات الفنية</option>
                    <option value="New">جديدة (لم تبدأ)</option>
                    <option value="In Progress">قيد العمل</option>
                    <option value="Waiting Customer Response">بانتظار العميل</option>
                    <option value="Completed">مكتملة</option>
                    <option value="Cancelled">ملغاة</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 font-bold text-slate-600"
                  >
                    <option value="all">كل الأولويات</option>
                    <option value="Low">منخفضة</option>
                    <option value="Medium">متوسطة</option>
                    <option value="High">مرتفعة</option>
                    <option value="Urgent">عاجلة / طارئة</option>
                  </select>
                </div>
              </div>

              {/* Tasks Cards/Grid */}
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <Clipboard className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-500">لا توجد مهام دعم فني مطابقة لخيارات البحث حالياً</p>
                  <p className="text-[10px] text-slate-400 mt-1">تأكد من إسناد المهام من قبل مدير النظام أو مشرف القسم</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="p-5 bg-white border border-slate-200/70 hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-50/40 rounded-xl transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group"
                    >
                      {/* Left Priority border */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                        t.priority === 'Urgent' ? 'bg-rose-500' :
                        t.priority === 'High' ? 'bg-amber-500' :
                        t.priority === 'Medium' ? 'bg-teal-500' : 'bg-slate-300'
                      }`} />

                      <div>
                        {/* Top Metadata */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {t.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            t.status === 'New' ? 'bg-slate-100 text-slate-600' :
                            t.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                            t.status === 'Waiting Customer Response' ? 'bg-amber-50 text-amber-700 font-bold' :
                            t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {
                              t.status === 'New' ? 'جديدة' :
                              t.status === 'In Progress' ? 'قيد العمل' :
                              t.status === 'Waiting Customer Response' ? 'بانتظار رد العميل' :
                              t.status === 'Completed' ? 'مكتملة وناجحة' : 'ملغاة'
                            }
                          </span>
                        </div>

                        {/* Title / Customer */}
                        <h3 className="text-xs font-black text-slate-800 leading-snug group-hover:text-teal-700 transition-all">
                          {t.taskType} - {t.customerName}
                        </h3>

                        {/* Description excerpt */}
                        <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 text-justify">
                          {t.description}
                        </p>
                      </div>

                      {/* Bottom Assigned Meta */}
                      <div className="flex justify-between items-center border-t border-slate-100/80 pt-2.5 text-[9px]">
                        <span className="text-slate-400">المهندس: <strong className="text-slate-600">{t.assignedEmployeeName}</strong></span>
                        <span className="text-slate-400 font-mono">{t.assignedAt.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Create Task Sub-Tab (Admin / Manager only) */}
          {activeSubTab === 'create' && (
            <form onSubmit={handleCreateTask} className="max-w-2xl bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b pb-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>إسناد وجدولة مهمة دعم فني جديدة للعميل</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Customer */}
                <div className="space-y-1.5 relative" id="support-customer-search-container">
                  <label className="text-[11px] font-black text-slate-600">اختر العميل المستهدف *</label>
                  
                  {selectedCustomerId && customers.find(c => c.id === selectedCustomerId) ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-950 font-bold text-xs">
                      <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="flex-1 text-right">
                        {customers.find(c => c.id === selectedCustomerId)?.name} ({customers.find(c => c.id === selectedCustomerId)?.province})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId('');
                          setSupportCustomerSearch('');
                        }}
                        className="text-[10px] text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                      >
                        تغيير العميل
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={supportCustomerSearch}
                        onChange={(e) => {
                          setSupportCustomerSearch(e.target.value);
                          setShowSupportCustomerDropdown(true);
                        }}
                        onFocus={() => setShowSupportCustomerDropdown(true)}
                        placeholder="ابحث باسم العميل أو المحافظة أو الهاتف..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-right font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 transition-all"
                      />
                      {showSupportCustomerDropdown && (
                        <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 py-1.5 text-right font-sans">
                          {(() => {
                            const searchLower = supportCustomerSearch.toLowerCase().trim();
                            const filtered = (customers || []).filter(c => 
                              c.name.toLowerCase().includes(searchLower) ||
                              (c.province && c.province.toLowerCase().includes(searchLower)) ||
                              (c.phone && c.phone.includes(searchLower))
                            );
                            
                            if (filtered.length === 0) {
                              return (
                                <div className="px-4 py-3 text-xs text-slate-400 font-bold text-center">
                                  لا يوجد عملاء مطابقين لخيارات البحث.
                                </div>
                              );
                            }
                            
                            return filtered.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(c.id);
                                  setSupportCustomerSearch(c.name);
                                  setShowSupportCustomerDropdown(false);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-teal-50 text-xs font-bold text-slate-705 flex items-center justify-between transition-all"
                              >
                                <div>
                                  <span className="text-slate-800">{c.name}</span>
                                  <span className="text-[10px] text-slate-400 mr-2 font-normal">({c.province})</span>
                                </div>
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                  {c.phone || 'بدون هاتف'}
                                </span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Customer Details Card */}
                {selectedCustomerId && (() => {
                  const selectedCust = customers.find(c => c.id === selectedCustomerId);
                  if (!selectedCust) return null;
                  return (
                    <div className="col-span-full p-4 bg-teal-50/30 border border-teal-150 rounded-xl space-y-2.5 text-right font-sans" dir="rtl">
                      <div className="flex items-center gap-1.5 border-b border-teal-100 pb-1.5 text-teal-900 font-black text-xs">
                        <User className="w-4 h-4 text-teal-600" />
                        <span>بيانات اتصال وعنوان العميل المختار لموظف الدعم:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 font-bold">
                        <div>
                          <span className="text-slate-450 font-medium">اسم العميل/الشركة: </span>
                          <span className="text-slate-900">{selectedCust.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 font-medium">رقم الهاتف/الجوال: </span>
                          <span className="text-slate-900 font-mono" dir="ltr">{selectedCust.phone || '--'}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 font-medium">الشخص المسؤول: </span>
                          <span className="text-slate-900">{selectedCust.contactPerson || '--'}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 font-medium">العنوان / المحافظة: </span>
                          <span className="text-slate-900">{selectedCust.province || selectedCust.address || '--'}</span>
                        </div>
                        {selectedCust.requestedProduct && (
                          <div>
                            <span className="text-slate-450 font-medium">المنتج المطلوب: </span>
                            <span className="text-teal-800 bg-teal-100/50 px-1.5 py-0.5 rounded text-[10px]">{selectedCust.requestedProduct}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-450 font-medium">الوضع البيعي الحالي: </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                            {selectedCust.currentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Assign to Support Employee */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600">تعيين المهندس / موظف الدعم المسؤول *</label>
                  <select
                    value={assignedEmployeeId}
                    onChange={(e) => setAssignedEmployeeId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                    required
                  >
                    <option value="">-- اختر مهندس الدعم الفني --</option>
                    {supportEmployees.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>

                {/* Task Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600">تصنيف ونوع المهمة المطلوب تنفيذها *</label>
                  <select
                    value={taskType}
                    onChange={(e: any) => setTaskType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500"
                    required
                  >
                    <option value="Final Version Installation">تثبيت وتفعيل رخصة نهائية</option>
                    <option value="Trial Version Installation">تثبيت نسخة تجريبية ومتابعتها</option>
                    <option value="Demo Presentation">تقديم عرض تجريبي وشرح المنتج (Demo)</option>
                    <option value="Training Session">عقد جلسة تدريبية للعميل وموظفيه</option>
                    <option value="Maintenance">صيانة فنية وتحديث قاعدة بيانات</option>
                    <option value="Technical Issue Resolution">حل مشكلة تقنية / بلاغ شكوى</option>
                    <option value="Other">تصنيفات أخرى</option>
                  </select>
                </div>

                {/* Task Priority */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600">درجة أولوية المهمة *</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                    required
                  >
                    <option value="Low">منخفضة</option>
                    <option value="Medium">متوسطة</option>
                    <option value="High">مرتفعة</option>
                    <option value="Urgent">عاجلة / طارئة (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Trial Fields */}
              {taskType === 'Trial Version Installation' && (
                <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-sky-850">تاريخ بدء الفترة التجريبية *</label>
                    <input
                      type="date"
                      value={trialStartDate}
                      onChange={(e) => setTrialStartDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-sky-200 bg-white"
                      required={taskType === 'Trial Version Installation'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-sky-850">تاريخ انتهاء فترة التجربة وتوقف الرخصة *</label>
                    <input
                      type="date"
                      value={trialExpirationDate}
                      onChange={(e) => setTrialExpirationDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-sky-200 bg-white"
                      required={taskType === 'Trial Version Installation'}
                    />
                  </div>
                </div>
              )}

              {/* Conditional Demo Fields */}
              {taskType === 'Demo Presentation' && (
                <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-150 space-y-3">
                  <span className="text-[11px] font-black text-amber-800 block">معلومات جدولة العرض التوضيحي (Demo Presentation)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500">تاريخ العرض *</label>
                      <input
                        type="date"
                        value={demoDate}
                        onChange={(e) => setDemoDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        required={taskType === 'Demo Presentation'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500">وقت وتوقيت العرض *</label>
                      <input
                        type="time"
                        value={demoTime}
                        onChange={(e) => setDemoTime(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                        required={taskType === 'Demo Presentation'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500">الهدف والنتيجة المرجوة من الـ Demo *</label>
                    <input
                      type="text"
                      value={demoObjective}
                      onChange={(e) => setDemoObjective(e.target.value)}
                      placeholder="مثال: إقناع العميل بتكامل البرنامج مع أجهزة الباركود، أو عرض تقارير المحاسبة العامة"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      required={taskType === 'Demo Presentation'}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500">ملاحظات تحضيرية فنية إضافية</label>
                    <textarea
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      placeholder="متطلبات فنية للتحضير قبل الذهاب للعميل..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white min-h-[50px]"
                    />
                  </div>
                </div>
              )}

              {/* Detailed Work Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600">تفاصيل وتوصيف العمل المطلوب من المهندس *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="يرجى كتابة تفاصيل دقيقة حول المهمة المطلوب تنفيذها، رقم الترخيص (في حال توفره)، أو أي توصيف فني آخر يساعد موظف الدعم على التنفيذ بجودة عالية..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-white min-h-[100px] focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>إعتماد وإسناد المهمة الفنية</span>
              </button>
            </form>
          )}

          {/* 3. Trials Dashboard Sub-Tab */}
          {activeSubTab === 'trials' && (
            <div className="space-y-6">
              {/* Trials Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                  <h4 className="text-[11px] font-black text-teal-800">نسخ تجريبية نشطة</h4>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xl font-black text-teal-700 font-mono">{trialStats.active}</span>
                    <span className="text-[10px] text-teal-600">جاري متابعتها فنيّاً</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-150">
                  <h4 className="text-[11px] font-black text-amber-800">تنبيهات اقتراب الانتهاء (أقل من 7 أيام)</h4>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xl font-black text-amber-700 font-mono">{trialStats.upcoming}</span>
                    <span className="text-[10px] text-amber-600">تتطلب تواصل سريع</span>
                  </div>
                </div>

                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <h4 className="text-[11px] font-black text-rose-800">نسخ منتهية الصلاحية ومقيدة</h4>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-xl font-black text-rose-700 font-mono">{trialStats.expired}</span>
                    <span className="text-[10px] text-rose-600">تتطلب ترقية لنسخة نهائية</span>
                  </div>
                </div>
              </div>

              {/* Trials List */}
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-700">سجل تراخيص وتجربة الأنظمة الفعّالة</span>
                </div>

                {trialTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12">لم يتم تثبيت أي نسخ تجريبية للعملاء بعد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
                          <th className="p-3">اسم العميل</th>
                          <th className="p-3">رقم المهمة</th>
                          <th className="p-3">تاريخ التثبيت البدء</th>
                          <th className="p-3">تاريخ انتهاء التجربة</th>
                          <th className="p-3">حالة الصلاحية</th>
                          <th className="p-3 text-center">المهندس المتابع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trialTasks.map((t) => {
                          const isExpired = t.trialExpirationDate && t.trialExpirationDate < nowStr;
                          const isUpcoming = t.trialExpirationDate && !isExpired && (
                            (new Date(t.trialExpirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 7
                          );

                          return (
                            <tr 
                              key={t.id} 
                              onClick={() => setSelectedTask(t)}
                              className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                              title="انقر لعرض تفاصيل المهمة وتعديل حالتها وإضافة تقارير فنية"
                            >
                              <td className="p-3 font-bold text-slate-800">{t.customerName}</td>
                              <td className="p-3 font-mono text-slate-500">{t.id}</td>
                              <td className="p-3 font-mono">{t.trialStartDate || '-'}</td>
                              <td className="p-3 font-mono font-bold text-slate-700">{t.trialExpirationDate || '-'}</td>
                              <td className="p-3">
                                {isExpired ? (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-bold">
                                    منتهية ومقفلة
                                  </span>
                                ) : isUpcoming ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9px] font-bold animate-pulse">
                                    تنتهي قريباً جداً
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[9px] font-bold">
                                    نشطة ومصرحة
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-600">{t.assignedEmployeeName}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
