import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/BackButton";
import { studentApi, attendanceApi, examApi, pdfApi } from "@/lib/api";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash,
  FileText,
  User,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "wouter";
import { formatLocalizedNumber, formatLocalizedDate, formatLocalizedPercent, getLocalizedStudentName } from "@/utils/localizationUtils";

export default function Students() {
  const [, setLocation] = useLocation();
  const { tr, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    nameUrdu: "",
    fatherName: "",
    rollNumber: "",
    schoolClassId: "",
    schoolSection: "",
    classId: "",
    className: "", // keeping legacy field for backward compatibility
    studentClassCategory: "",
    studentClassSub: "",
    residential: true,
    dateOfBirth: "",
    photo: null,
    photoPreview: null,
    motherName: "",
    gender: "",
    contactNumber: "",
    email: "",
    address: "",
    guardianName: "",
    guardianContact: "",
    guardianRelation: "",
    admissionNumber: "",
    admissionDate: "",
    section: "",
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [studentAcademicHistory, setStudentAcademicHistory] = useState([]);
  const [loadingAcademicHistory, setLoadingAcademicHistory] = useState(false);

  const [isExportingStudentPDF, setIsExportingStudentPDF] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    nameUrdu: "",
    fatherName: "",
    rollNumber: "",
    schoolClassId: "",
    schoolSection: "",
    classId: "",
    className: "",
    studentClassCategory: "",
    studentClassSub: "",
    residential: true,
    dateOfBirth: "",
    photo: null,
    photoPreview: null,
    removePhoto: false,
    motherName: "",
    gender: "",
    contactNumber: "",
    email: "",
    address: "",
    guardianName: "",
    guardianContact: "",
    guardianRelation: "",
    admissionNumber: "",
    admissionDate: "",
    section: "",
  });

  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteFormData, setPromoteFormData] = useState({
    academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    classId: "",
    className: "",
    studentClassCategory: "",
    studentClassSub: "",
    schoolClass: "",
    notes: ""
  });

  const [isSearching, setIsSearching] = useState(false);

  const loadStudents = async (term = "", isBackground = false) => {
    try {
      if (isBackground) setIsSearching(true);
      else setLoading(true);
      const res = await studentApi.list({ search: term });
      setStudents(res.data?.data || []);
    } catch (error) {
      setStudents([]);
    } finally {
      if (isBackground) setIsSearching(false);
      else setLoading(false);
    }
  };

  const [apiClasses, setApiClasses] = useState([]);
  const [madrasaClasses, setMadrasaClasses] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);

  useEffect(() => {
    loadStudents("", false);
    const fetchClasses = async () => {
      try {
        const { classApi } = await import("@/lib/api/classApi");
        const res = await classApi.getClasses();
        const activeClasses = res.data?.filter(c => c.status === "active") || [];
        setApiClasses(activeClasses);
        setSchoolClasses(activeClasses.filter(c => c.department === "school"));
        setMadrasaClasses(activeClasses.filter(c => c.department !== "school"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (loading) return; // Skip initial render
    const timeout = setTimeout(() => {
      loadStudents(searchTerm, true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handlePhotoSelection = (e, setFormDataCallback) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (20MB)
    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Please select an image smaller than ${MAX_SIZE_MB}MB.`);
      e.target.value = null; // Clear input
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WebP images are supported.");
      e.target.value = null;
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormDataCallback(file, previewUrl);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      payload.append("name", formData.fullName);
      if (formData.nameUrdu) payload.append("nameUrdu", formData.nameUrdu);
      payload.append("fatherName", formData.fatherName);
      payload.append("rollNumber", formData.rollNumber);
      if (formData.schoolClassId) payload.append("schoolClassId", formData.schoolClassId);
      if (formData.schoolSection) payload.append("schoolSection", formData.schoolSection);
      if (formData.classId) {
        payload.append("classId", formData.classId);
      } else {
        payload.append("className", formData.className);
        payload.append("studentClass", `${formData.studentClassCategory} - ${formData.studentClassSub}`);
      }
      payload.append("residential", formData.residential === "true" || formData.residential === true);
      
      if (formData.dateOfBirth) {
        payload.append("dateOfBirth", formData.dateOfBirth);
      }
      if (formData.photo) {
        payload.append("photo", formData.photo);
      }
      if (formData.motherName) payload.append("motherName", formData.motherName);
      if (formData.gender) payload.append("gender", formData.gender);
      if (formData.contactNumber) payload.append("contactNumber", formData.contactNumber);
      if (formData.email) payload.append("email", formData.email);
      if (formData.address) payload.append("address", formData.address);
      if (formData.guardianName) payload.append("guardianName", formData.guardianName);
      if (formData.guardianContact) payload.append("guardianContact", formData.guardianContact);
      if (formData.guardianRelation) payload.append("guardianRelation", formData.guardianRelation);
      if (formData.admissionNumber) payload.append("admissionNumber", formData.admissionNumber);
      if (formData.admissionDate) payload.append("admissionDate", formData.admissionDate);
      if (formData.section) payload.append("section", formData.section);

      await studentApi.createWithFile(payload);
      setIsAddModalOpen(false);
      setFormData({
        fullName: "",
        fatherName: "",
        rollNumber: "",
        schoolClassId: "",
        schoolSection: "",
        classId: "",
        className: "",
        studentClassCategory: "",
        studentClassSub: "",
        residential: true,
        dateOfBirth: "",
        photo: null,
        photoPreview: null,
        motherName: "",
        gender: "",
        contactNumber: "",
        email: "",
        address: "",
        guardianName: "",
        guardianContact: "",
        guardianRelation: "",
        admissionNumber: "",
        admissionDate: "",
        section: "",
      });
      loadStudents(searchTerm);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await studentApi.remove(id);
      loadStudents(searchTerm);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    
    let parsedCategory = "Shob-e-Deeniyat";
    let parsedSub = "Awwal";
    if (student.studentClass && student.studentClass.includes(" - ")) {
      [parsedCategory, parsedSub] = student.studentClass.split(" - ");
    }
    
    setEditFormData({
      name: student.fullName || student.name || "",
      nameUrdu: student.nameUrdu || "",
      fatherName: student.fatherName || "",
      rollNumber: student.rollNumber || "",
      schoolClassId: student.schoolClassId?._id || student.schoolClassId || "",
      schoolSection: student.schoolSection || "",
      classId: student.classId?._id || student.classId || "",
      className: student.className || "",
      studentClassCategory: parsedCategory || "",
      studentClassSub: parsedSub || "",
      residential: student.residential ?? true,
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "",
      photo: null,
      photoPreview: student.photo ? `http://localhost:5000${student.photo}` : null,
      removePhoto: false,
      motherName: student.motherName || "",
      gender: student.gender || "",
      contactNumber: student.contactNumber || "",
      email: student.email || "",
      address: student.address || "",
      guardianName: student.guardianName || "",
      guardianContact: student.guardianContact || "",
      guardianRelation: student.guardianRelation || "",
      admissionNumber: student.admissionNumber || "",
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : "",
      section: student.section || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      payload.append("name", editFormData.name);
      if (editFormData.nameUrdu) payload.append("nameUrdu", editFormData.nameUrdu);
      payload.append("fatherName", editFormData.fatherName);
      payload.append("rollNumber", editFormData.rollNumber);
      if (editFormData.schoolClassId) payload.append("schoolClassId", editFormData.schoolClassId);
      else payload.append("schoolClassId", "");
      if (editFormData.schoolSection) payload.append("schoolSection", editFormData.schoolSection);
      if (editFormData.classId) {
        payload.append("classId", editFormData.classId);
      } else {
        payload.append("className", editFormData.className);
        payload.append("studentClass", `${editFormData.studentClassCategory} - ${editFormData.studentClassSub}`);
      }
      payload.append("residential", editFormData.residential === "true" || editFormData.residential === true);
      
      if (editFormData.dateOfBirth) {
        payload.append("dateOfBirth", editFormData.dateOfBirth);
      }
      if (editFormData.photo) {
        payload.append("photo", editFormData.photo);
      }
      if (editFormData.removePhoto) {
        payload.append("removePhoto", "true");
      }
      if (editFormData.motherName) payload.append("motherName", editFormData.motherName);
      if (editFormData.gender) payload.append("gender", editFormData.gender);
      if (editFormData.contactNumber) payload.append("contactNumber", editFormData.contactNumber);
      if (editFormData.email) payload.append("email", editFormData.email);
      if (editFormData.address) payload.append("address", editFormData.address);
      if (editFormData.guardianName) payload.append("guardianName", editFormData.guardianName);
      if (editFormData.guardianContact) payload.append("guardianContact", editFormData.guardianContact);
      if (editFormData.guardianRelation) payload.append("guardianRelation", editFormData.guardianRelation);
      if (editFormData.admissionNumber) payload.append("admissionNumber", editFormData.admissionNumber);
      if (editFormData.admissionDate) payload.append("admissionDate", editFormData.admissionDate);
      if (editFormData.section) payload.append("section", editFormData.section);

      const id = selectedStudent._id || selectedStudent.id || selectedStudent.studentId;
      await studentApi.updateWithFile(id, payload);
      setIsEditModalOpen(false);
      loadStudents(searchTerm);
    } catch (error) {
      console.error(error);
    }
  };

  const openPromoteModal = (student) => {
    setSelectedStudent(student);
    setPromoteFormData({
      ...promoteFormData,
      studentClassCategory: "",
      studentClassSub: "",
      schoolClass: "",
      notes: ""
    });
    setIsPromoteModalOpen(true);
  };

  const handlePromoteSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        classId: promoteFormData.classId,
        schoolClass: promoteFormData.schoolClass,
        academicYear: promoteFormData.academicYear,
        notes: promoteFormData.notes
      };
      const id = selectedStudent._id || selectedStudent.id || selectedStudent.studentId;
      await studentApi.promote(id, payload);
      setIsPromoteModalOpen(false);
      loadStudents(searchTerm);
    } catch (error) {
      console.error(error);
    }
  };

  const loadStudentAcademicHistory = async (studentId) => {
    try {
      setLoadingAcademicHistory(true);
      const res = await examApi.getStudentHistoricalResults(studentId);
      setStudentAcademicHistory(res.data);
    } catch(err) {
      console.error(err);
      setStudentAcademicHistory(null);
    } finally {
      setLoadingAcademicHistory(false);
    }
  };



  const handleViewProfile = (student) => {
    const id = student._id || student.id || student.studentId;
    if (id) {
      setLocation(`/students/${id}`);
    }
  };

  const exportStudentHistoricalPDF = async (studentId, examId, language = "en") => {
    setIsExportingStudentPDF(examId);
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/report-card?examId=${examId}&language=${language}`, `Report_Card_${studentId}_${language}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export PDF");
    } finally {
      setIsExportingStudentPDF(null);
    }
  };

  const exportFullAcademicHistory = async (studentId, language = "en") => {
    setIsExportingStudentPDF('full_history');
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/academic-history?language=${language}`, `Academic_History_${studentId}_${language}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export full academic history");
    } finally {
      setIsExportingStudentPDF(null);
    }
  };

  const exportYearlyResult = async (studentId, academicYear, language = "en") => {
    setIsExportingStudentPDF(`yearly_${academicYear}`);
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/yearly-result?academicYear=${academicYear}&language=${language}`, `Yearly_Result_${studentId}_${academicYear}_${language}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export yearly result. Ensure exams exist for this year.");
    } finally {
      setIsExportingStudentPDF(null);
    }
  };

  const exportIdCard = async (studentId, language = "en") => {
    setIsExportingStudentPDF('id_card');
    try {
      await pdfApi.downloadPdf(pdfApi.getStudentIdCard(studentId, language), `ID_Card_${studentId}_${language}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export ID Card" : "Failed to generate ID Card");
    } finally {
      setIsExportingStudentPDF(null);
    }
  };

  const filteredStudents = students;
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader 
        title={tr("students", "pageTitle")}
        description={tr("students", "pageSubtitle")}
        showBack={true}
        backLabel={tr("common", "backToDashboard")}
        actions={
          <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0 w-full sm:w-auto">
            <Plus className="me-2 h-4 w-4" /> {tr("students", "addStudent")}
          </Button>
        }
      />

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{tr("students", "addStudent")}</DialogTitle>
              <DialogDescription>
                {tr("students", "addStudentDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
              
              {/* SECTION 1: PERSONAL INFORMATION */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">{tr("students", "personalInfo")}</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="photo">{tr("students", "fullName")}</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full overflow-hidden bg-muted border flex items-center justify-center shrink-0">
                        {formData.photoPreview ? (
                          <img src={formData.photoPreview} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          id="photo"
                          type="file"
                          accept="image/jpeg, image/jpg, image/png, image/webp"
                          onChange={(e) => handlePhotoSelection(e, (file, url) => setFormData({ ...formData, photo: file, photoPreview: url }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{tr("students", "fullName")}</Label>
                    <Input dir="auto" id="name" placeholder="Muhammad Ali" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dob">{tr("students", "dateOfBirth")}</Label>
                    <Input dir="ltr" id="dob" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">{tr("students", "gender")}</Label>
                    <select id="gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactNumber">{tr("students", "mobileNumber")}</Label>
                    <Input dir="ltr" id="contactNumber" placeholder="9876543210" value={formData.contactNumber} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">{tr("students", "email")}</Label>
                    <Input dir="ltr" id="email" type="email" placeholder="test@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="residential">{tr("students", "status")}</Label>
                    <select id="residential" value={String(formData.residential)} onChange={(e) => setFormData({ ...formData, residential: e.target.value === "true" })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="true">{tr("students", "residential")}</option>
                      <option value="false">{tr("students", "dayScholar")}</option>
                    </select>
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="address">{tr("students", "address")}</Label>
                    <Input dir="auto" id="address" placeholder="123 Street Name" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARENT / GUARDIAN */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">{tr("students", "parentInfo")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="father">{tr("students", "fatherName")}</Label>
                    <Input dir="auto" id="father" placeholder="Ahmed Ali" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="motherName">{tr("students", "motherName")}</Label>
                    <Input dir="auto" id="motherName" placeholder="Aisha" value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guardianName">{tr("students", "guardianName")}</Label>
                    <Input dir="auto" id="guardianName" placeholder="Uncle Name" value={formData.guardianName} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="guardianRelation">{tr("students", "guardian")}</Label>
                    <Input dir="auto" id="guardianRelation" placeholder="Uncle" value={formData.guardianRelation} onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="guardianContact">{tr("students", "guardianContact")}</Label>
                    <Input dir="ltr" id="guardianContact" placeholder="9876543210" value={formData.guardianContact} onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADMISSION / ACADEMIC DETAILS */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">{tr("students", "academicInfo")}</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="classId">Class (Assigned via API)</Label>
                    <select id="classId" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">{tr("common", "selectClass")}</option>
                      {apiClasses.map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                      ))}
                    </select>
                  </div>
                  {!formData.classId && (
                    <div className="text-xs text-muted-foreground italic px-1">
                      Warning: Legacy default classes will be assigned if no class is selected.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rollNumber">{tr("students", "admissionNumber")}</Label>
                    <Input dir="ltr" id="rollNumber" placeholder="1, 2, 3..." value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admissionNumber">{tr("students", "admissionNumber")}</Label>
                    <Input dir="ltr" id="admissionNumber" placeholder="ADM-001" value={formData.admissionNumber} onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="admissionDate">{tr("students", "admissionDate")}</Label>
                    <Input dir="ltr" id="admissionDate" type="date" value={formData.admissionDate} onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="section">{tr("students", "section")}</Label>
                    <Input dir="auto" id="section" placeholder="A, B, C..." value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolClassId">{tr("students", "schoolClass")}</Label>
                    <select id="schoolClassId" value={formData.schoolClassId} onChange={(e) => setFormData({ ...formData, schoolClassId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">{tr("common", "selectClass")}</option>
                      {schoolClasses.map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolSection">{tr("students", "schoolSection")}</Label>
                    <Input dir="auto" id="schoolSection" placeholder="e.g. A, B" value={formData.schoolSection} onChange={(e) => setFormData({ ...formData, schoolSection: e.target.value })} />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>{tr("students", "cancel")}</Button>
                <Button type="submit">{tr("students", "saveStudent")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{tr("students", "editDetails")}</DialogTitle>
              <DialogDescription>
                {tr("students", "editStudentDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
              
              {/* SECTION 1: PERSONAL INFORMATION */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">{tr("students", "personalInfo")}</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label>Student Photo</Label>
                    <div className="flex items-center gap-4">
                      <div className="group relative h-16 w-16 rounded-full overflow-hidden bg-muted border flex items-center justify-center shrink-0">
                        {editFormData.photoPreview ? (
                          <>
                            <img src={editFormData.photoPreview} alt="Preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setEditFormData({ ...editFormData, photoPreview: null, photo: null, removePhoto: true })}>
                              <X className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="edit-photo" className="text-xs text-muted-foreground font-normal">
                          {editFormData.photoPreview ? "Change Photo" : "Upload Photo"}
                        </Label>
                        <Input
                          id="edit-photo"
                          type="file"
                          accept="image/jpeg, image/jpg, image/png, image/webp"
                          onChange={(e) => handlePhotoSelection(e, (file, url) => setEditFormData({ ...editFormData, photo: file, photoPreview: url, removePhoto: false }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">{tr("students", "fullName")}</Label>
                    <Input dir="auto" id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-dob">{tr("students", "dateOfBirth")}</Label>
                    <Input dir="ltr" id="edit-dob" type="date" value={editFormData.dateOfBirth} onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-gender">{tr("students", "gender")}</Label>
                    <select id="edit-gender" value={editFormData.gender} onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-contactNumber">{tr("students", "mobileNumber")}</Label>
                    <Input dir="ltr" id="edit-contactNumber" value={editFormData.contactNumber} onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">{tr("students", "email")}</Label>
                    <Input dir="ltr" id="edit-email" type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-residential">{tr("students", "status")}</Label>
                    <select id="edit-residential" value={String(editFormData.residential)} onChange={(e) => setEditFormData({ ...editFormData, residential: e.target.value === "true" })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="true">{tr("students", "residential")}</option>
                      <option value="false">{tr("students", "dayScholar")}</option>
                    </select>
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="edit-address">{tr("students", "address")}</Label>
                    <Input dir="auto" id="edit-address" value={editFormData.address} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PARENT / GUARDIAN */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">{tr("students", "parentInfo")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-father">{tr("students", "fatherName")}</Label>
                    <Input dir="auto" id="edit-father" value={editFormData.fatherName} onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-motherName">{tr("students", "motherName")}</Label>
                    <Input dir="auto" id="edit-motherName" value={editFormData.motherName} onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-guardianName">{tr("students", "guardianName")}</Label>
                    <Input dir="auto" id="edit-guardianName" value={editFormData.guardianName} onChange={(e) => setEditFormData({ ...editFormData, guardianName: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-guardianRelation">{tr("students", "guardian")}</Label>
                    <Input dir="auto" id="edit-guardianRelation" value={editFormData.guardianRelation} onChange={(e) => setEditFormData({ ...editFormData, guardianRelation: e.target.value })} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="edit-guardianContact">{tr("students", "guardianContact")}</Label>
                    <Input dir="ltr" id="edit-guardianContact" value={editFormData.guardianContact} onChange={(e) => setEditFormData({ ...editFormData, guardianContact: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADMISSION / ACADEMIC DETAILS */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold border-b pb-2">{tr("students", "academicInfo")}</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-classId">Class (Assigned via API)</Label>
                    <select id="edit-classId" value={editFormData.classId} onChange={(e) => setEditFormData({ ...editFormData, classId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">{tr("common", "selectClass")}</option>
                      {madrasaClasses.map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-rollNumber">Roll Number</Label>
                    <Input dir="ltr" id="edit-rollNumber" value={editFormData.rollNumber} onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-admissionNumber">Admission Number</Label>
                    <Input dir="ltr" id="edit-admissionNumber" value={editFormData.admissionNumber} onChange={(e) => setEditFormData({ ...editFormData, admissionNumber: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-admissionDate">Admission Date</Label>
                    <Input dir="ltr" id="edit-admissionDate" type="date" value={editFormData.admissionDate} onChange={(e) => setEditFormData({ ...editFormData, admissionDate: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-section">Section</Label>
                    <Input dir="auto" id="edit-section" value={editFormData.section} onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-schoolClassId">{tr("students", "schoolClass")}</Label>
                    <select id="edit-schoolClassId" value={editFormData.schoolClassId} onChange={(e) => setEditFormData({ ...editFormData, schoolClassId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">{tr("common", "selectClass")}</option>
                      {schoolClasses.map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-schoolSection">{tr("students", "schoolSection")}</Label>
                    <Input dir="auto" id="edit-schoolSection" placeholder="e.g. A, B" value={editFormData.schoolSection} onChange={(e) => setEditFormData({ ...editFormData, schoolSection: e.target.value })} />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>{tr("students", "cancel")}</Button>
                <Button type="submit">{tr("students", "saveChanges")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Promote Modal */}
        <Dialog open={isPromoteModalOpen} onOpenChange={setIsPromoteModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Promote Student</DialogTitle>
              <DialogDescription>
                Promote {selectedStudent?.fullName || selectedStudent?.name} to a new class. This will preserve their academic history.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePromoteSubmit} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  value={promoteFormData.academicYear}
                  onChange={(e) => setPromoteFormData({...promoteFormData, academicYear: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="promote-classId">New Class (Assigned via API)</Label>
                  <select
                    id="promote-classId"
                    value={promoteFormData.classId}
                    onChange={(e) => setPromoteFormData({ ...promoteFormData, classId: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select a Class...</option>
                    {apiClasses.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promote-schoolClass">New School Class (Optional)</Label>
                <Input
                  id="promote-schoolClass"
                  placeholder="e.g. 6th Grade, Inter"
                  value={promoteFormData.schoolClass}
                  onChange={(e) => setPromoteFormData({...promoteFormData, schoolClass: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promote-notes">Notes</Label>
                <Input
                  id="promote-notes"
                  placeholder="e.g. Promoted with distinction"
                  value={promoteFormData.notes}
                  onChange={(e) => setPromoteFormData({...promoteFormData, notes: e.target.value})}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsPromoteModalOpen(false)}>{tr("common", "cancel")}</Button>
                <Button type="submit">Promote Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tr("students", "searchPlaceholder")}
              className="ps-9 rounded-full bg-muted/20 shadow-inner focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b-border/60">
                <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Roll No.
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "studentName")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "fatherName")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "classLabel")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "schoolClass")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "admission")}</TableHead>
                <TableHead className="text-end text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {tr("students", "attendance")}
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow
                    key={student._id || student.id || student.studentId}
                    className="hover:bg-muted/40 transition-colors duration-200"
                  >
                    <TableCell className="font-medium text-muted-foreground text-sm">
                      {student.rollNumber || "—"}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-sm">
                      {getLocalizedStudentName(student, language)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{student.fatherName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted text-foreground hover:bg-muted font-medium border-transparent">
                        {student.studentClass || student.className}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.schoolClassId?.fullName || student.schoolClass || "—"}
                    </TableCell>
                    <TableCell>
                      {student.residential ? (
                        <Badge variant="soft-success">
                          {tr("students", "residential")}
                        </Badge>
                      ) : (
                        <Badge variant="soft">
                          {tr("students", "dayScholar")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatLocalizedDate(student.admissionDate, language)}
                    </TableCell>
                    <TableCell className="text-end">
                      <span
                        className={`font-medium ${student.attendancePercent >= 90 ? "text-green-600" : student.attendancePercent >= 80 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {formatLocalizedPercent(student.attendancePercent ?? 0, language)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">
                              {tr("teachers", "openMenu")}
                            </span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {tr("students", "actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewProfile(student)}>
                            <FileText className="me-2 h-4 w-4" />
                            {tr("students", "viewProfile")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(student)}>
                            <Edit className="me-2 h-4 w-4" />
                            {tr("students", "editDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openPromoteModal(student)}>
                            <Plus className="me-2 h-4 w-4" />
                            Promote
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              handleDelete(student._id || student.id)
                            }
                          >
                            <Trash className="me-2 h-4 w-4" />
                            {tr("students", "deleteRecord")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : !loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {tr("students", "noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t text-xs text-muted-foreground flex justify-between items-center">
          <span>
            {tr("students", "showingCount", {
              count: filteredStudents.length,
              total: students.length,
            })}
          </span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              {tr("students", "previous")}
            </Button>
            <Button variant="outline" size="sm" disabled>
              {tr("students", "next")}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
