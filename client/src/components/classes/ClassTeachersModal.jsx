import React from "react";
import { useQuery } from "@tanstack/react-query";
import { teacherApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, UserCheck, BookOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClassTeachersModal({ open, onOpenChange, classData }) {
  const { data: teachersResponse, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.list(),
  });

  const teachers = teachersResponse?.data || [];
  
  const classTeacher = teachers.find(t => t.isClassTeacher && t.classTeacherOf === classData?._id);
  
  // Find subject teachers for this class
  const subjectTeachers = [];
  teachers.forEach(t => {
    if (t.teachingAssignments) {
      t.teachingAssignments.forEach(a => {
        if (a.classId === classData?._id) {
          subjectTeachers.push({ teacherName: t.name, subject: a.subjectId, designation: t.designation });
        }
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teachers for {classData?.fullName}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Class Teacher
              </h3>
              <div className="text-lg font-medium">
                {classTeacher ? (
                  <div>
                    {classTeacher.name} 
                    {classTeacher.designation && <span className="text-sm text-muted-foreground ml-2">({classTeacher.designation})</span>}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No Class Teacher Assigned</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Subject Teachers
              </h3>
              {subjectTeachers.length > 0 ? (
                <div className="rounded-md border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Designation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectTeachers.map((st, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{st.subject}</TableCell>
                          <TableCell>{st.teacherName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{st.designation || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-4 border rounded-lg text-center text-muted-foreground bg-muted/10">
                  No subject teachers assigned yet.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
