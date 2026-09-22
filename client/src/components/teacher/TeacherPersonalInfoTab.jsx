import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { User, MapPin, Phone, Briefcase } from "lucide-react";

export function TeacherPersonalInfoTab({ teacher }) {
  const { tr } = useLanguage();

  const calculateAge = (dob) => {
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      active: tr("teachers", "active") || "Active",
      on_leave: tr("teachers", "onLeave") || "On Leave",
      resigned: tr("teachers", "resigned") || "Resigned",
      inactive: tr("teachers", "inactive") || "Inactive"
    };
    return statusMap[status] || statusMap.inactive || "—";
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {tr("teacherProfile", "identity") || "Identity"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "fullName") || "Full Name"}</div>
            <div className="font-medium">{teacher?.name || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "fatherName") || "Father Name"}</div>
            <div className="font-medium">{teacher?.fatherName || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "id") || "Teacher ID"}</div>
            <div className="font-medium font-mono">{(teacher?._id || teacher?.id || "—").toString().slice(-6).toUpperCase()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "dateOfBirth") || "Date of Birth"}</div>
            <div className="font-medium" dir="ltr">{teacher?.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "age") || "Age"}</div>
            <div className="font-medium">{calculateAge(teacher?.dateOfBirth)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Address */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <MapPin className="w-5 h-5 text-primary ml-[-12px] opacity-70" />
            {tr("teacherProfile", "contactAddress") || "Contact & Address"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "mobileNumber") || "Mobile"}</div>
            <div className="font-medium" dir="ltr">{teacher?.mobile || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "whatsapp") || "WhatsApp"}</div>
            <div className="font-medium" dir="ltr">{teacher?.whatsapp || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</div>
            <div className="font-medium" dir="ltr">{teacher?.email || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "emergencyContact") || "Emergency Contact"}</div>
            <div className="font-medium" dir="ltr">{teacher?.emergencyContact || "—"}</div>
          </div>
          <div className="space-y-1 sm:col-span-2 md:col-span-3">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "address") || "Address"}</div>
            <div className="font-medium" dir="auto">{teacher?.address || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "city") || "City"}</div>
            <div className="font-medium">{teacher?.city || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "district") || "District"}</div>
            <div className="font-medium">{teacher?.district || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "state") || "State"}</div>
            <div className="font-medium">{teacher?.state || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "pinCode") || "PIN Code"}</div>
            <div className="font-medium" dir="ltr">{teacher?.pinCode || "—"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            {tr("teacherProfile", "employmentDetails") || "Employment Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "joiningDate") || "Joining Date"}</div>
            <div className="font-medium" dir="ltr">{teacher?.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "status") || "Employment Status"}</div>
            <div className="font-medium">{getStatusLabel(teacher?.status)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "designation") || "Designation"}</div>
            <div className="font-medium">{teacher?.designation || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "department") || "Department"}</div>
            <div className="font-medium">{teacher?.department || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Experience</div>
            <div className="font-medium">{teacher?.experience ? `${teacher.experience} Years` : "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Weekly Periods</div>
            <div className="font-medium">{teacher?.weeklyPeriods || "—"}</div>
          </div>
          {teacher?.status === "inactive" && teacher?.deactivationDate && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "deactivationDate") || "Deactivation Date"}</div>
              <div className="font-medium text-red-600" dir="ltr">{new Date(teacher.deactivationDate).toLocaleDateString()}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
