import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, X, Building2, Download, Link2 } from "lucide-react";

const MUNICIPALITIES = [
  { value: "provo_ut", label: "Provo, UT" },
  { value: "orem_ut", label: "Orem, UT" },
  { value: "lehi_ut", label: "Lehi, UT" },
  { value: "saratoga_springs_ut", label: "Saratoga Springs, UT" },
  { value: "eagle_mountain_ut", label: "Eagle Mountain, UT" },
  { value: "american_fork_ut", label: "American Fork, UT" },
  { value: "pleasant_grove_ut", label: "Pleasant Grove, UT" },
  { value: "spanish_fork_ut", label: "Spanish Fork, UT" },
  { value: "payson_ut", label: "Payson, UT" },
  { value: "springville_ut", label: "Springville, UT" },
  { value: "mapleton_ut", label: "Mapleton, UT" },
  { value: "vineyard_ut", label: "Vineyard, UT" },
  { value: "lindon_ut", label: "Lindon, UT" },
  { value: "cedar_hills_ut", label: "Cedar Hills, UT" },
  { value: "highland_ut", label: "Highland, UT" },
  { value: "alpine_ut", label: "Alpine, UT" },
  { value: "herriman_ut", label: "Herriman, UT" },
  { value: "riverton_ut", label: "Riverton, UT" },
  { value: "south_jordan_ut", label: "South Jordan, UT" },
  { value: "draper_ut", label: "Draper, UT" },
  { value: "bluffdale_ut", label: "Bluffdale, UT" },
  { value: "salt_lake_city_ut", label: "Salt Lake City, UT" },
  { value: "west_jordan_ut", label: "West Jordan, UT" },
  { value: "murray_ut", label: "Murray, UT" },
  { value: "taylorsville_ut", label: "Taylorsville, UT" },
  { value: "west_valley_city_ut", label: "West Valley City, UT" },
  { value: "millcreek_ut", label: "Millcreek, UT" },
  { value: "holladay_ut", label: "Holladay, UT" },
  { value: "cottonwood_heights_ut", label: "Cottonwood Heights, UT" },
  { value: "sandy_ut", label: "Sandy, UT" },
  { value: "midvale_ut", label: "Midvale, UT" },
  { value: "ogden_ut", label: "Ogden, UT" },
  { value: "layton_ut", label: "Layton, UT" },
  { value: "clearfield_ut", label: "Clearfield, UT" },
  { value: "st_george_ut", label: "St. George, UT" },
  { value: "cedar_city_ut", label: "Cedar City, UT" },
  { value: "custom", label: "Other / Custom Municipality" },
];

const statusIcon = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  na: <span className="h-4 w-4 inline-block text-slate-400 text-xs font-bold">N/A</span>,
};

const statusBadge = {
  pass: "bg-green-100 text-green-800",
  fail: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  na: "bg-slate-100 text-slate-500",
};

export default function PlanCheck() {
  const [municipality, setMunicipality] = useState("");
  const [customMunicipality, setCustomMunicipality] = useState("");
  const [zoningDistrict, setZoningDistrict] = useState("");
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    setFile(f);
    setResults(null);
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setFileUrl(file_url);
    setUploading(false);
  };

  const removeFile = () => {
    setFile(null);
    setFileUrl(null);
    setResults(null);
    fileInputRef.current.value = "";
  };

  const runPlanCheck = async () => {
    if (!fileUrl || !municipality) return;
    setAnalyzing(true);
    setResults(null);

    const munLabel = municipality === "custom"
      ? customMunicipality
      : MUNICIPALITIES.find(m => m.value === municipality)?.label || municipality;

    const prompt = `You are a licensed civil engineering plan checker and municipal code expert.

A civil plan set PDF has been uploaded for plan check review.
Municipality: ${munLabel}
Zoning District: ${zoningDistrict || "Not specified — infer from plan set if possible"}

Your task:
1. Carefully analyze the uploaded civil plan set PDF.
2. Use your knowledge of ${munLabel}'s municipal code and development standards (or general Utah municipal standards if specific code is unavailable) to check the following items:
   - Right-of-Way (R.O.W.) widths for all street types shown
   - Lot dimensions (width, depth, area) vs. zoning minimums
   - Setbacks (front, rear, side) vs. code requirements
   - Sidewalk widths and locations
   - Cul-de-sac radius (if applicable)
   - Lot coverage limits
   - Street grades / max slope
   - Utility easement widths
   - Block length limits
   - Drainage/stormwater requirements noted
   - Landscaping buffer requirements
   - Any other code items visible or implied by the plan set

3. For EACH item, return:
   - item: the code item name
   - required: the code requirement (with source if known, e.g. "50 ft R.O.W. per ${munLabel} Code 10-4-3")
   - found: what was found in the plan set
   - status: "pass", "fail", "warning", or "na"
   - notes: any additional explanation, deficiency detail, or recommendation

4. Also provide:
   - overall_status: "pass", "fail", or "conditional" (conditional = passes with minor issues/warnings)
   - overall_summary: a concise professional summary paragraph of the plan check findings
   - municipality_code_version: the code version or reference you used (approximate is fine)

Be thorough and specific. If a required value cannot be determined from the plan, mark status "na" and explain.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          overall_status: { type: "string" },
          overall_summary: { type: "string" },
          municipality_code_version: { type: "string" },
          checks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                required: { type: "string" },
                found: { type: "string" },
                status: { type: "string" },
                notes: { type: "string" },
              }
            }
          }
        }
      }
    });

    setResults(response);
    setAnalyzing(false);
  };

  const overallColors = {
    pass: "bg-green-50 border-green-200 text-green-800",
    fail: "bg-red-50 border-red-200 text-red-800",
    conditional: "bg-amber-50 border-amber-200 text-amber-800",
  };

  const [projectName, setProjectName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [linkedEntityType, setLinkedEntityType] = useState("none");
  const [linkedEntityId, setLinkedEntityId] = useState("");

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: () => base44.entities.Deal.list("-created_date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const handleLinkEntity = (type, id) => {
    setLinkedEntityType(type);
    setLinkedEntityId(id);
    if (type === "deal") {
      const deal = deals.find(d => d.id === id);
      if (deal) {
        if (!projectName) setProjectName(deal.name);
        if (!projectAddress && deal.address) setProjectAddress([deal.address, deal.city, deal.state].filter(Boolean).join(", "));
        if (!zoningDistrict && deal.zoning_current) setZoningDistrict(deal.zoning_current);
        // Auto-select municipality from city
        if (!municipality && deal.city) {
          const cityLower = deal.city.toLowerCase().replace(/\s+/g, "_");
          const match = MUNICIPALITIES.find(m => m.value.startsWith(cityLower));
          if (match) setMunicipality(match.value);
        }
      }
    } else if (type === "project") {
      const project = projects.find(p => p.id === id);
      if (project) {
        if (!projectName) setProjectName(project.name);
      }
    }
  };

  const exportToPDF = () => {
    const munLabel = municipality === "custom"
      ? customMunicipality
      : MUNICIPALITIES.find(m => m.value === municipality)?.label || municipality;

    const statusLabel = { pass: "PASS", fail: "FAIL", conditional: "CONDITIONAL APPROVAL" };
    const statusColor = { pass: "#16a34a", fail: "#dc2626", conditional: "#d97706" };

    const rows = results.checks?.map((check, i) => `
      <tr style="background:${check.status === "fail" ? "#fff1f2" : check.status === "warning" ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;color:#64748b">${i + 1}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600">${check.item}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569">${check.required || "—"}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;color:#475569">${check.found || "—"}</td>
        <td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:11px;text-align:center">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:10px;background:${check.status==="pass"?"#dcfce7":check.status==="fail"?"#fee2e2":check.status==="warning"?"#fef3c7":"#f1f5f9"};color:${check.status==="pass"?"#166534":check.status==="fail"?"#991b1b":check.status==="warning"?"#92400e":"#475569"}">${check.status?.toUpperCase()||"N/A"}</span>
          ${check.notes ? `<div style="font-size:10px;color:#64748b;margin-top:3px">${check.notes}</div>` : ""}
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Plan Check Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div style="border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:24px;display:flex;align-items:flex-start;justify-content:space-between">
    <div>
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a">PLAN CHECK REPORT</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b">Civil Plan Set Review — Municipal Code Compliance</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#64748b">
      <div><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</div>
      ${preparedBy ? `<div><strong>Prepared by:</strong> ${preparedBy}</div>` : ""}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr>
      ${projectName ? `<td style="padding:6px 0;width:50%"><strong style="font-size:12px">Project:</strong> <span style="font-size:12px">${projectName}</span></td>` : "<td></td>"}
      <td style="padding:6px 0;width:50%"><strong style="font-size:12px">Municipality:</strong> <span style="font-size:12px">${munLabel}</span></td>
    </tr>
    <tr>
      ${projectAddress ? `<td style="padding:6px 0"><strong style="font-size:12px">Address:</strong> <span style="font-size:12px">${projectAddress}</span></td>` : "<td></td>"}
      <td style="padding:6px 0"><strong style="font-size:12px">Zoning:</strong> <span style="font-size:12px">${zoningDistrict || "Not specified"}</span></td>
    </tr>
    ${results.municipality_code_version ? `<tr><td colspan="2" style="padding:6px 0"><strong style="font-size:12px">Code Reference:</strong> <span style="font-size:12px">${results.municipality_code_version}</span></td></tr>` : ""}
  </table>

  <div style="background:${results.overall_status==="pass"?"#f0fdf4":results.overall_status==="fail"?"#fff1f2":"#fffbeb"};border:2px solid ${statusColor[results.overall_status]||"#e2e8f0"};border-radius:8px;padding:16px;margin-bottom:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:18px;font-weight:800;color:${statusColor[results.overall_status]||"#1e293b"}">${statusLabel[results.overall_status]||results.overall_status?.toUpperCase()}</span>
      <div style="display:flex;gap:8px">
        <span style="background:#dcfce7;color:#166534;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700">${passCount} PASS</span>
        ${warnCount > 0 ? `<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700">${warnCount} WARNING</span>` : ""}
        ${failCount > 0 ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700">${failCount} FAIL</span>` : ""}
      </div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#374151">${results.overall_summary}</p>
  </div>

  <h2 style="font-size:14px;font-weight:700;margin-bottom:10px;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em">Code Check Results</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
      <tr style="background:#0f172a;color:#fff">
        <th style="padding:10px;border:1px solid #0f172a;text-align:left;width:30px">#</th>
        <th style="padding:10px;border:1px solid #0f172a;text-align:left;width:20%">Item</th>
        <th style="padding:10px;border:1px solid #0f172a;text-align:left;width:25%">Required</th>
        <th style="padding:10px;border:1px solid #0f172a;text-align:left;width:25%">Found in Plans</th>
        <th style="padding:10px;border:1px solid #0f172a;text-align:left;width:15%">Status / Notes</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:space-between">
    <div style="font-size:10px;color:#94a3b8">Generated by TerraRego Plan Check • ${new Date().toLocaleDateString()}</div>
    <div style="font-size:10px;color:#94a3b8">This report is AI-assisted and should be verified by a licensed engineer.</div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const passCount = results?.checks?.filter(c => c.status === "pass").length || 0;
  const failCount = results?.checks?.filter(c => c.status === "fail").length || 0;
  const warnCount = results?.checks?.filter(c => c.status === "warning").length || 0;
  const naCount = results?.checks?.filter(c => c.status === "na").length || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Plan Check
          </h1>
          <p className="text-slate-500 mt-2">Upload a civil plan set PDF and check it against municipal code requirements automatically.</p>
        </div>

        {/* Setup Card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-base">Plan Check Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Project Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Project Name <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input placeholder="e.g. Sunset Ridge Subdivision" value={projectName} onChange={e => setProjectName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Project Address <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input placeholder="e.g. 1234 Main St" value={projectAddress} onChange={e => setProjectAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prepared By <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input placeholder="e.g. John Smith, PE" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} />
              </div>
            </div>

            {/* Municipality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Municipality <span className="text-red-500">*</span></Label>
                <Select value={municipality} onValueChange={setMunicipality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select municipality..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MUNICIPALITIES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Zoning District <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. R-1-8, R-2, PD-R..."
                  value={zoningDistrict}
                  onChange={e => setZoningDistrict(e.target.value)}
                />
              </div>
            </div>

            {/* Custom municipality input */}
            {municipality === "custom" && (
              <div className="space-y-1.5">
                <Label>Municipality Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Santaquin, UT"
                  value={customMunicipality}
                  onChange={e => setCustomMunicipality(e.target.value)}
                />
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-1.5">
              <Label>Civil Plan Set (PDF) <span className="text-red-500">*</span></Label>
              {!file ? (
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click to upload a PDF</p>
                  <p className="text-xs text-slate-400 mt-1">Civil plan sets, site plans, subdivision plats</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <button onClick={removeFile} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Run button */}
            <Button
              className="w-full bg-slate-900 hover:bg-slate-700 h-11"
              disabled={!fileUrl || !municipality || uploading || analyzing || (municipality === "custom" && !customMunicipality)}
              onClick={runPlanCheck}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Plan Set...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Run Plan Check
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analyzing state */}
        {analyzing && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="font-medium text-slate-700">Reviewing plan set against municipal code...</p>
              <p className="text-sm text-slate-400 mt-1">This may take 30–60 seconds for complex plan sets.</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && !analyzing && (
          <div className="space-y-5">
            {/* Overall Status */}
            <div className={`rounded-xl border p-5 ${overallColors[results.overall_status] || "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {results.overall_status === "pass" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {results.overall_status === "fail" && <XCircle className="h-5 w-5 text-red-600" />}
                  {results.overall_status === "conditional" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                  <span className="font-semibold text-lg capitalize">
                    {results.overall_status === "conditional" ? "Conditional Approval" : results.overall_status === "pass" ? "Plan Passes" : "Plan Fails"}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-green-100 text-green-800">{passCount} Pass</Badge>
                  {warnCount > 0 && <Badge className="bg-amber-100 text-amber-800">{warnCount} Warning</Badge>}
                  {failCount > 0 && <Badge className="bg-red-100 text-red-800">{failCount} Fail</Badge>}
                  {naCount > 0 && <Badge className="bg-slate-100 text-slate-600">{naCount} N/A</Badge>}
                </div>
              </div>
              <p className="text-sm leading-relaxed">{results.overall_summary}</p>
              {results.municipality_code_version && (
                <p className="text-xs mt-2 opacity-70">Code reference: {results.municipality_code_version}</p>
              )}
            </div>

            {/* Check Items Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-base">Code Check Results</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-medium text-slate-600 w-8">#</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Required</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Found in Plans</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.checks?.map((check, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${check.status === "fail" ? "bg-red-50/40" : check.status === "warning" ? "bg-amber-50/30" : ""}`}>
                        <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{check.item}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{check.required}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{check.found || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {statusIcon[check.status] || statusIcon.na}
                            <Badge className={`text-xs ${statusBadge[check.status] || statusBadge.na}`}>
                              {check.status?.toUpperCase() || "N/A"}
                            </Badge>
                          </div>
                          {check.notes && (
                            <p className="text-xs text-slate-500 mt-1 max-w-xs">{check.notes}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Action buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setResults(null); }}>
                Clear Results & Start Over
              </Button>
              <Button onClick={exportToPDF} className="bg-slate-900 hover:bg-slate-700">
                <Download className="h-4 w-4 mr-2" />
                Export PDF Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}