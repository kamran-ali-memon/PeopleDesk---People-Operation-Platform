"use client";

import { useState } from "react";

import { Plus } from "lucide-react";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function LeavePage({
  user,
  leaves,
  leaveTypes,
  balances,
  onCreate,
  onReview,
  onCancel,
}) {
  const [comment, setComment] = useState({});
  const pending = leaves.filter((item) => item.status === "pending").length;
  return (
    <>
      <SectionHeading
        title="Leave management"
        subtitle="Request time off, keep an eye on balances and review approvals."
        action={
          user.role === "employee" ? (
            <button className="btn-primary" onClick={onCreate}>
              <Plus size={16} /> Request leave
            </button>
          ) : (
            <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
              {pending} pending request(s)
            </div>
          )
        }
      />
      {user.role === "employee" && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {leaveTypes.map((item) => {
            const balance = balances.find(
              (entry) => entry.name.toLowerCase() === item.name.toLowerCase(),
            );
            return (
              <div key={item._id} className="panel p-4">
                <div className="text-xs font-semibold text-slate-500">
                  {item.name} leave
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {item.paid ? (balance?.remaining ?? item.quota) : "∞"}{" "}
                  <span className="text-xs font-medium text-slate-400">
                    {item.paid ? "days left" : "unlimited"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  {item.paid
                    ? `${balance?.used || 0} of ${item.quota} days used this year`
                    : "Unpaid leave policy"}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="panel">
        <Table
          columns={[
            ...(user.role !== "employee"
              ? [
                  {
                    key: "employee",
                    label: "Employee",
                    render: (item) => (
                      <div className="font-semibold text-slate-700">
                        {item.employee?.name || "Employee"}
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: "type",
              label: "Leave type",
              render: (item) => (
                <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700">
                  {item.type}
                </span>
              ),
            },
            {
              key: "dates",
              label: "Dates",
              render: (item) => (
                <div>
                  {shortDate(item.startDate)}
                  <div className="mt-1 text-xs text-slate-400">
                    to {shortDate(item.endDate)}
                  </div>
                </div>
              ),
            },
            {
              key: "workingDays",
              label: "Days",
              render: (item) => `${item.workingDays} day(s)`,
            },
            {
              key: "reason",
              label: "Reason",
              render: (item) => (
                <span
                  title={item.reason}
                  className="inline-block max-w-[200px] truncate"
                >
                  {item.reason}
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
            {
              key: "action",
              label: "Action",
              render: (item) =>
                ["admin", "hr"].includes(user.role) &&
                (item.status === "pending" || (user.role === "admin" && item.status === "rejected")) ? (
                  <div className="min-w-[160px] space-y-2">
                    <input
                      className="field !py-1.5 !text-xs"
                      placeholder="Optional comment"
                      value={comment[item._id] || ""}
                      onChange={(e) =>
                        setComment({ ...comment, [item._id]: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700"
                        onClick={() => onReview(item, true, comment[item._id])}
                      >
                        {user.role === "admin" && item.status === "rejected" ? "Override & approve" : "Approve"}
                      </button>
                      {item.status === "pending" && <button
                        className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-600"
                        onClick={() => onReview(item, false, comment[item._id])}
                      >
                        Reject
                      </button>}
                    </div>
                  </div>
                ) : user.role === "employee" && item.status === "pending" ? (
                  <button
                    className="text-xs font-semibold text-red-600 hover:underline"
                    onClick={() => onCancel(item)}
                  >
                    Cancel
                  </button>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={leaves}
          emptyTitle="No leave requests yet"
          emptyMessage="Leave requests and approval history will appear here."
        />
      </div>
    </>
  );
}
