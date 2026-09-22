import React, { useState, useEffect, useCallback } from "react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoreVertical, Edit, Trash, Plus, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { formatLocalizedNumber, formatLocalizedDate } from "@/utils/localizationUtils";
import { teacherDutiesApi } from "@/lib/api/teacherDuties";
import { useToast } from "@/hooks/use-toast";
import { TeacherDutyFormModal } from "./TeacherDutyFormModal";

export function TeacherDutiesTab({ teacherId }) {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [duties, setDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const isAdmin = user?.role === "admin";

  const fetchDuties = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherDutiesApi.getTeacherDuties(teacherId, {
        status: statusFilter,
        dutyType: typeFilter
      });
      setDuties(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to load duties",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [teacherId, statusFilter, typeFilter, toast]);

  useEffect(() => {
    fetchDuties();
  }, [fetchDuties]);

  const handleOpenAdd = () => {
    setEditingDuty(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (duty) => {
    setEditingDuty(duty);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingDuty) {
        await teacherDutiesApi.updateTeacherDuty(editingDuty._id, formData);
        toast({ title: "Success", description: "Duty updated successfully" });
      } else {
        await teacherDutiesApi.createTeacherDuty(teacherId, formData);
        toast({ title: "Success", description: "Duty created successfully" });
      }
      setIsFormOpen(false);
      fetchDuties();
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to save duty",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (dutyId, status) => {
    try {
      await teacherDutiesApi.updateTeacherDutyStatus(dutyId, status);
      toast({ title: "Success", description: `Duty marked as ${status}` });
      fetchDuties();
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (dutyId) => {
    if (!window.confirm(tr("teacherProfile", "confirmDelete"))) return;
    try {
      await teacherDutiesApi.deleteTeacherDuty(dutyId);
      toast({ title: "Success", description: "Duty deleted successfully" });
      fetchDuties();
    } catch (err) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete duty",
        variant: "destructive"
      });
    }
  };

  // Derived stats
  const totalDuties = duties.length;
  const activeDuties = duties.filter(d => d.status === "active").length;
  const completedDuties = duties.filter(d => d.status === "completed").length;
  const cancelledDuties = duties.filter(d => d.status === "cancelled").length;

  const getDutyTypeLabel = (type) => {
    const map = {
      "class_teacher": tr("teacherProfile", "dutyTypeClassTeacher"),
      "exam": tr("teacherProfile", "dutyTypeExam"),
      "discipline": tr("teacherProfile", "dutyTypeDiscipline"),
      "hostel": tr("teacherProfile", "dutyTypeHostel"),
      "library": tr("teacherProfile", "dutyTypeLibrary"),
      "academic_management": tr("teacherProfile", "dutyTypeAcademic"),
      "attendance": tr("teacherProfile", "dutyTypeAttendance"),
      "events": tr("teacherProfile", "dutyTypeEvents"),
      "other": tr("teacherProfile", "dutyTypeOther")
    };
    return map[type] || type;
  };

  const getStatusBadge = (status) => {
    if (status === "active") return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{tr("teacherProfile", "statusActive")}</span>;
    if (status === "completed") return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{tr("teacherProfile", "statusCompleted")}</span>;
    if (status === "cancelled") return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">{tr("teacherProfile", "statusCancelled")}</span>;
    return status;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{tr("teacherProfile", "totalDuties")}</p>
            <p className="text-2xl font-bold">{formatLocalizedNumber(totalDuties, language)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <p className="text-xs text-blue-600 uppercase tracking-wider">{tr("teacherProfile", "activeDuties")}</p>
            <p className="text-2xl font-bold text-blue-700">{formatLocalizedNumber(activeDuties, language)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <p className="text-xs text-green-600 uppercase tracking-wider">{tr("teacherProfile", "completedDuties")}</p>
            <p className="text-2xl font-bold text-green-700">{formatLocalizedNumber(completedDuties, language)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <p className="text-xs text-red-600 uppercase tracking-wider">{tr("teacherProfile", "cancelledDuties")}</p>
            <p className="text-2xl font-bold text-red-700">{formatLocalizedNumber(cancelledDuties, language)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">{tr("teacherProfile", "statusActive")}</option>
            <option value="completed">{tr("teacherProfile", "statusCompleted")}</option>
            <option value="cancelled">{tr("teacherProfile", "statusCancelled")}</option>
          </select>
          <select 
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="class_teacher">{tr("teacherProfile", "dutyTypeClassTeacher")}</option>
            <option value="exam">{tr("teacherProfile", "dutyTypeExam")}</option>
            <option value="other">{tr("teacherProfile", "dutyTypeOther")}</option>
          </select>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAdd} className="shrink-0 w-full sm:w-auto">
            <Plus className="me-2 h-4 w-4"/> {tr("teacherProfile", "addDuty")}
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>{tr("teacherProfile", "dutyType")}</TableHead>
                <TableHead>{tr("teacherProfile", "title")}</TableHead>
                <TableHead>{tr("teacherProfile", "frequency") || "Frequency"}</TableHead>
                <TableHead>{tr("teacherProfile", "class")}</TableHead>
                <TableHead>{tr("teacherProfile", "startDate")}</TableHead>
                <TableHead>{tr("teacherProfile", "endDate")}</TableHead>
                <TableHead>{tr("teacherProfile", "status")}</TableHead>
                {isAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="h-24 text-center">
                    {tr("common", "loading") || "Loading..."}
                  </TableCell>
                </TableRow>
              ) : duties.length > 0 ? (
                duties.map((duty) => (
                  <TableRow key={duty._id}>
                    <TableCell className="font-medium text-sm">
                      {getDutyTypeLabel(duty.dutyType)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{duty.title}</div>
                      {duty.remarks && <div className="text-xs text-muted-foreground mt-1">{duty.remarks}</div>}
                    </TableCell>
                    <TableCell>{duty.frequency === "daily" ? (tr("teacherProfile", "daily") || "Daily") : (duty.frequency || (tr("teacherProfile", "daily") || "Daily"))}</TableCell>
                    <TableCell>{duty.classId?.className || "—"}</TableCell>
                    <TableCell className="text-xs" dir="ltr">{formatLocalizedDate(duty.startDate, language)}</TableCell>
                    <TableCell className="text-xs" dir="ltr">{duty.endDate ? formatLocalizedDate(duty.endDate, language) : "—"}</TableCell>
                    <TableCell>{getStatusBadge(duty.status)}</TableCell>
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
                            <DropdownMenuLabel>{tr("teacherProfile", "actions")}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenEdit(duty)}>
                              <Edit className="me-2 h-4 w-4"/> {tr("teacherProfile", "editDuty")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {duty.status !== "completed" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(duty._id, "completed")}>
                                <CheckCircle className="me-2 h-4 w-4 text-green-600"/> Mark Completed
                              </DropdownMenuItem>
                            )}
                            {duty.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(duty._id, "cancelled")}>
                                <XCircle className="me-2 h-4 w-4 text-red-600"/> Cancel Duty
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(duty._id)}>
                              <Trash className="me-2 h-4 w-4"/> {tr("teacherProfile", "deleteDuty")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="p-0">
                    <EmptyState 
                      title={isAdmin ? tr("teacherProfile", "noDutiesAdmin") : tr("teacherProfile", "noDutiesTeacher")}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TeacherDutyFormModal 
        isOpen={isFormOpen}
        onClose={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingDuty}
        isLoading={isSubmitting}
      />
    </div>
  );
}
