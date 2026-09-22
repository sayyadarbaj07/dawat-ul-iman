import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { examApi } from "@/lib/api/exam";
import { classApi } from "@/lib/api/classApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { sectionMotion } from "@/components/dashboard/primitives";

export default function ExamMappingPage() {
  const { tr, isRTL } = useLanguage();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, classesRes] = await Promise.all([
        examApi.getUnresolvedExams(),
        classApi.getClasses()
      ]);
      
      console.log("=== API RESPONSE LOG ===");
      console.log("examsRes type:", typeof examsRes);
      console.log("examsRes keys:", examsRes ? Object.keys(examsRes) : "null");
      
      const extractArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (res.data && Array.isArray(res.data.data)) return res.data.data;
        if (res.exams && Array.isArray(res.exams)) return res.exams;
        return [];
      };

      const extractedExams = extractArray(examsRes);
      console.log("array length:", extractedExams.length);
      console.log("first record:", extractedExams.length > 0 ? extractedExams[0] : "None");
      console.log("========================");

      setExams(extractedExams);
      setClasses(extractArray(classesRes));
    } catch (error) {
      console.error("fetchData error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load mapping data"
      });
    } finally {
      setLoading(false);
    }
  };

  const safeFormatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Invalid Date";
      return format(d, "dd MMM yyyy");
    } catch (e) {
      return "Format Error";
    }
  };

  const handleMapClick = (exam) => {
    setSelectedExam(exam);
    setSelectedClassId("");
    setConfirmation(false);
  };

  const handleCloseDialog = () => {
    setSelectedExam(null);
    setSelectedClassId("");
    setConfirmation(false);
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !confirmation) return;
    
    try {
      setSubmitting(true);
      const targetClass = classes.find(c => c._id === selectedClassId);
      
      await examApi.mapLegacyExamClass(selectedExam._id, {
        classId: selectedClassId,
        confirmation: true
      });
      
      toast({
        title: "Success",
        description: `Exam successfully mapped to ${targetClass?.fullName}`
      });
      
      handleCloseDialog();
      fetchData(); // Refresh list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to map exam"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded-[16px]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Class Mapping</h1>
          <p className="text-muted-foreground mt-1">
            Map historical legacy exams to their canonical classes.
          </p>
        </div>
      </div>

      <motion.div variants={sectionMotion} initial="hidden" animate="show" className="bg-card rounded-[16px] border shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6 text-amber-600 bg-amber-50 dark:bg-amber-950/50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">
              These exams are currently missing canonical class assignments. Do not map them unless you are absolutely certain of the correct class.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Exam Name</th>
                  <th className="px-6 py-4 font-semibold">Legacy Class String</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No unresolved exams found.
                    </td>
                  </tr>
                ) : (
                  exams.map((exam) => (
                    <tr key={exam._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{exam.name || exam.examName || "Unnamed Exam"}</td>
                      <td className="px-6 py-4 text-amber-600 font-mono text-xs">{exam.class || "Missing"}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {safeFormatDate(exam.date)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Unresolved
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => handleMapClick(exam)}>
                          Map Class
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Map Class Dialog */}
      <Dialog open={!!selectedExam} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Map Historical Exam</DialogTitle>
            <DialogDescription>
              Select the exact canonical class for this historical exam.
            </DialogDescription>
          </DialogHeader>

          {selectedExam && (
            <div className="space-y-6 py-4">
              <div className="space-y-4 bg-muted/50 p-4 rounded-lg text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Exam Name:</span>
                  <span className="col-span-2 font-semibold">{selectedExam.name || selectedExam.examName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground font-medium">Legacy Class:</span>
                  <span className="col-span-2 font-mono text-amber-600">{selectedExam.class || "Missing"}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Select Canonical Class</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select exact class..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {classes.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 p-3 rounded border border-amber-200 dark:border-amber-900">
                This exam is a historical record. Select the exact canonical class only if you are certain. Do not guess.
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox 
                  id="confirm-mapping" 
                  checked={confirmation} 
                  onCheckedChange={(c) => setConfirmation(!!c)} 
                  className="mt-0.5"
                />
                <label 
                  htmlFor="confirm-mapping" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I confirm that this is the exact canonical class for this historical exam.
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedClassId || !confirmation || submitting}
            >
              {submitting ? "Mapping..." : "Confirm Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
