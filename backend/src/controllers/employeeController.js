const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Employee, User, Department, Designation } = require("../models");
const { audit } = require("../services/audit");
const { fail, visibleEmployeeFilter } = require("./controllerHelpers");

exports.listEmployees = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 100)));
  const filter = {};
  if (req.user.role === "employee")
    filter._id = req.user.employeeId || null;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.employmentStatus = req.query.status;
  if (req.query.search)
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { employeeCode: { $regex: req.query.search, $options: "i" } },
    ];
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate("department", "name")
      .populate("designation", "name")
      .sort("name")
      .skip((page - 1) * limit)
      .limit(limit),
    Employee.countDocuments(filter),
  ]);
  res.json({
    employees,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
exports.createEmployee = async (req, res) => {
  const {
    employeeCode, name, email, password, department, designation, joinDate, basicSalary,
  } = req.body || {};
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  if (
    typeof employeeCode !== "string" || !employeeCode.trim() ||
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() || !phone ||
    !department || !designation || !joinDate ||
    !Number.isFinite(Number(basicSalary)) || Number(basicSalary) <= 0
  )
    return fail(res, 422, "Employee ID, name, email, phone, department, designation, join date and a valid salary are required.");
  if (password && (typeof password !== "string" || password.length < 8))
    return fail(res, 422, "Temporary password must be at least 8 characters.");
  if (Number.isNaN(new Date(joinDate).getTime()))
    return fail(res, 422, "Enter a valid employee join date.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail(res, 422, "Enter a valid email address.");
  if (!(await Department.exists({ _id: department })))
    return fail(res, 422, "Choose a department in this company.");
  if (!(await Designation.exists({
    _id: designation,
    $or: [{ department }, { department: null }],
  })))
    return fail(res, 422, "Choose a designation in this company and department.");
  const normalizedEmail = email.toLowerCase().trim();
  if (
    (await Employee.exists({ $or: [
      { employeeCode: employeeCode.trim() },
      { email: normalizedEmail },
    ] })) ||
    (await User.exists({ email: normalizedEmail }))
  )
    return fail(res, 409, "Employee code or email is already in use.");

  const temporaryPassword = password || crypto.randomBytes(9).toString("base64url") + "A9!";
  const employee = await Employee.create({
    employeeCode: employeeCode.trim(),
    name: name.trim(),
    email: normalizedEmail,
    phone,
    address: String(req.body.address || "").trim(),
    department,
    designation,
    joinDate,
    basicSalary: Number(basicSalary),
    allowances: Number(req.body.allowances || 0),
    gender: req.body.gender || "",
  });
  try {
    const user = await User.create({
      name: employee.name,
      email: employee.email,
      password: await bcrypt.hash(temporaryPassword, 12),
      role: "employee",
      employeeId: employee._id,
      mustChangePassword: true,
    });
    employee.user = user._id;
    await employee.save();
    await audit(req, "employee.created", "Employee", employee._id, null, employee.toObject());
    return res.status(201).json({
      employee,
      temporaryPassword,
      message: "Employee and login created. Share the temporary password securely.",
    });
  } catch (error) {
    await User.deleteOne({ employeeId: employee._id });
    await Employee.findByIdAndDelete(employee._id);
    throw error;
  }
};

exports.updateEmployee = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return fail(res, 404, "Employee not found.");
  if (req.user.role === "employee" && String(employee._id) !== String(req.user.employeeId))
    return fail(res, 403, "You can only edit your own contact details.");

  const before = employee.toObject();
  if (req.user.role !== "employee") {
    const department = req.body.department === undefined ? employee.department : req.body.department;
    const designation = req.body.designation === undefined ? employee.designation : req.body.designation;
    if (department && !(await Department.exists({ _id: department })))
      return fail(res, 422, "Choose a department in this company.");
    if (designation && !(await Designation.exists({
      _id: designation,
      $or: department ? [{ department }, { department: null }] : [{ department: null }],
    })))
      return fail(res, 422, "Choose a designation in this company and department.");
  }
  const fields = req.user.role === "employee"
    ? ["phone", "address", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship"]
    : ["name", "phone", "address", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "department", "designation", "joinDate", "employmentStatus", "basicSalary", "allowances", "gender"];
  fields.forEach((key) => {
    if (req.body[key] !== undefined) employee[key] = req.body[key];
  });
  await employee.save();
  await audit(req, "employee.updated", "Employee", employee._id, before, employee.toObject());
  res.json({ employee });
};
exports.exportEmployees = async (req, res) => {
  const employees = await Employee.find(visibleEmployeeFilter(req))
    .populate("department", "name")
    .populate("designation", "name")
    .lean();
  const columns = [
    "employee_code",
    "name",
    "email",
    "phone",
    "address",
    "department",
    "designation",
    "join_date",
    "employment_status",
    "basic_salary",
    "allowances",
  ];
  const valuesFor = (item) => [
    item.employeeCode,
    item.name,
    item.email,
    item.phone,
    item.address,
    item.department?.name,
    item.designation?.name,
    item.joinDate ? new Date(item.joinDate).toISOString().slice(0, 10) : "",
    item.employmentStatus,
    item.basicSalary,
    item.allowances,
  ];
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    columns.join(","),
    ...employees.map((item) => valuesFor(item).map(quote).join(",")),
  ];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="hcm-employees.csv"',
  );
  res.send(rows.join("\r\n"));
};

function parseCsvText(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  function splitLine(line) {
    const values = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        values.push(value.trim());
        value = "";
      } else value += char;
    }
    values.push(value.trim());
    return values;
  }
  const headers = splitLine(lines[0]).map((header) => {
    const value = header.toLowerCase().replace(/[\s-]+/g, "_");
    return (
      {
        employeecode: "employee_code",
        basicsalary: "basic_salary",
        joindate: "join_date",
        employmentstatus: "employment_status",
      }[value] || value
    );
  });
  const rows = lines.slice(1).map((line, index) => {
    const values = splitLine(line);
    const item = { rowNumber: index + 2 };
    headers.forEach((header, column) => {
      item[header] = values[column] || "";
    });
    return item;
  });
  return { headers, rows };
}

async function validateImportRows(rows) {
  const departments = await Department.find();
  const departmentMap = new Map(
    departments.map((item) => [item.name.toLowerCase(), item]),
  );
  const seenCodes = new Set();
  const seenEmails = new Set();
  const results = [];
  for (const row of rows) {
    const errors = [];
    const employeeCode = String(
      row.employeeCode || row.employee_code || "",
    ).trim();
    const name = String(row.name || "").trim();
    const email = String(row.email || "")
      .trim()
      .toLowerCase();
    const salary = Number(
      row.basicSalary || row.basic_salary || row.salary || 0,
    );
    const joinDate = String(row.joinDate || row.join_date || "").trim();
    if (!employeeCode)
      errors.push({
        field: "employeeCode",
        reason: "Employee code is required.",
      });
    if (!name)
      errors.push({ field: "name", reason: "Employee name is required." });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push({
        field: "email",
        reason: "A valid email address is required.",
      });
    if (!(salary > 0))
      errors.push({
        field: "basicSalary",
        reason: "Basic salary must be greater than zero.",
      });
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(joinDate) ||
      Number.isNaN(new Date(`${joinDate}T00:00:00`).getTime())
    )
      errors.push({
        field: "joinDate",
        reason: "Join date must use YYYY-MM-DD.",
      });
    const departmentName = String(row.department || "").trim();
    if (departmentName && !departmentMap.has(departmentName.toLowerCase()))
      errors.push({
        field: "department",
        reason: `Unknown department: ${departmentName}.`,
      });
    if (employeeCode && seenCodes.has(employeeCode.toLowerCase()))
      errors.push({
        field: "employeeCode",
        reason: "Duplicate employee code in this file.",
      });
    if (email && seenEmails.has(email))
      errors.push({ field: "email", reason: "Duplicate email in this file." });
    if (employeeCode) seenCodes.add(employeeCode.toLowerCase());
    if (email) seenEmails.add(email);
    if (employeeCode && (await Employee.exists({ employeeCode })))
      errors.push({
        field: "employeeCode",
        reason: "Employee code already exists in the database.",
      });
    if (
      email &&
      ((await Employee.exists({ email })) || (await User.exists({ email })))
    )
      errors.push({
        field: "email",
        reason: "Email already exists in the database.",
      });
    results.push({
      rowNumber: row.rowNumber,
      employeeCode,
      name,
      email,
      phone: row.phone || "",
      address: row.address || "",
      departmentName,
      departmentId:
        departmentMap.get(departmentName.toLowerCase())?._id || null,
      designation: row.designation || "",
      joinDate,
      basicSalary: salary,
      allowances: Number(row.allowances || 0),
      errors,
      valid: errors.length === 0,
    });
  }
  return results;
}

exports.dryRunEmployeeImport = async (req, res) => {
  const parsed = parseCsvText(req.body.csv);
  if (!parsed.rows.length)
    return fail(
      res,
      422,
      "Upload a CSV with a header row and at least one employee row.",
    );
  const requiredHeaders = ["employee_code", "name", "email"];
  const missing = requiredHeaders.filter(
    (header) =>
      !parsed.headers.includes(header) &&
      !(header === "employee_code" && parsed.headers.includes("employeecode")),
  );
  if (missing.length)
    return fail(
      res,
      422,
      `CSV is missing required columns: ${missing.join(", ")}.`,
    );
  const rows = await validateImportRows(parsed.rows);
  res.json({
    total: rows.length,
    validCount: rows.filter((item) => item.valid).length,
    invalidCount: rows.filter((item) => !item.valid).length,
    rows,
  });
};

exports.importEmployees = async (req, res) => {
  const parsed = parseCsvText(req.body.csv);
  if (!parsed.rows.length)
    return fail(
      res,
      422,
      "Upload a CSV with a header row and at least one employee row.",
    );
  const rows = await validateImportRows(parsed.rows);
  const validRows = rows.filter((item) => item.valid);
  if (!validRows.length)
    return fail(
      res,
      422,
      "No valid rows to import. Fix the reported errors and try again.",
    );
  const created = [];
  for (const row of validRows) {
    const temporaryPassword = crypto.randomBytes(9).toString("base64url") + "A9!";
    const employee = await Employee.create({
      employeeCode: row.employeeCode,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      department: row.departmentId,
      designation: null,
      joinDate: row.joinDate,
      basicSalary: row.basicSalary,
      allowances: row.allowances,
    });
    try {
      const user = await User.create({
        name: employee.name,
        email: employee.email,
        password: await bcrypt.hash(temporaryPassword, 12),
        role: "employee",
        employeeId: employee._id,
        mustChangePassword: true,
      });
      employee.user = user._id;
      await employee.save();
      created.push({
        rowNumber: row.rowNumber,
        employeeCode: row.employeeCode,
        email: row.email,
        temporaryPassword,
      });
    } catch (error) {
      await User.deleteOne({ employeeId: employee._id });
      await Employee.findByIdAndDelete(employee._id);
      throw error;
    }
  }
  await audit(req, "employees.csv_imported", "Employee", "", null, {
    count: created.length,
  });
  res.status(201).json({
    importedCount: created.length,
    skippedCount: rows.length - created.length,
    created,
    invalidRows: rows
      .filter((item) => !item.valid)
      .map((item) => ({ rowNumber: item.rowNumber, errors: item.errors })),
    message: `Imported ${created.length} employee(s).`,
  });
};
