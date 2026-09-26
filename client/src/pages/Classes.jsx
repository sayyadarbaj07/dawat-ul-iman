import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, CheckCircle, XCircle, BookOpen, Trash2, Filter } from "lucide-react";
import ClassSyllabusModal from "@/components/classes/ClassSyllabusModal";
import ClassTeachersModal from "@/components/classes/ClassTeachersModal";
import { Users } from "lucide-react";
import { classApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";

export default function Classes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null);

  // Syllabus Modal State
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isTeachersOpen, setIsTeachersOpen] = useState(false);
  const [selectedClassForTeachers, setSelectedClassForTeachers] = useState(null);
  const [selectedClassForSyllabus, setSelectedClassForSyllabus] = useState(null);

  const [formData, setFormData] = useState({
    department: "",
    name: "",
    fullName: "",
    section: "",
  });

  const [statusFilter, setStatusFilter] = useState("active");

  const { data: classesResponse, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => classApi.getClasses(),
  });

  const allClasses = classesResponse?.data || [];
  const classes = allClasses.filter(c => statusFilter === "all" || c.status === statusFilter);

  const mutation = useMutation({
    mutationFn: (data) =>
      editingClass
        ? classApi.updateClass(editingClass._id, data)
        : classApi.createClass(data),
    onSuccess: (res, id) => {
        queryClient.setQueriesData({ queryKey: ["classes"] }, (oldData) => {
          if (!oldData) return oldData;
          if (oldData.data && Array.isArray(oldData.data)) {
            return { ...oldData, data: oldData.data.filter(item => item._id !== id) };
          } else if (oldData.students) {
            return { ...oldData, students: oldData.students.filter(item => item._id !== id) };
          } else if (oldData.classes) {
            return { ...oldData, classes: oldData.classes.filter(item => item._id !== id) };
          } else if (oldData.teachers) {
            return { ...oldData, teachers: oldData.teachers.filter(item => item._id !== id) };
          } else if (Array.isArray(oldData)) {
            return oldData.filter(item => item._id !== id);
          }
          return oldData;
        });
      setIsModalOpen(false);
      toast({
        title: "Success",
        description: res.message || "Class saved successfully",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save class",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => classApi.updateClassStatus(id, status),
    onSuccess: (res, id) => {
        queryClient.setQueriesData({ queryKey: ["classes"] }, (oldData) => {
          if (!oldData) return oldData;
          if (oldData.data && Array.isArray(oldData.data)) {
            return { ...oldData, data: oldData.data.filter(item => item._id !== id) };
          } else if (oldData.students) {
            return { ...oldData, students: oldData.students.filter(item => item._id !== id) };
          } else if (oldData.classes) {
            return { ...oldData, classes: oldData.classes.filter(item => item._id !== id) };
          } else if (oldData.teachers) {
            return { ...oldData, teachers: oldData.teachers.filter(item => item._id !== id) };
          } else if (Array.isArray(oldData)) {
            return oldData.filter(item => item._id !== id);
          }
          return oldData;
        });
      toast({
        title: "Success",
        description: res.message || "Class status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to update status",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => classApi.deleteClass(id),
    onSuccess: (res, id) => {
        queryClient.setQueriesData({ queryKey: ["classes"] }, (oldData) => {
          if (!oldData) return oldData;
          if (oldData.data && Array.isArray(oldData.data)) {
            return { ...oldData, data: oldData.data.filter(item => item._id !== id) };
          } else if (oldData.students) {
            return { ...oldData, students: oldData.students.filter(item => item._id !== id) };
          } else if (oldData.classes) {
            return { ...oldData, classes: oldData.classes.filter(item => item._id !== id) };
          } else if (oldData.teachers) {
            return { ...oldData, teachers: oldData.teachers.filter(item => item._id !== id) };
          } else if (Array.isArray(oldData)) {
            return oldData.filter(item => item._id !== id);
          }
          return oldData;
        });
      setClassToDelete(null);
      toast({
        title: "Success",
        description: res.message || "Class deleted successfully",
      });
    },
    onError: (error) => {
      let description = error.response?.data?.message || error.message || "Failed to delete class";
      if (error.response?.data?.code === "LEGACY_DEPENDENCY_UNRESOLVED") {
        description = "Deletion is blocked because historical data may still depend on this class. Resolve legacy class mappings before deleting.";
      }
      toast({
        variant: "destructive",
        title: "Error",
        description,
      });
      setClassToDelete(null);
    },
  });

  const handleOpenModal = (cls = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        department: cls.department,
        name: cls.name,
        fullName: cls.fullName,
        section: cls.section || "",
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingClass(null);
    setFormData({
      department: "",
      name: "",
      fullName: "",
      section: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const toggleStatus = (cls) => {
    const newStatus = cls.status === "active" ? "inactive" : "active";
    if (newStatus === "inactive") {
      if (!window.confirm("Are you sure you want to deactivate this class? It will be blocked if there are active students.")) {
        return;
      }
    }
    statusMutation.mutate({ id: cls._id, status: newStatus });
  };

  const handleDelete = (cls) => {
    setClassToDelete(cls);
  };

  const confirmDelete = () => {
    if (classToDelete) {
      deleteMutation.mutate(classToDelete._id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Class Management (Phase 6)"
          description="Manage departments, names, and sections of all classes."
        />
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
              <SelectItem value="all">All Classes</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => handleOpenModal()} className="bg-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Class
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8">
                  Loading classes...
                </TableCell>
              </TableRow>
            ) : classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No classes found.
                </TableCell>
              </TableRow>
            ) : (
              classes.map((cls) => (
                <TableRow key={cls._id}>
                  <TableCell className="font-medium">{cls.fullName}</TableCell>
                  <TableCell className="capitalize">{cls.department}</TableCell>
                  <TableCell className="capitalize">{cls.name}</TableCell>
                  <TableCell className="uppercase">{cls.section || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={cls.status === "active" ? "default" : "destructive"}>
                      {cls.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(cls)}
                        title="Edit Class"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClassForSyllabus(cls);
                          setIsSyllabusOpen(true);
                        }}
                        title="Manage Syllabus"
                        className="hidden sm:inline-flex items-center gap-1"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Syllabus</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClassForTeachers(cls);
                          setIsTeachersOpen(true);
                        }}
                        title="View Teachers"
                        className="hidden sm:inline-flex items-center gap-1"
                      >
                        <Users className="h-4 w-4" />
                        <span>Teachers</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => toggleStatus(cls)}
                        title={cls.status === "active" ? "Deactivate Class" : "Activate Class"}
                      >
                        {cls.status === "active" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(cls)}
                        title="Permanently Delete Class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
              <DialogDescription>
                Note: Updating class details here will not affect legacy string-based class names until migration is complete.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diniyat">Diniyat</SelectItem>
                    <SelectItem value="hifz">Hifz</SelectItem>
                    <SelectItem value="alimiyat">Alimiyat</SelectItem>
                    <SelectItem value="qirat">Qirat</SelectItem>
                    <SelectItem value="arabic">Arabic</SelectItem>
                    <SelectItem value="contemporary">Contemporary</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Class Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Awwal, Duwwam"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Section (Optional)</Label>
                <Input
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g. A, B"
                />
              </div>
              <div className="grid gap-2">
                <Label>Full Display Name *</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Shob-e-Deeniyat - Awwal - A"
                  required
                />
                <p className="text-xs text-muted-foreground">This is the label that will appear in dropdowns across the application.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

            {/* Class Syllabus Modal */}
      {selectedClassForTeachers && (
        <ClassTeachersModal
          open={isTeachersOpen}
          onOpenChange={setIsTeachersOpen}
          classData={selectedClassForTeachers}
        />
      )}
      {selectedClassForSyllabus && (
        <ClassSyllabusModal
          open={isSyllabusOpen}
          onOpenChange={setIsSyllabusOpen}
          classData={selectedClassForSyllabus}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this class and its related class data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
