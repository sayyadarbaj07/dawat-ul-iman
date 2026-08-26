const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { logActivity } = require("../middleware/auditMiddleware");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (user && (await user.matchPassword(password))) {
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is deactivated. Contact Admin." });
    }
    
    // Log login activity
    await logActivity(user, "LOGIN", "User logged in", "Auth");

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      initials: user.initials,
      mustChangePassword: user.mustChangePassword,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid username or password" });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      initials: user.initials,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check current password
  if (!(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ message: "Incorrect current password" });
  }

  // Update password
  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  // Log activity
  await logActivity(user, "CHANGE_PASSWORD", "User changed their password", "Auth");

  res.json({ message: "Password updated successfully" });
};

module.exports = {
  loginUser,
  getUserProfile,
  changePassword,
};
