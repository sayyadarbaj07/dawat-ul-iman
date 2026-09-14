import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { curriculumApi, teacherApi } from "@/lib/api";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClassSyllabusModal({ open, onOpenChange, classData }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState(null);

  // Default form state
  const initialForm = {
    academicYear: "2026-27",
    subject: "",
    book: "",
    teacherId: "",
    totalLessons: 0,
    annualTarget: 0,
    firstHalfTarget: 0,
    secondHalfTarget: 0,
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch Curriculum for this class
  const { data: currRes, isLoading: currLoading } = useQuery({
    queryKey: ["curriculums", classData?._id],
    queryFn: () => curriculumApi.list({ classId: classData?._id }),
    enabled: !!classData?._id && open,
  });
  
  // Fetch Teachers for assignment
  const { data: teachersRes, isLoading: teachersLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.list(),
    enabled: open,
  });

  const curriculums = currRes?.data || [];
  const allTeachers = teachersRes?.data || [];
  
  // Filter active teachers assigned to this specific class
  const classIdString = String(classData?._id);
  const teachers = allTeachers.filter(t => 
    t.status === "active" && 
    t.assignedClassIds && 
    t.assignedClassIds.some(id => String(id) === classIdString)
  );

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, teacherId: data.teacherId === "unassigned" ? null : data.teacherId };
      return editingCurriculum
        ? curriculumApi.update(editingCurriculum._id, payload)
        : curriculumApi.create({ ...payload, classId: classData._id, department: classData.department });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["curriculums", classData?._id]);
      toast({ title: "Success", description: res.message });
      resetForm();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save curriculum" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => curriculumApi.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["curriculums", classData?._id]);
      toast({ title: "Deactivated", description: res.message });
    },
  });

  const resetForm = () => {
    setEditingCurriculum(null);
    setFormData(initialForm);
    setShowForm(false);
  };

  const handleEdit = (curr) => {
    setEditingCurriculum(curr);
    setFormData({
      academicYear: curr.academicYear || "",
      subject: curr.subject || "",
      book: curr.book || "",
      teacherId: curr.teacherId?._id || curr.teacherId || "",
      totalLessons: curr.totalLessons || 0,
      annualTarget: curr.annualTarget || 0,
      firstHalfTarget: curr.firstHalfTarget || 0,
      secondHalfTarget: curr.secondHalfTarget || 0,
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Syllabus: {classData?.fullName}</DialogTitle>
          <DialogDescription>
            Central Curriculum Assignments for this class.
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Active Assignments</h3>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Assign Syllabus
              </Button>
            </div>

            {currLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : curriculums.length === 0 ? (
              <div className="text-center p-8 border rounded-md text-muted-foreground">No syllabus assigned to this class yet.</div>
            ) : (
              <div className="border rounded-md divide-y">
                {curriculums.map(curr => (
                  <div key={curr._id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg flex items-center gap-2">
                        {curr.subject}
                        {!curr.isActive && <Badge variant="destructive">Inactive</Badge>}
                        {curr.isActive && <Badge variant={curr.status === "On Track" ? "default" : "secondary"}>{curr.status}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Book: {curr.book} | Academic Year: {curr.academicYear || "Legacy"}
                      </div>
                      <div className="text-sm mt-1">
                        Assigned Teacher: {curr.teacherId?.name || "Unassigned"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Total Lessons: {curr.totalLessons} | Annual Target: {curr.annualTarget} | Completed: {curr.completedLessonsList?.length || 0}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(curr)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {curr.isActive && (
                        <Button variant="destructive" size="sm" onClick={() => deactivateMutation.mutate(curr._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Academic Year *</Label>
                <Input value={formData.academicYear} onChange={e => setFormData({ ...formData, academicYear: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Subject *</Label>
                <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Book / Syllabus Name *</Label>
                <Input value={formData.book} onChange={e => setFormData({ ...formData, book: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Assign Teacher</Label>
                <Select value={formData.teacherId || "unassigned"} onValueChange={val => setFormData({ ...formData, teacherId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      {teachers.length === 0 ? "No teacher assigned to this class" : "Unassigned"}
                    </SelectItem>
                    {teachers.map(t => (
                      <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Total Lessons / Units</Label>
                <Input type="number" value={formData.totalLessons} onChange={e => setFormData({ ...formData, totalLessons: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Annual Target (Lessons)</Label>
                <Input type="number" value={formData.annualTarget} onChange={e => setFormData({ ...formData, annualTarget: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>First Half Target</Label>
                <Input type="number" value={formData.firstHalfTarget} onChange={e => setFormData({ ...formData, firstHalfTarget: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Second Half Target</Label>
                <Input type="number" value={formData.secondHalfTarget} onChange={e => setFormData({ ...formData, secondHalfTarget: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Assignment"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
