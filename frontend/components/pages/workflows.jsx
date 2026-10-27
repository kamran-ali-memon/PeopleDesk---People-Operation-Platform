"use client";

import { useState } from "react";
import { BadgeCheck, CalendarDays, FileCheck2, ReceiptText, Send, ShieldCheck, Upload } from "lucide-react";
import { Field, SectionHeading, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

const categories = [
  ["travel", "Travel"],
  ["equipment", "Equipment"],
  ["internet", "Internet"],
  ["maintenance", "Maintenance"],
  ["other", "Other"],
];

export function ExpensesPage({
  user, claims, onCreate, onHrReview, onAdminDecision, onReceipt,
}) {
  const [form, setForm] = useState({ title: "", category: "travel", amount: "", description: "", receiptData: "" });
  const [fileError, setFileError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const result = await onCreate({ ...form, amount: Number(form.amount) });
    if (result) setForm({ title: "", category: "travel", amount: "", description: "", receiptData: "" });
  }
  return (
    <div className="space-y-5">
      <SectionHeading title="Expenses & reimbursement" subtitle={user.role === "employee" ? "Submit a work expense and track its approval." : "Review employee reimbursement claims through the approval stages."} />
      {user.role === "employee" && (
        <form className="panel grid gap-4 p-5 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Claim title"><input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Home internet — October" maxLength={120} required /></Field>
          <Field label="Category"><select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Amount (PKR)"><input className="field" type="number" min="1" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
          <Field label="Receipt (PNG, JPEG, WebP or PDF, max 1 MB)">
            <input className="field" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!["image/png","image/jpeg","image/webp","application/pdf"].includes(file.type) || file.size > 1024 * 1024) {
                setFileError("Choose a supported receipt file under 1 MB."); e.target.value = ""; return;
              }
              setFileError("");
              const reader = new FileReader();
              reader.onload = () => setForm((current) => ({ ...current, receiptData: String(reader.result || "") }));
              reader.onerror = () => setFileError("Could not read this file.");
              reader.readAsDataURL(file);
            }} />
            {fileError && <span className="mt-1 block text-xs text-red-600">{fileError}</span>}
          </Field>
          <Field label="Business purpose"><textarea className="field min-h-20 sm:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} placeholder="Add context for the reviewer." /></Field>
          <div className="sm:col-span-2 flex justify-end"><button className="btn-primary"><ReceiptText size={15} /> Submit claim</button></div>
        </form>
      )}
      <div className="panel">
        <Table columns={[
          ...(user.role !== "employee" ? [{ key: "employee", label: "Employee", render: (item) => <div><strong>{item.employee?.name || "Employee"}</strong><div className="text-xs text-slate-400">{item.employee?.employeeCode}</div></div> }] : []),
          { key: "title", label: "Claim", render: (item) => <div><strong>{item.title}</strong><div className="text-xs text-slate-400 capitalize">{item.category} · {shortDate(item.createdAt)}</div></div> },
          { key: "amount", label: "Amount", render: (item) => money(item.amount) },
          { key: "status", label: "Status", render: (item) => <span className={"badge " + statusClass(item.status)}>{item.status.replace("_", " ")}</span> },
          { key: "receipt", label: "Receipt", render: (item) => item.hasReceipt ? <button className="btn-secondary !px-3 !py-2 !text-xs" onClick={() => onReceipt(item)}>View receipt</button> : "—" },
          { key: "action", label: "Review", render: (item) => user.role === "hr" && item.status === "submitted" ? <div className="flex gap-1"><button className="btn-secondary !px-2 !py-1.5 !text-xs" onClick={() => onHrReview(item, "verified")}>Verify</button><button className="btn-secondary !px-2 !py-1.5 !text-xs text-red-600" onClick={() => onHrReview(item, "rejected")}>Reject</button></div> : user.role === "admin" && item.status === "verified" ? <div className="flex gap-1"><button className="btn-primary !px-2 !py-1.5 !text-xs" onClick={() => onAdminDecision(item, "approved")}>Approve</button><button className="btn-secondary !px-2 !py-1.5 !text-xs text-red-600" onClick={() => onAdminDecision(item, "rejected")}>Reject</button></div> : "—" },
        ]} rows={claims} emptyTitle="No expense claims" emptyMessage={user.role === "employee" ? "Your submitted expense claims will appear here." : "Employee claims will appear here for review."} />
      </div>
    </div>
  );
}

export function PerformancePage({
  user, cycles, reviews, onCreateCycle, onCloseCycle, onSelfAppraisal, onHrReview, onFinalize,
}) {
  const [cycleForm, setCycleForm] = useState({ name: "", dueDate: "" });
  const [selfForm, setSelfForm] = useState({ cycleId: "", selfAppraisal: "", goals: "" });
  const [ratings, setRatings] = useState({});
  const activeCycles = cycles.filter((cycle) => cycle.status === "active");
  return (
    <div className="space-y-5">
      <SectionHeading title="Performance & appraisals" subtitle={user.role === "employee" ? "Share your accomplishments and goals for an active review cycle." : "Manage review cycles, HR assessments and final ratings."} />
      {user.role === "hr" && (
        <form className="panel grid gap-3 p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end" onSubmit={async (e) => {
          e.preventDefault();
          const result = await onCreateCycle(cycleForm);
          if (result) setCycleForm({ name: "", dueDate: "" });
        }}>
          <Field label="Review cycle"><input className="field" value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} placeholder="e.g. 2026 Mid-year review" required /></Field>
          <Field label="Due date"><input className="field" type="date" value={cycleForm.dueDate} onChange={(e) => setCycleForm({ ...cycleForm, dueDate: e.target.value })} required /></Field>
          <button className="btn-primary"><CalendarDays size={15} /> Create cycle</button>
        </form>
      )}
      {user.role === "employee" && activeCycles.length > 0 && (
        <form className="panel grid gap-4 p-5" onSubmit={async (e) => {
          e.preventDefault();
          const result = await onSelfAppraisal(selfForm);
          if (result) setSelfForm({ cycleId: "", selfAppraisal: "", goals: "" });
        }}>
          <Field label="Review cycle"><select className="field" value={selfForm.cycleId} onChange={(e) => setSelfForm({ ...selfForm, cycleId: e.target.value })} required><option value="">Choose an active cycle</option>{activeCycles.map((cycle) => <option key={cycle._id} value={cycle._id}>{cycle.name} · due {shortDate(cycle.dueDate)}</option>)}</select></Field>
          <Field label="Self-appraisal"><textarea className="field min-h-28" value={selfForm.selfAppraisal} onChange={(e) => setSelfForm({ ...selfForm, selfAppraisal: e.target.value })} maxLength={5000} placeholder="Describe your contributions and outcomes." required /></Field>
          <Field label="Goals"><textarea className="field min-h-20" value={selfForm.goals} onChange={(e) => setSelfForm({ ...selfForm, goals: e.target.value })} maxLength={3000} placeholder="What would you like to focus on next?" /></Field>
          <div className="flex justify-end"><button className="btn-primary"><Send size={15} /> Submit self-appraisal</button></div>
        </form>
      )}
      {user.role === "hr" && cycles.length > 0 && (
        <div className="panel divide-y divide-slate-100">
          {cycles.map((cycle) => <div key={cycle._id} className="flex items-center justify-between gap-3 p-4"><div><strong>{cycle.name}</strong><div className="text-xs text-slate-500">Due {shortDate(cycle.dueDate)} · {cycle.status}</div></div>{cycle.status === "active" && <button className="btn-secondary !px-3 !py-2 !text-xs" onClick={() => onCloseCycle(cycle)}>Close cycle</button>}</div>)}
        </div>
      )}
      <div className="grid gap-3">
        {reviews.length ? reviews.map((review) => (
          <article key={review._id} className="panel space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{review.employee?.name || "My appraisal"}</h3><p className="text-xs text-slate-500">{review.cycle?.name} · {review.status.replace("_", " ")}</p></div><span className={"badge " + statusClass(review.status)}>{review.status.replace("_", " ")}</span></div>
            <div><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Self-appraisal</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{review.selfAppraisal}</p></div>
            {review.goals && <div><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Goals</h4><p className="mt-1 whitespace-pre-wrap text-sm">{review.goals}</p></div>}
            {user.role !== "employee" && review.hrComment && <p className="text-sm text-slate-500">HR: {review.hrComment} · {review.hrRating}/5</p>}
            {user.role === "employee" && review.status === "finalized" && <div className="rounded-xl bg-emerald-50 p-3 text-sm"><strong>Final rating: {review.finalRating}/5</strong>{review.finalComment && <p className="mt-1">{review.finalComment}</p>}</div>}
            {user.role === "hr" && review.status === "submitted" && <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-end"><Field label="HR rating (1–5)"><select className="field" value={ratings["hr-"+review._id]?.rating || ""} onChange={(e) => setRatings({ ...ratings, ["hr-"+review._id]: { ...ratings["hr-"+review._id], rating: e.target.value } })}><option value="">Rating</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></Field><Field label="HR notes"><input className="field" value={ratings["hr-"+review._id]?.comment || ""} onChange={(e) => setRatings({ ...ratings, ["hr-"+review._id]: { ...ratings["hr-"+review._id], comment: e.target.value } })} /></Field><button className="btn-primary" onClick={() => onHrReview(review, ratings["hr-"+review._id] || {})}><BadgeCheck size={15} /> Submit review</button></div>}
            {user.role === "admin" && review.status === "hr_reviewed" && <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto] sm:items-end"><Field label="Final rating (1–5)"><select className="field" value={ratings["admin-"+review._id]?.rating || ""} onChange={(e) => setRatings({ ...ratings, ["admin-"+review._id]: { ...ratings["admin-"+review._id], rating: e.target.value } })}><option value="">Rating</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></Field><Field label="Final notes"><input className="field" value={ratings["admin-"+review._id]?.comment || ""} onChange={(e) => setRatings({ ...ratings, ["admin-"+review._id]: { ...ratings["admin-"+review._id], comment: e.target.value } })} /></Field><button className="btn-primary" onClick={() => onFinalize(review, ratings["admin-"+review._id] || {})}><ShieldCheck size={15} /> Finalize rating</button></div>}
          </article>
        )) : <div className="panel p-8 text-center text-sm text-slate-500">{user.role === "employee" ? "No performance reviews yet." : "No self-appraisals have been submitted."}</div>}
      </div>
    </div>
  );
}
