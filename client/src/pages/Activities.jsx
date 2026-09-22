import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Award, Mic, Users, Trophy, Plus, Trash2, Edit } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { achievementApi, eventApi, classApi, studentApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Activities() {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isRtl = language === "ur";
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [nextBazm, setNextBazm] = useState(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ classId: "", studentId: "", activityTitle: "", position: "", date: "" });
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const [achRes, eventRes] = await Promise.allSettled([
        achievementApi.list({ limit: 10 }),
        eventApi.list({ type: "bazm", upcoming: "true", limit: 1 })
      ]);

      if (achRes.status === "fulfilled" && achRes.value?.data?.achievements) {
        setAchievements(achRes.value.data.achievements);
      } else {
        setAchievements([]);
      }

      if (eventRes.status === "fulfilled" && eventRes.value?.data?.data?.length > 0) {
        setNextBazm(eventRes.value.data.data[0]);
      } else {
        setNextBazm(null);
      }
    } catch (e) {
      toast({ title: tr("common", "error"), description: "Failed to load activities", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    if (!isAdmin) return;
    try {
      const [cRes, sRes] = await Promise.allSettled([classApi.getClasses(), studentApi.list()]);
      if (cRes.status === "fulfilled") setClasses(cRes.value?.data || []);
      if (sRes.status === "fulfilled") setStudents(sRes.value?.data?.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchActivities();
    if (isAdmin) fetchFormData();
  }, [isAdmin]);

  const handleClassChange = (classId) => {
    setFormData({ ...formData, classId, studentId: "" });
    setFilteredStudents(students.filter(s => String(s.classId?._id || s.classId) === String(classId)));
  };

  const openAddDialog = () => {
    setFormData({ classId: "", studentId: "", activityTitle: "", position: "", date: "" });
    setEditingId(null);
    setFilteredStudents([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (ach) => {
    setFormData({
      classId: ach.classId?._id || ach.classId,
      studentId: ach.studentId?._id || ach.studentId,
      activityTitle: ach.activityTitle,
      position: ach.position,
      date: new Date(ach.date).toISOString().split('T')[0]
    });
    setFilteredStudents(students.filter(s => s.classId === (ach.classId?._id || ach.classId)));
    setEditingId(ach._id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await achievementApi.update(editingId, formData);
        toast({ title: tr("common", "success"), description: "Achievement updated successfully" });
      } else {
        await achievementApi.create(formData);
        toast({ title: tr("common", "success"), description: "Achievement created successfully" });
      }
      setIsDialogOpen(false);
      fetchActivities();
    } catch (error) {
      toast({ title: tr("common", "error"), description: error.response?.data?.message || "Failed to save achievement", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this achievement?")) return;
    try {
      await achievementApi.remove(id);
      toast({ title: tr("common", "success"), description: "Deleted successfully" });
      fetchActivities();
    } catch (error) {
      toast({ title: tr("common", "error"), description: "Failed to delete", variant: "destructive" });
    }
  };

  const tx = (key, fallback) => {
    const res = tr("activities", key);
    return (res === key || res === undefined) ? fallback : res;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center"><Skeleton className="h-10 w-48" /></div>
        <div className="grid gap-6 md:grid-cols-3"><Skeleton className="md:col-span-2 h-48" /><Skeleton className="h-48" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const topAchievements = achievements.slice(0, 3);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tx("pageTitle", "Activities")}</h2>
          <p className="text-muted-foreground mt-1">{tx("pageSubtitle", "Student activities and achievements")}</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                {tx("addAchievement", "Add Achievement")}
              </Button>
            </DialogTrigger>
            <DialogContent className={isRtl ? 'rtl' : 'ltr'} dir={isRtl ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Achievement" : tx("addAchievement", "Add Achievement")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={formData.classId} onValueChange={handleClassChange} required>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={formData.studentId} onValueChange={(val) => setFormData({...formData, studentId: val})} required disabled={!formData.classId}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {filteredStudents.map(s => <SelectItem key={s._id} value={s._id}>{s.name} ({s.rollNumber})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Activity Title</Label>
                  <Input value={formData.activityTitle} onChange={e => setFormData({...formData, activityTitle: e.target.value})} required placeholder="e.g. Speech Competition" />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} required placeholder="e.g. 1st Place" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <Button type="submit" className="w-full">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> {tx("nextBazmActivity", "Next Bazm Activity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextBazm ? (
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-primary" dir="auto">{nextBazm.title}</h3>
                    <p className="text-muted-foreground text-lg" dir="auto">{nextBazm.description || tx("weeklyCompetition", "Weekly Competition")}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="bg-white px-3 py-1.5 rounded-md shadow-sm border" dir="ltr">
                      📅 {format(new Date(nextBazm.date), "PPP")}
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex w-32 items-center justify-center bg-white rounded-xl shadow-sm border border-primary/10">
                  <Users className="h-12 w-12 text-primary/40"/>
                </div>
              </div>
            ) : (
              <EmptyState title="No upcoming Bazm scheduled" description="Next events will appear here" icon={Mic} />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1 bg-amber-50/50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Trophy className="h-5 w-5" /> {tx("recentAwards", "Recent Awards")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAchievements.length > 0 ? (
              <div className="space-y-4">
                {topAchievements.map((ach, idx) => (
                  <div key={ach._id} className="flex items-start gap-3">
                    <div className="bg-amber-100 p-2 rounded-full mt-1">
                      <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm" dir="auto">{ach.activityTitle} - {ach.position}</p>
                      <p className="text-xs text-muted-foreground" dir="auto">{ach.studentId?.name} ({ach.classId?.name})</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent awards</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tx("participationRecords", "Participation Records")}</CardTitle>
          <CardDescription>{tx("participationDescription", "History of student achievements")}</CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
             <EmptyState title="No achievements found" description="Participation records will appear here" icon={Award} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("studentName", "Student Name")}</TableHead>
                  <TableHead>{tx("class", "Class")}</TableHead>
                  <TableHead>{tx("activity", "Activity")}</TableHead>
                  <TableHead>{tx("positionRole", "Position")}</TableHead>
                  <TableHead>{tx("date", "Date")}</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {achievements.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium" dir="auto">{record.studentId?.name}</TableCell>
                    <TableCell dir="auto">{record.classId?.fullName}</TableCell>
                    <TableCell dir="auto">{record.activityTitle}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.position.toLowerCase().includes('1st') ? 'bg-amber-100 text-amber-800' :
                        record.position.toLowerCase().includes('2nd') ? 'bg-gray-200 text-gray-800' :
                        record.position.toLowerCase().includes('3rd') ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {record.position}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm" dir="ltr">{format(new Date(record.date), "PPP")}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(record._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
