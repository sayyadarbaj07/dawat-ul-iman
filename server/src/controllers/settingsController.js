const Settings = require("../models/settingsModel");
const fs = require("fs");
const path = require("path");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) {
    payload.error = error.message || error;
  }
  return res.status(statusCode).json(payload);
};

// @desc    Get institute settings
// @route   GET /api/settings
// @access  Public or Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if not exists
      settings = await Settings.create({});
    }
    return sendSuccess(res, 200, "Settings fetched successfully", settings);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch settings", error);
  }
};

// @desc    Update institute settings
// @route   PUT /api/settings
// @access  Private (Admin only)
const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const {
      instituteName,
      instituteNameUrdu,
      address,
      contactPhone,
      contactEmail,
      academicYear,
    } = req.body;

    if (instituteName) settings.instituteName = instituteName;
    if (instituteNameUrdu !== undefined) settings.instituteNameUrdu = instituteNameUrdu;
    if (address !== undefined) settings.address = address;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (academicYear !== undefined) settings.academicYear = academicYear;

    if (req.file) {
      // Create a URL for the uploaded file
      const logoUrl = `/uploads/${req.file.filename}`;
      // delete old logo if necessary (and if it's not the default)
      if (settings.logoUrl && !settings.logoUrl.startsWith("/logo1")) {
        const oldPath = path.join(__dirname, "../../", settings.logoUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      settings.logoUrl = logoUrl;
    }

    await settings.save();
    return sendSuccess(res, 200, "Settings updated successfully", settings);
  } catch (error) {
    return sendError(res, 500, "Failed to update settings", error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
