import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Target, DollarSign, Users, AlertTriangle, TrendingUp } from "lucide-react";

export default function BusinessPlan() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-slate-900">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Business Plan</h1>
              <p className="text-slate-500 mt-1">Strategic overview and project planning framework</p>
            </div>
          </div>
        </div>

        {/* Key Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Executive Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-slate-900" />
                <CardTitle className="text-lg">Executive Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                High-level overview of development projects, market positioning, and strategic goals.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Mission and vision statement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Core value proposition</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Key success factors</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Financial Analysis */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-slate-900" />
                <CardTitle className="text-lg">Financial Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Comprehensive financial projections, budgeting, and ROI calculations for development projects.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Cost breakdown and estimates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Revenue projections</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Cash flow analysis</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Market Analysis */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-900" />
                <CardTitle className="text-lg">Market Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Understanding market conditions, target demographics, and competitive landscape.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Market trends and opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Target customer profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Competitive analysis</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-slate-900" />
                <CardTitle className="text-lg">Risk Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Identification of potential challenges and mitigation strategies for project success.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Regulatory and compliance risks</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Market volatility factors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Mitigation strategies</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Team & Organization */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-900" />
              <CardTitle className="text-lg">Team & Organization</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Leadership</h4>
                <p className="text-sm text-slate-600">
                  Key stakeholders, decision-makers, and executive team structure
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Development Team</h4>
                <p className="text-sm text-slate-600">
                  Project managers, engineers, contractors, and consultants
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Advisory Board</h4>
                <p className="text-sm text-slate-600">
                  Legal counsel, financial advisors, and industry experts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}