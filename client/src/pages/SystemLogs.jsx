import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity } from "lucide-react";
import { activityLogApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function SystemLogs() {
    const { toast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchLogs = async () => {
        try {
          const response = await activityLogApi.list();
          setLogs(response.data || []);
        } catch (error) {
          toast({ title: "Error", description: "Failed to load system logs", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
      fetchLogs();
    }, [toast]);

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Audit Logs</h2>
          <p className="text-muted-foreground mt-1">Track user actions and system changes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Activity Trail</CardTitle>
          <CardDescription>Recent system events (Admins Only)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No activity logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.username}</TableCell>
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
                      <TableCell>{log.module || "System"}</TableCell>
                      <TableCell>{log.description}</TableCell>
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
