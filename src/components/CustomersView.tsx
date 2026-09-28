/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Customer, CustomerStatus, SupportTask } from '../types';
import { Search, MapPin, Building, Phone, Calendar, ArrowUpRight, DollarSign, UserCheck, Plus, Wrench, Trash2, CheckSquare, Square, AlertTriangle, Loader2 } from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  onNavigateToForm: () => void;
  currentUser: any;
  salesRepsList: string[];
  onTransferCustomer?: (customerId: string, newRepName: string) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onBulkDeleteCustomers?: (ids: string[], deleteVisits: boolean) => Promise<void>;
}

export default function CustomersView({ 
  customers, 
  onNavigateToForm,
  currentUser,
  salesRepsList,
  onTransferCustomer,
  onDeleteCustomer,
  onBulkDeleteCustomers
}: CustomersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [supportTasks, setSupportTasks] = useState<SupportTask[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [deleteAssociatedVisits, setDeleteAssociatedVisits] = useState(true);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem('sales_visit_crm_auth_token');
    if (token) {
      fetch('/api/support/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.tasks) {
          setSupportTasks(data.tasks);
        }
      })
      .catch(err => console.warn('Error fetching support tasks in CustomersView', err));
    }
  }, []);

  const activeSupportTaskMap = useMemo(() => {
    const map: { [key: string]: SupportTask } = {};
    supportTasks.forEach(t => {
      if (t.status !== 'Completed' && t.status !== 'Cancelled') {
        if (t.customerId) {
          map[t.customerId] = t;
        }
        if (t.customerName) {
          map[t.customerName.toLowerCase().trim()] = t;
        }
      }
    });
    return map;
  }, [supportTasks]);

  const provinces = useMemo(() => {
    const list = new Set(customers.map(c => c.province));
    return ['الكل', ...Array.from(list)];
  }, [customers]);

  const statuses: ('الكل' | CustomerStatus)[] = [
    'الكل',
    'عميل محتمل',
    'جاري المتابعة',
    'تم إرسال عرض سعر',
    'تفاوض',
    'تم التعاقد',
    'غير مهتم'
  ];

  // Filtered customer database
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) || 
        c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchProvince = selectedProvince === 'الكل' || c.province === selectedProvince;
      const matchStatus = selectedStatus === 'الكل' || c.currentStatus === selectedStatus;

      return matchSearch && matchProvince && matchStatus;
    });
  }, [customers, searchTerm, selectedProvince, selectedStatus]);

  const getStatusStyle = (status: CustomerStatus) => {
    switch (status) {
      case 'تم التعاقد':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'تفاوض':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'تم إرسال عرض سعر':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'جاري المتابعة':
        return 'bg-indigo-50 text-indigo-805 border-indigo-200';
      case 'عميل محتمل':
        return 'bg-amber-50 text-amber-805 border-amber-200';
      case 'غير مهتم':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6" id="customers-module-container">
      
      {/* Search and Filters panel */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs text-right space-y-4" dir="rtl">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          
          {/* Search box */}
          <div className="relative w-full md:flex-1">
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="ابحث بالاسم، هاتف العميل، أو الشخص المسؤول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pr-10 pl-4 py-2.5 text-sm text-gray-800 outline-none"
            />
          </div>

          {/* New Customer shortcut */}
          {(currentUser?.role === 'Admin' || (currentUser?.permissions && currentUser.permissions.includes('customer_add'))) && (
            <button
              onClick={onNavigateToForm}
              className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-sans">
          {/* Filter Province */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 block">تصفية حسب العنوان</span>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none"
            >
              {provinces.map((prov, i) => (
                <option key={i} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 block">المرحلة والوضع البيعي</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none"
            >
              {statuses.map((st, i) => (
                <option key={i} value={st}>{st === 'الكل' ? 'كل المراحل البيعية' : st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Admin Multi-Select Action Bar */}
      {currentUser?.role === 'Admin' && filteredCustomers.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 px-4 flex items-center justify-between flex-wrap gap-3" dir="rtl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectedCustomerIds.length === filteredCustomers.length) {
                  setSelectedCustomerIds([]);
                } else {
                  setSelectedCustomerIds(filteredCustomers.map(c => c.id));
                }
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-purple-700 cursor-pointer"
            >
              {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-purple-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedCustomerIds.length === filteredCustomers.length && filteredCustomers.length > 0
                  ? 'إلغاء تحديد الكل' 
                  : `تحديد كافة العملاء المعروضين (${filteredCustomers.length})`}
              </span>
            </button>
            
            {selectedCustomerIds.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-800 font-extrabold px-2.5 py-0.5 rounded-full">
                تم تحديد {selectedCustomerIds.length} عميل
              </span>
            )}
          </div>

          {selectedCustomerIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCustomerIds([])}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                إلغاء التحديد
              </button>
              <button
                onClick={() => setShowBulkConfirmModal(true)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف العملاء المحددين ({selectedCustomerIds.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Customer Cards Grid view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir="rtl">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center col-span-full">
            <p className="text-gray-500 text-sm font-sans">لا يوجد عملاء يطابقون خيارات البحث الحالية.</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div 
              key={cust.id} 
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-500/30 transition-all text-right space-y-4 relative ${
                selectedCustomerIds.includes(cust.id) ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/15' : 'border-gray-100'
              }`}
            >
              {/* Checkbox for Admin selection */}
              {currentUser?.role === 'Admin' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(cust.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomerIds(prev => [...prev, cust.id]);
                        } else {
                          setSelectedCustomerIds(prev => prev.filter(id => id !== cust.id));
                        }
                      }}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                    <span>تحديد للحذف</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    {cust.id}
                  </span>
                </div>
              )}

              {/* Header card segment */}
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  {currentUser?.role !== 'Admin' && (
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md shrink-0">
                      {cust.id}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusStyle(cust.currentStatus)}`}>
                    {cust.currentStatus}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 leading-tight pt-1 font-sans">
                  {cust.name}
                </h4>

                {(() => {
                  const supportTask = activeSupportTaskMap[cust.id] || activeSupportTaskMap[cust.name.toLowerCase().trim()];
                  if (!supportTask) return null;
                  
                  const translatedType = 
                    supportTask.taskType === 'Final Version Installation' ? 'تثبيت وتفعيل رخصة' :
                    supportTask.taskType === 'Trial Version Installation' ? 'تثبيت نسخة تجريبية' :
                    supportTask.taskType === 'Demo Presentation' ? 'عرض وشرح نظام (Demo)' :
                    supportTask.taskType === 'Training Session' ? 'جلسة تدريبية' :
                    supportTask.taskType === 'Maintenance' ? 'صيانة فنية' :
                    supportTask.taskType === 'Technical Issue Resolution' ? 'حل مشكلة تقنية' : 'دعم فني';

                  return (
                    <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1.5 self-start shadow-3xs mt-1 animate-pulse">
                      <Wrench className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>العميل لدى الدعم الفني 🛠️ ({translatedType})</span>
                    </div>
                  );
                })()}

                {/* Rep display & Transfer block */}
                <div className="flex flex-col gap-1 border-b border-slate-100/50 pb-2 mb-1">
                  {cust.repName ? (
                    <div className="flex items-center gap-1.5 justify-end text-xs text-indigo-700 font-extrabold pt-0.5">
                      <span>المندوب: {cust.repName}</span>
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 justify-end text-xs text-slate-400 font-bold pt-0.5">
                      <span>المندوب: لم يعين بعد</span>
                      <UserCheck className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  )}

                  {onTransferCustomer && (
                    currentUser?.role === 'Admin' || (
                      currentUser?.permissions?.includes('customer_edit') && (
                        (currentUser?.role === 'Manager' && (currentUser?.assignedReps || []).length === 0) ||
                        !cust.repName ||
                        (currentUser?.assignedReps || []).includes(cust.repName)
                      )
                    )
                  ) && (
                    <div className="flex items-center gap-1.5 justify-end mt-1 border-t border-indigo-50/55 pt-1">
                      <span className="text-[9px] text-slate-400 font-bold">تغيير المندوب:</span>
                      <select
                        value={cust.repName || ''}
                        onChange={(e) => {
                          const newRepName = e.target.value;
                          onTransferCustomer(cust.id, newRepName);
                        }}
                        className="bg-indigo-50/40 border border-indigo-100 text-[10px] font-sans font-black text-indigo-900 rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-right"
                        dir="rtl"
                      >
                        <option value="">-- اختر مندوباً --</option>
                        {salesRepsList.filter(name => name !== 'أخرى').map((repName, idx) => (
                          <option key={idx} value={repName}>{repName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 justify-end text-xs text-gray-500 pt-0.5">
                  {cust.requestedProduct && (
                    <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      المنتج: {cust.requestedProduct}
                    </span>
                  )}
                  <span>{cust.activity}</span>
                  <Building className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>

              {/* Contact info segment */}
              <div className="border-t border-b border-gray-50 py-3 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-medium text-gray-800">{cust.phone}</span>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span>الشخص المسؤول: {cust.contactPerson}</span>
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[11px] text-gray-400 mt-0.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500 font-bold">{cust.province || cust.address || '--'}</span>
                  </div>
                  {cust.latitude && cust.longitude && (
                    <div className="flex justify-start">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${cust.latitude},${cust.longitude}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="text-[9px] text-teal-650 hover:text-teal-850 font-extrabold inline-flex items-center gap-0.5 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100/60"
                      >
                        <MapPin className="w-2.5 h-2.5 text-teal-600" />
                        <span>موقع المقر 🗺️</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom statistics and values */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2 gap-4">
                <div>
                  {onDeleteCustomer && (
                    currentUser?.role === 'Admin' || (
                      currentUser?.permissions?.includes('customer_delete') && (
                        (currentUser?.role === 'Manager' && (currentUser?.assignedReps || []).length === 0) ||
                        !cust.repName ||
                        (currentUser?.assignedReps || []).includes(cust.repName)
                      )
                    )
                  ) && (
                    <button
                      onClick={() => onDeleteCustomer(cust.id)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-700 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.02] active:scale-95"
                      title="حذف هذا العميل نهائياً"
                    >
                      <span>🗑️ حذف العميل</span>
                    </button>
                  )}
                </div>

                <div className="text-right flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 justify-between">
                    <span className="text-gray-505 font-bold">آخر: {cust.lastVisitDate}</span>
                    <span className="flex items-center gap-1">
                      <span>الزيارات المسجلة</span>
                      <Calendar className="w-3" />
                    </span>
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-xs bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md font-mono">
                      {cust.visitsCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl text-right animate-scaleUp space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black text-slate-900">تأكيد حذف العملاء المحددين</h3>
              </div>
              <button
                onClick={() => !isBulkDeleting && setShowBulkConfirmModal(false)}
                disabled={isBulkDeleting}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
              <p className="text-xs font-black text-rose-900">
                أنت على وشك حذف ({selectedCustomerIds.length}) عميل بشكل نهائي.
              </p>
              <p className="text-[11px] text-rose-700 font-bold">
                هذا الإجراء نهائي ولا يمكن التراجع عنه.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={deleteAssociatedVisits}
                onChange={(e) => setDeleteAssociatedVisits(e.target.checked)}
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              />
              <span>حذف كافة الزيارات المرتبطة بهؤلاء العملاء أيضاً</span>
            </label>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onBulkDeleteCustomers) {
                    setIsBulkDeleting(true);
                    try {
                      await onBulkDeleteCustomers(selectedCustomerIds, deleteAssociatedVisits);
                      setSelectedCustomerIds([]);
                      setShowBulkConfirmModal(false);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsBulkDeleting(false);
                    }
                  }
                }}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف ({selectedCustomerIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
