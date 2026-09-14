import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Book, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [currRes] = await Promise.all([
                    curriculumApi.list()
                ]);
                
                if (currRes.success) setCurriculums(currRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const departments = ["diniyat", "hifz", "alimiyat", "qirat", "contemporary"];
    
    // Group curricula by department
    const curriculumsByDept = departments.reduce((acc, dept) => {
        acc[dept] = curriculums.filter(c => c.department === dept);
        return acc;
    }, {});

    const getStatusColor = (status) => {
        switch (status) {
            case "Completed":
            case "Ahead":
                return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
            case "On Track":
            case "Almost Complete":
                return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
            case "Behind":
            case "Delayed":
                return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30";
            default:
                return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "Completed": return <CheckCircle className="h-4 w-4" />;
            case "Ahead": return <CheckCircle className="h-4 w-4" />;
            case "On Track": return <Clock className="h-4 w-4" />;
            case "Almost Complete": return <Clock className="h-4 w-4" />;
            case "Behind": return <AlertCircle className="h-4 w-4" />;
            case "Delayed": return <AlertCircle className="h-4 w-4" />;
            default: return <Book className="h-4 w-4" />;
        }
    };

    const calculatePercentage = (curr) => {
        if (curr.totalLessons > 0) {
            const completed = curr.completedLessonsList?.length || 0;
            return Math.min(100, Math.round((completed / curr.totalLessons) * 100));
        }
        return curr.progress || 0; // Fallback to legacy progress
    };

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
                description="Global Overview of Curriculum Assignments"
                showBack={true}
                backLabel={tr("common", "backToDashboard")}
            />
            
            {isAdmin && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 mb-4">
                    <strong>Note:</strong> To assign or edit a curriculum for a class, go to <a href="/classes" className="underline font-semibold">Classes</a> and click the <strong>Manage Syllabus</strong> button in the actions menu.
                </div>
            )}

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full" dir="ltr">
                <TabsList className="flex w-full overflow-x-auto justify-start border-b rounded-none bg-transparent h-auto p-0 pb-1 gap-4 hide-scrollbar">
                    {departments.map((dept) => (
                        <TabsTrigger 
                            key={dept} 
                            value={dept}
                            className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3"
                        >
                            {dept}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {departments.map((dept) => (
                    <TabsContent key={dept} value={dept} className="mt-6">
                        {curriculumsByDept[dept].length === 0 ? (
                            <EmptyState 
                                icon={Book}
                                title={`No Curriculum for ${dept}`}
                                description="No curriculum assignments have been added for this department yet."
                            />
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {curriculumsByDept[dept].map((item, idx) => (
                                    <motion.div 
                                        key={item._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Card className="h-full hover:shadow-md transition-shadow relative overflow-hidden group">
                                            {/* Status indicator line */}
                                            <div className={`absolute top-0 left-0 w-1 h-full ${
                                                item.status === 'Completed' || item.status === 'Ahead' ? 'bg-green-500' :
                                                item.status === 'Behind' || item.status === 'Delayed' ? 'bg-amber-500' :
                                                'bg-blue-500'
                                            }`} />
                                            
                                            <CardContent className="p-5 pl-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{item.subject}</h3>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                            <Book className="h-3.5 w-3.5" /> 
                                                            {item.book}
                                                        </p>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(item.status)}`}>
                                                        {getStatusIcon(item.status)}
                                                        {item.status}
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Class</span>
                                                        <span className="font-medium truncate" title={item.classId?.fullName || "Unassigned"}>
                                                            {item.classId?.fullName || <span className="text-muted-foreground italic">Unassigned</span>}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Teacher</span>
                                                        <span className="font-medium truncate" title={item.teacherId?.name || "Unassigned"}>
                                                            {item.teacherId?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                                                        </span>
                                                    </div>
                                                    {item.academicYear && (
                                                        <div className="flex flex-col mt-1 col-span-2">
                                                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Academic Year</span>
                                                            <span className="font-medium">{item.academicYear}</span>
                                                        </div>
                                                    )}
                                                    {item.totalLessons > 0 && (
                                                        <div className="flex flex-col mt-1 col-span-2">
                                                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Target</span>
                                                            <span className="font-medium">{item.annualTarget} / {item.totalLessons} Lessons</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-end text-sm">
                                                        <span className="font-medium">Progress</span>
                                                        <span className="font-bold text-lg">{calculatePercentage(item)}%</span>
                                                    </div>
                                                    <ProgressBar value={calculatePercentage(item)} className="h-2.5" />
                                                    {item.totalLessons > 0 ? (
                                                        <p className="text-xs text-muted-foreground text-right mt-1">
                                                            {item.completedLessonsList?.length || 0} of {item.totalLessons} lessons taught
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground text-right mt-1">
                                                            Legacy Progress Record
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </motion.div>
    );
}
