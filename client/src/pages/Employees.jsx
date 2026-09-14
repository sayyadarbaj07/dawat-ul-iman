import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, Plus, MoreVertical, Edit, Trash, Ban } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedDate } from "@/utils/localizationUtils";
import { employeeApi } from "@/lib/api";

export default function Employees() {
    const { tr, language } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const [formData, setFormData] = useState({
      name: "",
      designation: "",
      mobile: "",
      address: "",
      joiningDate: "",
      monthlySalary: "",
      remarks: "",
      isActive: true,
      photo: null,
    });

    const [editFormData, setEditFormData] = useState({
      name: "",
      designation: "",
      mobile: "",
      address: "",
      joiningDate: "",
      monthlySalary: "",
      remarks: "",
      isActive: true,
      photo: null,
    });

    const loadEmployees = async (isBackground = false) => {
      try {
        if (isBackground) setIsSearching(true);
        else setLoading(true);
        const params = {};
        if (filterStatus === "active") params.isActive = true;
        if (filterStatus === "inactive") params.isActive = false;
        
        const res = await employeeApi.list(params);
        setEmployees(res.data || []);
      } catch (err) {
        setEmployees([]);
      } finally {
        if (isBackground) setIsSearching(false);
        else setLoading(false);
      }
    };

    useEffect(() => {
      loadEmployees(false);
    }, [filterStatus]);

    const handleSubmit = async (event) => {
      event.preventDefault();
      setErrorMsg("");
      try {
        const payload = new FormData();
        payload.append("name", formData.name);
        payload.append("designation", formData.designation);
        payload.append("mobile", formData.mobile);
        payload.append("address", formData.address);
        payload.append("joiningDate", formData.joiningDate);
        payload.append("monthlySalary", Number(formData.monthlySalary));
        payload.append("remarks", formData.remarks);
        payload.append("isActive", formData.isActive);
        if (formData.photo) {
          payload.append("photo", formData.photo);
        }
        
        await employeeApi.createWithFile(payload);
        setIsAddModalOpen(false);
        setFormData({
          name: "", designation: "", mobile: "", address: "", joiningDate: "", monthlySalary: "", remarks: "", isActive: true, photo: null
        });
        loadEmployees();
      } catch (error) {
        setErrorMsg(error.message || tr("employees", "failedToSave"));
      }
    };

    const openViewModal = (employee) => {
      setSelectedEmployee(employee);
      setIsViewModalOpen(true);
    };

    const openEditModal = (employee) => {
      setSelectedEmployee(employee);
      const jDate = new Date(employee.joiningDate);
      const dateString = !isNaN(jDate) ? jDate.toISOString().split("T")[0] : "";

      setEditFormData({
        name: employee.name || "",
        designation: employee.designation || "",
        mobile: employee.mobile || "",
        address: employee.address || "",
        joiningDate: dateString,
        monthlySalary: employee.monthlySalary || "",
        remarks: employee.remarks || "",
        isActive: employee.isActive,
        photo: null,
      });
      setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (event) => {
      event.preventDefault();
      try {
        const payload = new FormData();
        payload.append("name", editFormData.name);
        payload.append("designation", editFormData.designation);
        payload.append("mobile", editFormData.mobile);
        payload.append("address", editFormData.address);
        payload.append("joiningDate", editFormData.joiningDate);
        payload.append("monthlySalary", Number(editFormData.monthlySalary));
        payload.append("remarks", editFormData.remarks);
        payload.append("isActive", editFormData.isActive);
        if (editFormData.photo) {
          payload.append("photo", editFormData.photo);
        }
        await employeeApi.updateWithFile(selectedEmployee._id || selectedEmployee.id, payload);
        setIsEditModalOpen(false);
        loadEmployees();
      } catch (error) {
        console.error(error);
      }
    };

    const handleDeactivate = async (id) => {
      const dateStr = window.prompt(tr("employees", "deactivateDatePrompt") || "Enter effective deactivation date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
      if (dateStr === null) return;
      if (isNaN(new Date(dateStr).getTime())) {
         alert("Invalid date format. Please use YYYY-MM-DD.");
         return;
      }
      if (!confirm(tr("employees", "deactivateConfirm"))) return;
      try {
        await employeeApi.deactivate(id, { deactivationDate: dateStr });
        loadEmployees();
      } catch (error) {
        console.error(error);
        alert(tr("employees", "failedToDeactivate"));
      }
    };

    const filteredEmployees = employees.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeader 
          title={tr("employees", "pageTitle")}
          description={tr("employees", "pageSubtitle")}
        />
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tr("employees", "addEmployee")}</DialogTitle>
              </DialogHeader>
              {errorMsg && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{errorMsg}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">{tr("common", "name")}</Label>
                      <Input dir="auto" id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="designation">{tr("employees", "designation")}</Label>
                      <Input dir="auto" id="designation" required value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="mobile">{tr("common", "contact")}</Label>
                      <Input dir="ltr" id="mobile" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="joiningDate">{tr("employees", "joiningDate")}</Label>
                      <Input dir="ltr" id="joiningDate" type="date" required value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monthlySalary">{tr("employees", "monthlySalary")}</Label>
                    <Input dir="ltr" id="monthlySalary" required type="number" min="0" value={formData.monthlySalary} onChange={e => setFormData({...formData, monthlySalary: e.target.value})}/>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">{tr("students", "address")}</Label>
                    <Input dir="auto" id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}/>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="remarks">{tr("employees", "remarks")}</Label>
                    <Input dir="auto" id="remarks" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})}/>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="photo">{tr("teachers", "profilePhoto")}</Label>
                    <Input id="photo" type="file" accept="image/*" onChange={e => setFormData({...formData, photo: e.target.files[0]})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="isActive">{tr("common", "status")}</Label>
                    <select
                      id="isActive"
                      value={String(formData.isActive)}
                      onChange={e => setFormData({...formData, isActive: e.target.value === "true"})}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="true">{tr("common", "active")}</option>
                      <option value="false">{tr("common", "inactive")}</option>
                    </select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>{tr("common", "cancel")}</Button>
                  <Button type="submit">{tr("common", "save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{tr("employees", "editEmployee")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit}>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">{tr("common", "name")}</Label>
                      <Input dir="auto" id="edit-name" required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-designation">{tr("employees", "designation")}</Label>
                      <Input dir="auto" id="edit-designation" required value={editFormData.designation} onChange={e => setEditFormData({...editFormData, designation: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-mobile">{tr("common", "contact")}</Label>
                      <Input dir="ltr" id="edit-mobile" value={editFormData.mobile} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})}/>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-joiningDate">{tr("employees", "joiningDate")}</Label>
                      <Input dir="ltr" id="edit-joiningDate" type="date" required value={editFormData.joiningDate} onChange={e => setEditFormData({...editFormData, joiningDate: e.target.value})}/>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-monthlySalary">{tr("employees", "monthlySalary")}</Label>
                    <Input dir="ltr" id="edit-monthlySalary" required type="number" min="0" value={editFormData.monthlySalary} onChange={e => setEditFormData({...editFormData, monthlySalary: e.target.value})}/>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-address">{tr("students", "address")}</Label>
                    <Input dir="auto" id="edit-address" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})}/>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-remarks">{tr("employees", "remarks")}</Label>
                    <Input dir="auto" id="edit-remarks" value={editFormData.remarks} onChange={e => setEditFormData({...editFormData, remarks: e.target.value})}/>
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="edit-photo">{tr("teachers", "profilePhotoEdit")}</Label>
                    <Input id="edit-photo" type="file" accept="image/*" onChange={e => setEditFormData({...editFormData, photo: e.target.files[0]})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-isActive">{tr("common", "status")}</Label>
                    <select
                      id="edit-isActive"
                      value={String(editFormData.isActive)}
                      onChange={e => setEditFormData({...editFormData, isActive: e.target.value === "true"})}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="true">{tr("common", "active")}</option>
                      <option value="false">{tr("common", "inactive")}</option>
                    </select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>{tr("common", "cancel")}</Button>
                  <Button type="submit">{tr("common", "update")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>{tr("common", "viewProfile")}</DialogTitle>
              </DialogHeader>
              {selectedEmployee && (
                <div className="grid gap-4 py-4">
                  {selectedEmployee.photo && (
                    <div className="flex justify-center mb-4">
                      <img src={`http://localhost:5000${selectedEmployee.photo}`} alt={selectedEmployee.name} className="h-24 w-24 rounded-full object-cover border" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/50">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("employees", "employeeId")}</span>
                      <span className="font-medium text-foreground text-xs font-mono">{selectedEmployee.employeeId}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("common", "name")}</span>
                      <span className="font-medium text-foreground">{selectedEmployee.name}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("employees", "designation")}</span>
                      <span className="font-medium text-foreground">{selectedEmployee.designation}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("common", "contact")}</span>
                      <span className="font-medium text-foreground">{selectedEmployee.mobile || "—"}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("employees", "joiningDate")}</span>
                      <span className="font-medium text-foreground">{formatLocalizedDate(selectedEmployee.joiningDate, language)}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("employees", "monthlySalary")}</span>
                      <span className="font-medium text-foreground">{formatLocalizedNumber(selectedEmployee.monthlySalary, language)}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tr("common", "status")}</span>
                      <span className={`font-medium ${selectedEmployee.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedEmployee.isActive ? tr("common", "active") : tr("common", "inactive")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>{tr("common", "close")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4 mt-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tr("common", "searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-muted"
                dir="auto"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background flex-1 sm:flex-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">{tr("common", "all")}</option>
                <option value="active">{tr("common", "active")}</option>
                <option value="inactive">{tr("common", "inactive")}</option>
              </select>
              <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0">
                <Plus className="me-2 h-4 w-4"/> {tr("employees", "addEmployee")}
              </Button>
            </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">{tr("employees", "employeeId")}</TableHead>
                  <TableHead>{tr("common", "name")}</TableHead>
                  <TableHead>{tr("employees", "designation")}</TableHead>
                  <TableHead>{tr("common", "contact")}</TableHead>
                  <TableHead>{tr("employees", "joiningDate")}</TableHead>
                  <TableHead>{tr("employees", "monthlySalary")}</TableHead>
                  <TableHead>{tr("common", "status")}</TableHead>
                  <TableHead className="text-right">{tr("common", "actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex justify-center items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                        <span className="text-muted-foreground">{tr("employees", "loadingEmployees")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <EmptyState icon={Ban} title={tr("employees", "noEmployees")} description={tr("employees", "noEmployeesDesc")} />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp._id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {emp.employeeId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                            {emp.photo ? (
                              <img src={`http://localhost:5000${emp.photo}`} alt={emp.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-primary font-medium text-xs">
                                {emp.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{emp.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/50">
                          {emp.designation}
                        </span>
                      </TableCell>
                      <TableCell>
                        {emp.mobile || "—"}
                      </TableCell>
                      <TableCell>{formatLocalizedDate(emp.joiningDate, language)}</TableCell>
                      <TableCell>{formatLocalizedNumber(emp.monthlySalary, language)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          emp.isActive 
                            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-900/50' 
                            : 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-800/30 dark:text-gray-400 dark:ring-gray-800/50'
                        }`}>
                          {emp.isActive ? tr("common", "active") : tr("common", "inactive")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>{tr("common", "actions")}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openViewModal(emp)}>
                              <Search className="mr-2 h-4 w-4" />
                              {tr("common", "view")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(emp)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {tr("common", "edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {emp.isActive && (
                              <DropdownMenuItem 
                                onClick={() => handleDeactivate(emp._id || emp.id)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                {tr("employees", "deactivateEmployee")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </motion.div>
    );
}
