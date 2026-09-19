/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { 
  getUsers, 
  getLogs, 
  addLog, 
  createUser, 
  updateUser, 
  resetUserPassword, 
  toggleUserStatus, 
  hashPassword,
  generateSalt,
  getSalesReps,
  saveSalesReps,
  getVisits,
  saveVisit,
  deleteVisit,
  getCustomers,
  saveCustomer,
  deleteCustomer,
  transferCustomers,
  getSystemSettings,
  saveSystemSettings,
  getSupportTasks,
  saveSupportTask,
  deleteSupportTask,
  getSupportNotes,
  saveSupportNote,
  getSupportStatusHistory,
  saveSupportStatusHistory,
  getTrialInstallations,
  saveTrialInstallation,
  getMonitoringRecords,
  saveMonitoringRecord,
  getMonitoringStatusHistory,
  saveMonitoringStatusHistory,
  getNotifications,
  saveNotification,
  updateNotificationRead,
  deleteNotification,
  getMonitoringRepTasks,
  saveMonitoringRepTask,
  updateMonitoringRepTask,
  deleteMonitoringRepTask
} from "./src/server/db";

async function fetchGoogleSheets(
  url: string,
  options: { method: 'GET' | 'POST'; body?: string; headers?: Record<string, string> }
): Promise<{ ok: boolean; status: number; text: string }> {
  let currentUrl = url;
  let currentMethod = options.method;
  let currentBody = options.method === 'POST' ? options.body : undefined;
  
  const currentHeaders = { ...(options.headers || {}) };
  if (currentMethod === 'GET') {
    delete currentHeaders['Content-Type'];
  }

  let attempts = 0;
  const maxRedirects = 8;

  while (attempts < maxRedirects) {
    attempts++;
    
    const fetchOptions: any = {
      method: currentMethod,
      headers: currentHeaders,
      redirect: 'manual'
    };

    if (currentMethod !== 'GET' && currentBody !== undefined) {
      fetchOptions.body = currentBody;
    }

    const response = await fetch(currentUrl, fetchOptions);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Google Web App returned an empty redirect header (Location header missing)');
      }
      currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
      
      currentMethod = 'GET';
      currentBody = undefined;
      delete currentHeaders['Content-Type'];
      continue;
    }

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text: text
    };
  }

  throw new Error('Too many redirects while communicating with Google Sheets Web App');
}

export async function createApp() {
  const app = express();
  const PORT = 3000;

  // Set up standard express parsers
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Store active sessions: Token -> User state format
  const activeSessions = new Map<string, {
    id: string;
    username: string;
    role: 'Admin' | 'Manager' | 'User' | 'TechnicalSupport' | 'Monitoring';
    assignedReps: string[];
    permissions: string[];
    isActive: boolean;
  }>();

  const JWT_SECRET = process.env.JWT_SECRET || "fallback_sales_visit_crm_secret_key_2026";

  const getSessionFromToken = (token: string) => {
    if (!token) return null;
    if (activeSessions.has(token)) {
      return activeSessions.get(token);
    }
    
    // Attempt cryptographic decode to restore sessions in serverless/Vercel scaling environments
    try {
      if (token.startsWith("tok_")) {
        return null;
      }
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [payload, signature] = parts;
      const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
      if (signature !== expectedSignature) return null;
      
      const sessionData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (Date.now() > sessionData.exp) return null;
      
      // Cache in active memory map for fast lookup
      activeSessions.set(token, sessionData);
      return sessionData;
    } catch (err) {
      return null;
    }
  };

  // Authentication Middleware
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', error: 'تنبيه: يرجى تسجيل الدخول للوصول إلى النظام' });
    }
    const token = authHeader.split(' ')[1];
    const session = getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ status: 'error', error: 'تنبيه: انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
    }

    // Refresh live status checking against Firestore
    try {
      const users = await getUsers();
      const freshUser = users.find(u => u.id === session.id);
      if (!freshUser || !freshUser.isActive) {
        activeSessions.delete(token);
        return res.status(401).json({ status: 'error', error: 'تم تعطيل أو إيقاف حسابك من قبل الإدارة' });
      }
      
      // Invalidate token if password has been reset/changed
      if (session.passwordHash && session.passwordHash !== freshUser.passwordHash) {
        activeSessions.delete(token);
        return res.status(401).json({ status: 'error', error: 'تم تغيير كلمة المرور، يرجى تسجيل الدخول مجدداً' });
      }

      req.user = freshUser;
      next();
    } catch (err: any) {
      // Fallback to active memory session if connection fails momentarily
      req.user = session;
      next();
    }
  };

  // Authorization Role Guards
  const requireAdminRole = (req: any, res: any, next: any) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ status: "error", error: "عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام فقط" });
    }
    next();
  };

  // ==================== AUTHENTICATION ROUTES ====================
  
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: "error", error: "جميع الحقول (اسم المستخدم وكلمة المرور) مطلوبة" });
    }

    try {
      const users = await getUsers();
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        await addLog(username, "login_failed", "اسم مستخدم غير موجود أو منتهي الصلاحية");
        return res.status(401).json({ status: "error", error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      if (!user.isActive) {
        await addLog(username, "login_failed", "محاولة دخول على حساب معطل ومجمد");
        return res.status(401).json({ status: "error", error: "تم تجميد حسابك حالياً. يرجى مراجعة مدير النظام" });
      }

      const calculatedHash = hashPassword(password, user.salt);
      if (calculatedHash !== user.passwordHash) {
        await addLog(username, "login_failed", "كلمة مرور غير مرحب بها أو خاطئة");
        return res.status(401).json({ status: "error", error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      // Generate secure signed session token
      const sessionData = {
        id: user.id,
        username: user.username,
        role: user.role,
        assignedReps: user.assignedReps || [],
        permissions: user.permissions || [],
        isActive: user.isActive,
        passwordHash: user.passwordHash
      };
      
      const payload = Buffer.from(JSON.stringify({
        ...sessionData,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days expiration
      })).toString('base64url');
      const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
      const token = `${payload}.${signature}`;
      
      activeSessions.set(token, sessionData);
      await addLog(username, "login_success", "تم تسجيل الدخول للنظام بنجاح");

      return res.json({
        status: "success",
        token,
        user: sessionData
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "خطأ داخلي أثناء تسجيل الدخول" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', error: 'غير مسجل دخول' });
    }
    const token = authHeader.split(' ')[1];
    const session = getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ status: 'error', error: 'انتهت صلاحية الجلسة' });
    }

    try {
      const users = await getUsers();
      const dbUser = users.find(u => u.id === session.id);
      if (!dbUser || !dbUser.isActive) {
        activeSessions.delete(token);
        return res.status(401).json({ status: 'error', error: 'الحساب معطل أو غير متوفر' });
      }

      return res.json({
        status: "success",
        user: {
          id: dbUser.id,
          username: dbUser.username,
          role: dbUser.role,
          assignedReps: dbUser.assignedReps || [],
          permissions: dbUser.permissions || [],
          isActive: dbUser.isActive
        }
      });
    } catch (err) {
      return res.json({ status: "success", user: session });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const session = getSessionFromToken(token);
      if (session) {
        await addLog(session.username, "logout", "تم الخروج الآمن وتسجيل الخروج بنجاح");
        activeSessions.delete(token);
      }
    }
    return res.json({ status: "success" });
  });

  // ==================== ADMIN USER MANAGEMENT ROUTES ====================

  // Get active users list
  app.get("/api/admin/users", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    try {
      const dbUsers = await getUsers();
      const usersList = dbUsers.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        assignedReps: u.assignedReps || [],
        permissions: u.permissions || [],
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
      return res.json({ status: "success", users: usersList });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Create standard/admin user
  app.post("/api/admin/users", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { username, password, role, assignedReps, permissions } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ status: "error", error: "جميع الحقول (اسم المستخدم، كلمة المرور، الدور) مطلوبة" });
    }
    try {
      const newUser = await createUser(username, password, role, assignedReps, permissions || []);
      await addLog(req.user.username, "user_created", `تم إنشاء حساب مستخدم للزميل: ${username} كـ مستشار مبيعات بصفة (${role})`);
      return res.json({ 
        status: "success", 
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          assignedReps: newUser.assignedReps,
          permissions: newUser.permissions || [],
          isActive: newUser.isActive
        }
      });
    } catch (err: any) {
      return res.status(400).json({ status: "error", error: err.message || "فشل إنشاء المستخدم" });
    }
  });

  // Edit User assigned reps & role
  app.put("/api/admin/users/:id", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { id } = req.params;
    const { role, assignedReps, permissions } = req.body;
    try {
      const updated = await updateUser(id, { role, assignedReps, permissions });
      await addLog(req.user.username, "permission_changed", `تعديل صلاحيات وتوزيع حصص مندوبين الحساب للمستخدم: ${updated.username}`);
      
      for (const [token, session] of activeSessions.entries()) {
        if (session.id === id) {
          activeSessions.set(token, {
            ...session,
            role: updated.role,
            assignedReps: updated.assignedReps,
            permissions: updated.permissions || []
          });
        }
      }
      return res.json({ 
        status: "success", 
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          assignedReps: updated.assignedReps,
          permissions: updated.permissions || [],
          isActive: updated.isActive
        }
      });
    } catch (err: any) {
      return res.status(400).json({ status: "error", error: err.message || "فشل تعديل المستخدم" });
    }
  });

  // Reset password
  app.post("/api/admin/users/:id/reset-password", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ status: "error", error: "كلمة المرور الجديدة مطلوبة" });
    }
    try {
      await resetUserPassword(id, password);
      const dbUsers = await getUsers();
      const targetUser = dbUsers.find(u => u.id === id);
      const targetUsername = targetUser ? targetUser.username : "غير معروف";
      
      await addLog(req.user.username, "password_reset", `إعادة تعيين وتصحيح كلمة المرور التابعة للمستخدم: ${targetUsername}`);
      
      for (const [token, session] of activeSessions.entries()) {
        if (session.id === id) {
          activeSessions.delete(token);
        }
      }
      return res.json({ status: "success", message: "تمت إعادة تعيين كلمة المرور بنجاح" });
    } catch (err: any) {
      return res.status(400).json({ status: "error", error: err.message || "فشل إعادة تعيين كلمة المرور" });
    }
  });

  // Toggle activation status
  app.put("/api/admin/users/:id/status", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { id } = req.params;
    const { isActive } = req.body;
    if (isActive === undefined) {
      return res.status(400).json({ status: "error", error: "حالة التنشيط مطلوبة" });
    }
    try {
      const updated = await toggleUserStatus(id, isActive);
      const action = isActive ? "user_activated" : "user_deactivated";
      await addLog(req.user.username, action, `تم ${isActive ? "تنشيط وإتاحة" : "تجميد وتعطيل"} حساب المستخدم: ${updated.username}`);
      
      if (!isActive) {
        for (const [token, session] of activeSessions.entries()) {
          if (session.id === id) {
            activeSessions.delete(token);
          }
        }
      }

      return res.json({ 
        status: "success", 
        user: {
          id: updated.id,
          username: updated.username,
          isActive: updated.isActive
        }
      });
    } catch (err: any) {
      return res.status(400).json({ status: "error", error: err.message || "فشل تغيير حالة تفعيل المستخدم" });
    }
  });

  // ==================== ADMIN SALES REPS MANAGEMENT ROUTES ====================

  // Get sales reps list
  app.get("/api/admin/salesreps", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    try {
      const reps = await getSalesReps();
      return res.json({ status: "success", salesReps: reps });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "حدث خطأ أثناء تحميل المناديب" });
    }
  });

  // Add sales rep
  app.post("/api/admin/salesreps", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: "error", error: "اسم المندوب مطلوب" });
    }
    const trimmed = name.trim();
    try {
      const reps = await getSalesReps();
      if (reps.includes(trimmed)) {
        return res.status(400).json({ status: "error", error: "هذا المندوب مسجل بالفعل" });
      }
      
      const otherIdx = reps.indexOf('أخرى');
      const newList = [...reps];
      if (otherIdx !== -1) {
        newList.splice(otherIdx, 0, trimmed);
      } else {
        newList.push(trimmed);
        newList.push('أخرى');
      }
      await saveSalesReps(newList);
      await addLog(req.user.username, "salesrep_added", `تم إضافة مندوب مبيعات جديد: ${trimmed}`);
      return res.json({ status: "success", salesReps: newList });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "فشل تسجيل المندوب" });
    }
  });

  // Edit/Rename sales rep
  app.put("/api/admin/salesreps/:name", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { name } = req.params;
    const { newName } = req.body;
    if (!name || !newName || !newName.trim()) {
      return res.status(400).json({ status: "error", error: "الاسم الحالي والاسم الجديد كلاهما مطلوب" });
    }
    const oldName = name.trim();
    const trimmedNewName = newName.trim();

    if (oldName === 'أخرى') {
      return res.status(400).json({ status: "error", error: "لا يمكن تعديل المندوب الافتراضي 'أخرى'" });
    }
    if (trimmedNewName === 'أخرى') {
      return res.status(400).json({ status: "error", error: "لا يمكن استخدام الاسم الافتراضي 'أخرى'" });
    }

    try {
      const reps = await getSalesReps();
      if (!reps.includes(oldName)) {
        return res.status(404).json({ status: "error", error: "المندوب غير موجود بالنظام" });
      }
      if (trimmedNewName !== oldName && reps.includes(trimmedNewName)) {
        return res.status(400).json({ status: "error", error: "اسم المندوب الجديد مسجل بالفعل لمندوب آخر" });
      }

      const newList = reps.map(r => r === oldName ? trimmedNewName : r);
      await saveSalesReps(newList);

      // Update user accounts that have this rep assigned
      try {
        const dbUsers = await getUsers();
        for (const u of dbUsers) {
          if (u.assignedReps && u.assignedReps.includes(oldName)) {
            const updatedAssigned = u.assignedReps.map(r => r === oldName ? trimmedNewName : r);
            await updateUser(u.id, { assignedReps: updatedAssigned });
          }
        }
      } catch (userSyncErr) {
        console.warn("Could not sync updated rep name in users:", userSyncErr);
      }

      // Update visits associated with the old rep name
      try {
        const allVisits = await getVisits();
        for (const v of allVisits) {
          if (v.repName === oldName) {
            await saveVisit({ ...v, repName: trimmedNewName });
          }
        }
      } catch (visitSyncErr) {
        console.warn("Could not sync updated rep name in visits:", visitSyncErr);
      }

      // Update customers associated with the old rep name
      try {
        const allCustomers = await getCustomers();
        for (const c of allCustomers) {
          if (c.repName === oldName) {
            await saveCustomer({ ...c, repName: trimmedNewName });
          }
        }
      } catch (custSyncErr) {
        console.warn("Could not sync updated rep name in customers:", custSyncErr);
      }

      await addLog(req.user.username, "salesrep_updated", `تم تعديل اسم مندوب المبيعات من [${oldName}] إلى [${trimmedNewName}]`);
      return res.json({ status: "success", salesReps: newList });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "فشل تعديل اسم المندوب" });
    }
  });

  // Delete sales rep
  app.delete("/api/admin/salesreps/:name", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ status: "error", error: "اسم المندوب مطلوب" });
    }
    try {
      const reps = await getSalesReps();
      if (!reps.includes(name)) {
        return res.status(404).json({ status: "error", error: "المندوب غير موجود بالنظام" });
      }
      if (name === 'أخرى') {
        return res.status(400).json({ status: "error", error: "لا يمكن حذف العنصر الافتراضي 'أخرى'" });
      }
      const newList = reps.filter(r => r !== name);
      await saveSalesReps(newList);
      await addLog(req.user.username, "salesrep_deleted", `تم حذف مندوب مبيعات: ${name}`);
      return res.json({ status: "success", salesReps: newList });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "فشل حذف المندوب" });
    }
  });

  // Retrieve logs list
  app.get("/api/admin/logs", authenticateToken, requireAdminRole, async (req: any, res: any) => {
    return res.json({ status: "success", logs: await getLogs() });
  });

  // Create manual audit log
  app.post("/api/admin/logs", authenticateToken, async (req: any, res: any) => {
    const { action, details } = req.body;
    if (!action || !details) {
      return res.status(400).json({ status: "error", error: "البيانات المطلوبة ناقصة" });
    }
    await addLog(req.user.username, action, details);
    return res.json({ status: "success" });
  });

  // ==================== VISITS CRUD API ====================

  app.get("/api/visits", authenticateToken, async (req: any, res: any) => {
    try {
      const rawVisits = await getVisits();
      if (req.user.role === 'User') {
        const allowedReps = req.user.assignedReps || [];
        const filtered = rawVisits.filter((v: any) => allowedReps.includes(v.repName));
        return res.json({ status: "success", visits: filtered });
      }
      return res.json({ status: "success", visits: rawVisits });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/visits", authenticateToken, async (req: any, res: any) => {
    const { visit } = req.body;
    if (!visit || !visit.id) {
      return res.status(400).json({ status: "error", error: "بيانات الزيارة غير مكتملة" });
    }

    // Role restrictions
    if (req.user.role === 'TechnicalSupport' || req.user.role === 'Monitoring') {
      return res.status(403).json({ status: "error", error: "عذراً، لا تمتلك الصلاحيات الكافية لتسجيل زيارات أو مبيعات جديدة" });
    }

    if (req.user.role === 'User') {
      const allowedReps = req.user.assignedReps || [];
      if (!allowedReps.includes(visit.repName)) {
        return res.status(403).json({ status: "error", error: `عذراً، غير مصرح لك بإضافة زيارة للمندوب: ${visit.repName}` });
      }
    }

    try {
      const saved = await saveVisit(visit);
      // Auto register log
      await addLog(req.user.username, "visit_added", `تم تسجيل زيارة جديدة لـ ${visit.customerName}`);
      return res.json({ status: "success", visit: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.put("/api/visits/:id", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { visit } = req.body;
    if (!visit) {
      return res.status(400).json({ status: "error", error: "بيانات التعديل مطلوبة" });
    }

    // Role/Permission checks
    if (req.user.role === 'User') {
      const allowedReps = req.user.assignedReps || [];
      if (!allowedReps.includes(visit.repName)) {
        return res.status(403).json({ status: "error", error: `عذراً، غير مصرح لك بتعديل زيارة المندوب: ${visit.repName}` });
      }
    }

    try {
      const saved = await saveVisit({ ...visit, id });
      await addLog(req.user.username, "visit_updated", `تعديل تفاصيل زيارة العميل: ${visit.customerName}`);
      return res.json({ status: "success", visit: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.delete("/api/visits/:id", authenticateToken, async (req: any, res: any) => {
    // Permission checks - Only Admin and Manager are allowed to delete visits
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({ status: "error", error: "عذراً، لا تمتلك صلاحيات كافية لحذف سجلات الزيارات" });
    }
    const { id } = req.params;
    try {
      await deleteVisit(id);
      await addLog(req.user.username, "visit_deleted", `حذف مستند الزيارة معرف: ${id}`);
      return res.json({ status: "success" });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Manual Follow-up Reminder Dismissal API
  app.post("/api/visits/:id/dismiss-reminder", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    try {
      const visits = await getVisits();
      const targetVisit = visits.find(v => v.id === id);
      if (!targetVisit) {
        return res.status(404).json({ status: "error", error: "سجل الزيارة غير موجود" });
      }

      // Role/Permission checks
      if (req.user.role === 'User') {
        const allowedReps = req.user.assignedReps || [];
        if (!allowedReps.includes(targetVisit.repName)) {
          return res.status(403).json({ status: "error", error: `عذراً، غير مصرح لك بتعديل تذكير المندوب: ${targetVisit.repName}` });
        }
      }

      const updatedVisit = {
        ...targetVisit,
        reminderDismissed: true,
        reminderDismissedAt: new Date().toISOString(),
        reminderDismissedBy: req.user.username,
        reminderDismissReason: reason || "تمت إزالة التذكير يدوياً"
      };

      const saved = await saveVisit(updatedVisit);
      await addLog(req.user.username, "reminder_dismissed", `إزالة تذكير المتابعة يدوياً للعميل: ${targetVisit.customerName}`);
      return res.json({ status: "success", visit: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Restore Follow-up Reminder API
  app.post("/api/visits/:id/restore-reminder", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const visits = await getVisits();
      const targetVisit = visits.find(v => v.id === id);
      if (!targetVisit) {
        return res.status(404).json({ status: "error", error: "سجل الزيارة غير موجود" });
      }

      // Role/Permission checks
      if (req.user.role === 'User') {
        const allowedReps = req.user.assignedReps || [];
        if (!allowedReps.includes(targetVisit.repName)) {
          return res.status(403).json({ status: "error", error: `عذراً، غير مصرح لك بتعديل تذكير المندوب: ${targetVisit.repName}` });
        }
      }

      const updatedVisit = {
        ...targetVisit,
        reminderDismissed: false,
        reminderDismissedAt: undefined,
        reminderDismissedBy: undefined,
        reminderDismissReason: undefined
      };

      const saved = await saveVisit(updatedVisit);
      await addLog(req.user.username, "reminder_restored", `إعادة تفعيل تذكير المتابعة للعميل: ${targetVisit.customerName}`);
      return res.json({ status: "success", visit: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // ==================== CUSTOMERS CRUD API ====================

  app.get("/api/customers", authenticateToken, async (req: any, res: any) => {
    try {
      const rawCustomers = await getCustomers();
      if (req.user.role === 'User') {
        const allowedReps = req.user.assignedReps || [];
        const rawVisits = await getVisits();
        const visitsOfReps = rawVisits.filter((v: any) => allowedReps.includes(v.repName));
        const allowedCustomerNames = new Set(visitsOfReps.map((v: any) => (v.customerName || '').trim().toLowerCase()));

        const filtered = rawCustomers.filter((c: any) => {
          if (!c.name) return false;
          const keyLower = c.name.trim().toLowerCase();
          if (c.repName && allowedReps.includes(c.repName)) {
            return true;
          }
          return allowedCustomerNames.has(keyLower);
        });

        return res.json({ status: "success", customers: filtered });
      }
      return res.json({ status: "success", customers: rawCustomers });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/customers", authenticateToken, async (req: any, res: any) => {
    const { customer } = req.body;
    if (!customer || !customer.id) {
      return res.status(400).json({ status: "error", error: "بيانات العميل غير مكتملة" });
    }
    try {
      const saved = await saveCustomer(customer);
      return res.json({ status: "success", customer: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.put("/api/customers/:id", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { customer } = req.body;
    if (!customer) {
      return res.status(400).json({ status: "error", error: "بيانات العميل مطلوبة" });
    }
    try {
      const saved = await saveCustomer({ ...customer, id });
      return res.json({ status: "success", customer: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.delete("/api/customers/:id", authenticateToken, async (req: any, res: any) => {
    // Only Admin and Manager can delete customers
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({ status: "error", error: "عذراً، لا تمتلك الصلاحيات الكافية لحذف بيانات العملاء" });
    }
    const { id } = req.params;
    try {
      await deleteCustomer(id);
      return res.json({ status: "success" });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Transfer customers between sales reps
  app.post("/api/customers/transfer", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return res.status(403).json({ 
        status: "error", 
        error: "عذراً، نقل عملاء المناديب مقتصر على مدير النظام والمديرين فقط" 
      });
    }

    const { sourceRepName, targetRepName, customerIds, updateVisits = true, notes } = req.body;

    if (!sourceRepName || !targetRepName) {
      return res.status(400).json({ 
        status: "error", 
        error: "يجب تحديد المندوب الحالي والمندوب البديل لإتمام عملية النقل" 
      });
    }

    if (sourceRepName.trim().toLowerCase() === targetRepName.trim().toLowerCase()) {
      return res.status(400).json({ 
        status: "error", 
        error: "لا يمكن النقل إلى نفس المندوب. يرجى اختيار مندوب بديل مختلف" 
      });
    }

    try {
      const result = await transferCustomers(
        sourceRepName.trim(), 
        targetRepName.trim(), 
        Array.isArray(customerIds) && customerIds.length > 0 ? customerIds : undefined,
        updateVisits
      );

      // Audit Log
      await addLog(
        req.user.username,
        "نقل عملاء مندوب",
        `تم نقل ${result.transferredCustomersCount} عميل من [${sourceRepName}] إلى [${targetRepName}]. تم تحديث ${result.updatedVisitsCount} سجل وزيارة متابعة. ${notes ? `(ملاحظات: ${notes})` : ''}`
      );

      return res.json({
        status: "success",
        transferredCount: result.transferredCustomersCount,
        updatedVisitsCount: result.updatedVisitsCount,
        transferredCustomerIds: result.transferredCustomerIds,
        sourceRepName,
        targetRepName
      });
    } catch (err: any) {
      console.error("Error in /api/customers/transfer:", err);
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // ==================== SYSTEM SETTINGS API ====================

  app.get("/api/settings", authenticateToken, async (req: any, res: any) => {
    try {
      const settings = await getSystemSettings();
      return res.json({ status: "success", settings });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/settings", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        status: "error", 
        error: "عذراً، تعديل إعدادات وشعار النظام مخصص لمدير النظام فقط" 
      });
    }

    try {
      if (req.body.companyLogo && typeof req.body.companyLogo === 'string') {
        const logoStr = req.body.companyLogo;
        if (logoStr.startsWith('data:') && logoStr.length > 550 * 1024) {
          return res.status(400).json({
            status: "error",
            error: "حجم ملف الشعار يتجاوز الحد الأقصى المسموح به لقاعدة البيانات (500 كيلوبايت). يرجى رفع صورة مقتطعة ومضغوطة للشعار."
          });
        }
      }

      const updated = await saveSystemSettings({
        ...req.body,
        updatedBy: req.user.username
      });

      // Audit Log
      await addLog(
        req.user.username,
        "تعديل إعدادات النظام",
        `تم تحديث هوية وشعار النظام بواسطة مدير النظام [${req.user.username}].`
      );

      return res.json({ status: "success", settings: updated });
    } catch (err: any) {
      console.error("Save system settings error:", err);
      let message = err.message || "حدث خطأ أثناء حفظ إعدادات النظام";
      if (typeof message === 'string' && (message.includes('exceeds the maximum allowed size') || message.includes('1,048,576 bytes'))) {
        message = "حجم الشعار يتجاوز الحد الأقصى المسموح به لقاعدة البيانات (1 ميجابايت). تم تفعيل الضغط التلقائي للصور لتفادي هذه المشكلة.";
      }
      return res.status(500).json({ status: "error", error: message });
    }
  });

  // ==================== SECURED GOOGLE SHEETS PROXY API ====================

  // Check connection
  app.post("/api/sheets/test", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ status: "error", error: "عذراً، هذا الإجراء مخصص لمدير النظام فقط كجزء من إدارة قواعد البيانات والربط البرمجي" });
    }
    const { webAppUrl } = req.body;
    if (!webAppUrl) {
      return res.status(400).json({ status: "error", error: "رابط Google Web App مطلوب" });
    }
    try {
      const result = await fetchGoogleSheets(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "ping" })
      });
      
      if (!result.ok) {
        throw new Error(`خطأ استجابة: ${result.status}`);
      }
      
      const data = JSON.parse(result.text);
      return res.json(data);
    } catch (err: any) {
      try {
        const targetUrl = webAppUrl.includes("?") ? `${webAppUrl}&action=ping` : `${webAppUrl}?action=ping`;
        const resultGet = await fetchGoogleSheets(targetUrl, {
          method: 'GET'
        });
        if (resultGet.ok) {
          const data = JSON.parse(resultGet.text);
          return res.json(data);
        }
      } catch (innerErr) {
        // Fall through
      }
      return res.status(500).json({ status: "error", error: err.message || "فشل الاتصال من السيرفر بـ Google App Script" });
    }
  });

  // Sync to sheets with permission checking, write back to Firestore to align both cloud environments perfectly!
  app.post("/api/sheets/sync", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ status: "error", error: "عذراً، هذا الإجراء مخصص لمدير النظام فقط كجزء من إدارة قواعد البيانات والربط البرمجي" });
    }
    const { webAppUrl, visits, customers, deletedIds } = req.body;
    if (!webAppUrl) {
      return res.status(400).json({ status: "error", error: "رابط Google Web App مطلوب" });
    }

    try {
      let filteredVisits = visits || [];
      let filteredCustomers = customers || [];

      if (req.user.role === 'User') {
        const allowedReps = req.user.assignedReps || [];
        filteredVisits = filteredVisits.filter((v: any) => allowedReps.includes(v.repName));
        
        const allowedCustomerNames = new Set(filteredVisits.map((v: any) => v.customerName ? v.customerName.trim() : ''));
        filteredCustomers = filteredCustomers.filter((c: any) => {
          if (!c.name) return false;
          const nameTrimmed = c.name.trim();
          if (c.repName && allowedReps.includes(c.repName)) {
            return true;
          }
          return allowedCustomerNames.has(nameTrimmed);
        });
      }

      // Sync into Firestore first to prevent any potential local data loss
      for (const v of filteredVisits) {
        if (v.id) await saveVisit(v);
      }
      for (const c of filteredCustomers) {
        if (c.id) await saveCustomer(c);
      }
      if (Array.isArray(deletedIds)) {
        for (const dId of deletedIds) {
          await deleteVisit(dId);
        }
      }

      const payload = {
        action: 'sync_all',
        visits: filteredVisits,
        customers: filteredCustomers,
        deletedIds: deletedIds || []
      };

      const result = await fetchGoogleSheets(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      
      try {
        const data = JSON.parse(result.text);
        return res.json(data);
      } catch {
        if (result.ok) {
          return res.json({ status: "success", message: "تمت المزامنة وحفظ السجلات محلياً وبجداول جوجل بأمان بنجاح!" });
        }
        return res.status(500).json({ status: "error", error: "استجابة غير صالحة من Google Script" });
      }
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "خطأ اتصال أثناء مزامنة الجدول" });
    }
  });

  // Import from Sheets with permission checking, store securely in Firestore
  app.post("/api/sheets/import", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ status: "error", error: "عذراً، هذا الإجراء مخصص لمدير النظام فقط كجزء من إدارة قواعد البيانات والربط البرمجي" });
    }
    const { webAppUrl } = req.body;
    if (!webAppUrl) {
      return res.status(400).json({ status: "error", error: "رابط Google Web App مطلوب" });
    }
    try {
      const targetUrl = webAppUrl.includes("?") ? `${webAppUrl}&action=get_data` : `${webAppUrl}?action=get_data`;
      const result = await fetchGoogleSheets(targetUrl, {
        method: 'GET'
      });
      
      if (!result.ok) {
        throw new Error(`خطأ رد جوجل: ${result.status}`);
      }
      
      let data = JSON.parse(result.text);
      const importedVisits = data.visits || [];
      const importedCustomers = data.customers || [];

      // Save imported structures directly to Firestore
      for (const v of importedVisits) {
        if (v.id) await saveVisit(v);
      }
      for (const c of importedCustomers) {
        if (c.id) await saveCustomer(c);
      }

      if (req.user.role === 'User') {
        const allowedReps = req.user.assignedReps || [];
        const filteredVisits = importedVisits.filter((v: any) => allowedReps.includes(v.repName));
        const allowedCustomerNames = new Set(filteredVisits.map((v: any) => v.customerName ? v.customerName.trim() : ''));
        const filteredCustomers = importedCustomers.filter((c: any) => {
          if (!c.name) return false;
          const nameTrimmed = c.name.trim();
          if (c.repName && allowedReps.includes(c.repName)) {
            return true;
          }
          return allowedCustomerNames.has(nameTrimmed);
        });

        data = {
          ...data,
          visits: filteredVisits,
          customers: filteredCustomers
        };
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "تعذر تحميل البيانات من Google Sheets." });
    }
  });

  // Add individual visit with permission checking on backend
  app.post("/api/sheets/add-visit", authenticateToken, async (req: any, res: any) => {
    if (req.user.role === 'TechnicalSupport' || req.user.role === 'Monitoring') {
      return res.status(403).json({ status: "error", error: "عذراً، لا تمتلك الصلاحيات الكافية لتسجيل زيارات أو مبيعات جديدة" });
    }
    const { webAppUrl, visit } = req.body;
    if (!webAppUrl) {
      return res.status(400).json({ status: "error", error: "رابط Google Web App مطلوب" });
    }
    if (!visit) {
      return res.status(400).json({ status: "error", error: "بيانات الزيارة مطلوبة" });
    }

    if (req.user.role === 'User') {
      const allowedReps = req.user.assignedReps || [];
      if (!allowedReps.includes(visit.repName)) {
        return res.status(403).json({ status: "error", error: `غير مصرح لك بتسجيل زيارة للمندوب غير المعين: ${visit.repName}` });
      }
    }

    try {
      // Save to Firestore first
      await saveVisit(visit);

      const payload = {
        action: 'add_visit',
        visit
      };
      const result = await fetchGoogleSheets(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      
      try {
        const data = JSON.parse(result.text);
        return res.json(data);
      } catch {
        if (result.ok) {
          return res.json({ status: "success", message: "تمت إضافة سجل الزيارة بنجاح!" });
        }
        return res.status(500).json({ status: "error", error: "رد غير صالح من جوجل" });
      }
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message || "خطأ ربط لحظي" });
    }
  });

  // ==================== TECHNICAL SUPPORT & MONITORING ENDPOINTS ====================

  app.get("/api/users/support", authenticateToken, async (req: any, res: any) => {
    try {
      const allUsers = await getUsers();
      const supportEmployees = allUsers.filter(u => u.role === 'TechnicalSupport' && u.isActive);
      return res.json({ status: "success", users: supportEmployees });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/users/monitoring", authenticateToken, async (req: any, res: any) => {
    try {
      const allUsers = await getUsers();
      const monitoringEmployees = allUsers.filter(u => u.role === 'Monitoring' && u.isActive);
      return res.json({ status: "success", users: monitoringEmployees });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/support/tasks", authenticateToken, async (req: any, res: any) => {
    try {
      const allTasks = await getSupportTasks();
      if (req.user.role === 'TechnicalSupport') {
        const filtered = allTasks.filter(t => t.assignedEmployeeId === req.user.id || t.createdBy === req.user.username);
        return res.json({ status: "success", tasks: filtered });
      }
      return res.json({ status: "success", tasks: allTasks });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/support/tasks", authenticateToken, async (req: any, res: any) => {
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager' && req.user.role !== 'TechnicalSupport') {
      return res.status(403).json({ status: "error", error: "عذراً، هذا الإجراء يتطلب صلاحيات الإدارة أو الدعم الفني" });
    }

    const { task } = req.body;
    if (!task || !task.id || !task.customerId || !task.assignedEmployeeId) {
      return res.status(400).json({ status: "error", error: "بيانات المهمة غير مكتملة" });
    }

    try {
      task.createdBy = req.user.username;
      task.createdAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
      task.status = 'New';

      const savedTask = await saveSupportTask(task);

      // Save initial status history
      await saveSupportStatusHistory({
        id: crypto.randomUUID(),
        taskId: task.id,
        fromStatus: 'None',
        toStatus: 'New',
        changedBy: req.user.username,
        timestamp: new Date().toISOString()
      });

      // Create notification for assigned employee
      await saveNotification({
        id: crypto.randomUUID(),
        type: task.taskType === 'Demo Presentation' ? 'demo_assignment' : 'new_task',
        title: `مهمة دعم فني جديدة: ${task.taskType}`,
        message: `تم تكليفك بمهمة جديدة للعميل ${task.customerName} بدرجة أولوية (${task.priority})`,
        recipientId: task.assignedEmployeeId,
        recipientRole: 'TechnicalSupport',
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: task.id
      });

      // If Trial Version Installation task, create active trial record
      if (task.taskType === 'Trial Version Installation' && task.trialStartDate && task.trialExpirationDate) {
        const trialId = crypto.randomUUID();
        await saveTrialInstallation({
          id: trialId,
          customerId: task.customerId,
          customerName: task.customerName,
          taskId: task.id,
          startDate: task.trialStartDate,
          expirationDate: task.trialExpirationDate,
          status: 'Active',
          createdBy: req.user.username,
          createdAt: new Date().toISOString()
        });

        // Add pre-scheduled notification alerts for trial expiration (7 days, 3 days, and on expiry)
        const expDate = new Date(task.trialExpirationDate);
        
        // 7 Days before
        const d7 = new Date(expDate);
        d7.setDate(d7.getDate() - 7);
        await saveNotification({
          id: crypto.randomUUID(),
          type: 'trial_expiry',
          title: `اقتراب انتهاء فترة التجربة: ${task.customerName}`,
          message: `تنتهي النسخة التجريبية للعميل ${task.customerName} بعد 7 أيام في تاريخ ${task.trialExpirationDate}`,
          recipientId: task.assignedEmployeeId,
          recipientRole: 'TechnicalSupport',
          isRead: false,
          createdAt: d7.toISOString().localeCompare(new Date().toISOString()) < 0 ? new Date().toISOString() : d7.toISOString(),
          relatedId: task.id
        });

        // 3 Days before
        const d3 = new Date(expDate);
        d3.setDate(d3.getDate() - 3);
        await saveNotification({
          id: crypto.randomUUID(),
          type: 'trial_expiry',
          title: `تنبيه هام: انتهاء فترة التجربة لـ ${task.customerName}`,
          message: `تنتهي النسخة التجريبية للعميل ${task.customerName} بعد 3 أيام في تاريخ ${task.trialExpirationDate}`,
          recipientId: task.assignedEmployeeId,
          recipientRole: 'TechnicalSupport',
          isRead: false,
          createdAt: d3.toISOString().localeCompare(new Date().toISOString()) < 0 ? new Date().toISOString() : d3.toISOString(),
          relatedId: task.id
        });

        // Expiration
        await saveNotification({
          id: crypto.randomUUID(),
          type: 'trial_expiry',
          title: `انتهت فترة تجربة العميل: ${task.customerName}`,
          message: `تنبيه: انتهت النسخة التجريبية للعميل ${task.customerName} اليوم (${task.trialExpirationDate})`,
          recipientId: 'All',
          recipientRole: null,
          isRead: false,
          createdAt: expDate.toISOString().localeCompare(new Date().toISOString()) < 0 ? new Date().toISOString() : expDate.toISOString(),
          relatedId: task.id
        });
      }

      await addLog(req.user.username, "support_task_created", `إسناد مهمة جديدة (${task.taskType}) للعميل: ${task.customerName}`);
      return res.json({ status: "success", task: savedTask });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.put("/api/support/tasks/:id/status", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ status: "error", error: "حالة المهمة مطلوبة" });
    }

    try {
      const allTasks = await getSupportTasks();
      const task = allTasks.find(t => t.id === id);
      if (!task) {
        return res.status(404).json({ status: "error", error: "المهمة غير موجودة" });
      }

      // Check authorization
      if (req.user.role !== 'Admin' && req.user.role !== 'Manager' && req.user.id !== task.assignedEmployeeId) {
        return res.status(403).json({ status: "error", error: "غير مصرح لك بتعديل حالة هذه المهمة" });
      }

      const oldStatus = task.status;
      task.status = status;
      task.updatedAt = new Date().toISOString();

      if (status === 'In Progress' && !task.startedAt) {
        task.startedAt = new Date().toISOString();
      } else if (status === 'Completed' && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      }

      const saved = await saveSupportTask(task);

      // Record status history
      await saveSupportStatusHistory({
        id: crypto.randomUUID(),
        taskId: id,
        fromStatus: oldStatus,
        toStatus: status,
        changedBy: req.user.username,
        timestamp: new Date().toISOString()
      });

      // Send notifications for important transitions
      await saveNotification({
        id: crypto.randomUUID(),
        type: status === 'Completed' ? 'pending_task' : 'new_task',
        title: `تحديث مهمة: ${task.customerName}`,
        message: `قام الزميل ${req.user.username} بتغيير حالة المهمة (${task.taskType}) من ${oldStatus} إلى ${status}`,
        recipientId: 'Admin',
        recipientRole: 'Admin',
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: id
      });

      await addLog(req.user.username, "support_task_status_changed", `تغيير حالة مهمة العميل ${task.customerName} إلى (${status})`);
      return res.json({ status: "success", task: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/support/tasks/:id/notes", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { note, type } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ status: "error", error: "محتوى التعليق مطلوب" });
    }

    try {
      const allTasks = await getSupportTasks();
      const task = allTasks.find(t => t.id === id);
      if (!task) {
        return res.status(404).json({ status: "error", error: "المهمة غير موجودة" });
      }

      const newNote = {
        id: crypto.randomUUID(),
        taskId: id,
        note,
        author: req.user.username,
        timestamp: new Date().toISOString(),
        type: type || 'general'
      };

      await saveSupportNote(newNote);

      await addLog(req.user.username, "support_task_note_added", `إضافة تعليق/تقرير جديد لمهمة العميل: ${task.customerName}`);
      return res.json({ status: "success", note: newNote });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/support/notes/:taskId", authenticateToken, async (req: any, res: any) => {
    const { taskId } = req.params;
    try {
      const notes = await getSupportNotes(taskId);
      return res.json({ status: "success", notes });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/support/trials", authenticateToken, async (req: any, res: any) => {
    try {
      const trials = await getTrialInstallations();
      return res.json({ status: "success", trials });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/monitoring/records", authenticateToken, async (req: any, res: any) => {
    try {
      const records = await getMonitoringRecords();
      return res.json({ status: "success", records });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/monitoring/records", authenticateToken, async (req: any, res: any) => {
    const { record } = req.body;
    if (!record || !record.customerId || !record.status) {
      return res.status(400).json({ status: "error", error: "بيانات المتابعة غير مكتملة" });
    }

    try {
      record.id = crypto.randomUUID();
      record.employeeId = req.user.id;
      record.employeeName = req.user.username;
      record.createdAt = new Date().toISOString();
      record.createdBy = req.user.username;

      const saved = await saveMonitoringRecord(record);

      // Record monitoring status history
      await saveMonitoringStatusHistory({
        id: crypto.randomUUID(),
        customerId: record.customerId,
        fromStatus: 'None',
        toStatus: record.status,
        changedBy: req.user.username,
        timestamp: new Date().toISOString()
      });

      // Update customer status
      const customers = await getCustomers();
      const customer = customers.find(c => c.id === record.customerId);
      if (customer) {
        customer.currentStatus = record.status;
        customer.lastVisitDate = new Date().toISOString().split('T')[0];
        await saveCustomer(customer);
      }

      // Complaint / Technical Issue alert
      if (record.status === 'Complaint Opened' || record.status === 'Technical Issue Reported') {
        await saveNotification({
          id: crypto.randomUUID(),
          type: 'complaint_open',
          title: `شكوى/بلاغ جديد: ${record.customerName}`,
          message: `تم تسجيل متابعة بحالة (${record.status}) للعميل ${record.customerName} بواسطة الموظف ${req.user.username}`,
          recipientId: 'Admin',
          recipientRole: 'Admin',
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: record.id
        });
      }

      await addLog(req.user.username, "monitoring_record_added", `تسجيل متابعة وتقييم رضى للعميل: ${record.customerName}`);
      return res.json({ status: "success", record: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Monitoring Sales Rep Tasks Endpoints
  app.get("/api/monitoring/rep-tasks", authenticateToken, async (req: any, res: any) => {
    try {
      const allTasks = await getMonitoringRepTasks();
      let filtered = allTasks;
      if (req.user.role === 'User') {
        const allowed = req.user.assignedReps || [];
        filtered = allTasks.filter(t => allowed.includes(t.repName));
      }
      return res.json({ status: "success", tasks: filtered });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.post("/api/monitoring/rep-tasks", authenticateToken, async (req: any, res: any) => {
    const { task } = req.body;
    if (!task || !task.customerName || !task.repName || !task.title) {
      return res.status(400).json({ status: "error", error: "بيانات المهمة غير مكتملة (اسم العميل، المندوب، وعنوان المهمة مطلوبة)" });
    }

    try {
      task.id = crypto.randomUUID();
      task.createdBy = req.user.username;
      task.createdAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
      task.status = task.status || 'Pending';
      task.priority = task.priority || 'Medium';

      const saved = await saveMonitoringRepTask(task);

      // Create notification for the assigned sales representative user(s)
      try {
        const allUsers = await getUsers();
        const repUsers = allUsers.filter(u => u.assignedReps && u.assignedReps.includes(task.repName));
        
        for (const ru of repUsers) {
          await saveNotification({
            id: crypto.randomUUID(),
            type: 'new_task',
            title: `مهمة جديدة من قسم المتابعة والجودة: ${task.title}`,
            message: `تم تكليفك بمهمة [${task.title}] للعميل (${task.customerName}) من قبل قسم المتابعة والجودة. تاريخ الاستحقاق: ${task.dueDate || 'فوري'}`,
            recipientId: ru.id,
            recipientRole: ru.role,
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: saved.id
          });
        }

        // Also notify Admins
        await saveNotification({
          id: crypto.randomUUID(),
          type: 'new_task',
          title: `تكليف مهمة للمندوب ${task.repName}`,
          message: `قام قسم المتابعة والجودة (${req.user.username}) بتكليف المندوب (${task.repName}) بمهمة: ${task.title} للعميل ${task.customerName}`,
          recipientId: 'Admin',
          recipientRole: 'Admin',
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: saved.id
        });
      } catch (notifErr) {
        console.warn("Could not dispatch task notifications:", notifErr);
      }

      await addLog(req.user.username, "monitoring_rep_task_created", `تكليف مهمة للمندوب [${task.repName}] بخصوص العميل [${task.customerName}]: ${task.title}`);
      return res.json({ status: "success", task: saved });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.put("/api/monitoring/rep-tasks/:id", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { status, repFeedback, notes, priority, dueDate, title, description, taskType } = req.body;
    try {
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (repFeedback !== undefined) updates.repFeedback = repFeedback;
      if (notes !== undefined) updates.notes = notes;
      if (priority !== undefined) updates.priority = priority;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (taskType !== undefined) updates.taskType = taskType;
      
      if (status === 'Completed') {
        updates.completedAt = new Date().toISOString();
      }

      const updated = await updateMonitoringRepTask(id, updates);
      if (!updated) {
        return res.status(404).json({ status: "error", error: "المهمة غير موجودة" });
      }

      await addLog(req.user.username, "monitoring_rep_task_updated", `تحديث حالة مهمة المندوب [${updated.repName}] إلى (${updated.status})`);
      return res.json({ status: "success", task: updated });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.delete("/api/monitoring/rep-tasks/:id", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      await deleteMonitoringRepTask(id);
      await addLog(req.user.username, "monitoring_rep_task_deleted", `حذف تكليف مهمة المندوب رقم ${id}`);
      return res.json({ status: "success" });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/notifications", authenticateToken, async (req: any, res: any) => {
    try {
      const allNotifs = await getNotifications();
      const filtered = allNotifs.filter(n => 
        n.recipientId === 'All' || 
        n.recipientId === req.user.id || 
        (n.recipientRole && n.recipientRole === req.user.role)
      );
      return res.json({ status: "success", notifications: filtered });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      await updateNotificationRead(id, true);
      return res.json({ status: "success" });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      await deleteNotification(id);
      return res.json({ status: "success" });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/reports/support", authenticateToken, async (req: any, res: any) => {
    try {
      const tasks = await getSupportTasks();
      const trials = await getTrialInstallations();
      const users = await getUsers();

      const nowStr = new Date().toISOString().split('T')[0];
      const activeTrials = trials.filter(t => t.status === 'Active' && t.expirationDate >= nowStr);
      const expiredTrials = trials.filter(t => t.status === 'Expired' || t.expirationDate < nowStr);
      
      const upcomingExpiry = trials.filter(t => {
        if (t.expirationDate < nowStr) return false;
        const diffMs = new Date(t.expirationDate).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      });

      const employeeStats: Record<string, { total: number; completed: number; pending: number }> = {};
      users.filter(u => u.role === 'TechnicalSupport').forEach(u => {
        employeeStats[u.username] = { total: 0, completed: 0, pending: 0 };
      });

      tasks.forEach(t => {
        const empName = t.assignedEmployeeName;
        if (!employeeStats[empName]) {
          employeeStats[empName] = { total: 0, completed: 0, pending: 0 };
        }
        employeeStats[empName].total++;
        if (t.status === 'Completed') {
          employeeStats[empName].completed++;
        } else {
          employeeStats[empName].pending++;
        }
      });

      let totalCompletedTimeMs = 0;
      let completedTasksCount = 0;
      tasks.forEach(t => {
        if (t.status === 'Completed' && t.createdAt && t.completedAt) {
          const start = new Date(t.createdAt).getTime();
          const end = new Date(t.completedAt).getTime();
          if (end >= start) {
            totalCompletedTimeMs += (end - start);
            completedTasksCount++;
          }
        }
      });
      const avgCompletionHours = completedTasksCount > 0 
        ? Math.round((totalCompletedTimeMs / (1000 * 60 * 60)) * 10) / 10 
        : 0;

      return res.json({
        status: "success",
        metrics: {
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'Completed').length,
          pendingTasks: tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length,
          activeTrials: activeTrials.length,
          expiredTrials: expiredTrials.length,
          upcomingExpiry: upcomingExpiry.length,
          avgCompletionHours,
          employeePerformance: Object.keys(employeeStats).map(name => ({
            name,
            ...employeeStats[name]
          }))
        }
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  app.get("/api/reports/monitoring", authenticateToken, async (req: any, res: any) => {
    try {
      const records = await getMonitoringRecords();

      let satSum = 0;
      const satisfactionLevels = [0, 0, 0, 0, 0, 0];
      records.forEach(r => {
        const lvl = Math.round(r.customerSatisfactionLevel);
        if (lvl >= 1 && lvl <= 5) {
          satisfactionLevels[lvl]++;
          satSum += lvl;
        }
      });

      const avgSatisfaction = records.length > 0 ? Math.round((satSum / records.length) * 10) / 10 : 0;

      const statusCounts: Record<string, number> = {};
      records.forEach(r => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });

      const employeeCallCounts: Record<string, number> = {};
      records.forEach(r => {
        employeeCallCounts[r.employeeName] = (employeeCallCounts[r.employeeName] || 0) + 1;
      });

      return res.json({
        status: "success",
        metrics: {
          totalCalls: records.length,
          avgSatisfaction,
          satisfactionBreakdown: satisfactionLevels.slice(1),
          statusBreakdown: Object.keys(statusCounts).map(status => ({
            status,
            count: statusCounts[status]
          })),
          employeeActivity: Object.keys(employeeCallCounts).map(name => ({
            name,
            calls: employeeCallCounts[name]
          })),
          activeComplaints: records.filter(r => r.status === 'Complaint Opened').length,
          technicalIssuesReported: records.filter(r => r.status === 'Technical Issue Reported').length
        }
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

export async function startServer() {
  const app = await createApp();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV !== "development";

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the standalone HTTP server if we are executed directly as the entry point
// and not imported as a serverless function module (e.g. on Vercel, Netlify, Cloud Functions or other lambda engines)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.FUNCTIONS_SIGNATURE_TYPE;
if (!isServerless) {
  startServer();
}
