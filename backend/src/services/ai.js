const {
  Employee,
  Attendance,
  Leave,
  Payroll,
  Settings,
  LeaveType,
  Department,
  ExpenseClaim,
  PerformanceReview,
  ReviewCycle,
} = require("../models");
const { dateKey } = require("../utils/dates");

const policyText =
  "PeopleDesk policy: office starts at 09:00, grace period is 15 minutes, a shift under 5 hours is half day, weekends are Saturday and Sunday by default, casual leave quota is 10 days, sick leave quota is 8 days, annual leave quota is 14 days, and unpaid leave is unlimited. Approved leave and attendance rules are checked by the backend. Do not invent data or reveal another employeeâ€™s private information.";

const tools = [
  {
    type: "function",
    function: {
      name: "get_headcount",
      description:
        "Get active employee headcount, optionally filtered by department.",
      parameters: {
        type: "object",
        properties: {
          department: {
            type: "string",
            description: "Optional department name.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_attendance_summary",
      description: "Get attendance counts for a date.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "YYYY-MM-DD; defaults to today.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_late_comers",
      description: "List employees marked late on a date or in a month.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Optional YYYY-MM-DD date." },
          month: { type: "string", description: "Optional YYYY-MM month." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_leave_summary",
      description: "Summarize leave requests and their status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "all"],
          },
          date: {
            type: "string",
            description: "Optional YYYY-MM-DD date, for example today.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_leave_balance",
      description: "Get the signed-in employeeâ€™s own leave balance.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payroll_summary",
      description: "Summarize payroll for a month.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "YYYY-MM; defaults to current month.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_employees",
      description: "Search employees visible to the current user.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Name, employee code or email.",
          },
        },
        required: ["query"],
      },
    },
  },
];

async function executeTool(name, args, user) {
  const isEmployee = user.role === "employee";
  if (isEmployee && !user.employeeId)
    return { message: "This account is not linked to an employee profile." };
  const ownFilter = isEmployee ? { _id: user.employeeId } : {};
  const today = dateKey();
  if (name === "get_headcount") {
    if (isEmployee)
      return { headcount: user.employeeId ? 1 : 0, scope: "own profile only" };
    const filter = { employmentStatus: { $in: ["active", "probation"] } };
    if (args.department) {
      const department = await Department.findOne({
        name: new RegExp(
          `^${String(args.department).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
      });
      if (!department) return { department: args.department, headcount: 0 };
      filter.department = department._id;
    }
    return {
      headcount: await Employee.countDocuments(filter),
      department: args.department || "all departments",
    };
  }
  if (name === "get_attendance_summary") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(args.date || "")
      ? args.date
      : today;
    const employeeFilter = isEmployee ? { employee: user.employeeId } : {};
    const records = await Attendance.find({ ...employeeFilter, date }).populate(
      "employee",
      "name employeeCode",
    );
    const activeFilter = isEmployee
      ? {
          _id: user.employeeId,
          employmentStatus: { $in: ["active", "probation"] },
        }
      : { employmentStatus: { $in: ["active", "probation"] } };
    const activeEmployees = await Employee.find(activeFilter).select(
      "_id name employeeCode",
    );
    const approvedLeaves = await Leave.find({
      status: "approved",
      startDate: { $lte: date },
      endDate: { $gte: date },
      employee: { $in: activeEmployees.map((item) => item._id) },
    }).select("employee");
    const recordedIds = new Set(
      records.map((item) => String(item.employee?._id || item.employee)),
    );
    const onLeaveIds = new Set(
      approvedLeaves.map((item) => String(item.employee)),
    );
    const recordedAbsent = records.filter(
      (item) => item.status === "absent",
    ).length;
    const missingAbsent = activeEmployees.filter(
      (item) =>
        !recordedIds.has(String(item._id)) && !onLeaveIds.has(String(item._id)),
    ).length;
    return {
      date,
      records: records.length,
      present: records.filter((item) => item.status === "present").length,
      late: records.filter((item) => item.status === "late").length,
      halfDay: records.filter((item) => item.status === "half_day").length,
      absent: recordedAbsent + missingAbsent,
      onLeave: onLeaveIds.size,
      people: records.map((item) => ({
        name: item.employee?.name,
        status: item.status,
      })),
    };
  }
  if (name === "get_late_comers") {
    const filter = { status: "late" };
    if (isEmployee) {
      filter.employee = user.employeeId;
      filter.employee = user.employeeId;
    }
    if (args.date) filter.date = args.date;
    else
      filter.date = {
        $gte: `${args.month || today.slice(0, 7)}-01`,
        $lte: `${args.month || today.slice(0, 7)}-31`,
      };
    const records = await Attendance.find(filter)
      .populate("employee", "name employeeCode department")
      .sort({ date: -1 })
      .limit(50);
    return {
      count: records.length,
      lateComers: records.map((item) => ({
        name: item.employee?.name,
        employeeCode: item.employee?.employeeCode,
        date: item.date,
      })),
    };
  }
  if (name === "get_leave_summary") {
    const filter = isEmployee ? { employee: user.employeeId } : {};
    if (args.status && args.status !== "all") filter.status = args.status;
    if (args.date && /^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      filter.startDate = { $lte: args.date };
      filter.endDate = { $gte: args.date };
      if (!args.status || args.status === "all") filter.status = "approved";
    }
    const leaves = await Leave.find(filter)
      .populate("employee", "name employeeCode")
      .sort("-createdAt")
      .limit(100);
    return {
      count: leaves.length,
      byStatus: {
        pending: leaves.filter((item) => item.status === "pending").length,
        approved: leaves.filter((item) => item.status === "approved").length,
        rejected: leaves.filter((item) => item.status === "rejected").length,
      },
      requests: leaves.map((item) => ({
        employee: item.employee?.name,
        type: item.type,
        startDate: item.startDate,
        endDate: item.endDate,
        workingDays: item.workingDays,
        status: item.status,
      })),
    };
  }
  if (name === "get_my_leave_balance") {
    if (!isEmployee || !user.employeeId)
      return {
        message: "This tool is available only for an employeeâ€™s own balance.",
      };
    const types = await LeaveType.find();
    const year = new Date().getFullYear();
    const approved = await Leave.find({
      employee: user.employeeId,
      status: "approved",
      startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
    });
    return {
      balances: types.map((type) => {
        const used = approved
          .filter((item) => item.type.toLowerCase() === type.name.toLowerCase())
          .reduce((sum, item) => sum + Number(item.workingDays || 0), 0);
        return {
          type: type.name,
          quota: type.paid ? type.quota : "unlimited",
          used,
          remaining: type.paid ? Math.max(0, type.quota - used) : "unlimited",
        };
      }),
    };
  }
  if (name === "get_payroll_summary") {
    const month = /^\d{4}-\d{2}$/.test(args.month || "")
      ? args.month
      : today.slice(0, 7);
    const filter = { month };
    if (isEmployee) {
      filter.employee = user.employeeId;
      filter.employee = user.employeeId;
    }
    const payrolls = await Payroll.find(filter).populate(
      "employee",
      "name employeeCode",
    );
    return {
      month,
      employees: payrolls.length,
      grossTotal: payrolls.reduce(
        (sum, item) => sum + Number(item.gross || 0),
        0,
      ),
      netTotal: payrolls.reduce((sum, item) => sum + Number(item.net || 0), 0),
      finalized: payrolls.every((item) => item.status === "finalized"),
      records: payrolls.map((item) => ({
        employee: item.employee?.name,
        gross: item.gross,
        net: item.net,
        status: item.status,
      })),
    };
  }
  if (name === "search_employees") {
    const query = String(args.query || "").trim();
    if (!query) return { results: [] };
    const filter = isEmployee
      ? ownFilter
      : {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { employeeCode: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        };
    const employees = await Employee.find(filter)
      .select("name employeeCode email department employmentStatus")
      .populate("department", "name")
      .limit(10);
    return {
      results: employees.map((item) => ({
        name: item.name,
        employeeCode: item.employeeCode,
        email: item.email,
        department: item.department?.name,
        status: item.employmentStatus,
      })),
    };
  }
  return { message: "Unknown tool." };
}

async function getScopedData(user) {
  const today = dateKey();
  const isEmployee = user.role === "employee";
  if (isEmployee && !user.employeeId)
    return {
      today,
      employees: 0,
      attendance: [],
      leaves: [],
      payrolls: [],
      settings: null,
      leaveTypes: [],
      employee: null,
    };
  const employee =
    isEmployee && user.employeeId
      ? await Employee.findById(user.employeeId)
      : null;
  const employeeFilter = employee ? { employee: employee._id } : {};
  const [employees, attendance, leaves, payrolls, settings, leaveTypes] = await Promise.all(
    [
      Employee.countDocuments(
        isEmployee
          ? { _id: employee?._id }
          : { employmentStatus: { $in: ["active", "probation"] } },
      ),
      Attendance.find({ ...employeeFilter, date: today }).populate(
        "employee",
        "name department",
      ),
      Leave.find({
        ...employeeFilter,
        status: { $in: ["pending", "approved"] },
      }).populate("employee", "name"),
      Payroll.find(
        isEmployee
          ? { employee: employee?._id, status: "finalized" }
          : {},
      )
        .sort({ month: -1 })
        .limit(12)
        .populate("employee", "name"),
      Settings.findOne(),
      LeaveType.find().sort("name"),
    ],
  );
  return { today, employees, attendance, leaves, payrolls, settings, leaveTypes, employee };
}

function formatMoney(value) {
  return `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

async function answerFromWorkspace(user, prompt) {
  const isEmployee = user.role === "employee";
  if (isEmployee && !user.employeeId) return "Your account is not linked to an employee profile yet. Please contact HR.";
  const data = await getScopedData(user);
  const lower = String(prompt || "").toLowerCase();
 const lines = [];

  if (lower.includes("policy") || lower.includes("quota") || lower.includes("balance") || lower.includes("leave") || lower.includes("off")) {
    if (isEmployee) {
      const year = new Date().getFullYear();
      const approved = data.leaves.filter((item) => item.status === "approved" && item.startDate >= `${year}-01-01` && item.startDate <= `${year}-12-31`);
      const balances = (data.leaveTypes || []).map((type) => {
        const used = approved.filter((item) => item.type?.toLowerCase() === type.name.toLowerCase()).reduce((sum, item) => sum + Number(item.workingDays || 0), 0);
        return `${type.name}: ${type.paid ? `${Math.max(0, Number(type.quota || 0) - used)} days left (${used} used of ${type.quota})` : `${used} days used; unpaid leave has no fixed quota`}`;
      });
      lines.push(balances.length ? `Your leave balance for ${year}: ${balances.join("; ")}.` : "No leave types are configured for your workspace yet.");
      const pending = data.leaves.filter((item) => item.status === "pending").length;
      lines.push(`You have ${pending} pending leave request(s).`);
    } else {
      const activeLeave = data.leaves.filter((item) => item.status === "approved" && item.startDate <= data.today && item.endDate >= data.today).length;
      const pending = data.leaves.filter((item) => item.status === "pending").length;
      lines.push(`Today (${data.today}), ${activeLeave} approved leave(s) are active and ${pending} request(s) are pending review.`);
      lines.push(`Configured leave types: ${(data.leaveTypes || []).map((type) => `${type.name} (${type.paid ? `${type.quota} days` : "unpaid"})`).join(", ") || "none"}.`);
    }
    if (lower.includes("policy")) lines.push(`Office starts at ${data.settings?.officeStart || "09:00"}; the default grace period is ${data.settings?.graceMinutes ?? 15} minutes.`);
  }

  if (lower.includes("attendance") || lower.includes("hour") || lower.includes("check in") || lower.includes("check-in") || lower.includes("late")) {
    const completedHours = data.attendance.filter((item) => item.checkIn && item.checkOut).reduce((sum, item) => sum + (new Date(item.checkOut) - new Date(item.checkIn)) / 3600000, 0);
    if (isEmployee) {
      const todayRecord = data.attendance.find((item) => item.date === data.today);
      lines.push(todayRecord ? `Your attendance today is ${todayRecord.status.replaceAll("_", " ")}${todayRecord.checkIn ? `; checked in at ${new Date(todayRecord.checkIn).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}` : ""}${todayRecord.checkOut ? ` and checked out at ${new Date(todayRecord.checkOut).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}` : ""}.` : `No attendance record is available for you today (${data.today}).`);
      lines.push(`Completed hours recorded today: ${completedHours.toFixed(1)} h. A shift is counted after check-out.`);
    } else {
      const late = data.attendance.filter((item) => item.status === "late").length;
      lines.push(`Today (${data.today}), ${data.attendance.length} attendance record(s) are available, including ${late} marked late.`);
    }
  }

  if (lower.includes("salary") || lower.includes("payroll") || lower.includes("payslip")) {
    if (isEmployee) {
      if (/colleague|coworker|other employee|someone else|another employee/i.test(prompt))
        return "I can only help with your own payroll and payslip information; I can’t share another employee’s salary.";
      const latest = data.payrolls[0];
      lines.push(latest ? `Your latest finalized payslip is for ${latest.month}: net pay ${formatMoney(latest.net)} (gross ${formatMoney(latest.gross)}).` : "You don’t have a finalized payslip available yet.");
    } else {
      const match = lower.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
      const month = match ? `${match[1]}-${match[2]}` : data.today.slice(0, 7);
      const records = await Payroll.find({ month });
      lines.push(`Payroll for ${month}: ${records.length} record(s), gross ${formatMoney(records.reduce((sum, item) => sum + Number(item.gross || 0), 0))}, net ${formatMoney(records.reduce((sum, item) => sum + Number(item.net || 0), 0))}.`);
      lines.push(records.some((item) => item.status === "draft") ? "This month still has draft payroll records." : records.length ? "All available records for this month are finalized." : "No payroll records exist for this month yet.");
    }
  }

  if (lower.includes("employee") || lower.includes("headcount") || lower.includes("team"))
    lines.push(isEmployee ? "Your account is scoped to your own employee profile." : `There are ${data.employees} active or probationary employee(s) in this workspace.`);

  if (lower.includes("expense") || lower.includes("reimburse")) {
    const filter = isEmployee ? { employee: user.employeeId } : {};
    const claims = await ExpenseClaim.find(filter).select("status amount");
    lines.push(`Expense claims in your access scope: ${claims.length} total (${claims.filter((item) => item.status === "submitted").length} awaiting HR, ${claims.filter((item) => item.status === "verified").length} awaiting Admin, ${claims.filter((item) => item.status === "approved").length} approved).`);
  }

  if (lower.includes("performance") || lower.includes("appraisal") || lower.includes("review cycle")) {
    const filter = isEmployee ? { employee: user.employeeId } : {};
    const reviews = await PerformanceReview.find(filter).select("status finalRating");
    const cycles = await ReviewCycle.countDocuments({ status: "active" });
    lines.push(isEmployee ? `You have ${reviews.length} performance review(s); ${reviews.filter((item) => item.status === "finalized").length} are finalized${reviews.find((item) => item.status === "finalized") ? `, latest final rating ${reviews.find((item) => item.status === "finalized").finalRating}/5` : ""}.` : `There are ${cycles} active review cycle(s) and ${reviews.filter((item) => item.status === "submitted").length} self-appraisal(s) awaiting HR review.`);
  }

  if (!lines.length) {
    lines.push(isEmployee ? `Your workspace data is available for ${data.today}.` : `Workspace snapshot for ${data.today}: ${data.employees} active employees and ${data.attendance.length} attendance record(s) today.`);
    lines.push("I can answer questions about leave balances and policy, attendance and hours, payroll, employee headcount, expenses, and performance reviews.");
  }
  return `${lines.join("\n")}\n\nData-based response using your role’s permitted workspace data.`;
}
async function answerWithAI(user, prompt) {
  if (!process.env.AI_API_KEY) return answerFromWorkspace(user, prompt);
  const data = await getScopedData(user);
  const lower = prompt.toLowerCase();
  if (user.role === "employee" && /salary|payroll|payslip/i.test(prompt) && /colleague|coworker|other employee|someone else|another employee/i.test(prompt))
    return "I can only help with your own payroll and payslip information. I cannot share another employee salary.";
  let context = `Today is ${data.today}. `;
  if (user.role === "employee") {
    context += "Only this employee’s own profile and records are in scope. ";
  } else {
    context += `Active employee count: ${data.employees}. `;
  }
  if (lower.includes("leave") || lower.includes("off")) {
    const pending = data.leaves.filter((item) => item.status === "pending").length;
    const approvedToday = data.leaves.filter((item) => item.status === "approved" && item.startDate <= data.today && item.endDate >= data.today).length;
    context += `Pending requests in scope: ${pending}; approved leave active today: ${approvedToday}. `;
  }
  if (lower.includes("attendance") || lower.includes("late") || lower.includes("hour")) {
    const late = data.attendance.filter((item) => item.status === "late").length;
    context += `Today's attendance records in scope: ${data.attendance.length}; late: ${late}. `;
  }
  const baseUrl = (
    process.env.AI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.AI_TIMEOUT_MS || 15000),
  );
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    };
    const messages = [
      {
        role: "system",
        content: `You are the PeopleDesk AI assistant. ${policyText} Use tools for facts and calculations. The database is the source of truth. Respect the user's role and scope. If asked for another employee's salary by an employee, refuse. If data is missing, say so. Label answers as AI-generated.`,
      },
      { role: "user", content: prompt },
    ];
    const firstResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        tools,
        tool_choice: "auto",
        messages,
      }),
    });
    if (!firstResponse.ok)
      throw new Error(`AI provider returned ${firstResponse.status}`);
    const firstData = await firstResponse.json();
    const assistantMessage = firstData.choices?.[0]?.message;
    if (!assistantMessage)
      return `${context}\nAI assistant could not produce an answer from the available data.`;
    messages.push(assistantMessage);
    if (assistantMessage.tool_calls?.length) {
      for (const call of assistantMessage.tool_calls.slice(0, 4)) {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch (error) {
          args = {};
        }
        const result = await executeTool(call.function.name, args, user);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      const finalResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          messages,
        }),
      });
      if (!finalResponse.ok)
        throw new Error(`AI provider returned ${finalResponse.status}`);
      const finalData = await finalResponse.json();
      return `${finalData.choices?.[0]?.message?.content || context}\n\nAI-generated`;
    }
    return `${assistantMessage.content || context}\n\nAI-generated`;
  } catch (error) {
    return answerFromWorkspace(user, prompt);
  } finally {
    clearTimeout(timeout);
  }
}
module.exports = { answerWithAI, answerFromWorkspace, executeTool };
