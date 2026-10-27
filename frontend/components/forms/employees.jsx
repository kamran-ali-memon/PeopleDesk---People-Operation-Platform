"use client";

import { useState } from "react";

import { Check, Download, Plus } from "lucide-react";
import { errorMessage } from "../../lib/api";
import { Field, PasswordField } from "../ui";

export function EmployeeEditForm({
  employee,
  departments,
  designations,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: employee.name || "",
    phone: employee.phone || "",
    address: employee.address || "",
    department: employee.department?._id || employee.department || "",
    designation: employee.designation?._id || employee.designation || "",
    joinDate: employee.joinDate
      ? new Date(employee.joinDate).toISOString().slice(0, 10)
      : "",
    employmentStatus: employee.employmentStatus || "active",
    basicSalary: employee.basicSalary || "",
    allowances: employee.allowances || 0,
    gender: employee.gender || "",
  });
  const set = (key, value) => setForm({ ...form, [key]: value });
  const departmentDesignations = designations.filter((item) => {
    const departmentId = item.department?._id || item.department || "";
    return !form.department || !departmentId || String(departmentId) === String(form.department);
  });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await onSubmit({
          ...form,
          department: form.department || null,
          designation: form.designation || null,
          basicSalary: Number(form.basicSalary),
          allowances: Number(form.allowances),
        });
        if (result) onCancel();
      }}
    >
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        Employee ID:{" "}
        <span className="font-bold text-slate-700">
          {employee.employeeCode}
        </span>{" "}
        · Login email:{" "}
        <span className="font-bold text-slate-700">{employee.email}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <input
            className="field"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </Field>
        <Field label="Phone">
          <input
            className="field"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
          />
        </Field>
        <Field label="Address">
          <input
            className="field"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <Field label="Department">
          <select
            className="field"
            value={form.department}
            required
            onChange={(e) => setForm({ ...form, department: e.target.value, designation: "" })}
          >
            <option value="">Unassigned</option>
            {departments.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Designation">
          <select
            className="field"
            value={form.designation}
            required
            onChange={(e) => set("designation", e.target.value)}
          >
            <option value="">Unassigned</option>
            {departmentDesignations.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Join date">
          <input
            className="field"
            type="date"
            value={form.joinDate}
            onChange={(e) => set("joinDate", e.target.value)}
            required
            required
          />
        </Field>
        <Field label="Basic salary (PKR)">
          <input
            className="field"
            type="number"
            min="1"
            value={form.basicSalary}
            onChange={(e) => set("basicSalary", e.target.value)}
            required
          />
        </Field>
        <Field label="Allowances">
          <input
            className="field"
            type="number"
            min="0"
            value={form.allowances}
            onChange={(e) => set("allowances", e.target.value)}
          />
        </Field>
        <Field label="Employment status">
          <select
            className="field"
            value={form.employmentStatus}
            onChange={(e) => set("employmentStatus", e.target.value)}
          >
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="exited">Exited</option>
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          <Check size={15} /> Save changes
        </button>
      </div>
    </form>
  );
}

export function CSVImportForm({ onDryRun, onImport, onCancel }) {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function readFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result || ""));
      setFileName(file.name);
      setPreview(null);
      setResult(null);
      setError("");
    };
    reader.onerror = () => setError("Could not read this file.");
    reader.readAsText(file);
  }
  async function dryRun() {
    setBusy(true);
    setError("");
    try {
      const response = await onDryRun(csv);
      setPreview(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function importRows() {
    setBusy(true);
    setError("");
    try {
      const response = await onImport(csv);
      setResult(response.data);
      setPreview(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <h4 className="font-bold text-emerald-800">
            Imported {result.importedCount} employee(s)
          </h4>
          <p className="mt-1 text-xs leading-5 text-emerald-700">
            Download or securely share each temporary password now. Employees
            must change their password at first sign-in.
          </p>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {(result.created || []).map((item) => (
            <div
              key={item.email}
              className="rounded-xl border border-slate-100 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {item.employeeCode} · {item.email}
                </span>
                <button
                  className="text-xs font-bold text-brand-600"
                  onClick={() =>
                    navigator.clipboard?.writeText(item.temporaryPassword)
                  }
                >
                  Copy password
                </button>
              </div>
              <div className="mt-2 font-mono text-xs text-slate-600">
                {item.temporaryPassword}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={onCancel}>
          Done
        </button>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700">
        CSV columns required:{" "}
        <code>employee_code,name,email,basic_salary,join_date</code>. Optional
        columns: phone, address, department, designation, allowances. Department
        values must match an existing department name. Import always runs a
        validation preview first.
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center hover:border-brand-300 hover:bg-brand-50/30">
        <Download size={24} className="mb-3 text-brand-600" />
        <span className="text-sm font-bold">Choose CSV file</span>
        <span className="mt-1 text-xs text-slate-400">
          {fileName || "CSV format · Header row required"}
        </span>
        <input
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => readFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview && (
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="badge badge-green">
              {preview.validCount} valid
            </span>
            <span className="badge badge-red">
              {preview.invalidCount} invalid
            </span>
            <span className="badge badge-gray">{preview.total} total rows</span>
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {preview.rows.map((item) => (
              <div
                key={item.rowNumber}
                className="rounded-lg bg-slate-50 p-2 text-xs"
              >
                <div className="font-semibold">
                  Row {item.rowNumber}:{" "}
                  {item.name || item.employeeCode || "Unnamed record"}
                </div>
                {item.errors.length ? (
                  item.errors.map((issue, index) => (
                    <div key={index} className="mt-1 text-red-600">
                      {issue.field}: {issue.reason}
                    </div>
                  ))
                ) : (
                  <div className="mt-1 text-emerald-700">Ready to import</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-secondary"
          disabled={!csv || busy}
          onClick={dryRun}
        >
          {busy ? "Checking…" : "Validate CSV"}
        </button>
        <button
          className="btn-primary"
          disabled={!preview?.validCount || busy}
          onClick={importRows}
        >
          Import valid rows
        </button>
      </div>
    </div>
  );
}

export function EmployeeForm({
  departments,
  designations,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState({
    employeeCode: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    department: "",
    designation: "",
    joinDate: new Date().toISOString().slice(0, 10),
    basicSalary: "",
    allowances: "0",
    password: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await onSubmit({
        ...form,
        basicSalary: Number(form.basicSalary),
        allowances: Number(form.allowances),
      });
      setResult(response?.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  if (result?.temporaryPassword)
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="font-bold text-emerald-800">
            Employee created successfully
          </div>
          <p className="mt-1 text-sm text-emerald-700">
            Share this temporary password securely. It will not be shown again.
          </p>
          <div className="mt-3 rounded-lg bg-white p-3 font-mono text-sm">
            {result.temporaryPassword}
          </div>
          <div className="mt-2 text-xs text-emerald-700">
            The employee must change it after signing in.
          </div>
        </div>
        <button className="btn-primary w-full" onClick={onCancel}>
          Done
        </button>
      </div>
    );
  const set = (key, value) => setForm({ ...form, [key]: value });
  const departmentDesignations = designations.filter((item) => {
    const departmentId = item.department?._id || item.department || "";
    return !form.department || !departmentId || String(departmentId) === String(form.department);
  });
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Employee ID">
          <input
            className="field"
            value={form.employeeCode}
            onChange={(e) => set("employeeCode", e.target.value)}
            placeholder="EMP-001"
            required
          />
        </Field>
        <Field label="Full name">
          <input
            className="field"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </Field>
        <Field label="Work email">
          <input
            className="field"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </Field>
        <Field label="Phone" hint="Required">
          <input
            className="field"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
          />
        </Field>
        <Field label="Department" hint={!departments.length ? "No departments yet. Ask an admin to configure one." : "Required"}>
          <select
            className="field"
            value={form.department}
            required
            onChange={(e) => setForm({ ...form, department: e.target.value, designation: "" })}
          >
            <option value="">Select department</option>
            {departments.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Designation" hint={!departmentDesignations.length ? "No matching designation. Ask an admin to configure one." : "Required"}>
          <select
            className="field"
            value={form.designation}
            required
            onChange={(e) => set("designation", e.target.value)}
          >
            <option value="">Select designation</option>
            {departmentDesignations.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Join date">
          <input
            className="field"
            type="date"
            value={form.joinDate}
            onChange={(e) => set("joinDate", e.target.value)}
            required
            required
          />
        </Field>
        <Field label="Basic monthly salary (PKR)">
          <input
            className="field"
            type="number"
            min="1"
            value={form.basicSalary}
            onChange={(e) => set("basicSalary", e.target.value)}
            required
          />
        </Field>
        <Field label="Other monthly allowances">
          <input
            className="field"
            type="number"
            min="0"
            value={form.allowances}
            onChange={(e) => set("allowances", e.target.value)}
          />
        </Field>
        <Field
          label="Temporary password (optional)"
          hint="Leave blank to generate one automatically."
        >
          <PasswordField
            minLength={8}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Auto-generate"
          />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary">
          <Plus size={15} /> Create employee
        </button>
      </div>
    </form>
  );
}
