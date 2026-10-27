"use client";

import { useState } from "react";

import { Plus } from "lucide-react";
import { Empty, Field, PasswordField, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function UsersPage({ users, onCreate, onToggle, onReset }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <>
      <SectionHeading
        title="Access & users"
        subtitle="Create HR accounts and control account access."
      />
      <div className="panel mb-5 p-5">
        <h3 className="font-bold">Create HR login</h3>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await onCreate({ name, email, password });
            if (result) {
              setName("");
              setEmail("");
              setPassword("");
            }
          }}
        >
          <Field label="Full name">
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Temporary password">
            <PasswordField
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <button className="btn-primary">
            <Plus size={15} /> Create HR
          </button>
        </form>
      </div>
      <div className="panel">
        <Table
          columns={[
            {
              key: "name",
              label: "User",
              render: (item) => (
                <div>
                  <div className="font-semibold text-slate-700">
                    {item.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {item.email}
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              label: "Role",
              render: (item) => (
                <span className="badge badge-blue">{item.role}</span>
              ),
            },
            {
              key: "active",
              label: "Access",
              render: (item) => (
                <span
                  className={`badge ${item.active ? "badge-green" : "badge-red"}`}
                >
                  {item.active ? "Active" : "Inactive"}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "Created",
              render: (item) => shortDate(item.createdAt),
            },
            {
              key: "action",
              label: "Action",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary !px-3 !py-2 !text-xs"
                    onClick={() => onToggle(item)}
                  >
                    {item.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="btn-secondary !px-3 !py-2 !text-xs"
                    onClick={() => onReset(item)}
                  >
                    Reset password
                  </button>
                </div>
              ),
            },
          ]}
          rows={users}
          emptyTitle="No HR accounts yet"
          emptyMessage="Create an HR login so your people team can register employees and manage day-to-day operations."
        />
      </div>
    </>
  );
}
