import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Book, CheckCircle, Clock, Loader2, Plus, Trash2, Edit } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { curriculumApi, classApi } from "@/lib/api";

export default function Curriculum() {
    const { tr } = useLanguage();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    
    const [activeTab, setActiveTab] = useState("diniyat");
    const [curriculums, setCurriculums] = useState([]);
    const [apiClasses, setApiClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ classId: "", subject: "", book: "", progress: 0, status: "On Track" });
    const [isEditing, setIsEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [currRes, classRes] = await Promise.all([
                    curriculumApi.list(),
                    classApi.getClasses()
                ]);
                
                if (currRes.success) setCurriculums(currRes.data);
                if (classRes.success) setApiClasses(classRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (isEditing) {
                const res = await curriculumApi.update(isEditing, formData);
                if (res.success) {
                    setCurriculums(prev => prev.map(c => c._id === isEditing ? res.data : c));
                    resetForm();
                }
            } else {
                const res = await curriculumApi.create(formData);
                if (res.success) {
                    setCurriculums(prev => [res.data, ...prev]);
                    resetForm();
                }
            }
        } catch (error) {
            console.error("Submission failed", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subject?")) return;
        try {
            const res = await curriculumApi.remove(id);
            if (res.success) {
                setCurriculums(prev => prev.filter(c => c._id !== id));
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            classId: item.classId?._id || item.classId || "",
            subject: item.subject,
            book: item.book,
            progress: item.progress,
            status: item.status
        });
        setIsEditing(item._id);
        setShowForm(true);
        setActiveTab(item.department || activeTab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setFormData({ classId: "", subject: "", book: "", progress: 0, status: "On Track" });
        setIsEditing(null);
        setShowForm(false);
    };

    const departments = ["diniyat", "hifz", "alimiyat", "qirat", "contemporary"];
    
    // Group classes by department
    const classesByDept = departments.reduce((acc, dept) => {
        acc[dept] = apiClasses.filter(c => c.department === dept);
        return acc;
    }, {});

    // Available classes for current active tab (for form)
    const activeClasses = classesByDept[activeTab] || [];

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <PageHeader 
                title={tr("curriculum", "pageTitle")}
                description={tr("curriculum", "pageSubtitle")}
                showBack={true}
                backLabel={tr("common", "backToDashboard")}
                actions={
                    isAdmin && !showForm ? (
                        <button 
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
                        >
                            <Plus className="h-4 w-4" /> {tr("curriculum", "addSubject")}
                        </button>
                    ) : null
                }
            />

            {isAdmin && showForm && (
                <Card className="bg-muted/30 border-dashed border-2">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">{isEditing ? tr("curriculum", "editSubject") : tr("curriculum", "addNewSubject")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">{tr("curriculum", "class")}</label>
                                    <select 
                                        value={formData.classId} 
                                        onChange={e => setFormData({...formData, classId: e.target.value})}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required={!isEditing} 
                                    >
                                        <option value="" disabled>{tr("curriculum", "selectClass")}</option>
                                        {activeClasses.map(c => (
                                            <option key={c._id} value={c._id}>{c.fullName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">{tr("common", "status")}</label>
                                    <select 
                                        value={formData.status} 
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value="On Track">{tr("curriculum", "onTrack")}</option>
                                        <option value="Delayed">{tr("curriculum", "delayed")}</option>
                                        <option value="Almost Complete">{tr("curriculum", "almostComplete")}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">{tr("curriculum", "subjectName")}</label>
                                    <input 
                                        type="text" 
                                        value={formData.subject} 
                                        onChange={e => setFormData({...formData, subject: e.target.value})}
                                        placeholder="e.g. Quran Recitation"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">{tr("curriculum", "bookName")}</label>
                                    <input 
                                        type="text" 
                                        value={formData.book} 
                                        onChange={e => setFormData({...formData, book: e.target.value})}
                                        placeholder="e.g. Tajweed-ul-Quran"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-medium flex justify-between">
                                        <span>{tr("curriculum", "progress")}</span>
                                        <span className="text-primary">{formData.progress}%</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={formData.progress} 
                                        onChange={e => setFormData({...formData, progress: Number(e.target.value)})}
                                        className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    {tr("common", "cancel")}
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isEditing ? tr("curriculum", "updateSubject") : tr("curriculum", "saveSubject")}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); if (showForm && !isEditing) setFormData({...formData, classId: ""}); }} className="w-full">
                <TabsList className="grid w-full max-w-3xl grid-cols-5">
                    <TabsTrigger value="diniyat">{tr("curriculum", "diniyat")}</TabsTrigger>
                    <TabsTrigger value="hifz">{tr("curriculum", "hifz")}</TabsTrigger>
                    <TabsTrigger value="alimiyat">{tr("curriculum", "alimiyat")}</TabsTrigger>
                    <TabsTrigger value="qirat">{tr("curriculum", "qirat")}</TabsTrigger>
                    <TabsTrigger value="contemporary">{tr("curriculum", "contemporary")}</TabsTrigger>
                </TabsList>

                {departments.map((dept) => {
                    const deptCurriculums = curriculums.filter(c => c.department === dept);
                    const deptClasses = classesByDept[dept] || [];
                    
                    // Legacy records have no classId
                    const legacyCurriculums = deptCurriculums.filter(c => !c.classId);

                    return (
                        <TabsContent key={dept} value={dept} className="mt-6 space-y-8">
                            {deptCurriculums.length === 0 ? (
                                <EmptyState 
                                  title="No Subjects Found"
                                  description={isAdmin ? "Click 'Add Subject' to create one for this department." : "There is currently no curriculum data for this department."}
                                  icon={Book}
                                />
                            ) : (
                                <>
                                    {/* Grouped by specific class */}
                                    {deptClasses.map(cls => {
                                        const classSubjects = deptCurriculums.filter(c => c.classId && (c.classId._id === cls._id || c.classId === cls._id));
                                        if (classSubjects.length === 0) return null;

                                        return (
                                            <div key={cls._id} className="space-y-3">
                                                <h3 className="text-xl font-bold border-b pb-2">{cls.fullName}</h3>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {classSubjects.map((subject) => (
                                                        <SubjectCard 
                                                            key={subject._id} 
                                                            subject={subject} 
                                                            isAdmin={isAdmin} 
                                                            handleEdit={handleEdit} 
                                                            handleDelete={handleDelete} 
                                                            tr={tr} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Legacy / Unassigned bucket */}
                                    {legacyCurriculums.length > 0 && (
                                        <div className="space-y-3 mt-8 p-4 bg-muted/20 border rounded-lg">
                                            <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2">
                                                Legacy / Unassigned
                                                <span className="text-xs bg-amber-100 px-2 py-1 rounded-full font-normal">Needs Manual Assignment</span>
                                            </h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {legacyCurriculums.map((subject) => (
                                                    <SubjectCard 
                                                        key={subject._id} 
                                                        subject={subject} 
                                                        isAdmin={isAdmin} 
                                                        handleEdit={handleEdit} 
                                                        handleDelete={handleDelete} 
                                                        tr={tr} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </motion.div>
    );
}

function SubjectCard({ subject, isAdmin, handleEdit, handleDelete, tr }) {
    return (
        <Card className="group hover:border-primary/20 transition-colors">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate flex items-center gap-2">
                            {subject.subject}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                            <Book className="h-4 w-4 shrink-0"/> {subject.book}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
                            ${subject.status === 'On Track' ? 'bg-green-100 text-green-700' :
                            subject.status === 'Delayed' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'}`}>
                            {subject.status === 'On Track' ? <CheckCircle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}
                            {subject.status}
                        </div>
                        {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(subject); }} 
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    title="Edit"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(subject._id)} 
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ProgressBar value={subject.progress} label={tr("curriculum", "syllabusCompleted")} colorClass={subject.progress > 75 ? "bg-green-500" : subject.progress > 40 ? "bg-primary" : "bg-amber-500"}/>
            </CardContent>
        </Card>
    );
}
