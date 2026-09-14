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
      subject: "",
      mobile: "",
      salary: "",
      classesAssigned: "",
      assignedClassIds: [],
      teachingAssignments: [],
      username: "",
      password: "",
      confirmPassword: "",
      isActive: true,
      joiningDate: "",
      photo: null,
    });

    const [editFormData, setEditFormData] = useState({
      name: "",
      subject: "",
      mobile: "",
      salary: "",
      classesAssigned: "",
      assignedClassIds: [],
      joiningDate: "",
      photo: null,
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
        payload.append("classesAssigned", Number(formData.classesAssigned));
        payload.append("teachingAssignments", JSON.stringify(formData.teachingAssignments));
        formData.assignedClassIds.forEach(c => payload.append("assignedClassIds[]", c));
        payload.append("username", formData.username);
        payload.append("password", formData.password);
        payload.append("isActive", formData.isActive);
        payload.append("joiningDate", formData.joiningDate);
        if (formData.photo) {
          payload.append("photo", formData.photo);
        }
        
        await teacherApi.createWithFile(payload);
        setIsAddModalOpen(false);
        setFormData({
          name: "", subject: "", mobile: "", salary: "", classesAssigned: "", assignedClassIds: [],
          username: "", password: "", confirmPassword: "", isActive: true, joiningDate: "", photo: null
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
        subject: teacher.subject || "",
        mobile: teacher.mobile || "",
        salary: teacher.salary || "",
        classesAssigned: teacher.classesAssigned || "",
        assignedClassIds: teacher.assignedClassIds || [],
        teachingAssignments: teacher.teachingAssignments || [],
        joiningDate: teacher.joiningDate ? new Date(teacher.joiningDate).toISOString().split('T')[0] : "",
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
        payload.append("classesAssigned", Number(editFormData.classesAssigned));
        payload.append("teachingAssignments", JSON.stringify(editFormData.teachingAssignments));
        payload.append("joiningDate", editFormData.joiningDate);
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
                  <div className="font-semibold text-sm border-b pb-1">{tr("teachers", "profileDetails")}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">{tr("teachers", "fullName")}</Label>
                      <Input dir="auto" id="name" required placeholder="Maulana Abdullah" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">{tr("teachers", "primarySubject")}</Label>
                      <Input dir="auto" id="subject" required placeholder="Fiqh" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="mobile">{tr("teachers", "mobileNumber")}</Label>
                      <Input dir="ltr" id="mobile" required placeholder="03xx-xxxxxxx" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="salary">{tr("teachers", "salary")}</Label>
                      <Input dir="ltr" id="salary" required type="number" placeholder="25000" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="joiningDate">{tr("teachers", "joiningDate") || "Joining Date"}</Label>
                      <Input dir="ltr" id="joiningDate" type="date" required value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="classes">{tr("teachers", "classesCount")}</Label>
                      <Input dir="ltr" id="classes" required type="number" placeholder="4" value={formData.classesAssigned} onChange={e => setFormData({...formData, classesAssigned: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label>{tr("teachers", "assignClasses")}</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {apiClasses.map((cls) => (
                        <label key={cls._id} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={formData.assignedClassIds.includes(cls._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, assignedClassIds: [...formData.assignedClassIds, cls._id]});
                              } else {
                                setFormData({...formData, assignedClassIds: formData.assignedClassIds.filter(c => c !== cls._id)});
                              }
                            }}
                          />
                          <span>{cls.fullName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="photo">{tr("teachers", "profilePhoto")}</Label>
                    <Input id="photo" type="file" accept="image/*" onChange={e => setFormData({...formData, photo: e.target.files[0]})} />
                  </div>

                  <div className="font-semibold text-sm border-b pb-1 mt-4">{tr("teachers", "loginCredentials")}</div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">{tr("teachers", "usernameEmail")}</Label>
                    <Input dir="ltr" id="username" required placeholder="teacher@example.com" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="password">{tr("teachers", "password")}</Label>
                      <Input dir="ltr" id="password" required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">{tr("teachers", "confirmPassword")}</Label>
                      <Input dir="ltr" id="confirmPassword" required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="isActive">{tr("teachers", "accountStatus")}</Label>
                    <select
                      id="isActive"
                      value={String(formData.isActive)}
                      onChange={e => setFormData({...formData, isActive: e.target.value === "true"})}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="true">{tr("teachers", "active")}</option>
                      <option value="false">{tr("teachers", "inactive")}</option>
                    </select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">{tr("teachers", "fullName")}</Label>
                      <Input dir="auto" id="edit-name" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-subject">{tr("teachers", "primarySubject")}</Label>
                      <Input dir="auto" id="edit-subject" required value={editFormData.subject} onChange={e => setEditFormData({...editFormData, subject: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-mobile">{tr("teachers", "mobileNumber")}</Label>
                      <Input dir="ltr" id="edit-mobile" required value={editFormData.mobile} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-salary">{tr("teachers", "salary")}</Label>
                      <Input dir="ltr" id="edit-salary" required type="number" value={editFormData.salary} onChange={e => setEditFormData({...editFormData, salary: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-joiningDate">{tr("teachers", "joiningDate") || "Joining Date"}</Label>
                      <Input dir="ltr" id="edit-joiningDate" type="date" required value={editFormData.joiningDate} onChange={e => setEditFormData({...editFormData, joiningDate: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-classes">{tr("teachers", "classesCount")}</Label>
                      <Input dir="ltr" id="edit-classes" required type="number" value={editFormData.classesAssigned} onChange={e => setEditFormData({...editFormData, classesAssigned: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label>{tr("teachers", "assignClasses")}</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {apiClasses.map((cls) => (
                        <label key={cls._id} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={editFormData.assignedClassIds.includes(cls._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFormData({...editFormData, assignedClassIds: [...editFormData.assignedClassIds, cls._id]});
                              } else {
                                setEditFormData({...editFormData, assignedClassIds: editFormData.assignedClassIds.filter(c => c !== cls._id)});
                              }
                            }}
                          />
                          <span>{cls.fullName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="edit-photo">{tr("teachers", "profilePhotoEdit")}</Label>
                    <Input id="edit-photo" type="file" accept="image/*" onChange={e => setEditFormData({...editFormData, photo: e.target.files[0]})} />
                  </div>
                </div>
                <DialogFooter className="mt-6">
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
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "primarySubject")}</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "classes")}</TableHead>
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
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 text-xs font-medium border border-transparent">
                          {teacher.subject}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{teacher.classesAssigned}</TableCell>
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
