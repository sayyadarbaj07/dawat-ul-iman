const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const StudentDocument = require("../models/studentDocumentModel");
const Student = require("../models/studentModel");
const ActivityLog = require("../models/activityLogModel");
const { validateFileSignature } = require("../utils/fileValidator");
const { createStudentTimelineEvent } = require("../services/studentTimelineService");

const PRIVATE_DIR = path.join(__dirname, "../../private_documents");

// Ensure private directory exists
if (!fs.existsSync(PRIVATE_DIR)) {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}

// Helper to log activities
const logActivity = async (req, action, description) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      username: req.user.name || "Admin",
      role: req.user.role,
      action,
      description,
      module: "StudentDocuments"
    });
  } catch (error) {
    console.error("ActivityLog Error:", error);
  }
};

// @desc    List active documents for a student
// @route   GET /api/students/:studentId/documents
// @access  Private/Admin
const listDocuments = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const documents = await StudentDocument.find({ studentId, isActive: true })
      .populate("uploadedBy", "name")
      .populate("verifiedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a new document
// @route   POST /api/students/:studentId/documents
// @access  Private/Admin
const uploadDocument = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { documentType, title } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Document file is required." });
    }
    if (!documentType || !title) {
      return res.status(400).json({ message: "Document type and title are required." });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Validate magic bytes
    const safeExtension = validateFileSignature(req.file.buffer, req.file.mimetype);
    if (!safeExtension) {
      return res.status(400).json({ message: "INVALID_DOCUMENT_FORMAT: File content does not match allowed types." });
    }

    // Generate secure filename
    const storedName = crypto.randomBytes(16).toString("hex") + safeExtension;
    const filePath = path.join(PRIVATE_DIR, storedName);

    // Save physical file
    fs.writeFileSync(filePath, req.file.buffer);

    let document;
    try {
      // Create DB Record
      document = await StudentDocument.create({
        studentId,
        documentType,
        title,
        originalName: path.basename(req.file.originalname),
        storedName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user._id,
        status: "pending"
      });
    } catch (dbError) {
      // Rollback file if DB fails
      fs.unlinkSync(filePath);
      throw dbError;
    }

    await logActivity(req, "STUDENT_DOCUMENT_UPLOADED", `Admin uploaded ${documentType} document for student ${student.studentId}`);

    createStudentTimelineEvent({
      studentId,
      eventType: "STUDENT_DOCUMENT_UPLOADED",
      performedBy: req.user._id,
      descriptionKey: "document_uploaded",
      metadata: {
        documentId: document._id,
        documentType
      }
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Download/View a document
// @route   GET /api/student-documents/:id/download
// @access  Private/Admin
const downloadDocument = async (req, res, next) => {
  try {
    const document = await StudentDocument.findById(req.params.id);
    if (!document || !document.isActive || document.status === "deleted") {
      return res.status(404).json({ message: "DOCUMENT_NOT_FOUND" });
    }

    const student = await Student.findById(document.studentId);
    if (!student) {
      return res.status(404).json({ message: "Associated student not found." });
    }

    const filePath = path.join(PRIVATE_DIR, document.storedName);
    
    // Path traversal protection
    if (filePath.indexOf(PRIVATE_DIR) !== 0) {
      return res.status(403).json({ message: "DOCUMENT_ACCESS_DENIED" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "DOCUMENT_FILE_NOT_FOUND" });
    }

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Replace an existing document
// @route   PUT /api/student-documents/:id/replace
// @access  Private/Admin
const replaceDocument = async (req, res, next) => {
  try {
    const oldDocument = await StudentDocument.findById(req.params.id);
    if (!oldDocument || !oldDocument.isActive || oldDocument.status === "deleted") {
      return res.status(404).json({ message: "Active document not found for replacement." });
    }

    const { title } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "New document file is required." });
    }

    // Validate magic bytes
    const safeExtension = validateFileSignature(req.file.buffer, req.file.mimetype);
    if (!safeExtension) {
      return res.status(400).json({ message: "INVALID_DOCUMENT_FORMAT: File content does not match allowed types." });
    }

    // Generate secure filename
    const storedName = crypto.randomBytes(16).toString("hex") + safeExtension;
    const filePath = path.join(PRIVATE_DIR, storedName);

    // Save new physical file
    fs.writeFileSync(filePath, req.file.buffer);

    let newDocument;
    try {
      newDocument = await StudentDocument.create({
        studentId: oldDocument.studentId,
        documentType: oldDocument.documentType,
        title: title || oldDocument.title,
        originalName: path.basename(req.file.originalname),
        storedName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user._id,
        status: "pending",
        replacedDocumentId: oldDocument._id
      });

      // Mark old document inactive
      oldDocument.isActive = false;
      await oldDocument.save();
    } catch (dbError) {
      // Rollback new file if DB fails
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      throw dbError;
    }

    const student = await Student.findById(oldDocument.studentId);
    await logActivity(req, "STUDENT_DOCUMENT_REPLACED", `Admin replaced ${oldDocument.documentType} document for student ${student ? student.studentId : oldDocument.studentId}`);

    createStudentTimelineEvent({
      studentId: oldDocument.studentId,
      eventType: "STUDENT_DOCUMENT_REPLACED",
      performedBy: req.user._id,
      descriptionKey: "document_replaced",
      metadata: {
        documentId: newDocument._id,
        replacedDocumentId: oldDocument._id
      }
    });

    res.status(200).json({ success: true, data: newDocument });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify a document
// @route   PATCH /api/student-documents/:id/verify
// @access  Private/Admin
const verifyDocument = async (req, res, next) => {
  try {
    const document = await StudentDocument.findById(req.params.id);
    if (!document || !document.isActive || document.status === "deleted") {
      return res.status(404).json({ message: "Active document not found." });
    }

    document.status = "verified";
    document.verifiedBy = req.user._id;
    document.verifiedAt = new Date();
    document.rejectionReason = "";
    await document.save();

    const student = await Student.findById(document.studentId);
    await logActivity(req, "STUDENT_DOCUMENT_VERIFIED", `Admin verified ${document.documentType} document for student ${student ? student.studentId : document.studentId}`);

    createStudentTimelineEvent({
      studentId: document.studentId,
      eventType: "STUDENT_DOCUMENT_VERIFIED",
      performedBy: req.user._id,
      descriptionKey: "document_verified",
      metadata: {
        documentId: document._id
      }
    });

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a document
// @route   PATCH /api/student-documents/:id/reject
// @access  Private/Admin
const rejectDocument = async (req, res, next) => {
  try {
    const rejectionReason = req.body?.rejectionReason;
    if (!rejectionReason || rejectionReason.trim() === "") {
      return res.status(400).json({ message: "REJECTION_REASON_REQUIRED" });
    }

    const document = await StudentDocument.findById(req.params.id);
    if (!document || !document.isActive || document.status === "deleted") {
      return res.status(404).json({ message: "Active document not found." });
    }

    document.status = "rejected";
    document.verifiedBy = req.user._id;
    document.verifiedAt = new Date();
    document.rejectionReason = rejectionReason.trim();
    await document.save();

    const student = await Student.findById(document.studentId);
    await logActivity(req, "STUDENT_DOCUMENT_REJECTED", `Admin rejected ${document.documentType} document for student ${student ? student.studentId : document.studentId}: ${rejectionReason.trim()}`);

    createStudentTimelineEvent({
      studentId: document.studentId,
      eventType: "STUDENT_DOCUMENT_REJECTED",
      performedBy: req.user._id,
      descriptionKey: "document_rejected",
      metadata: {
        documentId: document._id,
        reason: rejectionReason.trim()
      }
    });

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete a document
// @route   DELETE /api/student-documents/:id
// @access  Private/Admin
const deleteDocument = async (req, res, next) => {
  try {
    const document = await StudentDocument.findById(req.params.id);
    if (!document || !document.isActive || document.status === "deleted") {
      return res.status(404).json({ message: "Active document not found." });
    }

    document.status = "deleted";
    document.isActive = false;
    await document.save();

    const student = await Student.findById(document.studentId);
    await logActivity(req, "STUDENT_DOCUMENT_DELETED", `Admin deleted ${document.documentType} document for student ${student ? student.studentId : document.studentId}`);

    createStudentTimelineEvent({
      studentId: document.studentId,
      eventType: "STUDENT_DOCUMENT_DELETED",
      performedBy: req.user._id,
      descriptionKey: "document_deleted",
      metadata: {
        documentId: document._id
      }
    });

    res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDocuments,
  uploadDocument,
  downloadDocument,
  replaceDocument,
  verifyDocument,
  rejectDocument,
  deleteDocument
};
