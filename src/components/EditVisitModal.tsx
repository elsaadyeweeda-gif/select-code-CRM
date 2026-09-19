/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Visit, CustomerStatus, InterestLevel, VisitSource, VisitType, Customer } from '../types';
import { 
  X, CheckCircle, Edit, User, Phone, Briefcase, MapPin, 
  Clock, Calendar, Sparkles, HelpCircle, Save, Info, AlertCircle 
} from 'lucide-react';

interface EditVisitModalProps {
  isOpen: boolean;
  visit: Visit | null;
  onClose: () => void;
  onSave: (updatedVisit: Visit) => void;
  provinces: string[];
  activities: string[];
  salesRepsList: string[];
  customers: Customer[];
}

export default function EditVisitModal({
  isOpen,
  visit,
  onClose,
  onSave,
  provinces,
  activities,
  salesRepsList,
  customers
}: EditVisitModalProps) {
  
  // Local state for isolation
  const [activeTab, setActiveTab2] = useState<'basic' | 'contact' | 'result'>('basic');
  
  const [timestamp, setTimestamp] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('زيارة جديدة');
  const [repName, setRepName] = useState('');
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
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpResult, setFollowUpResult] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Searchable customer dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Close customer dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const container = document.getElementById('customer-name-search-container');
      if (container && !container.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    if (showCustomerDropdown) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [showCustomerDropdown]);

  // Hook to resolve selectedCustomerId if we edit an existing visit of an existing customer
  useEffect(() => {
    if (visit && customers) {
      const match = customers.find(c => c.name.toLowerCase().trim() === (visit.customerName || '').toLowerCase().trim());
      if (match) {
        setSelectedCustomerId(match.id);
      } else {
        setSelectedCustomerId(null);
      }
    }
  }, [visit, customers]);

  // Pre-populate fields on load
  useEffect(() => {
    if (visit) {
      setTimestamp(visit.timestamp ? visit.timestamp.slice(0, 16) : new Date().toISOString().slice(0, 16));
      setVisitType(visit.visitType);
      
      const isKnownRep = salesRepsList.includes(visit.repName);
      if (isKnownRep) {
        setRepName(visit.repName);
        setIsCustomRep(false);
        setCustomRepName('');
      } else {
        setRepName('other');
        setIsCustomRep(true);
        setCustomRepName(visit.repName);
      }
      
      setCustomerName(visit.customerName || '');
      setPhone(visit.phone || '');
      setWhatsapp(visit.whatsapp || visit.phone || '');
      setEmail(visit.email || '');
      setProvince(visit.province || '');
      setActivityType(visit.activityType || '');
      setRequestedProduct(visit.requestedProduct || 'POS');
      setContactPerson(visit.contactPerson || '');
      setJobTitle(visit.jobTitle || '');
      
      if (visit.visitType === 'زيارة جديدة') {
        setSummary(visit.summary || '');
        setNeeds(visit.needs || '');
        setFollowUpNotes('');
        setFollowUpResult('');
      } else {
        setSummary('');
        setNeeds('');
        setFollowUpNotes(visit.summary || visit.followUpNotes || '');
        setFollowUpResult(visit.followUpResult || '');
      }

      setInterestLevel((visit.interestLevel as InterestLevel) || 'متوسط');
      setCustomerStatus(visit.customerStatus || 'عميل محتمل');
      setOpportunityValue(String(visit.expectedOpportunityValue || (visit as any).opportunityValue || '0'));
      setVisitSource((visit.visitSource as VisitSource) || 'زيارة ميدانية');
      setNextStep(visit.nextStep || '');
      setNextFollowUpDate(visit.nextFollowUpDate || '');
    }
  }, [visit, salesRepsList]);

  if (!isOpen || !visit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('يرجى إدخال اسم العميل أولاً لحفظ التعديلات.');
      return;
    }

    const actualRepName = isCustomRep ? customRepName.trim() : repName;
    if (!actualRepName || actualRepName === 'other') {
      alert('يرجى تحديد أو إدخال اسم المندوب.');
      return;
    }

    // Prepare ISO timestamp
    let isoTimestamp = visit.timestamp;
    if (timestamp) {
      try {
        isoTimestamp = new Date(timestamp).toISOString();
      } catch (err) {
        console.warn('Invalid custom time entered:', err);
      }
    }

    const updatedVisit: Visit = {
      ...visit,
      timestamp: isoTimestamp,
      repId: isCustomRep ? 'REP-CUSTOM' : `REP-0${salesRepsList.indexOf(repName) + 1}`,
      repName: actualRepName,
      visitSource: visitSource,
      visitType: visitType,
      customerName: customerName.trim(),
      activityType: visitType === 'زيارة جديدة' ? activityType : 'زيارة تابعة',
      requestedProduct: visitType === 'زيارة جديدة' ? requestedProduct : '',
      contactPerson: contactPerson.trim(),
      jobTitle: jobTitle.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      email: email.trim(),
      province: province,
      summary: visitType === 'زيارة جديدة' ? summary.trim() : followUpNotes.trim(),
      needs: visitType === 'زيارة جديدة' ? needs.trim() : undefined,
      followUpNotes: visitType === 'زيارة متابعة' ? followUpNotes.trim() : undefined,
      followUpResult: visitType === 'زيارة متابعة' ? followUpResult.trim() : undefined,
      interestLevel: visitType === 'زيارة جديدة' ? interestLevel : undefined,
      nextStep: nextStep.trim(),
      nextFollowUpDate: nextFollowUpDate,
      customerStatus: customerStatus,
      expectedOpportunityValue: Number(opportunityValue) || 0,
    };

    onSave(updatedVisit);
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white border select-text border-slate-100 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl text-right animate-scaleIn font-sans" 
        dir="rtl"
      >
        
        {/* Modal Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-6 text-white flex justify-between items-center select-none">
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-all cursor-pointer p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl"
            title="إغلاق التعديل"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                معرف السجل: {visit.id}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                visitType === 'زيارة جديدة' 
                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/15' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
              }`}>
                {visitType}
              </span>
            </div>
            <h3 className="text-sm md:text-base font-black flex items-center gap-2 justify-end mt-1">
              <span>تعديل تفاصيل تقرير الزيارة</span>
              <Edit className="w-5 h-5 text-amber-550 text-amber-400" />
            </h3>
          </div>
        </div>

        {/* Navigation Tabs for form sections */}
        <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab2('basic')}
            className={`px-4 py-2 font-black text-xs rounded-xl transition-all border ${
              activeTab === 'basic' 
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/5' 
                : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200/55 hover:bg-slate-50'
            }`}
          >
            البيانات الأساسية للعميل
          </button>
          <button
            type="button"
            onClick={() => setActiveTab2('contact')}
            className={`px-4 py-2 font-black text-xs rounded-xl transition-all border ${
              activeTab === 'contact' 
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/5' 
                : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200/55 hover:bg-slate-50'
            }`}
          >
            بيانات الاتصال والمسؤول
          </button>
          <button
            type="button"
            onClick={() => setActiveTab2('result')}
            className={`px-4 py-2 font-black text-xs rounded-xl transition-all border ${
              activeTab === 'result' 
                ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/5' 
                : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200/55 hover:bg-slate-50'
            }`}
          >
            أحداث وتقييم الزيارة الميدانية
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            
            {/* TAB 1: BASIC INFORMATION */}
            {activeTab === 'basic' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50/40 p-3.5 rounded-2xl border border-amber-100 text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-2">
                  <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <p>تتم التعديلات هنا بشكل فوري وآمن على قاعدة البيانات المحلية، وسيقوم النظام بمزامنة التعديلات سحابياً تلقائياً بمجرد الحفظ والربط.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Name */}
                  <div className="space-y-1 relative animate-fadeIn" id="customer-name-search-container">
                    <label className="text-[11px] font-black text-slate-700 block">اسم التاجر / الشركة العميل *</label>
                    
                    {selectedCustomerId ? (
                      // When a customer is linked from DB
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-bold text-xs mt-1">
                        <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="flex-1 text-right">{customerName}</span>
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-black">عميل مسجل</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId(null);
                          }}
                          className="text-[10px] text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                        >
                          تعديل الاسم / فك الارتباط
                        </button>
                      </div>
                    ) : (
                      // Manual Input with Search Dropdown
                      <div className="relative">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          required
                          placeholder="ابحث باسم عميل مسجل أو اكتب اسماً جديداً..."
                          className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                        />
                        {/* Dropdown list */}
                        {showCustomerDropdown && (
                          <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50 py-1.5 text-right font-sans">
                            {/* Option to create a new customer */}
                            {customerName.trim() && !customers.some(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim()) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCustomerDropdown(false);
                                }}
                                className="w-full text-right px-4 py-2 hover:bg-slate-50 text-xs font-bold text-amber-600 border-b border-slate-100 flex items-center justify-between transition-all"
                              >
                                <span>+ تسجيل عميل جديد بالاسم المكتوب</span>
                                <span className="text-[10px] text-slate-400 font-normal">جديد</span>
                              </button>
                            )}
                            
                            {/* Filtered list of customers */}
                            {(() => {
                              const searchLower = customerName.toLowerCase().trim();
                              const filtered = (customers || []).filter(c => 
                                c.name.toLowerCase().includes(searchLower) ||
                                (c.phone && c.phone.includes(searchLower)) ||
                                (c.province && c.province.includes(searchLower))
                              );
                              
                              if (filtered.length === 0) {
                                return (
                                  <div className="px-4 py-3 text-xs text-slate-400 font-bold text-center">
                                    لا يوجد عميل تطابق بياناته البحث. سيتم اعتباره عميل جديد عند الحفظ.
                                  </div>
                                );
                              }
                              
                              return filtered.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setCustomerName(c.name);
                                    setPhone(c.phone || '');
                                    setWhatsapp(c.whatsapp || c.phone || '');
                                    setEmail(c.email || '');
                                    setProvince(c.province || '');
                                    setActivityType(c.activity || '');
                                    setCustomerStatus(c.currentStatus || 'عميل محتمل');
                                    setContactPerson(c.contactPerson || '');
                                    if (c.requestedProduct) {
                                      setRequestedProduct(c.requestedProduct);
                                    }
                                    setOpportunityValue(String(c.opportunityValue || '0'));
                                    setSelectedCustomerId(c.id);
                                    setShowCustomerDropdown(false);
                                  }}
                                  className="w-full text-right px-4 py-2 hover:bg-amber-50/50 text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
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

                  {/* Visit Date & Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">تاريخ وتوقيت الزيارة الموثق</label>
                    <input
                      type="datetime-local"
                      value={timestamp}
                      onChange={(e) => setTimestamp(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sales Rep Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">المندوب المسؤول عن الزيارة</label>
                    <select
                      value={repName || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRepName(val);
                        setIsCustomRep(val === 'other');
                      }}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                    >
                      {salesRepsList.map((name, i) => (
                        <option key={i} value={name === 'أخرى' ? 'other' : name}>{name === 'أخرى' ? 'مندوب آخر (كتابة يدوية) ✎' : name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Province */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">المحافظة / النطاق الجغرافي</label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                    >
                      <option value="">--اختر المحافظة الجغرافية--</option>
                      {provinces.map((p, i) => (
                        <option key={i} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isCustomRep && (
                  <div className="p-3 bg-amber-50/35 border border-amber-100 rounded-xl space-y-1">
                    <label className="text-[10px] font-black text-slate-600 block">يرجى كتابة اسم المندوب يدوياً:</label>
                    <input
                      type="text"
                      value={customRepName}
                      onChange={(e) => setCustomRepName(e.target.value)}
                      placeholder="اسم المندوب الثلاثي"
                      className="w-full text-xs font-bold p-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Visit Source */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">مصدر الصفقة / العميل</label>
                    <select
                      value={visitSource}
                      onChange={(e) => setVisitSource(e.target.value as VisitSource)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                    >
                      <option value="زيارة ميدانية">زيارة ميدانية عشوائية</option>
                      <option value="بيانات عملاء">بيانات عملاء سابقة</option>
                      <option value="اعلان سوشيل مديا">حملة اعلانات سوسيال ميديا</option>
                      <option value="ترشيح">ترشيح من عميل سابق</option>
                      <option value="غير ذلك">أخرى / اتصال وارد</option>
                    </select>
                  </div>

                  {/* Visit Type selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">نوع الزيارة الموثقة</label>
                    <select
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value as VisitType)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                    >
                      <option value="زيارة جديدة">زيارات تسجيل جديدة</option>
                      <option value="زيارة متابعة">زيارات المتابعة وتتبع الصفقات</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTACT DETAILS */}
            {activeTab === 'contact' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block font-sans">رقم الجوال النشط للعميل</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="05xxxxxxx"
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-left placeholder-right pr-9"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">رقم واتساب للمراسلات</label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="05xxxxxxx"
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-left placeholder-right"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Person */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">اسم الشخص المسؤول بالمنشأة</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="مثال: أ. محمد السعيد"
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                    />
                  </div>

                  {/* Job Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 block">المسمى الوظيفي للمسؤول</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="مثال: مدير المشتريات / الشريك العام"
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 block font-sans">البريد الإلكتروني للشركة</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@clientcompany.com"
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-left placeholder-right font-sans"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: VISIT PROCEEDINGS AND CUSTOMER EVALUATION */}
            {activeTab === 'result' && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Conditionally render fields based on Visit Type */}
                {visitType === 'زيارة جديدة' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Activity Type Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-700 block">مجال العمل / النشاط التجاري</label>
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                        >
                          <option value="">--تحديد نوع النشاط--</option>
                          {activities.map((act, i) => (
                            <option key={i} value={act}>{act}</option>
                          ))}
                        </select>
                      </div>

                      {/* Requested Product */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-700 block">المنتج والحل البرمجي المطروح أو المطلوبة</label>
                        <select
                          value={requestedProduct}
                          onChange={(e) => setRequestedProduct(e.target.value)}
                          className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right"
                        >
                          <option value="POS">محاسبة وكاشير كلي POS</option>
                          <option value="ERP System">نظام موارد متكامل ERP</option>
                          <option value="CRM App">تطبيق مبيعات وعلاقات عملاء CRM</option>
                          <option value="Ecommerce">متجر إلكتروني وموقع ويب</option>
                          <option value="Custom Software">حلول ودعم فني مخصص</option>
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">ملخص المقابلة الميدانية بالتفصيل *</label>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="اكتب خلاصة المقابلة بوضوح ودقة..."
                        rows={3}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right leading-relaxed"
                      />
                    </div>

                    {/* Needs */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">متطلبات التاجر البرمجية والاحتياجات الأساسية</label>
                      <textarea
                        value={needs}
                        onChange={(e) => setNeeds(e.target.value)}
                        placeholder="مثال: يطلب ربط مباشر مع الفواتير الإلكترونية وزيادة دعم أجهزة الكاشير..."
                        rows={2}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right leading-relaxed"
                      />
                    </div>

                    {/* Interest level */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">مدى الحماس / مستوى اهتمام العميل</label>
                      <select
                        value={interestLevel}
                        onChange={(e) => setInterestLevel(e.target.value as InterestLevel)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right font-black"
                      >
                        <option value="مرتفع">🔥 مرتفع جداً ومهتم بالإغلاق السريع</option>
                        <option value="متوسط">⚡ متوسط / يفكر ويدرس البدائل</option>
                        <option value="منخفض">❄️ منخفض / بارد ويحتاج لجهد متابعة</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Follow-up notes */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">ملاحظات ومجريات جلسة المتابعة *</label>
                      <textarea
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        placeholder="ماذا دار في الزيارة التابعة ومكالمات المتابعة البيعية؟"
                        rows={3}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right leading-relaxed"
                      />
                    </div>

                    {/* Follow up result */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">النتيجة الحالية للمتابعة والأرباح</label>
                      <textarea
                        value={followUpResult}
                        onChange={(e) => setFollowUpResult(e.target.value)}
                        placeholder="هل تم تقديم عرض سعر؟ هل استلمنا مقدم؟ هل تم الإقفال؟"
                        rows={2}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all text-right leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Common fields: Next Steps, Status and Opportunity Value */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="text-[11px] font-black text-slate-700 border-b border-slate-150 pb-1 flex items-center justify-start gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>التقييم التجاري وإغلاق الصفقة</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Status */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">الحالة البيعية الحالية للعميل</label>
                      <select
                        value={customerStatus}
                        onChange={(e) => setCustomerStatus(e.target.value as CustomerStatus)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 transition-all text-right font-black"
                      >
                        <option value="عميل محتمل">عميل محتمل (مستهدف)</option>
                        <option value="جاري المتابعة">جاري تتبع المبيعات والمداولة</option>
                        <option value="تم إرسال عرض سعر">تم تقديم عرض تسعير معتمد</option>
                        <option value="تفاوض">تفاوض نهائي ومراجعة البنود</option>
                        <option value="تم التعاقد">🎉 تم التعاقد والشراء بنجاح (عميل جديد)</option>
                        <option value="غير مهتم">خارج الاهتمام / مستبعد أو بارد</option>
                      </select>
                    </div>

                    {/* Opportunity Value */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">إجمالي القيمة المالية المتوقعة للمبيعات (ريال)</label>
                      <input
                        type="number"
                        value={opportunityValue}
                        onChange={(e) => setOpportunityValue(e.target.value)}
                        placeholder="خصم بالريال السعودي"
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-850 focus:outline-none focus:border-amber-500 transition-all text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Next step */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">الخطوة القادمة المطلوبة</label>
                      <input
                        type="text"
                        value={nextStep}
                        onChange={(e) => setNextStep(e.target.value)}
                        placeholder="مثال: إرسال بروفايل أو اتصال الأسبوع القادم"
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 transition-all text-right"
                      />
                    </div>

                    {/* Next Follow Up Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-700 block">تاريخ المتابعة القادمة الموصى به</label>
                      <input
                        type="date"
                        value={nextFollowUpDate}
                        onChange={(e) => setNextFollowUpDate(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 transition-all text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="bg-slate-50 px-6 py-5 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold rounded-2xl text-xs transition-all cursor-pointer shadow-3xs"
            >
              إلغاء وتراجع ✕
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black rounded-2xl text-xs shadow-md shadow-amber-600/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>حفظ وتحديث التغييرات البيعية 👍</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
