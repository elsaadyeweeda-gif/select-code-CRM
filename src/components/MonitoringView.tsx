/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Customer, 
  MonitoringRecord, 
  SupportTask, 
  UserAccount,
  MonitoringRepTask,
  MonitoringRepTaskType,
  MonitoringRepTaskPriority,
  MonitoringRepTaskStatus
} from '../types';
import { 
  Phone, User, Calendar, Star, MessageSquare, AlertCircle, 
  CheckCircle, Search, Filter, RefreshCw, Award, Activity, Heart, Eye,
  ClipboardList, Clock, Plus, CheckSquare, Edit3, Trash2, Send,
  ChevronRight, X, UserCheck, MessageCircle, AlertTriangle, ArrowRight, Check
} from 'lucide-react';

interface MonitoringViewProps {
  currentUser: UserAccount;
  customers: Customer[];
  token: string;
  salesRepsList?: string[];
}

export default function MonitoringView({ 
  currentUser, 
  customers,
  token,
  salesRepsList = []
}: MonitoringViewProps) {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'evaluations' | 'rep_tasks'>('evaluations');

  // Quality Evaluations Data
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [customerTasks, setCustomerTasks] = useState<SupportTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected Customer for Contact History & Filing follow-up call
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Follow-up Call Form State
  const [callResult, setCallResult] = useState<string>('');
  const [satisfactionLevel, setSatisfactionLevel] = useState<number>(5);
  const [issuesReported, setIssuesReported] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<MonitoringRecord['status']>('Customer Satisfied');

  // Search/Filter for Evaluations Customer List
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>('all');

  // Sales Rep Tasks State
  const [repTasks, setRepTasks] = useState<MonitoringRepTask[]>([]);
  const [loadingRepTasks, setLoadingRepTasks] = useState<boolean>(false);

  // Filters for Rep Tasks Tab
  const [taskSearch, setTaskSearch] = useState<string>('');
  const [taskRepFilter, setTaskRepFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('all');

  // Modal State for Creating/Editing Sales Rep Task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskCustomerId, setTaskCustomerId] = useState<string>('');
  const [taskCustomerName, setTaskCustomerName] = useState<string>('');
  const [taskCustomerPhone, setTaskCustomerPhone] = useState<string>('');
  const [taskCustomerAddress, setTaskCustomerAddress] = useState<string>('');
  const [taskRepName, setTaskRepName] = useState<string>('');
  const [taskType, setTaskType] = useState<MonitoringRepTaskType>('زيارة تفاوضية');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<MonitoringRepTaskPriority>('Medium');
  const [taskDueDate, setTaskDueDate] = useState<string>('');
  const [taskStatus, setTaskStatus] = useState<MonitoringRepTaskStatus>('Pending');
  const [taskNotes, setTaskNotes] = useState<string>('');
  const [taskRepFeedback, setTaskRepFeedback] = useState<string>('');
  const [savingTask, setSavingTask] = useState<boolean>(false);

  // Status Change / Feedback Modal
  const [statusModalTask, setStatusModalTask] = useState<MonitoringRepTask | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<MonitoringRepTaskStatus>('Completed');
  const [newFeedbackValue, setNewFeedbackValue] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Fetch all monitoring records
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/monitoring/records', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRecords(data.records);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('خطأ في تحميل سجلات قسم الجودة والمتابعة');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sales rep tasks
  const fetchRepTasks = async () => {
    setLoadingRepTasks(true);
    try {
      const res = await fetch('/api/monitoring/rep-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRepTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching rep tasks', err);
    } finally {
      setLoadingRepTasks(false);
    }
  };

  // Fetch support tasks for a customer
  const fetchCustomerSupportTasks = async (customerId: string) => {
    try {
      const res = await fetch('/api/support/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        const tasks: SupportTask[] = data.tasks;
        setCustomerTasks(tasks.filter(t => t.customerId === customerId));
      }
    } catch (err) {
      console.error('Error loading tasks for customer', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchRepTasks();
  }, [token]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerSupportTasks(selectedCustomer.id);
      // Pre-fill next follow up default (e.g. 14 days later)
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setNextFollowUpDate(d.toISOString().split('T')[0]);
    }
  }, [selectedCustomer]);

  // Handle Log Monitoring Call
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError(null);
    setSuccess(null);

    if (!callResult || !status) {
      setError('يرجى كتابة نتيجة التواصل واختيار حالة الاهتمام للعميل');
      return;
    }

    const payload: Partial<MonitoringRecord> = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      callResult,
      customerSatisfactionLevel: satisfactionLevel,
      issuesReported,
      recommendations,
      nextFollowUpDate,
      notes,
      status
    };

    try {
      const res = await fetch('/api/monitoring/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ record: payload })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccess('تم تسجيل جلسة المتابعة والجودة للعميل بنجاح!');
        setRecords(prev => [data.record, ...prev]);
        setCallResult('');
        setSatisfactionLevel(5);
        setIssuesReported('');
        setRecommendations('');
        setNotes('');
        setSelectedCustomer(null);
        fetchRecords();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('خطأ أثناء إرسال وحفظ سجل المتابعة');
    }
  };

  // Open Task Modal for a specific customer or fresh
  const handleOpenCreateTask = (customer?: Customer) => {
    setEditingTaskId(null);
    if (customer) {
      setTaskCustomerId(customer.id);
      setTaskCustomerName(customer.name);
      setTaskCustomerPhone(customer.phone || '');
      setTaskCustomerAddress(customer.address || customer.province || '');
      setTaskRepName(customer.repName || (salesRepsList[0] || ''));
    } else {
      setTaskCustomerId('');
      setTaskCustomerName('');
      setTaskCustomerPhone('');
      setTaskCustomerAddress('');
      setTaskRepName(salesRepsList[0] || '');
    }
    setTaskType('زيارة تفاوضية');
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('Medium');
    // Default due date: in 3 days
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setTaskDueDate(d.toISOString().split('T')[0]);
    setTaskStatus('Pending');
    setTaskNotes('');
    setTaskRepFeedback('');
    setIsTaskModalOpen(true);
  };

  // Open Edit Task Modal
  const handleOpenEditTask = (task: MonitoringRepTask) => {
    setEditingTaskId(task.id);
    setTaskCustomerId(task.customerId || '');
    setTaskCustomerName(task.customerName);
    setTaskCustomerPhone(task.customerPhone || '');
    setTaskCustomerAddress(task.customerAddress || '');
    setTaskRepName(task.repName);
    setTaskType(task.taskType);
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate || '');
    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    setTaskRepFeedback(task.repFeedback || '');
    setIsTaskModalOpen(true);
  };

  // Save or Update Rep Task
  const handleSaveRepTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskCustomerName.trim() || !taskRepName.trim() || !taskTitle.trim()) {
      alert('يرجى ملء الحقول الإلزامية: اسم العميل، اسم المندوب، وعنوان المهمة');
      return;
    }

    setSavingTask(true);
    try {
      if (editingTaskId) {
        // Update existing task
        const res = await fetch(`/api/monitoring/rep-tasks/${editingTaskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: taskTitle.trim(),
            description: taskDescription.trim(),
            taskType,
            priority: taskPriority,
            dueDate: taskDueDate,
            status: taskStatus,
            notes: taskNotes.trim(),
            repFeedback: taskRepFeedback.trim()
          })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setRepTasks(prev => prev.map(t => t.id === editingTaskId ? data.task : t));
          setIsTaskModalOpen(false);
          setSuccess('تم تحديث المهمة بنجاح');
        } else {
          alert(data.error || 'فشل تحديث المهمة');
        }
      } else {
        // Create new task
        const newTask: Partial<MonitoringRepTask> = {
          customerId: taskCustomerId,
          customerName: taskCustomerName.trim(),
          customerPhone: taskCustomerPhone.trim(),
          customerAddress: taskCustomerAddress.trim(),
          repName: taskRepName.trim(),
          taskType,
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          priority: taskPriority,
          dueDate: taskDueDate,
          status: 'Pending',
          notes: taskNotes.trim()
        };

        const res = await fetch('/api/monitoring/rep-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ task: newTask })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setRepTasks(prev => [data.task, ...prev]);
          setIsTaskModalOpen(false);
          setSuccess(`تم تكليف المهمة للمندوب (${taskRepName}) وإرسال إشعار فوري له بنجاح!`);
          // If in evaluations tab, switch to tasks or show alert
          if (activeTab === 'evaluations') {
            setActiveTab('rep_tasks');
          }
        } else {
          alert(data.error || 'فشل إنشاء التكليف');
        }
      }
    } catch (err) {
      alert('خطأ أثناء الاتصال بالخادم لحفظ المهمة');
    } finally {
      setSavingTask(false);
    }
  };

  // Delete Rep Task
  const handleDeleteRepTask = async (taskId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التكليف للمندوب؟')) return;
    try {
      const res = await fetch(`/api/monitoring/rep-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRepTasks(prev => prev.filter(t => t.id !== taskId));
        setSuccess('تم حذف التكليف بنجاح');
      } else {
        alert(data.error || 'فشل حذف التكليف');
      }
    } catch (err) {
      alert('خطأ أثناء حذف التكليف');
    }
  };

  // Open Status & Feedback Modal
  const handleOpenStatusModal = (task: MonitoringRepTask) => {
    setStatusModalTask(task);
    setNewStatusValue(task.status);
    setNewFeedbackValue(task.repFeedback || '');
  };

  // Save Status & Feedback
  const handleSaveStatusModal = async () => {
    if (!statusModalTask) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/monitoring/rep-tasks/${statusModalTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatusValue,
          repFeedback: newFeedbackValue.trim()
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRepTasks(prev => prev.map(t => t.id === statusModalTask.id ? data.task : t));
        setStatusModalTask(null);
        setSuccess('تم تحديث حالة المهمة وتقرير الإنجاز بنجاح');
      } else {
        alert(data.error || 'فشل تحديث حالة المهمة');
      }
    } catch (err) {
      alert('خطأ أثناء تحديث حالة المهمة');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Customer Selection Auto-fill
  const handleCustomerSelectChange = (customerId: string) => {
    setTaskCustomerId(customerId);
    const found = customers.find(c => c.id === customerId);
    if (found) {
      setTaskCustomerName(found.name);
      setTaskCustomerPhone(found.phone || '');
      setTaskCustomerAddress(found.address || found.province || '');
      if (found.repName && salesRepsList.includes(found.repName)) {
        setTaskRepName(found.repName);
      }
    }
  };

  // Filter customers for contact list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.phone.includes(searchQuery) || 
                            (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (c.province && c.province.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (c.repName && c.repName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = customerStatusFilter === 'all' || c.currentStatus === customerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, customerStatusFilter]);

  // Filter sales rep tasks
  const filteredRepTasks = useMemo(() => {
    return repTasks.filter(t => {
      const matchesSearch = !taskSearch || 
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.customerName.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.repName.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase())) ||
        (t.taskType && t.taskType.toLowerCase().includes(taskSearch.toLowerCase()));
      const matchesRep = taskRepFilter === 'all' || t.repName === taskRepFilter;
      const matchesStatus = taskStatusFilter === 'all' || t.status === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === 'all' || t.priority === taskPriorityFilter;
      return matchesSearch && matchesRep && matchesStatus && matchesPriority;
    });
  }, [repTasks, taskSearch, taskRepFilter, taskStatusFilter, taskPriorityFilter]);

  // KPI Calculations
  const totalCallsCount = records.length;
  const activeComplaintsCount = records.filter(r => r.status === 'Complaint Opened').length;
  const technicalIssuesCount = records.filter(r => r.status === 'Technical Issue Reported').length;
  
  let totalRating = 0;
  records.forEach(r => totalRating += r.customerSatisfactionLevel);
  const avgSatisfaction = totalCallsCount > 0 ? Math.round((totalRating / totalCallsCount) * 10) / 10 : 0;

  // Rep Task KPIs
  const totalRepTasks = repTasks.length;
  const pendingRepTasks = repTasks.filter(t => t.status === 'Pending').length;
  const inProgressRepTasks = repTasks.filter(t => t.status === 'In Progress').length;
  const completedRepTasks = repTasks.filter(t => t.status === 'Completed').length;
  const urgentRepTasks = repTasks.filter(t => t.priority === 'Urgent' && t.status !== 'Completed').length;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" id="monitoring-module">
      {/* Module Title & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-100 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600 animate-pulse" />
            <span>قسم المتابعة، الجودة وقياس الرضى</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            قياس رضى العملاء، تسجيل الملاحظات الدورية، وتكليف مناديب المبيعات بالمهام الميدانية والتفاوضية
          </p>
        </div>

        {/* Action controls & Refresh */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => {
              fetchRecords();
              fetchRepTasks();
            }}
            className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer border border-slate-200"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleOpenCreateTask()}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>تكليف مهمة جديدة للمندوب</span>
          </button>
          
          <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100 hidden sm:block">
            صلاحيتك: قسم الجودة والمتابعة
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('evaluations');
            setSelectedCustomer(null);
          }}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'evaluations'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>سجلات وتقييمات الجودة والمتابعة</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
            {records.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rep_tasks')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'rep_tasks'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>مهام وتكليفات مناديب المبيعات</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
            urgentRepTasks > 0 ? 'bg-rose-100 text-rose-700 font-black' : 'bg-teal-100 text-teal-800 font-bold'
          }`}>
            {repTasks.length} {pendingRepTasks + inProgressRepTasks > 0 && `(${pendingRepTasks + inProgressRepTasks} نشطة)`}
          </span>
        </button>
      </div>

      {/* Success/Error messages */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: EVALUATIONS & CALLS */}
      {activeTab === 'evaluations' && (
        <div>
          {/* KPI Counters */}
          {!selectedCustomer && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                <h4 className="text-[11px] font-black text-teal-800">مكالمات المتابعة المنفذة</h4>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-xl font-black text-teal-700 font-mono">{totalCallsCount}</span>
                  <span className="text-[10px] text-teal-600">زيارات دورية تليفونية</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-150">
                <h4 className="text-[11px] font-black text-amber-800">معدل الرضى العام (CSAT)</h4>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-xl font-black text-amber-700 font-mono flex items-center gap-1">
                    <span>{avgSatisfaction}</span>
                    <span className="text-xs text-amber-500">★</span>
                  </span>
                  <span className="text-[10px] text-amber-600">من أصل 5 نجوم</span>
                </div>
              </div>

              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <h4 className="text-[11px] font-black text-rose-800">الشكاوى المالية والإدارية المفتوحة</h4>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-xl font-black text-rose-700 font-mono">{activeComplaintsCount}</span>
                  <span className="text-[10px] text-rose-600">تتطلب تسوية فورية</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <h4 className="text-[11px] font-black text-indigo-800">بلاغات المشاكل التقنية المرصودة</h4>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-xl font-black text-indigo-700 font-mono">{technicalIssuesCount}</span>
                  <span className="text-[10px] text-indigo-600">محولة للدعم الفني</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Panel for Evaluations */}
          {selectedCustomer ? (
            /* Detailed View of Customer and Logging New Call Form */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-600 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>الرجوع لدليل العملاء المستهدفين</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreateTask(selectedCustomer)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>تكليف مهمة للمندوب لهذا العميل</span>
                </button>
              </div>

              {/* Customer info card */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    المنطقة والمحافظة: <strong>{selectedCustomer.province}</strong> • الهاتف: {selectedCustomer.phone} • المندوب المعين: <strong className="text-teal-700">{selectedCustomer.repName || 'غير محدد'}</strong>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${selectedCustomer.phone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>واتساب العميل</span>
                  </a>

                  <div className="px-3 py-1 bg-white border border-slate-200/80 text-[10px] font-bold text-slate-600 rounded-lg">
                    حالة العميل: {selectedCustomer.currentStatus}
                  </div>
                </div>
              </div>

              {/* Tasks already assigned to rep for this customer */}
              {repTasks.filter(t => t.customerId === selectedCustomer.id || t.customerName === selectedCustomer.name).length > 0 && (
                <div className="p-4 bg-teal-50/40 rounded-xl border border-teal-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-teal-700" />
                      <span>المهام الميدانية المكلف بها المندوب بخصوص هذا العميل</span>
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {repTasks.filter(t => t.customerId === selectedCustomer.id || t.customerName === selectedCustomer.name).map(t => (
                      <div key={t.id} className="p-3 bg-white rounded-lg border border-teal-100 text-xs flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800">{t.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>{t.status === 'Completed' ? 'مكتملة' : t.status === 'In Progress' ? 'قيد التنفيذ' : 'معلقة'}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">المندوب: {t.repName} • موعد الاستحقاق: {t.dueDate || 'فوري'}</p>
                          {t.repFeedback && (
                            <p className="text-[10px] text-emerald-700 mt-1 bg-emerald-50 p-1 rounded font-medium">إفادة المندوب: {t.repFeedback}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenEditTask(t)}
                          className="text-[10px] text-teal-600 hover:underline font-bold"
                        >
                          تعديل
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid: Call logging form on the right, Support & past logs on the left */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form Column */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleLogCall} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b pb-2">
                      <Phone className="w-4 h-4 text-teal-600" />
                      <span>تسجيل وتقييم مكالمة متابعة وجودة جديدة</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Select Monitoring Status */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600">حالة المتابعة والاهتمام الحالية *</label>
                        <select
                          value={status}
                          onChange={(e: any) => setStatus(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                          required
                        >
                          <option value="Customer Satisfied">عميل راضي ومستقر (Customer Satisfied)</option>
                          <option value="Customer Interested">عميل مهتم بالتطوير وشراء إضافات</option>
                          <option value="Needs Follow-up">يحتاج لمتابعة تليفونية إضافية</option>
                          <option value="Complaint Opened">تم فتح شكوى رسمية (إدارية أو مالية)</option>
                          <option value="Technical Issue Reported">بلاغ بمشكلة تقنية (تتطلب مهندس دعم فني)</option>
                          <option value="Customer Unsatisfied">عميل غير راضي</option>
                          <option value="Customer Not Interested">عميل غير مهتم تماماً</option>
                        </select>
                      </div>

                      {/* Interactive Stars Rating */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600">مستوى رضى العميل الكلي *</label>
                        <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-slate-200">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSatisfactionLevel(star)}
                              className="text-lg focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                            >
                              <Star 
                                className={`w-5 h-5 ${
                                  star <= satisfactionLevel 
                                    ? 'text-amber-400 fill-amber-400' 
                                    : 'text-slate-300'
                                }`} 
                              />
                            </button>
                          ))}
                          <span className="text-[10px] font-bold text-slate-500 mr-2">
                            ({satisfactionLevel} من 5)
                          </span>
                        </div>
                      </div>

                      {/* Next follow up date */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600">تاريخ المتابعة الدورية القادمة *</label>
                        <input
                          type="date"
                          value={nextFollowUpDate}
                          onChange={(e) => setNextFollowUpDate(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white font-mono"
                          required
                        />
                      </div>

                      {/* Call Result summary */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600">نتيجة التواصل والاتصال التليفوني مع العميل *</label>
                        <input
                          type="text"
                          value={callResult}
                          onChange={(e) => setCallResult(e.target.value)}
                          placeholder="مثال: تم الاتصال والاطمئنان على انتظام المبيعات اليومية بالبرنامج..."
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Issues reported */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600">الشكاوى والمشاكل المرصودة من العميل (إن وجدت)</label>
                      <textarea
                        value={issuesReported}
                        onChange={(e) => setIssuesReported(e.target.value)}
                        placeholder="اكتب تفاصيل أي عوائق تقنية أو شكاوى حول المعاملات المالية يشتكي منها العميل لتوجيهها فوراً لمدير الدعم الفني والإدارة..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white min-h-[50px] focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600">توصيات الموظف المتابع لمعالجة وضع العميل</label>
                      <input
                        type="text"
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        placeholder="مثال: يوصى بجدولة جلسة تدريبية إضافية للكاشير الجديد للعميل لتلافي أخطاء الإدخال..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>

                    {/* General notes */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600">ملاحظات ومرئيات عامة ملحقة</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ملاحظات أخرى..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white min-h-[50px]"
                      />
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-center items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>اعتماد وحفظ جلسة المتابعة</span>
                    </button>
                  </form>
                </div>

                {/* Support history & Call Logs Left Column */}
                <div className="lg:col-span-1 space-y-4">
                  
                  {/* Technical Support History */}
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black text-slate-700 border-b pb-1.5 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                      <span>تاريخ طلبات الدعم الفني للعميل</span>
                    </h4>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {customerTasks.length === 0 ? (
                        <p className="text-[10px] text-slate-400 py-3 text-center">لا توجد طلبات دعم فني سابقة للعميل</p>
                      ) : (
                        customerTasks.map(t => (
                          <div key={t.id} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-[10px]">
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-800">{t.taskType}</span>
                              <span className={`px-1 rounded text-[8px] font-black ${
                                t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>{t.status === 'Completed' ? 'مكتمل' : 'تحت العمل'}</span>
                            </div>
                            <p className="text-slate-500 mt-1 leading-normal text-justify line-clamp-2">{t.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Past Quality Assurance Records */}
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-black text-slate-700 border-b pb-1.5 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      <span>تاريخ متابعات الجودة السابقة</span>
                    </h4>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {records.filter(r => r.customerId === selectedCustomer.id).length === 0 ? (
                        <p className="text-[10px] text-slate-400 py-3 text-center">لا توجد مكالمات متابعة سابقة مسجلة</p>
                      ) : (
                        records.filter(r => r.customerId === selectedCustomer.id).map(r => (
                          <div key={r.id} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-[10px]">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1 text-slate-800 font-bold">
                                <span>{r.employeeName}</span>
                                <span className="text-amber-400">★{r.customerSatisfactionLevel}</span>
                              </div>
                              <span className="text-[8px] text-slate-400 font-mono">{r.createdAt.slice(0, 10)}</span>
                            </div>
                            <p className="text-slate-600 leading-normal text-justify">{r.callResult}</p>
                            {r.issuesReported && (
                              <div className="mt-1.5 p-1 bg-rose-50 text-rose-700 rounded border border-rose-100 text-[8px] text-justify">
                                شكوى: {r.issuesReported}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            /* Normal Customer Contacts List Sub-Tab */
            <div className="space-y-4">
              {/* Search/Filters bar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم العميل، المحافظة، الهاتف، أو المندوب..."
                    className="w-full text-xs pr-9 pl-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
                  />
                </div>

                <select
                  value={customerStatusFilter}
                  onChange={(e) => setCustomerStatusFilter(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 font-bold text-slate-600"
                >
                  <option value="all">كل حالات الاهتمام</option>
                  <option value="Customer Satisfied">عميل راضي ومستقر (Satisfied)</option>
                  <option value="Complaint Opened">شكوى مفتوحة (Complaint Opened)</option>
                  <option value="Technical Issue Reported">بلاغ مشكلة فنية</option>
                  <option value="Customer Unsatisfied">عميل غير راضي</option>
                  <option value="Needs Follow-up">يحتاج لمتابعة إضافية</option>
                  <option value="عميل محتمل">عميل محتمل</option>
                  <option value="جاري المتابعة">جاري المتابعة</option>
                  <option value="تم التعاقد">تم التعاقد</option>
                </select>
              </div>

              {/* Directory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.length === 0 ? (
                  <div className="col-span-full text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <User className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                    <p className="text-xs font-black text-slate-500">لا يوجد عملاء مطابقين لخيارات البحث المذكورة</p>
                    <p className="text-[10px] text-slate-400 mt-1">تأكد من إدراج العملاء في السجل العام من قبل مناديب المبيعات</p>
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const hasComplaint = records.some(r => r.customerId === c.id && r.status === 'Complaint Opened');
                    const hasTechIssue = records.some(r => r.customerId === c.id && r.status === 'Technical Issue Reported');
                    const customerRepTasksCount = repTasks.filter(t => (t.customerId === c.id || t.customerName === c.name) && t.status !== 'Completed').length;
                    
                    return (
                      <div
                        key={c.id}
                        className="p-5 bg-white border border-slate-200 hover:border-teal-500/50 hover:shadow-md hover:shadow-teal-50/20 rounded-xl transition-all flex flex-col justify-between gap-4 relative overflow-hidden"
                      >
                        <div>
                          {/* Top Meta info */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {c.province}
                            </span>
                            
                            <div className="flex gap-1">
                              {hasComplaint && (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-bold rounded">
                                  شكوى مفتوحة
                                </span>
                              )}
                              {hasTechIssue && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-bold rounded">
                                  بلاغ تقني
                                </span>
                              )}
                              {customerRepTasksCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-bold rounded">
                                  {customerRepTasksCount} مهام معلقة للمندوب
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[9px] font-bold rounded-lg border border-teal-100/30">
                                {c.currentStatus}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-xs font-black text-slate-800 line-clamp-1">
                            {c.name}
                          </h3>

                          <p className="text-[10px] text-slate-500 mt-1.5">
                            هاتف: {c.phone}
                          </p>
                          
                          <p className="text-[10px] text-slate-500 mt-1">
                            المندوب: <span className="font-bold text-teal-700">{c.repName || 'غير معين'}</span>
                          </p>
                        </div>

                        {/* Bottom Action buttons */}
                        <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100/80">
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>تقييم المتابعة</span>
                          </button>

                          <button
                            onClick={() => handleOpenCreateTask(c)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            title="تكليف مهمة لمندوب المبيعات لهذا العميل"
                          >
                            <ClipboardList className="w-3 h-3 text-amber-600" />
                            <span>مهمة للمندوب</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SALES REP TASKS (عمل مهمة للمندوب من قبل قسم المتابعة والجودة) */}
      {activeTab === 'rep_tasks' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Info Banner & Action Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-teal-50/50 p-4 rounded-2xl border border-teal-100 gap-3">
            <div>
              <h3 className="text-sm font-black text-teal-900 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-teal-700" />
                <span>إدارة وتكليف مهام مناديب المبيعات الميدانية</span>
              </h3>
              <p className="text-[11px] text-teal-700 mt-0.5 font-medium">
                تكليف المندوب بزيارات تفاوضية، تسليم مستندات، حل شكاوى أو تجديد عقود مع متابعة مستمرة وتوثيق نتائج التنفيذ
              </p>
            </div>

            <button
              onClick={() => handleOpenCreateTask()}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ إنشاء تكليف مهمة لمندوب</span>
            </button>
          </div>

          {/* KPI Counters for Rep Tasks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500">إجمالي التكليفات</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">{totalRepTasks}</span>
                <span className="text-[10px] text-slate-400">مهمة مسندة</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800">قيد الانتظار (معلقة)</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xl font-black text-amber-700 font-mono">{pendingRepTasks}</span>
                <span className="text-[10px] text-amber-600">بانتظار البدء</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200">
              <span className="text-[11px] font-bold text-blue-800">قيد التنفيذ الميداني</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xl font-black text-blue-700 font-mono">{inProgressRepTasks}</span>
                <span className="text-[10px] text-blue-600">جاري العمل عليها</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800">مهام منجزة بنجاح</span>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xl font-black text-emerald-700 font-mono">{completedRepTasks}</span>
                <span className="text-[10px] text-emerald-600">مع تقرير الإنجاز</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="ابحث بالعنوان، العميل، أو المندوب..."
                className="w-full text-xs pr-9 pl-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Filter by Sales Rep */}
            <div>
              <select
                value={taskRepFilter}
                onChange={(e) => setTaskRepFilter(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="all">كل مناديب المبيعات</option>
                {salesRepsList.map(rep => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="all">كل حالات المهام</option>
                <option value="Pending">قيد الانتظار (معلقة)</option>
                <option value="In Progress">قيد التنفيذ</option>
                <option value="Completed">مكتملة ومنجزة</option>
                <option value="Cancelled">ملغاة</option>
              </select>
            </div>

            {/* Filter by Priority */}
            <div>
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="all">كل مستويات الأولوية</option>
                <option value="Urgent">عاجل جداً (Urgent)</option>
                <option value="High">مرتفع (High)</option>
                <option value="Medium">متوسط (Medium)</option>
                <option value="Low">عادي (Low)</option>
              </select>
            </div>
          </div>

          {/* Tasks Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepTasks.length === 0 ? (
              <div className="col-span-full text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-black text-slate-600">لا توجد مهام مناديب مطابقة لخيارات البحث</p>
                <p className="text-xs text-slate-400 mt-1">يمكنك إنشاء مهمة جديدة للمندوب من الزر أعلاه</p>
                <button
                  onClick={() => handleOpenCreateTask()}
                  className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>تكليف مهمة جديدة</span>
                </button>
              </div>
            ) : (
              filteredRepTasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== 'Completed' && task.status !== 'Cancelled';
                const isDueToday = task.dueDate && task.dueDate === todayStr && task.status !== 'Completed' && task.status !== 'Cancelled';

                return (
                  <div 
                    key={task.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                          task.priority === 'Urgent' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          task.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          task.priority === 'Medium' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {task.priority === 'Urgent' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />}
                          {task.priority === 'Urgent' ? '🔴 عاجل جداً' :
                           task.priority === 'High' ? '🟠 مرتفع' :
                           task.priority === 'Medium' ? '🔵 متوسط' : '⚪ عادي'}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'Cancelled' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {task.status === 'Completed' ? '✓ مكتملة' :
                           task.status === 'In Progress' ? '⌛ قيد التنفيذ' :
                           task.status === 'Cancelled' ? '✕ ملغاة' :
                           '⏳ قيد الانتظار'}
                        </span>

                        {/* Task Type */}
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                          {task.taskType}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-black text-slate-900 leading-snug">
                        {task.title}
                      </h4>

                      {/* Customer Info */}
                      <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-teal-600" />
                            {task.customerName}
                          </span>
                          {task.customerPhone && (
                            <a
                              href={`https://wa.me/${task.customerPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-100 flex items-center gap-1"
                              title="مراسلة واتساب"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>{task.customerPhone}</span>
                            </a>
                          )}
                        </div>
                        {task.customerAddress && (
                          <p className="text-[10px] text-slate-500">
                            العنوان: {task.customerAddress}
                          </p>
                        )}
                      </div>

                      {/* Rep Assigned & Due Date */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1 text-slate-700 font-bold">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>المندوب: <strong className="text-teal-800">{task.repName}</strong></span>
                        </div>

                        <div className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                          isOverdue ? 'text-rose-600' : isDueToday ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.dueDate || 'فوري'}</span>
                          {isOverdue && <span className="text-[9px] bg-rose-100 text-rose-700 px-1 rounded">متأخر</span>}
                          {isDueToday && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">اليوم</span>}
                        </div>
                      </div>

                      {/* Description & Directives */}
                      {task.description && (
                        <div className="p-2.5 bg-teal-50/40 rounded-xl border border-teal-100/60 text-xs">
                          <span className="text-[10px] font-black text-teal-800 block mb-1">
                            توجيهات قسم الجودة والمتابعة:
                          </span>
                          <p className="text-slate-700 text-justify text-[11px] leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      )}

                      {/* Rep Feedback if submitted */}
                      {task.repFeedback && (
                        <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs">
                          <span className="text-[10px] font-black text-emerald-800 block mb-1 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>تقرير وإفادة المندوب الميداني:</span>
                          </span>
                          <p className="text-slate-800 text-justify text-[11px] leading-relaxed">
                            {task.repFeedback}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                      {/* Change Status Button */}
                      <button
                        onClick={() => handleOpenStatusModal(task)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                        title="تحديث الحالة وإفادة المندوب"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>تحديث الإنجاز</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditTask(task)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                          title="تعديل تفاصيل المهمة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteRepTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="حذف المهمة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SALES REP TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {editingTaskId ? 'تعديل تكليف مندوب المبيعات' : 'تكليف مهمة جديدة لمندوب المبيعات'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    بواسطة قسم الجودة والمتابعة • سيصل إشعار فوري للمندوب المكلف
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRepTask} className="p-6 space-y-4 text-xs">
              {/* Customer selection / entry */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-700">اختر العميل المعني بالتكليف *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={taskCustomerId}
                    onChange={(e) => handleCustomerSelectChange(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:border-teal-500"
                  >
                    <option value="">-- اختيار من قائمة العملاء المسجلين --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.province || 'غير محدد'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={taskCustomerName}
                    onChange={(e) => setTaskCustomerName(e.target.value)}
                    placeholder="أو اكتب اسم العميل يدوياً..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Customer phone & address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600">هاتف / واتساب العميل</label>
                  <input
                    type="text"
                    value={taskCustomerPhone}
                    onChange={(e) => setTaskCustomerPhone(e.target.value)}
                    placeholder="رقم الهاتف للتواصل..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600">عنوان العميل / المنطقة</label>
                  <input
                    type="text"
                    value={taskCustomerAddress}
                    onChange={(e) => setTaskCustomerAddress(e.target.value)}
                    placeholder="العنوان أو المحافظة..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Sales Rep selection & Task Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-700">المندوب المكلف بالمهمة *</label>
                  <select
                    value={taskRepName}
                    onChange={(e) => setTaskRepName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-teal-800 focus:border-teal-500"
                    required
                  >
                    <option value="">-- اختر المندوب --</option>
                    {salesRepsList.map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-700">نوع وطبيعة المهمة *</label>
                  <select
                    value={taskType}
                    onChange={(e: any) => setTaskType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:border-teal-500"
                    required
                  >
                    <option value="زيارة تفاوضية">زيارة تفاوضية وإقناع</option>
                    <option value="حل شكوى وتلافي اعتراضات">حل شكوى وتلافي اعتراضات العميل</option>
                    <option value="متابعة تجديد عقد">متابعة تجديد عقد أو اشتراك</option>
                    <option value="تسليم واستلام مستندات">تسليم واستلام مستندات وفواتير</option>
                    <option value="إعادة تواصل لإغلاق صفقة">إعادة تواصل لإغلاق صفقة بيعية</option>
                    <option value="زيارة عاجلة">زيارة عاجلة واستثنائية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-700">عنوان وموضوع التكليف *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="مثال: زيارة العميل لمعالجة اعتراضه على الفاتورة وتأكيد تجديد الترخيص..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold focus:border-teal-500"
                  required
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-black text-slate-700">مستوى الأولوية والأهمية *</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold focus:border-teal-500"
                  >
                    <option value="Urgent">🔴 عاجل جداً (أولوية قصوى)</option>
                    <option value="High">🟠 مرتفع (خلال 24-48 ساعة)</option>
                    <option value="Medium">🔵 متوسط (الأسبوع الحالي)</option>
                    <option value="Low">⚪ عادي (متابعة اعتيادية)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-black text-slate-700">موعد الإنجاز المطلوب (Due Date) *</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Description & Detailed Directives */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-700">توجيهات وتفاصيل المهمة للمندوب *</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="اشرح للمندوب بالتفصيل ما هو مطلوب منه أثناء الزيارة، ماذا اشتكى العميل، وما هي النتائج المستهدفة..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white min-h-[90px] focus:border-teal-500 leading-relaxed"
                  required
                />
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600">ملاحظات إضافية لقسم الجودة</label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="ملاحظات داخلية خاصة بقسم المتابعة..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white min-h-[50px]"
                />
              </div>

              {/* If editing, allow changing status and rep feedback */}
              {editingTaskId && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-800 text-xs">حالة المهمة وإفادة المندوب</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 text-[11px]">حالة المهمة الحالية</label>
                      <select
                        value={taskStatus}
                        onChange={(e: any) => setTaskStatus(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold"
                      >
                        <option value="Pending">قيد الانتظار (معلقة)</option>
                        <option value="In Progress">قيد التنفيذ الميداني</option>
                        <option value="Completed">مكتملة ومنجزة بنجاح</option>
                        <option value="Cancelled">ملغاة</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 text-[11px]">تقرير وإفادة المندوب</label>
                      <textarea
                        value={taskRepFeedback}
                        onChange={(e) => setTaskRepFeedback(e.target.value)}
                        placeholder="ماذا أفاد المندوب بعد تنفيذ المهمة..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {savingTask ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{editingTaskId ? 'حفظ التعديلات' : 'إسناد وتكليف المهمة فوراً'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK STATUS & FEEDBACK UPDATE */}
      {statusModalTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  تحديث حالة المهمة وتقرير الإنجاز
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  {statusModalTask.title} • المندوب: {statusModalTask.repName}
                </p>
              </div>
              <button
                onClick={() => setStatusModalTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-black text-slate-700">تغيير حالة المهمة</label>
                <select
                  value={newStatusValue}
                  onChange={(e: any) => setNewStatusValue(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="Pending">قيد الانتظار (Pending)</option>
                  <option value="In Progress">قيد التنفيذ الميداني (In Progress)</option>
                  <option value="Completed">مكتملة ومنجزة بنجاح (Completed)</option>
                  <option value="Cancelled">ملغاة (Cancelled)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-700">تقرير وإفادة المندوب بعد الزيارة</label>
                <textarea
                  value={newFeedbackValue}
                  onChange={(e) => setNewFeedbackValue(e.target.value)}
                  placeholder="سجل تقرير المندوب وما تم التوصل إليه مع العميل أثناء الزيارة الميدانية..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white min-h-[90px] focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusModalTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveStatusModal}
                disabled={updatingStatus}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5"
              >
                {updatingStatus ? 'جاري الحفظ...' : 'حفظ وتحديث'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
