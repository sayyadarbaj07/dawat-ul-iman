const HostelSupervisor = require("../models/hostelSupervisorModel");
const Employee = require("../models/employeeModel");

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

exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await HostelSupervisor.find().populate("employeeId");
    return sendSuccess(res, 200, "Supervisors fetched successfully", supervisors);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch supervisors", error);
  }
};

exports.createSupervisor = async (req, res) => {
  try {
    const { employeeId, startTime, endTime, frequency, remarks, status } = req.body;

    if (!employeeId || !startTime || !endTime) {
      return sendError(res, 400, "Employee, Start Time, and End Time are required");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return sendError(res, 404, "Employee not found");
    }

    const supervisor = await HostelSupervisor.create({
      employeeId,
      startTime,
      endTime,
      frequency: frequency || "daily",
      remarks: remarks || "",
      status: status || "active"
    });

    return sendSuccess(res, 201, "Supervisor assigned successfully", supervisor);
  } catch (error) {
    return sendError(res, 500, "Failed to create supervisor assignment", error);
  }
};

exports.updateSupervisor = async (req, res) => {
  try {
    const { startTime, endTime, frequency, remarks, status } = req.body;

    const supervisor = await HostelSupervisor.findByIdAndUpdate(
      req.params.id,
      { startTime, endTime, frequency, remarks, status },
      { new: true, runValidators: true }
    );

    if (!supervisor) {
      return sendError(res, 404, "Supervisor assignment not found");
    }

    return sendSuccess(res, 200, "Supervisor assigned updated successfully", supervisor);
  } catch (error) {
    return sendError(res, 500, "Failed to update supervisor assignment", error);
  }
};

exports.deleteSupervisor = async (req, res) => {
  try {
    const supervisor = await HostelSupervisor.findByIdAndDelete(req.params.id);
    if (!supervisor) {
      return sendError(res, 404, "Supervisor assignment not found");
    }
    return sendSuccess(res, 200, "Supervisor assignment permanently deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete supervisor assignment", error);
  }
};
