"use client";

import { useState } from "react";

import { Sparkles, CalendarCheck } from "lucide-react";
import { errorMessage } from "../../lib/api";
import { Field } from "../ui";

export function LeaveForm({ leaveTypes, onSubmit, onCancel, onSmartLeave }) {
  const [form, setForm] = useState({
    type: leaveTypes[0]?.name || "Casual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [smartText, setSmartText] = useState("");
  const [smartBusy, setSmartBusy] = useState(false);
  async function suggestLeave() {
    if (!smartText.trim()) return;
    setSmartBusy(true);
    setError("");
    try {
      const { data } = await onSmartLeave(smartText);
      setForm({
        ...form,
        type: data.type || form.type,
        startDate: data.startDate || form.startDate,
        endDate: data.endDate || form.endDate,
        reason: data.reason || smartText,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSmartBusy(false);
    }
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const result = await onSubmit(form);
          if (result) onCancel();
        } catch (err) {
          setError(errorMessage(err));
        }
      }}
    >
      <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-800">
          <Sparkles size={14} /> Smart leave assistant
        </div>
        <div className="flex gap-2">
          <input
            className="field !border-violet-100 bg-white"
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            placeholder="e.g. I need next Monday off for a wedding"
          />
          <button
            type="button"
            className="btn-primary !bg-violet-600 !px-3"
            onClick={suggestLeave}
            disabled={smartBusy || !smartText.trim()}
          >
            {smartBusy ? "Thinking…" : "Suggest"}
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-violet-700">
          This only fills the form. Review the dates and submit to confirm your
          request.
        </p>
      </div>
      <Field label="Leave type">
        <select
          className="field"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          required
        >
          {leaveTypes.map((item) => (
            <option key={item._id} value={item.name}>
              {item.name}
              {item.paid ? ` · ${item.quota} days/year` : " · unpaid"}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date">
          <input
            className="field"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </Field>
        <Field label="End date">
          <input
            className="field"
            type="date"
            min={form.startDate}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />
        </Field>
      </div>
      <Field label="Reason">
        <textarea
          className="field min-h-24 resize-y"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder="Tell us a little about your request"
          required
        />
      </Field>
      <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700">
        Working days are calculated automatically, excluding weekends and
        configured public holidays. Requests are checked against your leave
        balance and overlapping requests.
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          <CalendarCheck size={15} /> Submit request
        </button>
      </div>
    </form>
  );
}
