import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CheckCircle2, XCircle, Plus, Edit, Trash2, Clock, MapPin, User, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hostelAttendanceApi, hostelSupervisorApi, employeeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Hostel() {
    const { tr, isRTL } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [session, setSession] = useState("morning");
    const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState(null);
    const [supervisorForm, setSupervisorForm] = useState({
        employeeId: "",
        startTime: "",
        endTime: "",
        remarks: ""
    });

    const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
        queryKey: ["hostel-attendance", date, session],
        queryFn: () => hostelAttendanceApi.getByDateAndSession(date, session)
    });

    const { data: supervisorsRes, isLoading: supervisorsLoading } = useQuery({
        queryKey: ["hostel-supervisors"],
        queryFn: () => hostelSupervisorApi.getAll()
    });

    const { data: employeesRes } = useQuery({
        queryKey: ["employees"],
        queryFn: () => employeeApi.getAll()
    });

    const supervisors = supervisorsRes?.data || [];
    const employees = employeesRes?.data || [];

    const saveAttendanceMutation = useMutation({
        mutationFn: (payload) => hostelAttendanceApi.save(payload),
        onSuccess: () => {
            queryClient.invalidateQueries(["hostel-attendance", date, session]);
            toast({ title: "Success", description: tr("Attendance saved successfully", "حاضری کامیابی سے محفوظ ہو گئی") });
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message || tr("Failed to save attendance", "حاضری محفوظ کرنے میں ناکام"), variant: "destructive" });
        }
    });

    const saveSupervisorMutation = useMutation({
        mutationFn: (payload) => {
            if (selectedSupervisor) {
                return hostelSupervisorApi.update(selectedSupervisor._id, payload);
            }
            return hostelSupervisorApi.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["hostel-supervisors"]);
            toast({ title: "Success", description: tr("Supervisor saved successfully", "نگراں کامیابی سے محفوظ ہو گیا") });
            setSupervisorModalOpen(false);
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message || tr("Failed to save supervisor", "نگراں محفوظ کرنے میں ناکام"), variant: "destructive" });
        }
    });

    const deleteSupervisorMutation = useMutation({
        mutationFn: (id) => hostelSupervisorApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["hostel-supervisors"]);
            toast({ title: "Success", description: tr("Supervisor deleted successfully", "نگراں کامیابی سے حذف ہو گیا") });
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message || tr("Failed to delete supervisor", "نگراں حذف کرنے میں ناکام"), variant: "destructive" });
        }
    });

    const handleAttendance = (studentId, status) => {
        saveAttendanceMutation.mutate({
            studentId,
            date,
            session,
            status
        });
    };

    const handleOpenSupervisorModal = (sup = null) => {
        if (sup) {
            setSelectedSupervisor(sup);
            setSupervisorForm({
                employeeId: sup.employeeId._id,
                startTime: sup.startTime,
                endTime: sup.endTime,
                remarks: sup.remarks || ""
            });
        } else {
            setSelectedSupervisor(null);
            setSupervisorForm({
                employeeId: "",
                startTime: "",
                endTime: "",
                remarks: ""
            });
        }
        setSupervisorModalOpen(true);
    };

    const handleSaveSupervisor = () => {
        if (!supervisorForm.employeeId || !supervisorForm.startTime || !supervisorForm.endTime) {
            toast({ title: "Error", description: tr("Please fill all required fields", "براہ کرم تمام ضروری فیلڈز پر کریں"), variant: "destructive" });
            return;
        }
        saveSupervisorMutation.mutate(supervisorForm);
    };

    const handleDeleteSupervisor = (id) => {
        if (window.confirm(tr("Are you sure you want to delete this supervisor assignment permanently?", "کیا آپ واقعی اس نگراں کو مستقل طور پر حذف کرنا چاہتے ہیں؟"))) {
            deleteSupervisorMutation.mutate(id);
        }
    };

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{tr("Hostel Management", "ہاسٹل کا انتظام")}</h2>
                    <p className="text-muted-foreground mt-1">{tr("Manage hostel attendance and supervisors.", "ہاسٹل کی حاضری اور نگرانوں کا انتظام کریں۔")}</p>
                </div>
            </div>

            {/* Attendance Section */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>{tr("Hostel Attendance", "ہاسٹل کی حاضری")}</CardTitle>
                            <CardDescription>{tr("Mark daily morning and evening attendance for active residential students.", "فعال رہائشی طلباء کی روزانہ صبح اور شام کی حاضری لگائیں۔")}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-[150px]"
                            />
                            <Select value={session} onValueChange={setSession}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="morning">{tr("Morning", "صبح")}</SelectItem>
                                    <SelectItem value="evening">{tr("Evening", "شام")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tr("Student Name", "طالب علم کا نام")}</TableHead>
                                    <TableHead>{tr("Admission Number", "داخلہ نمبر")}</TableHead>
                                    <TableHead>{tr("Class", "کلاس")}</TableHead>
                                    <TableHead className="text-right">{tr("Action", "عمل")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendanceLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {tr("Loading...", "لوڈ ہو رہا ہے...")}
                                        </TableCell>
                                    </TableRow>
                                ) : attendanceData?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            {tr("No active residential students found.", "کوئی فعال رہائشی طالب علم نہیں ملا۔")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    attendanceData?.data?.map((row) => (
                                        <TableRow key={row.allocation._id}>
                                            <TableCell className="font-medium">
                                                {isRTL ? row.student.nameUrdu || row.student.urduName || row.student.name : row.student.name}
                                            </TableCell>
                                            <TableCell>{row.student.admissionNumber || "-"}</TableCell>
                                            <TableCell>{row.student.classId?.fullName || "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant={row.attendance?.status === "present" ? "default" : "outline"}
                                                        className={row.attendance?.status === "present" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                                        size="sm"
                                                        onClick={() => handleAttendance(row.student._id, "present")}
                                                        disabled={saveAttendanceMutation.isPending}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-1"/> {tr("Present", "حاضر")}
                                                    </Button>
                                                    <Button 
                                                        variant={row.attendance?.status === "absent" ? "destructive" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleAttendance(row.student._id, "absent")}
                                                        disabled={saveAttendanceMutation.isPending}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1"/> {tr("Absent", "غیر حاضر")}
                                                    </Button>
                                                    {!row.attendance && (
                                                        <span className="text-xs text-muted-foreground self-center ml-2">
                                                            {tr("Not Marked", "نشان زد نہیں")}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Supervisor Section */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{tr("Hostel Supervisors", "ہاسٹل کے نگران")}</CardTitle>
                            <CardDescription>{tr("Assign employees to hostel supervision duties.", "ملازمین کو ہاسٹل کی نگرانی کے فرائض تفویض کریں۔")}</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenSupervisorModal()}>
                            <Plus className="h-4 w-4 mr-2" />
                            {tr("Add Supervisor", "نگراں شامل کریں")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{tr("Employee", "ملازم")}</TableHead>
                                    <TableHead>{tr("Frequency", "تکرار")}</TableHead>
                                    <TableHead>{tr("Start Time", "شروع کا وقت")}</TableHead>
                                    <TableHead>{tr("End Time", "ختم ہونے کا وقت")}</TableHead>
                                    <TableHead>{tr("Status", "حالت")}</TableHead>
                                    <TableHead className="text-right">{tr("Actions", "اعمال")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supervisorsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {tr("Loading...", "لوڈ ہو رہا ہے...")}
                                        </TableCell>
                                    </TableRow>
                                ) : supervisors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {tr("No supervisors assigned.", "کوئی نگراں تفویض نہیں کیا گیا۔")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    supervisors.map((sup) => (
                                        <TableRow key={sup._id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                                                    {isRTL ? sup.employeeId?.nameUrdu || sup.employeeId?.name : sup.employeeId?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{tr("Daily", "روزانہ")}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                                                    {sup.startTime}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                                                    {sup.endTime}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${sup.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {sup.status === 'active' ? tr("Active", "فعال") : tr("Inactive", "غیر فعال")}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenSupervisorModal(sup)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSupervisor(sup._id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={supervisorModalOpen} onOpenChange={setSupervisorModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedSupervisor ? tr("Edit Supervisor", "نگراں میں ترمیم کریں") : tr("Add Supervisor", "نگراں شامل کریں")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{tr("Employee", "ملازم")} *</Label>
                            <Select 
                                value={supervisorForm.employeeId} 
                                onValueChange={(val) => setSupervisorForm({...supervisorForm, employeeId: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={tr("Select Employee", "ملازم منتخب کریں")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees
                                        .filter(emp => emp.status === "active")
                                        .map(emp => (
                                        <SelectItem key={emp._id} value={emp._id}>
                                            {isRTL ? emp.nameUrdu || emp.name : emp.name} - {emp.employeeId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{tr("Start Time", "شروع کا وقت")} *</Label>
                                <Input 
                                    type="time" 
                                    value={supervisorForm.startTime} 
                                    onChange={(e) => setSupervisorForm({...supervisorForm, startTime: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{tr("End Time", "ختم ہونے کا وقت")} *</Label>
                                <Input 
                                    type="time" 
                                    value={supervisorForm.endTime} 
                                    onChange={(e) => setSupervisorForm({...supervisorForm, endTime: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{tr("Remarks", "تبصرہ")}</Label>
                            <Input 
                                value={supervisorForm.remarks} 
                                onChange={(e) => setSupervisorForm({...supervisorForm, remarks: e.target.value})}
                                placeholder={tr("Optional notes...", "اختیاری نوٹ...")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSupervisorModalOpen(false)}>
                            {tr("Cancel", "منسوخ کریں")}
                        </Button>
                        <Button onClick={handleSaveSupervisor} disabled={saveSupervisorMutation.isPending}>
                            {tr("Save", "محفوظ کریں")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
