const { body, validationResult } = require("express-validator");

const studentValidationRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("fatherName").trim().notEmpty().withMessage("Father name is required"),
  body("className").trim().notEmpty().withMessage("Class is required"),
  body("className")
    .isIn(["diniyat", "arabic", "contemporary"])
    .withMessage("Invalid class value"),
  body("dateOfBirth")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),
  body("gender")
    .optional({ nullable: true })
    .isIn(["male", "female", "other", ""])
    .withMessage("Invalid gender value"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Invalid status"),
  body("residential")
    .optional()
    .isBoolean()
    .withMessage("Residential must be true or false"),
  body("contactNumber").optional({ nullable: true }).isString(),
  body("email")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("Invalid email address"),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors
        .array()
        .map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

module.exports = { studentValidationRules, handleValidationErrors };
