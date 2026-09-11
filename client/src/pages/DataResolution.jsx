import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { dataResolutionApi } from "@/lib/api/dataResolutionApi";
import { classApi } from "@/lib/api/classApi";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users,
  CalendarCheck,
  FileText,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Info
} from "lucide-react";
import { motion } from "framer-motion";
import { sectionMotion } from "@/components/dashboard/primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function DataResolutionSkeleton() {
  return (
    <div className="space-y-6 pb-8 sm:space-y-8 animate-pulse">
      <div className="h-10 w-64 bg-muted rounded"></div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[140px] bg-muted rounded-[16px]" />
        ))}
      </div>
      <div className="h-96 bg-muted rounded-[16px]"></div>
    </div>
  );
}

export default function DataResolution() {
  const { tr } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [apiClasses, setApiClasses] = useState([]);

  // State for active view and data
  const [activeTab, setActiveTab] = useState("students");
  const [listData, setListData] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Dialog state
  const [selectedItem, setSelectedItem] = useState(null);
  const [hypotheticalClassId, setHypotheticalClassId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const [sumRes, clsRes] = await Promise.all([
          dataResolutionApi.getSummary(),
          classApi.getClasses()
        ]);
        setSummary(sumRes.data);
        setApiClasses(clsRes.data?.filter(c => c.status === "active") || []);
      } catch (err) {
        console.error("Failed to load resolution summary", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (loading) return;
    const fetchList = async () => {
      setLoadingList(true);
      try {
        let res;
        switch (activeTab) {
          case "students": res = await dataResolutionApi.getStudents(); break;
          case "attendance": res = await dataResolutionApi.getAttendance(); break;
          case "exams": res = await dataResolutionApi.getExams(); break;
          case "curriculum": res = await dataResolutionApi.getCurriculum(); break;
          case "teachers": res = await dataResolutionApi.getTeachers(); break;
        }
        setListData(res?.data || []);
      } catch (err) {
        console.error("Failed to load list", err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchList();
  }, [activeTab, loading]);

  if (loading) return <DataResolutionSkeleton />;

  const handleReview = (item) => {
    setSelectedItem(item);
    setHypotheticalClassId("");
    setShowConfirm(false);
  };

  const handleResolve = async () => {
    if (!hypotheticalClassId) return;
    setIsResolving(true);
    try {
      let res;
      const payload = { classId: hypotheticalClassId, reason: "Manual admin resolution" };
      switch (activeTab) {
        case "students": res = await dataResolutionApi.resolveStudent(selectedItem._id, payload); break;
        case "attendance": res = await dataResolutionApi.resolveAttendance(selectedItem._id, payload); break;
        case "exams": res = await dataResolutionApi.resolveExam(selectedItem._id, payload); break;
        case "curriculum": res = await dataResolutionApi.resolveCurriculum(selectedItem._id, payload); break;
        case "teachers": res = await dataResolutionApi.resolveTeacher(selectedItem._id, payload); break;
      }
      if (res?.success) {
        toast({ title: "Success", description: res.alreadyResolved ? res.message : `${activeTab.slice(0, -1)} resolved successfully!` });
        // Update local state to remove the resolved item
        setListData(prev => prev.filter(item => item._id !== selectedItem._id));
        setSummary(prev => ({
          ...prev,
          unresolvedCounts: {
            ...prev.unresolvedCounts,
            [activeTab]: Math.max(0, prev.unresolvedCounts[activeTab] - 1)
          }
        }));
        setSelectedItem(null);
        setShowConfirm(false);
      }
    } catch (err) {
      toast({ title: "Resolution Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsResolving(false);
    }
  };

  const getCanonicalName = (id) => {
    const c = apiClasses.find(x => x._id === id);
    return c ? c.fullName : "Unknown";
  };

  return (
    <motion.div
      className="min-w-0 space-y-6 pb-8 sm:space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tr("dataResolution", "pageTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {tr("dataResolution", "pageSubtitle")}
          </p>
        </div>
      </div>

      {/* READ ONLY NOTICE REMOVED FOR 10G-B */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">{tr("dataResolution", "manualResolutionActive")}</p>
          <p>{tr("dataResolution", "manualResolutionDesc")}</p>
        </div>
      </div>

      <motion.div
        variants={sectionMotion}
        className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-5 md:gap-6"
      >
        <div onClick={() => setActiveTab("students")} className={`cursor-pointer transition-all ${activeTab === 'students' ? 'ring-2 ring-primary rounded-[16px]' : ''}`}>
          <StatCard
            title={tr("dataResolution", "unresolvedStudents")}
            value={summary?.unresolvedCounts?.students || 0}
            icon={<Users />}
            iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            accentClassName="bg-blue-500"
            delay={0}
          />
        </div>
        <div onClick={() => setActiveTab("attendance")} className={`cursor-pointer transition-all ${activeTab === 'attendance' ? 'ring-2 ring-primary rounded-[16px]' : ''}`}>
          <StatCard
            title={tr("dataResolution", "unresolvedAttendance")}
            value={summary?.unresolvedCounts?.attendances || 0}
            icon={<CalendarCheck />}
            iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
            accentClassName="bg-orange-500"
            delay={0.06}
          />
        </div>
        <div onClick={() => setActiveTab("exams")} className={`cursor-pointer transition-all ${activeTab === 'exams' ? 'ring-2 ring-primary rounded-[16px]' : ''}`}>
          <StatCard
            title={tr("dataResolution", "unresolvedExams")}
            value={summary?.unresolvedCounts?.exams || 0}
            icon={<FileText />}
            iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            accentClassName="bg-emerald-500"
            delay={0.12}
          />
        </div>
        <div onClick={() => setActiveTab("curriculum")} className={`cursor-pointer transition-all ${activeTab === 'curriculum' ? 'ring-2 ring-primary rounded-[16px]' : ''}`}>
          <StatCard
            title={tr("dataResolution", "unresolvedCurriculum")}
            value={summary?.unresolvedCounts?.curriculums || 0}
            icon={<BookOpen />}
            iconClassName="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
            accentClassName="bg-purple-500"
            delay={0.18}
          />
        </div>
        <div onClick={() => setActiveTab("teachers")} className={`cursor-pointer transition-all ${activeTab === 'teachers' ? 'ring-2 ring-primary rounded-[16px]' : ''}`}>
          <StatCard
            title={tr("dataResolution", "legacyTeachers")}
            value={summary?.unresolvedCounts?.teachers || 0}
            icon={<GraduationCap />}
            iconClassName="bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400"
            accentClassName="bg-pink-500"
            delay={0.24}
          />
        </div>
      </motion.div>

      {/* ATTENDANCE ORPHAN STATS (Only show when attendance is active) */}
      {activeTab === "attendance" && (
        <div className="bg-white dark:bg-card border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-primary" />
            <span className="font-medium">{tr("dataResolution", "attendanceOrphanCheck")}</span>
            <span className="text-muted-foreground ml-2">{tr("dataResolution", "realStudentOrphans")} {summary?.orphanStats?.realStudentOrphans}</span>
            <span className="text-muted-foreground ml-2">{tr("dataResolution", "validStudentReferences")} {summary?.orphanStats?.validStudentReferences}</span>
          </div>
        </div>
      )}

      {/* LIST SECTION */}
      <div className="bg-white dark:bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="font-semibold text-lg capitalize">{tr("dataResolution", "resolutionList").replace("{tab}", activeTab)}</h2>
        </div>
        <div className="p-0 overflow-x-auto">
          {loadingList ? (
            <div className="p-8 text-center text-muted-foreground">{tr("common", "loading")}</div>
          ) : listData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{tr("dataResolution", "noUnresolvedRecords")}</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{tr("dataResolution", "idName")}</th>
                  <th className="px-4 py-3">{tr("dataResolution", "legacyValue")}</th>
                  <th className="px-4 py-3">{tr("dataResolution", "status")}</th>
                  <th className="px-4 py-3 text-right">{tr("dataResolution", "action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listData.map((item) => (
                  <tr key={item._id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{item.name || item.studentName || item.department || item._id.slice(-6)}</div>
                      <div className="text-xs text-muted-foreground">{item._id}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.className || item.studentClass || item.class || item.department || (item.assignedClasses && item.assignedClasses.join(", ")) || "None"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        {tr("dataResolution", "manualMappingRequired")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleReview(item)}>
                        {tr("dataResolution", "review")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* REVIEW DIALOG */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{tr("dataResolution", "reviewMapping").replace("{tab}", activeTab.slice(0, -1))}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{tr("dataResolution", "recordId")}</span>
                  <span className="font-medium">{selectedItem._id}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{tr("dataResolution", "currentLegacyValue")}</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {selectedItem.className || selectedItem.class || selectedItem.department || (selectedItem.assignedClasses && selectedItem.assignedClasses.join(", ")) || "None"}
                  </span>
                </div>
                {activeTab === "attendance" && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">{tr("dataResolution", "linkedStudent")}</span>
                    <span className="font-medium">{selectedItem.userId ? (selectedItem.userId.name || tr("dataResolution", "studentExists")) : tr("dataResolution", "missingReference")}</span>
                  </div>
                )}
              </div>

              {activeTab === "attendance" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg text-sm text-amber-800 dark:text-amber-300 border border-amber-200">
                  <p className="font-semibold mb-1">{tr("dataResolution", "dependencyNotice")}</p>
                  <p>{tr("dataResolution", "dependencyNoticeDesc")}</p>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium">{tr("dataResolution", "canonicalClassSelection")}</label>
                <Select value={hypotheticalClassId} onValueChange={setHypotheticalClassId} disabled={showConfirm}>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("dataResolution", "selectCanonicalClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    {apiClasses.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hypotheticalClassId && !showConfirm && (
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{tr("dataResolution", "mappingPreview")}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">{tr("dataResolution", "currentClassId")}</div>
                      <div className="font-medium">None</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">{tr("dataResolution", "newCanonicalClassId")}</div>
                      <div className="font-medium text-primary break-all">{hypotheticalClassId}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground mb-1">{tr("dataResolution", "resolvedClassName")}</div>
                      <div className="font-medium">{getCanonicalName(hypotheticalClassId)}</div>
                    </div>
                  </div>
                </div>
              )}

              {showConfirm && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 text-red-900 dark:text-red-200 text-sm">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800 dark:text-red-300">{tr("dataResolution", "confirmPermanentResolution")}</h4>
                      <p className="mt-1">{tr("dataResolution", "confirmResolutionDesc")}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-black/20 p-3 rounded text-center border border-red-100 dark:border-red-800/30 font-bold mb-3">
                    {getCanonicalName(hypotheticalClassId)}
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                    <li>Legacy value "{selectedItem.className || selectedItem.class || selectedItem.department || (selectedItem.assignedClasses && selectedItem.assignedClasses.join(","))}" will be preserved.</li>
                    <li>This action will be logged in the system Activity Log.</li>
                    {activeTab === "teachers" && <li>Class ID will be added to assignedClassIds.</li>}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {!showConfirm ? (
                  <>
                    <Button variant="outline" onClick={() => { setSelectedItem(null); setHypotheticalClassId(""); }}>
                      {tr("common", "cancel")}
                    </Button>
                    <Button disabled={!hypotheticalClassId} onClick={() => setShowConfirm(true)}>
                      {tr("dataResolution", "proceedToConfirm")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isResolving}>
                      {tr("common", "back")}
                    </Button>
                    <Button variant="destructive" onClick={handleResolve} disabled={isResolving}>
                      {isResolving ? tr("dataResolution", "resolving") : tr("dataResolution", "confirmResolution")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
