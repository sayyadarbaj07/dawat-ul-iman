import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Book, CheckCircle, Clock, Loader2, Plus, Trash2, Edit } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { curriculumApi } from "@/lib/api/curriculum";

export default function Curriculum() {
    const { tr } = useLanguage();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    
    const [activeTab, setActiveTab] = useState("diniyat");
    const [curriculums, setCurriculums] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ department: "diniyat", subject: "", book: "", progress: 0, status: "On Track" });
    const [isEditing, setIsEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchCurriculums = async () => {
            try {
                const response = await curriculumApi.list();
                if (response.success) {
                    setCurriculums(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch curriculums", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCurriculums();
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
            department: item.department,
            subject: item.subject,
            book: item.book,
            progress: item.progress,
            status: item.status
        });
        setIsEditing(item._id);
        setShowForm(true);
        setActiveTab(item.department);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setFormData({ department: activeTab, subject: "", book: "", progress: 0, status: "On Track" });
        setIsEditing(null);
        setShowForm(false);
    };

    const departments = ["diniyat", "arabic", "contemporary"];

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{tr("curriculum", "pageTitle")}</h2>
                    <p className="text-muted-foreground mt-1">{tr("curriculum", "pageSubtitle")}</p>
                </div>
                {isAdmin && !showForm && (
                    <button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" /> Add Subject
                    </button>
                )}
            </div>

            {isAdmin && showForm && (
                <Card className="bg-muted/30 border-dashed border-2">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">{isEditing ? "Edit Subject" : "Add New Subject"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Department</label>
                                    <select 
                                        value={formData.department} 
                                        onChange={e => setFormData({...formData, department: e.target.value})}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value="diniyat">Diniyat</option>
                                        <option value="arabic">Arabic</option>
                                        <option value="contemporary">Contemporary</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Status</label>
                                    <select 
                                        value={formData.status} 
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value="On Track">On Track</option>
                                        <option value="Delayed">Delayed</option>
                                        <option value="Almost Complete">Almost Complete</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Subject Name</label>
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
                                    <label className="text-sm font-medium">Book Name</label>
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
                                        <span>Progress</span>
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
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isEditing ? "Update Subject" : "Save Subject"}
                                </button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); if (showForm && !isEditing) setFormData({...formData, department: val}); }} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="diniyat">{tr("curriculum", "diniyat")}</TabsTrigger>
                    <TabsTrigger value="arabic">{tr("curriculum", "arabic")}</TabsTrigger>
                    <TabsTrigger value="contemporary">{tr("curriculum", "contemporary")}</TabsTrigger>
                </TabsList>

                {departments.map((dept) => {
                    const subjects = curriculums.filter(c => c.department === dept);
                    return (
                        <TabsContent key={dept} value={dept} className="mt-6">
                            {subjects.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
                                    <Book className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                                    <h3 className="text-lg font-medium">No subjects found</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {isAdmin ? "Click 'Add Subject' to create one for this department." : "There is currently no curriculum data for this department."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {subjects.map((subject) => (
                                        <Card key={subject._id} className="group hover:border-primary/20 transition-colors">
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
                                                                    onClick={() => handleEdit(subject)} 
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
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </motion.div>
    );
}
