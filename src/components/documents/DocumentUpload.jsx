import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function DocumentUpload({ entityType, entityId, open, onClose, onSuccess, existingDocument, phases = [], milestones = [] }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [formData, setFormData] = useState({
    name: existingDocument?.name || "",
    category: existingDocument?.category || "other",
    tags: existingDocument?.tags || [],
    description: existingDocument?.description || "",
    sub_entity_type: "",
    sub_entity_id: ""
  });
  const [newTag, setNewTag] = useState("");

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    if (!formData.name) {
      setFormData(prev => ({ ...prev, name: selectedFile.name }));
    }

    // Auto-analyze if it's a supported type
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'text/plain'];
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const supportedExts = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'txt'];
    
    if (supportedTypes.includes(selectedFile.type) || supportedExts.includes(ext)) {
      await runAIAnalysis(selectedFile);
    }
  };

  const runAIAnalysis = async (selectedFile) => {
    setAnalyzing(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedFile });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this document for a real estate land development company. Extract and return:
1. The most appropriate category (one of: contract, permit, plan, report, financial, legal, photo, other)
2. A concise document description (1-2 sentences)
3. Key information extracted: dates, parties involved, dollar values, permit numbers, deadlines, property addresses
4. Suggested tags (3-5 relevant keywords)
5. Document title/name if visible

Be precise and focus on information relevant to real estate development.`,
        file_urls: [uploadResult.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["contract", "permit", "plan", "report", "financial", "legal", "photo", "other"] },
            description: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            document_title: { type: "string" },
            key_info: {
              type: "object",
              properties: {
                dates: { type: "array", items: { type: "string" } },
                parties: { type: "array", items: { type: "string" } },
                values: { type: "array", items: { type: "string" } },
                permit_numbers: { type: "array", items: { type: "string" } },
                deadlines: { type: "array", items: { type: "string" } },
                addresses: { type: "array", items: { type: "string" } },
                other: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setAiAnalysis({ ...result, uploaded_file_url: uploadResult.file_url });
      setFormData(prev => ({
        ...prev,
        category: result.category || prev.category,
        description: result.description || prev.description,
        tags: result.tags?.length ? result.tags : prev.tags,
        name: (result.document_title && result.document_title.length < 100) ? result.document_title : prev.name
      }));
    } catch (err) {
      // silently fail - user can fill in manually
    } finally {
      setAnalyzing(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleUpload = async () => {
    if (!file && !existingDocument) { toast.error("Please select a file"); return; }
    setUploading(true);

    let fileUrl = aiAnalysis?.uploaded_file_url || existingDocument?.file_url;
    let fileSize = existingDocument?.file_size;
    let fileType = existingDocument?.file_type;

    if (file && !aiAnalysis?.uploaded_file_url) {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      fileUrl = uploadResult.file_url;
    }
    if (file) {
      fileSize = file.size;
      fileType = file.type || file.name.split('.').pop();
    }

    const documentData = {
      name: formData.name,
      file_url: fileUrl,
      file_size: fileSize,
      file_type: fileType,
      category: formData.category,
      tags: formData.tags,
      description: formData.description,
      entity_type: entityType,
      entity_id: entityId,
      ai_extracted_info: aiAnalysis?.key_info || null
    };

    if (formData.sub_entity_type && formData.sub_entity_id) {
      documentData.sub_entity_type = formData.sub_entity_type;
      documentData.sub_entity_id = formData.sub_entity_id;
    }

    if (existingDocument) {
      await base44.entities.Document.update(existingDocument.id, { is_latest_version: false });
      documentData.version = (existingDocument.version || 1) + 1;
      documentData.parent_document_id = existingDocument.parent_document_id || existingDocument.id;
      documentData.is_latest_version = true;
    }

    await base44.entities.Document.create(documentData);
    toast.success(existingDocument ? "New version uploaded" : "Document uploaded & analyzed");
    onSuccess();
    onClose();
    setUploading(false);
    setFile(null);
    setAiAnalysis(null);
  };

  const subOptions = formData.sub_entity_type === "phase" ? phases : formData.sub_entity_type === "milestone" ? milestones : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {existingDocument ? "Upload New Version" : "Upload Document"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div>
            <Label>Select File *</Label>
            <div className="mt-2 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
              <Input type="file" onChange={handleFileSelect} className="cursor-pointer" />
            </div>
            {analyzing && (
              <div className="flex items-center gap-2 mt-2 text-sm text-purple-600">
                <Sparkles className="h-4 w-4 animate-pulse" />
                AI is analyzing your document...
              </div>
            )}
            {aiAnalysis && !analyzing && (
              <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                AI analysis complete — fields auto-filled
              </div>
            )}
          </div>

          {/* AI Extracted Info */}
          {aiAnalysis?.key_info && (
            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Extracted Information
              </p>
              {aiAnalysis.key_info.parties?.length > 0 && (
                <div>
                  <p className="text-xs text-purple-700 font-medium">Parties</p>
                  <p className="text-xs text-purple-900">{aiAnalysis.key_info.parties.join(", ")}</p>
                </div>
              )}
              {aiAnalysis.key_info.dates?.length > 0 && (
                <div>
                  <p className="text-xs text-purple-700 font-medium">Dates</p>
                  <p className="text-xs text-purple-900">{aiAnalysis.key_info.dates.join(", ")}</p>
                </div>
              )}
              {aiAnalysis.key_info.values?.length > 0 && (
                <div>
                  <p className="text-xs text-purple-700 font-medium">Values</p>
                  <p className="text-xs text-purple-900">{aiAnalysis.key_info.values.join(", ")}</p>
                </div>
              )}
              {aiAnalysis.key_info.permit_numbers?.length > 0 && (
                <div>
                  <p className="text-xs text-purple-700 font-medium">Permit Numbers</p>
                  <p className="text-xs text-purple-900">{aiAnalysis.key_info.permit_numbers.join(", ")}</p>
                </div>
              )}
              {aiAnalysis.key_info.deadlines?.length > 0 && (
                <div>
                  <p className="text-xs text-purple-700 font-medium">Deadlines</p>
                  <p className="text-xs text-purple-900">{aiAnalysis.key_info.deadlines.join(", ")}</p>
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <Label>Document Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Zoning Approval Letter" />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["contract","permit","plan","report","financial","legal","photo","other"].map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Phase or Milestone */}
          {(phases.length > 0 || milestones.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link To (Optional)</Label>
                <Select value={formData.sub_entity_type} onValueChange={(v) => setFormData({ ...formData, sub_entity_type: v, sub_entity_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {phases.length > 0 && <SelectItem value="phase">Phase</SelectItem>}
                    {milestones.length > 0 && <SelectItem value="milestone">Milestone</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {formData.sub_entity_type && (
                <div>
                  <Label>&nbsp;</Label>
                  <Select value={formData.sub_entity_id} onValueChange={(v) => setFormData({ ...formData, sub_entity_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {subOptions.map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <Button type="button" onClick={addTag} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="pl-3 pr-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-2 hover:bg-slate-300 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Optional description" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || analyzing || (!file && !existingDocument) || !formData.name} className="bg-slate-900 hover:bg-slate-800">
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />{existingDocument ? "Upload New Version" : "Upload"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}