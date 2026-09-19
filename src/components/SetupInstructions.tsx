/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  FileSpreadsheet, 
  Code, 
  Mail, 
  Bell, 
  ShieldCheck, 
  Link2, 
  RefreshCw, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Database,
  CloudLightning,
  Settings,
  HelpCircle,
  Download
} from 'lucide-react';
import { Visit, Customer } from '../types';
import { 
  testSheetsConnection, 
  syncAllToSheets, 
  importFromSheets, 
  isValidWebAppUrl 
} from '../data/sheetsService';

interface SetupInstructionsProps {
  visits?: Visit[];
  customers?: Customer[];
  onImportData?: (visits: Visit[], customers: Customer[]) => void;
}

export default function SetupInstructions({ 
  visits = [], 
  customers = [], 
  onImportData 
}: SetupInstructionsProps) {
  // Tabs State
  const [activeSubTab, setActiveSubTab] = useState<'sync_hub' | 'script_code'>('sync_hub');

  // Sheets settings state
  const [webAppUrl, setWebAppUrl] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  // Interaction and Feedback state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Load configuration from local storage on render
  useEffect(() => {
    const savedUrl = localStorage.getItem('sales_visit_crm_google_sheets_web_app_url') || '';
    const savedAutoSync = localStorage.getItem('sales_visit_crm_google_sheets_auto_sync_enabled') === 'true';
    const savedLastSync = localStorage.getItem('sales_visit_crm_google_sheets_last_sync_time');
    
    setWebAppUrl(savedUrl);
    setAutoSync(savedAutoSync);
    setLastSyncTime(savedLastSync);
  }, []);

  // Save changes helper
  const handleSaveConfig = (newUrl: string, newAuto: boolean) => {
    localStorage.setItem('sales_visit_crm_google_sheets_web_app_url', newUrl);
    localStorage.setItem('sales_visit_crm_google_sheets_auto_sync_enabled', String(newAuto));
    
    setWebAppUrl(newUrl);
    setAutoSync(newAuto);
    
    setStatusMessage({
      type: 'info',
      text: 'تم حفظ إعدادات الرابط بنجاح!'
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Test current Web App URL
  const handleTestConnection = async () => {
    if (!webAppUrl) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى إدخال رابط Web App أولاً قبل الفحص.'
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const isConnected = await testSheetsConnection(webAppUrl);
      if (isConnected) {
        setStatusMessage({
          type: 'success',
          text: 'متصل بنجاح! تم التحقق من الرابط وبروتوكولات التزامن في Google Sheets.'
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'فشل الفحص. لم يرجع السيرفر كود نجاح متوقع. تأكد من نشر الـ Script بشكل صحيح.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'فشل الاتصال بالرابط المختار. تحقق من الاتصال بالإنترنت ومطابقة كود جوجل.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Synchronize entire CRM list to Google Sheet (React -> Cloud Sheet)
  const handleExportAllNow = async () => {
    if (!webAppUrl) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى إدخال رابط الـ Web App وتفعيله أولاً لإتمام المزامنة.'
      });
      return;
    }

    setIsSyncing(true);
    setStatusMessage({
      type: 'info',
      text: 'جاري تجميع البيانات وترحيلها سحابياً إلى جداول Google Sheets...'
    });

    try {
      const result = await syncAllToSheets(webAppUrl, visits, customers);
      if (result.success) {
        const nowStr = new Date().toLocaleString('ar-SA');
        localStorage.setItem('sales_visit_crm_google_sheets_last_sync_time', nowStr);
        setLastSyncTime(nowStr);
        setStatusMessage({
          type: 'success',
          text: result.message
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message || 'فشلت المزامنة.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'فشل الاتصال بالشبكة للمزامنة.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Import entire CRM list from Google Sheet (Cloud Sheet -> React)
  const handleImportAllNow = async () => {
    if (!webAppUrl) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى إدخال وتفعيل رابط الـ Web App أولاً.'
      });
      return;
    }

    const confirmImport = window.confirm(
      'تحذير: سيقوم هذا الإجراء بجلب البيانات من ملف Google Sheet واستبدال البيانات المحلية الحالية في المتصفح بالتصميم السحابي الجديد. هل ترغب في الاستمرار؟'
    );
    if (!confirmImport) return;

    setIsImporting(true);
    setStatusMessage({
      type: 'info',
      text: 'جاري جلب أسطر وصفوف البيانات بجميع الجداول من Google Sheets...'
    });

    try {
      const result = await importFromSheets(webAppUrl);
      if (result.success && result.visits && result.customers) {
        if (onImportData) {
          onImportData(result.visits, result.customers);
        }
        const nowStr = new Date().toLocaleString('ar-SA');
        localStorage.setItem('sales_visit_crm_google_sheets_last_sync_time', nowStr);
        setLastSyncTime(nowStr);
        setStatusMessage({
          type: 'success',
          text: `تم جلب البيانات بنجاح! تم استيراد عدد (${result.visits.length}) زيارة، وعدد (${result.customers.length}) حساب عميل وتحديث لوحة القيادة.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.message || 'فشل استيراد البيانات.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'فشل تحميل البيانات من Google App Script.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const googleAppsScriptCode = `/**
 * نظام إدارة زيارات المبيعات - Select Code CRM
 * كود Google Apps Script للتكامل والأتمتة التلقائية لبيانات المبيعات والمتابعات والبريد اليومي
 * يدعم كود استقبال ومزامنة البيانات في التطبيق عن بعد (API Web App)
 */

// إعدادات البريد الإلكتروني للمدير العام (يرجى وضع البريد المناسب هنا)
const MANAGER_EMAIL = "info@select-code.com"; 

/**
 * دالة استقبال طلبات الإدخال والتكامل (POST) لعرض ومزامنة البيانات وتحديثها تلقائياً
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // محاولة الاستحواذ على قفل التشغيل لمدة تصل إلى 30 ثانية لتأمين العمليات المتزامنة ومنع تعارض الأجهزة
    lock.waitLock(30000);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "فشل الحصول على قفل الأمان بسبب ضغط العمليات والطلبات المتزامنة، يرجى المحاولة بعد قليل." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === "ping") {
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "متصل بنجاح!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "sync_all") {
      const visits = postData.visits;
      const customers = postData.customers || [];
      const deletedIds = postData.deletedIds || [];
      writeVisitsToSheet(visits, deletedIds);
      if (customers && customers.length > 0) {
        writeCustomersToSheet(customers);
      }
      syncFollowUpsSheet();
      SpreadsheetApp.flush();
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تمت المزامنة الكاملة والدمج الذكي للبيانات بنجاح وتحديث جداول العملاء والمتابعات دون مسح الأجهزة الأخرى!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "add_visit") {
      const visit = postData.visit;
      appendVisitToSheet(visit);
      
      // تشغيل معالجات الأتمتة للزيارات
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const responseSheet = ss.getSheetByName("Visits Database");
      const lastRow = responseSheet.getLastRow();
      
      if (visit.visitType === "زيارة جديدة") {
        checkForDuplicateCustomer(visit.phone, visit.customerName, lastRow, responseSheet);
        syncCustomerRecord(visit.customerName, responseSheet, lastRow);
      } else {
        updateCustomerStatusAndValue(visit.customerName, visit.customerStatus, visit.expectedOpportunityValue || 0);
      }
      syncFollowUpsSheet();
      
      SpreadsheetApp.flush();
      lock.releaseLock();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تم ترحيل الزيارة بنجاح إلى قاعدة البيانات وتحفيز الأتمتة غير المتعارضة!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "إجراء غير معروف" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * دالة استقبال طلبات جلب البيانات (GET) لتحديث التطبيق بالبيانات المخزنة في الجداول
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "متصل" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "get_data") {
      const visits = readVisitsFromSheet();
      const customers = readCustomersFromSheet();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", visits: visits, customers: customers }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "معاملات جلب غير دقيقة" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * دالة ترحيل وكتابة كافة الزيارات من التطبيق إلى صفحة Visits Database
 */
function writeVisitsToSheet(visits, deletedIds) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Visits Database");
  if (!sheet) {
    sheet = ss.insertSheet("Visits Database");
  }
  
  // خريطة لتسجيل أرقام السجلات المحذوفة لتجنب إعادتها
  var delMap = {};
  if (deletedIds && deletedIds.length > 0) {
    deletedIds.forEach(function(dId) {
      if (dId) {
        delMap[dId.toString().trim()] = true;
      }
    });
  }

  // دمج ذكي وغير مسحي لبيانات الزيارات القادمة من أجهزة متزامنة لمنع تعارض الأجهزة الأخرى
  const existingVisits = readVisitsFromSheet();
  const visitsMap = {};
  
  existingVisits.forEach(function(v) {
    if (v.id) {
      var k = v.id.toString().trim();
      if (!delMap[k]) {
        visitsMap[k] = v;
      }
    }
  });
  
  if (visits && visits.length > 0) {
    visits.forEach(function(v) {
      if (v.id) {
        var k = v.id.toString().trim();
        if (!delMap[k]) {
          // نحدث السجل أو نضيفه إذا لم يكن موجوداً
          visitsMap[k] = v;
        }
      }
    });
  }
  
  const mergedVisits = [];
  for (var id in visitsMap) {
    mergedVisits.push(visitsMap[id]);
  }
  
  mergedVisits.sort(function(a, b) {
    return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
  });
  
  sheet.clear();
  sheet.appendRow([
    "التاريخ والوقت", "اسم المندوب", "نوع الزيارة", "مصدر الزيارة", "اسم العميل", 
    "النشاط", "المسؤول", "المسمى الوظيفي", "الهاتف", "واتساب", 
    "البريد الإلكتروني", "العنوان", "المحافظة", "ملخص الزيارة", 
    "الاحتياجات", "مستوى الاهتمام", "ملاحظات المتابعة", "الخطوة القادمة", 
    "تاريخ المتابعة", "حالة العميل الحالية", "قيمة الفرصة", "معرف الزيارة"
  ]);
  
  if (mergedVisits && mergedVisits.length > 0) {
    const rows = mergedVisits.map(v => [
      v.timestamp || "",
      v.repName || "",
      v.visitType || "",
      v.visitSource || "زيارة ميدانية",
      v.customerName || "",
      v.activityType || "",
      v.contactPerson || "",
      v.jobTitle || "",
      v.phone || "",
      v.whatsapp || "",
      v.email || "",
      v.address || "",
      v.province || "",
      v.summary || "",
      v.needs || "",
      v.interestLevel || "",
      v.followUpNotes || "",
      v.nextStep || "",
      v.nextFollowUpDate || "",
      v.customerStatus || "",
      v.expectedOpportunityValue || 0,
      v.id || ""
    ]);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * كتابة كافة صفوف دليل العملاء في صفحة Customers
 */
function writeCustomersToSheet(customers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Customers");
  if (!sheet) {
    sheet = ss.insertSheet("Customers");
  }
  
  // دمج ذكي وغير مسحي لبيانات العملاء للحفاظ على دليل العمل المتزامن من الأجهزة المتعددة
  const existingCustomers = readCustomersFromSheet();
  const customersMap = {};
  
  existingCustomers.forEach(function(c) {
    if (c.name) {
      customersMap[c.name.trim().toLowerCase()] = c;
    }
  });
  
  if (customers && customers.length > 0) {
    customers.forEach(function(c) {
      if (c.name) {
        const key = c.name.trim().toLowerCase();
        if (customersMap[key]) {
          const existing = customersMap[key];
          customersMap[key] = {
            id: existing.id || c.id,
            name: c.name,
            activity: c.activity || existing.activity,
            contactPerson: c.contactPerson || existing.contactPerson,
            phone: c.phone || existing.phone,
            whatsapp: c.whatsapp || existing.whatsapp,
            email: c.email || existing.email,
            address: c.address || existing.address,
            province: c.province || existing.province,
            firstVisitDate: existing.firstVisitDate || c.firstVisitDate,
            lastVisitDate: c.lastVisitDate || existing.lastVisitDate,
            visitsCount: Math.max(existing.visitsCount || 0, c.visitsCount || 0),
            currentStatus: c.currentStatus || existing.currentStatus,
            opportunityValue: Math.max(existing.opportunityValue || 0, c.opportunityValue || 0)
          };
        } else {
          customersMap[key] = c;
        }
      }
    });
  }
  
  const mergedCustomers = [];
  for (var key in customersMap) {
    mergedCustomers.push(customersMap[key]);
  }
  
  sheet.clear();
  sheet.appendRow([
    "Customer ID", "اسم العميل", "النشاط", "المسؤول", "الهاتف", 
    "واتساب", "البريد الإلكتروني", "العنوان", "المحافظة", "أول زيارة", 
    "آخر زيارة", "عدد الزيارات", "حالة العميل الحالية", "قيمة الفرصة"
  ]);
  
  if (mergedCustomers && mergedCustomers.length > 0) {
    const rows = mergedCustomers.map(c => [
      c.id || "",
      c.name || "",
      c.activity || "",
      c.contactPerson || "",
      c.phone || "",
      c.whatsapp || "",
      c.email || "",
      c.address || "",
      c.province || "",
      c.firstVisitDate || "",
      c.lastVisitDate || "",
      c.visitsCount || 0,
      c.currentStatus || "",
      c.opportunityValue || 0
    ]);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * إضافة سطر زيارة واحدة
 */
function appendVisitToSheet(v) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Visits Database");
  if (!sheet) {
    sheet = ss.insertSheet("Visits Database");
    sheet.appendRow([
      "التاريخ والوقت", "اسم المندوب", "نوع الزيارة", "مصدر الزيارة", "اسم العميل", 
      "النشاط", "المسؤول", "المسمى الوظيفي", "الهاتف", "واتساب", 
      "البريد الإلكتروني", "العنوان", "المحافظة", "ملخص الزيارة", 
      "الاحتياجات", "مستوى الاهتمام", "ملاحظات المتابعة", "الخطوة القادمة", 
      "تاريخ المتابعة", "حالة العميل الحالية", "قيمة الفرصة", "معرف الزيارة"
    ]);
  }
  
  // دمج ذكي: التحقق قبل الإضافة لمنع كتابة سجلات مكررة إن ضغط عليها المندوب مرتين
  if (v.id) {
    const existing = readVisitsFromSheet();
    const isDuplicate = existing.some(function(item) {
      return item.id === v.id;
    });
    if (isDuplicate) return;
  }
  
  sheet.appendRow([
    v.timestamp || "",
    v.repName || "",
    v.visitType || "",
    v.visitSource || "زيارة ميدانية",
    v.customerName || "",
    v.activityType || "",
    v.contactPerson || "",
    v.jobTitle || "",
    v.phone || "",
    v.whatsapp || "",
    v.email || "",
    v.address || "",
    v.province || "",
    v.summary || "",
    v.needs || "",
    v.interestLevel || "",
    v.followUpNotes || "",
    v.nextStep || "",
    v.nextFollowUpDate || "",
    v.customerStatus || "",
    v.expectedOpportunityValue || 0,
    v.id || ""
  ]);
}

/**
 * قراءة كافة بيانات الزيارات من الصفحة
 */
function readVisitsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Visits Database");
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const visits = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[4]) continue; // تخطي الرؤوس الفارغة
    visits.push({
      timestamp: row[0] instanceof Date ? row[0].toISOString().slice(0, 19) : String(row[0]),
      repName: String(row[1]),
      visitType: String(row[2]),
      visitSource: String(row[3] || "زيارة ميدانية"),
      customerName: String(row[4]),
      activityType: String(row[5]),
      contactPerson: String(row[6]),
      jobTitle: String(row[7]),
      phone: String(row[8]),
      whatsapp: String(row[9]),
      email: String(row[10]),
      address: String(row[11]),
      province: String(row[12]),
      summary: String(row[13]),
      needs: String(row[14]),
      interestLevel: String(row[15]),
      followUpNotes: String(row[16]),
      nextStep: String(row[17]),
      nextFollowUpDate: row[18] instanceof Date ? row[18].toISOString().slice(0, 10) : String(row[18]),
      customerStatus: String(row[19]),
      expectedOpportunityValue: Number(row[20]) || 0,
      id: String(row[21] || ("VIS-RECOV-" + i))
    });
  }
  return visits;
}

/**
 * قراءة كافة بيانات العملاء من الصفحة
 */
function readCustomersFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Customers");
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const customers = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue;
    customers.push({
      id: String(row[0]),
      name: String(row[1]),
      activity: String(row[2]),
      contactPerson: String(row[3]),
      phone: String(row[4]),
      whatsapp: String(row[5]),
      email: String(row[6]),
      address: String(row[7]),
      province: String(row[8]),
      firstVisitDate: row[9] instanceof Date ? row[9].toISOString().slice(0, 10) : String(row[9]),
      lastVisitDate: row[10] instanceof Date ? row[10].toISOString().slice(0, 10) : String(row[10]),
      visitsCount: Number(row[11]) || 0,
      currentStatus: String(row[12]),
      opportunityValue: Number(row[13]) || 0
    });
  }
  return customers;
}

// ===================================
// معالجات المشغلات والأتمتة الأصلية كما هي
// ===================================

function onFormSubmitTrigger(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const responseSheet = sheet.getSheetByName("Visits Database") || sheet.getSheets()[0];
    const lastRow = responseSheet.getLastRow();
    
    const timestamp = responseSheet.getRange(lastRow, 1).getValue();
    const repName = responseSheet.getRange(lastRow, 2).getValue();
    const visitType = responseSheet.getRange(lastRow, 3).getValue();
    
    let customerName = "";
    let customerPhone = "";
    let status = "";
    let value = 0;
    
    if (visitType === "زيارة جديدة") {
      customerName = responseSheet.getRange(lastRow, 4).getValue();
      customerPhone = responseSheet.getRange(lastRow, 8).getValue();
      status = responseSheet.getRange(lastRow, 19).getValue();
      value = responseSheet.getRange(lastRow, 20).getValue() || 0;
      
      if (customerPhone) {
        checkForDuplicateCustomer(customerPhone, customerName, lastRow, responseSheet);
      }
      syncCustomerRecord(customerName, responseSheet, lastRow);
    } else {
      customerName = responseSheet.getRange(lastRow, 4).getValue();
      status = responseSheet.getRange(lastRow, 19).getValue();
      value = responseSheet.getRange(lastRow, 20).getValue() || 0;
      updateCustomerStatusAndValue(customerName, status, value);
    }
    syncFollowUpsSheet();
  } catch (error) {
    Logger.log("Error in onFormSubmit: " + error.toString());
  }
}

function checkForDuplicateCustomer(phone, name, currentRow, sheet) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < currentRow - 1; i++) {
    const prevPhone = data[i][7];
    const prevVisitType = data[i][2];
    
    if (prevPhone && prevPhone.toString() === phone.toString() && prevVisitType === "زيارة جديدة") {
      const prevCustName = data[i][3];
      if (prevCustName !== name) {
        MailApp.sendEmail({
          to: MANAGER_EMAIL,
          subject: "⚠️ تنبيه من نظام المبيعات: تكرر هاتف لعملاء مختلفين",
          body: "عزيزي المدير،\\n\\nتم تقديم زيارة جديدة للعميل (" + name + ") برقم الهاتف (" + phone + ")، وهو مسجل مسبقاً باسم عميل آخر وهو (" + prevCustName + ") لمندوب آخر.\\n\\nالرجاء التحقق من صحة جهات الاتصال."
        });
        break;
      }
    }
  }
}

function syncCustomerRecord(name, visitsSheet, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let custSheet = ss.getSheetByName("Customers");
  if (!custSheet) {
    custSheet = ss.insertSheet("Customers");
    custSheet.appendRow([
      "Customer ID", "اسم العميل", "النشاط", "المسؤول", "الهاتف", 
      "واتساب", "البريد الإلكتروني", "العنوان", "المحافظة", "أول زيارة", 
      "آخر زيارة", "عدد الزيارات", "حالة العميل الحالية", "قيمة الفرصة"
    ]);
  }
  
  const custData = custSheet.getDataRange().getValues();
  let foundIndex = -1;
  for (let i = 1; i < custData.length; i++) {
    if (custData[i][1] === name) {
      foundIndex = i + 1;
      break;
    }
  }
  
  const activity = visitsSheet.getRange(row, 5).getValue();
  const contact = visitsSheet.getRange(row, 6).getValue();
  const phone = visitsSheet.getRange(row, 8).getValue();
  const email = visitsSheet.getRange(row, 10).getValue();
  const address = visitsSheet.getRange(row, 11).getValue();
  const province = visitsSheet.getRange(row, 12).getValue();
  const dateStr = visitsSheet.getRange(row, 1).getValue();
  const status = visitsSheet.getRange(row, 19).getValue();
  const value = visitsSheet.getRange(row, 20).getValue() || 0;
  
  if (foundIndex === -1) {
    const nextIdNum = custData.length; 
    const custId = "CUST-" + String(nextIdNum).padStart(3, '0');
    custSheet.appendRow([
      custId, name, activity, contact, phone, "", email, address, province, 
      dateStr, dateStr, 1, status, value
    ]);
  } else {
    custSheet.getRange(foundIndex, 11).setValue(dateStr);
    const currentVisits = custSheet.getRange(foundIndex, 12).getValue() || 0;
    custSheet.getRange(foundIndex, 12).setValue(currentVisits + 1);
    custSheet.getRange(foundIndex, 13).setValue(status);
    custSheet.getRange(foundIndex, 14).setValue(value);
  }
}

function updateCustomerStatusAndValue(name, status, value) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const custSheet = ss.getSheetByName("Customers");
  if (!custSheet) return;
  
  const custData = custSheet.getDataRange().getValues();
  for (let i = 1; i < custData.length; i++) {
    if (custData[i][1] === name) {
      const idx = i + 1;
      custSheet.getRange(idx, 11).setValue(new Date());
      const currentVisits = custSheet.getRange(idx, 12).getValue() || 0;
      custSheet.getRange(idx, 12).setValue(currentVisits + 1);
      custSheet.getRange(idx, 13).setValue(status);
      if (value > 0) {
        custSheet.getRange(idx, 14).setValue(value);
      }
      break;
    }
  }
}

function syncFollowUpsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const visitsSheet = ss.getSheetByName("Visits Database");
  if (!visitsSheet) return;
  
  let followUpSheet = ss.getSheetByName("Follow-Ups");
  if (!followUpSheet) {
    followUpSheet = ss.insertSheet("Follow-Ups");
  }
  
  followUpSheet.clear();
  followUpSheet.appendRow(["العميل", "المندوب", "موعد المتابعة", "عدد الأيام المتبقية", "حالة المهمة", "التفاصيل"]);
  
  const data = visitsSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const tasksByCustomer = {};
  
  for (let i = 1; i < data.length; i++) {
    const timestamp = data[i][0];
    const repName = data[i][1];
    const visitType = data[i][2];
    const custName = data[i][3];
    const status = data[i][18];
    const nextDateRaw = data[i][17];
    const nextStep = data[i][16];
    
    if (visitType === "زيارة متابعة" && nextDateRaw) {
      const nextDate = new Date(nextDateRaw);
      nextDate.setHours(0,0,0,0);
      
      if (!tasksByCustomer[custName] || nextDate > tasksByCustomer[custName].date) {
        tasksByCustomer[custName] = {
          rep: repName,
          date: nextDate,
          notes: nextStep,
          active: status !== "تم التعاقد" && status !== "غير مهتم"
        };
      }
    }
  }
  
  Object.keys(tasksByCustomer).forEach(function(cust) {
    const item = tasksByCustomer[cust];
    if (!item.active) return;
    
    const diffTime = item.date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let taskStatus = "قادمة";
    if (diffDays < 0) {
      taskStatus = "متأخرة (فائتة)";
    } else if (diffDays === 0) {
      taskStatus = "اليوم";
    }
    
    followUpSheet.appendRow([
      cust, 
      item.rep, 
      Utilities.formatDate(item.date, "GMT+3", "yyyy-MM-dd"), 
      diffDays, 
      taskStatus, 
      item.notes
    ]);
  });
}

function sendDailySummaryEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const visitsSheet = ss.getSheetByName("Visits Database");
  if (!visitsSheet) return;
  
  const data = visitsSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let totalVisitsToday = 0;
  let newClientsCount = 0;
  let visitsRowsHtml = "";
  
  for (let i = 1; i < data.length; i++) {
    const visitDate = new Date(data[i][0]);
    visitDate.setHours(0,0,0,0);
    
    if (visitDate.getTime() === today.getTime()) {
      totalVisitsToday++;
      const rep = data[i][1];
      const type = data[i][2];
      const cust = data[i][3];
      const status = data[i][18];
      const val = data[i][19] || 0;
      
      if (type === "زيارة جديدة") newClientsCount++;
      
      visitsRowsHtml += "<tr>" +
        "<td style='padding:8px; border:1px solid #ddd;'>" + rep + "</td>" +
        "<td style='padding:8px; border:1px solid #ddd; font-weight:bold;'>" + type + "</td>" +
        "<td style='padding:8px; border:1px solid #ddd;'>" + cust + "</td>" +
        "<td style='padding:8px; border:1px solid #ddd; text-align:center;'>" + status + "</td>" +
        "<td style='padding:8px; border:1px solid #ddd; text-align:left; font-weight:bold; color:#10b981;'>" + val.toLocaleString() + " ر.س</td>" +
        "</tr>";
    }
  }
  
  if (totalVisitsToday === 0) {
    Logger.log("No visits submitted today.");
    return;
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0,0,0,0);
  
  let tomorrowFollowupsHtml = "";
  const followUpSheet = ss.getSheetByName("Follow-Ups");
  if (followUpSheet) {
    const fuData = followUpSheet.getDataRange().getValues();
    for (let j = 1; j < fuData.length; j++) {
      const fuDate = new Date(fuData[j][2]);
      fuDate.setHours(0,0,0,0);
      if (fuDate.getTime() === tomorrow.getTime()) {
        tomorrowFollowupsHtml += "<li><b>" + fuData[j][0] + "</b> (بواسطة المندوب: " + fuData[j][1] + ") - الخطوة القادمة: " + fuData[j][5] + "</li>";
      }
    }
  }
  
  if (!tomorrowFollowupsHtml) {
    tomorrowFollowupsHtml = "<li>لا توجد متابعة للغد.</li>";
  }
  
  const emailHtml = 
    "<div dir='rtl' style='font-family:Tahoma, sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #ddd; border-radius:8px; background-color:#fafafa;'>" +
    "<div style='text-align:center; background-color:#0d9488; color:#fff; padding:15px; border-radius:6px;'>" +
    "<h2>مجموعة Select Code البرمجية</h2>" +
    "<h3>التقرير اليومي لزيارات المبيعات والعملاء</h3>" +
    "</div>" +
    "<p>مرحباً يا مدير،</p>" +
    "<p>إليك ملخص نشاط كادر المبيعات والزيارات التي تم إنجازها اليوم <b>" + today.toLocaleDateString('ar-SA') + "</b>:</p>" +
    "<table style='width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px; background-color:#fff;'>" +
    "<thead><tr style='background-color:#f1f5f9;'><th style='padding:8px; border:1px solid #ddd;'>المندوب</th><th style='padding:8px; border:1px solid #ddd;'>النوع</th><th style='padding:8px; border:1px solid #ddd;'>العميل</th><th style='padding:8px; border:1px solid #ddd;'>الحالة</th><th style='padding:8px; border:1px solid #ddd;'>الميزانية المتوقعة</th></tr></thead>" +
    "<tbody>" + visitsRowsHtml + "</tbody></table>" +
    "</div>";
    
  MailApp.sendEmail({
    to: MANAGER_EMAIL,
    subject: "📊 تقرير المبيعات لحركة المندوبين اليومية - " + today.toLocaleDateString('ar-SA'),
    htmlBody: emailHtml
  });
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6" id="setup-instructions-container" dir="rtl">
      
      {/* Dynamic Sync Hub Header */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-950 border border-slate-700/50 rounded-3xl p-6 text-right text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl translate-y-16"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-teal-400 border border-slate-700 text-xs font-mono font-bold">
              <CloudLightning className="w-3.5 h-3.5" />
              <span>مزامنة سحابية نشطة</span>
            </div>
            <h2 className="text-xl font-black font-sans tracking-tight">مركز مزامنة والتحكم بجداول Google Sheets</h2>
            <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
              اربط نظام الـ CRM المحمول الخاص بمندوبيك بقاعدة البيانات المركزية على Google Sheets. يمكنك تفعيل المزامنة التلقائية اللحظية أو رفع وجلب البيانات بضغطة زر.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* View selectors */}
            <button 
              onClick={() => setActiveSubTab('sync_hub')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'sync_hub' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/50'
              }`}
            >
              لوحة التزامن النشط
            </button>
            <button 
              onClick={() => setActiveSubTab('script_code')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'script_code' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/50'
              }`}
            >
              كود الإعداد والأتمتة (Apps Script)
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK STATUS BAR */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all animate-slideUp text-right ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-850' 
            : statusMessage.type === 'error' 
              ? 'bg-rose-50 border-rose-100 text-rose-850'
              : 'bg-blue-50 border-blue-100 text-blue-850'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed font-bold font-sans">
            {statusMessage.text}
          </div>
        </div>
      )}

      {/* TAB RENDERS */}
      {activeSubTab === 'sync_hub' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Section 1: Settings inputs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Spreadsheet URL Connector */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-right space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-[10px] text-gray-400 font-mono">STEP 1: CONFIG CONNECT</span>
                <h3 className="text-sm font-black text-gray-950 font-sans flex items-center gap-2">
                  <Settings className="w-4 h-4 text-teal-600" />
                  <span>تثبيت إعدادات الربط وعنوان خادم الأتمتة</span>
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">رابط الويب لـ Google Apps Script (Web App URL):</label>
                  <div className="relative">
                    <input 
                      type="url"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-gray-900 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all text-left"
                      dir="ltr"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Link2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    يمكن الحصول على هذا الرابط بعد نسخ ولصق الكود البرمجي من التبويب الآخر، ثم النشر (Deploy) بصيغة Web App مع إمكانية الوصول للجميع "Anyone".
                  </p>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-800 block">المزامنة التلقائية الفورية (Auto-Sync)</span>
                    <p className="text-[10px] text-gray-500">ترحيل الزيارة آلياً لـ Google Sheet بمجرد قيام المندوب بالتقديم في CRM</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      id="auto-sync-toggle"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <label 
                      htmlFor="auto-sync-toggle"
                      className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600 cursor-pointer"
                    ></label>
                  </div>
                </div>

                {/* Confirm Settings Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => handleSaveConfig(webAppUrl, autoSync)}
                    className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    حفظ وتحديث الإعدادات
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>فحص الاتصال</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sync trigger control box */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-right space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-[10px] text-gray-400 font-mono">STEP 2: ACTIONS PANEL</span>
                <h3 className="text-sm font-black text-gray-950 font-sans flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>عمليات مزامنة البيانات الثنائية المباشرة</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Export (Local CRM -> Google Sheet) */}
                <div className="border border-slate-100 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between whitespace-normal">
                  <div className="space-y-1.5 text-right">
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full inline-block">CRM ➔ GOOGLE SHEETS</span>
                    <h4 className="text-xs font-black text-gray-900">رفع البيانات وتصفير السحاب</h4>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      سيقوم هذا الخيار بنسخ جميع الزيارات والعملاء الموجودين حالياً محلياً على جهازك ومزامنتها لملفك السحابي، لإعادة تفعيل المعادلات والتقرير اليومي.
                    </p>
                  </div>
                  <button
                    onClick={handleExportAllNow}
                    disabled={isSyncing || !webAppUrl}
                    className="w-full mt-4 py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                    <span>رفع المزامنة الكاملة السحابية</span>
                  </button>
                </div>

                {/* Import (Google Sheet -> Local CRM) */}
                <div className="border border-slate-100 bg-slate-50/50 p-5 rounded-2xl flex flex-col justify-between whitespace-normal">
                  <div className="space-y-1.5 text-right">
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">GOOGLE SHEETS ➔ CRM</span>
                    <h4 className="text-xs font-black text-gray-900 font-sans">استيراد وتحديث قاعدة البيانات بالكامل</h4>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      سيقوم بسحب جميع تعديلات وقيم الجداول التي تمت مباشرة على Google Sheets، ليقوم CRM بتحديث إحصاءات المندوبين ولوحة البيانات ومجالات عمل العملاء.
                    </p>
                  </div>
                  <button
                    onClick={handleImportAllNow}
                    disabled={isImporting || !webAppUrl}
                    className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isImporting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>استيراد وتفريغ البيانات السحابية</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Section 2: Sidebar status indicator */}
          <div className="space-y-6">
            
            {/* Status overview card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-right space-y-6">
              <h3 className="text-xs font-mono font-bold text-slate-400">STATUS MONITOR</h3>
              
              <div className="space-y-4">
                {/* State line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${webAppUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <span className="text-xs text-gray-600 font-bold">حالة الربط البرمجي:</span>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    webAppUrl 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {webAppUrl ? 'نشط وقائم' : 'غير متصل بالرابط'}
                  </span>
                </div>

                <hr className="border-gray-100" />

                {/* Auto sync indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-bold">التحديث الخلفي الفوري:</span>
                  <span className={`text-xs font-bold ${autoSync ? 'text-teal-600' : 'text-slate-500'}`}>
                    {autoSync ? 'مفعّل تلقائياً' : 'مغلق (يدوي فقط)'}
                  </span>
                </div>

                <hr className="border-gray-100" />

                {/* Last sync indicators */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 block">تاريخ آخر تزامن سحابي ناجح:</span>
                  <span className="text-xs font-mono font-bold text-gray-900 block" dir="ltr">
                    {lastSyncTime || 'لا يوجد مزامنة مسجلة بعد'}
                  </span>
                </div>

                <hr className="border-gray-100" />

                {/* Records Ready for Sync */}
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-gray-800 block">السجلات المحلية الجاهزة للمزامنة:</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">سجل الزيارات:</span>
                    <span className="font-bold text-gray-950 font-mono bg-white border border-gray-150 px-2 py-0.5 rounded-lg">{visits.length} سجل</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">جهات الاتصال للحسابات:</span>
                    <span className="font-bold text-gray-950 font-mono bg-white border border-gray-150 px-2 py-0.5 rounded-lg">{customers.length} عميل</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick tips */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                <span>توجيهات حل المشكلات</span>
                <HelpCircle className="w-4 h-4 text-slate-500" />
              </h4>
              <ul className="text-[10px] text-slate-600 leading-relaxed text-right space-y-2 mr-3 list-disc">
                <li>عند النشر (Deploy) الأول أو تحديث البرمجة في Apps Script، اختر <b>"إصدار جديد" (New Version)</b> دائماً وطبق صلاحية "Anyone" وإلا سيرفض المتصفح الربط الخارجي.</li>
                <li>تأكد من مطابقة أسماء التبويبات بالملف (Visits Database, Customers, Sales Reps, Follow-Ups).</li>
                <li>يمكن للمدير إدخال الروافع أو النقر على "استيراد" في حال قيام المندوبين بتسجيل الزيارات عبر نموذج خارجي متكامل وتنقيتها.</li>
              </ul>
            </div>

          </div>

        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Section 1: Sheets Structure layout */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-right">
            <h3 className="text-sm font-black text-gray-950 mb-3 font-sans flex items-center justify-end gap-2">
              <span>١. هيكلية جداول الربط المطلوبة على Google Sheet</span>
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            </h3>

            <p className="text-gray-600 text-xs mb-6 max-w-3xl leading-relaxed">
              تأكد من إنشاء الصفحات داخل ملف Google Spreadsheet واحد مع تسميتها تماماً كما هو مكتوب ليتم تصدير وتكامل أسطر البيانات إليها بسلاسة:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-gray-100 bg-slate-50/50 p-4 rounded-2xl text-right">
                <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full text-left inline-block" dir="ltr">Visits Database</span>
                <h4 className="text-xs font-bold text-gray-800 mt-2 mb-1">قاعدة بيانات الزيارات</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  تحتفظ بكل حركة للزيارات: التاريخ، اسم المندوب، النوع، ملخص الزيارة، احتياجات العميل، والفرص وقيمة الأهداف المبرمة.
                </p>
              </div>

              <div className="border border-gray-100 bg-slate-50/50 p-4 rounded-2xl text-right">
                <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full text-left inline-block" dir="ltr">Customers</span>
                <h4 className="text-xs font-bold text-gray-800 mt-2 mb-1">دليل العملاء الفريدين</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  يتم فيها دمج العملاء وتحديث عمر وتعداد الزيارات وعرض الحالة المالية ونطاقات الحساب.
                </p>
              </div>

              <div className="border border-gray-100 bg-slate-50/50 p-4 rounded-2xl text-right">
                <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full text-left inline-block" dir="ltr">Sales Reps</span>
                <h4 className="text-xs font-bold text-gray-800 mt-2 mb-1">قائمة المندوبين</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                  تحتوي على عناوين البريد الإلكتروني لمندوبيك لإرسال التنبيهات المخصصة للمهام القادمة بدقة تامة.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Copy code */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs text-right space-y-6">
            <div>
              <h3 className="text-sm font-black text-gray-950 mb-2 font-sans flex items-center justify-end gap-2">
                <span>٢. نص التكامل البرمجي المتقدم (Google Apps Script)</span>
                <Code className="w-4 h-4 text-teal-600" />
              </h3>
              <p className="text-gray-600 text-xs leading-relaxed max-w-4xl">
                الصق هذا الكود في محرر النصوص البرمجي لملف جوجل شيت لدعم التزامن واستقبال الطلبات وإرسال الإيميلات للمدراء والمندوبين:
              </p>
            </div>

            {/* Steps line */}
            <div className="space-y-2.5 mr-4 font-bold text-gray-700 text-xs">
              <div className="flex items-center gap-2 justify-end">
                <span>انتقل لـ <b>Extensions</b> ➔ <b>Apps Script</b> في واجهة Google Sheets.</span>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black">١</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span>استبدل أي كود هناك والصق الكود بالأسفل.</span>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black">٢</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span>استبدل <code className="bg-gray-100 text-red-500 px-1 py-0.5 font-mono">MANAGER_EMAIL</code> ببريدك الشخصي.</span>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black">٣</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span>انقر على <b>Deploy</b> ➔ <b>New Deployment</b> ➔ اختر <b>Web App</b> وانشر لـ <b>"Anyone"</b>.</span>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black">٤</span>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative border border-gray-200 bg-slate-950 rounded-2xl overflow-hidden text-left shadow-lg" dir="ltr">
              <div className="bg-slate-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>نسخ الكود بالكامل</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] font-mono text-slate-400">select_code_sheets_sync.js</span>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto font-mono text-[11px] text-emerald-400 bg-slate-950 leading-relaxed whitespace-pre">
                {googleAppsScriptCode}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
