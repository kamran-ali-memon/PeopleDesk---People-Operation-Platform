"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock3,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
  Building2,
  CalendarCheck,
  Megaphone,
  History,
  UserCog,
  RefreshCw,
  CircleAlert,
  ReceiptText,
  ChartNoAxesCombined,
  Moon,
  Sun,
} from "lucide-react";
import api, { errorMessage } from "../lib/api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { money, shortDate, statusClass } from "../lib/format";
import { AuthScreen, Brand, Modal, SectionHeading, Table, Toast } from "../components/ui";
import {
  Overview,
  AttendancePage,
  LeavePage,
  PayrollPage,
  OrganizationPage,
  UsersPage,
  AnnouncementsPage,
  AssistantPage,
  ChangePasswordPage,
  ProfilePage,
  ExpensesPage,
  PerformancePage,
} from "../components/pages";
import {
  EmployeeEditForm,
  CSVImportForm,
  EmployeeForm,
  LeaveForm,
  DepartmentForm,
  AnnouncementForm,
} from "../components/forms";

const NAV = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["admin", "hr", "employee"],
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    roles: ["admin", "hr", "employee"],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: Clock3,
    roles: ["admin", "hr", "employee"],
  },
  {
    id: "leaves",
    label: "Leave management",
    icon: CalendarCheck,
    roles: ["admin", "hr", "employee"],
  },
  {
    id: "payroll",
    label: "Payroll & payslips",
    icon: Wallet,
    roles: ["admin", "hr", "employee"],
  },
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    roles: ["admin", "hr"],
  },
  { id: "users", label: "Access & users", icon: UserCog, roles: ["admin"] },
  { id: "expenses", label: "Expenses", icon: ReceiptText, roles: ["admin", "hr", "employee"] },
  { id: "performance", label: "Performance", icon: ChartNoAxesCombined, roles: ["admin", "hr", "employee"] },
  {
    id: "announcements",
    label: "Announcements",
    icon: Megaphone,
    roles: ["admin", "hr", "employee"],
  },
  { id: "audit", label: "Audit log", icon: History, roles: ["admin"] },
  {
    id: "assistant",
    label: "AI assistant",
    icon: Sparkles,
    roles: ["admin", "hr", "employee"],
  },
  { id: "profile", label: "My profile", icon: UserCog, roles: ["employee"] },
  {
    id: "security",
    label: "Change password",
    icon: ShieldCheck,
    roles: ["admin", "hr", "employee"],
  },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [expenseClaims, setExpenseClaims] = useState([]);
  const [reviewCycles, setReviewCycles] = useState([]);
  const [performanceReviews, setPerformanceReviews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState("light");
  const [modal, setModal] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [summary, setSummary] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [filters, setFilters] = useState({ department: "", status: "" });
  const pageMotionRef = useRef(null);
  const mutationLockRef = useRef(false);
  const refreshLockRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  useGSAP(() => {
    if (!ready || !user || !pageMotionRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panels = Array.from(pageMotionRef.current.querySelectorAll(".panel"));
    if (!panels.length) return;
    gsap.fromTo(panels, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.035, ease: "power2.out" });
  }, { dependencies: [page, ready, user], revertOnUpdate: true });

  useEffect(() => {
    const token = window.localStorage.getItem("hcm_token");
    const savedUser = window.localStorage.getItem("hcm_user");
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.mustChangePassword) setPage("security");
        const cacheKey = "hcm_workspace_cache_" + (parsedUser.companyId || "") + "_" + (parsedUser.id || "");
        try {
          const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null");
          if (cached) {
            setDashboard(cached.dashboard || null);
            setEmployees(cached.employees || []);
            setAttendance(cached.attendance || []);
            setLeaves(cached.leaves || []);
            setPayroll(cached.payroll || []);
            setExpenseClaims(cached.expenseClaims || []);
            setReviewCycles(cached.reviewCycles || []);
            setPerformanceReviews(cached.performanceReviews || []);
            setAnnouncements(cached.announcements || []);
            setNotifications(cached.notifications || []);
            setSettings(cached.settings || null);
            setUsers(cached.users || []);
            setAuditLogs(cached.auditLogs || []);
            setDepartments(cached.departments || []);
            setDesignations(cached.designations || []);
            setLeaveTypes(cached.leaveTypes || []);
            setHolidays(cached.holidays || []);
            setSummary(cached.summary || []);
          }
        } catch {
          window.sessionStorage.removeItem(cacheKey);
        }
      } catch (error) {
        window.localStorage.removeItem("hcm_user");
      }
    }
    const savedTheme = window.localStorage.getItem("hcm_theme") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("hcm_theme", theme);
  }, [theme, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const onLogin = (data) => {
    window.localStorage.setItem("hcm_token", data.token);
    window.localStorage.setItem("hcm_user", JSON.stringify(data.user));
    setUser(data.user);
    setSettings({ company: data.company, companyName: data.company?.name || "" });
    setPage(data.user.mustChangePassword ? "security" : "overview");
    setError("");
  };
  const logout = async () => {
    window.localStorage.removeItem("hcm_token");
    window.localStorage.removeItem("hcm_user");
    if (user) {
      window.sessionStorage.removeItem(
        "hcm_workspace_cache_" + (user.companyId || "") + "_" + (user.id || ""),
      );
    }
    setUser(null);
    setDashboard(null);
    setEmployees([]);
    setAttendance([]);
    setLeaves([]);
    setPayroll([]);
    setExpenseClaims([]);
    setReviewCycles([]);
    setPerformanceReviews([]);
    setAnnouncements([]);
    setNotifications([]);
    setSettings(null);
    setUsers([]);
    setAuditLogs([]);
    setDepartments([]);
    setDesignations([]);
    setLeaveTypes([]);
    setHolidays([]);
    setPage("overview");
    await Swal.fire({
      icon: "success",
      title: "Signed out",
      text: "You have safely signed out of your workspace.",
      confirmButtonColor: "#315fe0",
      background: theme === "dark" ? "#101725" : "#ffffff",
      color: theme === "dark" ? "#e7ebf3" : "#111827",
    });
  };
  const loadData = useCallback(
    async (currentPage = "overview", { background = false } = {}) => {
      if (!user || user.mustChangePassword) return;
      if (refreshLockRef.current) {
        if (background) refreshQueuedRef.current = true;
        return;
      }
      refreshLockRef.current = true;
      if (!background) setBusy(true);
      setError("");
      try {
        const tasks = [
          api.get("/dashboard"),
          api.get("/employees"),
          api.get("/attendance"),
          api.get("/leaves"),
          api.get("/payroll"),
          api.get("/announcements"),
          api.get("/notifications"),
        ];
        if (user.role === "admin") {
          tasks.push(api.get("/settings"), api.get("/users"), api.get("/audit"));
        } else {
          tasks.push(api.get("/settings"));
        }
        tasks.push(api.get("/expenses"), api.get("/performance/reviews"));
        const results = await Promise.all(tasks);
        setDashboard(results[0].data);
        setEmployees(results[1].data.employees || []);
        setAttendance(results[2].data.attendance || []);
        setLeaves(results[3].data.leaves || []);
        setPayroll(results[4].data.payrolls || []);
        setAnnouncements(results[5].data.announcements || []);
        setNotifications(results[6].data.notifications || []);
        const setupData = results[7].data;
        const workflowIndex = user.role === "admin" ? 10 : 8;
        const claims = results[workflowIndex].data.claims || [];
        const reviewData = results[workflowIndex + 1].data;
        setSettings({
          ...(setupData.settings || {}),
          company: setupData.company,
          companyName: setupData.settings?.companyName || setupData.company?.name || "",
        });
        setDepartments(setupData.departments || []);
        setDesignations(setupData.designations || []);
        setLeaveTypes(setupData.leaveTypes || []);
        setHolidays(setupData.holidays || []);
        setExpenseClaims(claims);
        setReviewCycles(reviewData.cycles || []);
        setPerformanceReviews(reviewData.reviews || []);
        const nextUsers = user.role === "admin" ? results[8]?.data.users || [] : [];
        const nextAuditLogs = user.role === "admin" ? results[9]?.data.logs || [] : [];
        if (user.role === "admin") {
          setUsers(nextUsers);
          setAuditLogs(nextAuditLogs);
        }
        const workspaceCache = {
          dashboard: results[0].data,
          employees: results[1].data.employees || [],
          attendance: results[2].data.attendance || [],
          leaves: results[3].data.leaves || [],
          payroll: results[4].data.payrolls || [],
          expenseClaims: claims,
          reviewCycles: reviewData.cycles || [],
          performanceReviews: reviewData.reviews || [],
          announcements: results[5].data.announcements || [],
          notifications: results[6].data.notifications || [],
          settings: {
            ...(setupData.settings || {}),
            company: setupData.company,
            companyName: setupData.settings?.companyName || setupData.company?.name || "",
          },
          users: nextUsers,
          auditLogs: nextAuditLogs,
          departments: setupData.departments || [],
          designations: setupData.designations || [],
          leaveTypes: setupData.leaveTypes || [],
          holidays: setupData.holidays || [],
        };
        try {
          window.sessionStorage.setItem(
            "hcm_workspace_cache_" + (user.companyId || "") + "_" + (user.id || ""),
            JSON.stringify(workspaceCache),
          );
        } catch {}
        if (currentPage === "overview" && ["admin", "hr"].includes(user.role)) {
          api.post("/ai/summary")
            .then(({ data }) => setSummary(data.summary || []))
            .catch(() => {});
        }
      } catch (err) {
        const message = errorMessage(err);
        notify(message, "error");
        if (err.response?.status === 401) logout();
      } finally {
        refreshLockRef.current = false;
        if (!background) setBusy(false);
        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          window.setTimeout(() => {
            void loadData(currentPage, { background: true });
          }, 0);
        }
      }
    },
    [user],
  );
  useEffect(() => {
    if (ready && user && !user.mustChangePassword) loadData("overview");
  }, [ready, user, loadData]);

  const notify = (message, type = "success") =>
    setToast({ message, type, id: Date.now() });
  async function perform(action, successMessage, closeModal = true, importance = "minor") {
    if (mutationLockRef.current) {
      notify("A save is already in progress.");
      return;
    }
    mutationLockRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      const message = successMessage || result?.data?.message || "Saved successfully.";
      if (importance === "major") {
        const temporaryPassword = result?.data?.temporaryPassword;
        await Swal.fire({
          icon: "success",
          title: "Action completed",
          text: temporaryPassword ? message + " Temporary password: " + temporaryPassword : message,
          confirmButtonColor: "#315fe0",
          background: theme === "dark" ? "#101725" : "#ffffff",
          color: theme === "dark" ? "#e7ebf3" : "#111827",
        });
      } else {
        notify(message);
      }
      if (closeModal) setModal("");
      void loadData(page, { background: true });
      return result;
    } catch (err) {
      const message = errorMessage(err);
      notify(message, "error");
      return undefined;
    } finally {
      mutationLockRef.current = false;
      setBusy(false);
    }
  }
  async function editPayrollDraft(item) {
    const result = await Swal.fire({
      title: "Edit payroll draft",
      html: `
        <label class="block text-left text-xs font-semibold">Basic pay
          <input id="pd-basic" class="swal2-input" type="number" min="0" step="1" value="${Number(item.basic || 0)}">
        </label>
        <label class="block text-left text-xs font-semibold">HRA
          <input id="pd-hra" class="swal2-input" type="number" min="0" step="1" value="${Number(item.hra || 0)}">
        </label>
        <label class="block text-left text-xs font-semibold">Medical
          <input id="pd-medical" class="swal2-input" type="number" min="0" step="1" value="${Number(item.medical || 0)}">
        </label>
        <label class="block text-left text-xs font-semibold">Deductions
          <input id="pd-deductions" class="swal2-input" type="number" min="0" step="1" value="${Number(item.deductions || 0)}">
        </label>
        <label class="block text-left text-xs font-semibold">Tax
          <input id="pd-tax" class="swal2-input" type="number" min="0" step="1" value="${Number(item.tax || 0)}">
        </label>`,
      showCancelButton: true,
      confirmButtonText: "Save draft",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#315fe0",
      background: theme === "dark" ? "#101725" : "#ffffff",
      color: theme === "dark" ? "#e7ebf3" : "#111827",
      preConfirm: () => {
        const popup = Swal.getPopup();
        const keys = ["basic", "hra", "medical", "deductions", "tax"];
        const values = Object.fromEntries(keys.map((key) => [
          key,
          Number(popup.querySelector("#pd-" + key).value),
        ]));
        if (Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
          Swal.showValidationMessage("Enter valid non-negative numbers.");
          return false;
        }
        return values;
      },
    });
    if (result.isConfirmed)
      await perform(
        () => api.patch("/payroll/" + item._id, result.value),
        "Payroll draft updated.",
      );
  }

  async function sendChat(event) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;
    setChat((items) => [...items, { role: "user", content: message }]);
    setChatInput("");
    try {
      const { data } = await api.post("/ai/chat", { message });
      setChat((items) => [
        ...items,
        { role: "assistant", content: data.answer, aiGenerated: data.aiGenerated },
      ]);
    } catch (err) {
      setChat((items) => [
        ...items,
        { role: "assistant", content: errorMessage(err) },
      ]);
    }
  }
  async function downloadPayslip(item) {
    try {
      const response = await api.get("/payroll/" + item._id + "/payslip", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "payslip-" + item.month + ".pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = errorMessage(err);
      notify(message, "error");
    }
  }
  useEffect(() => {
    if (!ready || !user || page !== "organization") return;
    let active = true;
    api.get("/settings")
      .then(({ data }) => {
        if (!active) return;
        setDepartments(data.departments || []);
        setDesignations(data.designations || []);
      })
      .catch((err) => notify("Could not load departments and designations: " + errorMessage(err), "error"));
    return () => { active = false; };
  }, [ready, user, page]);

  async function openEmployeeForm() {
    try {
      const { data } = await api.get("/settings");
      setDepartments(data.departments || []);
      setDesignations(data.designations || []);
      setModal("employee");
    } catch (err) {
      notify("Could not load department options: " + errorMessage(err), "error");
    }
  }
  const visibleNav = NAV.filter(
    (item) =>
      item.roles.includes(user?.role) &&
      (!user?.mustChangePassword || item.id === "security"),
  );
  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (item) =>
          (item.name + " " + item.email + " " + item.employeeCode)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (!filters.department ||
            String(item.department?._id || item.department || "") ===
              filters.department) &&
          (!filters.status || item.employmentStatus === filters.status),
      ),
    [employees, search, filters],
  );
  if (!ready)
    return (
      <div className="app-shell min-h-screen p-5 sm:p-8" aria-busy="true" aria-label="Loading workspace">
        <div className="mx-auto w-full max-w-6xl animate-pulse">
          <div className="mb-8 flex items-center justify-between">
            <div className="skeleton h-9 w-40 rounded-xl" />
            <div className="skeleton h-9 w-9 rounded-xl" />
          </div>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="panel p-5">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton mt-5 h-8 w-32 rounded" />
                <div className="skeleton mt-4 h-3 w-20 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="panel p-5"><div className="skeleton h-64 rounded-xl" /></div>
            <div className="panel p-5"><div className="skeleton h-64 rounded-xl" /></div>
          </div>
        </div>
      </div>
    );
  if (!user)
    return (
      <>
        <AuthScreen
          onLogin={onLogin}
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );

  const currentNavItem = visibleNav.find((item) => item.id === page);
  const pageTitle =
    currentNavItem?.id === "organization" && user.role === "hr"
      ? "Departments & designations"
      : currentNavItem?.label || "Overview";
  const roleName = {
    admin: "Administrator",
    hr: "Human resources",
    employee: "Employee",
  }[user.role];
  const headerAction =
    page === "employees" && ["admin", "hr"].includes(user.role) ? (
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => setModal("csv")}>
          <Download size={15} /> Import CSV
        </button>
        <button className="btn-primary" onClick={openEmployeeForm}>
          <Plus size={16} /> Add employee
        </button>
      </div>
    ) : page === "announcements" && ["admin", "hr"].includes(user.role) ? (
      <button className="btn-primary" onClick={() => setModal("announcement")}>
        <Plus size={16} /> New announcement
      </button>
    ) : page === "organization" && user.role === "admin" ? (
      <button className="btn-primary" onClick={() => setModal("department")}>
        <Plus size={16} /> Add department
      </button>
    ) : null;

  return (
    <div className="app-shell min-h-screen">
      {mobileNav && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-100 bg-white px-4 py-6 transition-transform duration-300 lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <Brand
            name={settings?.company?.name || settings?.companyName || "PeopleDesk"}
            logoData={settings?.company?.logoData || ""}
          />
          <button
            className="rounded-lg p-2 text-slate-400 lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-9 rounded-2xl bg-[#f5f7fc] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-bold text-brand-600 shadow-sm">
              {user.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="mt-0.5 text-[11px] capitalize text-slate-500">
                {roleName}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">
          Workspace
        </div>
        <nav className="scrollbar-hidden mt-2 flex-1 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setMobileNav(false);
                  setError("");
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${active ? "bg-brand-50 text-brand-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
              >
                <Icon
                  size={18}
                  className={
                    active
                      ? "text-brand-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }
                />
                {item.label}
                {item.id === "leaves" &&
                  dashboard?.kpis?.pendingApprovals > 0 &&
                  ["admin", "hr"].includes(user.role) && (
                    <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                      {dashboard.kpis.pendingApprovals}
                    </span>
                  )}
              </button>
            );
          })}
        </nav>
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#eef3ff] to-[#f7f9ff] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-700">
            <Sparkles size={15} /> {settings?.company?.name || 'PeopleDesk'} assistant
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Ask questions about your HR data in plain language.
          </p>
          <button
            onClick={() => setPage("assistant")}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-700"
          >
            Ask a question <ArrowRight size={13} />
          </button>
        </div>
        <button
          onClick={logout}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} /> Sign out
        </button>
      </aside>

      <main className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNav(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 lg:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate">{settings?.company?.name || "Workspace"}</span>
                  <span>/</span>
                  <span className="truncate text-slate-500">{pageTitle}</span>
                </div>
                <h1 className="mt-1 truncate text-lg font-bold tracking-tight sm:text-xl">
                  {page === "overview"
                    ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`
                    : pageTitle}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:flex">
                <CalendarDays size={14} />
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
              <button
                type="button"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                title="Notifications"
                onClick={() => setPage("announcements")}
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
              >
                <Bell size={18} />
                {notifications.some((item) => !item.read) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
              <div className="hidden h-9 w-9 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 sm:grid">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div ref={pageMotionRef} className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {busy && (
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-400">
              <RefreshCw size={13} className="animate-spin" /> Syncing workspace
              data…
            </div>
          )}
          {page === "overview" && (
            <Overview
              user={user}
              dashboard={dashboard}
              attendance={attendance}
              leaves={leaves}
              payroll={payroll}
              summary={summary}
              onNavigate={setPage}
              onCheckIn={() =>
                perform(
                  () => api.post("/attendance/check-in"),
                  "Checked in successfully.",
                )
              }
              onCheckOut={() =>
                perform(
                  () => api.post("/attendance/check-out"),
                  "Checked out successfully.",
                )
              }
              onSummarize={() =>
                perform(async () => {
                  const { data } = await api.post("/ai/summary");
                  setSummary(data.summary || []);
                  return { data: { message: "Dashboard summary refreshed." } };
                })
              }
            />
          )}
          {page === "employees" && (
            <>
              <SectionHeading
                title="Employee directory"
                subtitle="People, roles and contact information in one place."
                action={headerAction}
              />
              <div className="panel mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="field field-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or employee ID"
                  />
                </div>
                <select
                  className="field sm:w-48"
                  value={filters.department}
                  onChange={(e) =>
                    setFilters({ ...filters, department: e.target.value })
                  }
                >
                  <option value="">All departments</option>
                  {departments.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  className="field sm:w-40"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="exited">Exited</option>
                </select>
                {user.role !== "employee" && (
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const response = await api.get("/employees/export", {
                          responseType: "blob",
                        });
                        const url = URL.createObjectURL(response.data);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = "hcm-employees.csv";
                        anchor.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        setError(errorMessage(err));
                      }
                    }}
                  >
                    <Download size={15} /> Export CSV
                  </button>
                )}
              </div>
              <div className="panel">
                <Table
                  columns={[
                    {
                      key: "name",
                      label: "Employee",
                      render: (item) => (
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                            {item.name
                              ?.split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {item.employeeCode}
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "email",
                      label: "Contact",
                      render: (item) => (
                        <div>
                          {item.email}
                          <div className="mt-1 text-xs text-slate-400">
                            {item.phone || "No phone added"}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "department",
                      label: "Department",
                      render: (item) => item.department?.name || "Unassigned",
                    },
                    {
                      key: "designation",
                      label: "Designation",
                      render: (item) => item.designation?.name || "—",
                    },
                    {
                      key: "employmentStatus",
                      label: "Status",
                      render: (item) => (
                        <span
                          className={`badge ${statusClass(item.employmentStatus)}`}
                        >
                          {item.employmentStatus}
                        </span>
                      ),
                    },
                    {
                      key: "joinDate",
                      label: "Joined",
                      render: (item) => shortDate(item.joinDate),
                    },
                    ...(["admin", "hr"].includes(user.role)
                      ? [
                          {
                            key: "actions",
                            label: "Actions",
                            render: (item) => (
                              <button
                                className="btn-secondary !px-3 !py-2 !text-xs"
                                onClick={() => {
                                  setSelectedEmployee(item);
                                  setModal("employeeEdit");
                                }}
                              >
                                Edit details
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                  rows={filteredEmployees}
                  emptyTitle="No employees found"
                  emptyMessage={
                    user.role === "employee"
                      ? "Your profile will appear here."
                      : "Register your first employee to start building the directory."
                  }
                />
              </div>
            </>
          )}
          {page === "attendance" && (
            <AttendancePage
              user={user}
              attendance={attendance}
              onCorrection={(form) =>
                perform(
                  () => api.post("/attendance/corrections", form),
                  "Correction request submitted.",
                )
              }
              onReview={(item, approve) =>
                perform(
                  () =>
                    api.patch(`/attendance/${item._id}/review`, { approve }),
                  approve ? "Correction approved." : "Correction rejected.",
                )
              }
            />
          )}
          {page === "leaves" && (
            <LeavePage
              user={user}
              leaves={leaves}
              leaveTypes={leaveTypes}
              balances={dashboard?.leaveBalance || []}
              onCreate={() => setModal("leave")}
              onReview={(item, approve, comment) =>
                perform(
                  () =>
                    api.patch(`/leaves/${item._id}/review`, {
                      approve,
                      comment,
                    }),
                  `Leave ${approve ? "approved" : "rejected"}.`,
                )
              }
              onCancel={(item) =>
                perform(
                  () => api.patch(`/leaves/${item._id}/cancel`),
                  "Leave request cancelled.",
                )
              }
            />
          )}
          {page === "payroll" && (
            <PayrollPage
              user={user}
              payroll={payroll}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              onRun={() =>
                perform(
                  () => api.post("/payroll/run", { month: selectedMonth }),
                  "Payroll draft prepared.",
                )
              }
              onFinalize={async (month) => {
                const result = await Swal.fire({
                  title: "Finalize payroll for " + month + "?",
                  text: "This locks payroll records for the month and cannot be undone from the app.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Finalize payroll",
                  cancelButtonText: "Go back",
                  confirmButtonColor: "#315fe0",
                  background: theme === "dark" ? "#101725" : "#ffffff",
                  color: theme === "dark" ? "#e7ebf3" : "#111827",
                  reverseButtons: true,
                });
                if (result.isConfirmed)
                  await perform(
                    () => api.post("/payroll/" + month + "/finalize"),
                    "Payroll finalized and locked.",
                    true,
                    "major",
                  );
              }}
              onDownload={downloadPayslip}
              onEdit={(item) => editPayrollDraft(item)}
            />
          )}
          {page === "organization" && (
            <OrganizationPage
              user={user}
              settings={settings}
              departments={departments}
              designations={designations}
              leaveTypes={leaveTypes}
              holidays={holidays}
              onSettings={(form) =>
                perform(
                  () => api.put("/settings", form),
                  "Company settings updated.",
                )
              }
              onDepartment={(form) =>
                perform(
                  () => api.post("/departments", form),
                  "Department created.",
                )
              }
              onDesignation={(form) =>
                perform(
                  () => api.post("/designations", form),
                  "Designation created.",
                )
              }
              onLeaveType={(form) =>
                perform(
                  () => api.post("/leave-types", form),
                  "Leave type created.",
                )
              }
              onHoliday={(form) =>
                perform(() => api.post("/holidays", form), "Holiday added.")
              }
            />
          )}
          {page === "users" && (
            <UsersPage
              users={users}
              onCreate={(form) =>
                perform(() => api.post("/users/hr", form), "HR login created.", true, "major")
              }
              onToggle={async (item) => {
                const action = item.active ? "Deactivate" : "Activate";
                const result = await Swal.fire({
                  title: action + " " + item.name + "'s account?",
                  text: item.active
                    ? "They will lose access to this company workspace."
                    : "They will be able to sign in again.",
                  icon: item.active ? "warning" : "question",
                  showCancelButton: true,
                  confirmButtonText: action + " account",
                  cancelButtonText: "Cancel",
                  confirmButtonColor: item.active ? "#dc4659" : "#315fe0",
                  background: theme === "dark" ? "#101725" : "#ffffff",
                  color: theme === "dark" ? "#e7ebf3" : "#111827",
                  reverseButtons: true,
                });
                if (result.isConfirmed) {
                  await perform(
                    () =>
                      api.patch(`/users/${item._id}`, { active: !item.active }),
                    `Account ${item.active ? "deactivated" : "activated"}.`,
                  );
                }
              }}
              onReset={async (item) => {
                const result = await Swal.fire({
                  title: "Reset password",
                  text: "Set a temporary password for " + item.email + ".",
                  html: '<div style="position:relative"><input id="reset-password-input" class="swal2-input" type="password" placeholder="At least 8 characters" minlength="8" autocomplete="new-password" aria-label="Temporary password" style="width:100%;margin:1em 0;padding-right:3.25rem"><button id="reset-password-toggle" type="button" aria-label="Show password" title="Show password" style="position:absolute;right:0.65rem;top:50%;transform:translateY(-50%);width:2.5rem;height:2.5rem;border:0;background:transparent;color:#64748b;cursor:pointer"><svg id="reset-password-eye" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>',
                  focusConfirm: false,
                  preConfirm: () => {
                    const value = Swal.getPopup().querySelector("#reset-password-input").value;
                    if (value.length < 8) {
                      Swal.showValidationMessage("Enter a password with at least 8 characters.");
                      return false;
                    }
                    return value;
                  },
                  didOpen: () => {
                    const input = Swal.getPopup().querySelector("#reset-password-input");
                    const toggle = Swal.getPopup().querySelector("#reset-password-toggle");
                    toggle.addEventListener("click", () => {
                      const visible = input.type === "password";
                      input.type = visible ? "text" : "password";
                      toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
                      toggle.setAttribute("title", visible ? "Hide password" : "Show password");
                    });
                  },
                  showCancelButton: true,
                  confirmButtonText: "Reset password",
                  cancelButtonText: "Cancel",
                  confirmButtonColor: "#315fe0",
                  background: theme === "dark" ? "#101725" : "#ffffff",
                  color: theme === "dark" ? "#e7ebf3" : "#111827",
                  reverseButtons: true,
                });
                if (result.isConfirmed)
                  await perform(
                    () => api.patch("/users/" + item._id, {
                      resetPassword: result.value,
                    }),
                    "Password reset. Ask the user to change it at next sign-in.",
                    true,
                    "major",
                  );
              }}
            />
          )}
          {page === "expenses" && (
            <ExpensesPage
              user={user}
              claims={expenseClaims}
              onCreate={(form) => perform(() => api.post("/expenses", form), "Expense claim submitted.")}
              onHrReview={(item, status) => perform(() => api.patch(`/expenses/${item._id}/hr-review`, { status }), `Claim ${status}.`)}
              onAdminDecision={(item, status) => perform(() => api.patch(`/expenses/${item._id}/finalize`, { status }), `Claim ${status}.`)}
              onReceipt={async (item) => {
                try {
                  const { data } = await api.get(`/expenses/${item._id}/receipt`);
                  const link = document.createElement("a");
                  link.href = data.receiptData;
                  link.download = "expense-receipt";
                  link.click();
                } catch (err) { notify(errorMessage(err), "error"); }
              }}
            />
          )}
          {page === "performance" && (
            <PerformancePage
              user={user}
              cycles={reviewCycles}
              reviews={performanceReviews}
              onCreateCycle={(form) => perform(() => api.post("/performance/cycles", form), "Review cycle created.")}
              onCloseCycle={(cycle) => perform(() => api.patch(`/performance/cycles/${cycle._id}/close`), "Review cycle closed.")}
              onSelfAppraisal={(form) => perform(() => api.post("/performance/reviews", form), "Self-appraisal submitted.")}
              onHrReview={(item, form) => perform(() => api.patch(`/performance/reviews/${item._id}/hr-review`, { rating: Number(form.rating), comment: form.comment }), "HR review submitted.")}
              onFinalize={(item, form) => perform(() => api.patch(`/performance/reviews/${item._id}/finalize`, { rating: Number(form.rating), comment: form.comment }), "Final appraisal approved.", true, "major")}
            />
          )}
          {page === "announcements" && (
            <AnnouncementsPage
              user={user}
              announcements={announcements}
              notifications={notifications}
              onCreate={() => setModal("announcement")}
              onEdit={(item) => {
                setSelectedAnnouncement(item);
                setModal("announcementEdit");
              }}
              onDelete={async (item) => {
                const confirmation = await Swal.fire({
                  title: "Delete announcement?",
                  text: "This announcement will be removed from the workspace.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Delete",
                  cancelButtonText: "Cancel",
                  confirmButtonColor: "#dc4659",
                  reverseButtons: true,
                  background: theme === "dark" ? "#101725" : "#ffffff",
                  color: theme === "dark" ? "#e7ebf3" : "#111827",
                });
                if (confirmation.isConfirmed)
                  await perform(
                    () => api.delete("/announcements/" + item._id),
                    "Announcement deleted.",
                  );
              }}
              onRead={(item) =>
                perform(
                  () => api.patch(`/notifications/${item._id}/read`),
                  "Notification marked as read.",
                )
              }
            />
          )}
          {page === "audit" && (
            <>
              <SectionHeading
                title="Audit trail"
                subtitle="A record of important actions across your workspace."
              />
              <div className="panel">
                <Table
                  columns={[
                    {
                      key: "action",
                      label: "Action",
                      render: (item) => (
                        <div className="font-semibold text-slate-700">
                          {item.action?.replace(/[._]/g, " ")}
                        </div>
                      ),
                    },
                    {
                      key: "actorName",
                      label: "Actor",
                      render: (item) =>
                        item.actor?.name || item.actorName || "System",
                    },
                    { key: "entity", label: "Record type" },
                    {
                      key: "entityId",
                      label: "Record ID",
                      render: (item) => (
                        <span className="font-mono text-xs">
                          {item.entityId || "—"}
                        </span>
                      ),
                    },
                    {
                      key: "createdAt",
                      label: "Time",
                      render: (item) => shortDate(item.createdAt),
                    },
                  ]}
                  rows={auditLogs}
                  emptyTitle="No audit activity yet"
                  emptyMessage="Important actions will be recorded here."
                />
              </div>
            </>
          )}
          {page === "assistant" && (
            <AssistantPage
              chat={chat}
              input={chatInput}
              setInput={setChatInput}
              onSubmit={sendChat}
              user={user}
              companyName={settings?.company?.name || settings?.companyName || "PeopleDesk"}
            />
          )}
          {page === "profile" && (
            <ProfilePage
              user={user}
              employee={employees[0]}
              onSave={(id, form) =>
                perform(
                  () => api.patch(`/employees/${id}`, form),
                  "Your profile has been updated.",
                )
              }
              onPassword={(form) =>
                perform(
                  () => api.post("/auth/change-password", form),
                  "Password changed successfully.",
                )
              }
            />
          )}
          {page === "security" && (
            <ChangePasswordPage
              user={user}
              onChange={async (form) => {
                await api.post("/auth/change-password", form);
                const updatedUser = { ...user, mustChangePassword: false };
                window.localStorage.setItem(
                  "hcm_user",
                  JSON.stringify(updatedUser),
                );
                setUser(updatedUser);
                setPage("overview");
                notify("Password changed successfully. Welcome to PeopleDesk.");
              }}
            />
          )}
        </div>
      </main>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      {modal && (
        <Modal
          title={
            {
              employee: "Register an employee",
              employeeEdit: "Edit employee details",
              leave: "Request time off",
              department: "Add a department",
              announcement: "Create an announcement",
              announcementEdit: "Edit announcement",
              csv: "Import employees from CSV",
            }[modal] || "Create a record"
          }
          onClose={() => setModal("")}
        >
          {modal === "employee" && (
            <EmployeeForm
              departments={departments}
              designations={designations}
              onCancel={() => setModal("")}
              onSubmit={(form) =>
                perform(
                  () => api.post("/employees", form),
                  "Employee registered. Share the temporary password securely.",
                  false,
                  "major",
                )
              }
            />
          )}
          {modal === "employeeEdit" && selectedEmployee && (
            <EmployeeEditForm
              employee={selectedEmployee}
              departments={departments}
              designations={designations}
              onCancel={() => setModal("")}
              onSubmit={(form) =>
                perform(
                  () => api.patch(`/employees/${selectedEmployee._id}`, form),
                  "Employee details updated.",
                )
              }
            />
          )}
          {modal === "csv" && (
            <CSVImportForm
              onCancel={() => setModal("")}
              onDryRun={(csv) => api.post("/employees/import/dry-run", { csv })}
              onImport={(csv) =>
                perform(
                  () => api.post("/employees/import", { csv }),
                  "CSV import completed.",
                  false,
                )
              }
            />
          )}
          {modal === "leave" && (
            <LeaveForm
              leaveTypes={leaveTypes}
              onCancel={() => setModal("")}
              onSmartLeave={(text) => api.post("/ai/smart-leave", { text })}
              onSubmit={(form) =>
                perform(
                  () => api.post("/leaves", form),
                  "Leave request submitted.",
                )
              }
            />
          )}
          {modal === "department" && (
            <DepartmentForm
              onCancel={() => setModal("")}
              onSubmit={(form) =>
                perform(
                  () => api.post("/departments", form),
                  "Department created.",
                )
              }
            />
          )}
          {(modal === "announcement" || modal === "announcementEdit") && (
            <AnnouncementForm
              key={selectedAnnouncement?._id || "new-announcement"}
              user={user}
              initialData={modal === "announcementEdit" ? selectedAnnouncement : null}
              onCancel={() => {
                setModal("");
                setSelectedAnnouncement(null);
              }}
              onSubmit={(form) =>
                perform(
                  () => modal === "announcementEdit"
                    ? api.patch("/announcements/" + selectedAnnouncement._id, form)
                    : api.post("/announcements", form),
                  modal === "announcementEdit" ? "Announcement updated." : "Announcement published.",
                )
              }
            />
          )}
        </Modal>
      )}
    </div>
  );
}
