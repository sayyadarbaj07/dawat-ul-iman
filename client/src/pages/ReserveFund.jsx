import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/StatCard";
import { ArrowUpRight, ArrowDownRight, Plus, Search, CheckCircle, XCircle, FileText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedDate } from "@/utils/localizationUtils";
import { reserveFundApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PAYMENT_MODES = ["Cash", "Bank", "Online"];

export default function ReserveFund() {
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalAdded: 0, totalSpent: 0, currentBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    type: "credit",
    amount: "",
    description: "",
    category: "",
    paymentMode: "Cash",
    remarks: "",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      setAccessDenied(true);
      return;
    }
    loadTransactions();
    loadSummary();
  }, [page, search, typeFilter, statusFilter, startDate, endDate, user]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (search) params.search = search;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await reserveFundApi.list(params);
      if (res.data && res.data.data) {
        setTransactions(res.data.data);
        setTotalPages(res.data.meta?.pages || 1);
      } else {
        setTransactions(res.data || []);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 || err.message?.includes("403")) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await reserveFundApi.summary();
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "credit",
      amount: "",
      description: "",
      category: "",
      paymentMode: "Cash",
      remarks: "",
      reference: "",
      date: new Date().toISOString().split("T")[0],
    });
    setIsEditing(false);
    setEditId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (tx) => {
    setFormData({
      type: tx.type,
      amount: tx.amount,
      description: tx.description || "",
      category: tx.category || "",
      paymentMode: tx.paymentMode || "Cash",
      remarks: tx.remarks || "",
      reference: tx.reference || "",
      date: tx.date ? new Date(tx.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    });
    setEditId(tx._id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type: formData.type,
        amount: Number(formData.amount),
        description: formData.description,
        category: formData.category,
        paymentMode: formData.paymentMode,
        remarks: formData.remarks,
        reference: formData.reference,
        date: formData.date,
      };

      if (isEditing) {
        await reserveFundApi.update(editId, payload);
        alert(tr("reserveFund", "transactionUpdated"));
      } else {
        await reserveFundApi.create(payload);
        alert(tr("reserveFund", "transactionCreated"));
      }

      setIsModalOpen(false);
      resetForm();
      loadTransactions();
      loadSummary();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Error";
      if (errMsg === "Insufficient Reserve Funds.") {
        alert(tr("reserveFund", "insufficientFunds"));
      } else {
        alert(errMsg);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(tr("reserveFund", "deleteConfirmation"))) return;
    try {
      await reserveFundApi.delete(id);
      alert(tr("reserveFund", "transactionDeleted"));
      loadTransactions();
      loadSummary();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Error";
      if (errMsg === "Insufficient Reserve Funds.") {
        alert(tr("reserveFund", "insufficientFunds"));
      } else {
        alert(errMsg);
      }
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to view the Reserve Fund.</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader 
        title={tr("reserveFund", "title")}
        description={tr("common", "finance")}
        showBack={true}
        backLabel={tr("common", "backToDashboard")}
        actions={
          <Button onClick={openAddModal} className="w-full sm:w-auto">
            <Plus className="me-2 h-4 w-4" /> {tr("reserveFund", "addTransaction")}
          </Button>
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isEditing ? tr("reserveFund", "editTransaction") : tr("reserveFund", "addTransaction")}</DialogTitle>
                <DialogDescription></DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr("reserveFund", "type")}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="credit">{tr("reserveFund", "added")}</option>
                      <option value="debit">{tr("reserveFund", "spent")}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("reserveFund", "paymentMode")}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    >
                      {PAYMENT_MODES.map(mode => (
                        <option key={mode} value={mode}>{tr("reserveFund", mode.toLowerCase()) || mode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label>{tr("reserveFund", "amount")} (Rs)</Label>
                    <Input type="number" required min="1" placeholder="Enter amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("reserveFund", "date")}</Label>
                    <Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tr("reserveFund", "description")}</Label>
                  <Input required placeholder="Enter description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr("reserveFund", "category")}</Label>
                    <Input placeholder="Optional category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("reserveFund", "reference")}</Label>
                    <Input placeholder="Optional reference" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tr("reserveFund", "remarks")}</Label>
                  <Input placeholder="Optional remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
                </div>
                
                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    {tr("common", "cancel")}
                  </Button>
                  <Button type="submit">
                    {tr("common", "save")}
                  </Button>
                </div>
              </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title={tr("reserveFund", "totalAdded")} 
          value={`Rs ${formatLocalizedNumber(summary?.totalAdded || 0, language)}`} 
          icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />} 
          className="bg-emerald-50/50 border-emerald-100" 
        />
        <StatCard 
          title={tr("reserveFund", "totalSpent")} 
          value={`Rs ${formatLocalizedNumber(summary?.totalSpent || 0, language)}`} 
          icon={<ArrowDownRight className="h-4 w-4 text-red-600" />} 
          className="bg-red-50/50 border-red-100" 
        />
        <StatCard 
          title={tr("reserveFund", "currentReserve")} 
          value={`Rs ${formatLocalizedNumber(summary?.currentBalance || 0, language)}`} 
          icon={<Wallet className="h-4 w-4 text-primary" />} 
          className="bg-primary/5 border-primary/20" 
        />
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                className={`pl-9 ${language === 'ur' ? 'pr-9 pl-3 text-right' : ''}`}
                placeholder={tr("reserveFund", "search")} 
                value={search} 
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }} 
              />
            </div>
            <div>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="all">{tr("reserveFund", "type")}: {tr("reserveFund", "all")}</option>
                <option value="credit">{tr("reserveFund", "added")}</option>
                <option value="debit">{tr("reserveFund", "spent")}</option>
              </select>
            </div>
            <div>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="all">{tr("reserveFund", "status")}: {tr("reserveFund", "all")}</option>
                <option value="Completed">{tr("reserveFund", "completed")}</option>
                <option value="Cancelled">{tr("reserveFund", "cancelled")}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div>
                <Label className="text-xs text-muted-foreground mb-1 block">{tr("reserveFund", "startDate")}</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
             </div>
             <div>
                <Label className="text-xs text-muted-foreground mb-1 block">{tr("reserveFund", "endDate")}</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
             </div>
          </div>

          <div className="overflow-x-auto border rounded-md shadow-sm">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[100px] text-xs">{tr("reserveFund", "date")}</TableHead>
                  <TableHead className="text-xs">{tr("reserveFund", "description")}</TableHead>
                  <TableHead className="text-xs">{tr("reserveFund", "category")}</TableHead>
                  <TableHead className="text-xs">{tr("reserveFund", "paymentMode")}</TableHead>
                  <TableHead className="text-xs">{tr("reserveFund", "status")}</TableHead>
                  <TableHead className="text-end text-xs">{tr("reserveFund", "amount")}</TableHead>
                  <TableHead className="text-end text-xs w-[120px]">{tr("reserveFund", "actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">{tr("common", "loading")}</TableCell></TableRow>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx._id} className={tx.status === 'Cancelled' ? "opacity-60 bg-red-50/50" : "hover:bg-muted/40 transition-colors"}>
                      <TableCell className="text-sm">{formatLocalizedDate(tx.date, language)}</TableCell>
                      <TableCell className="font-semibold text-sm max-w-[200px] truncate" title={tx.description}>
                        {tx.description}
                        {tx.reference && <div className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate">{tx.reference}</div>}
                        {tx.remarks && <div className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate">{tx.remarks}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{tx.category || "—"}</TableCell>
                      <TableCell className="text-xs">{tx.paymentMode}</TableCell>
                      <TableCell className="text-xs">
                        {tx.status === 'Cancelled' ? <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> {tr("reserveFund", "cancelled")}</span> : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {tr("reserveFund", "completed")}</span>}
                      </TableCell>
                      <TableCell className={`text-end font-bold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "credit" ? "+" : "-"}Rs {formatLocalizedNumber(tx.amount, language)}
                        <div className="text-[10px] font-normal opacity-80 mt-0.5">{tx.type === "credit" ? tr("reserveFund", "added") : tr("reserveFund", "spent")}</div>
                      </TableCell>
                      <TableCell className="text-end">
                        {tx.status !== 'Cancelled' && (
                          <div className="flex justify-end gap-2">
                             <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openEditModal(tx)}>{tr("common", "update")}</Button>
                             <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(tx._id)}>{tr("common", "delete")}</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState 
                        title={search || typeFilter !== 'all' || statusFilter !== 'all' ? tr("reserveFund", "noMatching") : tr("reserveFund", "noTransactions")}
                        description=""
                        icon={FileText}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
             <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <div className="text-sm py-1 px-3 border rounded-md">Page {page} of {totalPages}</div>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
             </div>
          )}

        </CardContent>
      </Card>

    </motion.div>
  );
}
