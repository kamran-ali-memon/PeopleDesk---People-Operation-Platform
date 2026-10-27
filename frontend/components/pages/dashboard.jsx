"use client";

import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Sparkles,
  Users,
  Wallet,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  Megaphone,
  RefreshCw,
  BriefcaseBusiness,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function Overview({
  user,
  dashboard,
  attendance,
  leaves,
  payroll,
  summary,
  onNavigate,
  onCheckIn,
  onCheckOut,
  onSummarize,
}) {
  const kpis = dashboard?.kpis || {};
  const isEmployee = user.role === "employee";
  const personalToday = attendance.find(
    (item) =>
      String(item.employee?._id || item.employee) === String(user.employeeId) ||
      item.date === dashboard?.today,
  );
  const chartData = dashboard?.trends || [];
  return (
    <div className="animate-fade-up space-y-6">
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#2449a8] via-[#315fe0] to-[#6687f5] p-6 text-white shadow-lg shadow-blue-100 sm:p-8">
        <div className="absolute -right-8 -top-20 h-64 w-64 rounded-full border-[38px] border-white/[.07]" />
        <div className="absolute right-36 top-24 h-24 w-24 rounded-full bg-white/[.07] blur-xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold">
              <Sparkles size={13} /> Your people workspace
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {isEmployee
                ? "Your workday, at a glance."
                : user.role === "admin"
                  ? "Your team, in sync."
                  : "Your people, in focus."}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-blue-100">
              {isEmployee
                ? "Check your attendance, keep track of leave and find your latest payslip."
                : "A clear view of attendance, people and the decisions that keep your organization moving."}
            </p>
          </div>
          {isEmployee && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onCheckIn}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-brand-700 hover:bg-blue-50"
              >
                <CheckCircle2 size={17} /> Check in
              </button>
              <button
                onClick={onCheckOut}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
              >
                <Clock3 size={17} /> Check out
              </button>
            </div>
          )}
        </div>
        <div className="relative z-10 mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-blue-100">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-300" /> Workspace
            active
          </span>
          <span>
            {dashboard?.today || new Date().toISOString().slice(0, 10)}
          </span>
          <span>
            {user.role === "employee" ? "Personal view" : "Live company data"}
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isEmployee ? (
          <>
            <StatCard
              title="Hours this week"
              value={`${Number(kpis.hoursThisWeek ?? 0).toFixed(1)} h`}
              note="This week to date - completed shifts"
              icon={Clock3}
              tone="blue"
            />
            <StatCard
              title="Late count"
              value={
                dashboard?.recentAttendancePersonal?.filter(
                  (item) => item.status === "late",
                ).length || 0
              }
              note="Recent attendance records"
              icon={Activity}
              tone="blue"
            />
            <StatCard
              title="Leave requests"
              value={leaves.length}
              note="Pending and approved"
              icon={CalendarCheck}
              tone="violet"
            />
            <StatCard
              title="Latest payslip"
              value={
                dashboard?.recentPayslip
                  ? money(dashboard.recentPayslip.net)
                  : "—"
              }
              note={dashboard?.recentPayslip?.month || "No payslip yet"}
              icon={Wallet}
              tone="green"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total headcount"
              value={kpis.headcount ?? "—"}
              note="Active and probation"
              icon={Users}
              tone="blue"
              trend="Live"
            />
            <StatCard
              title="Present today"
              value={kpis.present ?? "—"}
              note={`${kpis.onLeave || 0} currently on leave`}
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard
              title="Late arrivals"
              value={kpis.late ?? "—"}
              note="Today's attendance"
              icon={Clock3}
              tone="blue"
            />
            <StatCard
              title="Pending approvals"
              value={kpis.pendingApprovals ?? "—"}
              note="Leave requests awaiting review"
              icon={ClipboardCheck}
              tone="violet"
            />
          </>
        )}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold">Attendance overview</h3>
              <p className="mt-1 text-xs text-slate-400">
                Daily records from your workspace
              </p>
            </div>
            <button
              onClick={() => onNavigate("attendance")}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              View attendance <ArrowRight size={13} className="ml-1 inline" />
            </button>
          </div>
          <div className="h-[230px] w-full">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 4, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="presentFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4778f5"
                        stopOpacity={0.22}
                      />
                      <stop offset="95%" stopColor="#4778f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#edf1f7" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#98a2b3", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#98a2b3", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e8edf5",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#4778f5"
                    strokeWidth={2.5}
                    fill="url(#presentFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    name="Late"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                icon={Activity}
                title="Attendance will build over time"
                message="As people check in, your attendance trend will appear here."
              />
            )}
          </div>
        </div>
        <div className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Department overview</h3>
              <p className="mt-1 text-xs text-slate-400">
                People by department
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <BriefcaseBusiness size={17} />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {(dashboard?.departmentCounts || []).length ? (
              dashboard.departmentCounts.slice(0, 5).map((item, index) => {
                const max = Math.max(
                  1,
                  ...dashboard.departmentCounts.map((dep) => dep.employees),
                );
                return (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        {item.name}
                      </span>
                      <span className="text-slate-400">
                        {item.employees} people
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-700"
                        style={{
                          width: `${(item.employees / max) * 100}%`,
                          opacity: 1 - index * 0.08,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty
                icon={Building2}
                title="No departments yet"
                message="Add departments in Organization to see team distribution."
              />
            )}
          </div>
          <button
            onClick={() =>
              onNavigate(user.role === "admin" ? "organization" : "employees")
            }
            className="btn-secondary mt-5 w-full"
          >
            Explore your team <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold">Recent activity</h3>
              <p className="mt-1 text-xs text-slate-400">
                Latest attendance records
              </p>
            </div>
            <button
              onClick={() => onNavigate("attendance")}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
            >
              <ArrowRight size={17} />
            </button>
          </div>
          {(dashboard?.recentAttendance || []).length ? (
            <div className="space-y-4">
              {dashboard.recentAttendance.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-xs font-bold text-slate-600">
                    {item.employee?.name
                      ?.split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "E"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {item.employee?.name || "Employee"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {item.checkIn
                        ? new Date(item.checkIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "No check-in"}{" "}
                      · {item.date}
                    </div>
                  </div>
                  <span className={`badge ${statusClass(item.status)}`}>
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Clock3}
              title="No attendance yet"
              message="Check-in activity will appear here once recorded."
            />
          )}
        </div>
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h3 className="font-bold">AI insights</h3>
              <p className="mt-1 text-xs text-slate-400">
                A quick read of your current data
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-brand-600">
              <Sparkles size={17} />
            </div>
          </div>
          <div className="space-y-3 p-5">
            {summary.length ? (
              summary.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-brand-600">
                    {index + 1}
                  </div>
                  <p className="text-xs leading-5 text-slate-600">
                    {String(item).replace(/^[•\-\d. ]+/, "")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                Insights will appear when data is available. Configure an AI API
                key for AI-generated summaries.
              </div>
            )}
            <button onClick={onSummarize} className="btn-secondary w-full">
              <RefreshCw size={14} /> Refresh summary
            </button>
          </div>
        </div>
      </div>
      <div className="panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Company announcements</h3>
            <p className="mt-1 text-xs text-slate-400">
              Updates shared with your team
            </p>
          </div>
          <button
            onClick={() => onNavigate("announcements")}
            className="text-xs font-bold text-brand-600"
          >
            See all <ArrowRight size={13} className="ml-1 inline" />
          </button>
        </div>
        {dashboard?.announcements?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.announcements.slice(0, 2).map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  <Megaphone size={13} />
                  {shortDate(item.createdAt)}
                </div>
                <h4 className="mt-2 text-sm font-bold">{item.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No announcements have been posted yet.
          </p>
        )}
      </div>
    </div>
  );
}
