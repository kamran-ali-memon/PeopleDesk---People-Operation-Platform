const { AILog, LeaveType, Employee, Attendance, Leave } = require("../models");
const { answerWithAI, answerFromWorkspace } = require("../services/ai");
const { dateKey } = require("../utils/dates");
const { fail } = require("./controllerHelpers");

exports.aiChat = async (req, res) => {
  const prompt = String(req.body.message || "").trim();
  if (!prompt) return fail(res, 422, "Write a question first.");
  if (prompt.length > 1000)
    return fail(res, 422, "Keep your question under 1000 characters.");
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await AILog.countDocuments({
    user: req.user._id,
    createdAt: { $gte: since },
  });
  if (count >= 20)
    return fail(
      res,
      429,
      "You have reached the hourly AI limit. Please try again later.",
    );
  const started = Date.now();
  let answer;
  let success = true;
  let aiGenerated = false;
  try {
    answer = await answerWithAI(req.user, prompt);
    aiGenerated = Boolean(process.env.AI_API_KEY && answer.endsWith("\n\nAI-generated"));
  } catch (error) {
    try {
      answer = await answerFromWorkspace(req.user, prompt);
    } catch (fallbackError) {
      success = false;
      answer = "The assistant could not read workspace data right now. Please try again shortly.";
    }
  }
  await AILog.create({
    user: req.user._id,
    prompt,
    tool: "scoped_summary",
    success,
    durationMs: Date.now() - started,
  });
  res.json({ answer, aiGenerated: aiGenerated && success });
};
exports.smartLeave = async (req, res) => {
  if (req.user.role !== "employee")
    return fail(res, 403, "Smart leave is available to employee accounts.");
  const text = String(req.body.text || "").trim();
  const started = Date.now();
  if (!text || text.length > 500)
    return fail(res, 422, "Describe your leave in 500 characters or fewer.");
  const availableTypes = await LeaveType.find().sort("name");
  let result = null;
  let usedAI = false;
  if (process.env.AI_API_KEY) {
    try {
      const baseUrl = (
        process.env.AI_BASE_URL || "https://api.openai.com/v1"
      ).replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || 15000)),
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-4o-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Return only JSON with keys type, startDate, endDate, reason. Dates must be YYYY-MM-DD and future or today, based on current date ${dateKey()}. Allowed leave types: ${availableTypes.map((item) => item.name).join(", ")}. Choose Casual for personal events/weddings, Sick for illness, otherwise the closest allowed type. If dates are ambiguous, return empty startDate and endDate. Never submit the request.`,
            },
            { role: "user", content: text },
          ],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        result = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        usedAI = true;
      }
    } catch (error) {
      result = null;
    }
  }
  if (!result) {
    const lower = text.toLowerCase();
    let start = null;
    let end = null;
    const addDays = (date, amount) => {
      const copy = new Date(date);
      copy.setDate(copy.getDate() + amount);
      return dateKey(copy);
    };
    const nextWeekday = (weekday) => {
      const now = new Date();
      const delta = (weekday - now.getDay() + 7) % 7 || 7;
      return addDays(now, delta);
    };
    const weekdayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const foundDay = weekdayNames.findIndex((day) => lower.includes(day));
    if (lower.includes("tomorrow")) start = addDays(new Date(), 1);
    else if (lower.includes("today")) start = dateKey();
    else if (foundDay >= 0) start = nextWeekday(foundDay);
    const hasSecondDay =
      foundDay >= 0 &&
      /and\s+(the\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(
        text,
      );
    if (start) {
      if (hasSecondDay) {
        const secondMatch = lower.match(
          /and\s+(?:the\s+)?(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
        );
        const secondDay = secondMatch
          ? weekdayNames.indexOf(secondMatch[1])
          : -1;
        const firstDate = new Date(`${start}T12:00:00`);
        let endDate = new Date(firstDate);
        endDate.setDate(endDate.getDate() + 1);
        if (secondDay >= 0) {
          while (endDate.getDay() !== secondDay || endDate <= firstDate)
            endDate.setDate(endDate.getDate() + 1);
        }
        end = dateKey(endDate);
      } else end = start;
    }
    const type =
      lower.includes("sick") ||
      lower.includes("ill") ||
      lower.includes("doctor")
        ? "Sick"
        : lower.includes("wedding") ||
            lower.includes("personal") ||
            lower.includes("family")
          ? "Casual"
          : availableTypes.find((item) => /casual/i.test(item.name))?.name ||
            availableTypes[0]?.name ||
            "Casual";
    result = { type, startDate: start || "", endDate: end || "", reason: text };
  }
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value;
  };
  const datesAreValid =
    validDate(result.startDate) &&
    validDate(result.endDate) &&
    result.startDate >= dateKey() &&
    result.endDate >= result.startDate;
  const matchedType = availableTypes.find(
    (item) =>
      item.name.toLowerCase() === String(result.type || "").toLowerCase(),
  );
  await AILog.create({
    user: req.user._id,
    prompt: text,
    tool: "smart_leave",
    success: Boolean(result),
    durationMs: Date.now() - started,
  });
  res.json({
    type:
      matchedType?.name ||
      availableTypes.find((item) => /casual/i.test(item.name))?.name ||
      availableTypes[0]?.name ||
      "Casual",
    startDate: datesAreValid ? result.startDate : "",
    endDate: datesAreValid ? result.endDate : "",
    reason: String(result.reason || text).slice(0, 500),
    needsDateReview: !datesAreValid,
    aiGenerated: usedAI,
  });
};

exports.aiSummary = async (req, res) => {
  const started = Date.now();
  const dashboard = await (async () => {
    const today = dateKey();
    const employees = await Employee.countDocuments({
      employmentStatus: { $in: ["active", "probation"] },
    });
    const attendance = await Attendance.find({ date: today });
    const leaves = await Leave.countDocuments({ status: "pending" });
    const late = attendance.filter((item) => item.status === "late").length;
    return {
      today,
      headcount: employees,
      attendanceRecords: attendance.length,
      late,
      pendingLeaveRequests: leaves,
    };
  })();
  let summary = [
    `There are ${dashboard.headcount} active employees on record.`,
    `${dashboard.attendanceRecords} attendance records exist for ${dashboard.today}.`,
    `${dashboard.late} employee(s) are marked late today.`,
    `${dashboard.pendingLeaveRequests} leave request(s) are waiting for review.`,
  ];
  let usedAI = false;
  if (process.env.AI_API_KEY) {
    try {
      const response = await fetch(
        `${(process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AI_API_KEY}`,
          },
          signal: AbortSignal.timeout(
            Number(process.env.AI_TIMEOUT_MS || 15000),
          ),
          body: JSON.stringify({
            model: process.env.AI_MODEL || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Write 3-5 concise insights using only the JSON data. Do not invent facts.",
              },
              { role: "user", content: JSON.stringify(dashboard) },
            ],
            temperature: 0.2,
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const aiSummary = (data.choices?.[0]?.message?.content || "")
          .split("\n")
          .filter(Boolean)
          .slice(0, 5);
        if (aiSummary.length) {
          summary = aiSummary;
          usedAI = true;
        }
      }
    } catch (error) {
      /* Keep deterministic summary as fallback. */
    }
  }
  await AILog.create({
    user: req.user._id,
    prompt: "Summarize the dashboard metrics for the current filters.",
    tool: "dashboard_summary",
    success: true,
    durationMs: Date.now() - started,
  });
  res.json({
    summary,
    data: dashboard,
    aiGenerated: usedAI,
  });
};
