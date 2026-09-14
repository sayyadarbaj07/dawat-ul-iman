import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { studentDocumentsApi } from "@/lib/api";
import { 
  FileText, Plus, Download, Eye, RefreshCw, CheckCircle, 
  XCircle, Trash2, ShieldAlert, Loader2, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function StudentDocumentManager({ studentId }) {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Form states
  const [docType, setDocType] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";
  const isRtl = language === "ur";

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await studentDocumentsApi.list(studentId);
      setDocuments(res.data || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError(tr("documents", "unauthorized") || "You're not authorized to access student documents.");
      } else {
        setError(tr("documents", "fetchError") || "Unable to load documents. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [studentId]);

  const resetForm = () => {
    setDocType("");
    setDocTitle("");
    setDocFile(null);
    setRejectionReason("");
    setSelectedDoc(null);
    setIsSubmitting(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        e.target.value = "";
        return;
      }
      setDocFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docType || !docTitle || !docFile) return;
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("documentType", docType);
    formData.append("title", docTitle);
    formData.append("document", docFile);

    try {
      await studentDocumentsApi.upload(studentId, formData);
      setUploadOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Upload failed");
      setIsSubmitting(false);
    }
  };

  const handleReplace = async (e) => {
    e.preventDefault();
    if (!selectedDoc || !docFile) return;
    
    setIsSubmitting(true);
    const formData = new FormData();
    if (docTitle) formData.append("title", docTitle);
    formData.append("document", docFile);

    try {
      await studentDocumentsApi.replace(selectedDoc._id, formData);
      setReplaceOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Replace failed");
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (doc) => {
    try {
      await studentDocumentsApi.verify(doc._id);
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Verify failed");
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!selectedDoc || !rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await studentDocumentsApi.reject(selectedDoc._id, rejectionReason);
      setRejectOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Reject failed");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    setIsSubmitting(true);
    try {
      await studentDocumentsApi.delete(selectedDoc._id);
      setDeleteOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Delete failed");
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access Denied"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{tr("documents", "documents")}</h2>
          <p className="text-muted-foreground">{tr("documents", "studentDocumentsAndVerification")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {tr("documents", "uploadDocument")}
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={tr("documents", "noDocumentsUploaded")}
          description="Documents securely managed by administration."
          action={isAdmin ? {
            label: tr("documents", "uploadDocument"),
            onClick: () => setUploadOpen(true)
          } : undefined}
        />
      ) : (
        <div className="grid gap-4">
          {documents.map(doc => (
            <Card key={doc._id}>
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{doc.title}</h3>
                    <Badge variant={
                      doc.status === 'verified' ? 'success' : 
                      doc.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {tr("documents", doc.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{tr("documents", doc.documentType)}</span>
                    <span>•</span>
                    <span dir="ltr">{doc.originalName}</span>
                    <span>•</span>
                    <span dir="ltr">{formatFileSize(doc.size)}</span>
                    {doc.replacedDocumentId && (
                      <>
                        <span>•</span>
                        <span className="text-xs border px-1 rounded bg-muted">Version Updated</span>
                      </>
                    )}
                  </div>
                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <div className="flex items-start gap-1 text-xs text-destructive mt-1 bg-destructive/10 p-2 rounded">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p>{doc.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" onClick={() => studentDocumentsApi.view(doc._id)}>
                      <Eye className="w-4 h-4 mr-1" /> {tr("documents", "view")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => studentDocumentsApi.download(doc._id)}>
                      <Download className="w-4 h-4 mr-1" /> {tr("documents", "download")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedDoc(doc); setReplaceOpen(true); }}>
                      <RefreshCw className="w-4 h-4 mr-1" /> {tr("documents", "replace")}
                    </Button>
                    
                    {doc.status !== 'verified' && (
                      <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700" onClick={() => handleVerify(doc)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> {tr("documents", "verify")}
                      </Button>
                    )}
                    
                    {doc.status !== 'rejected' && (
                      <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700" onClick={() => { setSelectedDoc(doc); setRejectOpen(true); }}>
                        <XCircle className="w-4 h-4 mr-1" /> {tr("documents", "reject")}
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => { setSelectedDoc(doc); setDeleteOpen(true); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* UPLOAD DIALOG */}
      <Dialog open={uploadOpen} onOpenChange={(val) => { setUploadOpen(val); if (!val) resetForm(); }}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{tr("documents", "uploadDocument")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>{tr("documents", "documentType")}</Label>
              <Select value={docType} onValueChange={setDocType} dir={isRtl ? "rtl" : "ltr"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aadhaar">{tr("documents", "aadhaar")}</SelectItem>
                  <SelectItem value="birth_certificate">{tr("documents", "birth_certificate")}</SelectItem>
                  <SelectItem value="previous_institution_certificate">{tr("documents", "previous_institution_certificate")}</SelectItem>
                  <SelectItem value="guardian_id">{tr("documents", "guardian_id")}</SelectItem>
                  <SelectItem value="student_photo">{tr("documents", "student_photo")}</SelectItem>
                  <SelectItem value="other">{tr("documents", "other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tr("documents", "title")}</Label>
              <Input required value={docTitle} onChange={e => setDocTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{tr("documents", "file")}</Label>
              <Input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">{tr("documents", "allowedFormats")}</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !docType || !docTitle || !docFile}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tr("documents", "upload")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REPLACE DIALOG */}
      <Dialog open={replaceOpen} onOpenChange={(val) => { setReplaceOpen(val); if (!val) resetForm(); }}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{tr("documents", "replace")} - {selectedDoc?.title}</DialogTitle>
            <DialogDescription>
              Old document will be preserved in history as inactive.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReplace} className="space-y-4">
            <div className="space-y-2">
              <Label>{tr("documents", "title")} (Optional update)</Label>
              <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder={selectedDoc?.title} />
            </div>
            <div className="space-y-2">
              <Label>{tr("documents", "file")}</Label>
              <Input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">{tr("documents", "allowedFormats")}</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !docFile}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tr("documents", "replace")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={rejectOpen} onOpenChange={(val) => { setRejectOpen(val); if (!val) resetForm(); }}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{tr("documents", "reject")} - {selectedDoc?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-2">
              <Label>{tr("documents", "rejectionReason")}</Label>
              <Textarea required value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={isSubmitting || !rejectionReason.trim()}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tr("documents", "reject")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={(val) => { setDeleteOpen(val); if (!val) resetForm(); }}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{tr("documents", "delete")}</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this document from the active profile? This action will mark it as deleted (soft delete).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{tr("common", "cancel") || "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tr("documents", "delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
