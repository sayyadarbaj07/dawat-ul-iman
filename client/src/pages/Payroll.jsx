import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useLanguage } from "@/context/LanguageContext";
import { employeeApi, teacherApi, employeeSalaryApi, teacherSalaryApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLocalizedNumber } from "@/utils/localizationUtils";

export default function Payroll() {
  const { tr, language } = useLanguage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedPersonId, setSelectedPersonId] = useState("");

  // Result State
  const [salaryResult, setSalaryResult] = useState(null);
  const [attendanceError, setAttendanceError] = useState(null);
  const [alreadyDrafted, setAlreadyDrafted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" },
    { value: 3, label: "March" }, { value: 4, label: "April" },
    { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" },
    { value: 9, label: "September" }, { value: 10, label: "October" },
    { value: 11, label: "November" }, { value: 12, label: "December" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  useEffect(() => {
    loadPeople();
  }, [activeTab]);

  useEffect(() => {
    // Reset result when inputs change
    setSalaryResult(null);
    setAttendanceError(null);
    setAlreadyDrafted(false);
    setSaveSuccess(false);
  }, [month, year, selectedPersonId, activeTab]);

  const loadPeople = async () => {
    setLoading(true);
    try {
      if (activeTab === "employees") {
        const res = await employeeApi.list({ isActive: true });
        setEmployees(res.data?.data || res.data || []);
      } else {
        const res = await teacherApi.list();
        // Assuming teacher list returns all, we filter active ones if possible, but schema has deactivationDate
        const allTeachers = res.data?.data || res.data || [];
        setTeachers(allTeachers.filter(t => !t.deactivationDate || new Date(t.deactivationDate) >= new Date(year, month - 1, 1)));
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load personnel",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedPersonId) {
      toast({
        title: "Error",
        description: tr("payroll", "noPersonSelected") || "Please select a person first.",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    setSalaryResult(null);
    setAttendanceError(null);
    setAlreadyDrafted(false);
    setSaveSuccess(false);

    try {
      let res;
      if (activeTab === "employees") {
        res = await employeeSalaryApi.calculate({ employeeId: selectedPersonId, month, year });
      } else {
        res = await teacherSalaryApi.calculate({ teacherId: selectedPersonId, month, year });
      }

      setSalaryResult(res.data);
    } catch (err) {
      if (err.response?.data?.code === "INCOMPLETE_ATTENDANCE") {
        setAttendanceError(err.response.data.message);
      } else if (err.response?.data?.message?.includes("already exists")) {
        setAlreadyDrafted(true);
      } else {
        toast({
          title: "Calculation Failed",
          description: err.response?.data?.message || err.message,
          variant: "destructive"
        });
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (activeTab === "employees") {
        await employeeSalaryApi.createDraft({ employeeId: selectedPersonId, month, year });
      } else {
        await teacherSalaryApi.createDraft({ teacherId: selectedPersonId, month, year });
      }
      setSaveSuccess(true);
      toast({
        title: "Success",
        description: tr("payroll", "draftSaved") || "Salary draft saved successfully!",
      });
    } catch (err) {
      if (err.response?.data?.message?.includes("already exists")) {
         setAlreadyDrafted(true);
      } else {
        toast({
          title: "Save Failed",
          description: err.response?.data?.message || err.message,
          variant: "destructive"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const renderResult = () => {
    if (attendanceError) {
      const cleanMsg = typeof attendanceError === 'string' 
        ? attendanceError.replace(/^INCOMPLETE_ATTENDANCE:\s*/, "") 
        : "Some active working days are not marked.";
      
      const fallbackStr = tr("payroll", "incompleteAttendanceMsg") || "Some active working days are not marked. Please complete the attendance before processing payroll.";
      const actionMsg = fallbackStr.includes("Some active") 
        ? "Please complete the attendance before processing payroll." 
        : fallbackStr;

      return (
        <EmptyState
          icon={AlertTriangle}
          title={tr("payroll", "incompleteAttendance") || "Attendance Incomplete"}
          description={
            <span className="block space-y-1">
              <span className="block font-medium text-red-700">{cleanMsg}</span>
              <span className="block">{actionMsg}</span>
            </span>
          }
          className="bg-red-50/50 border-red-200 mt-6 [&_svg]:text-red-500 [&_p]:text-red-600"
        />
      );
    }

    if (alreadyDrafted) {
      return (
        <EmptyState
          icon={CheckCircle}
          title="Draft Already Exists"
          description={tr("payroll", "alreadyDrafted") || "A salary record already exists for this month."}
          className="bg-green-50/50 border-green-200 mt-6"
        />
      );
    }

    if (saveSuccess) {
      return (
        <EmptyState
          icon={CheckCircle}
          title="Success"
          description={tr("payroll", "draftSaved") || "Salary draft saved successfully!"}
          className="bg-green-50/50 border-green-200 mt-6"
        />
      );
    }

    if (!salaryResult) return null;

    return (
      <Card className="mt-6 border-primary/20 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Salary Breakdown</span>
            <span className="text-sm font-normal text-muted-foreground">
              {months.find(m => m.value === month)?.label} {year}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Base Salary Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Base Information</h4>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "monthlySalary") || "Monthly Salary"}</span>
                <span className="font-medium">₹{formatLocalizedNumber(salaryResult.monthlySalarySnapshot, language)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "dailySalary") || "Daily Salary"}</span>
                <span className="font-medium">₹{formatLocalizedNumber(salaryResult.dailySalary, language)}</span>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Attendance</h4>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "present") || "Present"}</span>
                <span className="font-medium">{salaryResult.applicableDays || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "sundays") || "Sundays / Weekly Off"}</span>
                <span className="font-medium text-green-600">{salaryResult.sundays}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "late") || "Late"} (No Deduction)</span>
                <span className="font-medium text-amber-600">{salaryResult.lateDays}</span>
              </div>
            </div>

            {/* Leaves and Absences */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Leaves & Absences</h4>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "allowedLeave") || "Allowed Leave"}</span>
                <span className="font-medium text-green-600">{salaryResult.allowedLeave}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "extraLeave") || "Extra Leave"}</span>
                <span className="font-medium text-red-600">{salaryResult.extraLeave}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>{tr("payroll", "absent") || "Absent"}</span>
                <span className="font-medium text-red-600">{salaryResult.absentDays}</span>
              </div>
            </div>

          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-lg border">
             <div className="space-y-3">
               <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Deductions</h4>
               <div className="flex justify-between">
                 <span>{tr("payroll", "leaveDeduction") || "Leave Deduction"}</span>
                 <span className="text-red-600 font-medium">- ₹{formatLocalizedNumber(salaryResult.leaveDeduction, language)}</span>
               </div>
               <div className="flex justify-between">
                 <span>{tr("payroll", "absentDeduction") || "Absent Deduction"}</span>
                 <span className="text-red-600 font-medium">- ₹{formatLocalizedNumber(salaryResult.absentDeduction, language)}</span>
               </div>
               <div className="flex justify-between pt-2 border-t font-semibold">
                 <span>{tr("payroll", "totalDeduction") || "Total Deduction"}</span>
                 <span className="text-red-600">- ₹{formatLocalizedNumber(salaryResult.totalDeduction, language)}</span>
               </div>
             </div>

             <div className="flex flex-col justify-center items-center bg-primary/5 rounded-lg p-6 border border-primary/20">
                <span className="text-muted-foreground mb-2">{tr("payroll", "payableSalary") || "Final Payable Salary"}</span>
                <span className="text-4xl font-bold text-primary">₹{formatLocalizedNumber(salaryResult.payableSalary, language)}</span>
             </div>
          </div>

          <div className="mt-6 flex justify-end">
             <Button onClick={handleSaveDraft} disabled={saving} size="lg">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tr("payroll", "saveDraft") || "Save Draft"}
             </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("payroll", "title") || "Payroll Management"}
        description="Calculate and draft monthly salaries based on attendance."
        icon={FileSpreadsheet}
      />

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setSelectedPersonId("");
      }}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="employees">{tr("payroll", "employeesTab") || "Employees"}</TabsTrigger>
          <TabsTrigger value="teachers">{tr("payroll", "teachersTab") || "Teachers"}</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculation Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <Label>{tr("payroll", "selectMonth") || "Select Month"}</Label>
                  <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{tr("payroll", "selectYear") || "Select Year"}</Label>
                  <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {activeTab === "employees" 
                      ? (tr("payroll", "selectEmployee") || "Select Employee")
                      : (tr("payroll", "selectTeacher") || "Select Teacher")}
                  </Label>
                  <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Loading..." : "Select person..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab === "employees" && employees.map(emp => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name} ({emp.employeeId})
                        </SelectItem>
                      ))}
                      {activeTab === "teachers" && teachers.map(teacher => (
                        <SelectItem key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-6">
                <Button 
                  onClick={handleCalculate} 
                  disabled={calculating || !selectedPersonId}
                  className="w-full md:w-auto"
                >
                  {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tr("payroll", "calculate") || "Calculate Salary"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>

      {renderResult()}
    </div>
  );
}
