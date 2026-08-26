import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/ui/StatCard";
import { ArrowUpRight, ArrowDownRight, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { financeApi } from "@/lib/api";

export default function Finance() {
  const { tr } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: "income",
    amount: "",
    description: "",
    category: "General",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await financeApi.list();
      // Ensure most recent transactions are first
      const sorted = (res.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      await financeApi.create({
        type: formData.type,
        amount: Number(formData.amount),
        description: formData.description,
        category: formData.category,
        date: formData.date,
      });
      setIsModalOpen(false);
      setFormData({
        type: "income",
        amount: "",
        description: "",
        category: "General",
        date: new Date().toISOString().split("T")[0],
      });
      loadTransactions();
    } catch (err) {
      console.error(err);
      alert("Failed to save transaction.");
    }
  };

  // Derived State: Calculations
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = totalIncome - totalExpenses;

  // Derived State: Chart Data (grouped by Month-Year)
  const generateChartData = () => {
    const monthlyData = {};

    transactions.forEach((t) => {
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

  // Tab Filtering
  const filteredTransactions =
    activeTab === "all"
      ? transactions
      : transactions.filter((t) => t.type === activeTab);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tr("finance", "pageTitle")}</h2>
          <p className="text-muted-foreground mt-1">{tr("finance", "pageSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {tr("finance", "export")}
          </Button>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {tr("finance", "newTransaction")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>Record a new income or expense entry.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (Rs)</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    required
                    placeholder="e.g. Monthly Fee, Electricity Bill..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      required
                      placeholder="e.g. Fees, Utility..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Transaction</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={tr("finance", "totalIncome")}
          value={`Rs ${totalIncome.toLocaleString()}`}
          icon={<ArrowUpRight className="h-6 w-6" />}
          className="border-emerald-500/20 bg-emerald-500/5"
        />
        <StatCard
          title={tr("finance", "totalExpenses")}
          value={`Rs ${totalExpenses.toLocaleString()}`}
          icon={<ArrowDownRight className="h-6 w-6" />}
          className="border-red-500/20 bg-red-500/5"
        />
        <StatCard
          title={tr("finance", "currentBalance")}
          value={`Rs ${currentBalance.toLocaleString()}`}
          icon={<ArrowUpRight className="h-6 w-6" />}
          className="border-primary/20 bg-primary/5"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
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
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No chart data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{tr("finance", "recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx._id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold text-sm ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}Rs {tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">No recent activity.</div>
              )}
            </div>
            {transactions.length > 0 && (
              <div className="p-4 border-t">
                <Button variant="link" className="w-full h-8">
                  {tr("finance", "viewFullLedger")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">{tr("finance", "allTransactions")}</TabsTrigger>
          <TabsTrigger value="income">{tr("finance", "income")}</TabsTrigger>
          <TabsTrigger value="expense">{tr("finance", "expenses")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b-border/60">
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx._id} className="hover:bg-muted/40 transition-colors duration-200">
                      <TableCell className="font-medium text-xs text-muted-foreground font-mono">
                        {tx._id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold text-sm">{tx.description}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize border border-transparent ${
                            tx.type === "income" ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          tx.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}Rs {tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
