import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Award, Mic, Users, Trophy } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
export default function Activities() {
    const { tr } = useLanguage();
    const records = [
        { student: "Muhammad Umar", class: "Diniyat", activity: "Speech Competition", position: "1st Place", date: "May 10" },
        { student: "Abdul Rahman", class: "Arabic", activity: "Naat Khawani", position: "2nd Place", date: "May 10" },
        { student: "Hassan Ali", class: "Contemporary", activity: "Dialogue", position: "Participant", date: "Apr 25" },
        { student: "Bilal Ahmed", class: "Arabic", activity: "Speech Competition", position: "3rd Place", date: "Apr 10" }
    ];
    return (<motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tr("activities", "pageTitle")}</h2>
          <p className="text-muted-foreground mt-1">{tr("activities", "pageSubtitle")}</p>
        </div>
        <Button>
          <Award className="mr-2 h-4 w-4"/> {tr("activities", "addAchievement")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary"/> Next Bazm Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-primary">Bazm-e-Tariq bin Ziyad</h3>
                  <p className="text-muted-foreground text-lg">Weekly Speech Competition</p>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="bg-white px-3 py-1.5 rounded-md shadow-sm border">
                    📅 Next Saturday
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-md shadow-sm border">
                    ⏰ 10:00 AM
                  </div>
                </div>
                <Button className="mt-2">Register Participants</Button>
              </div>
              <div className="hidden md:flex w-32 items-center justify-center bg-white rounded-xl shadow-sm border border-primary/10">
                <Users className="h-12 w-12 text-primary/40"/>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 bg-amber-50/50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Trophy className="h-5 w-5"/> Recent Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-full mt-1">
                  <span className="text-lg">🥇</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Best Speaker Award</p>
                  <p className="text-xs text-muted-foreground">Muhammad Umar (Diniyat)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-gray-200 p-2 rounded-full mt-1">
                  <span className="text-lg">🥈</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Naat Competition runner-up</p>
                  <p className="text-xs text-muted-foreground">Abdul Rahman (Arabic)</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-6 bg-white">View All Awards</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Participation Records</CardTitle>
          <CardDescription>History of student participation in various activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Position/Role</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, idx) => (<TableRow key={idx}>
                  <TableCell className="font-medium">{record.student}</TableCell>
                  <TableCell>{record.class}</TableCell>
                  <TableCell>{record.activity}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.position.includes('1st') ? 'bg-amber-100 text-amber-800' :
                record.position.includes('2nd') ? 'bg-gray-200 text-gray-800' :
                    record.position.includes('3rd') ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-50 text-blue-700'}`}>
                      {record.position}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{record.date}</TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>);
}
