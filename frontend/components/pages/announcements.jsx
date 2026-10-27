"use client";

import { Bell, Plus, Megaphone, Pencil, Trash2 } from "lucide-react";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function AnnouncementsPage({
  user,
  announcements,
  notifications,
  onCreate,
  onRead,
  onEdit,
  onDelete,
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <section>
        <SectionHeading
          title="Announcements"
          subtitle="Company news and important updates."
          action={
            ["admin", "hr"].includes(user.role) ? (
              <button className="btn-primary" onClick={onCreate}>
                <Plus size={15} /> New announcement
              </button>
            ) : null
          }
        />
        {announcements.length ? (
          <div className="space-y-3">
            {announcements.map((item) => (
              <article
                key={item._id}
                className="panel p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  <Megaphone size={13} />
                  {item.audience === "all" ? "Everyone" : item.audience} ·{" "}
                  {shortDate(item.createdAt)}
                </div>
                {user.role === "admin" && <div className="flex gap-1">
                  <button type="button" className="btn-secondary !p-2" aria-label="Edit announcement" onClick={() => onEdit(item)}><Pencil size={14} /></button>
                  <button type="button" className="btn-secondary !p-2 text-red-600" aria-label="Delete announcement" onClick={() => onDelete(item)}><Trash2 size={14} /></button>
                </div>}
                </div>
                <h3 className="mt-3 text-base font-bold">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                  {item.message}
                </p>
                <div className="mt-4 text-xs text-slate-400">
                  Posted by {item.author?.name || "HCM team"}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel">
            <Empty
              icon={Megaphone}
              title="No announcements yet"
              message="Updates from your HR team will appear here."
            />
          </div>
        )}
      </section>
      <section>
        <SectionHeading
          title="Notifications"
          subtitle="Your personal updates."
        />
        <div className="panel divide-y divide-slate-100">
          {notifications.length ? (
            notifications.map((item) => (
              <div
                key={item._id}
                className={`p-4 ${item.read ? "" : "bg-blue-50/40"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-600">
                    <Bell size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{item.title}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">
                        {shortDate(item.createdAt)}
                      </span>
                      {!item.read && (
                        <button
                          onClick={() => onRead(item)}
                          className="text-[10px] font-bold text-brand-600"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty
              icon={Bell}
              title="You're all caught up"
              message="No notifications to show right now."
            />
          )}
        </div>
      </section>
    </div>
  );
}
