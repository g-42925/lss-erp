"use client";

import React, { useState } from "react";
import BankVoucherTab from "@/components/finance/BankVoucherTab";
import CashVoucherTab from "@/components/finance/CashVoucherTab";

export default function VoucherPage() {
  const [activeTab, setActiveTab] = useState<"bank" | "cash">("bank");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header & Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden">
        <div className="px-4 md:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Finance Vouchers</h1>
              <p className="text-slate-500 text-sm mt-1">Pusat pengelolaan pencatatan dan pencetakan voucher perusahaan</p>
            </div>
            
            {/* Segmented Control Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-lg w-fit border border-slate-200/60 shadow-sm">
              <button
                onClick={() => setActiveTab("bank")}
                className={`px-5 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === "bank"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Bank Voucher
              </button>
              <button
                onClick={() => setActiveTab("cash")}
                className={`px-5 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === "cash"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Cash Voucher
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 md:px-8 py-6 print:m-0 print:p-0">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === "bank" && <BankVoucherTab />}
          {activeTab === "cash" && <CashVoucherTab />}
        </div>
      </div>
    </div>
  );
}
