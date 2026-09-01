import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { studentApi, settingsApi } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const SHOB_CLASSES = {
  "Shob-e-Deeniyat": [
    "Awwal", "Duwwam", "Suwwam", "Chaharum", "Panjum", "Shashum",
  ],
  "Shob-e-Hifz": [
    "Darja Awwal", "Darja Duwwam", "Darja Suwwam", "Darja Chaharum",
  ],
  "Shob-e-Aalimiyat": [
    "Awwal", "Duwwam", "Suwwam", "Chaharum", "Panjum", "Shashum", "Haftum", "Dora-e-Hadees",
  ],
  "Shob-e-Qirat": ["Hafs", "Saba", "Ashra"],
};

export default function Promotions() {
  const { t, tr } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  const [academicYears, setAcademicYears] = useState(["2025-26", "2026-27"]);
  
  const [sourceFilter, setSourceFilter] = useState({
    academicYear: "",
    department: "",
    className: "",
  });

  const [targetFilter, setTargetFilter] = useState({
    academicYear: "",
    department: "",
    className: "",
    status: "Promoted"
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const res = await settingsApi.getAcademicYears();
      if (res.data && res.data.length > 0) {
        setAcademicYears(res.data.map(ay => ay.year));
        const active = res.data.find(ay => ay.isActive);
        if (active) {
          setSourceFilter(prev => ({ ...prev, academicYear: active.year }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch academic years", error);
    }
  };

  const loadStudents = async () => {
    if (!sourceFilter.department || !sourceFilter.className) {
      toast({
        title: "Validation Error",
        description: "Please select source department and class.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setStudents([]);
    setSelectedStudents([]);
    
    try {
      const classFullName = `${sourceFilter.department} - ${sourceFilter.className}`;
      const res = await studentApi.list({ className: classFullName, status: "active" });
      if (res.data) {
        setStudents(res.data);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(students.map(s => s._id || s.id || s.studentId));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (id, checked) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, id]);
    } else {
      setSelectedStudents(prev => prev.filter(s => s !== id));
    }
  };

  const openConfirmModal = () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to promote.",
        variant: "destructive"
      });
      return;
    }

    if (!targetFilter.academicYear || !targetFilter.department || !targetFilter.className) {
      toast({
        title: "Validation Error",
        description: "Please select target academic year, department, and class.",
        variant: "destructive"
      });
      return;
    }

    const sourceClass = `${sourceFilter.department} - ${sourceFilter.className}`;
    const targetClass = `${targetFilter.department} - ${targetFilter.className}`;

    if (sourceFilter.academicYear === targetFilter.academicYear && sourceClass === targetClass) {
      toast({
        title: "Invalid Promotion",
        description: "Source and target class and academic year cannot be exactly the same.",
        variant: "destructive"
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleBulkPromote = async () => {
    setPromoting(true);
    try {
      const payload = {
        studentIds: selectedStudents,
        fromAcademicYear: sourceFilter.academicYear,
        toAcademicYear: targetFilter.academicYear,
        className: targetFilter.department, // For compatibility
        studentClass: `${targetFilter.department} - ${targetFilter.className}`,
        status: targetFilter.status
      };

      await studentApi.bulkPromote(payload);
      
      toast({
        title: "Promotion Successful",
        description: `Successfully processed ${selectedStudents.length} students.`,
      });
      
      setIsConfirmModalOpen(false);
      loadStudents(); // Reload students
    } catch (error) {
      console.error(error);
      toast({
        title: "Promotion Failed",
        description: error.message || "Failed to promote students.",
        variant: "destructive"
      });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bulk Promotion</h2>
          <p className="text-muted-foreground mt-1">
            Safely advance students to their next academic year and class.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Panel */}
        <div className="bg-card border rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-lg">Source Selection</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Academic Year</label>
              <Select
                value={sourceFilter.academicYear}
                onValueChange={(val) => setSourceFilter(prev => ({ ...prev, academicYear: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay} value={ay}>{ay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Department</label>
              <Select
                value={sourceFilter.department}
                onValueChange={(val) => setSourceFilter(prev => ({ ...prev, department: val, className: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(SHOB_CLASSES).map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">From Class</label>
              <Select
                value={sourceFilter.className}
                onValueChange={(val) => setSourceFilter(prev => ({ ...prev, className: val }))}
                disabled={!sourceFilter.department}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {sourceFilter.department && SHOB_CLASSES[sourceFilter.department]?.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" onClick={loadStudents} disabled={loading || !sourceFilter.department || !sourceFilter.className}>
            {loading ? "Loading Students..." : "Fetch Students"}
          </Button>
        </div>

        {/* Target Panel */}
        <div className="bg-card border rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-lg">Target Placement</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">To Academic Year</label>
              <Select
                value={targetFilter.academicYear}
                onValueChange={(val) => setTargetFilter(prev => ({ ...prev, academicYear: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay} value={ay}>{ay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Department</label>
              <Select
                value={targetFilter.department}
                onValueChange={(val) => setTargetFilter(prev => ({ ...prev, department: val, className: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(SHOB_CLASSES).map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Class</label>
              <Select
                value={targetFilter.className}
                onValueChange={(val) => setTargetFilter(prev => ({ ...prev, className: val }))}
                disabled={!targetFilter.department}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {targetFilter.department && SHOB_CLASSES[targetFilter.department]?.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={targetFilter.status}
                onValueChange={(val) => setTargetFilter(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Promoted">Promoted</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Detained">Detained</SelectItem>
                  <SelectItem value="Not Promoted">Not Promoted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700" 
            onClick={openConfirmModal}
            disabled={selectedStudents.length === 0 || !targetFilter.department || !targetFilter.className || !targetFilter.academicYear}
          >
            Promote Selected Students ({selectedStudents.length})
          </Button>
        </div>
      </div>

      {/* Student Selection Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
          <h3 className="font-semibold">Student List</h3>
          <span className="text-sm text-muted-foreground">{students.length} students found</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading students...</div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto max-h-[500px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={selectedStudents.length === students.length && students.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Father Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const id = student._id || student.id || student.studentId;
                  const isChecked = selectedStudents.includes(id);
                  return (
                    <TableRow key={id} className={isChecked ? "bg-primary/5" : ""}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleSelectStudent(id, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{student.rollNumber}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{student.fatherName}</TableCell>
                      <TableCell>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          {student.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Select a source department and class to view students.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Bulk Promotion
            </DialogTitle>
            <DialogDescription className="pt-3">
              You are about to promote <strong className="text-foreground">{selectedStudents.length}</strong> students.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">From:</span>
              <span className="font-medium text-right">
                {sourceFilter.academicYear}<br/>
                {sourceFilter.department} - {sourceFilter.className}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">To:</span>
              <span className="font-medium text-right text-emerald-600">
                {targetFilter.academicYear}<br/>
                {targetFilter.department} - {targetFilter.className}<br/>
                ({targetFilter.status})
              </span>
            </div>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-lg text-xs font-medium leading-relaxed">
            This action will move the selected students to the new academic class. Historical records (Exams, Attendance) will be safely preserved in their Academic History and will not be overwritten.
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={promoting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkPromote} disabled={promoting}>
              {promoting ? "Promoting..." : "Confirm Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
