/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const FALLBACK_CONFIG = {
  "projectId": "gen-lang-client-0202450278",
  "appId": "1:897941865057:web:d187b1a410368533b56020",
  "apiKey": "AIzaSyAhBm3zi7duAqEP2YE8LAq875Gqax4oe-4",
  "authDomain": "gen-lang-client-0202450278.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-cf26c8fc-80c4-49c9-9b47-5ee3badc526a",
  "storageBucket": "gen-lang-client-0202450278.firebasestorage.app",
  "messagingSenderId": "897941865057",
  "measurementId": ""
};

// Safe resolution of __dirname compatible with both ESM and CommonJS
let currentDirname = '';
try {
  currentDirname = __dirname;
} catch {
  try {
    currentDirname = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    currentDirname = '.';
  }
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring';
  assignedReps: string[]; // Names of the sales representatives, e.g. ["حسام عيد", "مهند"]
  permissions?: string[]; // Granular permission identifiers
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details: string;
}

export interface Visit {
  id: string;
  timestamp: string;
  repId: string;
  repName: string;
  visitSource?: string;
  visitType: 'زيارة جديدة' | 'زيارة متابعة';
  customerName: string;
  activityType?: string;
  requestedProduct?: string;
  contactPerson?: string;
  jobTitle?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  province?: string;
  summary?: string;
  needs?: string;
  interestLevel?: string;
  followUpNotes?: string;
  followUpResult?: string;
  nextStep?: string;
  nextFollowUpDate?: string;
  customerStatus: string;
  expectedOpportunityValue: number;
  attachmentUrl?: string;
  latitude?: number;
  longitude?: number;
  isSubmitted?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  repName?: string;
  repId?: string;
  activity: string;
  requestedProduct?: string;
  contactPerson: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address: string;
  province: string;
  firstVisitDate: string;
  lastVisitDate: string;
  visitsCount: number;
  currentStatus: string;
  opportunityValue: number;
  latitude?: number;
  longitude?: number;
}

// ---------------- Firebase Firestore Bootstrap ----------------
// Intercept and suppress benign Firestore/gRPC-web stream connection warnings/errors in container environments
try {
  setLogLevel('silent');
} catch (e) {
  console.warn('Could not set Firestore log level to silent:', e);
}

const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const msg = args.map(arg => (arg && typeof arg === 'object' && arg.message) ? arg.message : String(arg)).join(' ');
  if (msg.includes('RST_STREAM') || msg.includes('GrpcConnection') || msg.includes('Listen stream') || msg.includes('INTERNAL: Received RST_STREAM')) {
    // Suppress benign Firestore connection resets in server containers
    return;
  }
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
  const msg = args.map(arg => (arg && typeof arg === 'object' && arg.message) ? arg.message : String(arg)).join(' ');
  if (msg.includes('RST_STREAM') || msg.includes('GrpcConnection') || msg.includes('Listen stream') || msg.includes('INTERNAL: Received RST_STREAM')) {
    // Suppress benign Firestore connection resets in server containers
    return;
  }
  originalConsoleWarn.apply(console, args);
};

let db: any;

try {
  let firebaseConfig: any = null;

  if (process.env.FIREBASE_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (parseErr) {
      console.error('Error parsing FIREBASE_CONFIG environment variable:', parseErr);
    }
  }

  if (!firebaseConfig) {
    const pathsToTry = [
      path.join(process.cwd(), 'firebase-applet-config.json'),
      path.join(currentDirname, 'firebase-applet-config.json'),
      path.join(currentDirname, '../firebase-applet-config.json'),
      path.join(currentDirname, '../../firebase-applet-config.json'),
      path.join(currentDirname, '../../../firebase-applet-config.json'),
    ];
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        try {
          const loaded = JSON.parse(fs.readFileSync(p, 'utf-8'));
          if (loaded && loaded.projectId) {
            firebaseConfig = loaded;
            console.log(`Successfully loaded Firebase configuration from: ${p}`);
            break;
          }
        } catch (e) {
          console.error(`Error parsing Firebase config from ${p}:`, e);
        }
      }
    }
  }

  // Fallback if not found on disk (crucial for some serverless environments like Vercel)
  if (!firebaseConfig) {
    console.log('Using compiled fallback Firebase configuration.');
    firebaseConfig = FALLBACK_CONFIG;
  }

  if (firebaseConfig) {
    const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const dbId = firebaseConfig.firestoreDatabaseId || firebaseConfig.databaseId || undefined;
    
    try {
      // First, try to initialize Firestore with custom long-polling settings to prevent hanging in serverless/Vercel
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false
      } as any, dbId);
      console.log(`Firebase Firestore connection successfully bootstrapped (with immediate long-polling) for database context: ${dbId || '(default)'}`);
    } catch (pollingErr) {
      try {
        // If already initialized, retrieve the existing instance
        db = getFirestore(firebaseApp, dbId);
        console.log(`Reused existing Firebase Firestore connection for database context: ${dbId || '(default)'}`);
      } catch (getErr) {
        console.error('Failed to get Firestore instance after initialization collision:', getErr);
        db = getFirestore(firebaseApp, dbId);
      }
    }
  } else {
    console.error('CRITICAL: Firebase configuration is missing. Please set the FIREBASE_CONFIG environment variable or provide firebase-applet-config.json.');
  }
} catch (err) {
  console.error('Firebase initialization error in db.ts:', err);
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// In-memory cache flag to prevent redundant Firestore roundtrips on every simple query
let dbSeeded = false;

// Helper to seed/init default DB entities if empty
export async function seedInitialDatabaseIfEmpty(): Promise<void> {
  if (dbSeeded) return;
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log('Database empty. Seeding initial admin and setup configurations...');
      const adminSalt = generateSalt();
      const defaultAdmin: UserAccount = {
        id: 'usr-admin-default',
        username: 'Elsaady',
        passwordHash: hashPassword('555531', adminSalt),
        salt: adminSalt,
        role: 'Admin',
        assignedReps: [],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', defaultAdmin.id), defaultAdmin);

      // Pre-populate default SalesReps state
      const defaultReps = ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'رنا', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
      await setDoc(doc(db, 'settings', 'sales-reps-config'), { list: defaultReps });

      // Pre-add a system log
      const initLog: ActivityLog = {
        id: 'log-init-uuid',
        timestamp: new Date().toISOString(),
        username: 'System',
        action: 'db_initialized',
        details: 'تم تهيئة وتأسيس قاعدة بيانات Firestore بنجاح مع حساب المدير Elsaady',
      };
      await setDoc(doc(db, 'logs', initLog.id), initLog);
      console.log('Firestore seeding completed successfully!');
    }
    dbSeeded = true;
  } catch (err) {
    console.error('Seeding database failed:', err);
  }
}

// ---------------- USER OPERATIONS ----------------

export async function getUsers(): Promise<UserAccount[]> {
  await seedInitialDatabaseIfEmpty();
  const q = collection(db, 'users');
  const snap = await getDocs(q);
  const list: UserAccount[] = [];
  snap.forEach(d => {
    list.push(d.data() as UserAccount);
  });
  return list;
}

export async function getUserByUsername(username: string): Promise<UserAccount | null> {
  await seedInitialDatabaseIfEmpty();
  const list = await getUsers();
  const match = list.find(u => u.username.toLowerCase() === username.toLowerCase());
  return match || null;
}

export async function getUserById(id: string): Promise<UserAccount | null> {
  const ref = doc(db, 'users', id);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserAccount) : null;
}

export async function createUser(
  username: string,
  passwordPlain: string,
  role: 'Admin' | 'Manager' | 'User',
  assignedReps: string[],
  permissions: string[] = []
): Promise<UserAccount> {
  await seedInitialDatabaseIfEmpty();
  const existing = await getUserByUsername(username);
  if (existing) {
    throw new Error('اسم المستخدم موجود بالفعل مسبقاً');
  }

  const salt = generateSalt();
  const newUser: UserAccount = {
    id: 'usr-' + crypto.randomUUID(),
    username: username,
    passwordHash: hashPassword(passwordPlain, salt),
    salt: salt,
    role: role,
    assignedReps: assignedReps || [],
    permissions: permissions || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', newUser.id), newUser);
  return newUser;
}

export async function updateUser(
  id: string,
  updates: {
    role?: 'Admin' | 'Manager' | 'User';
    assignedReps?: string[];
    permissions?: string[];
  }
): Promise<UserAccount> {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('لم يتم العثور على المستخدم المطلوب');
  }

  const freshUpdates: any = { ...updates, updatedAt: new Date().toISOString() };
  await updateDoc(doc(db, 'users', id), freshUpdates);
  return { ...user, ...updates } as UserAccount;
}

export async function resetUserPassword(id: string, newPasswordPlain: string): Promise<void> {
  const salt = generateSalt();
  const passwordHash = hashPassword(newPasswordPlain, salt);
  await updateDoc(doc(db, 'users', id), {
    salt,
    passwordHash,
    updatedAt: new Date().toISOString()
  });
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<UserAccount> {
  const user = await getUserById(id);
  if (!user) {
    throw new Error('لم يتم العثور على المستخدم المطلوب');
  }
  await updateDoc(doc(db, 'users', id), {
    isActive,
    updatedAt: new Date().toISOString()
  });
  return { ...user, isActive } as UserAccount;
}

// ---------------- AUDIT LOG OPERATIONS ----------------

export async function getLogs(): Promise<ActivityLog[]> {
  const snap = await getDocs(query(collection(db, 'logs'), orderBy('timestamp', 'desc')));
  const logsList: ActivityLog[] = [];
  snap.forEach(d => {
    logsList.push(d.data() as ActivityLog);
  });
  return logsList;
}

export async function addLog(username: string, action: string, details: string): Promise<void> {
  const log: ActivityLog = {
    id: 'log-' + crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    username,
    action,
    details,
  };
  await setDoc(doc(db, 'logs', log.id), log);
}

// ---------------- SALES REPS OPERATIONS ----------------

export async function getSalesReps(): Promise<string[]> {
  await seedInitialDatabaseIfEmpty();
  const snap = await getDoc(doc(db, 'settings', 'sales-reps-config'));
  if (snap.exists()) {
    return snap.data().list;
  }
  const defaultReps = ['حسام عيد', 'مهند', 'احمد زين', 'احمد محمود', 'عبد الرحمن مبروك', 'منار ابراهيم', 'سارة', 'نانسي', 'رنا', 'السعدي عويضة', 'رفيق حفني', 'أخرى'];
  await setDoc(doc(db, 'settings', 'sales-reps-config'), { list: defaultReps });
  return defaultReps;
}

export async function saveSalesReps(reps: string[]): Promise<string[]> {
  await setDoc(doc(db, 'settings', 'sales-reps-config'), { list: reps });
  return reps;
}

// ---------------- VISITS OPERATIONS ----------------

export async function getVisits(): Promise<Visit[]> {
  const q = collection(db, 'visits');
  const snap = await getDocs(q);
  const visitsList: Visit[] = [];
  snap.forEach(d => {
    visitsList.push(d.data() as Visit);
  });
  // Sort descending by timestamp
  return visitsList.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
}

export async function saveVisit(visit: Visit): Promise<Visit> {
  await setDoc(doc(db, 'visits', visit.id), visit);
  return visit;
}

export async function deleteVisit(id: string): Promise<void> {
  await deleteDoc(doc(db, 'visits', id));
}

// ---------------- CUSTOMERS OPERATIONS ----------------

export async function getCustomers(): Promise<Customer[]> {
  const q = collection(db, 'customers');
  const snap = await getDocs(q);
  const customersList: Customer[] = [];
  snap.forEach(d => {
    customersList.push(d.data() as Customer);
  });
  return customersList;
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  await setDoc(doc(db, 'customers', customer.id), customer);
  return customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', id));
}

export async function transferCustomers(
  sourceRepName: string,
  targetRepName: string,
  customerIds?: string[],
  updateVisits: boolean = true
): Promise<{ transferredCustomersCount: number; updatedVisitsCount: number; transferredCustomerIds: string[] }> {
  const allCustomers = await getCustomers();
  const targetCustomers = allCustomers.filter(c => {
    if (customerIds && customerIds.length > 0) {
      return customerIds.includes(c.id);
    }
    return c.repName === sourceRepName;
  });

  const transferredCustomerIds: string[] = [];
  for (const cust of targetCustomers) {
    cust.repName = targetRepName;
    await setDoc(doc(db, 'customers', cust.id), cust);
    transferredCustomerIds.push(cust.id);
  }

  let updatedVisitsCount = 0;
  if (updateVisits && targetCustomers.length > 0) {
    const allVisits = await getVisits();
    const custNames = new Set(targetCustomers.map(c => (c.name || '').trim().toLowerCase()));
    const visitsToUpdate = allVisits.filter(v => 
      custNames.has((v.customerName || '').trim().toLowerCase()) && 
      v.repName === sourceRepName
    );

    for (const v of visitsToUpdate) {
      v.repName = targetRepName;
      await setDoc(doc(db, 'visits', v.id), v);
      updatedVisitsCount++;
    }
  }

  return { 
    transferredCustomersCount: transferredCustomerIds.length, 
    updatedVisitsCount,
    transferredCustomerIds 
  };
}

// ---------------- SYSTEM SETTINGS OPERATIONS ----------------

export interface SystemSettings {
  id?: string;
  companyName?: string;
  companyLogo?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const snap = await getDoc(doc(db, 'settings', 'company-profile'));
  if (snap.exists()) {
    return snap.data() as SystemSettings;
  }
  return {
    id: 'company-profile',
    companyName: 'Select Code',
    companyLogo: '/path-to-logo.png'
  };
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const existing = await getSystemSettings();
  const updated: SystemSettings = {
    ...existing,
    ...settings,
    id: 'company-profile',
    updatedAt: new Date().toISOString()
  };

  // Guard against Firestore 1MB document limit
  if (updated.companyLogo && typeof updated.companyLogo === 'string') {
    if (updated.companyLogo.startsWith('data:') && updated.companyLogo.length > 600 * 1024) {
      throw new Error('حجم ملف الشعار يتجاوز الحد الأقصى لقاعدة البيانات السحابية (600 كيلوبايت). يرجى استخدام صورة مضغوطة.');
    }
  }

  await setDoc(doc(db, 'settings', 'company-profile'), updated);
  return updated;
}

// ---------------- TECHNICAL SUPPORT OPERATIONS ----------------

export interface SupportTask {
  id: string;
  customerId: string;
  customerName: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  taskType: 'Final Version Installation' | 'Trial Version Installation' | 'Demo Presentation' | 'Training Session' | 'Maintenance' | 'Technical Issue Resolution' | 'Other';
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'New' | 'In Progress' | 'Waiting Customer Response' | 'Completed' | 'Cancelled';
  createdAt: string;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  updatedAt: string;
  
  // Demo Presentation specific
  demoDate?: string | null;
  demoTime?: string | null;
  demoNotes?: string | null;
  demoObjective?: string | null;
  
  // Trial Installation specific
  trialStartDate?: string | null;
  trialExpirationDate?: string | null;
}

export interface SupportNote {
  id: string;
  taskId: string;
  note: string;
  author: string;
  timestamp: string;
  type?: 'general' | 'visit' | 'installation' | 'demo';
}

export interface SupportStatusHistory {
  id: string;
  taskId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  timestamp: string;
}

export interface TrialInstallation {
  id: string;
  customerId: string;
  customerName: string;
  taskId: string;
  startDate: string;
  expirationDate: string;
  status: 'Active' | 'Expired';
  createdBy: string;
  createdAt: string;
}

export interface MonitoringRecord {
  id: string;
  customerId: string;
  customerName: string;
  employeeId: string;
  employeeName: string;
  callResult: string;
  customerSatisfactionLevel: number; // 1-5
  issuesReported: string;
  recommendations: string;
  nextFollowUpDate: string;
  notes: string;
  status: 'Customer Interested' | 'Customer Not Interested' | 'Needs Follow-up' | 'Complaint Opened' | 'Technical Issue Reported' | 'Customer Satisfied' | 'Customer Unsatisfied';
  createdAt: string;
  createdBy: string;
}

export interface MonitoringStatusHistory {
  id: string;
  customerId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  timestamp: string;
}

export interface CRMNotification {
  id: string;
  type: 'new_task' | 'demo_assignment' | 'trial_expiry' | 'followup_reminder' | 'complaint_open' | 'pending_task';
  title: string;
  message: string;
  recipientId: string; // user ID or "All" or "Admin" or "Support" or "Monitoring"
  recipientRole?: string | null;
  isRead: boolean;
  createdAt: string;
  relatedId?: string | null;
}

export async function getSupportTasks(): Promise<SupportTask[]> {
  const q = collection(db, 'support_tasks');
  const snap = await getDocs(q);
  const list: SupportTask[] = [];
  snap.forEach(d => {
    list.push(d.data() as SupportTask);
  });
  return list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveSupportTask(task: SupportTask): Promise<SupportTask> {
  await setDoc(doc(db, 'support_tasks', task.id), task);
  return task;
}

export async function deleteSupportTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'support_tasks', id));
}

export async function getSupportNotes(taskId?: string): Promise<SupportNote[]> {
  const q = collection(db, 'support_notes');
  const snap = await getDocs(q);
  const list: SupportNote[] = [];
  snap.forEach(d => {
    const item = d.data() as SupportNote;
    if (!taskId || item.taskId === taskId) {
      list.push(item);
    }
  });
  return list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
}

export async function saveSupportNote(note: SupportNote): Promise<SupportNote> {
  await setDoc(doc(db, 'support_notes', note.id), note);
  return note;
}

export async function getSupportStatusHistory(taskId?: string): Promise<SupportStatusHistory[]> {
  const q = collection(db, 'support_status_history');
  const snap = await getDocs(q);
  const list: SupportStatusHistory[] = [];
  snap.forEach(d => {
    const item = d.data() as SupportStatusHistory;
    if (!taskId || item.taskId === taskId) {
      list.push(item);
    }
  });
  return list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
}

export async function saveSupportStatusHistory(hist: SupportStatusHistory): Promise<SupportStatusHistory> {
  await setDoc(doc(db, 'support_status_history', hist.id), hist);
  return hist;
}

export async function getTrialInstallations(): Promise<TrialInstallation[]> {
  const q = collection(db, 'trial_installations');
  const snap = await getDocs(q);
  const list: TrialInstallation[] = [];
  snap.forEach(d => {
    list.push(d.data() as TrialInstallation);
  });
  return list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveTrialInstallation(trial: TrialInstallation): Promise<TrialInstallation> {
  await setDoc(doc(db, 'trial_installations', trial.id), trial);
  return trial;
}

export async function getMonitoringRecords(customerId?: string): Promise<MonitoringRecord[]> {
  const q = collection(db, 'monitoring_records');
  const snap = await getDocs(q);
  const list: MonitoringRecord[] = [];
  snap.forEach(d => {
    const item = d.data() as MonitoringRecord;
    if (!customerId || item.customerId === customerId) {
      list.push(item);
    }
  });
  return list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveMonitoringRecord(rec: MonitoringRecord): Promise<MonitoringRecord> {
  await setDoc(doc(db, 'monitoring_records', rec.id), rec);
  return rec;
}

export async function getMonitoringStatusHistory(customerId?: string): Promise<MonitoringStatusHistory[]> {
  const q = collection(db, 'monitoring_status_history');
  const snap = await getDocs(q);
  const list: MonitoringStatusHistory[] = [];
  snap.forEach(d => {
    const item = d.data() as MonitoringStatusHistory;
    if (!customerId || item.customerId === customerId) {
      list.push(item);
    }
  });
  return list.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
}

export async function saveMonitoringStatusHistory(hist: MonitoringStatusHistory): Promise<MonitoringStatusHistory> {
  await setDoc(doc(db, 'monitoring_status_history', hist.id), hist);
  return hist;
}

export async function getNotifications(): Promise<CRMNotification[]> {
  const q = collection(db, 'notifications');
  const snap = await getDocs(q);
  const list: CRMNotification[] = [];
  snap.forEach(d => {
    list.push(d.data() as CRMNotification);
  });
  return list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveNotification(notif: CRMNotification): Promise<CRMNotification> {
  await setDoc(doc(db, 'notifications', notif.id), notif);
  return notif;
}

export async function updateNotificationRead(id: string, isRead: boolean): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { isRead });
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', id));
}

export interface MonitoringRepTask {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  repName: string;
  taskType: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  repFeedback?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export async function getMonitoringRepTasks(filter?: { repName?: string; customerId?: string }): Promise<MonitoringRepTask[]> {
  const q = collection(db, 'monitoring_rep_tasks');
  const snap = await getDocs(q);
  const list: MonitoringRepTask[] = [];
  snap.forEach(d => {
    const item = d.data() as MonitoringRepTask;
    if (filter?.repName && item.repName !== filter.repName) return;
    if (filter?.customerId && item.customerId !== filter.customerId) return;
    list.push(item);
  });
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveMonitoringRepTask(task: MonitoringRepTask): Promise<MonitoringRepTask> {
  await setDoc(doc(db, 'monitoring_rep_tasks', task.id), task);
  return task;
}

export async function updateMonitoringRepTask(id: string, updates: Partial<MonitoringRepTask>): Promise<MonitoringRepTask | null> {
  const ref = doc(db, 'monitoring_rep_tasks', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const current = snap.data() as MonitoringRepTask;
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await setDoc(ref, updated);
  return updated;
}

export async function deleteMonitoringRepTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'monitoring_rep_tasks', id));
}
