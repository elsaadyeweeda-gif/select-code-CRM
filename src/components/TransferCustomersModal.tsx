import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Users, 
  UserCheck, 
  Search, 
  CheckSquare, 
  Square, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert,
  Calendar,
  Building2,
  Phone,
  MapPin
} from 'lucide-react';
import { Customer, Visit } from '../types';

const EMPTY_CUSTOMER_IDS: string[] = [];

interface TransferCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReps: string[];
  customers: Customer[];
  visits?: Visit[];
  initialSourceRep?: string;
  initialSelectedCustomerIds?: string[];
  onTransferSuccess: (result: {
    sourceRepName: string;
    targetRepName: string;
    transferredCount: number;
    updatedVisitsCount: number;
    customerIds: string[];
    updateVisits: boolean;
  }) => void;
  token?: string;
  triggerMessage: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const TransferCustomersModal: React.FC<TransferCustomersModalProps> = ({
  isOpen,
  onClose,
  salesReps,
  customers,
  visits = [],
  initialSourceRep = '',
  initialSelectedCustomerIds = EMPTY_CUSTOMER_IDS,
  onTransferSuccess,
  token,
  triggerMessage
}) => {
  // Clean sales reps list
  const availableReps = useMemo(() => {
    return salesReps.filter(r => r !== 'الكل' && r !== 'أخرى' && r.trim() !== '');
  }, [salesReps]);

  // Source and Target Reps
  const [sourceRep, setSourceRep] = useState<string>('');
  const [targetRep, setTargetRep] = useState<string>('');

  // Transfer mode: 'all' | 'custom'
  const [transferMode, setTransferMode] = useState<'all' | 'custom'>('all');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updateVisits, setUpdateVisits] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Track modal open state transition to prevent infinite update loop
  const prevIsOpenRef = useRef<boolean>(false);

  // Map customer names to reps based on visits if repName is missing on customer
  const customerToRepMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => {
      if (c.repName) {
        map.set(c.id, c.repName);
      }
    });
    // Fallback using visits
    visits.forEach(v => {
      if (!v.customerName || !v.repName) return;
      const matchingCust = customers.find(c => c.name.trim().toLowerCase() === v.customerName.trim().toLowerCase());
      if (matchingCust && !map.has(matchingCust.id)) {
        map.set(matchingCust.id, v.repName);
      }
    });
    return map;
  }, [customers, visits]);

  // Rep to Customers count map
  const repCustomerCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    availableReps.forEach(rep => { counts[rep] = 0; });
    customers.forEach(c => {
      const rep = c.repName || customerToRepMap.get(c.id);
      if (rep && counts[rep] !== undefined) {
        counts[rep]++;
      }
    });
    return counts;
  }, [availableReps, customers, customerToRepMap]);

  // Reset or initialize state only once upon opening the modal
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const defaultSource = initialSourceRep && availableReps.includes(initialSourceRep)
        ? initialSourceRep
        : (availableReps[0] || '');
      setSourceRep(defaultSource);

      const defaultTarget = availableReps.find(r => r !== defaultSource) || '';
      setTargetRep(defaultTarget);

      if (initialSelectedCustomerIds && initialSelectedCustomerIds.length > 0) {
        setSelectedCustomerIds(new Set(initialSelectedCustomerIds));
        setTransferMode('custom');
      } else {
        setSelectedCustomerIds(new Set());
        setTransferMode('all');
      }
      setSearchQuery('');
      setNotes('');
      setUpdateVisits(true);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialSourceRep]);

  // Filter customers belonging to the selected source rep
  const sourceCustomers = useMemo(() => {
    if (!sourceRep) return [];
    return customers.filter(c => {
      const assignedRep = c.repName || customerToRepMap.get(c.id);
      return assignedRep === sourceRep;
    });
  }, [sourceRep, customers, customerToRepMap]);

  // Search filtered customers for custom selection mode
  const filteredSourceCustomers = useMemo(() => {
    if (!searchQuery.trim()) return sourceCustomers;
    const q = searchQuery.trim().toLowerCase();
    return sourceCustomers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.province && c.province.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  }, [sourceCustomers, searchQuery]);

  // Toggle selection for custom mode
  const toggleCustomerSelection = (id: string) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCustomerIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedCustomerIds);
    filteredSourceCustomers.forEach(c => next.add(c.id));
    setSelectedCustomerIds(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedCustomerIds);
    filteredSourceCustomers.forEach(c => next.delete(c.id));
    setSelectedCustomerIds(next);
  };

  // Customers to transfer count
  const transferCount = transferMode === 'all' 
    ? sourceCustomers.length 
    : selectedCustomerIds.size;

  // Handle Form Submission
  const handleTransfer = async () => {
    if (!sourceRep) {
      triggerMessage('error', 'يرجى اختيار المندوب المحول منه');
      return;
    }
    if (!targetRep) {
      triggerMessage('error', 'يرجى اختيار المندوب البديل المحول إليه');
      return;
    }
    if (sourceRep === targetRep) {
      triggerMessage('error', 'لا يمكن النقل إلى نفس المندوب');
      return;
    }
    if (transferCount === 0) {
      triggerMessage('error', 'لا يوجد أي عملاء محددين للنقل');
      return;
    }

    const idsToTransfer = transferMode === 'all' 
      ? sourceCustomers.map(c => c.id) 
      : Array.from(selectedCustomerIds);

    setSubmitting(true);
    try {
      const authToken = token || localStorage.getItem('sales_visit_crm_auth_token') || '';
      const response = await fetch('/api/customers/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          sourceRepName: sourceRep,
          targetRepName: targetRep,
          customerIds: idsToTransfer,
          updateVisits,
          notes
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || 'فشلت عملية نقل العملاء');
      }

      triggerMessage(
        'success', 
        `تم بنجاح نقل ${data.transferredCount || idsToTransfer.length} عميل من [${sourceRep}] إلى [${targetRep}]!`
      );

      onTransferSuccess({
        sourceRepName: sourceRep,
        targetRepName: targetRep,
        transferredCount: data.transferredCount || idsToTransfer.length,
        updatedVisitsCount: data.updatedVisitsCount || 0,
        customerIds: idsToTransfer,
        updateVisits
      });

      onClose();
    } catch (err: any) {
      console.error('Transfer customers error:', err);
      triggerMessage('error', err.message || 'حدث خطأ أثناء نقل العملاء');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="transfer-customers-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col text-right overflow-hidden"
      >
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                نقل وإسناد عملاء مندوب إلى مندوب آخر
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                إعادة توزيع الحسابات والعملاء وسجلات المتابعة بسهولة وأمان
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* REPRESENTATIVES SELECTION GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SOURCE REP */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                1. المندوب الحالي (المحوَّل منه) <span className="text-rose-500">*</span>
              </label>
              <select
                id="source-rep-select"
                value={sourceRep}
                onChange={(e) => {
                  const newSource = e.target.value;
                  setSourceRep(newSource);
                  if (targetRep === newSource) {
                    const fallback = availableReps.find(r => r !== newSource) || '';
                    setTargetRep(fallback);
                  }
                  setSelectedCustomerIds(new Set());
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {availableReps.map(rep => (
                  <option key={rep} value={rep}>
                    {rep} ({repCustomerCountMap[rep] || 0} عميل)
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold px-1">
                <span>إجمالي العملاء المسندين:</span>
                <span className="font-mono font-black text-teal-600 dark:text-teal-400">
                  {sourceCustomers.length} عميل
                </span>
              </div>
            </div>

            {/* TARGET REP */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                2. المندوب البديل (المحوَّل إليه) <span className="text-rose-500">*</span>
              </label>
              <select
                id="target-rep-select"
                value={targetRep}
                onChange={(e) => setTargetRep(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              >
                {availableReps.filter(r => r !== sourceRep).map(rep => (
                  <option key={rep} value={rep}>
                    {rep} ({repCustomerCountMap[rep] || 0} عميل حالي)
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold px-1">
                <span>العملاء الحاليين للمندوب البديل:</span>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                  {targetRep ? (repCustomerCountMap[targetRep] || 0) : 0} عميل
                </span>
              </div>
            </div>

          </div>

          {/* TRANSFER MODE SELECTOR */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              3. نطاق العملاء المراد نقلهم
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransferMode('all')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  transferMode === 'all'
                    ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-black text-xs">نقل كافة العملاء</div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                    {sourceCustomers.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                  تحويل كل قائمة عملاء المندوب بالكامل دفعة واحدة
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTransferMode('custom')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  transferMode === 'custom'
                    ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-black text-xs">تحديد عملاء مخصصين</div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {selectedCustomerIds.size} محدد
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                  اختيار عملاء معينين ونقلهم للمندوب الجديد
                </p>
              </button>
            </div>
          </div>

          {/* CUSTOM CLIENT SELECTION LIST */}
          {transferMode === 'custom' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-850/40 space-y-2 p-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                {/* Search in custom list */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في عملاء المندوب..."
                    className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 font-bold text-[11px] hover:bg-teal-100 cursor-pointer"
                  >
                    تحديد الكل ({filteredSourceCustomers.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Customer rows */}
              <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSourceCustomers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-bold">
                    لا يوجد أي عملاء يطابقون البحث لهذا المندوب.
                  </div>
                ) : (
                  filteredSourceCustomers.map(cust => {
                    const isSelected = selectedCustomerIds.has(cust.id);
                    return (
                      <div
                        key={cust.id}
                        onClick={() => toggleCustomerSelection(cust.id)}
                        className={`pt-2 pb-1.5 px-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100'
                            : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <div className="font-extrabold text-xs flex items-center gap-1.5">
                              <span>{cust.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">({cust.id})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              {cust.phone && <span>📞 {cust.phone}</span>}
                              {cust.province && <span>📍 {cust.province}</span>}
                              {cust.contactPerson && <span>👤 {cust.contactPerson}</span>}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                          cust.currentStatus === 'تم التعاقد' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                          cust.currentStatus === 'جاري المتابعة' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {cust.currentStatus}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ADDITIONAL OPTIONS */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            {/* Update Visits Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updateVisits}
                onChange={(e) => setUpdateVisits(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <div>
                <span className="block text-xs font-black text-slate-900 dark:text-white">
                  تحديث سجلات وزيارات المتابعة القادمة للمندوب الجديد
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                  يتيح للمندوب الجديد رؤية مواعيد المتابعات السابقة وتلقي التنبيهات الميدانية للعملاء المنقولين
                </span>
              </div>
            </label>

            {/* Notes / Reason input */}
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                ملاحظات أو سبب النقل (اختياري للتوثيق في سجل العمليات):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: إجازة المندوب، إعادة توزيع جغرافي للمناطق، استقالة..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* SUMMARY BANNER */}
          {sourceRep && targetRep && (
            <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-2xl flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  سيتم نقل <span className="font-black text-teal-700 dark:text-teal-300 font-mono text-sm">{transferCount}</span> عميل من <span className="font-black text-slate-900 dark:text-white">[{sourceRep}]</span> إلى <span className="font-black text-slate-900 dark:text-white">[{targetRep}]</span>
                </span>
              </div>
              <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400">
                {updateVisits ? '+ تحديث الزيارات' : 'العملاء فقط'}
              </span>
            </div>
          )}

          {sourceCustomers.length === 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>المندوب المحدد ليس لديه أي عملاء مسجلين حالياً لنقلهم.</span>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            id="confirm-transfer-customers-btn"
            onClick={handleTransfer}
            disabled={submitting || transferCount === 0 || !sourceRep || !targetRep || sourceRep === targetRep}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري النقل وتحديث السجلات...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>تأكيد نقل ({transferCount}) عميل إلى {targetRep || 'المندوب البديل'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferCustomersModal;
