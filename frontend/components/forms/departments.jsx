"use client";

import { useState } from "react";

import { Plus } from "lucide-react";
import { errorMessage } from "../../lib/api";
import { Field } from "../ui";

export function DepartmentForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await onSubmit({ name, description });
        if (result) onCancel();
      }}
    >
      <Field label="Department name">
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Engineering"
          required
        />
      </Field>
      <Field label="Description (optional)">
        <textarea
          className="field min-h-20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          <Plus size={15} /> Add department
        </button>
      </div>
    </form>
  );
}
