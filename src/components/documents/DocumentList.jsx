import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText, Download, Trash2, MoreVertical, Upload, Search,
  History, Filter, File, Eye, Sparkles, Loader2, Calendar, Users, DollarSign, Hash
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import DocumentUpload from "./DocumentUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categoryColors = {
  contract: "bg-blue-100 text-blue-700",
  permit: "bg-green-100 text-green-700",
  plan: "bg-purple-100 text-purple-700",
  report: "bg-amber-100 text-amber-700",
  financial: "bg-emerald-100 text-emerald-700",
  legal: "bg-red-100 text-red-700",
  photo: "bg-pink-100 text-pink-700",
  other: "bg-slate-100 text-slate-700"
};

const keyInfoIcons = {
  dates: Calendar,
  parties: Users,
  values: DollarSign,
  permit_numbers: Hash,
  deadlines: Calendar,
};

export default function DocumentList({ entityType, entityId, phases = [], milestones = [] }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showVersions, setShowVersions] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', entityType, entityId],
    queryFn: () => base44.entities.Document.filter({
      entity_type: entityType,
      entity_id: entityId,
      is_latest_version: true
    }, '-created_date'),
    enabled: !!entityType && !!entityId
  });

  const deleteDocument = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', entityType, entityId] });
      toast.success("Document deleted");
    }
  });

  const { data: allVersions = {} } = useQuery({
    queryKey: ['documentVersions', entityType, entityId, Object.keys(showVersions)],
    queryFn: async () => {
      const results = {};
      for (const docId of Object.keys(showVersions)) {
        if (showVersions[docId]) {
          const doc = documents.find(d => d.id === docId);
          if (doc) {
            const versions = await base44.entities.Document.filter({
              $or: [{ id: docId }, { parent_document_id: doc.parent_document_id || docId }]
            }, '-version');
            results[docId] = versions;
          }
        }
      }
      return results;
    },
    enabled: Object.values(showVersions).some(v => v)
  });

  // Regular text search
  const displayedDocuments = (aiSearchResults !== null ? aiSearchResults : documents).filter(doc => {
    const matchesSearch = !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // AI natural language search
  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim()) { setAiSearchResults(null); return; }
    setAiSearching(true);
    const docSummaries = documents.map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      description: d.description,
      tags: d.tags,
      ai_extracted_info: d.ai_extracted_info
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a document search assistant. Given a user's search query and a list of documents, return the IDs of documents that match the query.

User query: "${aiSearchQuery}"

Documents:
${JSON.stringify(docSummaries, null, 2)}

Return only the IDs of matching documents, ordered by relevance. If nothing matches, return an empty array.`,
      response_json_schema: {
        type: "object",
        properties: {
          matching_ids: { type: "array", items: { type: "string" } }
        }
      }
    });

    const matchedIds = result.matching_ids || [];
    const matched = documents.filter(d => matchedIds.includes(d.id));
    const ordered = matchedIds.map(id => matched.find(d => d.id === id)).filter(Boolean);
    setAiSearchResults(ordered);
    setAiSearching(false);
  };

  const clearAiSearch = () => { setAiSearchResults(null); setAiSearchQuery(""); };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getSubEntityLabel = (doc) => {
    if (!doc.sub_entity_type || !doc.sub_entity_id) return null;
    const list = doc.sub_entity_type === "phase" ? phases : milestones;
    const item = list.find(i => i.id === doc.sub_entity_id);
    return item ? { type: doc.sub_entity_type, name: item.name } : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-4 border-slate-300 border-t-slate-900 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Search */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-900">AI Document Search</span>
          {aiSearchResults !== null && (
            <button onClick={clearAiSearch} className="ml-auto text-xs text-purple-600 hover:underline">Clear</button>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder='e.g., "contracts with deadlines in Q2" or "permits with values over $50k"'
            value={aiSearchQuery}
            onChange={(e) => setAiSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
            className="bg-white"
          />
          <Button onClick={handleAiSearch} disabled={aiSearching || !aiSearchQuery.trim()} className="bg-purple-700 hover:bg-purple-800 shrink-0">
            {aiSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
        {aiSearchResults !== null && (
          <p className="text-xs text-purple-700 mt-2">{aiSearchResults.length} result{aiSearchResults.length !== 1 ? 's' : ''} found for "{aiSearchQuery}"</p>
        )}
      </div>

      {/* Regular Search + Filter + Upload */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Filter by name or tag..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {filterCategory === "all" ? "All" : filterCategory}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterCategory("all")}>All Categories</DropdownMenuItem>
              {["contract","permit","plan","report","financial","legal","photo","other"].map(c => (
                <DropdownMenuItem key={c} onClick={() => setFilterCategory(c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowUpload(true)} className="bg-slate-900 hover:bg-slate-800">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Document Cards */}
      <div className="space-y-3">
        {displayedDocuments.map(doc => {
          const subLabel = getSubEntityLabel(doc);
          return (
            <div key={doc.id}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                      <FileText className="h-5 w-5 text-slate-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                          {doc.description && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge className={categoryColors[doc.category]}>{doc.category}</Badge>
                            {subLabel && (
                              <Badge variant="outline" className="text-xs capitalize">{subLabel.type}: {subLabel.name}</Badge>
                            )}
                            {doc.tags?.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                            {doc.version > 1 && <Badge variant="secondary" className="text-xs">v{doc.version}</Badge>}
                            {doc.ai_extracted_info && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs gap-1">
                                <Sparkles className="h-3 w-3" /> AI Analyzed
                              </Badge>
                            )}
                          </div>

                          {/* AI Extracted Key Info */}
                          {doc.ai_extracted_info && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(doc.ai_extracted_info).map(([key, values]) => {
                                if (!values?.length || key === "other") return null;
                                const Icon = keyInfoIcons[key] || FileText;
                                return (
                                  <div key={key} className="bg-slate-50 rounded p-2">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Icon className="h-3 w-3 text-slate-400" />
                                      <span className="text-xs text-slate-500 capitalize">{key.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 line-clamp-2">{values.join(", ")}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewDoc(doc)}>
                              <Eye className="h-4 w-4 mr-2" />Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                <Download className="h-4 w-4 mr-2" />Download
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setUploadingVersion(doc); setShowUpload(true); }}>
                              <Upload className="h-4 w-4 mr-2" />Upload New Version
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowVersions(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}>
                              <History className="h-4 w-4 mr-2" />{showVersions[doc.id] ? "Hide" : "Show"} Versions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteDocument.mutate(doc.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{doc.created_by}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Version History */}
              {showVersions[doc.id] && allVersions[doc.id] && (
                <div className="ml-12 mt-2 space-y-2">
                  {allVersions[doc.id].map(version => (
                    <Card key={version.id} className="border border-slate-200 bg-slate-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <File className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">Version {version.version}</span>
                                {version.is_latest_version && <Badge variant="outline" className="text-xs">Latest</Badge>}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {format(new Date(version.created_date), 'MMM d, yyyy h:mm a')} • {version.created_by}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={version.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {displayedDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {aiSearchResults !== null ? "No documents match your AI search" : "No documents found"}
            </p>
            {aiSearchResults === null && (
              <p className="text-sm text-slate-400 mt-1">Upload your first document to get started</p>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <DocumentUpload
        entityType={entityType}
        entityId={entityId}
        open={showUpload}
        onClose={() => { setShowUpload(false); setUploadingVersion(null); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents', entityType, entityId] })}
        existingDocument={uploadingVersion}
        phases={phases}
        milestones={milestones}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewDoc && <iframe src={previewDoc.file_url} className="w-full h-full border-0 rounded-lg" title={previewDoc.name} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}