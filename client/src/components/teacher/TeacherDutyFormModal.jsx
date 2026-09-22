import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { classApi } from "@/lib/api";

export function TeacherDutyFormModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null, 
  isLoading = false 
}) {
  const { tr, language } = useLanguage();
  const [formData, setFormData] = useState({
    dutyType: "other",
    title: "",
    classId: "",
    startDate: "",
    endDate: "",
    remarks: "",
    shift: "",
    frequency: "daily"
  });
  
  const [classes, setClasses] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          dutyType: initialData.dutyType || "other",
          title: initialData.title || "",
          classId: initialData.classId?._id || initialData.classId || "",
          startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
          endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
          remarks: initialData.remarks || "",
          shift: initialData.shift || "",
          frequency: initialData.frequency || "daily"
        });
      } else {
        setFormData({
          dutyType: "other",
          title: "",
          classId: "",
          startDate: new Date().toISOString().split('T')[0],
          endDate: "",
          remarks: "",
          shift: "",
          frequency: "daily"
        });
      }
      setErrorMsg("");
      fetchClasses();
    }
  }, [isOpen, initialData]);

  const fetchClasses = async () => {
    try {
      const res = await classApi.getClasses();
      setClasses(res.data?.filter(c => c.status === "active") || []);
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.title.trim()) {
      setErrorMsg(tr("teacherProfile", "missingTitle") || "Title is required");
      return;
    }
    if (!formData.startDate) {
      setErrorMsg("Start Date is required");
      return;
    }
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      setErrorMsg("End Date cannot be before Start Date");
      return;
    }

    const payload = {
      ...formData,
      classId: formData.classId || null // Ensure empty string becomes null for backend
    };
    
    onSubmit(payload);
  };

  const isEdit = !!initialData;
  const dir = language === "ur" ? "rtl" : "ltr";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir={dir}>
        <DialogHeader>
          <DialogTitle>{isEdit ? tr("teacherProfile", "editDuty") : tr("teacherProfile", "addDuty")}</DialogTitle>
          <DialogDescription>
             {isEdit ? "Update duty details." : "Assign a new duty to this teacher."}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && <div className="text-red-500 text-sm p-2 bg-red-50 rounded mb-2">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dutyType">{tr("teacherProfile", "dutyType")} *</Label>
              <select
                id="dutyType"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.dutyType}
                onChange={(e) => setFormData({ ...formData, dutyType: e.target.value })}
                required
              >
                <option value="class_teacher">{tr("teacherProfile", "dutyTypeClassTeacher")}</option>
                <option value="exam">{tr("teacherProfile", "dutyTypeExam")}</option>
                <option value="discipline">{tr("teacherProfile", "dutyTypeDiscipline")}</option>
                <option value="hostel">{tr("teacherProfile", "dutyTypeHostel")}</option>
                <option value="library">{tr("teacherProfile", "dutyTypeLibrary")}</option>
                <option value="academic_management">{tr("teacherProfile", "dutyTypeAcademic")}</option>
                <option value="attendance">{tr("teacherProfile", "dutyTypeAttendance")}</option>
                <option value="events">{tr("teacherProfile", "dutyTypeEvents")}</option>
                <option value="other">{tr("teacherProfile", "dutyTypeOther")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classId">{tr("teacherProfile", "class")} (Optional)</Label>
              <select
                id="classId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">-- None --</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          
          {formData.dutyType === "hostel" && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="shift">{tr("teacherProfile", "shift") || "Shift"} *</Label>
              <select
                id="shift"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.shift || ""}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                required={formData.dutyType === "hostel"}
              >
                <option value="">-- Select Shift --</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">{tr("teacherProfile", "title")} *</Label>
              <Input 
                id="title" 
                required 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">{tr("teacherProfile", "frequency") || "Frequency"} *</Label>
              <Input 
                id="frequency" 
                value={tr("teacherProfile", "daily") || "Daily"} 
                disabled 
                className="bg-muted text-muted-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{tr("teacherProfile", "startDate")} *</Label>
              <Input 
                id="startDate" 
                type="date" 
                required 
                dir="ltr"
                value={formData.startDate} 
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{tr("teacherProfile", "endDate")} (Optional)</Label>
              <Input 
                id="endDate" 
                type="date" 
                dir="ltr"
                value={formData.endDate} 
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">{tr("teacherProfile", "remarks")} (Optional)</Label>
            <Input 
              id="remarks" 
              value={formData.remarks} 
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} 
            />
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={() => onClose(false)} disabled={isLoading}>
              {tr("common", "cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : (isEdit ? "Update" : "Add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
