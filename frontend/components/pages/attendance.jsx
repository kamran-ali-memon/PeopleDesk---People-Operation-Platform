"use client";

import { useState } from "react";

import { Activity, Check, Plus, X } from "lucide-react";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function AttendancePage({ user, attendance, onCorrection, onReview }) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("");
  const rows = attendance.filter((item) => !filter || item.status === filter);
  return (
    <>
      <SectionHeading
        title="Attendance"
        subtitle="Check-in records, daily status and correction requests."
        action={
          user.role === "employee" ? (
            <button
              className="btn-primary"
              onClick={() => setShowCorrection(!showCorrection)}
            >
              <Plus size={16} /> Request correction
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
              <Activity size={14} /> Server-stamped records
            </div>
          )
        }
      />
      {showCorrection && (
        <form
          className="panel mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            await onCorrection({ date, reason });
            setReason("");
            setShowCorrection(false);
          }}
        >
          <Field label="Date">
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Reason for correction">
            <input
              className="field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what needs correcting"
              required
            />
          </Field>
          <button className="btn-primary">Submit request</button>
        </form>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "present", "late", "half_day", "missing_checkout", "absent"].map(
          (item) => (
            <button
              key={item || "all"}
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${filter === item ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              {item ? item.replace("_", " ") : "All records"}
            </button>
          ),
        )}
      </div>
      <div className="panel">
        <Table
          columns={[
            {
              key: "employee",
              label: "Employee",
              render: (item) => (
                <div>
                  <div className="font-semibold text-slate-700">
                    {item.employee?.name || "My attendance"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {item.employee?.employeeCode || item.date}
                  </div>
                </div>
              ),
            },
            { key: "date", label: "Date" },
            {
              key: "checkIn",
              label: "Check in",
              render: (item) =>
                item.checkIn
                  ? new Date(item.checkIn).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—",
            },
            {
              key: "checkOut",
              label: "Check out",
              render: (item) =>
                item.checkOut
                  ? new Date(item.checkOut).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—",
            },
            {
              key: "status",
              label: "Status",
              render: (item) => (
                <span className={`badge ${statusClass(item.status)}`}>
                  {item.status.replace("_", " ")}
                </span>
              ),
            },
            {
              key: "correctionStatus",
              label: "Correction",
              render: (item) =>
                item.correctionStatus === "pending" &&
                ["admin", "hr"].includes(user.role) ? (
                  <div className="flex gap-1">
                    <button
                      className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                      title="Approve"
                      onClick={() => onReview(item, true)}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="rounded-lg bg-red-50 p-2 text-red-600"
                      title="Reject"
                      onClick={() => onReview(item, false)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : item.correctionStatus === "rejected" && user.role === "admin" ? (
                  <button
                    className="rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700"
                    onClick={() => onReview(item, true)}
                  >
                    Override & approve
                  </button>
                ) : item.correctionStatus !== "none" ? (
                  <span
                    className={`badge ${statusClass(item.correctionStatus)}`}
                  >
                    {item.correctionStatus}
                  </span>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={rows}
          emptyTitle="No attendance records"
          emptyMessage="Records appear after employees check in or HR makes a correction."
        />
      </div>
    </>
  );
}
