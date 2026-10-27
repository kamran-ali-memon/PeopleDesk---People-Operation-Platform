"use client";

import { useEffect, useState } from "react";

import { Check, Plus, Building2 } from "lucide-react";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function OrganizationPage({
  user,
  settings,
  departments,
  designations,
  leaveTypes,
  holidays,
  onSettings,
  onDepartment,
  onDesignation,
  onLeaveType,
  onHoliday,
}) {
  const [form, setForm] = useState({});
  const [logoError, setLogoError] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [designationDept, setDesignationDept] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [quota, setQuota] = useState("10");
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  useEffect(() => {
    if (settings)
      setForm({
        companyName: settings.companyName || "",
        logoData: settings.company?.logoData || "",
        officeStart: settings.officeStart || "09:00",
        graceMinutes: settings.graceMinutes ?? 15,
        halfDayHours: settings.halfDayHours ?? 5,
        weekendDays: settings.weekendDays || [0, 6],
        officeLatitude: settings.officeLatitude ?? "",
        officeLongitude: settings.officeLongitude ?? "",
        officeRadius: settings.officeRadius ?? 150,
      });
  }, [settings]);
  if (user?.role === "hr") {
    return (
      <div className="space-y-5">
        <SectionHeading
          title="Departments & designations"
          subtitle="Company structure, available in read-only mode."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="panel p-5">
            <h2 className="font-bold">Departments</h2>
            <div className="mt-4 space-y-2">
              {departments.length ? departments.map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-100 px-4 py-3 text-sm font-semibold">{item.name}</div>
              )) : <p className="text-sm text-slate-500">No departments are configured.</p>}
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="font-bold">Designations</h2>
            <div className="mt-4 space-y-2">
              {designations.length ? designations.map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.department?.name || "Unassigned"}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No designations are configured.</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <SectionHeading
        title="Organization setup"
        subtitle="Configure the company, office rules and the policies that drive HR workflows."
      />
      <form
        className="panel p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSettings({
            ...form,
            graceMinutes: Number(form.graceMinutes),
            halfDayHours: Number(form.halfDayHours),
            officeLatitude:
              form.officeLatitude === "" ? null : Number(form.officeLatitude),
            officeLongitude:
              form.officeLongitude === "" ? null : Number(form.officeLongitude),
            officeRadius: Number(form.officeRadius),
          });
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand-600">
            <Building2 size={19} />
          </div>
          <div>
            <h3 className="font-bold">Company & office rules</h3>
            <p className="mt-1 text-xs text-slate-400">
              Rules apply to new attendance and leave records.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Company logo">
            <input
              className="field"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
                  setLogoError("Choose a PNG, JPEG, or WebP image smaller than 1 MB.");
                  e.target.value = "";
                  return;
                }
                setLogoError("");
                const reader = new FileReader();
                reader.onload = () => setForm((current) => ({ ...current, logoData: String(reader.result || "") }));
                reader.readAsDataURL(file);
              }}
            />
            {form.logoData && <img src={form.logoData} alt="Company logo preview" className="mt-2 h-12 w-12 rounded-xl border border-slate-200 object-cover" />}
            {logoError && <span className="block text-xs text-red-600">{logoError}</span>}
          </Field>
          <Field label="Company name">
            <input
              className="field"
              value={form.companyName || ""}
              onChange={(e) =>
                setForm({ ...form, companyName: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Office start time">
            <input
              className="field"
              type="time"
              value={form.officeStart || "09:00"}
              onChange={(e) =>
                setForm({ ...form, officeStart: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Grace time (minutes)">
            <input
              className="field"
              type="number"
              min="0"
              value={form.graceMinutes ?? 15}
              onChange={(e) =>
                setForm({ ...form, graceMinutes: e.target.value })
              }
            />
          </Field>
          <Field label="Half-day threshold (hours)">
            <input
              className="field"
              type="number"
              min="1"
              step="0.5"
              value={form.halfDayHours ?? 5}
              onChange={(e) =>
                setForm({ ...form, halfDayHours: e.target.value })
              }
            />
          </Field>
          <Field label="Office latitude">
            <input
              className="field"
              type="number"
              step="any"
              value={form.officeLatitude ?? ""}
              onChange={(e) =>
                setForm({ ...form, officeLatitude: e.target.value })
              }
              placeholder="Optional"
            />
          </Field>
          <Field label="Office longitude">
            <input
              className="field"
              type="number"
              step="any"
              value={form.officeLongitude ?? ""}
              onChange={(e) =>
                setForm({ ...form, officeLongitude: e.target.value })
              }
              placeholder="Optional"
            />
          </Field>
          <Field label="Office radius (meters)">
            <input
              className="field"
              type="number"
              min="1"
              value={form.officeRadius ?? 150}
              onChange={(e) =>
                setForm({ ...form, officeRadius: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">
            Weekend days
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 0, label: "Sunday" },
              { value: 1, label: "Monday" },
              { value: 2, label: "Tuesday" },
              { value: 3, label: "Wednesday" },
              { value: 4, label: "Thursday" },
              { value: 5, label: "Friday" },
              { value: 6, label: "Saturday" },
            ].map((day) => (
              <label
                key={day.value}
                className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${form.weekendDays?.includes(day.value) ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={form.weekendDays?.includes(day.value) || false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weekendDays: e.target.checked
                        ? [...(form.weekendDays || []), day.value]
                        : form.weekendDays.filter((item) => item !== day.value),
                    })
                  }
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary mt-5">
          <Check size={15} /> Save company settings
        </button>
      </form>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-bold">Departments</h3>
          <p className="mt-1 text-xs text-slate-400">
            Organize employees into teams.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onDepartment({ name: newDepartment });
              setNewDepartment("");
            }}
          >
            <input
              className="field"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              required
            />
            <button className="btn-primary">
              <Plus size={15} /> Add
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {departments.length ? (
              departments.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm"
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-xs text-slate-400">Department</span>
                </div>
              ))
            ) : (
              <p className="py-4 text-xs text-slate-400">
                No departments created yet.
              </p>
            )}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold">Designations</h3>
          <p className="mt-1 text-xs text-slate-400">
            Add roles within your departments.
          </p>
          <form
            className="mt-4 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onDesignation({
                name: newDesignation,
                department: designationDept || null,
              });
              setNewDesignation("");
            }}
          >
            <input
              className="field"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              placeholder="e.g. Product designer"
              required
            />
            <select
              className="field"
              value={designationDept}
              onChange={(e) => setDesignationDept(e.target.value)}
            >
              <option value="">No department selected</option>
              {departments.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="btn-primary">
              <Plus size={15} /> Add designation
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {designations.map((item) => (
              <span
                key={item._id}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold">Leave types & quotas</h3>
          <p className="mt-1 text-xs text-slate-400">
            Default policies: casual 10, sick 8, annual 14, unpaid unlimited.
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onLeaveType({
                name: leaveName,
                quota: Number(quota),
                paid: leaveName.toLowerCase() !== "unpaid",
              });
              setLeaveName("");
            }}
          >
            <input
              className="field min-w-[130px] flex-1"
              value={leaveName}
              onChange={(e) => setLeaveName(e.target.value)}
              placeholder="Leave type"
              required
            />
            <input
              className="field w-24"
              type="number"
              min="0"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              required
            />
            <button className="btn-primary">
              <Plus size={15} /> Add
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {leaveTypes.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="text-xs text-slate-500">
                  {item.paid ? `${item.quota} days/year` : "Unpaid · unlimited"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="font-bold">Public holidays</h3>
          <p className="mt-1 text-xs text-slate-400">
            Holidays are excluded from working-day calculations.
          </p>
          <form
            className="mt-4 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await onHoliday({ name: holidayName, date: holidayDate });
              setHolidayName("");
              setHolidayDate("");
            }}
          >
            <input
              className="field"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="Holiday name"
              required
            />
            <input
              className="field"
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              required
            />
            <button className="btn-primary">
              <Plus size={15} /> Add holiday
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {holidays.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3"
              >
                <span className="text-sm font-semibold">{item.name}</span>
                <span className="text-xs text-slate-400">
                  {shortDate(item.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
