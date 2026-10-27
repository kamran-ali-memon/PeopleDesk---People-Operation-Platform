"use client";

import { MessageCircle, Sparkles, Send } from "lucide-react";
import { Empty, Field, SectionHeading, StatCard, Table } from "../ui";
import { money, shortDate, statusClass } from "../../lib/format";

export function AssistantPage({ chat, input, setInput, onSubmit, user, companyName = 'PeopleDesk' }) {
  const suggestions =
    user.role === "employee"
      ? [
          "How much sick leave do I have left?",
          "Summarize my recent attendance",
          "What is the leave policy?",
        ]
      : [
          "Who is on leave today?",
          "Summarize today’s attendance",
          "How many active employees do we have?",
          "What is our leave policy?",
        ];
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeading
        title={`${companyName} assistant`}
        subtitle="Ask a question in plain language. Answers follow your role's data access."
      />
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white">
            <Sparkles size={21} />
          </div>
          <div>
            <h3 className="font-bold">{companyName} Assistant</h3>
            <p className="mt-1 text-xs text-slate-500">
              {user.role === "employee"
                ? "Personal data scope"
                : `${user.role.toUpperCase()} data scope`}{" "}
              · No changes are made without your action
            </p>
          </div>
          <span className="ml-auto badge badge-green">Scoped access</span>
        </div>
        <div className="min-h-[350px] space-y-4 p-4 sm:p-6">
          {!chat.length ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand-600">
                <MessageCircle size={25} />
              </div>
              <h3 className="text-lg font-bold">
                What would you like to know?
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Ask about attendance, leave, payroll or company policy. Answers
                are grounded in available data.
              </p>
              <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    onClick={() => setInput(item)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chat.map((item, index) => (
              <div
                key={index}
                className={`flex gap-3 ${item.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {item.role === "assistant" && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Sparkles size={15} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-slate-50 text-slate-700"}`}
                >
                  {item.content}
                  {item.role === "assistant" && (
                    <div className="mt-2 text-[10px] font-semibold text-slate-400">
                      {item.aiGenerated
                        ? "AI-generated · Based on scoped data"
                        : "Data-based response - Scoped workspace data"}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={onSubmit}
          className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-50">
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your people data…"
              maxLength={1000}
            />
            <button
              className="btn-primary !px-3 !py-2.5"
              disabled={!input.trim()}
            >
              <Send size={16} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            The assistant cannot change records by itself. Verify important HR
            and payroll decisions before acting.
          </p>
        </form>
      </div>
    </div>
  );
}
