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
import { Badge } from "@/components/ui/badge";
import { studentApi, attendanceApi } from "@/lib/api";
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
    className: "diniyat",
    residential: true,
    dateOfBirth: "",
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    fatherName: "",
    rollNumber: "",
    className: "diniyat",
    residential: true,
    dateOfBirth: "",
  });

  const loadStudents = async (term = "") => {
    try {
      setLoading(true);
      const res = await studentApi.list({ search: term });
      setStudents(res.data || []);
    } catch (error) {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadStudents(searchTerm);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: formData.fullName,
        fatherName: formData.fatherName,
        rollNumber: formData.rollNumber,
        className: formData.className,
        residential: formData.residential === "true" || formData.residential === true,
      };
      
      if (formData.dateOfBirth) {
        payload.dateOfBirth = formData.dateOfBirth;
      }

      await studentApi.create(payload);
      setIsAddModalOpen(false);
      setFormData({
        fullName: "",
        fatherName: "",
        rollNumber: "",
        className: "diniyat",
        residential: true,
        dateOfBirth: "",
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
    setEditFormData({
      name: student.fullName || student.name || "",
      fatherName: student.fatherName || "",
      rollNumber: student.rollNumber || "",
      className: student.className || "diniyat",
      residential: student.residential ?? true,
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: editFormData.name,
        fatherName: editFormData.fatherName,
        rollNumber: editFormData.rollNumber,
        className: editFormData.className,
        residential: editFormData.residential === "true" || editFormData.residential === true,
      };
      if (editFormData.dateOfBirth) {
        payload.dateOfBirth = editFormData.dateOfBirth;
      }
      const id = selectedStudent._id || selectedStudent.id || selectedStudent.studentId;
      await studentApi.update(id, payload);
      setIsEditModalOpen(false);
      loadStudents(searchTerm);
    } catch (error) {
      console.error(error);
    }
  };

  const openViewModal = async (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
    setStudentAttendanceSummary(null);
    try {
      setLoadingSummary(true);
      const res = await attendanceApi.getStudentSummary(student._id || student.id || student.studentId);
      if (res.data) {
        setStudentAttendanceSummary(res.data);
      }
    } catch (error) {
      console.error("Failed to load attendance summary", error);
    } finally {
      setLoadingSummary(false);
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="class">
                    {tr("students", "departmentClass")}
                  </Label>
                  <select
                    id="class"
                    value={formData.className}
                    onChange={(e) =>
                      setFormData({ ...formData, className: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="diniyat">Diniyat (dinyat)</option>
                    <option value="arabic">Arabic (arabi)</option>
                    <option value="contemporary">Contemporary</option>
                  </select>
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-class">
                    {tr("students", "departmentClass")}
                  </Label>
                  <select
                    id="edit-class"
                    value={editFormData.className}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, className: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="diniyat">Diniyat (dinyat)</option>
                    <option value="arabic">Arabic (arabi)</option>
                    <option value="contemporary">Contemporary</option>
                  </select>
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-semibold">Roll Number:</div>
                  <div>{selectedStudent.rollNumber || "—"}</div>
                  
                  <div className="font-semibold">System ID:</div>
                  <div className="text-muted-foreground text-xs">{selectedStudent.studentId || selectedStudent.id}</div>
                  
                  <div className="font-semibold">{tr("students", "fullName")}:</div>
                  <div>{selectedStudent.fullName || selectedStudent.name}</div>
                  
                  <div className="font-semibold">{tr("students", "fatherName")}:</div>
                  <div>{selectedStudent.fatherName}</div>
                  
                  <div className="font-semibold">{tr("students", "departmentClass")}:</div>
                  <div className="capitalize">{selectedStudent.className}</div>
                  
                  <div className="font-semibold">{tr("students", "status")}:</div>
                  <div>{selectedStudent.residential ? tr("students", "residential") : tr("students", "dayScholar")}</div>
                  
                  <div className="font-semibold">{tr("students", "admission")}:</div>
                  <div>{selectedStudent.admissionDate ? new Date(selectedStudent.admissionDate).toLocaleDateString() : "—"}</div>
                  
                  <div className="font-semibold">{tr("students", "dateOfBirth")}:</div>
                  <div>{selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : "—"}</div>
                  
                  <div className="font-semibold">{tr("students", "attendance")}:</div>
                  <div>{selectedStudent.attendancePercent ?? 0}%</div>
                </div>

                {/* Attendance Summary Section */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Attendance Summary</h4>
                  {loadingSummary ? (
                    <div className="text-xs text-muted-foreground">Loading summary...</div>
                  ) : studentAttendanceSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div className="bg-gray-50 p-2 rounded border">
                          <div className="text-gray-500 text-xs">Total</div>
                          <div className="font-bold">{studentAttendanceSummary.summary?.total || 0}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded border border-green-100">
                          <div className="text-green-600 text-xs">Present</div>
                          <div className="font-bold text-green-700">{studentAttendanceSummary.summary?.present || 0}</div>
                        </div>
                        <div className="bg-red-50 p-2 rounded border border-red-100">
                          <div className="text-red-600 text-xs">Absent</div>
                          <div className="font-bold text-red-700">{studentAttendanceSummary.summary?.absent || 0}</div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded border border-amber-100">
                          <div className="text-amber-600 text-xs">Late</div>
                          <div className="font-bold text-amber-700">{studentAttendanceSummary.summary?.late || 0}</div>
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
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tr("students", "searchPlaceholder")}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  Roll No.
                </TableHead>
                <TableHead>{tr("students", "studentName")}</TableHead>
                <TableHead>{tr("students", "fatherName")}</TableHead>
                <TableHead>{tr("students", "classLabel")}</TableHead>
                <TableHead>{tr("students", "status")}</TableHead>
                <TableHead>{tr("students", "admission")}</TableHead>
                <TableHead className="text-right">
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
                  >
                    <TableCell className="font-medium text-foreground">
                      {student.rollNumber || "—"}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {student.fullName || student.name}
                    </TableCell>
                    <TableCell>{student.fatherName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-50">
                        {student.className}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.residential ? (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent">
                          {tr("students", "residential")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-gray-500 border-gray-200"
                        >
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
