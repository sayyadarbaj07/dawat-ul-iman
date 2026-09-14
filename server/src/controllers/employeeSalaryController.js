const Employee = require("../models/employeeModel");
const EmployeeAttendance = require("../models/employeeAttendanceModel");
const EmployeeSalary = require("../models/employeeSalaryModel");
const ActivityLog = require("../models/activityLogModel");
const { calculateSalary } = require("../services/salaryCalculationService");

// Calculate and preview salary for an employee for a specific month/year
exports.previewSalary = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: "employeeId, month, and year are required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendanceRecords = await EmployeeAttendance.find({
      employeeId: employee._id,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    try {
      const calculation = calculateSalary({
        monthlySalary: employee.monthlySalary,
        joiningDate: employee.joiningDate,
        deactivationDate: employee.deactivationDate,
        month,
        year,
        attendanceRecords
      });

      res.status(200).json({
        success: true,
        data: calculation
      });
    } catch (calcError) {
      if (calcError.message.includes("INCOMPLETE_ATTENDANCE")) {
        return res.status(400).json({ success: false, message: calcError.message, code: "INCOMPLETE_ATTENDANCE" });
      }
      throw calcError;
    }

  } catch (error) {
    console.error("Preview Employee Salary Error:", error);
    res.status(500).json({ success: false, message: "Failed to preview salary", error: error.message });
  }
};

// Calculate and save Draft salary
exports.createDraftSalary = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: "employeeId, month, and year are required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Check if salary already exists
    const existing = await EmployeeSalary.findOne({ employeeId, month, year });
    if (existing) {
      return res.status(400).json({ success: false, message: "Salary record already exists for this month." });
    }

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendanceRecords = await EmployeeAttendance.find({
      employeeId: employee._id,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    let calculation;
    try {
      calculation = calculateSalary({
        monthlySalary: employee.monthlySalary,
        joiningDate: employee.joiningDate,
        deactivationDate: employee.deactivationDate,
        month,
        year,
        attendanceRecords
      });
    } catch (calcError) {
      return res.status(400).json({ success: false, message: calcError.message, code: "INCOMPLETE_ATTENDANCE" });
    }

    const salaryRecord = new EmployeeSalary({
      employeeId: employee._id,
      month,
      year,
      ...calculation,
      status: "Draft",
      processedBy: req.user._id
    });

    await salaryRecord.save();

    await ActivityLog.create({
      user: req.user._id,
      username: req.user.username || req.user.name || 'Admin',
      role: req.user.role || 'admin',
      action: "EMPLOYEE_SALARY_CREATED",
      description: `Created draft salary for employee ${employee.employeeId || employee.name} for ${month}/${year}`,
      module: "Payroll"
    });

    res.status(201).json({
      success: true,
      message: "Draft salary generated successfully",
      data: salaryRecord
    });
  } catch (error) {
    console.error("Create Employee Salary Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate salary", error: error.message });
  }
};
