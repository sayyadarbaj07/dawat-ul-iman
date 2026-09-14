import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/StatCard";
import { ArrowUpRight, ArrowDownRight, Download, Plus, Search, CheckCircle, XCircle, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedDate } from "@/utils/localizationUtils";
import { financeApi, settingsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const INCOME_CATEGORIES = ["Kafalat", "Atiya", "Zakat", "Sadqa", "Isale Sawab", "Other"];
const EXPENSE_CATEGORIES = ["Tankha", "Food", "Medical", "Wazifa", "Other"];
const PAYMENT_MODES = ["Cash", "Bank", "Online"];

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function Finance() {
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, currentBalance: 0, categorySummary: {} });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  
  // Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "income",
    amount: "",
    description: "",
    category: INCOME_CATEGORIES[0],
    paymentMode: "Cash",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
    receiptId: "",
    receiptPhoto: null,
  });

  // Preview Modals
  const [previewImage, setPreviewImage] = useState(null);
  const [receiptPreviewData, setReceiptPreviewData] = useState(null);

  useEffect(() => {
    loadSettings();
    loadTransactions();
    loadSummary();
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.getSettings();
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await financeApi.list();
      // Handle the new paginated API response { data: { data: [...], meta: {...} } }
      if (res.data && res.data.meta) {
        setTransactions(res.data.data || []);
      } else {
        setTransactions(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await financeApi.summary();
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };


  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      if (formData.type === "income" && (formData.receiptPhoto || formData.receiptId)) {
        const payload = new FormData();
        payload.append("type", formData.type);
        payload.append("amount", Number(formData.amount));
        payload.append("description", formData.description);
        payload.append("category", formData.category);
        payload.append("paymentMode", formData.paymentMode);
        payload.append("remarks", formData.remarks);
        payload.append("date", formData.date);
        if (formData.receiptId) payload.append("receiptId", formData.receiptId);
        if (formData.receiptPhoto) payload.append("receiptPhoto", formData.receiptPhoto);
        
        let newTxRes;
        if (formData.receiptId || formData.receiptPhoto) {
          newTxRes = await financeApi.createWithFile(payload);
        } else {
          newTxRes = await financeApi.createWithFile(payload); // Ensure we capture the response
        }
        setIsModalOpen(false);
        setFormData({
          type: "income",
          amount: "",
          description: "",
          category: INCOME_CATEGORIES[0],
          paymentMode: "Cash",
          remarks: "",
          date: new Date().toISOString().split("T")[0],
          receiptId: "",
          receiptPhoto: null,
        });
        loadTransactions();
        loadSummary();
        
        // Auto-open preview for new receipt
        if (newTxRes && newTxRes.data && newTxRes.data._id) {
           // We need to fetch the populated version for the preview
           try {
             const res = await financeApi.getSummary(`?referenceId=${newTxRes.data.referenceId || ''}`);
             // Wait, it's easier to just pass the newTxRes.data directly, but referenceId won't be populated.
             // We can just set it anyway, the preview has fallbacks.
             setReceiptPreviewData(newTxRes.data);
           } catch(e) {}
        }
      } else {
        const newTxRes = await financeApi.create({
          type: formData.type,
          amount: Number(formData.amount),
          description: formData.description,
          category: formData.category,
          paymentMode: formData.paymentMode,
          remarks: formData.remarks,
          date: formData.date,
        });
        setIsModalOpen(false);
        setFormData({
          type: "income",
          amount: "",
          description: "",
          category: INCOME_CATEGORIES[0],
          paymentMode: "Cash",
          remarks: "",
          date: new Date().toISOString().split("T")[0],
          receiptId: "",
          receiptPhoto: null,
        });
        loadTransactions();
        loadSummary();
        
        if (newTxRes && newTxRes.data) {
           setReceiptPreviewData(newTxRes.data);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.message || tr("finance", "failedToSave"));
    }
  };

  const handleVoidTransaction = async (id) => {
    if (!window.confirm(tr("finance", "deleteTransactionConfirm"))) return;
    try {
      await financeApi.voidTransaction(id);
      loadTransactions();
      loadSummary();
    } catch (err) {
      alert(tr("finance", "failedToVoid"));
    }
  };

  const exportSummaryPDF = async () => {
    try {
      await financeApi.downloadPdf(`/pdf/finance/summary?language=${language}`, `Finance_Summary_${language}.pdf`);
    } catch(err) {
      alert(tr("finance", "failedToDownload"));
    }
  };

  const [exportingId, setExportingId] = useState(null);

  const exportReceiptPDF = async (id) => {
    try {
      setExportingId(id);
      await financeApi.downloadPdf(`/pdf/finance/receipt/${id}?language=${language}`, `Receipt_${id}_${language}.pdf`);
    } catch(err) {
      alert(err.message === "403 Forbidden" ? tr("common", "unauthorizedExport") : tr("finance", "failedToDownloadReceipt"));
    } finally {
      setExportingId(null);
    }
  };

  const openReceiptPreview = (tx) => {
    setReceiptPreviewData(tx);
  };

  const generateChartData = () => {
    const monthlyData = {};
    transactions.forEach((t) => {
      if (t.status === "Cancelled") return;
      const d = new Date(t.date);
      const monthYear = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { name: monthYear, income: 0, expense: 0, sortKey: d.getTime() };
      }
      monthlyData[monthYear][t.type] += t.amount;
    });
    return Object.values(monthlyData).sort((a, b) => a.sortKey - b.sortKey);
  };
  const chartData = generateChartData();

  const renderTransactionTable = (typeFilter, limit = null) => {
    let filtered = typeFilter === "all" ? transactions : transactions.filter(t => t.type === typeFilter);
    if (limit) filtered = filtered.slice(0, limit);
    return (
      <Card className="overflow-x-auto mt-4 border shadow-sm">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[100px] text-xs">{tr("common", "date")}</TableHead>
              <TableHead className="text-xs">{tr("finance", "description")}</TableHead>
              <TableHead className="text-xs">{tr("finance", "category")}</TableHead>
              <TableHead className="text-xs">{tr("finance", "paymentMode")}</TableHead>
              <TableHead className="text-xs">Ref/Receipt</TableHead>
              <TableHead className="text-xs">{tr("common", "status")}</TableHead>
              <TableHead className="text-end text-xs">{tr("finance", "amount")}</TableHead>
              <TableHead className="text-end text-xs">{tr("common", "actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center h-24">{tr("common", "loading")}</TableCell></TableRow>
            ) : filtered.length > 0 ? (
              filtered.map((tx) => (
                <TableRow key={tx._id} className={tx.status === 'Cancelled' ? "opacity-60 bg-red-50/50" : "hover:bg-muted/40 transition-colors"}>
                  <TableCell className="text-sm">{formatLocalizedDate(tx.date, language)}</TableCell>
                  <TableCell className="font-semibold text-sm max-w-[200px] truncate" title={tx.description}>
                    {tx.description}
                    {tx.referenceId && <div className="text-[11px] text-primary mt-0.5">{tx.referenceId.name || tx.referenceId.fullName}</div>}
                    {tx.remarks && <div className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate" title={tx.remarks}>{tx.remarks}</div>}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {tx.category} ({tx.type})
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{tx.paymentMode}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-1">
                      {tx.receiptId && <span className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded w-max">{tx.receiptId}</span>}
                      {tx.receiptPhoto && (
                        <div 
                          className="h-8 w-8 rounded overflow-hidden cursor-pointer border hover:opacity-80 transition"
                          onClick={() => setPreviewImage(`${API_BASE_URL}${tx.receiptPhoto}`)}
                        >
                          <img src={`${API_BASE_URL}${tx.receiptPhoto}`} alt="Receipt" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      )}
                      {!tx.receiptId && !tx.receiptPhoto && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {tx.status === 'Cancelled' ? <span className="text-red-600 font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> {tr("finance", "statusVoided")}</span> : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {tr("finance", "statusOk")}</span>}
                  </TableCell>
                  <TableCell className={`text-end font-bold ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}Rs {formatLocalizedNumber(tx.amount, language)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-2">
                       <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openReceiptPreview(tx)}>{tr("finance", "viewReceipt")}</Button>
                      {tx.status !== 'Cancelled' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-primary" 
                            disabled={exportingId === tx._id} 
                            onClick={() => exportReceiptPDF(tx._id)} 
                            title={tr("finance", "downloadReceipt")}
                          >
                            {exportingId === tx._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </Button>
                          {user?.role === "admin" && (
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleVoidTransaction(tx._id)}>{tr("finance", "void")}</Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState 
                    title={tr("finance", "noTransactions")}
                    description={tr("finance", "noTransactionsDesc")}
                    icon={FileText}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader 
        title={tr("finance", "pageTitle")}
        description={tr("finance", "pageSubtitle")}
        showBack={true}
        backLabel={tr("common", "backToDashboard")}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={exportSummaryPDF} className="w-full sm:w-auto">
              <Download className="me-2 h-4 w-4" /> {tr("finance", "export")}
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="me-2 h-4 w-4" /> {tr("finance", "newTransaction")}
            </Button>
          </div>
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{tr("finance", "addTransaction")}</DialogTitle>
                <DialogDescription>{tr("finance", "pageSubtitle")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr("finance", "typeLabel")}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFormData({ 
                          ...formData, 
                          type: newType,
                          category: newType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
                        });
                      }}
                    >
                      <option value="income">{tr("finance", "incomeType")}</option>
                      <option value="expense">{tr("finance", "expenseType")}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("finance", "category")}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {(formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label>{tr("finance", "amount")} (Rs)</Label>
                    <Input type="number" required min="1" placeholder={tr("finance", "enterAmount")} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("common", "date")}</Label>
                    <Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                    <Label>{tr("finance", "description")}</Label>
                  <Input required placeholder={tr("finance", "enterDescription")} value={formData.description} dir="auto" onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr("finance", "paymentMode")}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    >
                      {PAYMENT_MODES.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("finance", "remarks")}</Label>
                    <Input dir="auto" placeholder={tr("finance", "enterDescription")} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
                  </div>
                </div>

                {formData.type === "income" && (
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-dashed border-emerald-500/50">
                    <div className="space-y-2">
                      <Label className="text-xs">{tr("finance", "receiptId")} ({tr("common", "optional")})</Label>
                      <Input placeholder="REC-1029" value={formData.receiptId} onChange={(e) => setFormData({ ...formData, receiptId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{tr("finance", "receiptPhoto")} ({tr("common", "optional")})</Label>
                      <Input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setFormData({ ...formData, receiptPhoto: e.target.files[0] }); }} />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{tr("common", "cancel")}</Button>
                  <Button type="submit">{tr("finance", "save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start border-b rounded-none pb-0 h-auto bg-transparent">
          <TabsTrigger value="dashboard" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">{tr("finance", "dashboard")}</TabsTrigger>
          <TabsTrigger value="income" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none shadow-none text-emerald-600">{tr("finance", "incomeType")}</TabsTrigger>
          <TabsTrigger value="expense" className="data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none shadow-none text-red-600">{tr("finance", "expenseType")}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title={tr("finance", "totalIncome")} value={`Rs ${formatLocalizedNumber(summary.totalIncome, language)}`} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" accentClassName="bg-emerald-500" />
            <StatCard title={tr("finance", "totalExpenses")} value={`Rs ${formatLocalizedNumber(summary.totalExpense, language)}`} iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" accentClassName="bg-rose-500" />
            <StatCard title={tr("finance", "currentBalance")} value={`Rs ${formatLocalizedNumber(summary.currentBalance, language)}`} iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" accentClassName="bg-blue-500" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-sm border">
              <CardHeader>
                <CardTitle>{tr("finance", "incomeVsExpenses")}</CardTitle>
                <CardDescription>{tr("finance", "incomeVsExpensesDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "transparent" }} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">{tr("finance", "noChartData")}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-1 shadow-sm border">
              <CardHeader>
                <CardTitle>{tr("finance", "categoryBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[300px] overflow-y-auto">
                  {Object.entries(summary.categorySummary || {}).map(([cat, data]) => (
                    <div key={cat} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                      <span className="font-medium text-sm text-foreground/80">{cat}</span>
                  <span className={`font-bold text-sm ${data.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                        Rs {formatLocalizedNumber(data.amount, language)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(summary.categorySummary || {}).length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">{tr("finance", "noCategoryData")}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">{tr("finance", "recentActivity")}</h3>
               <Button variant="ghost" size="sm" onClick={() => setActiveTab("income")}>{tr("common", "viewAll")}</Button>
            </div>
            {renderTransactionTable("all", 10)}
          </div>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          {renderTransactionTable("income")}
        </TabsContent>

        <TabsContent value="expense" className="mt-6">
          {renderTransactionTable("expense")}
        </TabsContent>

      </Tabs>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-xl p-1 bg-black/90 border-none flex justify-center items-center overflow-hidden">
          {previewImage && <img src={previewImage} alt="Receipt Preview" className="max-w-full max-h-[80vh] object-contain rounded-md" />}
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Modal */}
      <Dialog open={!!receiptPreviewData} onOpenChange={(open) => !open && setReceiptPreviewData(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{tr("finance", "receiptPreview")}</DialogTitle>
          </DialogHeader>
          {receiptPreviewData && (
            <div className="mt-2 p-6 border rounded-lg bg-card shadow-sm space-y-6 relative overflow-y-auto flex-1 min-h-0">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10" />
               
               <div className="text-center border-b pb-4">
                 <h2 className="text-xl font-bold text-primary tracking-tight">{settings?.instituteName || "Madrasa Dawat-ul-Iman"}</h2>
                 {settings?.instituteNameUrdu && <h3 className="text-lg font-urdu mt-1">{settings.instituteNameUrdu}</h3>}
                 <p className="text-xs text-muted-foreground mt-1">{settings?.address || "Address details here"}</p>
                 <div className="mt-3 inline-block bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                     {tr("finance", "officialReceipt")}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-y-4 text-sm">
                 <div>
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tr("finance", "receiptNo")}</p>
                   <p className="font-mono font-semibold">{receiptPreviewData.receiptId || receiptPreviewData._id.slice(-6).toUpperCase()}</p>
                 </div>
                 <div className="text-end">
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tr("common", "date")}</p>
                   <p className="font-semibold">{formatLocalizedDate(receiptPreviewData.date, language)}</p>
                 </div>
                 
                 <div className="col-span-2 pt-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tr("finance", "payerName")}</p>
                   <p className="font-medium text-base">
                     {receiptPreviewData.referenceId ? (receiptPreviewData.referenceId.name || receiptPreviewData.referenceId.fullName) : (receiptPreviewData.description || "N/A")}
                   </p>
                   {receiptPreviewData.referenceId?.rollNumber && <p className="text-xs text-muted-foreground">Roll No: {receiptPreviewData.referenceId.rollNumber}</p>}
                 </div>

                 <div className="pt-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tr("finance", "academicYearClass")}</p>
                   <p className="font-medium">
                     {receiptPreviewData.academicYear || "N/A"} 
                     {receiptPreviewData.className && ` / ${receiptPreviewData.className}`}
                     {receiptPreviewData.referenceId?.studentClass && !receiptPreviewData.className && ` / ${receiptPreviewData.referenceId.studentClass}`}
                   </p>
                 </div>

                 <div className="pt-2 text-end">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tr("finance", "category")}</p>
                   <p className="font-medium">{receiptPreviewData.category}</p>
                 </div>
                 <div className="pt-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{tr("finance", "paymentMode")}</p>
                   <p className="font-medium">{receiptPreviewData.paymentMode}</p>
                 </div>
               </div>

               <div className="bg-muted/30 p-4 rounded-lg flex justify-between items-center border border-border/50 mt-4">
                  <span className="font-bold uppercase tracking-wider text-sm">{tr("finance", "amountPaid")}</span>
                  <span className="text-2xl font-bold text-primary">Rs {formatLocalizedNumber(receiptPreviewData.amount, language)}</span>
               </div>

               {receiptPreviewData.remarks && (
                  <div className="text-xs text-muted-foreground italic">
                    {tr("finance", "note")}: {receiptPreviewData.remarks}
                  </div>
               )}
               
               {receiptPreviewData.receiptPhoto && (
                 <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {tr("finance", "attachedReceiptPhoto")}
                    </p>
                   <img src={`${API_BASE_URL}${receiptPreviewData.receiptPhoto}`} alt="Attached Receipt" className="h-24 w-auto rounded border object-contain" loading="lazy" />
                 </div>
               )}
               
               {receiptPreviewData.status === 'Cancelled' && (
                 <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="border-4 border-red-600 text-red-600 text-4xl font-black uppercase tracking-widest px-8 py-2 rotate-[-15deg] opacity-70 rounded">
                      VOID
                    </div>
                 </div>
               )}
            </div>
          )}
          <DialogFooter className="mt-2 flex sm:justify-between items-center">
            <BackButton onClick={() => setReceiptPreviewData(null)} />
            {receiptPreviewData && receiptPreviewData.status !== 'Cancelled' && (
              <Button disabled={exportingId === receiptPreviewData._id} onClick={() => exportReceiptPDF(receiptPreviewData._id)}>
                {exportingId === receiptPreviewData._id ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Download className="w-4 h-4 me-2" />}
                {exportingId === receiptPreviewData._id ? tr("finance", "downloadingPdf") : tr("finance", "downloadFinalPdf")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
