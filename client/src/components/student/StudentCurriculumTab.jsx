import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { curriculumApi } from "@/lib/api";
import { Book, CheckCircle, Clock, Loader2, Play } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuth } from "@/context/AuthContext";

export function StudentCurriculumTab({ student }) {
  const studentId = student?._id || student?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Can update progress if admin, or maybe a teacher (though RBAC says teacher who teaches class)
  const canUpdate = user?.role === "admin" || user?.role === "teacher";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    lessonFrom: "",
    lessonTo: "",
    remarks: ""
  });

  const { data: currRes, isLoading } = useQuery({
    queryKey: ["student-curriculum", studentId],
    queryFn: () => curriculumApi.getByStudent(studentId),
    enabled: !!studentId,
  });

  const curriculums = currRes?.data || [];

  const progressMutation = useMutation({
    mutationFn: (data) => curriculumApi.logLearningProgress(selectedCurriculum._id, studentId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["student-curriculum", studentId]);
      toast({ title: "Learning Progress Logged", description: res.message });
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to log progress" });
    }
  });

  const handleOpenLog = (curr) => {
    setSelectedCurriculum(curr);
    const maxCompleted = curr.studentCompletedLessons || 0;
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      lessonFrom: (maxCompleted + 1).toString(),
      lessonTo: (maxCompleted + 1).toString(),
      remarks: ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    progressMutation.mutate(formData);
  };

  const calculateStudentPercentage = (curr) => {
    if (curr.totalLessons > 0) {
      const completed = curr.studentCompletedLessons || 0;
      return Math.min(100, Math.round((completed / curr.totalLessons) * 100));
    }
    return 0; // Legacy progress is not stored for student specifically, so default to 0
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (curriculums.length === 0) {
    return (
      <div className="text-center p-12 border rounded-md bg-muted/20">
        <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No Class Syllabus Found</h3>
        <p className="text-muted-foreground">This student's class does not have an active curriculum assignment yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {curriculums.map((curr) => (
          <Card key={curr._id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${
                curr.studentStatus === 'Completed' || curr.studentStatus === 'Ahead' ? 'bg-green-500' :
                curr.studentStatus === 'Behind' || curr.studentStatus === 'Delayed' ? 'bg-amber-500' :
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
                <div className="text-xs font-medium text-muted-foreground">
                  Teacher: {curr.teacherId?.name || "Unassigned"}
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
                  <span className="text-muted-foreground block text-xs uppercase">Student Status</span>
                  <span className="font-medium">{curr.studentStatus}</span>
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
                  <span className="font-medium">Learning Progress</span>
                  <span className="font-bold">{calculateStudentPercentage(curr)}%</span>
                </div>
                <ProgressBar value={calculateStudentPercentage(curr)} className="h-2 bg-blue-100 dark:bg-blue-900/30">
                   {/* Custom indicator color if needed, else ProgressBar uses primary */}
                </ProgressBar>
                {curr.totalLessons > 0 ? (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {curr.studentCompletedLessons || 0} of {curr.totalLessons} lessons mastered
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    Requires new Curriculum Assignment format
                  </p>
                )}
              </div>

              {canUpdate && curr.totalLessons > 0 && (
                <Button className="w-full" variant="outline" onClick={() => handleOpenLog(curr)}>
                  <Play className="h-4 w-4 mr-2" /> Log Student Progress
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Student Learning Progress</DialogTitle>
          </DialogHeader>
          {selectedCurriculum && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="bg-muted p-3 rounded-md mb-4 text-sm">
                <strong>Subject:</strong> {selectedCurriculum.subject} ({selectedCurriculum.book})
              </div>
              
              <div className="grid gap-2">
                <Label>Date Mastered</Label>
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
