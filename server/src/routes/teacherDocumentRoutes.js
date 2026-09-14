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
} = require("../controllers/teacherDocumentController");

const router = express.Router();

// Teacher documents endpoints
router.get("/teachers/:teacherId/documents", protect, authorize("admin", "teacher"), listDocuments);
router.post("/teachers/:teacherId/documents", protect, authorize("admin"), documentUpload.single("document"), uploadDocument);

router.get("/teacher-documents/:id/download", protect, authorize("admin", "teacher"), downloadDocument);
router.put("/teacher-documents/:id/replace", protect, authorize("admin"), documentUpload.single("document"), replaceDocument);
router.patch("/teacher-documents/:id/verify", protect, authorize("admin"), verifyDocument);
router.patch("/teacher-documents/:id/reject", protect, authorize("admin"), rejectDocument);
router.delete("/teacher-documents/:id", protect, authorize("admin"), deleteDocument);

module.exports = router;
