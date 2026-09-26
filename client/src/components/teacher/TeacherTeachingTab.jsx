import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { curriculumApi, classApi } from "@/lib/api";
import { Book, CheckCircle, Clock, Loader2, Play } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/context/AuthContext";

export function TeacherTeachingTab({ teacher }) {
  const teacherId = teacher?._id || teacher?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Can only update progress if admin or the teacher themselves
  const canUpdate = user?.role === "admin" || (user?.role === "teacher" && user?.teacherId === teacherId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    lessonFrom: "",
    lessonTo: "",
    topic: "",
    remarks: ""
  });


  const { data: currRes, isLoading } = useQuery({
    queryKey: ["teacher-curriculum", teacherId],
    queryFn: () => curriculumApi.getByTeacher(teacherId),
    enabled: !!teacherId,
  });

  const { data: classRes } = useQuery({
    queryKey: ["classes-for-teaching-tab"],
    queryFn: () => classApi.getClasses(),
  });
  const apiClasses = classRes?.data || [];


  const curriculums = currRes?.data || [];

  const progressMutation = useMutation({
    mutationFn: (data) => curriculumApi.logTeachingProgress(selectedCurriculum._id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["teacher-curriculum", teacherId]);
      toast({ title: "Progress Logged", description: res.message });
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to log progress" });
    }
  });

  const handleOpenLog = (curr) => {
    setSelectedCurriculum(curr);
    // Find the next logical lesson to start from
    const maxCompleted = curr.completedLessonsList?.length > 0 
      ? Math.max(...curr.completedLessonsList) 
      : 0;
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      lessonFrom: (maxCompleted + 1).toString(),
      lessonTo: (maxCompleted + 1).toString(),
      topic: "",
      remarks: ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    progressMutation.mutate(formData);
  };

  const calculatePercentage = (curr) => {
    if (curr.totalLessons > 0) {
      const completed = curr.completedLessonsList?.length || 0;
      return Math.min(100, Math.round((completed / curr.totalLessons) * 100));
    }
    return curr.progress || 0;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (curriculums.length === 0) {
    return (
      <div className="text-center p-12 border rounded-md bg-muted/20">
        <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Assigned Curriculum</h3>
        <p className="text-muted-foreground">This teacher has not been assigned to any central curriculum yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Teaching Assignments Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">Teaching Assignments</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {(!teacher.teachingAssignments || teacher.teachingAssignments.length === 0) ? (
            <div className="text-sm text-muted-foreground italic">No teaching assignments</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class Teacher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacher.teachingAssignments.map((a, idx) => {
                  const classObj = apiClasses.find(c => c._id === a.classId);
                  const isClassTeacher = teacher.isClassTeacher && teacher.classTeacherOf === a.classId;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{classObj ? classObj.fullName : "Unknown Class"}</TableCell>
                      <TableCell>{a.subjectId}</TableCell>
                      <TableCell>
                        {isClassTeacher ? (
                           <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 text-xs font-medium">Yes</span>
                        ) : (
                           <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-1">Class Teacher Of:</h4>
            <div className="text-sm text-muted-foreground">
              {teacher.isClassTeacher && teacher.classTeacherOf 
                ? (apiClasses.find(c => c._id === teacher.classTeacherOf)?.fullName || "Unknown Class") 
                : "No class assigned as Class Teacher"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {curriculums.map((curr) => (
          <Card key={curr._id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${
                curr.status === 'Completed' || curr.status === 'Ahead' ? 'bg-green-500' :
                curr.status === 'Behind' || curr.status === 'Delayed' ? 'bg-amber-500' :
                'bg-blue-500'
            }`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{curr.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Book className="h-3.5 w-3.5" /> {curr.book}
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {curr.classId?.fullName || "Unassigned Class"}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase">Academic Year</span>
                  <span className="font-medium">{curr.academicYear || "Legacy"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase">Status</span>
                  <span className="font-medium">{curr.status}</span>
                </div>
                {curr.totalLessons > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs uppercase">Target</span>
                    <span className="font-medium">{curr.annualTarget} / {curr.totalLessons} Lessons</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-medium">Teaching Progress</span>
                  <span className="font-bold">{calculatePercentage(curr)}%</span>
                </div>
                <ProgressBar value={calculatePercentage(curr)} className="h-2" />
                {curr.totalLessons > 0 ? (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {curr.completedLessonsList?.length || 0} of {curr.totalLessons} lessons completed
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    Legacy Progress Record
                  </p>
                )}
              </div>

              {canUpdate && curr.totalLessons > 0 && (
                <Button className="w-full" variant="outline" onClick={() => handleOpenLog(curr)}>
                  <Play className="h-4 w-4 mr-2" /> Log Teaching Progress
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Teaching Progress</DialogTitle>
          </DialogHeader>
          {selectedCurriculum && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="bg-muted p-3 rounded-md mb-4 text-sm">
                <strong>Subject:</strong> {selectedCurriculum.subject} ({selectedCurriculum.book})
              </div>
              
              <div className="grid gap-2">
                <Label>Date Taught</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>From Lesson/Unit No.</Label>
                  <Input type="number" min="1" value={formData.lessonFrom} onChange={e => setFormData({...formData, lessonFrom: e.target.value})} required />
                </div>
                <div className="grid gap-2">
                  <Label>To Lesson/Unit No.</Label>
                  <Input type="number" min="1" value={formData.lessonTo} onChange={e => setFormData({...formData, lessonTo: e.target.value})} required />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Topic Covered (Optional)</Label>
                <Input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} placeholder="e.g. Intro to Tajweed" />
              </div>
              
              <div className="grid gap-2">
                <Label>Remarks (Optional)</Label>
                <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={progressMutation.isPending}>
                  {progressMutation.isPending ? "Saving..." : "Save Progress"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
