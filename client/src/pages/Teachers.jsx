import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MoreVertical, Edit, Trash, FileText, Phone } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { teacherApi, attendanceApi } from "@/lib/api";

export default function Teachers() {
    const { tr } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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
      assignedClasses: [],
      username: "",
      password: "",
      confirmPassword: "",
      isActive: true,
    });

    const [editFormData, setEditFormData] = useState({
      name: "",
      subject: "",
      mobile: "",
      salary: "",
      classesAssigned: "",
      assignedClasses: [],
    });

    const CLASS_OPTIONS = [
      { id: "diniyat", label: "Diniyat" },
      { id: "arabic", label: "Arabic" },
      { id: "contemporary", label: "Contemporary" }
    ];

    const loadTeachers = async () => {
      try {
        setLoading(true);
        const res = await teacherApi.list();
        setTeachers(res.data || []);
      } catch (err) {
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadTeachers();
    }, []);

    const handleSubmit = async (event) => {
      event.preventDefault();
      setErrorMsg("");
      if (formData.password !== formData.confirmPassword) {
        setErrorMsg("Passwords do not match!");
        return;
      }
      try {
        await teacherApi.create({
          name: formData.name,
          subject: formData.subject,
          mobile: formData.mobile,
          salary: Number(formData.salary),
          classesAssigned: Number(formData.classesAssigned),
          assignedClasses: formData.assignedClasses,
          username: formData.username,
          password: formData.password,
          isActive: formData.isActive
        });
        setIsAddModalOpen(false);
        setFormData({
          name: "", subject: "", mobile: "", salary: "", classesAssigned: "", assignedClasses: [],
          username: "", password: "", confirmPassword: "", isActive: true
        });
        loadTeachers();
      } catch (error) {
        setErrorMsg(error.message || "Failed to create teacher account");
      }
    };

    const openViewModal = async (teacher) => {
      setSelectedTeacher(teacher);
      setIsViewModalOpen(true);
      setTeacherAttendanceSummary(null);
      try {
        setLoadingSummary(true);
        const res = await attendanceApi.getTeacherSummary(teacher._id || teacher.id);
        if (res.data) {
          setTeacherAttendanceSummary(res.data);
        }
      } catch (error) {
        console.error("Failed to load attendance summary", error);
      } finally {
        setLoadingSummary(false);
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
        assignedClasses: teacher.assignedClasses || [],
      });
      setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (event) => {
      event.preventDefault();
      try {
        await teacherApi.update(selectedTeacher._id || selectedTeacher.id, {
          name: editFormData.name,
          subject: editFormData.subject,
          mobile: editFormData.mobile,
          salary: Number(editFormData.salary),
          classesAssigned: Number(editFormData.classesAssigned),
          assignedClasses: editFormData.assignedClasses,
        });
        setIsEditModalOpen(false);
        loadTeachers();
      } catch (error) {
        console.error(error);
      }
    };

    const handleDelete = async (id) => {
      if (!confirm("Are you sure you want to delete this teacher?")) return;
      try {
        await teacherApi.remove(id);
        loadTeachers();
      } catch (error) {
        console.error(error);
      }
    };

    const filteredTeachers = teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{tr("teachers", "pageTitle")}</h2>
            <p className="text-muted-foreground mt-1">{tr("teachers", "pageSubtitle")}</p>
          </div>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="mr-2 h-4 w-4"/> {tr("teachers", "addTeacher")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tr("teachers", "addTeacher")}</DialogTitle>
                <DialogDescription>
                  Create a new teacher profile and provision their login account.
                </DialogDescription>
              </DialogHeader>
              {errorMsg && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{errorMsg}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-2">
                  <div className="font-semibold text-sm border-b pb-1">Profile Details</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">{tr("teachers", "fullName")}</Label>
                      <Input id="name" required placeholder="Maulana Abdullah" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">{tr("teachers", "primarySubject")}</Label>
                      <Input id="subject" required placeholder="Fiqh" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="mobile">{tr("teachers", "mobileNumber")}</Label>
                      <Input id="mobile" required placeholder="03xx-xxxxxxx" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="salary">{tr("teachers", "salary")}</Label>
                      <Input id="salary" required type="number" placeholder="25000" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="classes">Classes Count (Numeric)</Label>
                    <Input id="classes" required type="number" placeholder="4" value={formData.classesAssigned} onChange={e => setFormData({...formData, classesAssigned: e.target.value})}/>
                  </div>
                  <div className="grid gap-2">
                    <Label>Assign Classes to Teacher</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {CLASS_OPTIONS.map((cls) => (
                        <label key={cls.id} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={formData.assignedClasses.includes(cls.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, assignedClasses: [...formData.assignedClasses, cls.id]});
                              } else {
                                setFormData({...formData, assignedClasses: formData.assignedClasses.filter(c => c !== cls.id)});
                              }
                            }}
                          />
                          <span>{cls.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="font-semibold text-sm border-b pb-1 mt-4">Login Credentials</div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username / Email</Label>
                    <Input id="username" required placeholder="teacher@example.com" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="isActive">Account Status</Label>
                    <select
                      id="isActive"
                      value={String(formData.isActive)}
                      onChange={e => setFormData({...formData, isActive: e.target.value === "true"})}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
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
                  Update the teacher's profile information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit}>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">{tr("teachers", "fullName")}</Label>
                      <Input id="edit-name" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-subject">{tr("teachers", "primarySubject")}</Label>
                      <Input id="edit-subject" required value={editFormData.subject} onChange={e => setEditFormData({...editFormData, subject: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-mobile">{tr("teachers", "mobileNumber")}</Label>
                      <Input id="edit-mobile" required value={editFormData.mobile} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-salary">{tr("teachers", "salary")}</Label>
                      <Input id="edit-salary" required type="number" value={editFormData.salary} onChange={e => setEditFormData({...editFormData, salary: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-classes">Classes Count (Numeric)</Label>
                    <Input id="edit-classes" required type="number" value={editFormData.classesAssigned} onChange={e => setEditFormData({...editFormData, classesAssigned: e.target.value})}/>
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label>Assign Classes to Teacher</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {CLASS_OPTIONS.map((cls) => (
                        <label key={cls.id} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={editFormData.assignedClasses.includes(cls.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFormData({...editFormData, assignedClasses: [...editFormData.assignedClasses, cls.id]});
                              } else {
                                setEditFormData({...editFormData, assignedClasses: editFormData.assignedClasses.filter(c => c !== cls.id)});
                              }
                            }}
                          />
                          <span>{cls.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>{tr("teachers", "cancel")}</Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* View Modal */}
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>{tr("teachers", "viewProfile")}</DialogTitle>
                <DialogDescription>
                  Detailed information for {selectedTeacher?.name}
                </DialogDescription>
              </DialogHeader>
              {selectedTeacher && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/50">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("teachers", "id")}</span>
                      <span className="font-medium text-foreground text-xs font-mono">{(selectedTeacher._id || selectedTeacher.id).slice(-6).toUpperCase()}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username / Email</span>
                      <span className="font-medium text-foreground">{selectedTeacher.userId?.username || "—"}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("teachers", "fullName")}</span>
                      <span className="font-medium text-foreground">{selectedTeacher.name}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("teachers", "primarySubject")}</span>
                      <span className="font-medium text-foreground">{selectedTeacher.subject}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("teachers", "mobileNumber")}</span>
                      <span className="font-medium text-foreground">{selectedTeacher.mobile}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("teachers", "classesAssigned")}</span>
                      <span className="font-medium text-foreground">
                        {selectedTeacher.assignedClasses && selectedTeacher.assignedClasses.length > 0 
                          ? selectedTeacher.assignedClasses.join(", ") 
                          : selectedTeacher.classesAssigned}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("teachers", "salaryLabel")}</span>
                      <span className="font-medium text-foreground">{selectedTeacher.salary.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Attendance Summary Section */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Attendance Summary</h4>
                    {loadingSummary ? (
                      <div className="text-xs text-muted-foreground">Loading summary...</div>
                    ) : teacherAttendanceSummary ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                          <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                            <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Total</div>
                            <div className="font-bold text-lg text-foreground mt-1">{teacherAttendanceSummary.summary?.total || 0}</div>
                          </div>
                          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                            <div className="text-emerald-700 text-[10px] font-semibold uppercase tracking-wider">Present</div>
                            <div className="font-bold text-lg text-emerald-700 mt-1">{teacherAttendanceSummary.summary?.present || 0}</div>
                          </div>
                          <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            <div className="text-red-700 text-[10px] font-semibold uppercase tracking-wider">Absent</div>
                            <div className="font-bold text-lg text-red-700 mt-1">{teacherAttendanceSummary.summary?.absent || 0}</div>
                          </div>
                          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                            <div className="text-amber-700 text-[10px] font-semibold uppercase tracking-wider">Late</div>
                            <div className="font-bold text-lg text-amber-700 mt-1">{teacherAttendanceSummary.summary?.late || 0}</div>
                          </div>
                        </div>
                        
                        {teacherAttendanceSummary.records && teacherAttendanceSummary.records.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-500 mb-2">Recent Records</div>
                            <div className="max-h-32 overflow-y-auto rounded border">
                              <Table>
                                <TableBody>
                                  {teacherAttendanceSummary.records.slice(0, 5).map(record => (
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
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input placeholder={tr("teachers", "searchPlaceholder")} className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
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
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "salaryLabel")}</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("teachers", "attendance")}</TableHead>
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
                          <Phone className="h-3 w-3 mr-1 text-muted-foreground"/>
                          {teacher.mobile}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {teacher.salary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-medium ${teacher.attendancePercent >= 95 ? 'text-green-600' : 'text-amber-600'}`}>
                          {teacher.attendancePercent}%
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
                            <DropdownMenuItem onClick={() => openViewModal(teacher)}>
                              <FileText className="mr-2 h-4 w-4"/>
                              {tr("teachers", "viewProfile")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(teacher)}>
                              <Edit className="mr-2 h-4 w-4"/>
                              {tr("teachers", "editDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(teacher._id || teacher.id)}>
                              <Trash className="mr-2 h-4 w-4"/>
                              {tr("teachers", "deleteRecord")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))) : !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {tr("teachers", "noResults")}
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
        </div>
      </motion.div>
    );
}
