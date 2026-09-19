/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SalesRep, Visit, VisitType, CustomerStatus, InterestLevel, Customer } from '../types';
import { Calendar, User, Briefcase, FileText, Phone, MapPin, DollarSign, Upload, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';

interface RepFormProps {
  salesReps: SalesRep[];
  customers: Customer[];
  activeRepId: string;
  onVisitSubmit: (visit: Visit) => void;
  onNavigateToVisits: () => void;
}

export default function RepForm({ salesReps, customers, activeRepId, onVisitSubmit, onNavigateToVisits }: RepFormProps) {
  // Active representative auto-selection based on state/role
  const defaultRep = salesReps.find(r => r.id === activeRepId) || salesReps[0];

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

  // Form states
  const [repId, setRepId] = useState(defaultRep?.id || '');
  const [visitType, setVisitType] = useState<VisitType>('زيارة جديدة');
  const [customerName, setCustomerName] = useState('');
  
  // New Visit fields
  const [activityType, setActivityType] = useState('');
  const [requestedProduct, setRequestedProduct] = useState('POS');
  const [contactPerson, setContactPerson] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [summary, setSummary] = useState('');
  const [needs, setNeeds] = useState('');
  const [interestLevel, setInterestLevel] = useState<InterestLevel>('متوسط');
  
  // Follow-up fields
  const [existingCustomerId, setExistingCustomerId] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpResult, setFollowUpResult] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  
  // Common fields
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus>('عميل محتمل');
  const [opportunityValue, setOpportunityValue] = useState<number>(0);
  
  // Attachment files
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success indicator
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Duplicate Check indicator
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);

  // Phone check event handler
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (!val) {
      setPhoneWarning(null);
      return;
    }
    const dup = customers.find(c => c.phone === val || c.whatsapp === val);
    if (dup) {
      setPhoneWarning(`⚠️ تنبيه: العميل "${dup.name}" مسجل مسبقاً بنفس رقم الهاتف تحت إشراف المندوب المسؤول عنه. لتجنب التكرار في Google Sheets، يمكنك تحويل نوع الزيارة إلى "زيارة متابعة" واختياره مباشرة.`);
    } else {
      setPhoneWarning(null);
    }
  };

  const handleSelectExistingCustomer = (id: string) => {
    setExistingCustomerId(id);
    const selected = customers.find(c => c.id === id);
    if (selected) {
      setCustomerName(selected.name);
      setCustomerStatus(selected.currentStatus);
      setOpportunityValue(selected.opportunityValue);
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadedFileName(file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFileName(e.target.files[0].name);
    }
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (visitType === 'زيارة جديدة' && !customerName.trim()) {
      alert('الرجاء إدخال اسم العميل');
      return;
    }

    if (visitType === 'زيارة متابعة' && !existingCustomerId) {
      alert('الرجاء تحديد العميل المراد متابعته');
      return;
    }

    const selectedRep = salesReps.find(r => r.id === repId) || defaultRep;

    const newVisitObj: Visit = {
      id: `VIS-${Math.floor(Date.now() / 10000)}`,
      timestamp: new Date().toISOString(),
      repId: selectedRep.id,
      repName: selectedRep.name,
      visitType,
      customerName: visitType === 'زيارة جديدة' ? customerName : (customers.find(c => c.id === existingCustomerId)?.name || ''),
      
      // New fields conditional
      ...(visitType === 'زيارة جديدة' ? {
        activityType,
        requestedProduct,
        contactPerson,
        jobTitle,
        phone,
        whatsapp: whatsapp || phone, // fallback
        email,
        address,
        province,
        summary,
        needs,
        interestLevel,
      } : {
        followUpNotes,
        followUpResult,
        nextStep,
        nextFollowUpDate,
      }),
      
      // Common
      customerStatus,
      expectedOpportunityValue: opportunityValue,
      attachmentUrl: uploadedFileName ? `https://select-code.com/crm/files/${uploadedFileName}` : undefined
    };

    onVisitSubmit(newVisitObj);
    
    // Clear and Show Success State
    setSuccessMsg(`تم تسجيل زيارتك بنجاح للعميل: ${newVisitObj.customerName}`);
    setSubmitSuccess(true);
    
    // Auto-scroll to top of container
    document.getElementById('rep-form-scroll-top')?.scrollIntoView({ behavior: 'smooth' });

    // Reset fields
    setCustomerName('');
    setActivityType('');
    setRequestedProduct('POS');
    setContactPerson('');
    setJobTitle('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setSummary('');
    setNeeds('');
    setFollowUpNotes('');
    setFollowUpResult('');
    setNextStep('');
    setNextFollowUpDate('');
    setUploadedFileName(null);
    setExistingCustomerId('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="rep-form-scroll-top">
      {submitSuccess ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-xs space-y-6">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">تم الحفظ بنجاح!</h2>
          <p className="text-gray-600 max-w-md mx-auto">{successMsg}</p>
          <p className="text-xs text-gray-400">
            تمت مزامنة البيانات وتحديث الملف الشخصي للعميل وملف المتابعات محلياً وجاهزة للنقل لجوجل شيت تلقائياً.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSubmitSuccess(false);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl cursor-pointer transition-colors"
            >
              تسجيل زيارة أخرى
            </button>
            <button
              onClick={onNavigateToVisits}
              className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl cursor-pointer transition-colors"
            >
              عرض سجل الزيارات
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submitForm} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xs text-right font-sans">
          {/* Header */}
          <div className="bg-gradient-to-l from-slate-900 to-blue-950 p-6 text-white space-y-2">
            <h2 className="text-xl font-bold font-sans">نموذج تسجيل زيارة ميدانية جديدة</h2>
            <p className="text-blue-200 text-xs text-right">
              الرجاء ملء حقول المبيعات أدناه بدقة. يدعم هذا النموذج التحديث والربط الفوري مع نظام Select Code Google Workspace.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Meta Segment (Rep selector & Visit Type toggle) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Representative selector */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-gray-600 flex items-center justify-end gap-1.5">
                  <span>اسم المندوب المسؤول</span>
                  <User className="w-3.5 h-3.5 text-gray-400" />
                </label>
                <select
                  value={repId}
                  onChange={(e) => setRepId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 text-right outline-none"
                >
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                  ))}
                </select>
              </div>

              {/* Timestamp Indicator */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-gray-600 flex items-center justify-end gap-1.5">
                  <span>تاريخ ووقت الزيارة</span>
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                </label>
                <div className="w-full bg-gray-100/80 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-500 text-right font-mono">
                  {new Date().toLocaleString('ar-SA')} (تلقائي)
                </div>
              </div>
            </div>

            {/* Visit Type Toggle Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 block text-right">نوع الزيارة الميدانية</label>
              <div className="grid grid-cols-2 gap-3" dir="rtl">
                <button
                  type="button"
                  onClick={() => setVisitType('زيارة جديدة')}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    visitType === 'زيارة جديدة'
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>زيارة جديدة لعميل (أول مرة)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisitType('زيارة متابعة')}
                  className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    visitType === 'زيارة متابعة'
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>زيارة متابعة لعميل حالي</span>
                </button>
              </div>
            </div>

            {/* BRANCH 1: NEW VISIT FORM */}
            {visitType === 'زيارة جديدة' ? (
              <div className="space-y-5 animate-fadeIn">
                <h3 className="text-sm font-bold text-blue-850 border-b border-blue-100 pb-2 mb-2">بيانات العميل الجديد</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">اسم المنشأة / العميل الجديد <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="مثال: شركة النخبة المتميزة للمقاولات"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                    />
                  </div>

                  {/* Business type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">نوع النشاط (مثال: ملابس، جوالات، مصنع) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="نوع نشاط العميل..."
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-850 text-right outline-none"
                    />
                  </div>

                  {/* Requested product */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">المنتج المطلوب</label>
                    <select
                      value={requestedProduct}
                      onChange={(e) => setRequestedProduct(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-850 text-right outline-none"
                    >
                      <option value="POS">POS</option>
                      <option value="ERP">ERP</option>
                      <option value="غير ذلك">غير ذلك</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact person */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">اسم الشخص المسؤول</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="مثال: أ. عبد الرحمن المحيسن"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                    />
                  </div>

                  {/* Job title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">المسمى الوظيفي للمسؤول</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="مثال: مدير المشتريات وتكنولوجيا المعلومات"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone & Duplicate check warning */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block flex items-center justify-end gap-1">
                      <span>رقم الهاتف الأساسي <span className="text-rose-500">*</span></span>
                      <Phone className="w-3" />
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="مثال: 0501234567"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none font-mono"
                    />
                  </div>

                  {/* Whatsapp */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">رقم وتساب للتواصل المعتمد</label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="مثال: 0501234567"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none font-mono"
                    />
                  </div>
                </div>

                {phoneWarning && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex gap-2 items-start justify-end col-span-full">
                    <div className="text-right leading-relaxed flex-1">{phoneWarning}</div>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-semibold text-gray-600 block">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="office@client.sa"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block flex items-center justify-end gap-1">
                      <span>العنوان</span>
                      <MapPin className="w-3" />
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setProvince(e.target.value);
                      }}
                      placeholder="أدخل عنوان العميل بالتفصيل..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                    />
                  </div>
                </div>

                {/* Visit summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">ملخص الزيارة <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="اكتب هنا تفاصيل مقابلة المسؤول، الانطباع الأول، وشرح ما تم استعراضه..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                  />
                </div>

                {/* Patient needs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">احتياجات العميل ومقترحات البرمجيات المناسبة</label>
                  <textarea
                    value={needs}
                    onChange={(e) => setNeeds(e.target.value)}
                    placeholder="مثال: متطلب الفاتورة الإلكترونية للمرحلة الثانية، 5 مستخدمين حسابات، نظام صلاحيات منفصل للمحاسب..."
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                  />
                </div>

                {/* Interest level selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">مستوى اهتمام العميل</label>
                  <div className="grid grid-cols-3 gap-3" dir="rtl">
                    {(['مرتفع', 'متوسط', 'منخفض'] as InterestLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setInterestLevel(level)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          interestLevel === level
                            ? level === 'مرتفع' ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : level === 'متوسط' ? 'bg-amber-50 border-amber-500 text-amber-800'
                              : 'bg-rose-50 border-rose-500 text-rose-800'
                            : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* BRANCH 2: FOLLOW-UP VISIT FORM */
              <div className="space-y-5 animate-fadeIn text-right">
                <h3 className="text-sm font-bold text-blue-850 border-b border-blue-100 pb-2 mb-2">بيانات وملاحظات زيارة المتابعة</h3>

                {/* Select from existing database */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">اختيار العميل المستهدف للمتابعة <span className="text-rose-500">*</span></label>
                  <select
                    value={existingCustomerId}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 text-right outline-none"
                  >
                    <option value="">-- يرجى اختيار العميل المنظم مسبقاً --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.province}) - {c.currentStatus}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-gray-400">
                    * ملاحظة: اختيار العميل من القائمة يضمن مزامنة زياراته وبناء تقارير المتابعة الدورية دون ازدواجية في قاعدة البيانات.
                  </span>
                </div>

                {/* Followup notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">ملاحظات المتابعة والتحديثات <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="اكتب هنا تطور الحالة: هل تم الاتصال به هاتفياً، أم الاستعراض الفني الإضافي، ما هي البنود الجديدة التي تم نقدها؟"
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                  />
                </div>

                {/* Followup Result */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">نتيجة المتابعة وحصيلة الاجتماع</label>
                  <textarea
                    value={followUpResult}
                    onChange={(e) => setFollowUpResult(e.target.value)}
                    placeholder="مثال: وافق العميل على التسعيرة ويرغب بإرسال العقد القانوني لإمضاء المعاملة الرسمية..."
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Next Step */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">الخطوة القادمة المطلوبة</label>
                    <input
                      type="text"
                      value={nextStep}
                      onChange={(e) => setNextStep(e.target.value)}
                      placeholder="مثال: إرسال مسودة العقد للتوقيع"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none"
                    />
                  </div>

                  {/* Next Followup Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block flex items-center justify-end gap-1">
                      <span>تاريخ المتابعة القادمة المجدول</span>
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-sm text-gray-800 text-right outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* COMMON FIELDS SECTION (Shows always at the bottom) */}
            <div className="border-t border-gray-100 pt-5 space-y-4 text-right">
              <h4 className="text-xs font-bold text-gray-700 tracking-wider">الحالة البيعية والتقديرات للفرصة</h4>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Client Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block">تصنيف حالة العميل الحالية <span className="text-rose-500">*</span></label>
                  <select
                    value={customerStatus}
                    onChange={(e) => setCustomerStatus(e.target.value as CustomerStatus)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 text-right outline-none font-semibold text-blue-800"
                  >
                    <option value="عميل محتمل" className="text-amber-600 font-semibold">عميل محتمل (مهتم)</option>
                    <option value="جاري المتابعة" className="text-indigo-600 font-semibold">جاري المتابعة والاتصال</option>
                    <option value="تم إرسال عرض سعر" className="text-indigo-600 font-semibold">تم إرسال عرض سعر رسمى</option>
                    <option value="تفاوض" className="text-blue-600 font-semibold">تفاوض نهائي ومراجعة العقود</option>
                    <option value="تم التعاقد" className="text-emerald-600 font-semibold">تم التعاقد ودفع الدفعة الأولى 🚀</option>
                    <option value="غير مهتم" className="text-gray-500 font-semibold">غير مهتم / مغلق حالياً</option>
                  </select>
                </div>
              </div>

              {/* Usability Pattern Guidelines: Drag and Drop photo or attachment upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 block">مرفقات أو صور الزيارة الميدانية (اختياري)</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : uploadedFileName
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-gray-400">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  {uploadedFileName ? (
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">تم اختيار الملف بنجاح</p>
                      <p className="text-xs text-emerald-600 font-mono mt-0.5">{uploadedFileName}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700 font-medium">سحب وإفلات صورة الزيارة أو العرض هنا، أو اضغط للتصفح</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">يدعم الصور والمستندات بحد أقصى 5 ميجابايت</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit layout button */}
            <div className="pt-4 flex gap-3 justify-end items-center">
              <button
                type="button"
                onClick={onNavigateToVisits}
                className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                إلغاء وتراجع
              </button>
              <button
                type="submit"
                className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-sm shadow-blue-700/10"
              >
                حفظ وإرسال التقرير للجدول والمدير
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
