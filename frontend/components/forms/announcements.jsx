"use client";

import { useState } from "react";

import { Megaphone } from "lucide-react";
import { errorMessage } from "../../lib/api";
import { Field } from "../ui";

export function AnnouncementForm({ onSubmit, onCancel, user, initialData }) {
  const [form, setForm] = useState({
    title: initialData?.title || "",
    message: initialData?.message || "",
    audience: initialData?.audience || (user?.role === "hr" ? "employee" : "all"),
  });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await onSubmit(form);
        if (result) onCancel();
      }}
    >
      <Field label="Title">
        <input
          className="field"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </Field>
      <Field label="Message">
        <textarea
          className="field min-h-28 resize-y"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
      </Field>
      <Field label="Audience">
        <select
          className="field"
          value={form.audience}
          onChange={(e) => setForm({ ...form, audience: e.target.value })}
        >
          {user?.role === "admin" && <option value="all">Everyone</option>}
          <option value="hr">HR team</option>
          <option value="employee">Employees</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          <Megaphone size={15} /> {initialData ? "Save changes" : "Publish announcement"}
        </button>
      </div>
    </form>
  );
}
