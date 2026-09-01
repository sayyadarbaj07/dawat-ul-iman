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
import { BackButton } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/badge";
import { studentApi, attendanceApi, examApi, financeApi } from "@/lib/api";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash,
  FileText,
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
import { CLASS_TREE } from "@/lib/classTree";

export default function Students() {
  const { tr } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    fatherName: "",
    rollNumber: "",
    schoolClass: "",
    className: "diniyat", // keeping legacy field for backward compatibility
    studentClassCategory: "Shob-e-Deeniyat",
    studentClassSub: "Awwal",
    residential: true,
    dateOfBirth: "",
    photo: null,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [studentAcademicHistory, setStudentAcademicHistory] = useState([]);
  const [loadingAcademicHistory, setLoadingAcademicHistory] = useState(false);
  const [studentFinanceRecords, setStudentFinanceRecords] = useState([]);
  const [loadingFinanceRecords, setLoadingFinanceRecords] = useState(false);
  const [isExportingStudentPDF, setIsExportingStudentPDF] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    fatherName: "",
    rollNumber: "",
    schoolClass: "",
    className: "diniyat",
    studentClassCategory: "Shob-e-Deeniyat",
    studentClassSub: "Awwal",
    residential: true,
    dateOfBirth: "",
    photo: null,
  });

  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteFormData, setPromoteFormData] = useState({
    academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    className: "diniyat",
    studentClassCategory: "Shob-e-Deeniyat",
    studentClassSub: "Awwal",
    schoolClass: "",
    notes: ""
  });

  const [isSearching, setIsSearching] = useState(false);

  const loadStudents = async (term = "", isBackground = false) => {
    try {
      if (isBackground) setIsSearching(true);
      else setLoading(true);
      const res = await studentApi.list({ search: term });
      setStudents(res.data || []);
    } catch (error) {
      setStudents([]);
    } finally {
      if (isBackground) setIsSearching(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents("", false);
  }, []);

  useEffect(() => {
    if (loading) return; // Skip initial render
    const timeout = setTimeout(() => {
      loadStudents(searchTerm, true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      payload.append("name", formData.fullName);
      payload.append("fatherName", formData.fatherName);
      payload.append("rollNumber", formData.rollNumber);
      payload.append("schoolClass", formData.schoolClass);
      payload.append("className", formData.className);
      payload.append("studentClass", `${formData.studentClassCategory} - ${formData.studentClassSub}`);
      payload.append("residential", formData.residential === "true" || formData.residential === true);
      
      if (formData.dateOfBirth) {
        payload.append("dateOfBirth", formData.dateOfBirth);
      }
      if (formData.photo) {
        payload.append("photo", formData.photo);
      }

      await studentApi.createWithFile(payload);
      setIsAddModalOpen(false);
      setFormData({
        fullName: "",
        fatherName: "",
        rollNumber: "",
        schoolClass: "",
        className: "diniyat",
        studentClassCategory: "Shob-e-Deeniyat",
        studentClassSub: "Awwal",
        residential: true,
        dateOfBirth: "",
        photo: null,
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
      fatherName: student.fatherName || "",
      rollNumber: student.rollNumber || "",
      schoolClass: student.schoolClass || "",
      className: student.className || "diniyat",
      studentClassCategory: parsedCategory,
      studentClassSub: parsedSub,
      residential: student.residential ?? true,
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = new FormData();
      payload.append("name", editFormData.name);
      payload.append("fatherName", editFormData.fatherName);
      payload.append("rollNumber", editFormData.rollNumber);
      payload.append("schoolClass", editFormData.schoolClass);
      payload.append("className", editFormData.className);
      payload.append("studentClass", `${editFormData.studentClassCategory} - ${editFormData.studentClassSub}`);
      payload.append("residential", editFormData.residential === "true" || editFormData.residential === true);
      
      if (editFormData.dateOfBirth) {
        payload.append("dateOfBirth", editFormData.dateOfBirth);
      }
      if (editFormData.photo) {
        payload.append("photo", editFormData.photo);
      }

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
      studentClassCategory: "Shob-e-Deeniyat",
      studentClassSub: "Awwal",
      schoolClass: "",
      notes: ""
    });
    setIsPromoteModalOpen(true);
  };

  const handlePromoteSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        toClass: `${promoteFormData.studentClassCategory} - ${promoteFormData.studentClassSub}`,
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

  const openViewModal = async (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
    setStudentAttendanceSummary(null);
    setStudentAcademicHistory([]);
    const studentId = student._id || student.id || student.studentId;
    try {
      setLoadingSummary(true);
      const res = await attendanceApi.getStudentSummary(studentId);
      if (res.data) {
        setStudentAttendanceSummary(res.data);
      }
      setStudentAttendanceSummary(res.data);
    } catch (err) {
      console.error(err);
      setStudentAttendanceSummary(null);
    } finally {
      setLoadingSummary(false);
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

  const loadStudentFinanceRecords = async (studentId) => {
    try {
      setLoadingFinanceRecords(true);
      const res = await financeApi.getStudentFeeRecords(studentId);
      setStudentFinanceRecords(res.data);
    } catch(err) {
      console.error(err);
      setStudentFinanceRecords(null);
    } finally {
      setLoadingFinanceRecords(false);
    }
  };

  const handleViewProfile = (student) => {
    openViewModal(student);
    const id = student._id || student.id || student.studentId;
    if (id) {
      loadStudentAcademicHistory(id);
      loadStudentFinanceRecords(id);
    }
  };

  const exportStudentHistoricalPDF = async (studentId, examId) => {
    setIsExportingStudentPDF(examId);
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/report-card?examId=${examId}`, `Report_Card_${studentId}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export PDF");
    } finally {
      setIsExportingStudentPDF(null);
    }
  };

  const exportFullAcademicHistory = async (studentId) => {
    setIsExportingStudentPDF('full_history');
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/academic-history`, `Academic_History_${studentId}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export full academic history");
    } finally {
      setIsExportingStudentPDF(null);
    }
  };

  const exportYearlyResult = async (studentId, academicYear) => {
    setIsExportingStudentPDF(`yearly_${academicYear}`);
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/yearly-result?academicYear=${academicYear}`, `Yearly_Result_${studentId}_${academicYear}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export yearly result. Ensure exams exist for this year.");
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tr("students", "pageTitle")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {tr("students", "pageSubtitle")}
          </p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> {tr("students", "addStudent")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{tr("students", "addStudent")}</DialogTitle>
              <DialogDescription>
                {tr("students", "addStudentDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{tr("students", "fullName")}</Label>
                  <Input
                    id="name"
                    placeholder="Muhammad Ali"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="father">{tr("students", "fatherName")}</Label>
                  <Input
                    id="father"
                    placeholder="Ahmed Ali"
                    value={formData.fatherName}
                    onChange={(e) =>
                      setFormData({ ...formData, fatherName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={formData.studentClassCategory}
                    onChange={(e) => {
                      const category = e.target.value;
                      setFormData({ 
                        ...formData, 
                        studentClassCategory: category,
                        studentClassSub: CLASS_TREE[category][0]
                      });
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.keys(CLASS_TREE).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subClass">Class / Grade</Label>
                  <select
                    id="subClass"
                    value={formData.studentClassSub}
                    onChange={(e) =>
                      setFormData({ ...formData, studentClassSub: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CLASS_TREE[formData.studentClassCategory]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="schoolClass">School Class (Optional)</Label>
                  <Input
                    id="schoolClass"
                    placeholder="e.g. 5th Grade, Matric"
                    value={formData.schoolClass}
                    onChange={(e) =>
                      setFormData({ ...formData, schoolClass: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="residential">
                    {tr("students", "status")}
                  </Label>
                  <select
                    id="residential"
                    value={String(formData.residential)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        residential: e.target.value === "true",
                      })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="true">
                      {tr("students", "residential")}
                    </option>
                    <option value="false">
                      {tr("students", "dayScholar")}
                    </option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    placeholder="1, 2, 3..."
                    value={formData.rollNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, rollNumber: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dob">{tr("students", "dateOfBirth")}</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {tr("students", "cancel")}
                </Button>
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
                Update the student's information below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">{tr("students", "fullName")}</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-father">{tr("students", "fatherName")}</Label>
                  <Input
                    id="edit-father"
                    value={editFormData.fatherName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, fatherName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <select
                    id="edit-department"
                    value={editFormData.studentClassCategory}
                    onChange={(e) => {
                      const category = e.target.value;
                      setEditFormData({ 
                        ...editFormData, 
                        studentClassCategory: category,
                        studentClassSub: CLASS_TREE[category][0]
                      });
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.keys(CLASS_TREE).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-subClass">Class / Grade</Label>
                  <select
                    id="edit-subClass"
                    value={editFormData.studentClassSub}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, studentClassSub: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CLASS_TREE[editFormData.studentClassCategory]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-schoolClass">School Class (Optional)</Label>
                  <Input
                    id="edit-schoolClass"
                    placeholder="e.g. 5th Grade, Matric"
                    value={editFormData.schoolClass}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, schoolClass: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-residential">
                    {tr("students", "status")}
                  </Label>
                  <select
                    id="edit-residential"
                    value={String(editFormData.residential)}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        residential: e.target.value === "true",
                      })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="true">{tr("students", "residential")}</option>
                    <option value="false">{tr("students", "dayScholar")}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-rollNumber">Roll Number</Label>
                  <Input
                    id="edit-rollNumber"
                    placeholder="1, 2, 3..."
                    value={editFormData.rollNumber}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, rollNumber: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-dob">{tr("students", "dateOfBirth")}</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editFormData.dateOfBirth}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  {tr("students", "cancel")}
                </Button>
                <Button type="submit">Save Changes</Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="promote-department">New Department</Label>
                  <select
                    id="promote-department"
                    value={promoteFormData.studentClassCategory}
                    onChange={(e) => {
                      const category = e.target.value;
                      setPromoteFormData({ 
                        ...promoteFormData, 
                        studentClassCategory: category,
                        studentClassSub: CLASS_TREE[category][0]
                      });
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.keys(CLASS_TREE).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promote-subClass">New Class / Grade</Label>
                  <select
                    id="promote-subClass"
                    value={promoteFormData.studentClassSub}
                    onChange={(e) =>
                      setPromoteFormData({ ...promoteFormData, studentClassSub: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CLASS_TREE[promoteFormData.studentClassCategory]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
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
                <Button variant="outline" type="button" onClick={() => setIsPromoteModalOpen(false)}>Cancel</Button>
                <Button type="submit">Promote Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{tr("students", "viewProfile")}</DialogTitle>
              <DialogDescription>
                Detailed information for {selectedStudent?.fullName || selectedStudent?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto">
                {selectedStudent.photo && (
                  <div className="flex justify-center mb-4">
                    <img src={`http://localhost:5000${selectedStudent.photo}`} alt={selectedStudent.fullName || selectedStudent.name} className="h-24 w-24 rounded-full object-cover border" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll Number</span>
                    <span className="font-medium text-foreground">{selectedStudent.rollNumber || "—"}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System ID</span>
                    <span className="font-medium text-foreground text-xs font-mono">{selectedStudent.studentId || selectedStudent.id}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("students", "fullName")}</span>
                    <span className="font-medium text-foreground">{selectedStudent.fullName || selectedStudent.name}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("students", "fatherName")}</span>
                    <span className="font-medium text-foreground">{selectedStudent.fatherName}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("students", "departmentClass")}</span>
                    <span className="font-medium text-foreground capitalize">{selectedStudent.studentClass || selectedStudent.className}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">School Class</span>
                    <span className="font-medium text-foreground">{selectedStudent.schoolClass || "—"}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("students", "status")}</span>
                    <span className="font-medium text-foreground">{selectedStudent.residential ? tr("students", "residential") : tr("students", "dayScholar")}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("students", "admission")}</span>
                    <span className="font-medium text-foreground">{selectedStudent.admissionDate ? new Date(selectedStudent.admissionDate).toLocaleDateString() : "—"}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("students", "dateOfBirth")}</span>
                    <span className="font-medium text-foreground">{selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : "—"}</span>
                  </div>
                </div>

                {/* Promotion History Section */}
                {selectedStudent.promotionHistory && selectedStudent.promotionHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Promotion History</h4>
                    <div className="max-h-40 overflow-y-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-medium">Date</TableHead>
                            <TableHead className="text-xs font-medium">Year</TableHead>
                            <TableHead className="text-xs font-medium">From</TableHead>
                            <TableHead className="text-xs font-medium">To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedStudent.promotionHistory.map((hist, i) => (
                            <TableRow key={i}>
                              <TableCell className="py-2 text-xs">{new Date(hist.date).toLocaleDateString()}</TableCell>
                              <TableCell className="py-2 text-xs">{hist.academicYear}</TableCell>
                              <TableCell className="py-2 text-xs text-muted-foreground">{hist.fromClass}</TableCell>
                              <TableCell className="py-2 text-xs font-medium">{hist.toClass}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Attendance Summary Section */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Attendance Summary</h4>
                  {loadingSummary ? (
                    <div className="text-xs text-muted-foreground">Loading summary...</div>
                  ) : studentAttendanceSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                        <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                          <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Total</div>
                          <div className="font-bold text-lg text-foreground mt-1">{studentAttendanceSummary.summary?.total || 0}</div>
                        </div>
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          <div className="text-emerald-700 text-[10px] font-semibold uppercase tracking-wider">Present</div>
                          <div className="font-bold text-lg text-emerald-700 mt-1">{studentAttendanceSummary.summary?.present || 0}</div>
                        </div>
                        <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                          <div className="text-red-700 text-[10px] font-semibold uppercase tracking-wider">Absent</div>
                          <div className="font-bold text-lg text-red-700 mt-1">{studentAttendanceSummary.summary?.absent || 0}</div>
                        </div>
                        <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                          <div className="text-amber-700 text-[10px] font-semibold uppercase tracking-wider">Late</div>
                          <div className="font-bold text-lg text-amber-700 mt-1">{studentAttendanceSummary.summary?.late || 0}</div>
                        </div>
                      </div>
                      
                      {studentAttendanceSummary.records && studentAttendanceSummary.records.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-500 mb-2">Recent Records</div>
                          <div className="max-h-32 overflow-y-auto rounded border">
                            <Table>
                              <TableBody>
                                {studentAttendanceSummary.records.slice(0, 5).map(record => (
                                  <TableRow key={record._id}>
                                    <TableCell className="py-1 text-xs">{new Date(record.date).toLocaleDateString()}</TableCell>
                                    <TableCell className="py-1 text-xs text-right">
                                      <span className={`px-2 py-0.5 rounded-full ${record.status === 'Present' ? 'bg-green-100 text-green-700' : record.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {record.status}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No attendance records found.</div>
                  )}
                </div>

                {/* Finance Summary Section */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Finance & Fees</h4>
                  {loadingFinanceRecords ? (
                    <div className="text-xs text-muted-foreground">Loading finance records...</div>
                  ) : studentFinanceRecords && studentFinanceRecords.length > 0 ? (
                    <div className="space-y-4">
                      <div className="max-h-40 overflow-y-auto rounded border">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="text-xs font-medium">Year</TableHead>
                              <TableHead className="text-xs font-medium">Class</TableHead>
                              <TableHead className="text-xs font-medium text-right">Total Fee</TableHead>
                              <TableHead className="text-xs font-medium text-right">Paid</TableHead>
                              <TableHead className="text-xs font-medium text-right">Pending</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentFinanceRecords.map((record, i) => (
                              <TableRow key={i}>
                                <TableCell className="py-2 text-xs">{record.academicYear}</TableCell>
                                <TableCell className="py-2 text-xs">{record.className}</TableCell>
                                <TableCell className="py-2 text-xs text-right font-medium">Rs {record.totalFee.toLocaleString()}</TableCell>
                                <TableCell className="py-2 text-xs text-right text-green-600">Rs {record.paid.toLocaleString()}</TableCell>
                                <TableCell className="py-2 text-xs text-right text-red-600">Rs {record.pending.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No fee records found for this student.</div>
                  )}
                </div>

                {/* Academic History Section */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold">Academic History</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => exportFullAcademicHistory(selectedStudent._id || selectedStudent.id || selectedStudent.studentId)}
                      disabled={isExportingStudentPDF === 'full_history'}
                    >
                      {isExportingStudentPDF === 'full_history' ? "Downloading..." : "Export Full History PDF"}
                    </Button>
                  </div>
                  {loadingAcademicHistory ? (
                    <div className="text-xs text-muted-foreground">Loading academic history...</div>
                  ) : studentAcademicHistory && studentAcademicHistory.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto rounded border">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="text-xs font-medium">Year</TableHead>
                            <TableHead className="text-xs font-medium">Class</TableHead>
                            <TableHead className="text-xs font-medium">Exam</TableHead>
                            <TableHead className="text-xs font-medium">%</TableHead>
                            <TableHead className="text-xs font-medium">Grade</TableHead>
                            <TableHead className="text-xs font-medium">Result</TableHead>
                            <TableHead className="text-right text-xs font-medium">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentAcademicHistory.map((hist, i) => (
                            <TableRow key={i}>
                              <TableCell className="py-2 text-xs font-medium">
                                {hist.academicYear}
                                <div className="mt-1">
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="h-4 p-0 text-[10px]"
                                    onClick={() => exportYearlyResult(selectedStudent._id || selectedStudent.id || selectedStudent.studentId, hist.academicYear)}
                                    disabled={isExportingStudentPDF === `yearly_${hist.academicYear}`}
                                  >
                                    Yearly PDF
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs">{hist.className}</TableCell>
                              <TableCell className="py-2 text-xs">
                                <div>{hist.examName}</div>
                                <div className="text-[10px] text-muted-foreground">{hist.examType}</div>
                              </TableCell>
                              <TableCell className="py-2 text-xs font-semibold">{hist.percentage}%</TableCell>
                              <TableCell className="py-2 text-xs font-bold">{hist.grade}</TableCell>
                              <TableCell className="py-2 text-xs">
                                <span className={hist.status === 'Pass' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {hist.status}
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs px-2"
                                  onClick={() => exportStudentHistoricalPDF(selectedStudent._id || selectedStudent.id || selectedStudent.studentId, hist.examId)}
                                  disabled={isExportingStudentPDF === hist.examId}
                                >
                                  {isExportingStudentPDF === hist.examId ? "Wait..." : "PDF"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No academic history found.</div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="sm:justify-start">
              <BackButton onClick={() => setIsViewModalOpen(false)} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tr("students", "searchPlaceholder")}
              className="pl-9 rounded-full bg-muted/20 shadow-inner focus-visible:ring-primary/20"
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
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">School Class</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "status")}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "admission")}</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                      {student.fullName || student.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{student.fatherName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted text-foreground hover:bg-muted font-medium border-transparent">
                        {student.studentClass || student.className}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {student.schoolClass || "—"}
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
                      {student.admissionDate
                        ? new Date(student.admissionDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${student.attendancePercent >= 90 ? "text-green-600" : student.attendancePercent >= 80 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {student.attendancePercent ?? 0}%
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
                          <DropdownMenuItem onClick={() => openViewModal(student)}>
                            <FileText className="mr-2 h-4 w-4" />
                            {tr("students", "viewProfile")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(student)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {tr("students", "editDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openPromoteModal(student)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Promote
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              handleDelete(student._id || student.id)
                            }
                          >
                            <Trash className="mr-2 h-4 w-4" />
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
