import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackButton } from "@/components/ui/BackButton";
import { Search, Plus, MoreVertical, Edit, Trash, FileText, Phone } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedDate, formatLocalizedPercent } from "@/utils/localizationUtils";
import { teacherApi, attendanceApi, classApi, curriculumApi, pdfApi } from "@/lib/api";

export default function Teachers() {
    const { tr, language } = useLanguage();
    const [, setLocation] = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [teacherAttendanceSummary, setTeacherAttendanceSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const [formData, setFormData] = useState({
      name: "",
      fatherName: "",
      dateOfBirth: "",
      subject: "",
      mobile: "",
      salary: "",
      assignedClassIds: [],
      teachingAssignments: [],
      username: "",
      password: "",
      confirmPassword: "",
      isActive: true,
      joiningDate: "",
      deactivationDate: "",
      photo: null,
      address: "",
      city: "",
      district: "",
      state: "",
      pinCode: "",
      whatsapp: "",
      email: "",
      emergencyContact: "",
      designation: "",
      department: "",
      experience: "",
      weeklyPeriods: "",
      isClassTeacher: false,
      classTeacherOf: "",
      remarks: "",
    });

    const [editFormData, setEditFormData] = useState({
      name: "",
      fatherName: "",
      dateOfBirth: "",
      subject: "",
      mobile: "",
      salary: "",
      assignedClassIds: [],
      joiningDate: "",
      deactivationDate: "",
      photo: null,
      address: "",
      city: "",
      district: "",
      state: "",
      pinCode: "",
      whatsapp: "",
      email: "",
      emergencyContact: "",
      designation: "",
      department: "",
      experience: "",
      weeklyPeriods: "",
      isClassTeacher: false,
      classTeacherOf: "",
      remarks: "",
      teachingAssignments: [],
    });

    // CLASS_OPTIONS removed in favor of dynamic apiClasses

    const [isSearching, setIsSearching] = useState(false);
    const [apiClasses, setApiClasses] = useState([]);
    
    useEffect(() => {
      const loadData = async () => {
        try {
          const res = await classApi.getClasses();
          // Filter out inactive classes for new selection
          setApiClasses(res.data?.filter(c => c.status === "active") || []);
        } catch (err) {
          console.error("Failed to fetch classes:", err);
        }
      };
      loadData();
    }, []);

    const loadTeachers = async (isBackground = false) => {
      try {
        if (isBackground) setIsSearching(true);
        else setLoading(true);
        const res = await teacherApi.list();
        setTeachers(res.data || []);
      } catch (err) {
        setTeachers([]);
      } finally {
        if (isBackground) setIsSearching(false);
        else setLoading(false);
      }
    };

    useEffect(() => {
      loadTeachers(false);
    }, []);

    const handleSubmit = async (event) => {
      event.preventDefault();
      setErrorMsg("");
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg(tr("teachers", "passwordsDoNotMatch"));
        return;
      }
      try {
        const payload = new FormData();
        payload.append("name", formData.name);
        payload.append("subject", formData.subject);
        payload.append("mobile", formData.mobile);
        payload.append("salary", Number(formData.salary));
        
        payload.append("teachingAssignments", JSON.stringify(formData.teachingAssignments));
        formData.assignedClassIds.forEach(c => payload.append("assignedClassIds[]", c));
        payload.append("username", formData.username);
        payload.append("password", formData.password);
        payload.append("isActive", formData.isActive);
        payload.append("joiningDate", formData.joiningDate);
        if (formData.address) payload.append("address", formData.address);
        if (formData.city) payload.append("city", formData.city);
        if (formData.district) payload.append("district", formData.district);
        if (formData.state) payload.append("state", formData.state);
        if (formData.pinCode) payload.append("pinCode", formData.pinCode);
        if (formData.whatsapp) payload.append("whatsapp", formData.whatsapp);
        if (formData.email) payload.append("email", formData.email);
        if (formData.emergencyContact) payload.append("emergencyContact", formData.emergencyContact);
        if (formData.fatherName) payload.append("fatherName", formData.fatherName);
        if (formData.dateOfBirth) payload.append("dateOfBirth", formData.dateOfBirth);
        if (formData.designation) payload.append("designation", formData.designation);
        if (formData.department) payload.append("department", formData.department);
        if (formData.experience) payload.append("experience", Number(formData.experience));
        if (formData.weeklyPeriods) payload.append("weeklyPeriods", Number(formData.weeklyPeriods));
        payload.append("isClassTeacher", formData.isClassTeacher);
        if (formData.classTeacherOf) payload.append("classTeacherOf", formData.classTeacherOf);
        if (formData.remarks) payload.append("remarks", formData.remarks);
        if (formData.deactivationDate) payload.append("deactivationDate", formData.deactivationDate);
        if (formData.photo) {
          payload.append("photo", formData.photo);
        }
        
        await teacherApi.createWithFile(payload);
        setIsAddModalOpen(false);
        setFormData({
          name: "", fatherName: "", dateOfBirth: "", subject: "", mobile: "", salary: "", assignedClassIds: [],
          username: "", password: "", confirmPassword: "", isActive: true, joiningDate: "", deactivationDate: "", photo: null,
          designation: "", department: "", experience: "", weeklyPeriods: "", isClassTeacher: false, classTeacherOf: "", remarks: ""
        });
        loadTeachers();
      } catch (error) {
        setErrorMsg(error.message || tr("teachers", "failedToCreateAccount"));
      }
    };

    const openEditModal = (teacher) => {
      setSelectedTeacher(teacher);
      setEditFormData({
        name: teacher.name || "",
        fatherName: teacher.fatherName || "",
        dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toISOString().split('T')[0] : "",
        subject: teacher.subject || "",
        mobile: teacher.mobile || "",
        salary: teacher.salary || "",
        assignedClassIds: teacher.assignedClassIds || [],
        teachingAssignments: teacher.teachingAssignments || [],
        joiningDate: teacher.joiningDate ? new Date(teacher.joiningDate).toISOString().split('T')[0] : "",
        deactivationDate: teacher.deactivationDate ? new Date(teacher.deactivationDate).toISOString().split('T')[0] : "",
        address: teacher.address || "",
        city: teacher.city || "",
        district: teacher.district || "",
        state: teacher.state || "",
        pinCode: teacher.pinCode || "",
        whatsapp: teacher.whatsapp || "",
        email: teacher.email || "",
        emergencyContact: teacher.emergencyContact || "",
        designation: teacher.designation || "",
        department: teacher.department || "",
        experience: teacher.experience || "",
        weeklyPeriods: teacher.weeklyPeriods || "",
        isClassTeacher: teacher.isClassTeacher || false,
        classTeacherOf: teacher.classTeacherOf || "",
        remarks: teacher.remarks || "",
      });
      setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (event) => {
      event.preventDefault();
      try {
        const payload = new FormData();
        payload.append("name", editFormData.name);
        payload.append("subject", editFormData.subject);
        payload.append("mobile", editFormData.mobile);
        payload.append("salary", Number(editFormData.salary));
        
        payload.append("teachingAssignments", JSON.stringify(editFormData.teachingAssignments || []));
        payload.append("joiningDate", editFormData.joiningDate);
        if (editFormData.address !== undefined) payload.append("address", editFormData.address ?? "");
        if (editFormData.city !== undefined) payload.append("city", editFormData.city ?? "");
        if (editFormData.district !== undefined) payload.append("district", editFormData.district ?? "");
        if (editFormData.state !== undefined) payload.append("state", editFormData.state ?? "");
        if (editFormData.pinCode !== undefined) payload.append("pinCode", editFormData.pinCode ?? "");
        if (editFormData.whatsapp) payload.append("whatsapp", editFormData.whatsapp);
        if (editFormData.email) payload.append("email", editFormData.email);
        if (editFormData.emergencyContact) payload.append("emergencyContact", editFormData.emergencyContact);
        if (editFormData.fatherName) payload.append("fatherName", editFormData.fatherName);
        if (editFormData.dateOfBirth) payload.append("dateOfBirth", editFormData.dateOfBirth);
        if (editFormData.designation) payload.append("designation", editFormData.designation);
        if (editFormData.department) payload.append("department", editFormData.department);
        if (editFormData.experience !== "") payload.append("experience", Number(editFormData.experience));
        if (editFormData.weeklyPeriods !== "") payload.append("weeklyPeriods", Number(editFormData.weeklyPeriods));
        payload.append("isClassTeacher", editFormData.isClassTeacher);
        if (editFormData.classTeacherOf) payload.append("classTeacherOf", editFormData.classTeacherOf);
        if (editFormData.remarks) payload.append("remarks", editFormData.remarks);
        if (editFormData.deactivationDate) payload.append("deactivationDate", editFormData.deactivationDate);

        editFormData.assignedClassIds.forEach(c => payload.append("assignedClassIds[]", c));
        if (editFormData.photo) {
          payload.append("photo", editFormData.photo);
        }
        await teacherApi.updateWithFile(selectedTeacher._id || selectedTeacher.id, payload);
        setIsEditModalOpen(false);
        loadTeachers();
      } catch (error) {
        console.error(error);
      }
    };

    const handleDelete = async (id) => {
      const dateStr = window.prompt(tr("teachers", "deactivateDatePrompt") || "Enter effective deactivation date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
      if (dateStr === null) return;
      if (isNaN(new Date(dateStr).getTime())) {
         alert("Invalid date format. Please use YYYY-MM-DD.");
         return;
      }
      if (!confirm(tr("teachers", "deleteTeacherConfirm"))) return;
      try {
        await teacherApi.remove(id, { deactivationDate: dateStr });
        loadTeachers();
      } catch (error) {
        console.error(error);
        alert(error.message || "Failed to deactivate");
      }
    };

    const filteredTeachers = teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          title={tr("teachers", "pageTitle")}
          description={tr("teachers", "pageSubtitle")}
          showBack={true}
          backLabel="Back to Dashboard"
          actions={
            <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0 w-full sm:w-auto">
              <Plus className="me-2 h-4 w-4"/> {tr("teachers", "addTeacher")}
            </Button>
          }
        />
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tr("teachers", "addTeacher")}</DialogTitle>
                <DialogDescription>
                  {tr("teachers", "addTeacherDescription")}
                </DialogDescription>
              </DialogHeader>
              {errorMsg && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{errorMsg}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-2">
                  {/* Personal Information */}
                  <div className="font-semibold text-sm border-b pb-1 text-primary">{tr("teachers", "personalInformation") || "Personal Information"}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">{tr("teachers", "fullName")} *</Label>
                      <Input dir="auto" id="name" required placeholder="Maulana Abdullah" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fatherName">Father Name</Label>
                      <Input dir="auto" id="fatherName" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input dir="ltr" id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mobile">{tr("teachers", "mobileNumber")} *</Label>
                      <Input dir="ltr" id="mobile" required placeholder="03xx-xxxxxxx" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input dir="ltr" id="whatsapp" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input dir="ltr" id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input dir="ltr" id="emergencyContact" value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})}/>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Address Details</div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input dir="auto" id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input dir="auto" id="city" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="district">District</Label>
                      <Input dir="auto" id="district" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input dir="auto" id="state" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pinCode">PIN Code</Label>
                      <Input dir="ltr" id="pinCode" value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})}/>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Employment Details</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input dir="auto" id="designation" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="department">Department</Label>
                      <Input dir="auto" id="department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">{tr("teachers", "primarySubject")} *</Label>
                      <Input dir="auto" id="subject" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="experience">Experience (Years)</Label>
                      <Input dir="ltr" id="experience" type="number" min="0" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="weeklyPeriods">Weekly Periods</Label>
                      <Input dir="ltr" id="weeklyPeriods" type="number" min="0" value={formData.weeklyPeriods} onChange={e => setFormData({...formData, weeklyPeriods: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="salary">{tr("teachers", "salary")} *</Label>
                      <Input dir="ltr" id="salary" required type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="joiningDate">{tr("teachers", "joiningDate")} *</Label>
                      <Input dir="ltr" id="joiningDate" type="date" required value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="isActive">{tr("teachers", "accountStatus")} *</Label>
                      <select id="isActive" value={String(formData.isActive)} onChange={e => setFormData({...formData, isActive: e.target.value === "true"})} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                        <option value="true">{tr("teachers", "active")}</option>
                        <option value="false">{tr("teachers", "inactive")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Teaching Assignments */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Teaching Assignment</div>
                  <div className="grid gap-2 mt-2">
                    <Label>Assign Classes & Subjects</Label>
                    <div className="flex flex-col gap-2 mt-1">
                      {formData.teachingAssignments.map((assignment, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-muted/10 p-2 border rounded-md">
                          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            value={assignment.classId}
                            onChange={(e) => {
                              const newAssignments = [...formData.teachingAssignments];
                              newAssignments[idx].classId = e.target.value;
                              setFormData({ ...formData, teachingAssignments: newAssignments });
                            }}
                          >
                            <option value="">Select Class</option>
                            {apiClasses.map(cls => <option key={cls._id} value={cls._id}>{cls.fullName}</option>)}
                          </select>
                          <Input className="flex-1" placeholder="Subject" value={assignment.subjectId} onChange={(e) => {
                            const newAssignments = [...formData.teachingAssignments];
                            newAssignments[idx].subjectId = e.target.value;
                            setFormData({ ...formData, teachingAssignments: newAssignments });
                          }} />
                          <Button type="button" variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => {
                            setFormData({ ...formData, teachingAssignments: formData.teachingAssignments.filter((_, i) => i !== idx) });
                          }}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="mt-2 w-fit" onClick={() => {
                        setFormData({ ...formData, teachingAssignments: [...formData.teachingAssignments, { classId: "", subjectId: "" }] });
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Assignment
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2 mt-4 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-primary" checked={formData.isClassTeacher} onChange={e => setFormData({...formData, isClassTeacher: e.target.checked})}/>
                      <span className="text-sm font-medium">Is Class Teacher?</span>
                    </label>
                    {formData.isClassTeacher && (
                      <div className="grid gap-2">
                        <Label htmlFor="classTeacherOf">Class Teacher Of</Label>
                        <select id="classTeacherOf" value={formData.classTeacherOf} onChange={e => setFormData({...formData, classTeacherOf: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                          <option value="">Select Class</option>
                          {apiClasses.map(cls => <option key={cls._id} value={cls._id}>{cls.fullName}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Profile & Credentials */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Profile & Login Credentials</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="photo">{tr("teachers", "profilePhoto")}</Label>
                      <Input id="photo" type="file" accept="image/*" onChange={e => setFormData({...formData, photo: e.target.files[0]})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="remarks">Remarks</Label>
                      <Input dir="auto" id="remarks" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="grid gap-2">
                      <Label htmlFor="username">{tr("teachers", "usernameEmail")} *</Label>
                      <Input dir="ltr" id="username" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">{tr("teachers", "password")} *</Label>
                      <Input dir="ltr" id="password" required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">{tr("teachers", "confirmPassword")} *</Label>
                      <Input dir="ltr" id="confirmPassword" required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}/>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6 border-t pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>{tr("teachers", "cancel")}</Button>
                  <Button type="submit">{tr("teachers", "saveTeacher")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{tr("teachers", "editDetails")}</DialogTitle>
                <DialogDescription>
                  {tr("teachers", "editTeacherDescription")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit}>
                <div className="grid gap-4 py-2">
                  {/* Personal Information */}
                  <div className="font-semibold text-sm border-b pb-1 text-primary">{tr("teachers", "personalInformation") || "Personal Information"}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">{tr("teachers", "fullName")} *</Label>
                      <Input dir="auto" id="edit-name" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-fatherName">Father Name</Label>
                      <Input dir="auto" id="edit-fatherName" value={editFormData.fatherName} onChange={e => setEditFormData({...editFormData, fatherName: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                      <Input dir="ltr" id="edit-dateOfBirth" type="date" value={editFormData.dateOfBirth} onChange={e => setEditFormData({...editFormData, dateOfBirth: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-mobile">{tr("teachers", "mobileNumber")} *</Label>
                      <Input dir="ltr" id="edit-mobile" required value={editFormData.mobile} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                      <Input dir="ltr" id="edit-whatsapp" value={editFormData.whatsapp} onChange={e => setEditFormData({...editFormData, whatsapp: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input dir="ltr" id="edit-email" type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                      <Input dir="ltr" id="edit-emergencyContact" value={editFormData.emergencyContact} onChange={e => setEditFormData({...editFormData, emergencyContact: e.target.value})}/>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Address Details</div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input dir="auto" id="edit-address" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-city">City</Label>
                      <Input dir="auto" id="edit-city" value={editFormData.city} onChange={e => setEditFormData({...editFormData, city: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-district">District</Label>
                      <Input dir="auto" id="edit-district" value={editFormData.district} onChange={e => setEditFormData({...editFormData, district: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Input dir="auto" id="edit-state" value={editFormData.state} onChange={e => setEditFormData({...editFormData, state: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-pinCode">PIN Code</Label>
                      <Input dir="ltr" id="edit-pinCode" value={editFormData.pinCode} onChange={e => setEditFormData({...editFormData, pinCode: e.target.value})}/>
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Employment Details</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-designation">Designation</Label>
                      <Input dir="auto" id="edit-designation" value={editFormData.designation} onChange={e => setEditFormData({...editFormData, designation: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-department">Department</Label>
                      <Input dir="auto" id="edit-department" value={editFormData.department} onChange={e => setEditFormData({...editFormData, department: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-subject">{tr("teachers", "primarySubject")} *</Label>
                      <Input dir="auto" id="edit-subject" required value={editFormData.subject} onChange={e => setEditFormData({...editFormData, subject: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-experience">Experience (Years)</Label>
                      <Input dir="ltr" id="edit-experience" type="number" min="0" value={editFormData.experience} onChange={e => setEditFormData({...editFormData, experience: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-weeklyPeriods">Weekly Periods</Label>
                      <Input dir="ltr" id="edit-weeklyPeriods" type="number" min="0" value={editFormData.weeklyPeriods} onChange={e => setEditFormData({...editFormData, weeklyPeriods: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-salary">{tr("teachers", "salary")} *</Label>
                      <Input dir="ltr" id="edit-salary" required type="number" value={editFormData.salary} onChange={e => setEditFormData({...editFormData, salary: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-joiningDate">{tr("teachers", "joiningDate")} *</Label>
                      <Input dir="ltr" id="edit-joiningDate" type="date" required value={editFormData.joiningDate} onChange={e => setEditFormData({...editFormData, joiningDate: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-deactivationDate">Deactivation Date</Label>
                      <Input dir="ltr" id="edit-deactivationDate" type="date" value={editFormData.deactivationDate} onChange={e => setEditFormData({...editFormData, deactivationDate: e.target.value})}/>
                    </div>
                  </div>

                  {/* Teaching Assignments */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Teaching Assignment</div>
                  <div className="grid gap-2 mt-2">
                    <Label>Assign Classes & Subjects</Label>
                    <div className="flex flex-col gap-2 mt-1">
                      {editFormData.teachingAssignments.map((assignment, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-muted/10 p-2 border rounded-md">
                          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            value={assignment.classId}
                            onChange={(e) => {
                              const newAssignments = [...editFormData.teachingAssignments];
                              newAssignments[idx].classId = e.target.value;
                              setEditFormData({ ...editFormData, teachingAssignments: newAssignments });
                            }}
                          >
                            <option value="">Select Class</option>
                            {apiClasses.map(cls => <option key={cls._id} value={cls._id}>{cls.fullName}</option>)}
                          </select>
                          <Input className="flex-1" placeholder="Subject" value={assignment.subjectId} onChange={(e) => {
                            const newAssignments = [...editFormData.teachingAssignments];
                            newAssignments[idx].subjectId = e.target.value;
                            setEditFormData({ ...editFormData, teachingAssignments: newAssignments });
                          }} />
                          <Button type="button" variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => {
                            setEditFormData({ ...editFormData, teachingAssignments: editFormData.teachingAssignments.filter((_, i) => i !== idx) });
                          }}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="mt-2 w-fit" onClick={() => {
                        setEditFormData({ ...editFormData, teachingAssignments: [...editFormData.teachingAssignments, { classId: "", subjectId: "" }] });
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Assignment
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2 mt-4 cursor-pointer">
                      <input type="checkbox" className="rounded border-gray-300 text-primary" checked={editFormData.isClassTeacher} onChange={e => setEditFormData({...editFormData, isClassTeacher: e.target.checked})}/>
                      <span className="text-sm font-medium">Is Class Teacher?</span>
                    </label>
                    {editFormData.isClassTeacher && (
                      <div className="grid gap-2">
                        <Label htmlFor="edit-classTeacherOf">Class Teacher Of</Label>
                        <select id="edit-classTeacherOf" value={editFormData.classTeacherOf} onChange={e => setEditFormData({...editFormData, classTeacherOf: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                          <option value="">Select Class</option>
                          {apiClasses.map(cls => <option key={cls._id} value={cls._id}>{cls.fullName}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Profile & Remarks */}
                  <div className="font-semibold text-sm border-b pb-1 mt-4 text-primary">Profile & Remarks</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-photo">{tr("teachers", "profilePhotoEdit")}</Label>
                      <Input id="edit-photo" type="file" accept="image/*" onChange={e => setEditFormData({...editFormData, photo: e.target.files[0]})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-remarks">Remarks</Label>
                      <Input dir="auto" id="edit-remarks" value={editFormData.remarks} onChange={e => setEditFormData({...editFormData, remarks: e.target.value})}/>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6 border-t pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>{tr("teachers", "cancel")}</Button>
                  <Button type="submit">{tr("teachers", "saveTeacher")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
              <Input placeholder={tr("teachers", "searchPlaceholder")} className="ps-9 rounded-full bg-muted/20 shadow-inner focus-visible:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b-border/60">
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "id")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "name")}</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "designation")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "classes")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subjects</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Teacher Of</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "mobile")}</TableHead>
                  <TableHead className="text-end text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "salaryLabel")}</TableHead>
                  <TableHead className="text-end text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "attendance")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredTeachers.length > 0 ? (filteredTeachers.map((teacher) => (
                  <TableRow key={teacher._id || teacher.id} className="hover:bg-muted/40 transition-colors duration-200">
                      <TableCell className="font-medium text-xs text-muted-foreground font-mono">
                        {(teacher._id || teacher.id).slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-sm">{teacher.name}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {teacher.designation || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-500/15 text-indigo-700 text-xs font-medium border border-transparent">
                          {teacher.assignedClassIds ? teacher.assignedClassIds.length : 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 text-xs font-medium border border-transparent">
                           {teacher.teachingAssignments ? Array.from(new Set(teacher.teachingAssignments.map(a => a.subjectId))).length : 0}
                         </span>
                      </TableCell>
                      <TableCell>
                        {teacher.isClassTeacher && teacher.classTeacherOf ? (
                          <span className="text-sm font-medium">{apiClasses.find(c => c._id === teacher.classTeacherOf)?.fullName || "—"}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 me-1 text-muted-foreground"/>
                          {teacher.mobile}
                        </div>
                      </TableCell>
                      <TableCell className="text-end font-medium text-gray-900">
                        {formatLocalizedNumber(teacher.salary, language)}
                      </TableCell>
                      <TableCell className="text-end">
                        <span className={`font-medium ${teacher.attendancePercent >= 95 ? 'text-green-600' : 'text-amber-600'}`}>
                          {formatLocalizedPercent(teacher.attendancePercent, language)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{tr("teachers", "openMenu")}</span>
                              <MoreVertical className="h-4 w-4"/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{tr("teachers", "actions")}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setLocation(`/teachers/${teacher._id || teacher.id}`)}>
                              <FileText className="me-2 h-4 w-4"/>
                              {tr("teachers", "viewProfile")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(teacher)}>
                              <Edit className="me-2 h-4 w-4"/>
                              {tr("teachers", "editDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(teacher._id || teacher.id)}>
                              <Trash className="me-2 h-4 w-4"/>
                              {tr("teachers", "deleteRecord")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))) : !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState 
                        title={tr("teachers", "noResults")}
                        description={tr("teachers", "noTeachersDesc")}
                        icon={Search}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {tr("common", "loading")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    );
}
