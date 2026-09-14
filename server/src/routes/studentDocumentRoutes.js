const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const documentUpload = require("../middleware/documentUploadMiddleware");
const {
  listDocuments,
  uploadDocument,
  downloadDocument,
  replaceDocument,
  verifyDocument,
  rejectDocument,
  deleteDocument
} = require("../controllers/studentDocumentController");

const router = express.Router();

// Base routes for students/:studentId/documents
// These will be mounted in app.js as /api/students/:studentId/documents (or managed inside studentRoutes)
// Since we want flat routes for the document ID based ones, we'll mount two sets of routes.

// Set 1: /api/students/:studentId/documents -> handled here
router.get("/students/:studentId/documents", protect, authorize("admin"), listDocuments);
router.post("/students/:studentId/documents", protect, authorize("admin"), documentUpload.single("document"), uploadDocument);

// Set 2: /api/student-documents/:id -> handled here
router.get("/student-documents/:id/download", protect, authorize("admin"), downloadDocument);
router.put("/student-documents/:id/replace", protect, authorize("admin"), documentUpload.single("document"), replaceDocument);
router.patch("/student-documents/:id/verify", protect, authorize("admin"), verifyDocument);
router.patch("/student-documents/:id/reject", protect, authorize("admin"), rejectDocument);
router.delete("/student-documents/:id", protect, authorize("admin"), deleteDocument);

module.exports = router;
