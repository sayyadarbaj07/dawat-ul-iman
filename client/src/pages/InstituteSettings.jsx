import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Upload } from "lucide-react";
import { API_BASE } from "@/lib/api/request";

export default function InstituteSettings() {
  const { settings, updateSettings, loading } = useSettings();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    instituteName: "",
    instituteNameUrdu: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
    academicYear: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [previewLogo, setPreviewLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        instituteName: settings.instituteName || "",
        instituteNameUrdu: settings.instituteNameUrdu || "",
        address: settings.address || "",
        contactPhone: settings.contactPhone || "",
        contactEmail: settings.contactEmail || "",
        academicYear: settings.academicYear || "",
      });
      
      let initialLogo = "/logo1.jpeg";
      if (settings.logoUrl) {
          if (settings.logoUrl.startsWith("http") || settings.logoUrl.startsWith("/logo1")) {
              initialLogo = settings.logoUrl;
          } else {
              const baseUrl = API_BASE.replace('/api', '');
              initialLogo = `${baseUrl}${settings.logoUrl}`;
          }
      }
      setPreviewLogo(initialLogo);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const data = new FormData();
    Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
    });
    if (logoFile) {
        data.append("logo", logoFile);
    }

    const success = await updateSettings(data);
    if (success) {
        toast({ title: "Success", description: "Institute settings updated successfully." });
    } else {
        toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <motion.div
      className="space-y-6 max-w-4xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Institute Settings</h2>
        <p className="text-muted-foreground">
          Manage Madrasa profile, contact info, and logo for reports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            General Information
          </CardTitle>
          <CardDescription>This information will appear on marksheets and official reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center gap-4">
                    <Label>Institute Logo</Label>
                    <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        {previewLogo ? (
                            <img src={previewLogo} alt="Logo preview" className="object-contain w-full h-full p-2" />
                        ) : (
                            <span className="text-gray-400 text-sm">No Logo</span>
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current.click()}
                        className="flex gap-2"
                    >
                        <Upload className="w-4 h-4" /> Change Logo
                    </Button>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="space-y-2">
                        <Label>Institute Name (English)</Label>
                        <Input 
                            name="instituteName" 
                            value={formData.instituteName} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Institute Name (Urdu)</Label>
                        <Input 
                            name="instituteNameUrdu" 
                            value={formData.instituteNameUrdu} 
                            onChange={handleChange} 
                            dir="rtl"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Address</Label>
                        <Input 
                            name="address" 
                            value={formData.address} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <Input 
                            name="contactPhone" 
                            value={formData.contactPhone} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Contact Email</Label>
                        <Input 
                            name="contactEmail" 
                            type="email"
                            value={formData.contactEmail} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Current Academic Year</Label>
                        <Input 
                            name="academicYear" 
                            value={formData.academicYear} 
                            onChange={handleChange} 
                            placeholder="e.g. 2026-2027"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={saving} className="flex gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Settings"}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
