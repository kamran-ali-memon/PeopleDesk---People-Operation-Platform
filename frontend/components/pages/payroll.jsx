"use client";

import {
  CheckCircle2,
  Download,
  ShieldCheck,
  Users,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function PayrollPage({
  user,
  payroll,
  selectedMonth,
  setSelectedMonth,
  onRun,
  onFinalize,
  onDownload,
  onEdit,
}) {
  const monthItems = payroll.filter((item) => item.month === selectedMonth);
  const finalized = monthItems.some((item) => item.status === "finalized");
  return (
    <>
      <SectionHeading
        title="Payroll & payslips"
        subtitle="Monthly salary calculations, deductions and payroll records."
        action={
          <div className="flex flex-wrap gap-2">
            <input
              type="month"
              className="field !w-auto"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            {["admin", "hr"].includes(user.role) && (
              <button className="btn-primary" onClick={onRun}>
                <RefreshCw size={15} /> Run payroll
              </button>
            )}
            {user.role === "admin" && (
              <button
                className="btn-primary"
                disabled={!monthItems.length || finalized}
                onClick={() => onFinalize(selectedMonth)}
              >
                <ShieldCheck size={15} /> Finalize month
              </button>
            )}
          </div>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Employees in payroll"
          value={monthItems.length}
          note={selectedMonth}
          icon={Users}
        />
        <StatCard
          title="Gross payroll"
          value={money(
            monthItems.reduce((sum, item) => sum + Number(item.gross || 0), 0),
          )}
          note="Before deductions"
          icon={Wallet}
          tone="violet"
        />
        <StatCard
          title="Net pay"
          value={money(
            monthItems.reduce((sum, item) => sum + Number(item.net || 0), 0),
          )}
          note={finalized ? "Month finalized" : "Draft calculation"}
          icon={CheckCircle2}
          tone="green"
        />
      </div>
      <div className="panel">
        <Table
          columns={[
            ...(user.role !== "employee"
              ? [
                  {
                    key: "employee",
                    label: "Employee",
                    render: (item) => (
                      <div>
                        <div className="font-semibold text-slate-700">
                          {item.employee?.name || "Employee"}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {item.employee?.employeeCode || ""}
                        </div>
                      </div>
                    ),
                  },
                ]
              : []),
            { key: "month", label: "Period" },
            {
              key: "gross",
              label: "Gross pay",
              render: (item) => money(item.gross),
            },
            {
              key: "deductions",
              label: "Deductions",
              render: (item) =>
                money(Number(item.deductions || 0) + Number(item.tax || 0)),
            },
            {
              key: "net",
              label: "Net pay",
              render: (item) => (
                <span className="font-bold text-slate-800">
                  {money(item.net)}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (item) => (
                <span className={`badge ${statusClass(item.status)}`}>
                  {item.status}
                </span>
              ),
            },
            ...(user.role !== "employee"
              ? [{
                  key: "edit",
                  label: "Draft actions",
                  render: (item) => item.status === "draft" ? (
                    <button
                      className="btn-secondary !px-3 !py-2 !text-xs"
                      onClick={() => onEdit(item)}
                    >
                      Edit draft
                    </button>
                  ) : "Locked",
                }]
              : []),
            {
              key: "download",
              label: "Payslip",
              render: (item) => (
                <button
                  className="btn-secondary !px-3 !py-2 !text-xs"
                  onClick={() => onDownload(item)}
                >
                  <Download size={13} /> PDF
                </button>
              ),
            },
          ]}
          rows={payroll.filter(
            (item) =>
              user.role === "employee" ||
              !selectedMonth ||
              item.month === selectedMonth,
          )}
          emptyTitle="No payroll records"
          emptyMessage={
            user.role === "hr"
              ? "Choose a month and run payroll to prepare a draft from employee and attendance data."
              : "Payslips will appear after HR prepares payroll."
          }
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Calculations use the illustrative tax slabs and salary rules from the
        challenge brief. Review all payroll values before using them for actual
        salary payments.
      </p>
    </>
  );
}
