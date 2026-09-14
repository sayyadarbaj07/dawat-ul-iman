import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoreVertical, Edit, Trash, Plus, Info } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function TeacherQualificationTab({ teacher, onTeacherUpdated }) {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = user?.role === "admin";
  const qualifications = Array.isArray(teacher?.qualifications) ? teacher.qualifications : [];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    qualification: "",
    degreeOrCertificate: "",
    institution: "",
    passingYear: "",
    specialization: "",
    experience: "",
    previousInstitution: ""
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData({
      qualification: "",
      degreeOrCertificate: "",
      institution: "",
      passingYear: "",
      specialization: "",
      experience: "",
      previousInstitution: ""
    });
    setErrorMsg("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (index) => {
    setEditingIndex(index);
    const q = qualifications[index];
    setFormData({
      qualification: q.qualification || "",
      degreeOrCertificate: q.degreeOrCertificate || "",
      institution: q.institution || "",
      passingYear: q.passingYear || "",
      specialization: q.specialization || "",
      experience: q.experience !== undefined && q.experience !== null ? q.experience : "",
      previousInstitution: q.previousInstitution || ""
    });
    setErrorMsg("");
    setIsFormOpen(true);
  };

  const handleRemove = async (index) => {
    if (!window.confirm(tr("teacherProfile", "confirmRemoveQualification"))) return;
    
    // History Safety Requirement: clone and remove only one index
    const updatedArray = [...qualifications];
    updatedArray.splice(index, 1);
    await updateQualifications(updatedArray);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.qualification.trim()) {
      setErrorMsg(tr("teacherProfile", "qualificationRequired") || "Qualification is required");
      return;
    }

    let parsedYear = undefined;
    if (formData.passingYear) {
      parsedYear = parseInt(formData.passingYear, 10);
      if (isNaN(parsedYear)) {
        setErrorMsg("Passing year must be a valid number");
        return;
      }
      const currentYear = new Date().getFullYear();
      if (parsedYear > currentYear) {
        setErrorMsg("Passing year cannot be a future year");
        return;
      }
    }

    let parsedExp = undefined;
    if (formData.experience !== "") {
      parsedExp = parseFloat(formData.experience);
      if (isNaN(parsedExp) || parsedExp < 0) {
        setErrorMsg("Experience must be a positive number");
        return;
      }
    }

    const newQual = {
      qualification: formData.qualification.trim(),
      degreeOrCertificate: formData.degreeOrCertificate?.trim() || undefined,
      institution: formData.institution?.trim() || undefined,
      passingYear: parsedYear,
      specialization: formData.specialization?.trim() || undefined,
      experience: parsedExp,
      previousInstitution: formData.previousInstitution?.trim() || undefined
    };

    // History Safety Requirement: build complete array
    const updatedArray = [...qualifications];
    if (editingIndex !== null) {
      updatedArray[editingIndex] = newQual;
    } else {
      updatedArray.push(newQual);
    }

    await updateQualifications(updatedArray);
    setIsFormOpen(false);
  };

  const updateQualifications = async (newArray) => {
    setIsSubmitting(true);
    try {
      const payload = {
        qualifications: newArray
      };
      const res = await teacherApi.update(teacher._id || teacher.id, payload);
      toast({ title: "Success", description: "Qualifications updated successfully" });
      if (onTeacherUpdated) {
        onTeacherUpdated(res.data?.data || res.data); // depending on backend structure
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update qualifications",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dir = language === "ur" ? "rtl" : "ltr";

  return (
    <div className="space-y-6">
      {/* Action Bar & Hint */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
          <Info className="w-4 h-4 mr-2 text-blue-500 shrink-0" />
          <span>{tr("teacherProfile", "qualificationProofHint")}</span>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAdd} className="shrink-0 w-full sm:w-auto">
            <Plus className="me-2 h-4 w-4"/> {tr("teacherProfile", "addQualification")}
          </Button>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>{tr("teacherProfile", "qualification")}</TableHead>
              <TableHead>{tr("teacherProfile", "degreeOrCertificate")}</TableHead>
              <TableHead>{tr("teacherProfile", "institution")}</TableHead>
              <TableHead>{tr("teacherProfile", "passingYear")}</TableHead>
              <TableHead>{tr("teacherProfile", "specialization")}</TableHead>
              <TableHead>{tr("teacherProfile", "experienceYears")}</TableHead>
              <TableHead>{tr("teacherProfile", "previousInstitution")}</TableHead>
              {isAdmin && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {qualifications.length > 0 ? (
              qualifications.map((q, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{q.qualification}</TableCell>
                  <TableCell>{q.degreeOrCertificate || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={q.institution}>{q.institution || "—"}</TableCell>
                  <TableCell dir="ltr">{q.passingYear || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={q.specialization}>{q.specialization || "—"}</TableCell>
                  <TableCell dir="ltr">{q.experience !== undefined && q.experience !== null ? q.experience : "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={q.previousInstitution}>{q.previousInstitution || "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Actions</span>
                            <MoreVertical className="h-4 w-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{tr("common", "actions") || "Actions"}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEdit(index)}>
                            <Edit className="me-2 h-4 w-4"/> {tr("teacherProfile", "editQualification") || "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleRemove(index)}>
                            <Trash className="me-2 h-4 w-4"/> {tr("teacherProfile", "remove") || "Remove"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="p-0">
                  <EmptyState 
                    title={isAdmin ? tr("teacherProfile", "noQualificationsAdmin") : tr("teacherProfile", "noQualificationsTeacher")}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {qualifications.length > 0 ? (
          qualifications.map((q, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-base">{q.qualification}</h4>
                    {q.degreeOrCertificate && <p className="text-sm text-muted-foreground">{q.degreeOrCertificate}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(index)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="h-8 w-8 text-red-500 hover:text-red-600">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-2 pt-2 border-t border-border">
                  {q.institution && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs block">{tr("teacherProfile", "institution")}</span>
                      <span>{q.institution}</span>
                    </div>
                  )}
                  {q.passingYear && (
                    <div>
                      <span className="text-muted-foreground text-xs block">{tr("teacherProfile", "passingYear")}</span>
                      <span dir="ltr">{q.passingYear}</span>
                    </div>
                  )}
                  {q.experience !== undefined && q.experience !== null && (
                    <div>
                      <span className="text-muted-foreground text-xs block">{tr("teacherProfile", "experienceYears")}</span>
                      <span dir="ltr">{q.experience}</span>
                    </div>
                  )}
                  {q.specialization && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs block">{tr("teacherProfile", "specialization")}</span>
                      <span>{q.specialization}</span>
                    </div>
                  )}
                  {q.previousInstitution && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs block">{tr("teacherProfile", "previousInstitution")}</span>
                      <span>{q.previousInstitution}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState 
            title={isAdmin ? tr("teacherProfile", "noQualificationsAdmin") : tr("teacherProfile", "noQualificationsTeacher")}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]" dir={dir}>
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? tr("teacherProfile", "editQualification") : tr("teacherProfile", "addQualification")}</DialogTitle>
            <DialogDescription>
              {editingIndex !== null ? "Update qualification details." : "Add a new qualification record for this teacher."}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && <div className="text-red-500 text-sm p-2 bg-red-50 rounded mb-2">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qualification">{tr("teacherProfile", "qualification")} *</Label>
              <Input 
                id="qualification" 
                required 
                value={formData.qualification} 
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="degreeOrCertificate">{tr("teacherProfile", "degreeOrCertificate")} (Optional)</Label>
              <Input 
                id="degreeOrCertificate" 
                value={formData.degreeOrCertificate} 
                onChange={(e) => setFormData({ ...formData, degreeOrCertificate: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">{tr("teacherProfile", "institution")} (Optional)</Label>
              <Input 
                id="institution" 
                value={formData.institution} 
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passingYear">{tr("teacherProfile", "passingYear")} (Optional)</Label>
                <Input 
                  id="passingYear" 
                  type="number" 
                  dir="ltr"
                  placeholder="e.g. 2022"
                  value={formData.passingYear} 
                  onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">{tr("teacherProfile", "experienceYears")} (Optional)</Label>
                <Input 
                  id="experience" 
                  type="number"
                  step="0.1" 
                  dir="ltr"
                  min="0"
                  value={formData.experience} 
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">{tr("teacherProfile", "specialization")} (Optional)</Label>
              <Input 
                id="specialization" 
                value={formData.specialization} 
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousInstitution">{tr("teacherProfile", "previousInstitution")} (Optional)</Label>
              <Input 
                id="previousInstitution" 
                value={formData.previousInstitution} 
                onChange={(e) => setFormData({ ...formData, previousInstitution: e.target.value })} 
              />
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                {tr("common", "cancel") || "Cancel"}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (editingIndex !== null ? (tr("teacherProfile", "update") || "Update") : (tr("teacherProfile", "save") || "Save"))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
