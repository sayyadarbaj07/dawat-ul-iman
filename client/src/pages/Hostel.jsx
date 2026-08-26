import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Bed, Utensils, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
export default function Hostel() {
    const { tr } = useLanguage();
    const hostelData = [
        { block: "Block A (Seniors)", total: 75, occupied: 75, status: "Full" },
        { block: "Block B (Juniors)", total: 75, occupied: 67, status: "Available" }
    ];
    const recentNotes = [
        { date: "Today", note: "Block A Room 12 AC repair required.", type: "maintenance" },
        { date: "Yesterday", note: "Dinner menu updated for Friday.", type: "food" },
        { date: "Jun 15", note: "Late arrival: 3 students in Block B.", type: "discipline" }
    ];
    return (<motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tr("hostel", "pageTitle")}</h2>
          <p className="text-muted-foreground mt-1">{tr("hostel", "pageSubtitle")}</p>
        </div>
        <Button>
          <Bed className="mr-2 h-4 w-4"/> {tr("hostel", "allocateBed")}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {hostelData.map((block, idx) => (<Card key={idx}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{block.block}</CardTitle>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${block.status === 'Full' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {block.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-3xl font-bold mb-4">
                    <span>{block.occupied}</span>
                    <span className="text-muted-foreground text-xl self-end">/ {block.total}</span>
                  </div>
                  <ProgressBar value={(block.occupied / block.total) * 100} colorClass={block.occupied === block.total ? "bg-amber-500" : "bg-primary"} showValue={false}/>
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {tr("hostel", "bedsAvailable", { count: block.total - block.occupied })}
                  </p>
                </CardContent>
              </Card>))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{tr("hostel", "recentBedAllocations")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("hostel", "studentName")}</TableHead>
                    <TableHead>{tr("hostel", "classLabel")}</TableHead>
                    <TableHead>{tr("hostel", "block")}</TableHead>
                    <TableHead>{tr("hostel", "room")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Muhammad Umar</TableCell>
                    <TableCell>Diniyat</TableCell>
                    <TableCell>Block A</TableCell>
                    <TableCell>102</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Hassan Ali</TableCell>
                    <TableCell>Contemporary</TableCell>
                    <TableCell>Block A</TableCell>
                    <TableCell>105</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Bilal Ahmed</TableCell>
                    <TableCell>Arabic</TableCell>
                    <TableCell>Block B</TableCell>
                    <TableCell>204</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5"/> {tr("hostel", "foodRecord")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-medium">{tr("hostel", "breakfast")}</span>
                  <span className="text-sm text-muted-foreground">7:00 AM</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm font-medium">{tr("hostel", "lunch")}</span>
                  <span className="text-sm text-muted-foreground">1:30 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{tr("hostel", "dinner")}</span>
                  <span className="text-sm text-muted-foreground">8:00 PM</span>
                </div>
                <Button variant="outline" className="w-full mt-2" size="sm">{tr("hostel", "manageMenu")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5"/> {tr("hostel", "wardenNotes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentNotes.map((note, idx) => (<div key={idx} className="p-4 hover:bg-muted/50">
                    <p className="text-sm">{note.note}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">{note.date}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-sm
                        ${note.type === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                note.type === 'food' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {note.type}
                      </span>
                    </div>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>);
}
