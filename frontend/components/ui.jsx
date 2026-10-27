"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);

import {
  Activity,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
  CircleAlert,
  CheckCircle2,
  Moon,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import api, { errorMessage } from "../lib/api";
import Swal from "sweetalert2";

export function Brand({ small = false, name = "PeopleDesk", logoData = "" }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-brand-600 text-white shadow-lg shadow-blue-200">
        {logoData ? <img src={logoData} alt="" className="h-full w-full object-cover" /> : <Activity size={21} strokeWidth={2.5} />}
      </div>
      <div className="min-w-0">
        <div className={(small ? "text-base" : "text-lg") + " truncate font-extrabold tracking-tight text-ink"}>
          {name}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[.19em] text-slate-400">
          {name === "PeopleDesk" ? "People operations platform" : "Company workspace"}
        </div>
      </div>
    </div>
  );
}
export function AuthScreen({ onLogin, theme = "light", onToggleTheme }) {
  const [setup, setSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const [company, setCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const authRef = useRef(null);
  const roleCardsRef = useRef(null);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = authRef.current?.querySelectorAll("[data-auth-enter]");
    if (!targets?.length) return;
    gsap.fromTo(targets, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" });
  });
  useGSAP(() => {
    if (setup || checking || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = roleCardsRef.current?.querySelectorAll("[data-role-card]");
    if (!cards?.length) return;
    gsap.fromTo(cards, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.07, ease: "power2.out" });
  }, { dependencies: [setup, checking], revertOnUpdate: true });
  useEffect(() => {
    api
      .get("/status")
      .then(({ data }) => {
        setSetup(!data.hasCompanies);
        setCompany(data.companyName || "");
        if (data.adminEmail) setEmail(data.adminEmail);
      })
      .catch(() =>
        setError(
          "Cannot reach the API. Check backend/.env and make sure the backend is running.",
        ),
      )
      .finally(() => setChecking(false));
  }, []);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!setup && !selectedRole) {
        setError("Select your role to continue.");
        setBusy(false);
        return;
      }
      const { data } = setup
        ? await api.post("/setup", { companyName: company, name, email, password })
        : await api.post("/auth/login", { role: selectedRole, email, password });
      await Swal.fire({
        icon: "success",
        title: setup ? "Your workspace is ready" : "Welcome back",
        text: setup
          ? (data.company?.name || "Your company") + " is ready to use PeopleDesk."
          : "Signed in to " + (data.company?.name || "your workspace") + ".",
        confirmButtonText: "Continue",
        confirmButtonColor: "#315fe0",
        background: theme === "dark" ? "#101725" : "#ffffff",
        color: theme === "dark" ? "#e7ebf3" : "#111827",
      });
      onLogin(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={authRef} className="auth-screen min-h-screen bg-[#f4f7fc] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section data-auth-enter className="auth-hero relative hidden min-h-screen overflow-hidden bg-[#15274b] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-8 -top-8 h-64 w-64 rounded-full border border-white/10" />
        <div className="auth-glow absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
        <Brand />
        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-blue-100">
            <Sparkles size={14} /> A smarter way to work together
          </div>
          <h1 className="text-5xl font-bold leading-[1.12] tracking-tight">
            Great teams start with{" "}
            <span className="text-blue-300">people.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-blue-100/75">
            One thoughtful workspace for your people, attendance, time off and
            payroll. Less admin. More clarity.
          </p>
          <div className="mt-12 grid max-w-lg grid-cols-2 gap-3">
            <Feature
              icon={Users}
              title="People directory"
              description="Every teammate, in one place"
            />
            <Feature
              icon={CalendarDays}
              title="Time & attendance"
              description="Daily work, made clear"
            />
            <Feature
              icon={Wallet}
              title="Payroll, simplified"
              description="Paydays without the guesswork"
            />
            <Feature
              icon={Sparkles}
              title="AI built in"
              description="Answers grounded in your data"
            />
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-100/50">
          <span>PeopleDesk · People operations</span>
          <span>Secure by design</span>
        </div>
      </section>
      <section data-auth-enter className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="absolute right-5 top-5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="w-full max-w-[430px] animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <div className="mb-8">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              {checking
                ? "Getting things ready…"
                : setup
                  ? "Set up your workspace"
                  : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {setup
                ? "Create your company and the first Admin account to get started."
                : "Sign in to your company workspace and pick up where you left off."}
            </p>
          </div>
          {checking ? (
            <div className="panel p-6 text-sm text-slate-500">
              Checking first-run setup…
            </div>
          ) : (
            <form className="auth-form space-y-4" onSubmit={submit}>
              {!setup && (
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold text-slate-600">Choose your workspace role</legend>
                  <div ref={roleCardsRef} role="radiogroup" aria-label="Workspace role" className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: "admin", title: "Admin", description: "Company settings and full HR operations.", icon: ShieldCheck },
                      { id: "hr", title: "HR", description: "People records and daily HR workflows.", icon: UsersRound },
                      { id: "employee", title: "Employee", description: "Your profile, time off, and payslips.", icon: UserRound },
                    ].map(({ id, title, description, icon: Icon }) => (
                      <button
                        key={id}
                        data-role-card
                        type="button"
                        role="radio"
                        aria-checked={selectedRole === id}
                        onClick={() => setSelectedRole(id)}
                        className={"rounded-xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " + (selectedRole === id ? "border-brand-600 bg-brand-50 shadow-sm ring-1 ring-brand-500" : "border-slate-200 bg-white hover:border-slate-300")}
                      >
                        <Icon size={18} className={selectedRole === id ? "text-brand-600" : "text-slate-400"} />
                        <span className="mt-2 block text-sm font-bold text-slate-800">{title}</span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {setup && (
                <>
                  <Field label="Company name">
                    <input
                      className="field"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Northstar Studio"
                      required
                    />
                  </Field>
                  <Field label="Admin full name">
                    <input
                      className="field"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </Field>
                </>
              )}
              <Field label="Work email">
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field
                label="Password"
                hint={
                  setup && email && password
                    ? ""
                    : setup
                      ? "Use at least 8 characters. If ADMIN_PASSWORD is configured on the server, that value will be used."
                      : ""
                }
              >
                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    setup ? "At least 8 characters" : "Enter your password"
                  }
                  minLength={setup ? 8 : 1}
                  autoComplete={setup ? "new-password" : "current-password"}
                  required
                />
              </Field>
              {error && (
                <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  <CircleAlert size={17} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <button className="btn-primary mt-2 w-full py-3" disabled={busy}>
                {busy ? "Please wait…" : setup ? "Create workspace" : "Sign in"}{" "}
                <ArrowRight size={17} />
              </button>
              {!setup && selectedRole !== "admin" && (
                <p className="pt-2 text-center text-xs text-slate-400">
                  Need access? Ask your company Admin to create your account.
                </p>
              )}
            </form>
          )}
          <p className="mt-5 text-center text-sm text-slate-500">
            {setup ? "Already have a workspace?" : "New to PeopleDesk?"}{" "}
            <button type="button" className="font-semibold text-brand-600 hover:text-brand-700" onClick={() => { setSetup(!setup); setError(""); }}>
              {setup ? "Sign in" : "Register your company"}
            </button>
          </p>
          <p className="mt-10 text-center text-xs text-slate-400">
            By continuing, you agree to use company data responsibly.
          </p>
        </div>
      </section>
    </div>
  );
}
export function Feature({ icon: Icon, title, description }) {
  return (
    <div className="auth-feature rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-sm">
      <Icon size={19} className="mb-4 text-blue-300" />
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-5 text-blue-100/60">
        {description}
      </div>
    </div>
  );
}
export function PasswordField({ className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...inputProps} type={visible ? "text" : "password"} className={`field pr-11 ${className}`} />
      <button type="button" onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="password-toggle absolute inset-y-0 right-1.5 grid w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-transparent hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-transparent dark:hover:text-slate-200">
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
export function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function StatCard({
  title,
  value,
  note,
  icon: Icon,
  tone = "blue",
  trend,
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className={"panel stat-card stat-card-" + tone + " p-5 transition duration-300 hover:-translate-y-1 hover:shadow-soft"}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <div className="mt-3 text-3xl font-bold tracking-tight text-ink">
            {value}
          </div>
        </div>
        <div
          className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        {trend && (
          <span className="inline-flex items-center text-emerald-600">
            <ArrowUpRight size={14} />
            {trend}
          </span>
        )}
        {note}
      </div>
    </div>
  );
}
export function Empty({
  icon: Icon = FileText,
  title = "Nothing here yet",
  message = "Records will appear here once your team starts using PeopleDesk.",
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
        {message}
      </p>
    </div>
  );
}
export function Table({ columns, rows = [], emptyTitle, emptyMessage }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const tableMotionRef = useRef(null);
  useGSAP(() => {
    if (!tableMotionRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const visibleRows = Array.from(tableMotionRef.current.querySelectorAll("tbody tr")).slice(0, 10);
    if (!visibleRows.length) return;
    gsap.fromTo(visibleRows, { autoAlpha: 0, y: 5 }, {
      autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.025, ease: "power2.out",
    });
  }, { dependencies: [currentPage, rows.length], revertOnUpdate: true });

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  return (
    <div ref={tableMotionRef}>
      <div className="table-scroll">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((row, index) => (
                <tr
                  key={row._id || row.id || index}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-5 py-4 text-sm text-slate-600"
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? " - ")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <Empty title={emptyTitle} message={emptyMessage} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-2" aria-label="Table pagination">
            <button
              type="button"
              className="btn-secondary !min-h-8 !px-3 !py-1.5 !text-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <span className="tabular-nums">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              className="btn-secondary !min-h-8 !px-3 !py-1.5 !text-xs"
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const modalMotionRef = useRef(null);
  useGSAP(() => {
    if (!modalMotionRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(modalMotionRef.current, { autoAlpha: 0, y: 14, scale: 0.985 }, {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.24, ease: "power2.out",
    });
  });
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6" aria-live={isError ? "assertive" : "polite"}>
      <div role={isError ? "alert" : "status"} className={"toast-card pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl " + (isError ? "border-red-200 bg-white text-red-700" : "border-emerald-200 bg-white text-slate-700")}>
        <span className={"mt-0.5 shrink-0 " + (isError ? "text-red-600" : "text-emerald-600")}>
          {isError ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
        </span>
        <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
