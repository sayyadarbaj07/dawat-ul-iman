import React from "react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useSettings } from "@/context/SettingsContext";

export function ReportLayout({ 
  title, 
  subtitle, 
  children,
  showSignatures = false,
  signatureLabels = ["Class Teacher", "Principal / Nazim"]
}) {
  const { settings } = useSettings();
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="print-area bg-white text-black min-h-screen p-8 max-w-5xl mx-auto border sm:shadow-lg sm:my-8 print:border-none print:shadow-none print:m-0 print:p-0">
      
      {/* Report Header */}
      <div className="flex flex-col items-center justify-center border-b-2 border-gray-800 pb-6 mb-6">
        <BrandLogo 
            size="xl" 
            showName={false} 
            className="mb-4"
        />
        <h1 className="text-3xl font-bold uppercase tracking-wider text-center">{settings?.instituteName || "Madrasa Name"}</h1>
        <h2 className="text-xl font-medium mt-1 text-center" dir="rtl">{settings?.instituteNameUrdu || ""}</h2>
        
        {settings?.address && <p className="text-sm mt-2 text-center text-gray-700">{settings.address}</p>}
        {settings?.contactPhone && <p className="text-sm text-center text-gray-700">Phone: {settings.contactPhone}</p>}
        
        <div className="mt-6 text-center">
            <h3 className="text-2xl font-semibold uppercase underline underline-offset-4">{title}</h3>
            {subtitle && <p className="text-md mt-2 font-medium">{subtitle}</p>}
        </div>
      </div>

      {/* Report Content */}
      <div className="report-content min-h-[500px]">
        {children}
      </div>

      {/* Report Footer */}
      <div className="mt-16 pt-8 border-t border-gray-300">
        <div className="flex justify-between items-end text-sm font-medium">
            <div>
                <p>Generated on: {currentDate}</p>
                <p>Academic Year: {settings?.academicYear}</p>
            </div>
            
            {showSignatures && (
                <div className="flex gap-16">
                    {signatureLabels.map((label, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <div className="w-40 border-b border-gray-800 mb-2"></div>
                            <span className="uppercase text-xs tracking-wider">{label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      
    </div>
  );
}
