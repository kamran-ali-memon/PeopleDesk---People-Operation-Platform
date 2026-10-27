const {
  Employee,
  Attendance,
  Leave,
  Payroll,
  Department,
  Announcement,
  Notification,
  LeaveType,
} = require("../models");
const { dateKey } = require("../utils/dates");
const { currentEmployee, fail } = require("./controllerHelpers");

exports.dashboard = async (req, res) => {
  const employee = await currentEmployee(req);
  if (req.user.role === "employee" && !employee)
    return fail(res, 403, "This account is not linked to an employee profile.");
  const today = dateKey();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const employeeFilter = employee ? { employee: employee._id } : {};
  const [
    employees,
    attendance,
    leaves,
    payrolls,
    departments,
    announcements,
    pending,
    notifications,
  ] = await Promise.all([
    Employee.find(
      employee
        ? { _id: employee._id }
        : { employmentStatus: { $in: ["active", "probation"] } },
    ).populate("department", "name"),
    Attendance.find({ ...employeeFilter, date: today }).populate(
      "employee",
      "name department",
    ),
    Leave.find({
      ...employeeFilter,
      status: { $in: ["pending", "approved"] },
    }).populate("employee", "name"),
    Payroll.find({
      ...employeeFilter,
      month,
      ...(employee ? { status: "finalized" } : {}),
    }).populate("employee", "name"),
    Department.find().sort("name"),
    Announcement.find({
      $or: [{ audience: "all" }, { audience: req.user.role }],
    })
      .sort("-createdAt")
      .limit(5),
    req.user.role === "employee"
      ? Leave.countDocuments({
          employee: req.user.employeeId,
          status: "pending",
        })
      : Leave.countDocuments({ status: "pending" }),
    Notification.find({ user: req.user._id }).sort("-createdAt").limit(5),
  ]);
  const late = attendance.filter((item) => item.status === "late").length;
  const onLeaveToday = leaves.filter(
    (item) =>
      item.status === "approved" &&
      item.startDate <= today &&
      item.endDate >= today,
  ).length;
  const present = attendance.filter((item) =>
    ["present", "late", "half_day", "missing_checkout"].includes(item.status),
  ).length;
  const departmentCounts = departments.map((department) => ({
    name: department.name,
    employees: employees.filter(
      (item) =>
        String(item.department?._id || item.department) ===
        String(department._id),
    ).length,
  }));
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const employeeRecent = employee
    ? await Attendance.find({
        employee: employee._id,
        date: { $gte: dateKey(weekStart), $lte: today },
      }).sort("-date")
    : [];
  const leaveBalance = employee
    ? await (async () => {
        const types = await LeaveType.find();
        const year = new Date().getFullYear();
        const approved = await Leave.find({
          employee: employee._id,
          status: "approved",
          startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
        });
        return types.map((type) => ({
          name: type.name,
          remaining: type.paid
            ? Math.max(
                0,
                type.quota -
                  approved
                    .filter(
                      (item) =>
                        item.type.toLowerCase() === type.name.toLowerCase(),
                    )
                    .reduce((sum, item) => sum + item.workingDays, 0),
              )
            : null,
        }));
      })()
    : [];
  const monthAttendance = await Attendance.aggregate([
    {
      $match: {
        ...(employee ? { employee: employee._id } : {}),
        date: { $gte: `${month}-01`, $lte: `${month}-31` },
      },
    },
    {
      $group: {
        _id: "$date",
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [
              { $in: ["$status", ["present", "late", "missing_checkout"]] },
              1,
              0,
            ],
          },
        },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
      },
    },
  ]);
  const attendanceByDate = new Map(monthAttendance.map((item) => [item._id, item]));
  const trends = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);
    const daily = attendanceByDate.get(key);
    return {
      date: key.slice(5),
      present: daily?.present || 0,
      late: daily?.late || 0,
    };
  });
  const monthRecordCount = monthAttendance.reduce(
    (sum, item) => sum + item.total,
    0,
  );
  const salarySum = payrolls.reduce(
    (sum, item) => sum + Number(item.gross || 0),
    0,
  );
  const personalHours = employeeRecent.reduce(
    (sum, item) =>
      sum +
      (item.checkIn && item.checkOut
        ? (new Date(item.checkOut) - new Date(item.checkIn)) / 3600000
        : 0),
    0,
  );
  res.json({
    role: req.user.role,
    today,
    month,
    kpis: {
      headcount: employees.length,
      present,
      onLeave: onLeaveToday,
      late,
      pendingApprovals: pending,
      payrollCost: salarySum,
      averageSalary: payrolls.length
        ? Math.round(salarySum / payrolls.length)
        : 0,
      hoursThisWeek: Number(personalHours.toFixed(1)),
      attendanceRecordsThisMonth: monthRecordCount,
    },
    departmentCounts,
    trends,
    recentAttendance: attendance.slice(0, 8),
    announcements,
    notifications,
    leaveBalance,
    recentAttendancePersonal: employeeRecent,
    employee,
    recentPayslip: payrolls[0] || null,
  });
};
