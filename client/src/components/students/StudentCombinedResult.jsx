import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { reportApi } from "@/lib/api/report";
import { pdfApi } from "@/lib/api/pdf";
import { useToast } from "@/hooks/use-toast";
import { Award, FileDown, GraduationCap, Loader2 } from "lucide-react";

export function StudentCombinedResult({ studentId }) {
  const { tr, language } = useLanguage();
  const { toast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCombinedResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await reportApi.getCombinedResult(studentId);
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Combined Result fetch error:", err);
        if (isMounted) {
          setError(tr("combinedResult", "error") || "Error loading combined result");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    if (studentId) {
      fetchCombinedResult();
    }
    return () => { isMounted = false; };
  }, [studentId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = pdfApi.getCombinedResultPdf(studentId, { language });
      const filename = `Combined_Result_${studentId}_${language}.pdf`;
      await pdfApi.downloadPdf(url, filename);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to download Combined Result PDF",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getStudentName = () => {
    if (!data?.student) return "";
    if (language === 'ur' && data.student.nameUrdu) {
      return data.student.nameUrdu;
    }
    return data.student.name || "";
  };

  if (loading) {
    return (
      <Card className="mt-6 border-primary/20">
        <CardContent className="p-6 flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">{tr("combinedResult", "loading") || "Loading..."}</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6 border-destructive/50">
        <CardContent className="p-6 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.madrasa?.resultsAvailable && (!data.school || !data.school.resultsAvailable))) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {tr("combinedResult", "title") || "COMBINED RESULT"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={GraduationCap}
            title={tr("combinedResult", "resultNotAvailable") || "Result not available"}
            description="No examination results found for this student."
          />
        </CardContent>
      </Card>
    );
  }

  const { student, madrasa, school, combined } = data;
  const isRtl = language === 'ur';

  return (
    <Card className="mt-6 overflow-hidden border-primary/20" dir={isRtl ? "rtl" : "ltr"}>
      <CardHeader className="bg-primary/5 pb-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <CardTitle className="text-xl flex items-center gap-2 text-primary">
          <Award className="w-6 h-6" />
          {tr("combinedResult", "title") || "COMBINED RESULT"}
        </CardTitle>
        <Button 
          onClick={handleDownload} 
          disabled={isDownloading}
          className="w-full sm:w-auto shadow-sm"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          {tr("combinedResult", "download") || "Download Combined Result"}
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg mb-4 text-foreground/90 flex items-center gap-2">
            {tr("combinedResult", "studentInformation") || "Student Information"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{tr("students", "name") || "Name"}:</span>
              <span className="font-medium text-base">{getStudentName()}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">{tr("combinedResult", "admissionNo") || "Admission No"}:</span>
              <span className="font-medium">{student.admissionNumber || "—"}</span>
            </div>
            
            {/* Madrasa Class */}
            <div className="flex flex-col gap-1 bg-muted/30 p-3 rounded-md border border-border/50">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                {tr("combinedResult", "deeniEducation") || "DEENI / MADRASA"}
              </span>
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">{tr("combinedResult", "class") || "Class"}:</span>
                <span className="font-medium">{student.madrasaClass || "—"}</span>
              </div>
            </div>

            {/* School Class */}
            <div className="flex flex-col gap-1 bg-muted/30 p-3 rounded-md border border-border/50">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                {tr("combinedResult", "asriEducation") || "ASRI / SCHOOL"}
              </span>
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">{tr("combinedResult", "schoolClass") || "School Class"}:</span>
                <span className="font-medium">{student.schoolClass || "—"}</span>
              </div>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-muted-foreground">{tr("combinedResult", "section") || "Section"}:</span>
                <span className="font-medium">{student.schoolSection || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PART A: Madrasa */}
        {madrasa && madrasa.resultsAvailable && (
          <div className="p-6 border-b">
            <h3 className="font-bold text-lg mb-4 text-primary">
              {tr("combinedResult", "deeniEducation") || "PART (A) — DEENI EDUCATION"}
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className={`px-4 py-3 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{tr("combinedResult", "subject") || "Subject"}</th>
                    <th className="px-4 py-3 font-medium text-center">{tr("combinedResult", "maximumMarks") || "Max Marks"}</th>
                    <th className="px-4 py-3 font-medium text-center">{tr("combinedResult", "obtainedMarks") || "Obtained"}</th>
                    <th className={`px-4 py-3 font-medium ${isRtl ? 'text-left' : 'text-right'}`}>{tr("combinedResult", "remarks") || "Remarks"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {madrasa.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{sub.subject}</td>
                      <td className="px-4 py-3 text-center">{sub.maxMarks}</td>
                      <td className="px-4 py-3 text-center font-semibold">{sub.marks === -1 ? (tr("reports", "absent") || "Absent") : sub.marks}</td>
                      <td className={`px-4 py-3 ${isRtl ? 'text-left' : 'text-right'}`}>
                        {sub.marks === -1 ? "—" : (sub.marks >= sub.passingMarks ? (tr("reports", "pass") || "Pass") : (tr("reports", "fail") || "Fail"))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-primary/5 font-semibold">
                  <tr>
                    <td className="px-4 py-3">{tr("combinedResult", "total") || "Total"}</td>
                    <td className="px-4 py-3 text-center">{madrasa.totals.maxMarks}</td>
                    <td className="px-4 py-3 text-center">{madrasa.totals.obtainedMarks}</td>
                    <td className={`px-4 py-3 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {madrasa.totals.percentage.toFixed(2)}% ({madrasa.totals.grade})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* PART B: School */}
        <div className="p-6 border-b bg-muted/10">
          <h3 className="font-bold text-lg mb-4 text-primary">
            {tr("combinedResult", "asriEducation") || "PART (B) — ASRI EDUCATION"}
          </h3>
          
          {school && school.resultsAvailable ? (
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className={`px-4 py-3 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{tr("combinedResult", "subject") || "Subject"}</th>
                    <th className="px-4 py-3 font-medium text-center">{tr("combinedResult", "maximumMarks") || "Max Marks"}</th>
                    <th className="px-4 py-3 font-medium text-center">{tr("combinedResult", "obtainedMarks") || "Obtained"}</th>
                    <th className={`px-4 py-3 font-medium ${isRtl ? 'text-left' : 'text-right'}`}>{tr("combinedResult", "remarks") || "Remarks"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {school.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{sub.subject}</td>
                      <td className="px-4 py-3 text-center">{sub.maxMarks}</td>
                      <td className="px-4 py-3 text-center font-semibold">{sub.marks === -1 ? (tr("reports", "absent") || "Absent") : sub.marks}</td>
                      <td className={`px-4 py-3 ${isRtl ? 'text-left' : 'text-right'}`}>
                        {sub.marks === -1 ? "—" : (sub.marks >= sub.passingMarks ? (tr("reports", "pass") || "Pass") : (tr("reports", "fail") || "Fail"))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-primary/5 font-semibold">
                  <tr>
                    <td className="px-4 py-3">{tr("combinedResult", "total") || "Total"}</td>
                    <td className="px-4 py-3 text-center">{school.totals.maxMarks}</td>
                    <td className="px-4 py-3 text-center">{school.totals.obtainedMarks}</td>
                    <td className={`px-4 py-3 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {school.totals.percentage.toFixed(2)}% ({school.totals.grade})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-4 border rounded-md border-dashed bg-muted/30 text-muted-foreground flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40"></span>
              {tr("combinedResult", "schoolResultNotAvailable") || "School result not available"}
            </div>
          )}
        </div>

        {/* COMBINED TOTALS */}
        {combined && (
          <div className="p-6 bg-primary/5">
            <h3 className="font-bold text-lg mb-4 text-primary flex items-center gap-2">
              <Award className="w-5 h-5" />
              {tr("combinedResult", "combinedResult") || "COMBINED RESULT"}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">{tr("combinedResult", "total") || "Total Marks"}</p>
                <p className="text-2xl font-bold font-mono">
                  <span className="text-primary">{combined.obtainedMarks}</span>
                  <span className="text-muted-foreground text-lg"> / {combined.maxMarks}</span>
                </p>
              </div>
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">{tr("combinedResult", "percentage") || "Percentage"}</p>
                <p className="text-2xl font-bold text-foreground">
                  {combined.percentage.toFixed(2)}%
                </p>
              </div>
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">{tr("combinedResult", "grade") || "Grade"}</p>
                <p className="text-2xl font-bold text-primary">
                  {combined.grade}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
