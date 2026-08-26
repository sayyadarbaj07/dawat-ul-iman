import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileEdit, CalendarDays, Plus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { examApi, studentApi } from "@/lib/api";

export default function Exams() {
  const { tr } = useLanguage();
  const [activeTab, setActiveTab] = useState("upcoming");

  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);

  // Modals state
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isEnterMarksOpen, setIsEnterMarksOpen] = useState(false);

  // Forms state
  const [examForm, setExamForm] = useState({
    name: "",
    class: "diniyat",
    date: "",
    duration: "",
  });

  const [markForm, setMarkForm] = useState({
    examId: "",
    studentId: "",
    marks: "",
  });

  useEffect(() => {
    loadExams();
    loadResults();
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

  const loadResults = async () => {
    try {
      const res = await examApi.listResults();
      setResults(res.data || []);
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
      await examApi.createExam(examForm);
      setIsAddExamOpen(false);
      setExamForm({ name: "", class: "diniyat", date: "", duration: "" });
      loadExams();
    } catch (err) {
      console.error(err);
      alert("Failed to create exam");
    }
  };

  const handleSaveMarks = async (e) => {
    e.preventDefault();
    try {
      await examApi.saveResult({
        examId: markForm.examId,
        studentId: markForm.studentId,
        marks: Number(markForm.marks),
      });
      setIsEnterMarksOpen(false);
      setMarkForm({ examId: "", studentId: "", marks: "" });
      loadResults();
    } catch (err) {
      console.error(err);
      alert("Failed to save marks");
    }
  };

  // Compute rank dynamically
  const sortedResults = [...results].sort((a, b) => b.marks - a.marks);
  const resultsWithRank = sortedResults.map((r, i) => ({ ...r, rank: i + 1 }));

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
        <div className="flex gap-2">
          {/* Create Exam Modal */}
          <Dialog open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Create Exam
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
                <DialogDescription>Add a new exam to the schedule.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateExam} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Exam Name</Label>
                  <Input
                    required
                    placeholder="e.g. Monthly Test"
                    value={examForm.name}
                    onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class / Department</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={examForm.class}
                    onChange={(e) => setExamForm({ ...examForm, class: e.target.value })}
                  >
                    <option value="diniyat">Diniyat</option>
                    <option value="arabic">Arabic</option>
                    <option value="contemporary">Contemporary</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    required
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    required
                    placeholder="e.g. 2 Hours"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                  />
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

          {/* Enter Marks Modal */}
          <Dialog open={isEnterMarksOpen} onOpenChange={setIsEnterMarksOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileEdit className="mr-2 h-4 w-4" /> {tr("exams", "enterMarks")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tr("exams", "enterMarks")}</DialogTitle>
                <DialogDescription>Record a student's marks for an exam.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveMarks} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Exam</Label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={markForm.examId}
                    onChange={(e) => setMarkForm({ ...markForm, examId: e.target.value })}
                  >
                    <option value="" disabled>Select an exam</option>
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.name} ({ex.class})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={markForm.studentId}
                    onChange={(e) => setMarkForm({ ...markForm, studentId: e.target.value })}
                  >
                    <option value="" disabled>Select a student</option>
                    {students.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.fullName || st.name} - {st.rollNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Marks (Out of 100)</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    max="100"
                    placeholder="e.g. 85"
                    value={markForm.marks}
                    onChange={(e) => setMarkForm({ ...markForm, marks: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEnterMarksOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Marks</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">{tr("exams", "upcomingExams")}</TabsTrigger>
          <TabsTrigger value="results">{tr("exams", "recentResults")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tr("exams", "examSchedule")}</CardTitle>
              <CardDescription>{tr("exams", "examScheduleDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("exams", "examName")}</TableHead>
                    <TableHead>{tr("exams", "classDepartment")}</TableHead>
                    <TableHead>{tr("exams", "date")}</TableHead>
                    <TableHead>{tr("exams", "duration")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.length > 0 ? (
                    exams.map((exam) => (
                      <TableRow key={exam._id}>
                        <TableCell className="font-medium">{exam.name}</TableCell>
                        <TableCell className="capitalize">{exam.class}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                            {new Date(exam.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{exam.duration}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => {
                            setMarkForm({ ...markForm, examId: exam._id });
                            setIsEnterMarksOpen(true);
                          }}>
                            Enter Marks
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No upcoming exams scheduled.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tr("exams", "topPerformers")}</CardTitle>
              <CardDescription>{tr("exams", "topPerformersDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("exams", "rank")}</TableHead>
                    <TableHead>{tr("students", "studentName")}</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>{tr("students", "classLabel")}</TableHead>
                    <TableHead className="text-right">{tr("exams", "percentage")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultsWithRank.length > 0 ? (
                    resultsWithRank.map((result) => (
                      <TableRow key={result._id}>
                        <TableCell>
                          {result.rank <= 3 ? (
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold
                            ${result.rank === 1 ? "bg-yellow-500" : result.rank === 2 ? "bg-gray-400" : "bg-amber-700"}`}
                            >
                              {result.rank}
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 font-bold">
                              {result.rank}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {result.studentId?.fullName || result.studentId?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{result.examId?.name || "Unknown"}</TableCell>
                        <TableCell className="capitalize">
                          {result.studentId?.className || "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {result.marks}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
