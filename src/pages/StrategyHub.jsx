import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, DollarSign, BarChart3, Sigma } from "lucide-react";

import BusinessPlan from "./BusinessPlan";
import Analytics from "./Analytics";
import FinancialDashboard from "./FinancialDashboard";
import Reports from "./Reports";
import LeanSixSigma from "./LeanSixSigma";

export default function StrategyHub() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Strategy Hub</h1>
          <p className="text-slate-500 mt-1">Business planning, analytics, financials, reports, and process improvement</p>
        </div>

        <Tabs defaultValue="business-plan">
          <TabsList className="bg-white border border-slate-200 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="business-plan" className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Business Plan
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" />
              Financial Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="process" className="flex items-center gap-1.5 text-xs">
              <Sigma className="h-3.5 w-3.5" />
              Process Improvement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business-plan">
            <BusinessPlan />
          </TabsContent>

          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialDashboard />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          <TabsContent value="process">
            <LeanSixSigma />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
