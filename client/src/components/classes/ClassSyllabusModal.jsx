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
import { Loader2, Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

export default function ClassSyllabusModal({ open, onOpenChange, classData }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, tr, language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Default form state
  const initialForm = {
    academicYear: "2026-27",
    subject: "",
    book: "",
    teacherId: "unassigned",
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
  const { data: teachersRes, isLoading: teachersLoading, error: teachersError } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.list(),
    enabled: open,
  });

  const curriculums = currRes?.data || [];
  const activeCurriculums = curriculums.filter(c => c.isActive);
  const inactiveCurriculums = curriculums.filter(c => !c.isActive);
  const allTeachers = teachersRes?.data || [];
  
  // Available teachers (active, or already assigned to this syllabus)
  const teachers = allTeachers.filter(t => 
    t.status === "active" || t._id === formData.teacherId || t.id === formData.teacherId
  );

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, teacherId: (!data.teacherId || data.teacherId === "unassigned") ? null : data.teacherId };
      return editingCurriculum
        ? curriculumApi.update(editingCurriculum._id, payload)
        : curriculumApi.create({ ...payload, classId: classData._id, department: classData.department });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["curriculums", classData?._id] });
      toast({ title: t("success"), description: res.message });
      resetForm();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("error"), description: error.message || tr("syllabus", "failedToSave") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => curriculumApi.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["curriculums", classData?._id] });
      toast({ title: tr("syllabus", "deleted") || "Deleted", description: res.message });
    },
  });

  const resetForm = () => {
    setEditingCurriculum(null);
    setFormData(initialForm);
    setShowForm(false);
    setShowAdvanced(false);
  };

  const handleEdit = (curr) => {
    setEditingCurriculum(curr);
    setFormData({
      academicYear: curr.academicYear || "",
      subject: curr.subject || "",
      book: curr.book || "",
      teacherId: curr.teacherId?._id || curr.teacherId || "unassigned",
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
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${language === "ur" ? "font-urdu text-right" : ""}`}>
        <DialogHeader>
          <DialogTitle>{tr("syllabus", "manageSyllabus")}: {classData?.fullName}</DialogTitle>
          <DialogDescription>
            {tr("syllabus", "syllabusDescription")}
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{tr("syllabus", "activeAssignments")}</h3>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className={`h-4 w-4 ${language === "ur" ? "ml-2" : "mr-2"}`} /> {tr("syllabus", "assignSyllabus")}
              </Button>
            </div>

            {currLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : activeCurriculums.length === 0 ? (
              <div className="text-center p-8 border rounded-md text-muted-foreground">{tr("syllabus", "noActiveSyllabus")}</div>
            ) : (
              <div className="border rounded-md divide-y">
                {activeCurriculums.map(curr => (
                  <div key={curr._id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-lg flex items-center gap-2">
                        {curr.subject}
                        <Badge variant={curr.status === "On Track" ? "default" : "secondary"}>{curr.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {tr("syllabus", "book")}: {curr.book} | {tr("syllabus", "academicYear")}: {curr.academicYear || tr("common", "legacy")}
                      </div>
                      <div className="text-sm mt-1">
                        {tr("syllabus", "assignedTeacher")}: <span className="font-medium">
                          {curr.teacherId ? (language === "ur" ? (curr.teacherId.nameUrdu || curr.teacherId.urduName || curr.teacherId.name) : curr.teacherId.name) : tr("syllabus", "unassigned")}
                        </span>
                      </div>
                      <details className="text-xs text-muted-foreground mt-2 cursor-pointer group">
                        <summary className="font-medium select-none group-hover:text-primary transition-colors">
                          {tr("syllabus", "viewTargetDetails")}
                        </summary>
                        <div className="mt-1 pt-1 border-t">
                          {tr("syllabus", "totalLessons")}: {curr.totalLessons} | {tr("syllabus", "annualTarget")}: {curr.annualTarget} | {tr("syllabus", "completed")}: {curr.completedLessonsList?.length || 0}
                        </div>
                      </details>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(curr)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => {
                        if (window.confirm("PERMANENT DELETE\n\nAre you sure you want to permanently delete this syllabus? This cannot be undone.")) {
                          deleteMutation.mutate(curr._id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!currLoading && inactiveCurriculums.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-lg mb-4 text-muted-foreground">{tr("syllabus", "inactiveAssignments")}</h3>
                <div className="border rounded-md divide-y bg-muted/10 opacity-75">
                  {inactiveCurriculums.map(curr => (
                     <div key={curr._id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg flex items-center gap-2 text-muted-foreground">
                          {curr.subject}
                          <Badge variant="destructive">{t("inactive")}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {tr("syllabus", "book")}: {curr.book} | {tr("syllabus", "academicYear")}: {curr.academicYear || tr("common", "legacy")}
                        </div>
                        <div className="text-sm mt-1 text-muted-foreground">
                          {tr("syllabus", "assignedTeacher")}: <span className="font-medium">
                            {curr.teacherId ? (language === "ur" ? (curr.teacherId.nameUrdu || curr.teacherId.urduName || curr.teacherId.name) : curr.teacherId.name) : tr("syllabus", "unassigned")}
                          </span>
                        </div>
                        <details className="text-xs text-muted-foreground mt-2 cursor-pointer group">
                          <summary className="font-medium select-none group-hover:text-primary transition-colors">
                            {tr("syllabus", "viewTargetDetails")}
                          </summary>
                          <div className="mt-1 pt-1 border-t">
                            {tr("syllabus", "totalLessons")}: {curr.totalLessons} | {tr("syllabus", "annualTarget")}: {curr.annualTarget} | {tr("syllabus", "completed")}: {curr.completedLessonsList?.length || 0}
                          </div>
                        </details>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(curr)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => {
                          if (window.confirm("PERMANENT DELETE\n\nAre you sure you want to permanently delete this syllabus? This cannot be undone.")) {
                            deleteMutation.mutate(curr._id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{tr("syllabus", "academicYear")} *</Label>
                <Input value={formData.academicYear} onChange={e => setFormData({ ...formData, academicYear: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>{tr("syllabus", "subject")} *</Label>
                <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>{tr("syllabus", "bookSyllabusName")} *</Label>
                <Input value={formData.book} onChange={e => setFormData({ ...formData, book: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>{tr("syllabus", "assignTeacher")}</Label>
                <Select value={formData.teacherId || "unassigned"} onValueChange={val => setFormData({ ...formData, teacherId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("syllabus", "selectTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      {tr("syllabus", "unassigned")}
                    </SelectItem>
                    {teachersLoading && (
                      <SelectItem value="loading" disabled>{t("loading")}</SelectItem>
                    )}
                    {teachersError && (
                      <SelectItem value="error" disabled>{teachersError.message || t("error")}</SelectItem>
                    )}
                    {!teachersLoading && !teachersError && teachers.length === 0 && (
                      <SelectItem value="empty" disabled>{tr("syllabus", "noTeacherAssigned")}</SelectItem>
                    )}
                    {!teachersLoading && !teachersError && teachers.map(t => (
                      <SelectItem key={t._id} value={t._id}>
                        {language === "ur" ? (t.nameUrdu || t.urduName || t.name) : t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex justify-between items-center text-muted-foreground hover:text-foreground"
              >
                <span>{tr("syllabus", "advancedTargets")}</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-md bg-muted/20">
                  <div className="grid gap-2">
                    <Label>{tr("syllabus", "totalLessonsUnits")}</Label>
                    <Input type="number" value={formData.totalLessons} onChange={e => setFormData({ ...formData, totalLessons: Number(e.target.value) })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{tr("syllabus", "annualTargetLessons")}</Label>
                    <Input type="number" value={formData.annualTarget} onChange={e => setFormData({ ...formData, annualTarget: Number(e.target.value) })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{tr("syllabus", "firstHalfTarget")}</Label>
                    <Input type="number" value={formData.firstHalfTarget} onChange={e => setFormData({ ...formData, firstHalfTarget: Number(e.target.value) })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{tr("syllabus", "secondHalfTarget")}</Label>
                    <Input type="number" value={formData.secondHalfTarget} onChange={e => setFormData({ ...formData, secondHalfTarget: Number(e.target.value) })} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>{t("cancel")}</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t("saving") : tr("syllabus", "saveAssignment")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
