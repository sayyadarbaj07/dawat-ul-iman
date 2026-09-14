const Employee = require("../models/employeeModel");
const mongoose = require("mongoose");
const { logActivity } = require("../middleware/auditMiddleware");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) payload.error = error.message || error;
  return res.status(statusCode).json(payload);
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private/Admin
exports.getEmployees = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [
        { name: searchRegex },
        { employeeId: searchRegex },
        { designation: searchRegex },
      ];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Employees fetched successfully", employees);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch employees", error);
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private/Admin
exports.getEmployeeById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid Employee ID format");
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return sendError(res, 404, "Employee not found");
    }

    return sendSuccess(res, 200, "Employee fetched successfully", employee);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch employee", error);
  }
};

// @desc    Create an employee
// @route   POST /api/employees
// @access  Private/Admin
exports.createEmployee = async (req, res) => {
  try {
    const { name, designation, joiningDate, monthlySalary, mobile, address, remarks, photo, isActive } = req.body;

    // Validation
    if (!name || name.trim() === "") {
      return sendError(res, 400, "Name is required");
    }
    if (!designation || designation.trim() === "") {
      return sendError(res, 400, "Designation is required");
    }
    if (!joiningDate || isNaN(new Date(joiningDate).getTime())) {
      return sendError(res, 400, "Valid joining date is required");
    }
    if (monthlySalary === undefined || isNaN(monthlySalary) || Number(monthlySalary) < 0) {
      return sendError(res, 400, "Valid monthly salary (>= 0) is required");
    }

    const employeeData = {
      name,
      designation,
      joiningDate,
      monthlySalary: Number(monthlySalary),
      mobile: mobile || "",
      address: address || "",
      remarks: remarks || "",
      photo: photo || "",
    };

    if (isActive !== undefined) {
      employeeData.isActive = isActive;
    }

    // Photo logic if there's a file upload (assuming upload middleware might be added later)
    if (req.file) {
      employeeData.photo = `/uploads/profiles/${req.file.filename}`;
    }

    const employee = await Employee.create(employeeData);

    await logActivity(req.user, "EMPLOYEE_CREATED", `Created new employee: ${employee.name} (${employee.employeeId})`, "Employees");

    return sendSuccess(res, 201, "Employee created successfully", employee);
  } catch (error) {
    return sendError(res, 500, "Failed to create employee", error);
  }
};

// @desc    Update an employee
// @route   PUT /api/employees/:id
// @access  Private/Admin
exports.updateEmployee = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid Employee ID format");
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return sendError(res, 404, "Employee not found");
    }

    const { name, designation, joiningDate, monthlySalary, mobile, address, remarks, isActive, deactivationDate } = req.body;

    if (name) employee.name = name;
    if (designation) employee.designation = designation;
    if (joiningDate) {
      if (isNaN(new Date(joiningDate).getTime())) {
        return sendError(res, 400, "Valid joining date is required");
      }
      employee.joiningDate = joiningDate;
    }
    
    const effectiveJoiningDate = employee.joiningDate;
    const effectiveDeactivationDate = deactivationDate !== undefined ? (deactivationDate ? new Date(deactivationDate) : null) : employee.deactivationDate;
    
    if (effectiveDeactivationDate && effectiveDeactivationDate < effectiveJoiningDate) {
      return sendError(res, 400, "Deactivation date cannot be earlier than joining date");
    }
    
    if (deactivationDate !== undefined) {
      employee.deactivationDate = deactivationDate ? new Date(deactivationDate) : null;
    }

    if (monthlySalary !== undefined) {
      if (isNaN(monthlySalary) || Number(monthlySalary) < 0) {
        return sendError(res, 400, "Valid monthly salary (>= 0) is required");
      }
      employee.monthlySalary = Number(monthlySalary);
    }
    if (mobile !== undefined) employee.mobile = mobile;
    if (address !== undefined) employee.address = address;
    if (remarks !== undefined) employee.remarks = remarks;
    if (isActive !== undefined) employee.isActive = isActive;

    if (req.file) {
      employee.photo = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedEmployee = await employee.save();

    await logActivity(req.user, "EMPLOYEE_UPDATED", `Updated employee: ${updatedEmployee.name} (${updatedEmployee.employeeId})`, "Employees");

    return sendSuccess(res, 200, "Employee updated successfully", updatedEmployee);
  } catch (error) {
    return sendError(res, 500, "Failed to update employee", error);
  }
};

// @desc    Deactivate (soft-delete) an employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
exports.deleteEmployee = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid Employee ID format");
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return sendError(res, 404, "Employee not found");
    }

    const deactivationDate = req.body.deactivationDate || new Date();
    if (new Date(deactivationDate) < new Date(employee.joiningDate)) {
      return sendError(res, 400, "Deactivation date cannot be earlier than joining date");
    }

    employee.isActive = false;
    employee.deactivationDate = deactivationDate;
    await employee.save();

    await logActivity(req.user, "EMPLOYEE_DEACTIVATED", `Deactivated employee: ${employee.name} (${employee.employeeId})`, "Employees");

    return sendSuccess(res, 200, "Employee deactivated successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to deactivate employee", error);
  }
};
