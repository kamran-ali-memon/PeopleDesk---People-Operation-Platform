"use client";

import { useEffect, useState } from "react";

import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Empty, Field, PasswordField, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function ChangePasswordPage({ user, onChange }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <div className="panel p-6 sm:p-8">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand-600">
          <ShieldCheck size={24} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Change your temporary password
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          For your account security, choose a new password before continuing to
          the workspace.
        </p>
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Signed in as <strong>{user.email}</strong>. Your account is limited
          until this step is complete.
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (newPassword.length < 8) {
              setError("New password must be at least 8 characters.");
              return;
            }
            if (newPassword !== confirmPassword) {
              setError("The new passwords do not match.");
              return;
            }
            setBusy(true);
            try {
              await onChange({ currentPassword, newPassword });
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Temporary / current password">
            <PasswordField
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <PasswordField
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordField
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? "Updating password…" : "Set new password"}{" "}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export function ProfilePage({ user, employee, onSave, onPassword }) {
  const [phone, setPhone] = useState(employee?.phone || "");
  const [address, setAddress] = useState(employee?.address || "");
  const [emergencyContactName, setEmergencyContactName] = useState(employee?.emergencyContactName || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(employee?.emergencyContactPhone || "");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(employee?.emergencyContactRelationship || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    setPhone(employee?.phone || "");
    setAddress(employee?.address || "");
    setEmergencyContactName(employee?.emergencyContactName || "");
    setEmergencyContactPhone(employee?.emergencyContactPhone || "");
    setEmergencyContactRelationship(employee?.emergencyContactRelationship || "");
  }, [employee]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeading
        title="My profile"
        subtitle="Keep your contact information and account security up to date."
      />
      <div className="panel p-5 sm:p-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold">{user.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <span className="mt-2 inline-flex badge badge-blue">Employee</span>
          </div>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (employee?._id) await onSave(employee._id, { phone, address, emergencyContactName, emergencyContactPhone, emergencyContactRelationship });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone number">
              <input
                className="field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
              />
            </Field>
            <Field label="Emergency contact name">
            <input className="field" value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} maxLength={120} placeholder="Contact name" />
          </Field>
          <Field label="Emergency contact phone">
            <input className="field" type="tel" value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} maxLength={40} placeholder="Phone number" />
          </Field>
          <Field label="Relationship">
            <input className="field" value={emergencyContactRelationship} onChange={(event) => setEmergencyContactRelationship(event.target.value)} maxLength={60} placeholder="e.g. Parent" />
          </Field>
          <Field label="Home address">
              <input
                className="field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your address"
              />
            </Field>
          </div>
          <button className="btn-primary" disabled={!employee?._id}>
            <Check size={15} /> Save contact details
          </button>
        </form>
      </div>
      <div className="panel p-5 sm:p-6">
        <h3 className="font-bold">Change password</h3>
        <p className="mt-1 text-xs text-slate-400">
          Use at least 8 characters for your new password.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onPassword({ currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password">
              <input
                className="field"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Field>
            <Field label="New password">
              <input
                className="field"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Field>
          </div>
          <button className="btn-secondary">
            <ShieldCheck size={15} /> Update password
          </button>
        </form>
      </div>
    </div>
  );
}
