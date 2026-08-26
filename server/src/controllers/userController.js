const User = require("../models/userModel");
const bcrypt = require("bcrypt");
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

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Users fetched successfully", users);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch users", error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { username, password, name, role, isActive } = req.body;
    
    const userExists = await User.findOne({ username });
    if (userExists) {
      return sendError(res, 400, "User already exists");
    }

    // Initials generation
    const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);

    const user = await User.create({
      username,
      password,
      name,
      role: role || "viewer",
      initials,
      isActive: isActive !== undefined ? isActive : true,
      mustChangePassword: true
    });

    if (user) {
      await logActivity(req.user, "CREATE_USER", `Created new user: ${user.username}`, "Users");
      return sendSuccess(res, 201, "User created successfully", {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      });
    } else {
      return sendError(res, 400, "Invalid user data");
    }
  } catch (error) {
    return sendError(res, 500, "Failed to create user", error);
  }
};

// @desc    Update a user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;
    user.role = req.body.role || user.role;
    
    if (req.body.isActive !== undefined) {
      user.isActive = req.body.isActive;
    }

    if (req.body.name) {
       user.initials = req.body.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
    }

    const updatedUser = await user.save();
    return sendSuccess(res, 200, "User updated successfully", {
      _id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive
    });
  } catch (error) {
    return sendError(res, 500, "Failed to update user", error);
  }
};

// @desc    Reset a user's password
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (!req.body.password) {
      return sendError(res, 400, "New password is required");
    }

    user.password = req.body.password;
    user.mustChangePassword = true;
    await user.save();
    
    return sendSuccess(res, 200, "Password reset successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to reset password", error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }
    
    // Prevent deleting the main admin
    if (user.username === "admin") {
        return sendError(res, 403, "Cannot delete the main admin account");
    }

    await User.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "DELETE_USER", `Deleted user: ${user.username}`, "Users");
    return sendSuccess(res, 200, "User deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete user", error);
  }
};
