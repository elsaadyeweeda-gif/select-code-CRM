/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Visit, Customer, SalesRep, SupportTask } from '../types';
import { normalizeDateToISO } from '../utils';
import { FileText, Printer, Award, TrendingUp, BarChart4, ClipboardList, Target, Percent, MapPin, Filter, Download, Calendar, Search, RefreshCw, Database, Link2, Phone, User, Mail, MessageSquare, ExternalLink, Briefcase, Wrench, ArrowRightLeft } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import TransferCustomersModal from './TransferCustomersModal';

interface ReportsViewProps {
  visits: Visit[];
  customers: Customer[];
  salesReps: SalesRep[];
  token?: string;
  onTransferSuccess?: (result: any) => void;
  triggerMessage?: (type: 'success' | 'error' | 'info', text: string) => void;
}

const monitoringStatusMap: { [key: string]: string } = {
  'Customer Satisfied': 'عميل راضٍ / مكالمة ناجحة ✅',
  'Customer Interested': 'عميل مهتم بالتطوير وشراء إضافات 📈',
  'Needs Follow-up': 'بحاجة لمتابعة تليفونية إضافية ⏳',
  'Complaint Opened': 'تم فتح شكوى رسمية 🚨',
  'Technical Issue Reported': 'بلاغ بمشكلة تقنية 🛠️',
  'Customer Unsatisfied': 'عميل غير راضٍ ⚠️',
  'Customer Not Interested': 'عميل غير مهتم تماماً ❌'
};

type ReportType = 
  | 'custom_filter'
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'top_reps' 
  | 'performance_by_rep'
  | 'followup_effectiveness' 
  | 'conversion_rate'
  | 'customer_history'
  | 'monitoring_quality'
  | 'technical_support';

export default function ReportsView({ 
  visits, 
  customers, 
  salesReps,
  token,
  onTransferSuccess,
  triggerMessage = () => {}
}: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('custom_filter');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const salesRepNames = useMemo(() => salesReps.map(r => r.name), [salesReps]);

  // Quality Monitoring Detailed Report States
  const [monitoringRecords, setMonitoringRecords] = useState<any[]>([]);
  const [monitoringLoading, setMonitoringLoading] = useState<boolean>(false);
  const [mSearchQuery, setMSearchQuery] = useState<string>('');
  const [mStatusFilter, setMStatusFilter] = useState<string>('all');
  const [mEmployeeFilter, setMEmployeeFilter] = useState<string>('all');
  const [mSatisfactionFilter, setMSatisfactionFilter] = useState<string>('all');

  React.useEffect(() => {
    if (!token) return;
    const fetchMonitoringRecords = async () => {
      setMonitoringLoading(true);
      try {
        const res = await fetch('/api/monitoring/records', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setMonitoringRecords(data.records || []);
        }
      } catch (err) {
        console.error('Error fetching monitoring records in ReportsView:', err);
      } finally {
        setMonitoringLoading(false);
      }
    };
    fetchMonitoringRecords();
  }, [token]);

  // Technical Support Detailed Report States
  const [supportTasks, setSupportTasks] = useState<SupportTask[]>([]);
  const [supportTasksLoading, setSupportTasksLoading] = useState<boolean>(false);
  const [sSearchQuery, setSSearchQuery] = useState<string>('');
  const [sStatusFilter, setSStatusFilter] = useState<string>('all');
  const [sPriorityFilter, setSPriorityFilter] = useState<string>('all');
  const [sEmployeeFilter, setSEmployeeFilter] = useState<string>('all');
  const [sTaskTypeFilter, setSTaskTypeFilter] = useState<string>('all');

  React.useEffect(() => {
    if (!token) return;
    const fetchSupportTasks = async () => {
      setSupportTasksLoading(true);
      try {
        const res = await fetch('/api/support/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setSupportTasks(data.tasks || []);
        }
      } catch (err) {
        console.error('Error fetching support tasks in ReportsView:', err);
      } finally {
        setSupportTasksLoading(false);
      }
    };
    fetchSupportTasks();
  }, [token]);

  // Customer History Specific States
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Filter States
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'visits'>('customers');

  // Group visits by customer name to identify which reps visited each customer
  const customerRepsMap = useMemo(() => {
    const map: { [custName: string]: Set<string> } = {};
    visits.forEach(v => {
      if (!v.customerName) return;
      const nameKey = v.customerName.toLowerCase().trim();
      if (!map[nameKey]) {
        map[nameKey] = new Set<string>();
      }
      if (v.repName) {
        map[nameKey].add(v.repName);
      }
    });
    return map;
  }, [visits]);

  // Extract all existing unique product names/types
  const dynamicProductsList = useMemo(() => {
    const products = new Set<string>();
    customers.forEach(c => {
      if (c.requestedProduct) products.add(c.requestedProduct);
    });
    visits.forEach(v => {
      if (v.requestedProduct) products.add(v.requestedProduct);
    });
    // Add default popular ones to make sure dropdown is rich
    products.add('POS');
    products.add('ERP');
    return Array.from(products).filter(Boolean);
  }, [customers, visits]);

  // Execute advanced filtering on visits (handles representative & date period precisely)
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      // 1. Filter by Rep
      if (selectedRep !== 'all') {
        if (!v.repName || v.repName.trim().toLowerCase() !== selectedRep.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Filter by Period (Date) with normalized dates
      if (startDate || endDate) {
        const visitDateStr = normalizeDateToISO(v.timestamp);
        if (!visitDateStr) return false;
        if (startDate && visitDateStr < startDate) return false;
        if (endDate && visitDateStr > endDate) return false;
      }

      // 3. Filter by Status
      if (selectedStatus !== 'all') {
        if (v.customerStatus !== selectedStatus) {
          return false;
        }
      }

      // 4. Filter by Product
      if (selectedProduct !== 'all') {
        const productVal = (v.requestedProduct || '').toUpperCase();
        const isERP = productVal.includes('ERP');
        const isPOS = productVal.includes('POS');

        if (selectedProduct === 'ERP') {
          if (!isERP) return false;
        } else if (selectedProduct === 'POS') {
          if (!isPOS) return false;
        } else if (selectedProduct === 'غير ذلك') {
          if (isERP || isPOS) return false;
        }
      }

      return true;
    });
  }, [visits, selectedRep, selectedStatus, selectedProduct, startDate, endDate]);

  // Execute advanced filtering on customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const normName = c.name.toLowerCase().trim();
      
      // 1. Filter by Status
      if (selectedStatus !== 'all') {
        if (c.currentStatus !== selectedStatus) {
          return false;
        }
      }
      
      // 2. Filter by Product
      if (selectedProduct !== 'all') {
        const productVal = (c.requestedProduct || '').toUpperCase();
        const activityVal = (c.activity || '').toUpperCase();
        
        const isERP = productVal.includes('ERP') || activityVal.includes('ERP');
        const isPOS = productVal.includes('POS') || activityVal.includes('POS');

        if (selectedProduct === 'ERP') {
          if (!isERP) return false;
        } else if (selectedProduct === 'POS') {
          if (!isPOS) return false;
        } else if (selectedProduct === 'غير ذلك') {
          if (isERP || isPOS) return false;
        }
      }
      
      // 3. Filter by Rep and/or Period (Correlated via filteredVisits)
      if (selectedRep !== 'all' || startDate || endDate) {
        const hasMatchingVisit = filteredVisits.some(v => v.customerName && v.customerName.toLowerCase().trim() === normName);
        if (!hasMatchingVisit) {
          return false;
        }
      }
      
      return true;
    });
  }, [customers, filteredVisits, selectedRep, selectedStatus, selectedProduct, startDate, endDate]);

  // Download filtered data directly as Excel-compatible CSV with UTF-8 BOM
  const handleDownloadFilteredExcel = () => {
    if (activeSubTab === 'visits') {
      if (filteredVisits.length === 0) {
        alert('لا توجد أي زيارات مطابقة حالياً لتصديرها كملف Excel!');
        return;
      }

      let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic compatibility
      const headers = [
        "معرف الزيارة",
        "تاريخ ووقت الزيارة",
        "اسم العميل",
        "المندوب الميداني",
        "نوع الزيارة",
        "حالة العميل",
        "قيمة الفرصة المتوقعة",
        "الخلاصة والملاحظات",
        "الخطوة القادمة",
        "تاريخ المتابعة القادم"
      ];

      csvContent += headers.join(",") + "\n";

      filteredVisits.forEach(v => {
        const notes = (v.visitType === 'زيارة متابعة' ? v.followUpNotes : v.summary) || "";
        const row = [
          v.id || "",
          `"${v.timestamp || ""}"`,
          `"${(v.customerName || "").replace(/"/g, '""')}"`,
          `"${(v.repName || "").replace(/"/g, '""')}"`,
          `"${v.visitType || ""}"`,
          `"${v.customerStatus || ""}"`,
          v.expectedOpportunityValue || 0,
          `"${notes.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
          `"${(v.nextStep || "").replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
          v.nextFollowUpDate || ""
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `تقرير_زيارات_ميدانية_مصفى_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredCustomers.length === 0) {
        alert('لا توجد أي سجلات مطابقة حالياً لتصديرها كملف Excel!');
        return;
      }

      let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic compatibility
      const headers = [
        "معرف العميل",
        "اسم الشركة / المحل",
        "رقم الهاتف",
        "رقم واتساب",
        "البريد الإلكتروني",
        "العنوان",
        "المجال / نوع النشاط",
        "المنتج المطلوب",
        "الكادر المزار بواسطة",
        "الحالة البيعية الحالية",
        "تاريخ أول زيارة",
        "تاريخ آخر زيارة",
        "عدد الزيارات الكلي"
      ];

      csvContent += headers.join(",") + "\n";

      filteredCustomers.forEach(c => {
        const repsList = Array.from(customerRepsMap[c.name.toLowerCase().trim()] || []).join(" - ");
        const row = [
          c.id || "",
          `"${c.name.replace(/"/g, '""')}"`,
          c.phone || "",
          c.whatsapp || "",
          c.email || "",
          c.province || c.address || "",
          c.activity ? `"${c.activity.replace(/"/g, '""')}"` : "",
          c.requestedProduct ? `"${c.requestedProduct.replace(/"/g, '""')}"` : "",
          `"${repsList.replace(/"/g, '""')}"`,
          c.currentStatus || "",
          c.firstVisitDate || "",
          c.lastVisitDate || "",
          c.visitsCount || 0
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `تقرير_مصفى_عملاء_مبيعات_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to format dynamic month to Arabic string
  const formatMonthToArabic = (yearMonthStr: string) => {
    if (!yearMonthStr) return '';
    const parts = yearMonthStr.split('-');
    if (parts.length < 2) return yearMonthStr;
    const monthsArabic: { [key: string]: string } = {
      '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
      '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
      '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
    };
    const monthName = monthsArabic[parts[1]] || parts[1];
    return `${monthName} ${parts[0]}`;
  };

  // 1. Daily activity calculations (For today's date)
  const dailyReportData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let todayVisits = visits.filter(v => v.timestamp && normalizeDateToISO(v.timestamp) === todayStr);
    let activeDate = todayStr;

    // Fallback to the latest visit date in the database if no visits today
    if (todayVisits.length === 0 && visits.length > 0) {
      const sortedVisits = [...visits].sort((a, b) => {
        const dateA = normalizeDateToISO(a.timestamp);
        const dateB = normalizeDateToISO(b.timestamp);
        return dateB.localeCompare(dateA);
      });
      const latestTimestamp = sortedVisits[0].timestamp;
      if (latestTimestamp) {
        const latestDateStr = normalizeDateToISO(latestTimestamp);
        todayVisits = visits.filter(v => v.timestamp && normalizeDateToISO(v.timestamp) === latestDateStr);
        activeDate = latestDateStr;
      }
    }
    
    const newVisits = todayVisits.filter(v => v.visitType === 'زيارة جديدة');
    const followUps = todayVisits.filter(v => v.visitType === 'زيارة متابعة');
    const totalRevenueForecast = todayVisits.reduce((sum, v) => sum + (v.expectedOpportunityValue || 0), 0);

    return {
      date: activeDate,
      visits: todayVisits,
      newCount: newVisits.length,
      followUpCount: followUps.length,
      revenue: totalRevenueForecast
    };
  }, [visits]);

  // 2. Weekly performance calculations (Last 7 days relative to today or latest visit)
  const weeklyReportData = useMemo(() => {
    let referenceDate = new Date();
    if (visits.length > 0) {
      const sortedVisits = [...visits].sort((a, b) => {
        const dateA = normalizeDateToISO(a.timestamp);
        const dateB = normalizeDateToISO(b.timestamp);
        return dateB.localeCompare(dateA);
      });
      const latestTimestamp = sortedVisits[0].timestamp;
      if (latestTimestamp) {
        const norm = normalizeDateToISO(latestTimestamp);
        if (norm) {
          referenceDate = new Date(norm);
        }
      }
    }

    const sevenDaysAgo = new Date(referenceDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekVisits = visits.filter(v => {
      if (!v.timestamp) return false;
      const normDate = normalizeDateToISO(v.timestamp);
      return normDate && new Date(normDate) >= sevenDaysAgo;
    });
    
    // Group by representative
    const repStats: { [name: string]: { total: number, newV: number, followV: number, value: number } } = {};
    weekVisits.forEach(v => {
      if (!repStats[v.repName]) {
        repStats[v.repName] = { total: 0, newV: 0, followV: 0, value: 0 };
      }
      repStats[v.repName].total++;
      if (v.visitType === 'زيارة جديدة') repStats[v.repName].newV++;
      else repStats[v.repName].followV++;
      repStats[v.repName].value += v.expectedOpportunityValue || 0;
    });

    return Object.entries(repStats).map(([repName, stats]) => ({
      repName,
      ...stats
    }));
  }, [visits]);

  // 3. Monthly performance calculations (Current Calendar Month / Latest Month in data)
  const monthlyReportData = useMemo(() => {
    let targetMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    if (visits.length > 0) {
      const sortedVisits = [...visits].sort((a, b) => {
        const dateA = normalizeDateToISO(a.timestamp);
        const dateB = normalizeDateToISO(b.timestamp);
        return dateB.localeCompare(dateA);
      });
      const latestTimestamp = sortedVisits[0].timestamp;
      if (latestTimestamp) {
        const norm = normalizeDateToISO(latestTimestamp);
        if (norm && norm.length >= 7) {
          targetMonth = norm.slice(0, 7);
        }
      }
    }

    const monthVisits = visits.filter(v => v.timestamp && normalizeDateToISO(v.timestamp).startsWith(targetMonth));
    const totalVisits = monthVisits.length;
    
    const newClients = monthVisits.filter(v => v.visitType === 'زيارة جديدة').length;
    const followUps = monthVisits.filter(v => v.visitType === 'زيارة متابعة').length;
    
    const statusCounts = {
      'تم التعاقد': monthVisits.filter(v => v.customerStatus === 'تم التعاقد').length,
      'تفاوض': monthVisits.filter(v => v.customerStatus === 'تفاوض').length,
      'تم إرسال عرض سعر': monthVisits.filter(v => v.customerStatus === 'تم إرسال عرض سعر').length,
    };

    const opportunitySum = monthVisits.reduce((sum, v) => sum + (v.expectedOpportunityValue || 0), 0);

    return {
      monthLabel: formatMonthToArabic(targetMonth),
      totalVisits,
      newClients,
      followUps,
      statusCounts,
      opportunitySum
    };
  }, [visits]);

  // 4b. Performance by Rep Donut Chart Data
  const visitsPerRepData = useMemo(() => {
    const counts: { [name: string]: number } = {};
    visits.forEach(v => {
      if (v.repName) {
        counts[v.repName] = (counts[v.repName] || 0) + 1;
      }
    });

    const colorsList = [
      '#0ea5e9', // Sky
      '#3b82f6', // Blue
      '#6366f1', // Indigo
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#a855f7', // Purple
      '#14b8a6', // Teal
    ];

    const data = Object.entries(counts).map(([name, count], index) => ({
      name,
      value: count,
      color: colorsList[index % colorsList.length]
    }));

    return data.sort((a, b) => b.value - a.value);
  }, [visits]);

  // 4. Bottom context lists and calculations - Top Sales Representatives Ranking (Leaderboard)
  const topSalesReps = useMemo(() => {
    const standings = salesReps.map(rep => {
      const repVisits = visits.filter(v => v.repId === rep.id || v.repName === rep.name);
      const newVisitsCount = repVisits.filter(v => v.visitType === 'زيارة جديدة').length;
      const followUpsCount = repVisits.filter(v => v.visitType === 'زيارة متابعة').length;
      
      // Calculate contracts signed by this rep
      const signedCount = customers.filter(c => c.currentStatus === 'تم التعاقد' && visits.some(v => v.customerName === c.name && (v.repId === rep.id || v.repName === rep.name))).length;
      
      // Calculate total opportunity pipeline value managed by this rep
      const pipelineValue = customers
        .filter(c => c.currentStatus !== 'تم التعاقد' && c.currentStatus !== 'غير مهتم' && visits.some(v => v.customerName === c.name && (v.repId === rep.id || v.repName === rep.name)))
        .reduce((sum, c) => sum + (c.opportunityValue || 0), 0);

      // Total weight/sales score: (signed contracts * 10) + (total visits)
      const performanceScore = (signedCount * 25) + repVisits.length;

      return {
        id: rep.id,
        name: rep.name,
        visitsCount: repVisits.length,
        newVisitsCount,
        followUpsCount,
        signedCount,
        pipelineValue,
        performanceScore
      };
    });

    return standings.sort((a, b) => b.performanceScore - a.performanceScore);
  }, [salesReps, visits, customers]);

  // 5. Follow-Up Effectiveness
  // Measures the conversion of new visits to followups and contracts
  const followUpEffectiveness = useMemo(() => {
    const statsByRep = salesReps.map(rep => {
      const repVisits = visits.filter(v => v.repId === rep.id || v.repName === rep.name);
      const newVisits = repVisits.filter(v => v.visitType === 'زيارة جديدة');
      const followUps = repVisits.filter(v => v.visitType === 'زيارة متابعة');
      
      // Ratio of follow up visits to new visits representing engagement
      const interactionRatio = newVisits.length > 0 
        ? Math.round((followUps.length / newVisits.length) * 100) 
        : 0;
        
      // Overdue follow-up task density for this rep
      const overdueTasks = customers.filter(c => 
        c.currentStatus === 'جاري المتابعة' && 
        c.lastVisitDate &&
        new Date(normalizeDateToISO(c.lastVisitDate)) < new Date('2026-06-10') && // Over 5 days since last visit
        visits.some(v => v.customerName === c.name && (v.repId === rep.id || v.repName === rep.name))
      ).length;

      return {
        name: rep.name,
        newCount: newVisits.length,
        followCount: followUps.length,
        ratio: interactionRatio,
        overdueCount: overdueTasks
      };
    });

    return statsByRep;
  }, [salesReps, visits, customers]);

  // 6. Detailed Conversion Rate report
  const conversionRateStats = useMemo(() => {
    const total = customers.length;
    if (total === 0) return [];

    const groupCount = (status: string) => customers.filter(c => c.currentStatus === status).length;
    const groupSum = (status: string) => customers.filter(c => c.currentStatus === status).reduce((sum, c) => sum + c.opportunityValue, 0);

    const stages = [
      { status: 'عميل محتمل', label: 'عميل محتمل (اتصال بدئي)' },
      { status: 'جاري المتابعة', label: 'متابعة جدية واهتمام' },
      { status: 'تم إرسال عرض سعر', label: 'عروض تسعير مرسلة' },
      { status: 'تفاوض', label: 'مرحلة التفاوض على العقود' },
      { status: 'تم التعاقد', label: 'صفقات مغلقة (عقود ناجحة) 🎉' },
      { status: 'غير مهتم', label: 'مستبعد / غير مستهدف' }
    ];

    return stages.map(st => {
      const count = groupCount(st.status);
      const percentage = Math.round((count / total) * 105) / 1.05; // safe percentage with high-precision decimals
      const roundedPercent = Math.round(percentage);
      const val = groupSum(st.status);
      
      return {
        label: st.label,
        count,
        percentage: roundedPercent,
        val
      };
    });
  }, [customers]);

  // Unique list of monitoring values for filters inside ReportsView
  const uniqueMonitoringEmployees = useMemo(() => Array.from(new Set(monitoringRecords.map(r => r.employeeName).filter(Boolean))), [monitoringRecords]);
  const uniqueMonitoringStatuses = useMemo(() => Array.from(new Set(monitoringRecords.map(r => r.status).filter(Boolean))), [monitoringRecords]);

  // Filtered monitoring records inside ReportsView
  const filteredMonitoringRecords = useMemo(() => {
    return monitoringRecords.filter(rec => {
      const matchesSearch = !mSearchQuery || 
        (rec.customerName || '').toLowerCase().includes(mSearchQuery.toLowerCase()) ||
        (rec.callResult || '').toLowerCase().includes(mSearchQuery.toLowerCase()) ||
        (rec.notes || '').toLowerCase().includes(mSearchQuery.toLowerCase());

      const matchesStatus = mStatusFilter === 'all' || rec.status === mStatusFilter;
      const matchesEmployee = mEmployeeFilter === 'all' || rec.employeeName === mEmployeeFilter;
      const matchesSatisfaction = mSatisfactionFilter === 'all' || String(rec.customerSatisfactionLevel) === mSatisfactionFilter;

      return matchesSearch && matchesStatus && matchesEmployee && matchesSatisfaction;
    });
  }, [monitoringRecords, mSearchQuery, mStatusFilter, mEmployeeFilter, mSatisfactionFilter]);

  // Export monitoring records to CSV / Excel helper inside ReportsView
  const handleExportMonitoringToCSV = (filteredRecs: any[]) => {
    const headers = [
      'اسم العميل',
      'اسم موظف الجودة',
      'نتيجة المكالمة',
      'مستوى الرضى',
      'التصنيف / الحالة',
      'تاريخ المتابعة القادمة',
      'الملاحظات والشكاوى',
      'التوصيات والمتابعة الفنية',
      'تاريخ تسجيل المكالمة'
    ];

    const rows = filteredRecs.map(r => [
      r.customerName || '',
      r.employeeName || '',
      r.callResult || '',
      r.customerSatisfactionLevel || '',
      monitoringStatusMap[r.status] || r.status || '',
      r.nextFollowUpDate || '',
      r.notes || '',
      r.recommendations || '',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : ''
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_المتابعة_والجودة_التفصيلي_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique support values for filters inside ReportsView
  const uniqueSupportEmployees = useMemo(() => Array.from(new Set(supportTasks.map(t => t.assignedEmployeeName).filter(Boolean))), [supportTasks]);
  const uniqueSupportStatuses = useMemo(() => Array.from(new Set(supportTasks.map(t => t.status).filter(Boolean))), [supportTasks]);
  const uniqueSupportPriorities = useMemo(() => Array.from(new Set(supportTasks.map(t => t.priority).filter(Boolean))), [supportTasks]);
  const uniqueSupportTaskTypes = useMemo(() => Array.from(new Set(supportTasks.map(t => t.taskType).filter(Boolean))), [supportTasks]);

  // Filtered support tasks inside ReportsView
  const filteredSupportTasks = useMemo(() => {
    return supportTasks.filter(task => {
      const matchesSearch = !sSearchQuery || 
        (task.customerName || '').toLowerCase().includes(sSearchQuery.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(sSearchQuery.toLowerCase()) ||
        (task.id || '').toLowerCase().includes(sSearchQuery.toLowerCase());

      const matchesStatus = sStatusFilter === 'all' || task.status === sStatusFilter;
      const matchesPriority = sPriorityFilter === 'all' || task.priority === sPriorityFilter;
      const matchesEmployee = sEmployeeFilter === 'all' || task.assignedEmployeeName === sEmployeeFilter;
      const matchesTaskType = sTaskTypeFilter === 'all' || task.taskType === sTaskTypeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesEmployee && matchesTaskType;
    });
  }, [supportTasks, sSearchQuery, sStatusFilter, sPriorityFilter, sEmployeeFilter, sTaskTypeFilter]);

  // Export support tasks to CSV / Excel helper inside ReportsView
  const handleExportSupportToCSV = (filteredTasksList: any[]) => {
    const headers = [
      'رقم المهمة',
      'اسم العميل',
      'نوع المهمة',
      'الأولوية',
      'الحالة',
      'الموظف المسؤول',
      'تاريخ التكليف',
      'تاريخ البدء',
      'تاريخ الإنجاز',
      'تفاصيل المهمة',
      'المنشئ بواسطة'
    ];

    const rows = filteredTasksList.map(t => [
      t.id || '',
      t.customerName || '',
      t.taskType || '',
      t.priority || '',
      t.status || '',
      t.assignedEmployeeName || '',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '',
      t.startedAt ? new Date(t.startedAt).toLocaleDateString('ar-EG') : '',
      t.completedAt ? new Date(t.completedAt).toLocaleDateString('ar-EG') : '',
      t.description || '',
      t.createdBy || ''
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_الدعم_الفني_التفصيلي_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="reports-module-root">
      
      {/* Tab Selectors & Print Trigger */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center text-right" dir="rtl">
        {/* Navigation reports */}
        <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto font-sans">
          <button
            onClick={() => {
              setActiveReport('customer_history');
              if (!selectedCustomerName && customers.length > 0) {
                setSelectedCustomerName(customers[0].name);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
              activeReport === 'customer_history'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-605/10'
                : 'bg-indigo-50/60 border-indigo-100 text-indigo-900 hover:bg-indigo-100'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>تقرير متابعات عميل تفصيلي 🔍</span>
          </button>
          <button
            onClick={() => setActiveReport('custom_filter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
              activeReport === 'custom_filter'
                ? 'bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-600/10'
                : 'bg-teal-50/50 border-teal-100 text-teal-800 hover:bg-teal-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>فلاتر وتقارير مخصصة (تصدير Excel)</span>
          </button>
          <button
            onClick={() => setActiveReport('monitoring_quality')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
              activeReport === 'monitoring_quality'
                ? 'bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-600/10'
                : 'bg-violet-50/50 border-violet-100 text-violet-800 hover:bg-violet-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 animate-pulse" />
            <span>تقرير سجلات المتابعة والجودة 📋</span>
          </button>
          <button
            onClick={() => setActiveReport('technical_support')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
              activeReport === 'technical_support'
                ? 'bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-600/10'
                : 'bg-amber-50/50 border-amber-100 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 animate-bounce" />
            <span>تقرير مهام الدعم الفني 🛠️</span>
          </button>
          <button
            onClick={() => setActiveReport('top_reps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'top_reps'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            الكادر والأفضل أداءً
          </button>
          <button
            onClick={() => setActiveReport('performance_by_rep')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'performance_by_rep'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            أداء وحصة المندوب (Performance by Rep)
          </button>
          <button
            onClick={() => setActiveReport('conversion_rate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'conversion_rate'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            نسب التحويل والمبيعات
          </button>
          <button
            onClick={() => setActiveReport('followup_effectiveness')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'followup_effectiveness'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            فعالية المتابعات
          </button>
          <button
            onClick={() => setActiveReport('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'daily'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            النشاط الميداني اليومي
          </button>
          <button
            onClick={() => setActiveReport('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'weekly'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            الأداء الأسبوعي
          </button>
          <button
            onClick={() => setActiveReport('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'monthly'
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            النظرة التشغيلية الشهرية
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            id="reports-transfer-customers-btn"
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 bg-[#0d9488] hover:bg-teal-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all w-full md:w-auto"
            title="نقل وإسناد عملاء مندوب إلى مندوب آخر"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>نقل عملاء مندوب ⇄</span>
          </button>

          {/* Print report button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer w-full md:w-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة هذا التقرير</span>
          </button>
        </div>
      </div>

      {/* CLOUD DATABASE LIVE DATA INTEGRATION BANNER */}
      <div className="bg-gradient-to-r from-teal-50/70 via-teal-50/45 to-white border border-teal-150/70 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-center gap-4 text-right print:hidden" dir="rtl">
        <div className="flex items-start gap-3 w-full md:w-auto">
          <div className="p-2 bg-teal-500/10 rounded-xl text-teal-600 shrink-0 mt-0.5">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1 font-sans">
            <h4 className="text-xs font-black text-slate-855 flex items-center gap-1.5">
              <span>تقارير مستكشف البيانات السحابي النشط (Cloud Database Reports)</span>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-100">
                مزامنة سحابية حية ونشطة ✅
              </span>
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed font-bold">
              تتم قراءة وتحليل كافة تقارير المبيعات وزيارات المندوبين من قاعدة البيانات السحابية (Firestore) مباشرةً وبشكل حي، مما يضمن دقة وسرعة التقارير والقرارات التخطيطية.
            </p>
          </div>
        </div>
      </div>

      {/* PRINTABLE CONTAINER */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xs text-right space-y-6 print:border-none print:shadow-none" dir="rtl">
        {/* Report Company Header */}
        <div className="border-b border-gray-100 pb-5 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 block font-mono">تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')}</span>
            <span className="text-xs text-gray-400 block font-mono">Select Code CRM Analyst</span>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-slate-900 font-sans">مجموعة <span className="text-[#2563eb]">Select</span> <span className="text-[#0d9488]">Code</span> للحلول البرمجية</h2>
            <p className="text-xs text-gray-500 font-sans mt-0.5">حلول ERP المحاسبية وإدارة نقاط البيع السحابية POS</p>
          </div>
        </div>

        {/* Dynamic Report Content based on selected tab */}
        
        {/* REPORT EXTRA: CUSTOM QUERY & FILTER BUILDER */}
        {activeReport === 'custom_filter' && (
          <div className="space-y-6 animate-fadeIn font-sans" id="custom-reports-view">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-teal-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-teal-600" />
                  <span>الفلترة المتقدمة ومستكشف سجلات العملاء والمناديب</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  قم بفرز وتحليل فئات العملاء وفقاً للمندوب، الحالة، المنتج، أو فترة الزيارة مع إمكانية تصدير البيانات المطابقة بشكل مباشر.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadFilteredExcel}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer self-stretch md:self-auto justify-center"
              >
                <Download className="w-4 h-4" />
                <span>
                  {activeSubTab === 'visits'
                    ? `تصدير الزيارات المصفاة إلى Excel (${filteredVisits.length})`
                    : `تصدير العملاء المصفين إلى Excel (${filteredCustomers.length})`}
                </span>
              </button>
            </div>

            {/* FILTER PANEL GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
              {/* 1. Sales Rep Dropdown */}
              <div className="space-y-1.5 text-right font-sans">
                <label className="text-xs font-bold text-slate-750 block">مستشار المبيعات (المندوب):</label>
                <select
                  value={selectedRep}
                  onChange={(e) => setSelectedRep(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">📁 الكل (جميع المناديب)</option>
                  {salesReps.map(rep => (
                    <option key={rep.id} value={rep.name}>👤 {rep.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Customer Status Dropdown */}
              <div className="space-y-1.5 text-right font-sans">
                <label className="text-xs font-bold text-slate-755 block">حالة العميل الحالية:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">⚡ الكل (جميع الحالات البيعية)</option>
                  <option value="عميل محتمل">عميل محتمل</option>
                  <option value="جاري المتابعة">جاري المتابعة</option>
                  <option value="تم إرسال عرض سعر">تم إرسال عرض سعر</option>
                  <option value="تفاوض">تفاوض</option>
                  <option value="تم التعاقد">تم التعاقد</option>
                  <option value="غير مهتم">غير مهتم</option>
                </select>
              </div>

              {/* 3. Product Dropdown */}
              <div className="space-y-1.5 text-right font-sans">
                <label className="text-xs font-bold text-slate-750 block">المنتج / النشاط المطلوب:</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">⚙️ الكل (جميع المنتجات)</option>
                  <option value="ERP">ERP</option>
                  <option value="POS">POS</option>
                  <option value="غير ذلك">غير ذلك</option>
                </select>
              </div>

              {/* 4. Date Period Options */}
              <div className="space-y-1.5 text-right font-sans">
                <label className="text-xs font-bold text-slate-750 block">فرز بحركة الزيارة (الفترة الزمنية):</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="من"
                      className="w-full text-[11px] font-bold p-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <span className="absolute left-1.5 top-2.5 text-[8px] text-gray-400 pointer-events-none">من</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="إلى"
                      className="w-full text-[11px] font-bold p-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <span className="absolute left-1.5 top-2.5 text-[8px] text-gray-400 pointer-events-none">إلى</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FILTER METRICS PANEL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
              <div className="bg-white border border-slate-100 rounded-2xl p-4 text-right shadow-xs">
                <span className="text-[10px] md:text-sm text-slate-400 font-extrabold block">العملاء المطابقين للفرز</span>
                <span className="text-lg md:text-2xl font-black text-slate-900 font-mono mt-1 block">
                  {filteredCustomers.length} <span className="text-xs font-bold text-slate-500">من أصل {customers.length}</span>
                </span>
              </div>
              <div className="bg-emerald-50/20 border border-emerald-100/60 rounded-2xl p-4 text-right">
                <span className="text-[10px] md:text-sm text-emerald-700 font-extrabold block">العقود المبرمة للنتائج</span>
                <span className="text-lg md:text-2xl font-black text-emerald-800 font-mono mt-1 block">
                  {filteredCustomers.filter(c => c.currentStatus === 'تم التعاقد').length}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/40 rounded-2xl p-4 text-right">
                <span className="text-[10px] md:text-xs text-slate-500 font-extrabold block">الزيارات الميدانية المطابقة للفرز</span>
                <span className="text-lg md:text-2xl font-black text-slate-800 font-mono mt-1 block">
                  {filteredVisits.length} <span className="text-xs font-bold">زيارة</span>
                </span>
              </div>
            </div>

            {/* TAB SELECTOR BETWEEN CUSTOMERS AND VISITS */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 max-w-max mr-auto print:hidden">
              <button
                type="button"
                onClick={() => setActiveSubTab('customers')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === 'customers'
                    ? 'bg-white text-teal-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📁 سجلات العملاء المطابقين ({filteredCustomers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('visits')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === 'visits'
                    ? 'bg-white text-teal-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⏳ سجل الزيارات الميدانية المطابقة ({filteredVisits.length})
              </button>
            </div>

            {/* DETAILED MATCHING DATA TABLE */}
            {activeSubTab === 'customers' ? (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs font-sans">
                <table className="w-full text-right border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-700">
                      <th className="p-3 font-extrabold">العميل / الشركة</th>
                      <th className="p-3 font-extrabold">بيانات الاتصال</th>
                      <th className="p-3 font-extrabold">العنوان</th>
                      <th className="p-3 font-extrabold">مستشار المبيعات (المندوب)</th>
                      <th className="p-3 font-extrabold">المنتج والنشاط المطلوب</th>
                      <th className="p-3 font-extrabold text-center">أول / آخر زيارة</th>
                      <th className="p-3 font-extrabold text-center">حالة العميل الحالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center font-bold text-gray-400">
                          لا توجد أي سجلات عملاء تطابق فلاتر البحث الحالية. جرب تغيير خيارات الفلترة المحددة أعلاه.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const repsList = Array.from(customerRepsMap[c.name.toLowerCase().trim()] || []);
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900">{c.name}</div>
                              <span className="text-[9px] font-mono font-bold text-slate-400 block mt-0.5">{c.id}</span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800">{c.phone || '--'}</div>
                              <span className="text-[10px] text-gray-400 block">{c.contactPerson || '--'}</span>
                            </td>
                            <td className="p-3 font-sans">
                              <div className="font-medium text-slate-700">{c.province || c.address || '--'}</div>
                              {c.latitude && c.longitude && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  rel="noopener noreferrer"
                                  className="text-[8px] text-teal-650 hover:text-teal-850 font-extrabold inline-flex items-center gap-0.5 bg-teal-50 px-1 py-0.5 rounded border border-teal-100/60 mt-0.5"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-teal-600" />
                                  <span>الخريطة 🗺️</span>
                                </a>
                              )}
                            </td>
                            <td className="p-3 font-sans">
                              <div className="flex flex-wrap gap-1">
                                {repsList.length === 0 ? (
                                  <span className="text-xs text-slate-400">--</span>
                                ) : (
                                  repsList.map((rep, rIdx) => (
                                    <span key={rIdx} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-black text-[10px]">
                                      👤 {rep}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-850 truncate max-w-[150px]" title={c.requestedProduct || ''}>{c.requestedProduct || '--'}</div>
                              <span className="text-[9px] text-slate-400 block truncate max-w-[150px]" title={c.activity || ''}>{c.activity || '--'}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="text-[10px] font-mono leading-none font-bold text-slate-500">بداية: {c.firstVisitDate || '--'}</div>
                              <div className="text-[10px] font-mono leading-none font-bold text-indigo-600 mt-1">آخرها: {c.lastVisitDate || '--'}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                c.currentStatus === 'تم التعاقد' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                c.currentStatus === 'جاري المتابعة' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                c.currentStatus === 'غير مهتم' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {c.currentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs font-sans">
                <table className="w-full text-right border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-700">
                      <th className="p-3 font-extrabold">العميل والشركة</th>
                      <th className="p-3 font-extrabold">تاريخ ووقت الزيارة</th>
                      <th className="p-3 font-extrabold">المندوب الميداني</th>
                      <th className="p-3 font-extrabold">نوع الزيارة</th>
                      <th className="p-3 font-extrabold">حالة العميل بالزيارة</th>
                      <th className="p-3 font-extrabold text-center">القيمة المتوقعة</th>
                      <th className="p-3 font-extrabold">خلاصة الزيارة والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                    {filteredVisits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center font-bold text-gray-400">
                          لا توجد أي زيارات ميدانية تطابق فلاتر البحث المحددة في هذه الفترة.
                        </td>
                      </tr>
                    ) : (
                      filteredVisits.map((v) => {
                        const notes = v.visitType === 'زيارة متابعة' ? v.followUpNotes : v.summary;
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900">{v.customerName}</div>
                              {v.latitude && v.longitude && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  rel="noopener noreferrer"
                                  className="text-[8px] text-teal-650 hover:text-teal-850 font-extrabold inline-flex items-center gap-0.5 bg-teal-50 px-1 py-0.5 rounded border border-teal-100/60 mt-0.5"
                                >
                                  <MapPin className="w-2.5 h-2.5 text-teal-600" />
                                  <span>موقع الزيارة 🗺️</span>
                                </a>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-550">
                              {v.timestamp}
                            </td>
                            <td className="p-3 font-bold text-slate-800">
                              👤 {v.repName}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                v.visitType === 'زيارة جديدة'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {v.visitType}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-750">{v.customerStatus || '--'}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-teal-700">
                              {v.expectedOpportunityValue || 0} د.أ
                            </td>
                            <td className="p-3 max-w-[250px] truncate leading-normal text-slate-500 text-xs" title={notes || ''}>
                              {notes || '--'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORT A: TOP SALES REPS STANDINGS */}
        {activeReport === 'top_reps' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-100 pb-2">
              <h3 className="text-base font-bold text-blue-800 font-sans">تقرير قياس أداء وترتيب مستشاري المبيعات</h3>
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              يُحتسب رصيد المعاملات والأداء التنافسي بالأوزان القياسية لشركة Select Code (25 نقطة لكل عقد مبرم + 1 نقطة لكل زيارة ميدانية ومتابعة مكتملة).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-700">
                    <th className="p-3 font-bold">الترتيب</th>
                    <th className="p-3 font-bold">مستشار المبيعات</th>
                    <th className="p-3 font-bold text-center">إجمالي الزيارات</th>
                    <th className="p-3 font-bold text-center">زيارات جديدة</th>
                    <th className="p-3 font-bold text-center">زيارات متابعة</th>
                    <th className="p-3 font-bold text-center text-emerald-700">العقود المبرمة</th>
                    <th className="p-3 font-bold text-center">مجموع النقاط والتقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {topSalesReps.map((rep, index) => (
                    <tr key={rep.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold font-mono">
                        {index === 0 ? '🥇 الأول' : index === 1 ? '🥈 الثاني' : index === 2 ? '🥉 الثالث' : `${index + 1}`}
                      </td>
                      <td className="p-3 font-bold text-gray-900">{rep.name}</td>
                      <td className="p-3 text-center font-mono">{rep.visitsCount}</td>
                      <td className="p-3 text-center font-mono">{rep.newVisitsCount}</td>
                      <td className="p-3 text-center font-mono">{rep.followUpsCount}</td>
                      <td className="p-3 text-center font-bold text-emerald-600 font-mono">{rep.signedCount}</td>
                      <td className="p-3 text-center font-bold text-slate-800 font-mono">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs">{rep.performanceScore} نقطة</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT Extra: PERFORMANCE BY REP DONUT SUMMARY SECTION */}
        {activeReport === 'performance_by_rep' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-100 pb-2">
              <h3 className="text-base font-bold text-blue-800 font-sans">توزيع وحصص الزيارات الميدانية لكل مستشار مبيعات (Performance by Rep)</h3>
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-sans text-right">
              يوضح هذا التقرير الحصة النسبية وحجم الحركة الميدانية والزيارات المسجلة بواسطة كل مستشار مبيعات. يساعد ذلك على تقييم مدى تغطية السوق وتوزيع المهام بشكل متكافئ.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50/40 p-6 rounded-3xl border border-slate-100/60 mt-4">
              {/* Pie/Donut Chart Container */}
              <div className="lg:col-span-6 h-64 w-full relative">
                {visitsPerRepData.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs font-sans">لا توجد بيانات حركة كافية حالياً لرسم المخطط الدائري.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={visitsPerRepData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {visitsPerRepData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '12px', border: '1px solid #e2e8f0', fontFamily: 'system-ui' }}
                          formatter={(value, name) => [`${value} زيارة عمل`, `الاسم: ${name}`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] text-slate-400 font-medium block">مجموع الزيارات</span>
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {visitsPerRepData.reduce((sum, d) => sum + d.value, 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Detailed Legend table / listings */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-xs">
                  <span className="text-xs font-bold text-slate-900 block mb-3 border-b border-slate-50 pb-1.5">مؤشرات الحصص والنسب المئوية بالتفصيل</span>
                  {visitsPerRepData.length === 0 ? (
                    <div className="text-gray-400 text-xs text-center py-4 font-sans">لا توجد سجلات.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {visitsPerRepData.map((item, idx) => {
                        const totalAll = visitsPerRepData.reduce((sum, d) => sum + d.value, 0);
                        const percent = totalAll > 0 ? ((item.value / totalAll) * 100).toFixed(1) : '0';
                        return (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-dashed border-slate-100 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-mono text-xs font-semibold">({percent}%)</span>
                              <span className="font-bold text-teal-700 font-mono text-xs">{item.value} زيارات</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-700 font-bold text-xs">{item.name}</span>
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT B: CONVERSION RATE DETAILS */}
        {activeReport === 'conversion_rate' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-100 pb-2">
              <h3 className="text-base font-bold text-blue-800 font-sans">تفكيك مصفوفة نسب التحويل للمبيعات (Sales conversion Matrix)</h3>
              <Percent className="w-5 h-5 text-blue-600" />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              تحليل خط سير ومراحل الفوائد البيعية من أول تواصل تعريفي (عميل محتمل) ومروراً بالمتابعات اللاحقة والعروض المالية وحتى التوقيع والسداد النهائي.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Table stats */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-gray-700">
                      <th className="p-2.5 font-bold">المرحلة والوضع البيعي</th>
                      <th className="p-2.5 text-center font-bold">عدد الزبائن</th>
                      <th className="p-2.5 text-center font-bold">النسبة المئوية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    {conversionRateStats.map((st, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2.5 font-semibold text-gray-900">{st.label}</td>
                        <td className="p-2.5 text-center font-mono">{st.count}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-blue-700">{st.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Graphic visual bar summary */}
              <div className="border border-gray-100 p-5 rounded-2xl bg-slate-50/50 space-y-4 font-sans">
                <h4 className="text-xs font-bold text-slate-800">التوزيع النسبي للمراحل البيعية</h4>
                <div className="space-y-3">
                  {conversionRateStats.map((st, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span className="font-mono font-bold text-blue-800">{st.percentage}%</span>
                        <span>{st.label.split(' ')[0]}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${st.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT C: FOLLOW-UP EFFECTIVENESS */}
        {activeReport === 'followup_effectiveness' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-105 pb-2">
              <h3 className="text-base font-bold text-blue-805 font-sans">دراسة فعالية المتابعات وجدية التواصل الميداني</h3>
              <Target className="w-5 h-5 text-blue-600" />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              احصاءات تقيس وعي المندوب بأهمية المعاودة للمتابعة: نسبة المتابعات من إجمالي الزيارات الجديدة (كلما ارتفعت النسبة، زاد تكرار التواصل مع العملاء لتحريك الصفقات)، وعدد المهام المتأخرة غير المحسومة.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-700">
                    <th className="p-3 font-bold">مستشار المبيعات</th>
                    <th className="p-3 text-center font-bold">الزيارات الجديدة</th>
                    <th className="p-3 text-center font-bold">المتابعات المنجزة</th>
                    <th className="p-3 text-center font-bold text-indigo-700">معدل تكرار التواصل</th>
                    <th className="p-3 text-center font-bold text-rose-600">المتابعات المتأخرة (المهمشة)</th>
                    <th className="p-3 text-left font-bold">مستوى الفعالية والالتزام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {followUpEffectiveness.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{item.name}</td>
                      <td className="p-3 text-center font-mono">{item.newCount}</td>
                      <td className="p-3 text-center font-mono">{item.followCount}</td>
                      <td className="p-3 text-center font-semibold text-indigo-650 font-mono">{item.ratio}%</td>
                      <td className="p-3 text-center font-bold text-rose-600 font-mono">{item.overdueCount}</td>
                      <td className="p-3 text-left">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.ratio >= 80 ? 'bg-emerald-50 text-emerald-800' : 
                          item.ratio >= 40 ? 'bg-amber-100 text-amber-800' : 
                          'bg-rose-50 text-rose-800'
                        }`}>
                          {item.ratio >= 80 ? 'فعالية استثنائية (ممتاز)' : 
                           item.ratio >= 40 ? 'اهتمام متوسط' : 
                           'يحتاج توجيه ومتابعة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT D: DAILY SALES ACTIVITY TABLE */}
        {activeReport === 'daily' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-105 pb-2">
              <h3 className="text-base font-bold text-blue-805 font-sans">النشاط الميداني اليومي للمبيعات</h3>
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>

            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              جدول لحركة الزيارات الميدانية التي تم أرشفتها بنجاح اليوم <b>({dailyReportData.date})</b> من قبل كادر مستشاري المبيعات لشركة المحاسبة والـ ERP.
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div className="border bg-slate-50/40 p-4 rounded-xl text-center">
                <span className="text-xs text-gray-400 font-bold block">إجمالي الحركة اليومية</span>
                <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">{dailyReportData.visits.length} زيارات</span>
              </div>
              <div className="border bg-slate-50/40 p-4 rounded-xl text-center">
                <span className="text-xs text-gray-400 font-bold block">عقد عملاء جدد</span>
                <span className="text-xl font-bold text-blue-700 font-mono mt-1 block">{dailyReportData.newCount} زيارات أولى</span>
              </div>
              <div className="border bg-slate-50/40 p-4 rounded-xl text-center">
                <span className="text-xs text-gray-400 font-bold block">متابعات لصفقات سابقة</span>
                <span className="text-xl font-bold text-indigo-700 font-mono mt-1 block">{dailyReportData.followUpCount} زيارات</span>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-700">
                    <th className="p-2.5 font-bold">اسم العميل</th>
                    <th className="p-2.5 font-bold">المندوب</th>
                    <th className="p-2.5 font-bold">نوع الزيارة</th>
                    <th className="p-2.5 font-bold">تفاصيل / خلاصة الحركة</th>
                    <th className="p-2.5 text-center font-bold">الوضعية البيعية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {dailyReportData.visits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400 text-xs">
                        لا توجد زيارات مسجلة لهذا التاريخ بعد في قاعدة البيانات.
                      </td>
                    </tr>
                  ) : (
                    dailyReportData.visits.map((v, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2.5 text-gray-900">
                          <div className="font-extrabold">{v.customerName}</div>
                          {v.latitude && v.longitude && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer"
                              className="text-[10px] text-teal-650 hover:text-teal-800 font-bold inline-flex items-center gap-0.5 mt-0.5 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100/60"
                            >
                              <MapPin className="w-2.5 h-2.5 text-teal-600" />
                              <span>موقع جوجل ماب 🗺️</span>
                            </a>
                          )}
                        </td>
                        <td className="p-2.5">{v.repName}</td>
                        <td className="p-2.5 font-semibold text-blue-800">{v.visitType}</td>
                        <td className="p-2.5 text-xs max-w-xs truncate leading-normal text-gray-500">
                          {v.visitType === 'زيارة المتابعة' ? v.followUpNotes : v.summary}
                        </td>
                        <td className="p-2.5 text-center font-medium text-xs">{v.customerStatus}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT E: WEEKLY SUMMARY */}
        {activeReport === 'weekly' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-100 pb-2">
              <h3 className="text-base font-bold text-blue-800 font-sans">تقرير حركة الأداء الأسبوعي للمببيعات</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>

            <p className="text-xs text-gray-500 font-sans">
              سجل نشاط الأسبوع الماضي (مستحقة منذ 2026-06-08) يبرز مساهمة كادر مستشاري المبيعات في تجميع وحصد الزيارات والعملاء الجدد.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-gray-700 font-sans">
                    <th className="p-3 font-bold">اسم المندوب المتابع</th>
                    <th className="p-3 text-center font-bold">الزيارات الأسبوعية</th>
                    <th className="p-3 text-center font-bold">عملاء جدد</th>
                    <th className="p-3 text-center font-bold">متابعات مستعلمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {weeklyReportData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-400">لا يوجد زيارات في الأسبوع الماضي.</td>
                    </tr>
                  ) : (
                    weeklyReportData.map((item, id) => (
                      <tr key={id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-bold text-gray-900">{item.repName}</td>
                        <td className="p-3 text-center font-mono">{item.total}</td>
                        <td className="p-3 text-center font-mono">{item.newV}</td>
                        <td className="p-3 text-center font-mono">{item.followV}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT F: MONTHLY BUSINESS FORECAST LIMITS */}
        {activeReport === 'monthly' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-2.5 items-center justify-end border-b border-blue-100 pb-2">
              <h3 className="text-base font-bold text-blue-800 font-sans">النظرة التشغيلية والمبيعات الشهرية لشهر {monthlyReportData.monthLabel}</h3>
              <BarChart4 className="w-5 h-5 text-blue-600" />
            </div>

            <p className="text-xs text-gray-500 font-sans leading-normal">
              إحصاء مالي وميداني شامل لشهر {monthlyReportData.monthLabel} لمساعدة مجلس إدارة شركة البرمجة على تقييم فترات سداد العملاء وحجم الطلب على تراخيص البرمجيات.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-100 p-5 rounded-2xl bg-slate-50/30 space-y-3 font-sans">
                <h4 className="text-sm font-bold text-slate-800">نشاط الحركة التشغيلية</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold">{monthlyReportData.totalVisits} زيارات</span>
                    <span>إجمالي زيارات شهر {monthlyReportData.monthLabel} الميدانية</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-blue-700">{monthlyReportData.newClients}</span>
                    <span>العملاء الجدد الذين تم تصفيتهم</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-indigo-700">{monthlyReportData.followUps}</span>
                    <span>زيارات المتابعة المكثفة</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 p-5 rounded-2xl bg-slate-50/30 space-y-3 font-sans">
                <h4 className="text-sm font-bold text-slate-800">الفرص المحققة والمرحلة الحالية</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-emerald-600">+{monthlyReportData.statusCounts['تم التعاقد']} صفقات</span>
                    <span>عقود مبرمة ومدفوعة الدفعة الأولى</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-blue-600">{monthlyReportData.statusCounts['تفاوض']} عملاء</span>
                    <span>عملاء قيد التفاوض النهائي</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-indigo-600">{monthlyReportData.statusCounts['تم إرسال عرض سعر']} عروض</span>
                    <span>عروض فنية ومالية مرسلة</span>
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}

        {/* REPORT G: CUSTOMER SELECTION AND THEIR FULL TEXTUAL REPORT & HISTORY */}
        {activeReport === 'customer_history' && (() => {
          const selectedCust = customers.find(c => c.name === selectedCustomerName) || null;
          const custVisits = visits.filter(v => v.customerName && v.customerName.toLowerCase().trim() === selectedCustomerName.toLowerCase().trim())
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          const textReport = [
            `📋 تقرير العميل التفصيلي الشامل: ${selectedCust?.name || '--'}`,
            `==================================================`,
            `🆔 معرف كود العميل: ${selectedCust?.id || '--'}`,
            `💼 مجال النشاط التجاري: ${selectedCust?.activity || '--'}`,
            `🏷️ المنتج المطلـوب: ${selectedCust?.requestedProduct || '--'}`,
            `👤 مسؤول التواصل والاتصال: ${selectedCust?.contactPerson || '--'}`,
            `📞 رقم هاتف العميل: ${selectedCust?.phone || '--'}`,
            `💬 رقم الواتس اب: ${selectedCust?.whatsapp || selectedCust?.phone || '--'}`,
            `📨 البريد الإلكتروني: ${selectedCust?.email || '--'}`,
            `📍 المنطقة والمحافظة: ${selectedCust?.province || '--'}`,
            `🧭 العنوان التفصيلي للمنشأة: ${selectedCust?.address || '--'}`,
            `📈 الحالة البيعية الحالية: ${selectedCust?.currentStatus || '--'}`,
            `💰 القيمة الإجمالية المقدرة: ${selectedCust?.opportunityValue || 0} د.أ`,
            `📅 تاريخ أول تواصل ميداني: ${selectedCust?.firstVisitDate || '--'}`,
            `📅 تاريخ آخر معاودة ومتابعة: ${selectedCust?.lastVisitDate || '--'}`,
            `📊 إجمالي عدد الزيارات والمتابعات: ${selectedCust?.visitsCount || 0} زيارات`,
            `==================================================`,
            `\n📝 حركات وسجلات المتابعة والزيارات (مرتبة تاريخياً):`,
            `--------------------------------------------------`,
            custVisits.length === 0
              ? 'لا توجد حركات أو متابعات مسجلة في قاعدة البيانات لهذا العميل بعد.'
              : custVisits.map((v, index) => {
                  const detailRows = v.visitType === 'زيارة متابعة'
                    ? [
                        `   ◽ ملاحظات ومحضر المتابعة: ${v.followUpNotes || v.followUpResult || '--'}`,
                        `   ◽ نتائج المتابعة ومخرجاتها: ${v.followUpResult || '--'}`,
                        `   ◽ الخطوة القادمة المطلوبة: ${v.nextStep || 'لا يوجد'}`,
                        v.nextFollowUpDate ? `   ◽ موعد المعاودة القادم: ${v.nextFollowUpDate}` : '',
                        `   ◽ قيمة الفرصة المتوقعة: ${v.expectedOpportunityValue || 0} د.أ`,
                        v.latitude ? `   ◽ إحداثيات الموقع (GPS): https://www.google.com/maps?q=${v.latitude},${v.longitude}` : ''
                      ].filter(Boolean).join('\n')
                    : [
                        `   ◽ ملخص وتفاصيل الزيارة الميدانية الأولى: ${v.summary || '--'}`,
                        `   ◽ احتياجات العميل المحددة: ${v.needs || '--'}`,
                        `   ◽ مستوى الرغبة والاهتمام: ${v.interestLevel || '--'}`,
                        `   ◽ مسؤول الاتصال في الزيارة: ${v.contactPerson || '--'} (${v.jobTitle || '--'})`,
                        `   ◽ هاتف الزيارة: ${v.phone || '--'} | واتساب: ${v.whatsapp || '--'}`,
                        `   ◽ المحافظة والعنوان: ${v.province || '--'} ${v.address ? `- ${v.address}` : ''}`,
                        `   ◽ قيمة الفرصة المتوقعة: ${v.expectedOpportunityValue || 0} د.أ`,
                        v.latitude ? `   ◽ إحداثيات الموقع (GPS): https://www.google.com/maps?q=${v.latitude},${v.longitude}` : ''
                      ].filter(Boolean).join('\n');

                  return [
                    `📊 [حركة رقم ${index + 1}] | التاريخ: ${v.timestamp || '--'}`,
                    `   ◽ نوع الحركة: ${v.visitType}`,
                    `   ◽ المندوب الميداني المسؤول: ${v.repName || '--'} (معرف: ${v.repId || '--'})`,
                    `   ◽ الحالة البيعية حيال الحركة: ${v.customerStatus || '--'}`,
                    detailRows,
                    `--------------------------------------------------`
                  ].filter(Boolean).join('\n');
                }).join('\n')
          ].join('\n');

          const matchingCustomers = customers.filter(c => {
            if (!customerSearchQuery) return true;
            const query = customerSearchQuery.toLowerCase().trim();
            return (
              c.name.toLowerCase().includes(query) ||
              c.phone.includes(query) ||
              (c.id && c.id.toLowerCase().includes(query))
            );
          });

          return (
            <div className="space-y-6 animate-fadeIn font-sans" id="customer-history-section">
              <div className="flex gap-2.5 items-center justify-end border-b border-indigo-100 pb-2">
                <h3 className="text-base font-bold text-indigo-800 font-sans">مستكشف التقارير التفصيلية لحركات ومتابعات العميل الواحد</h3>
                <Search className="w-5 h-5 text-indigo-600" />
              </div>

              <p className="text-xs text-gray-500 leading-relaxed font-bold">
                اختر عميلاً لعرض وإنتاج تقرير نصي شامل يحتوي على كافة الحوارات والزيارات والملاحظات المدونة من قبل المناديب مع إمكانية مشاركة وثيقة النص لتواصل سريع ومتابعة فعالة.
              </p>

              {/* Selection pane */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                {/* Right col: Search and Customer list */}
                <div className="md:col-span-1 space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-col h-[520px]">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700">🔍 ابحث في العملاء:</label>
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="اكتب اسم العميل، هاتفه أو كوده..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-indigo-100 pr-1 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block pb-1">العملاء المتاحين ({matchingCustomers.length})</span>
                    {matchingCustomers.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6 font-bold">لا يوجد نتائج عملاء مطابقة لبحثك</p>
                    ) : (
                      matchingCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomerName(c.name);
                            setCopySuccess(false);
                          }}
                          className={`w-full text-right p-2.5 rounded-xl text-xs transition-all border flex flex-col gap-1 cursor-pointer ${
                            selectedCustomerName === c.name
                              ? 'bg-indigo-600 border-indigo-600 text-white font-black'
                              : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <div className="flex justify-between items-center w-full text-[9px] opacity-85 gap-1.5 mt-0.5">
                            <span className="truncate">👤 {c.contactPerson || '--'}</span>
                            <span>📱 {c.phone || '--'}</span>
                          </div>
                          <div className="flex justify-between items-center w-full text-[9px] mt-1">
                            <span className="text-[8px] font-mono text-slate-400">#{c.id}</span>
                            <span className={`px-1.5 py-0.5 rounded-md font-black ${
                              selectedCustomerName === c.name ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>{c.currentStatus}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Left col: Display dossier & textual layout */}
                <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                  {selectedCust ? (
                    <>
                      {/* Detailed Customer Card - Highly functional, clean, and explicit */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 text-right font-sans" dir="rtl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-slate-900">{selectedCust.name}</h4>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                الكود التعريفي للعميل: <b className="text-slate-600">{selectedCust.id}</b>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] px-3 py-1.5 rounded-full font-black border ${
                              selectedCust.currentStatus === 'تم التعاقد' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              selectedCust.currentStatus === 'جاري المتابعة' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              selectedCust.currentStatus === 'غير مهتم' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                              'bg-indigo-50 text-indigo-705 border-indigo-200'
                            }`}>
                              ● {selectedCust.currentStatus}
                            </span>
                          </div>
                        </div>

                        {/* Customer Info Grid - Clean visual presentation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          
                          {/* 👤 Contact Person */}
                          <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-2xl">
                            <span className="text-[10px] text-amber-800 font-extrabold block mb-1">👤 اسم مسؤول الاتصال:</span>
                            <span className="text-xs font-black text-slate-800">{selectedCust.contactPerson || 'غير مسجل'}</span>
                          </div>

                          {/* 📞 Phone */}
                          <div className="p-3 bg-teal-50/30 border border-teal-100 rounded-2xl flex flex-col justify-between gap-1.5">
                            <div>
                              <span className="text-[10px] text-teal-850 font-extrabold block mb-1">📞 رقم هاتف العميل الرئيسي:</span>
                              <span className="text-xs font-black text-slate-800 font-mono block select-all">{selectedCust.phone || 'غير مسجل'}</span>
                            </div>
                            {selectedCust.phone && (
                              <a
                                href={`tel:${selectedCust.phone}`}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black transition-all max-w-max shrink-0 shadow-2xs cursor-pointer"
                              >
                                <Phone className="w-3 h-3" />
                                <span>اتصال هاتفي</span>
                              </a>
                            )}
                          </div>

                          {/* 💬 WhatsApp */}
                          <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex flex-col justify-between gap-1.5">
                            <div>
                              <span className="text-[10px] text-emerald-850 font-extrabold block mb-1">💬 رقم الواتساب المباشر:</span>
                              <span className="text-xs font-black text-slate-800 font-mono block select-all">{selectedCust.whatsapp || selectedCust.phone || 'غير مسجل'}</span>
                            </div>
                            {(selectedCust.whatsapp || selectedCust.phone) && (
                              <a
                                href={`https://wa.me/${(selectedCust.whatsapp || selectedCust.phone).replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all max-w-max shrink-0 shadow-2xs cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>مراسلة واتساب</span>
                              </a>
                            )}
                          </div>

                          {/* 💼 Activity */}
                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">💼 النشاط والمهنة:</span>
                            <span className="text-xs font-black text-slate-800">{selectedCust.activity || '--'}</span>
                          </div>

                          {/* 🏷️ Requested Product */}
                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">🏷️ المنتج المطلوب من CRM:</span>
                            <span className="text-xs font-black text-slate-800">{selectedCust.requestedProduct || 'POS'}</span>
                          </div>

                          {/* 📨 Email */}
                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl truncate">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">📨 البريد الإلكتروني:</span>
                            <span className="text-xs font-extrabold text-slate-800 block truncate" title={selectedCust.email}>{selectedCust.email || 'لا يوجد بريد'}</span>
                          </div>

                          {/* 📍 Address / Region */}
                          <div className={`p-3 rounded-2xl sm:col-span-2 flex flex-col justify-between gap-2 transition-all ${
                            (selectedCust.latitude || selectedCust.longitude)
                              ? 'bg-sky-50/50 border border-sky-200/80 hover:bg-sky-50'
                              : 'bg-slate-50 border border-slate-150'
                          }`}>
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold block mb-1">📍 المنطقة المحافظة والعنوان التفصيلي:</span>
                              <span className="text-xs font-black text-slate-800">
                                {selectedCust.province || '--'} {selectedCust.address ? ` - ${selectedCust.address}` : ''}
                              </span>
                            </div>
                            {(selectedCust.latitude || selectedCust.longitude) ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-100/70 pt-2 mt-1">
                                <span className="text-[10px] text-sky-700 font-mono font-bold">
                                  🚩 GPS: {selectedCust.latitude || '--'}, {selectedCust.longitude || '--'}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${selectedCust.latitude},${selectedCust.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-black transition-all shadow-3xs cursor-pointer leading-none"
                                >
                                  <MapPin className="w-3 h-3 text-white" />
                                  <span>خرائط جوجل 🗺️</span>
                                </a>
                              </div>
                            ) : null}
                          </div>

                          {/* 💰 Value & Count */}
                          <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">💰 القيمة الإجمالية المقدرة:</span>
                            <span className="text-xs font-black text-indigo-700">{selectedCust.opportunityValue || 0} د.أ</span>
                          </div>

                          {/* Chrono details block */}
                          <div className="col-span-1 sm:col-span-2 md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/50 p-3 rounded-2xl border border-dashed border-slate-200">
                            <div>
                              <span className="text-[9px] text-slate-400 block">📅 أول تواصل ميداني</span>
                              <span className="text-xs font-black text-slate-700">{selectedCust.firstVisitDate || '--'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block">📅 تاريخ آخر متابعة</span>
                              <span className="text-xs font-black text-slate-700">{selectedCust.lastVisitDate || '--'}</span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-[9px] text-slate-400 block">📊 إجمالي حركات العميل</span>
                              <span className="text-xs font-black text-teal-700">{selectedCust.visitsCount || 0} زيارات</span>
                            </div>
                          </div>

                          {/* GPS view */}
                          {(selectedCust.latitude || selectedCust.longitude) && (
                            <div className="col-span-1 sm:col-span-2 md:col-span-3 p-2 bg-indigo-50/30 border border-indigo-100 rounded-xl flex items-center justify-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="text-[11px] font-bold text-slate-700">تتوفر إحداثيات GPS مقر العميل:</span>
                              <a
                                href={`https://www.google.com/maps?q=${selectedCust.latitude},${selectedCust.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-black text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <span>عرض على الخريطة 🗺️</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Rapid Text copy section with the complete text format requested */}
                      <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 flex-1 flex flex-col font-mono text-xs relative shadow-inner">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-3">
                          <span className="text-[10px] font-black text-slate-400">📄 الصيغة النصية الشاملة للعميل (جاهزة للنسخ والمشاركة للواتساب)</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(textReport);
                              setCopySuccess(true);
                              setTimeout(() => setCopySuccess(false), 2500);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              copySuccess 
                                ? 'bg-emerald-600 text-white border border-emerald-500' 
                                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            <span>{copySuccess ? 'تم النسخ بنجاح! ✓' : 'نسخ النص الكامل 📋'}</span>
                          </button>
                        </div>

                        <pre className="whitespace-pre-wrap font-mono text-right overflow-y-auto leading-relaxed flex-1 max-h-[175px] text-indigo-100 text-[11px] pr-2 scrollbar-thin scrollbar-thumb-slate-700" dir="rtl">
                          {textReport}
                        </pre>
                      </div>

                      {/* Visual Actions Timeline */}
                      <div className="space-y-4 font-sans text-right" dir="rtl">
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-xs font-black text-slate-850">📊 المتابعات الميدانية والزيارات المدونة مسبقاً ({custVisits.length} حركات مسجلة):</span>
                          <span className="text-[10px] font-bold bg-indigo-100/60 text-indigo-800 px-2.5 py-0.5 rounded-md">مرتبة من الأقدم إلى الأحدث ⏳</span>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                          {custVisits.length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 border border-dashed rounded-3xl text-slate-400 text-xs">لا توجد تفاصيل حركات مدونة مسبقاً لهذا العميل.</div>
                          ) : (
                            custVisits.map((v, vIdx) => {
                              const isNewVisit = v.visitType === 'زيارة جديدة';
                              return (
                                <div key={v.id || vIdx} className={`p-4 border rounded-2xl bg-white shadow-xs space-y-3 hover:shadow-md transition-all ${
                                  isNewVisit ? 'border-emerald-100/80 hover:border-emerald-200 bg-emerald-50/5' : 'border-indigo-100/80 hover:border-indigo-200 bg-indigo-50/5'
                                }`}>
                                  
                                  {/* Item Header */}
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-150/40 pb-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2.5 h-2.5 rounded-full ${isNewVisit ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
                                      <span className="font-extrabold text-slate-900 text-xs">
                                        الحركة #{vIdx + 1} • <b className={isNewVisit ? 'text-emerald-700' : 'text-indigo-700'}>{v.visitType}</b>
                                      </span>
                                      <span className="text-[9px] font-mono bg-slate-100 border text-slate-500 px-1.5 py-0.5 rounded">
                                        معرف الحركة: {v.id}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border px-2 py-0.5 rounded-lg flex items-center gap-1 self-stretch sm:self-auto justify-center">
                                      📅 {v.timestamp}
                                    </span>
                                  </div>

                                  {/* Detailed stats grids */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-100/60 p-2.5 rounded-xl border border-slate-150/40">
                                    <div>
                                      <span className="text-[9px] text-slate-400 block">👤 مندوب الحركة</span>
                                      <span className="font-black text-slate-800">{v.repName || 'غير محدد'}</span>
                                      <span className="text-[9px] text-slate-400 block font-mono">({v.repId || 'REP-CUSTOM'})</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-400 block">📈 حالة العميل الحين</span>
                                      <span className="font-extrabold text-indigo-700">{v.customerStatus || 'غير محدد'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-400 block">💰 قيمة الفرصة المتوقعة</span>
                                      <span className="font-black text-emerald-700 font-mono">{v.expectedOpportunityValue || 0} د.أ</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-400 block">🧭 مصدر الزيارة</span>
                                      <span className="font-bold text-slate-700">{v.visitSource || 'زيارة ميدانية'}</span>
                                    </div>
                                  </div>

                                  {/* Visit Specific Data */}
                                  <div>
                                    {isNewVisit ? (
                                      <div className="space-y-2 bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/30 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-b border-dashed border-emerald-100/50 pb-2 mb-2">
                                          <div>
                                            <span className="text-slate-500">👤 مسؤول تواصل الحركة: </span>
                                            <span className="font-black text-slate-800">{v.contactPerson || 'لا يوجد'}</span>
                                            {v.jobTitle ? <span className="text-slate-400"> ({v.jobTitle})</span> : null}
                                          </div>
                                          <div>
                                            <span className="text-slate-500">🏷️ منتج ومجال: </span>
                                            <span className="font-bold text-slate-800">{v.requestedProduct || 'POS'}</span>
                                            {v.activityType ? <span className="text-slate-400"> - النشاط: {v.activityType}</span> : null}
                                          </div>
                                          {(v.phone || v.whatsapp) && (
                                            <div className="col-span-1 sm:col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                              <span className="text-slate-500">📞 الهاتف والواتساب بالزيارة:</span>
                                              <span className="font-bold font-mono text-slate-800 select-all">{v.phone || '--'}</span>
                                              {v.whatsapp && (
                                                <span className="text-emerald-750 font-bold font-mono bg-emerald-100/40 px-1.5 py-0.5 rounded"> (واتساب: {v.whatsapp})</span>
                                              )}
                                            </div>
                                          )}
                                          {(v.province || v.address) && (
                                            <div className="col-span-1 sm:col-span-2">
                                              <span className="text-slate-500">📍 عنوان الزيارة:</span>
                                              <span className="text-slate-700 font-medium"> {v.province || ''} {v.address ? ` - ${v.address}` : ''}</span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="space-y-1">
                                          <span className="text-[10px] text-emerald-800 font-extrabold flex items-center gap-1">💬 ملخص وتفاصيل الزيارة الميدانية الأولى:</span>
                                          <p className="bg-white p-2.5 rounded-lg border border-emerald-100/40 text-slate-850 leading-relaxed text-[11px] font-sans font-medium whitespace-pre-line text-right">
                                            {v.summary || 'لم يدون ملخص'}
                                          </p>
                                        </div>

                                        {v.needs && (
                                          <div className="space-y-1 mt-2">
                                            <span className="text-[10px] text-emerald-805 font-extrabold flex items-center gap-1">⚙️ الاحتياجات الفنية المطلوبة:</span>
                                            <p className="bg-white p-2.5 rounded-lg border border-emerald-100/40 text-slate-850 text-[11px] font-medium text-right font-sans leading-relaxed">
                                              {v.needs}
                                            </p>
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                                          <span className="text-slate-400 font-bold">⭐ مستوى رغبة العميل واهتمامه:</span>
                                          <span className={`px-2 py-0.5 rounded font-black ${
                                            v.interestLevel === 'مرتفع' ? 'bg-emerald-100 text-emerald-800' :
                                            v.interestLevel === 'منخفض' ? 'bg-red-50 text-red-700' : 'bg-amber-100 text-amber-800'
                                          }`}>{v.interestLevel || 'متوسط'}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2 bg-indigo-50/20 p-3 rounded-xl border border-indigo-100/30 text-xs">
                                        <div className="space-y-1">
                                          <span className="text-[10px] text-indigo-805 font-extrabold flex items-center gap-1">📝 ملاحظات ومحضر زيارة المتابعة المعنية:</span>
                                          <p className="bg-white p-2.5 rounded-lg border border-indigo-100/40 text-slate-850 leading-relaxed text-[11px] font-sans font-medium whitespace-pre-line text-right">
                                            {v.followUpNotes || 'لم تدون ملاحظات متابعة'}
                                          </p>
                                        </div>

                                        {v.followUpResult && (
                                          <div className="space-y-1 mt-2">
                                            <span className="text-[10px] text-indigo-805 font-extrabold flex items-center gap-1">🏁 نتائج ومخرجات التواصل:</span>
                                            <p className="bg-white p-2.5 rounded-lg border border-indigo-100/40 text-slate-850 text-[11px] font-medium leading-relaxed text-right font-sans w-full">
                                              {v.followUpResult}
                                            </p>
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-100/40 font-sans text-[11px]">
                                          <div className="bg-white p-2 rounded-lg border border-indigo-50">
                                            <span className="text-[10px] text-indigo-600 font-extrabold block mb-0.5">🚀 الخطوة التابعة القادمة المتفق عليها:</span>
                                            <span className="font-extrabold text-slate-800">{v.nextStep || 'غير محددة'}</span>
                                          </div>
                                          <div className="bg-white p-2 rounded-lg border border-indigo-50 flex flex-col justify-between">
                                            <span className="text-[10px] text-indigo-600 font-extrabold block mb-0.5 font-sans">📅 موعد المتابعة المنظم القادم:</span>
                                            <span className="font-black text-rose-600">{v.nextFollowUpDate || 'غير مجدول'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Attachment & GPS locations with beautiful links */}
                                  <div className="flex flex-wrap items-center gap-3 text-[10px] pt-1">
                                    {(v.latitude || v.longitude) && (
                                      <div className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded-lg border border-sky-100/70">
                                        <MapPin className="w-3 h-3 text-sky-600" />
                                        <span>تحديد موقع GPS حقيقي للزيارة:</span>
                                        <a
                                          href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="font-black text-sky-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <span>فتح اللوكيشن على الخريطة 🗺️</span>
                                        </a>
                                      </div>
                                    )}

                                    {v.attachmentUrl && (
                                      <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-100/70">
                                        <span>📂 مستندات وصور مرفقة بالزيارة:</span>
                                        <a
                                          href={v.attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          className="font-black text-purple-600 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                        >
                                          <span>معاينة المستند المرفق 🔗</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center py-20 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-sans">
                      <Search className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                      <p className="text-xs font-black">يرجى تحديد عميل من القائمة الجانبية في اليمين لعرض تقريره بالتفصيل وسجله المالي والتشغيلي.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeReport === 'monitoring_quality' && (
          <div className="space-y-6 animate-fadeIn font-sans" id="detailed-quality-report-view">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
              <div className="text-right" dir="rtl">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-violet-600 animate-pulse" />
                  <span>التقرير التفصيلي لسجلات المتابعة والجودة (تصدير وإحصاء)</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  عرض تفصيلي لجميع مكالمات المتابعة، مستويات الرضى، الشكاوى والحلول المسجلة للعملاء
                </p>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={() => handleExportMonitoringToCSV(filteredMonitoringRecords)}
                disabled={filteredMonitoringRecords.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer select-none"
              >
                <span>📥 تصدير التقرير إلى إكسل (Excel)</span>
              </button>
            </div>

            {/* Interactive Filters Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150 text-right" dir="rtl">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">بحث سريع (العميل، النتيجة، الملاحظات)</label>
                <input
                  type="text"
                  value={mSearchQuery}
                  onChange={(e) => setMSearchQuery(e.target.value)}
                  placeholder="ابحث هنا..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300"
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">تصفية بحسب النتيجة/التصنيف</label>
                <select
                  value={mStatusFilter}
                  onChange={(e) => setMStatusFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">الكل ({monitoringRecords.length})</option>
                  {uniqueMonitoringStatuses.map(st => (
                    <option key={st} value={st}>{monitoringStatusMap[st] || st}</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">موظف المتابعة</label>
                <select
                  value={mEmployeeFilter}
                  onChange={(e) => setMEmployeeFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">كل الموظفين</option>
                  {uniqueMonitoringEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Satisfaction Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">مستوى الرضى (النجوم)</label>
                <select
                  value={mSatisfactionFilter}
                  onChange={(e) => setMSatisfactionFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">كل مستويات الرضى</option>
                  <option value="5">⭐⭐⭐⭐⭐ (ممتاز)</option>
                  <option value="4">⭐⭐⭐⭐ (جيد جداً)</option>
                  <option value="3">⭐⭐⭐ (متوسط)</option>
                  <option value="2">⭐⭐ (ضعيف)</option>
                  <option value="1">⭐ (سيء جداً)</option>
                </select>
              </div>
            </div>

            {/* Results counter */}
            <div className="text-[10px] text-slate-500 font-bold text-right">
              عدد النتائج المكتشفة: {filteredMonitoringRecords.length} سجل متابعة ورصد جودة
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-right text-xs" dir="rtl">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <th className="p-3">اسم العميل</th>
                    <th className="p-3">موظف المتابعة</th>
                    <th className="p-3">تاريخ تسجيلها</th>
                    <th className="p-3 text-center">التصنيف</th>
                    <th className="p-3 text-center">الرضى</th>
                    <th className="p-3">خلاصة المكالمة والشكاوى</th>
                    <th className="p-3">التوصيات والمتابعة القادمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {monitoringLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                        جاري تحميل سجلات الجودة والمتابعة...
                      </td>
                    </tr>
                  ) : filteredMonitoringRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد سجلات متابعة تطابق معايير البحث المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredMonitoringRecords.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{rec.customerName}</td>
                        <td className="p-3 text-slate-600 font-medium">{rec.employeeName}</td>
                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : ''}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            rec.status === 'Customer Satisfied' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rec.status === 'Customer Interested' ? 'bg-teal-50 text-teal-700 border border-teal-100 font-black' :
                            rec.status === 'Complaint Opened' ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' :
                            rec.status === 'Technical Issue Reported' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            rec.status === 'Needs Follow-up' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold' :
                            rec.status === 'Customer Unsatisfied' ? 'bg-red-50 text-red-700 border border-red-100' :
                            rec.status === 'Customer Not Interested' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {monitoringStatusMap[rec.status] || rec.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-0.5 text-amber-400 font-bold font-mono">
                            {Array.from({ length: rec.customerSatisfactionLevel || 0 }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                            {!(rec.customerSatisfactionLevel) && <span className="text-slate-300">-</span>}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs leading-relaxed text-[11px] text-slate-600 font-medium text-right font-sans">
                          <div className="font-bold text-slate-800">{rec.callResult}</div>
                          <div className="text-slate-500 mt-1 whitespace-pre-line">{rec.notes}</div>
                        </td>
                        <td className="p-3 max-w-xs leading-relaxed text-[11px] text-slate-600 font-medium text-right font-sans">
                          {rec.recommendations && (
                            <div className="text-indigo-600 font-bold bg-indigo-50/40 p-1.5 rounded-lg border border-indigo-50 mb-1">
                              💡 {rec.recommendations}
                            </div>
                          )}
                          {rec.nextFollowUpDate && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                              <span>📅 المتابعة القادمة:</span>
                              <strong>{rec.nextFollowUpDate}</strong>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === 'technical_support' && (
          <div className="space-y-6 animate-fadeIn font-sans" id="detailed-support-report-view">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
              <div className="text-right" dir="rtl">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600 animate-bounce" />
                  <span>التقرير التفصيلي لمهام وأنشطة الدعم الفني</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  عرض تفصيلي وتصفية متقدمة لجميع تذاكر الدعم الفني، وتركيب النسخ التجريبية والنهائية، وتدريب العملاء
                </p>
              </div>

              {/* Excel Export Button */}
              <button
                onClick={() => handleExportSupportToCSV(filteredSupportTasks)}
                disabled={filteredSupportTasks.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer select-none"
              >
                <span>📥 تصدير تقرير الدعم إلى إكسل (Excel)</span>
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" dir="rtl">
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-right">
                <div className="text-[10px] font-black text-slate-500">إجمالي مهام الدعم</div>
                <div className="text-lg font-black text-slate-800 mt-1 font-mono">{supportTasks.length}</div>
              </div>
              <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-50 text-right">
                <div className="text-[10px] font-black text-emerald-600">المهام المكتملة</div>
                <div className="text-lg font-black text-emerald-800 mt-1 font-mono">
                  {supportTasks.filter(t => t.status === 'Completed').length}
                </div>
              </div>
              <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-50 text-right">
                <div className="text-[10px] font-black text-rose-600">المهام قيد التنفيذ</div>
                <div className="text-lg font-black text-rose-800 mt-1 font-mono">
                  {supportTasks.filter(t => t.status === 'In Progress').length}
                </div>
              </div>
              <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-50 text-right">
                <div className="text-[10px] font-black text-amber-600">بانتظار العميل</div>
                <div className="text-lg font-black text-amber-800 mt-1 font-mono">
                  {supportTasks.filter(t => t.status === 'Waiting Customer Response').length}
                </div>
              </div>
              <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-50 text-right col-span-2 lg:col-span-1">
                <div className="text-[10px] font-black text-indigo-600">نسبة الإنجاز</div>
                <div className="text-lg font-black text-indigo-800 mt-1 font-mono">
                  {supportTasks.length > 0 
                    ? `${Math.round((supportTasks.filter(t => t.status === 'Completed').length / supportTasks.length) * 100)}%`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* Interactive Filters Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150 text-right" dir="rtl">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">بحث سريع (العميل، التفاصيل، المعرّف)</label>
                <input
                  type="text"
                  value={sSearchQuery}
                  onChange={(e) => setSSearchQuery(e.target.value)}
                  placeholder="ابحث هنا..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white placeholder:text-slate-300"
                />
              </div>

              {/* Task Type Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">نوع المهمة</label>
                <select
                  value={sTaskTypeFilter}
                  onChange={(e) => setSTaskTypeFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">كل الأنواع ({supportTasks.length})</option>
                  {uniqueSupportTaskTypes.map(type => (
                    <option key={type} value={type}>{
                      type === 'Final Version Installation' ? 'تركيب نسخة نهائية 💾' :
                      type === 'Trial Version Installation' ? 'تركيب نسخة تجريبية 🧪' :
                      type === 'Demo Presentation' ? 'تقديم عرض تجريبي (Demo) 🖥️' :
                      type === 'Training Session' ? 'جلسة تدريبية 👨‍🏫' :
                      type === 'Maintenance' ? 'صيانة دورية 🛠️' :
                      type === 'Technical Issue Resolution' ? 'حل مشكلة تقنية 🚨' :
                      type || 'أخرى'
                    }</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">الحالة</label>
                <select
                  value={sStatusFilter}
                  onChange={(e) => setSStatusFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">كل الحالات</option>
                  {uniqueSupportStatuses.map(st => (
                    <option key={st} value={st}>{
                      st === 'New' ? 'جديدة ✨' :
                      st === 'In Progress' ? 'قيد التنفيذ ⚙️' :
                      st === 'Waiting Customer Response' ? 'بانتظار العميل ⏳' :
                      st === 'Completed' ? 'مكتملة ✅' :
                      st === 'Cancelled' ? 'ملغاة ❌' :
                      st
                    }</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">الأولوية</label>
                <select
                  value={sPriorityFilter}
                  onChange={(e) => setSPriorityFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">كل المستويات</option>
                  {uniqueSupportPriorities.map(p => (
                    <option key={p} value={p}>{
                      p === 'Low' ? 'منخفضة' :
                      p === 'Medium' ? 'متوسطة' :
                      p === 'High' ? 'مرتفعة 🔥' :
                      p === 'Urgent' ? 'عاجلة جداً 🚨' :
                      p
                    }</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600">الموظف المسؤول</label>
                <select
                  value={sEmployeeFilter}
                  onChange={(e) => setSEmployeeFilter(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="all">كل موظفي الدعم</option>
                  {uniqueSupportEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results counter */}
            <div className="text-[10px] text-slate-500 font-bold text-right">
              عدد النتائج المكتشفة: {filteredSupportTasks.length} تذكرة/مهمة دعم فني
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-right text-xs" dir="rtl">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <th className="p-3">رقم المهمة</th>
                    <th className="p-3">اسم العميل</th>
                    <th className="p-3">نوع المهمة</th>
                    <th className="p-3">الأولوية</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3">التواريخ</th>
                    <th className="p-3">تفاصيل وملاحظات المهمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {supportTasksLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        جاري تحميل سجلات ومهام الدعم الفني...
                      </td>
                    </tr>
                  ) : filteredSupportTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد مهام دعم فني تطابق معايير التصفية المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredSupportTasks.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-[10px] font-bold text-slate-400">
                          {t.id}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{t.customerName}</td>
                        <td className="p-3 font-semibold text-slate-700">
                          {t.taskType === 'Final Version Installation' ? '💾 تركيب نسخة نهائية' :
                           t.taskType === 'Trial Version Installation' ? '🧪 تركيب نسخة تجريبية' :
                           t.taskType === 'Demo Presentation' ? '🖥️ تقديم عرض تجريبي' :
                           t.taskType === 'Training Session' ? '👨‍🏫 جلسة تدريبية' :
                           t.taskType === 'Maintenance' ? '🛠️ صيانة دورية' :
                           t.taskType === 'Technical Issue Resolution' ? '🚨 حل مشكلة تقنية' :
                           t.taskType || 'أخرى'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.priority === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-100 animate-pulse' :
                            t.priority === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                            t.priority === 'Medium' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {t.priority === 'Urgent' ? 'عاجلة جداً 🚨' :
                             t.priority === 'High' ? 'مرتفعة 🔥' :
                             t.priority === 'Medium' ? 'متوسطة' : 'منخفضة'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            t.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            t.status === 'Waiting Customer Response' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            t.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {t.status === 'New' ? 'جديدة ✨' :
                             t.status === 'In Progress' ? 'قيد التنفيذ' :
                             t.status === 'Waiting Customer Response' ? 'بانتظار العميل' :
                             t.status === 'Completed' ? 'مكتملة' : 'ملغاة'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-bold">{t.assignedEmployeeName}</td>
                        <td className="p-3 text-[10px] text-slate-500 font-mono space-y-0.5 leading-tight">
                          <div>➕ كُلّفت: {t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : '-'}</div>
                          {t.startedAt && <div>⚙️ بدأت: {new Date(t.startedAt).toLocaleDateString('ar-EG')}</div>}
                          {t.completedAt && <div className="text-emerald-600 font-bold">✅ أنجزت: {new Date(t.completedAt).toLocaleDateString('ar-EG')}</div>}
                          {t.trialExpirationDate && <div className="text-rose-600 font-semibold">🧪 انتهاء التجربة: {t.trialExpirationDate}</div>}
                        </td>
                        <td className="p-3 max-w-xs leading-relaxed text-[11px] text-slate-600 font-medium text-right font-sans">
                          <div className="text-slate-700 whitespace-pre-line">{t.description}</div>
                          {t.demoObjective && (
                            <div className="text-[10px] text-indigo-600 bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100 mt-2">
                              <strong>🎯 الهدف:</strong> {t.demoObjective}
                            </div>
                          )}
                          {t.demoNotes && (
                            <div className="text-[10px] text-slate-500 mt-1 italic">
                              <strong>💡 ملاحظات العرض:</strong> {t.demoNotes}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer message on print */}
        <div className="hidden print:block border-t border-gray-100 pt-5 text-center text-[10px] text-gray-400">
          تم إنشاء هذا التقرير تلقائياً ومستمد لحظياً من سجل الزيارات والمبيعات عبر لوحة تحكم Select Code CRM للبرمجة.
        </div>
      </div>

      {/* Transfer Customers Modal */}
      {isTransferModalOpen && (
        <TransferCustomersModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          salesReps={salesRepNames}
          customers={customers}
          visits={visits}
          onTransferSuccess={onTransferSuccess}
          triggerMessage={triggerMessage}
        />
      )}
    </div>
  );
}
