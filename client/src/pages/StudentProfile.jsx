import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackButton } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { User, MapPin, Phone, Mail, Calendar, Info, FileText, CheckCircle, Clock } from "lucide-react";
import { studentApi, attendanceApi, examApi, pdfApi } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedDate, getLocalizedStudentName } from "@/utils/localizationUtils";
import { StudentDocumentManager } from "@/components/students/StudentDocumentManager";
import { StudentHostelManager } from "@/components/students/StudentHostelManager";
import { StudentTimeline } from "@/components/students/StudentTimeline";
import { StudentCurriculumTab } from '@/components/student/StudentCurriculumTab';
import { useAuth } from "@/context/AuthContext";

export default function StudentProfile() {
  const { studentId } = useParams();
  const [, setLocation] = useLocation();
  const { tr, language } = useLanguage();
  
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user } = useAuth();
  
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  const [academicHistory, setAcademicHistory] = useState([]);
  const [loadingAcademic, setLoadingAcademic] = useState(false);
  
  const [isExportingPDF, setIsExportingPDF] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await studentApi.get(studentId);
        if (res.data) {
          setStudent(res.data);
          loadAttendance(studentId);
          loadAcademic(studentId);
        } else {
          setError("Profile not found.");
        }
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Unauthorized to view this profile.");
        } else if (err.response?.status === 404) {
          setError("Student not found.");
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        setLoading(false);
      }
    };
    if (studentId) fetchProfile();
  }, [studentId]);

  const loadAttendance = async (id) => {
    try {
      setLoadingAttendance(true);
      const res = await attendanceApi.getStudentSummary(id);
      if (res.data) setAttendanceSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const loadAcademic = async (id) => {
    try {
      setLoadingAcademic(true);
      const res = await examApi.getStudentHistoricalResults(id);
      if (res.data) setAcademicHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAcademic(false);
    }
  };

  const exportIdCard = async () => {
    setIsExportingPDF('id_card');
    try {
      await pdfApi.downloadPdf(pdfApi.getStudentIdCard(studentId, language), `ID_Card_${studentId}_${language}.pdf`);
    } catch(e) {
      alert("Failed to export ID Card");
    } finally {
      setIsExportingPDF(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p>{tr("common", "loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <BackButton fallback="/students" />
        <EmptyState
          icon={User}
          title={error || "Not Found"}
          description="The student profile you are looking for does not exist or you do not have permission to view it."
          action={{
            label: "Back to Directory",
            onClick: () => setLocation("/students")
          }}
        />
      </div>
    );
  }

  // Derive class/dept from classId or fallback
  const className = student.classId?.fullName || student.className || "Unknown Class";
  const department = student.classId?.department || "Unknown Department";

  const renderValue = (value) => (value ? value : "—");

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton fallback="/students" />
          <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center shrink-0">
            {student.photo ? (
              <img src={`http://localhost:5000${student.photo}`} alt={student.name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold" dir="auto">{getLocalizedStudentName(student, language)}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span dir="ltr">ID: {student.studentId}</span>
              <span>•</span>
              <span dir="ltr">Roll: {renderValue(student.rollNumber)}</span>
              <span>•</span>
              <Badge variant="outline">{className}</Badge>
              <Badge variant={student.status === "active" ? "success" : "secondary"}>
                {tr("students", student.status) || student.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={exportIdCard} disabled={isExportingPDF === 'id_card'} className="w-full md:w-auto">
            <FileText className="w-4 h-4 mr-2" />
            Print ID Card
          </Button>
          <Button onClick={() => setLocation('/students')} className="w-full md:w-auto">
            Directory (Edit)
          </Button>
        </div>
      </div>

      {/* TABS SECTION */}
      <Tabs defaultValue="overview" className="w-full" dir={language === 'ur' ? 'rtl' : 'ltr'}>
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-full justify-start h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="admission">Admission</TabsTrigger>
            <TabsTrigger value="guardian">Guardian</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="hostel">Hostel</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            {user?.role !== 'accountant' && (
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium capitalize">{department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{className}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission Number</p>
                  <p className="font-medium" dir="ltr">{renderValue(student.admissionNumber)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Residential Status</p>
                  <p className="font-medium">{student.residential ? tr("students", "residential") : tr("students", "dayScholar")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAttendance ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : attendanceSummary ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall</span>
                      <span className="text-lg font-bold text-primary">{attendanceSummary.percentage}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-2 rounded">
                        Present: {attendanceSummary.present || 0}
                      </div>
                      <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-2 rounded">
                        Absent: {attendanceSummary.absent || 0}
                      </div>
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 p-2 rounded">
                        Leave: {attendanceSummary.leave || 0}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attendance data available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. PERSONAL INFO TAB */}
        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Name (English)</p>
                <p className="font-medium">{renderValue(student.name)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name (Urdu)</p>
                <p className="font-medium" dir="rtl">{renderValue(student.nameUrdu)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Father's Name</p>
                <p className="font-medium">{renderValue(student.fatherName)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mother's Name</p>
                <p className="font-medium">{renderValue(student.motherName)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{student.dateOfBirth ? formatLocalizedDate(student.dateOfBirth, language) : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{student.age !== undefined && student.age !== null ? `${student.age} years` : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{renderValue(student.gender)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile</p>
                <p className="font-medium" dir="ltr">{renderValue(student.contactNumber)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp</p>
                <p className="font-medium" dir="ltr">{renderValue(student.whatsapp)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" dir="ltr">{renderValue(student.email)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{renderValue(student.address)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{renderValue(student.city)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">District</p>
                <p className="font-medium">{renderValue(student.district)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">State</p>
                <p className="font-medium">{renderValue(student.state)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PIN Code</p>
                <p className="font-medium" dir="ltr">{renderValue(student.pinCode)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ADMISSION TAB */}
        <TabsContent value="admission" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Admission Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Admission Number</p>
                <p className="font-medium" dir="ltr">{renderValue(student.admissionNumber)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission Date</p>
                <p className="font-medium">{student.admissionDate ? formatLocalizedDate(student.admissionDate, language) : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission Year</p>
                <p className="font-medium" dir="ltr">{renderValue(student.admissionYear)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joining Date</p>
                <p className="font-medium">{student.joiningDate ? formatLocalizedDate(student.joiningDate, language) : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previous Institution</p>
                <p className="font-medium">{renderValue(student.previousInstitution)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Previous Class</p>
                <p className="font-medium">{renderValue(student.previousClass)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission Reference</p>
                <p className="font-medium">{renderValue(student.admissionReference)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. GUARDIAN TAB */}
        <TabsContent value="guardian" className="mt-6">
          {student.guardians && student.guardians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.guardians.map((g, idx) => (
                <Card key={idx} className={g.emergencyContact ? "border-primary/50" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{g.name || "Unnamed Guardian"}</span>
                      {g.emergencyContact && <Badge variant="destructive">Emergency Contact</Badge>}
                    </CardTitle>
                    <CardDescription>{g.relation || "Unknown Relation"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex gap-2 items-center"><Phone className="h-4 w-4 text-muted-foreground"/> <span dir="ltr">{renderValue(g.mobile)}</span></div>
                    {g.whatsapp && <div className="flex gap-2 items-center"><Phone className="h-4 w-4 text-muted-foreground"/> <span dir="ltr">WA: {g.whatsapp}</span></div>}
                    <div className="flex gap-2 items-center"><MapPin className="h-4 w-4 text-muted-foreground"/> <span>{renderValue(g.address)}</span></div>
                    {g.occupation && <div className="flex gap-2 items-center"><Info className="h-4 w-4 text-muted-foreground"/> <span>{g.occupation}</span></div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Guardian (Legacy Data)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {student.guardianName || student.guardianContact || student.guardianRelation ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{renderValue(student.guardianName)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Relation</p>
                      <p className="font-medium">{renderValue(student.guardianRelation)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium" dir="ltr">{renderValue(student.guardianContact)}</p>
                    </div>
                  </>
                ) : (
                   <p className="text-sm text-muted-foreground sm:col-span-2">No guardian information found.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 5. ACADEMIC TAB */}
        <TabsContent value="academic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAcademic ? (
                <p className="text-sm text-muted-foreground">Loading academic history...</p>
              ) : academicHistory && academicHistory.length > 0 ? (
                <div className="space-y-4">
                  {academicHistory.map((record, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-md bg-muted/20">
                      <div>
                        <p className="font-medium">{record.examName || "Exam"}</p>
                        <p className="text-sm text-muted-foreground" dir="ltr">{record.academicYear}</p>
                      </div>
                      <Badge variant="outline">{record.grade || "No Grade"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No Academic Records"
                  description="No historical academic or exam records were found for this student."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5.5 CURRICULUM TAB */}
        <TabsContent value="curriculum" className="mt-6">
          <StudentCurriculumTab student={student} />
        </TabsContent>

        {/* 6. ATTENDANCE TAB */}
        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAttendance ? (
                 <p className="text-sm text-muted-foreground">Loading attendance...</p>
              ) : attendanceSummary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceSummary.present || 0}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{attendanceSummary.absent || 0}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{attendanceSummary.leave || 0}</p>
                      <p className="text-xs text-muted-foreground">Leave</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{attendanceSummary.late || 0}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-4 border-t">Full date-wise attendance is managed in the Attendance module.</p>
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No Attendance Data"
                  description="No attendance records found for this student."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. HOSTEL TAB */}
        <TabsContent value="hostel" className="mt-6">
          <StudentHostelManager student={student} studentId={studentId} />
        </TabsContent>

        {/* 8. DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <StudentDocumentManager studentId={studentId} />
        </TabsContent>

        {/* 9. TIMELINE TAB */}
        {user?.role !== 'accountant' && (
          <TabsContent value="timeline" className="mt-6">
            <StudentTimeline studentId={studentId} />
          </TabsContent>
        )}

      </Tabs>
    </motion.div>
  );
}
