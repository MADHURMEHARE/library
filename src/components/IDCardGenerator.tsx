/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, Printer, Landmark, Sparkles, QrCode } from "lucide-react";
import { Student, Organization } from "../types";

interface IDCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  organization: Organization | null;
}

export const IDCardGenerator: React.FC<IDCardGeneratorProps> = ({
  isOpen,
  onClose,
  student,
  organization
}) => {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-slate-800 dark:text-slate-100">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <span>Generate Student ID Card</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Badge</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950 flex-1 flex justify-center">
          
          {/* Card Dimensions mimicking Standard ISO ID Card (2.125" x 3.370" vertically scaled) */}
          <div className="relative w-[320px] h-[480px] rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-950 text-white shadow-2xl overflow-hidden border border-slate-800 flex flex-col justify-between p-6">
            
            {/* Background elements */}
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl"></div>
            <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 rounded-full bg-violet-500/10 blur-3xl"></div>

            {/* ID Card Top Header */}
            <div className="z-10 flex items-center gap-3 border-b border-white/10 pb-4">
              {organization?.logo ? (
                <img
                  src={organization.logo}
                  alt={organization.name}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-lg object-cover border border-white/20"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-bold text-white border border-white/20">
                  <Landmark className="h-5 w-5" />
                </div>
              )}
              <div>
                <h2 className="font-display text-sm font-bold tracking-tight text-white line-clamp-1">
                  {organization?.name || "Silent Study Library"}
                </h2>
                <span className="text-[9px] text-indigo-300 uppercase tracking-widest font-semibold block">
                  STUDENT ID PASS
                </span>
              </div>
            </div>

            {/* Photo Section */}
            <div className="z-10 flex flex-col items-center mt-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-indigo-500 blur-md opacity-20"></div>
                <img
                  src={student.photo}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="relative h-28 w-28 rounded-full object-cover border-4 border-indigo-500/30 shadow-lg"
                />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-white text-center">
                {student.name}
              </h3>
              <p className="text-xs text-indigo-400 font-mono font-medium">
                {student.studentId}
              </p>
            </div>

            {/* Details Section */}
            <div className="z-10 bg-white/5 rounded-xl p-3 border border-white/10 text-[11px] grid grid-cols-2 gap-y-2 mt-4">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Course/Class</span>
                <span className="font-semibold text-slate-200 truncate block">{student.course || "General Student"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Batch Time</span>
                <span className="font-semibold text-slate-200 truncate block">{student.batch || "Full Day"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Joining Date</span>
                <span className="font-semibold text-slate-200 block">{student.joinDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Emergency No.</span>
                <span className="font-semibold text-slate-200 block truncate">{student.parentPhone || "N/A"}</span>
              </div>
            </div>

            {/* Bottom QR/Footer Area */}
            <div className="z-10 mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
              <div className="text-[9px] text-slate-400">
                <span className="block font-semibold text-white truncate max-w-[180px]">{organization?.name || "Reading Room"}</span>
                <p className="mt-0.5 text-[8px] text-slate-400">Scan at entrance terminal for automated check-in.</p>
              </div>
              
              {/* Simulated QR Code Component */}
              <div className="bg-white p-1.5 rounded-lg shadow-md shrink-0 flex items-center justify-center">
                <QrCode className="h-9 w-9 text-slate-950" />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
