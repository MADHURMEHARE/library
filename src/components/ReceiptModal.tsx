/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, Printer, Check, Receipt } from "lucide-react";
import { Student, Payment, Organization, Invoice } from "../types";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  student: Student | null;
  invoice: Invoice | null;
  organization: Organization | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  student,
  invoice,
  organization
}) => {
  if (!isOpen || !payment || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = organization?.currency === "USD" ? "$" : "₹";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header (No print) */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-slate-800 dark:text-slate-100">
            <Receipt className="h-5 w-5 text-indigo-600" />
            <span>Invoice & Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content (This can be styled specifically for paper print) */}
        <div className="overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950 flex-1" id="printable-receipt-area">
          <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xs border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            
            {/* Header / Brand */}
            <div className="text-center">
              {organization?.logo ? (
                <img
                  src={organization.logo}
                  alt={organization.name}
                  referrerPolicy="no-referrer"
                  className="mx-auto h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 font-bold text-indigo-600 dark:bg-indigo-900/30">
                  {organization?.name?.substring(0, 2).toUpperCase() || "RR"}
                </div>
              )}
              <h1 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {organization?.name || "Silent Reading Room"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto mt-1">
                {organization?.address || "Reading Room Address"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Phone: {organization?.phone || "N/A"}
              </p>
            </div>

            {/* Status Stamp */}
            <div className="my-5 flex items-center justify-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                <Check className="h-3 w-3" />
                <span>PAYMENT RECEIVED</span>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="border-t border-b border-dashed border-slate-200 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 grid grid-cols-2 gap-y-2">
              <div>
                <span className="text-slate-400 block">INVOICE NO:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {invoice?.invoiceNumber || `INV-${payment.id.toUpperCase()}`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">RECEIPT NO:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {invoice?.receiptNumber || `REC-${payment.id.toUpperCase()}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">DATE:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{payment.date}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">PAYMENT MODE:</span>
                <span className="font-semibold text-indigo-600 uppercase">{payment.method.replace("_", " ")}</span>
              </div>
            </div>

            {/* Student Info */}
            <div className="mt-4 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Billed To</span>
              <div className="mt-1 flex items-center gap-3">
                <img
                  src={student.photo}
                  alt={student.name}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</h4>
                  <p className="text-slate-500 text-[10px] font-mono">ID: {student.studentId} | {student.phone}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="mt-6 w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                  <th className="pb-2 font-medium">DESCRIPTION</th>
                  <th className="pb-2 text-right font-medium">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <tr>
                  <td className="py-3 text-slate-800 dark:text-slate-200">
                    <span className="font-semibold block">Reading Room Membership Pass</span>
                    <span className="text-slate-500 text-[10px]">Silent seat allocation with utilities</span>
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                    {currencySymbol} {payment.amount.toLocaleString()}
                  </td>
                </tr>
                {payment.discount > 0 && (
                  <tr>
                    <td className="py-2 text-emerald-600">
                      Discount Applied {payment.couponCode && `(${payment.couponCode})`}
                    </td>
                    <td className="py-2 text-right font-semibold text-emerald-600">
                      -{currencySymbol} {payment.discount.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Block */}
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {currencySymbol} {payment.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Tax / GST (0%):</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{currencySymbol} 0.00</span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-100 mt-2 dark:border-slate-800 text-sm font-bold">
                <span className="text-slate-900 dark:text-slate-100">Total Paid:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {currencySymbol} {payment.netPaid.toLocaleString()}
                </span>
              </div>
              {payment.balance > 0 && (
                <div className="flex justify-between py-1 text-red-600 font-semibold bg-red-50 dark:bg-red-950/20 px-2 rounded mt-1 border border-red-100 dark:border-red-900/30">
                  <span>Balance Due:</span>
                  <span>{currencySymbol} {payment.balance.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Footer / Thank you */}
            <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
              <p>Thank you for studying with us!</p>
              <p className="mt-1 font-mono">This is an electronically generated receipt.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
