const {
  Employee,
  Attendance,
  Leave,
  Payroll,
  Settings,
  Holiday,
} = require("../models");
const {
  dateKey,
  monthRange,
  workingDaysBetween,
  taxForAnnualGross,
} = require("../utils/dates");

async function createPayrollDraft(month) {
  const { start, end, days } = monthRange(month);
  const employees = await Employee.find({
    employmentStatus: { $in: ["active", "probation"] },
    joinDate: { $lte: new Date(`${end}T23:59:59`) },
  });
  const settings = (await Settings.findOne()) || {};
  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end },
  }).distinct("date");
  const weekendDays = settings.weekendDays || [0, 6];
  const workingDays = Math.max(
    1,
    workingDaysBetween(start, end, weekendDays, holidays),
  );
  const created = [];

  for (const employee of employees) {
    const existing = await Payroll.findOne({ month, employee: employee._id });
    if (existing) {
      created.push(existing);
      continue;
    }
    const basic = Number(employee.basicSalary || 0);
    const hra = basic * 0.4;
    const medical = basic * 0.1;
    const gross = basic + hra + medical + Number(employee.allowances || 0);
    const attendance = await Attendance.find({
      employee: employee._id,
      date: { $gte: start, $lte: end },
    });
    const recordedDates = new Set(attendance.map((item) => item.date));
    const recordedAbsentDays = attendance.filter(
      (item) => item.status === "absent",
    ).length;
    const halfDays = attendance.filter(
      (item) => item.status === "half_day",
    ).length;
    const approvedLeaves = await Leave.find({
      employee: employee._id,
      status: "approved",
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
    const employeeStart = dateKey(
      new Date(
        Math.max(
          new Date(`${start}T00:00:00`).getTime(),
          new Date(employee.joinDate).getTime(),
        ),
      ),
    );
    const expectedDays = workingDaysBetween(
      employeeStart,
      end,
      weekendDays,
      holidays,
    );
    const approvedLeaveDays = approvedLeaves.reduce((total, item) => {
      const overlapStart =
        item.startDate > employeeStart ? item.startDate : employeeStart;
      const overlapEnd = item.endDate < end ? item.endDate : end;
      return (
        total +
        workingDaysBetween(overlapStart, overlapEnd, weekendDays, holidays)
      );
    }, 0);
    const missingDays = Math.max(
      0,
      expectedDays - recordedDates.size - approvedLeaveDays,
    );
    const absentDays = recordedAbsentDays + missingDays;
    const unpaidDays = approvedLeaves
      .filter((item) => /unpaid/i.test(item.type))
      .reduce((total, item) => {
        const overlapStart =
          item.startDate > employeeStart ? item.startDate : employeeStart;
        const overlapEnd = item.endDate < end ? item.endDate : end;
        return (
          total +
          workingDaysBetween(overlapStart, overlapEnd, weekendDays, holidays)
        );
      }, 0);
    const dailyRate = gross / workingDays;
    const deductions = dailyRate * (absentDays + unpaidDays + halfDays * 0.5);
    const annualTax = taxForAnnualGross(gross * 12);
    const tax = annualTax / 12;
    const joinDate = new Date(employee.joinDate);
    const monthStart = new Date(`${start}T00:00:00`);
    let proratedGross = gross;
    if (joinDate > monthStart && joinDate <= new Date(`${end}T23:59:59`)) {
      const eligibleDays = workingDaysBetween(
        dateKey(joinDate),
        end,
        weekendDays,
        holidays,
      );
      proratedGross = gross * (eligibleDays / workingDays);
    }
    const net = Math.max(0, proratedGross - deductions - tax);
    created.push(
      await Payroll.create({
        month,
        employee: employee._id,
        basic,
        hra,
        medical,
        gross: proratedGross,
        absentDays,
        unpaidDays,
        halfDays,
        deductions,
        tax,
        net,
        status: "draft",
      }),
    );
  }
  return created;
}
module.exports = { createPayrollDraft };
