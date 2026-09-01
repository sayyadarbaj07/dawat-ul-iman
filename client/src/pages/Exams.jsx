import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileEdit, CalendarDays, Plus, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { examApi, studentApi } from "@/lib/api";
import { CLASS_TREE, getAllClassesFlat } from "@/lib/classTree";

export default function Exams() {
  const { tr } = useLanguage();
  const [activeTab, setActiveTab] = useState("exams");

  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Create Exam
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    examType: "Monthly",
    customExamType: "",
    examName: "",
    academicYear: new Date().getFullYear().toString(),
    studentClassCategory: "Shob-e-Deeniyat",
    studentClassSub: "Awwal",
    customStudentClassSub: "",
    subjects: "",
    maxMarks: 100,
    passingMarks: 33,
    date: "",
  });

  // Enter Marks
  const [selectedExamIdMarks, setSelectedExamIdMarks] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [marksData, setMarksData] = useState({}); // { studentId: marks }
  const [studentsForMarks, setStudentsForMarks] = useState([]);
  
  // Marks Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterDept, setFilterDept] = useState("Shob-e-Deeniyat");
  const [filterSubClassDropdown, setFilterSubClassDropdown] = useState("Awwal");
  const [filterSubClass, setFilterSubClass] = useState("Awwal");
  const [filterExamTypeDropdown, setFilterExamTypeDropdown] = useState("Monthly");
  const [filterExamType, setFilterExamType] = useState("Monthly");
  
  const filteredExamsForMarks = exams.filter(e => 
    e.academicYear === filterYear && 
    e.class === `${filterDept} - ${filterSubClass}` &&
    e.examType === filterExamType
  );
  
  // Results
  const [selectedExamIdResults, setSelectedExamIdResults] = useState("");
  const [calculatedResults, setCalculatedResults] = useState([]);
  const [isViewingResultModal, setIsViewingResultModal] = useState(false);
  const [selectedStudentResult, setSelectedStudentResult] = useState(null);

  // States for UX
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingStudentPDF, setIsExportingStudentPDF] = useState(false);

  // Results Filters
  const [filterYearRes, setFilterYearRes] = useState(new Date().getFullYear().toString());
  const [filterDeptRes, setFilterDeptRes] = useState("Shob-e-Deeniyat");
  const [filterSubClassDropdownRes, setFilterSubClassDropdownRes] = useState("Awwal");
  const [filterSubClassRes, setFilterSubClassRes] = useState("Awwal");
  const [filterExamTypeDropdownRes, setFilterExamTypeDropdownRes] = useState("Monthly");
  const [filterExamTypeRes, setFilterExamTypeRes] = useState("Monthly");
  const [searchStudentRes, setSearchStudentRes] = useState("");

  const filteredExamsForResults = exams.filter(e => 
    e.academicYear === filterYearRes && 
    e.class === `${filterDeptRes} - ${filterSubClassRes}` &&
    e.examType === filterExamTypeRes
  );

  const filteredCalculatedResults = calculatedResults.filter(r => 
    searchStudentRes === "" || 
    r.fullName.toLowerCase().includes(searchStudentRes.toLowerCase()) || 
    (r.rollNumber && r.rollNumber.toString().toLowerCase().includes(searchStudentRes.toLowerCase()))
  );

  useEffect(() => {
    loadExams();
    loadStudents();
  }, []);

  const loadExams = async () => {
    try {
      const res = await examApi.listExams();
      setExams(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await studentApi.list();
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const subjectArray = examForm.subjects.split(",").map(s => s.trim()).filter(Boolean);
      if (subjectArray.length === 0) return alert("Please enter at least one subject.");

      const finalExamType = examForm.examType === "Other" ? examForm.customExamType : examForm.examType;
      if (examForm.examType === "Other" && !finalExamType.trim()) {
        return alert("Please enter the custom exam type.");
      }

      const finalClassSub = examForm.studentClassSub === "Other" ? examForm.customStudentClassSub : examForm.studentClassSub;
      if (examForm.studentClassSub === "Other" && !finalClassSub.trim()) {
        return alert("Please enter the custom class name.");
      }

      const payload = {
        name: examForm.examName ? `${examForm.examName} ${finalExamType}` : finalExamType,
        examType: finalExamType,
        examName: examForm.examName,
        academicYear: examForm.academicYear,
        class: `${examForm.studentClassCategory} - ${finalClassSub}`,
        subjects: subjectArray,
        maxMarks: Number(examForm.maxMarks),
        passingMarks: Number(examForm.passingMarks),
        date: examForm.date,
      };

      await examApi.createExam(payload);
      setIsAddExamOpen(false);
      setExamForm({ ...examForm, examName: "", customExamType: "", customStudentClassSub: "", subjects: "", date: "" });
      loadExams();
    } catch (err) {
      console.error(err);
      alert("Failed to create exam");
    }
  };

  // --- Enter Marks Flow ---
  const handleExamSelectMarks = async (examId) => {
    setSelectedExamIdMarks(examId);
    setSelectedSubject("");
    setMarksData({});
    
    const exam = exams.find(e => e._id === examId);
    if (!exam) return;

    // Filter students belonging to this class
    const cls = exam.class;
    const clsStudents = students.filter(s => (s.studentClass || s.className) === cls);
    setStudentsForMarks(clsStudents);
  };

  const handleSubjectSelectMarks = async (subject) => {
    setSelectedSubject(subject);
    if (!selectedExamIdMarks || !subject) return;

    setIsLoadingMarks(true);
    // Pre-fill existing marks if any
    try {
      const res = await examApi.listResults({ examId: selectedExamIdMarks, subject });
      const relevant = res.data || [];
      
      const newMarksData = {};
      relevant.forEach(r => {
        const sid = r.studentId?._id || r.studentId;
        newMarksData[sid] = r.marks;
      });
      setMarksData(newMarksData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMarks(false);
    }
  };

  const handleSaveBulkMarks = async () => {
    if (!selectedExamIdMarks || !selectedSubject) return alert("Select exam and subject.");
    
    const payloadRecords = Object.keys(marksData).map(studentId => ({
      studentId,
      marks: marksData[studentId] === "" ? null : marksData[studentId]
    }));

    try {
      await examApi.saveBulkMarks({
        examId: selectedExamIdMarks,
        subject: selectedSubject,
        records: payloadRecords
      });
      alert("Marks saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save marks. Check max marks limit.");
    }
  };

  // --- Results Flow ---
  const handleExamSelectResults = async (examId) => {
    setSelectedExamIdResults(examId);
    setResultsError("");
    setCalculatedResults([]);
    if (!examId) return;

    setIsLoadingResults(true);
    try {
      const res = await examApi.getCalculatedResults(examId);
      setCalculatedResults(res.data || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setResultsError("403 Unauthorized: You do not have permission to view results for this class.");
      } else {
        setResultsError("Failed to load results.");
      }
    } finally {
      setIsLoadingResults(false);
    }
  };

  const exportToCSV = () => {
    if (!filteredCalculatedResults.length) return;
    setIsExportingCSV(true);
    try {
      const headers = ["Roll Number", "Student Name", "Total Marks", "Obtained Marks", "Percentage", "Grade", "Status"];
      const rows = filteredCalculatedResults.map(r => [
        r.rollNumber || "-",
        `"${r.fullName}"`,
        r.totalMarks,
        r.obtainedMarks,
        r.percentage,
        r.grade,
        r.status
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `class_result_${selectedExamIdResults}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      console.error(e);
      alert("Failed to export to CSV");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const exportClassPDF = async () => {
    if (!selectedExamIdResults) return;
    setIsExportingPDF(true);
    try {
      await examApi.downloadPdf(`/pdf/class/result?examId=${selectedExamIdResults}`, `Class_Result_${selectedExamIdResults}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF for this class" : "Failed to export PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const exportStudentPDF = async (studentId) => {
    if (!selectedExamIdResults) return;
    setIsExportingStudentPDF(true);
    try {
      await examApi.downloadPdf(`/pdf/student/${studentId}/report-card?examId=${selectedExamIdResults}`, `Report_Card_${studentId}.pdf`);
    } catch(e) {
      console.error(e);
      alert(e.message === "403 Forbidden" ? "Unauthorized to export PDF" : "Failed to export PDF");
    } finally {
      setIsExportingStudentPDF(false);
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
          <h2 className="text-2xl font-bold tracking-tight">{tr("exams", "pageTitle")}</h2>
          <p className="text-muted-foreground mt-1">{tr("exams", "pageSubtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="marks">Enter Marks</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* --- EXAMS TAB --- */}
        <TabsContent value="exams" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Manage Exams</CardTitle>
                <CardDescription>Create and view scheduled exams.</CardDescription>
              </div>
              <Dialog open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Create Exam
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Create New Exam</DialogTitle>
                    <DialogDescription>Add a new exam to the schedule.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateExam} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Exam Type</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={examForm.examType}
                          onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Half-Yearly">Half-Yearly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {examForm.examType === "Other" && (
                        <div className="space-y-2">
                          <Label>Enter Other Exam Type <span className="text-red-500">*</span></Label>
                          <Input
                            required
                            placeholder="e.g. Weekly Test"
                            value={examForm.customExamType}
                            onChange={(e) => setExamForm({ ...examForm, customExamType: e.target.value })}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Exam Name / Month</Label>
                        <Input
                          placeholder="e.g. August Test"
                          value={examForm.examName}
                          onChange={(e) => setExamForm({ ...examForm, examName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Academic Year</Label>
                        <Input
                          required
                          value={examForm.academicYear}
                          onChange={(e) => setExamForm({ ...examForm, academicYear: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={examForm.studentClassCategory}
                          onChange={(e) => {
                            const cat = e.target.value;
                            setExamForm({ ...examForm, studentClassCategory: cat, studentClassSub: CLASS_TREE[cat][0] });
                          }}
                        >
                          {Object.keys(CLASS_TREE).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Class / Grade</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={examForm.studentClassSub}
                          onChange={(e) => setExamForm({ ...examForm, studentClassSub: e.target.value })}
                        >
                          {CLASS_TREE[examForm.studentClassCategory]?.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                      {examForm.studentClassSub === "Other" && (
                        <div className="space-y-2">
                          <Label>Enter Other Class <span className="text-red-500">*</span></Label>
                          <Input
                            required
                            placeholder="e.g. Special Batch"
                            value={examForm.customStudentClassSub}
                            onChange={(e) => setExamForm({ ...examForm, customStudentClassSub: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Subjects (Comma Separated)</Label>
                      <Input
                        required
                        placeholder="e.g. Quran, Hadith, Fiqh"
                        value={examForm.subjects}
                        onChange={(e) => setExamForm({ ...examForm, subjects: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Max Marks (per subject)</Label>
                        <Input
                          required type="number" min="1"
                          value={examForm.maxMarks}
                          onChange={(e) => setExamForm({ ...examForm, maxMarks: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Passing Marks</Label>
                        <Input
                          required type="number" min="0"
                          value={examForm.passingMarks}
                          onChange={(e) => setExamForm({ ...examForm, passingMarks: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date" required
                          value={examForm.date}
                          onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddExamOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Exam</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Max Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.length > 0 ? exams.map(exam => (
                    <TableRow key={exam._id}>
                      <TableCell className="font-semibold">{exam.name}</TableCell>
                      <TableCell>{exam.class}</TableCell>
                      <TableCell>{exam.academicYear}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {exam.subjects.map(s => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(exam.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">{exam.maxMarks}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No exams found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- MARKS TAB --- */}
        <TabsContent value="marks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Marks</CardTitle>
              <CardDescription>Select an exam and subject to enter marks for students.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <Label>Academic Year</Label>
                  <Input 
                    value={filterYear} 
                    onChange={(e) => { setFilterYear(e.target.value); setSelectedExamIdMarks(""); }} 
                  />
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterDept}
                    onChange={(e) => {
                      const dept = e.target.value;
                      setFilterDept(dept);
                      setFilterSubClass(CLASS_TREE[dept][0]);
                      setSelectedExamIdMarks("");
                    }}
                  >
                    {Object.keys(CLASS_TREE).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Class</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterSubClassDropdown}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setFilterSubClassDropdown(val); 
                      if (val !== "Other") setFilterSubClass(val);
                      else setFilterSubClass("");
                      setSelectedExamIdMarks(""); 
                    }}
                  >
                    {CLASS_TREE[filterDept]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  {filterSubClassDropdown === "Other" && (
                    <Input 
                      className="mt-2 h-8 text-sm"
                      placeholder="Enter Class" 
                      value={filterSubClass} 
                      onChange={(e) => { setFilterSubClass(e.target.value); setSelectedExamIdMarks(""); }}
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Exam Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterExamTypeDropdown}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setFilterExamTypeDropdown(val); 
                      if (val !== "Other") setFilterExamType(val);
                      else setFilterExamType("");
                      setSelectedExamIdMarks(""); 
                    }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Other">Other</option>
                  </select>
                  {filterExamTypeDropdown === "Other" && (
                    <Input 
                      className="mt-2 h-8 text-sm"
                      placeholder="Enter Exam Type" 
                      value={filterExamType} 
                      onChange={(e) => { setFilterExamType(e.target.value); setSelectedExamIdMarks(""); }}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 pt-4 border-t">
                <div className="space-y-1 w-full max-w-[250px]">
                  <Label>Select Exam</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={selectedExamIdMarks}
                    onChange={(e) => handleExamSelectMarks(e.target.value)}
                  >
                    <option value="">-- Choose Exam --</option>
                    {filteredExamsForMarks.map(e => <option key={e._id} value={e._id}>{e.name || e.examName || "Unnamed"}</option>)}
                  </select>
                </div>
                
                {selectedExamIdMarks && (
                  <div className="space-y-1 w-full max-w-[250px]">
                    <Label>Select Subject</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={selectedSubject}
                      onChange={(e) => handleSubjectSelectMarks(e.target.value)}
                    >
                      <option value="">-- Choose Subject --</option>
                      {exams.find(e => e._id === selectedExamIdMarks)?.subjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedSubject && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[100px]">Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="w-[200px] text-right">
                          Marks (Max: {exams.find(e => e._id === selectedExamIdMarks)?.maxMarks})
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingMarks ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading marks...</TableCell>
                        </TableRow>
                      ) : studentsForMarks.length > 0 ? studentsForMarks.map(student => (
                        <TableRow key={student._id}>
                          <TableCell className="font-mono text-xs">{student.rollNumber || "-"}</TableCell>
                          <TableCell className="font-medium">{student.fullName || student.name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="w-24 ml-auto text-right"
                              placeholder="Abs"
                              min="0"
                              max={exams.find(e => e._id === selectedExamIdMarks)?.maxMarks}
                              value={marksData[student._id] ?? ""}
                              onChange={(e) => setMarksData({...marksData, [student._id]: e.target.value})}
                            />
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6">No students found in this class.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {studentsForMarks.length > 0 && (
                    <div className="p-4 bg-muted/20 border-t flex justify-end">
                      <Button onClick={handleSaveBulkMarks}>Save Marks for {selectedSubject}</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- RESULTS TAB --- */}
        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Results</CardTitle>
              <CardDescription>View calculated results and student report cards.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <Label>Academic Year</Label>
                  <Input 
                    value={filterYearRes} 
                    onChange={(e) => { setFilterYearRes(e.target.value); setSelectedExamIdResults(""); }} 
                  />
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterDeptRes}
                    onChange={(e) => {
                      const dept = e.target.value;
                      setFilterDeptRes(dept);
                      setFilterSubClassDropdownRes(CLASS_TREE[dept][0]);
                      setFilterSubClassRes(CLASS_TREE[dept][0]);
                      setSelectedExamIdResults("");
                    }}
                  >
                    {Object.keys(CLASS_TREE).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Class</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterSubClassDropdownRes}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setFilterSubClassDropdownRes(val); 
                      if (val !== "Other") setFilterSubClassRes(val);
                      else setFilterSubClassRes("");
                      setSelectedExamIdResults(""); 
                    }}
                  >
                    {CLASS_TREE[filterDeptRes]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  {filterSubClassDropdownRes === "Other" && (
                    <Input 
                      className="mt-2 h-8 text-sm"
                      placeholder="Enter Class" 
                      value={filterSubClassRes} 
                      onChange={(e) => { setFilterSubClassRes(e.target.value); setSelectedExamIdResults(""); }}
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Exam Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterExamTypeDropdownRes}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setFilterExamTypeDropdownRes(val); 
                      if (val !== "Other") setFilterExamTypeRes(val);
                      else setFilterExamTypeRes("");
                      setSelectedExamIdResults(""); 
                    }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Other">Other</option>
                  </select>
                  {filterExamTypeDropdownRes === "Other" && (
                    <Input 
                      className="mt-2 h-8 text-sm"
                      placeholder="Enter Exam Type" 
                      value={filterExamTypeRes} 
                      onChange={(e) => { setFilterExamTypeRes(e.target.value); setSelectedExamIdResults(""); }}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6 pt-4 border-t items-end">
                <div className="space-y-1 w-full max-w-[250px]">
                  <Label>Select Exam</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={selectedExamIdResults}
                    onChange={(e) => handleExamSelectResults(e.target.value)}
                  >
                    <option value="">-- Choose Exam --</option>
                    {filteredExamsForResults.map(e => <option key={e._id} value={e._id}>{e.name || e.examName || "Unnamed"}</option>)}
                  </select>
                </div>
                
                {selectedExamIdResults && (
                  <div className="flex flex-wrap gap-2 w-full max-w-[500px] ml-auto justify-end">
                    <div className="space-y-1 w-full sm:w-[250px]">
                      <Label>Search Student</Label>
                      <Input 
                        placeholder="Search by name or roll no..."
                        value={searchStudentRes}
                        onChange={(e) => setSearchStudentRes(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button variant="outline" className="h-9" onClick={exportToCSV} disabled={isExportingCSV || !filteredCalculatedResults.length}>
                        {isExportingCSV ? "Exporting..." : "Excel (CSV)"}
                      </Button>
                      <Button variant="outline" className="h-9" onClick={exportClassPDF} disabled={isExportingPDF || !filteredCalculatedResults.length}>
                        {isExportingPDF ? "Exporting..." : "Class PDF"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedExamIdResults && (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Obtained / Total</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingResults ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Calculating results...</TableCell>
                        </TableRow>
                      ) : resultsError ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-6 text-red-500 font-medium">{resultsError}</TableCell>
                        </TableRow>
                      ) : filteredCalculatedResults.length > 0 ? filteredCalculatedResults.map(res => (
                        <TableRow key={res.studentId}>
                          <TableCell className="font-mono text-xs">{res.rollNumber || "-"}</TableCell>
                          <TableCell className="font-semibold">{res.fullName}</TableCell>
                          <TableCell className="font-medium text-emerald-700">{res.obtainedMarks} / {res.totalMarks}</TableCell>
                          <TableCell className="font-bold">{res.percentage}%</TableCell>
                          <TableCell className="font-bold text-lg">{res.grade}</TableCell>
                          <TableCell>
                            {res.status === "Pass" ? (
                              <Badge variant="soft-success" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3" /> Pass
                              </Badge>
                            ) : (
                              <Badge variant="soft-danger" className="gap-1 bg-red-50 text-red-700 border-red-200">
                                <XCircle className="w-3 h-3" /> Fail
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedStudentResult(res);
                              setIsViewingResultModal(true);
                            }}>
                              Report Card
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No result data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Card Modal */}
      <Dialog open={isViewingResultModal} onOpenChange={setIsViewingResultModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Report Card</DialogTitle>
          </DialogHeader>
          {selectedStudentResult && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold">{selectedStudentResult.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudentResult.studentClass}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll No</p>
                  <p className="font-mono">{selectedStudentResult.rollNumber || "—"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Subject Wise Marks</h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableBody>
                      {Object.entries(selectedStudentResult.subjectMarks).map(([subj, mks]) => (
                        <TableRow key={subj}>
                          <TableCell className="py-2 text-sm font-medium">{subj}</TableCell>
                          <TableCell className="py-2 text-sm text-right">
                            {mks === null || mks === "Absent" ? <span className="text-red-500 font-semibold text-xs uppercase tracking-wider">Absent</span> : mks}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Marks</p>
                  <p className="text-xl font-bold mt-1">{selectedStudentResult.obtainedMarks} <span className="text-sm text-muted-foreground font-normal">/ {selectedStudentResult.totalMarks}</span></p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Percentage</p>
                  <p className="text-xl font-bold mt-1">{selectedStudentResult.percentage}%</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Grade</p>
                  <p className="text-xl font-bold mt-1">{selectedStudentResult.grade}</p>
                </div>
                <div className={`col-span-3 p-3 rounded-lg ${selectedStudentResult.status === 'Pass' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${selectedStudentResult.status === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>Status</p>
                  <p className={`text-xl font-bold mt-1 ${selectedStudentResult.status === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>{selectedStudentResult.status}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-between items-center">
            <BackButton onClick={() => setIsViewingResultModal(false)} />
            {selectedStudentResult && (
              <Button onClick={() => exportStudentPDF(selectedStudentResult.studentId)} disabled={isExportingStudentPDF}>
                {isExportingStudentPDF ? "Downloading..." : "Download PDF"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
