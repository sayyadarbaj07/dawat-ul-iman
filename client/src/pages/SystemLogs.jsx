import { useLanguage } from "@/context/LanguageContext";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { activityLogApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function SystemLogs() {
  const { tr } = useLanguage();
    const { toast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchLogs = async () => {
        try {
          const response = await activityLogApi.list();
          setLogs(response.data?.data || response.data || []);
        } catch (error) {
          toast({ title: tr("common", "error"), description: tr("systemLogs", "noLogsDesc"), variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
      fetchLogs();
    }, [toast]);

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader 
        title={tr("systemLogs", "pageTitle")}
        description={tr("systemLogs", "pageDescription")}
        showBack={true}
        backLabel={tr("common", "backToDashboard")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> {tr("systemLogs", "activityTrail")}</CardTitle>
          <CardDescription>{tr("systemLogs", "adminsOnly")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">{tr("systemLogs", "loading")}</div>
          ) : logs.length === 0 ? (
            <EmptyState 
              title={tr("systemLogs", "noLogs")}
              description={tr("systemLogs", "noLogsDesc")}
              icon={Activity}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("systemLogs", "dateTime")}</TableHead>
                    <TableHead>{tr("systemLogs", "user")}</TableHead>
                    <TableHead>{tr("systemLogs", "role")}</TableHead>
                    <TableHead>{tr("systemLogs", "action")}</TableHead>
                    <TableHead>{tr("systemLogs", "module")}</TableHead>
                    <TableHead>{tr("common", "description")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(logs) ? logs : []).map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm" dir="ltr">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium" dir="auto">{log.username}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {log.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                          ${log.action.includes('DELETE') ? 'bg-red-50 text-red-600' :
                            log.action.includes('CREATE') ? 'bg-green-50 text-green-600' :
                            log.action.includes('LOGIN') ? 'bg-blue-50 text-blue-600' :
                            'bg-gray-100 text-gray-700'}`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>{log.module || tr("systemLogs", "system")}</TableCell>
                      <TableCell dir="auto">{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
