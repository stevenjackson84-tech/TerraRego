import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, Download, Trash2, MoreVertical, Upload, Search, 
  History, Filter, File
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import DocumentUpload from "./DocumentUpload";

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

export default function DocumentList({ entityType, entityId }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showVersions, setShowVersions] = useState({});

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
              $or: [
                { id: docId },
                { parent_document_id: doc.parent_document_id || docId }
              ]
            }, '-version');
            results[docId] = versions;
          }
        }
      }
      return results;
    },
    enabled: Object.values(showVersions).some(v => v)
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {filterCategory === "all" ? "All Categories" : filterCategory}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterCategory("all")}>All Categories</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("contract")}>Contract</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("permit")}>Permit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("plan")}>Plan</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("report")}>Report</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("financial")}>Financial</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("legal")}>Legal</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("photo")}>Photo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterCategory("other")}>Other</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowUpload(true)} className="bg-slate-900 hover:bg-slate-800">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-3">
        {filteredDocuments.map(doc => (
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
                          <Badge className={categoryColors[doc.category]}>
                            {doc.category}
                          </Badge>
                          {doc.tags?.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.version > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              v{doc.version}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setUploadingVersion(doc);
                            setShowUpload(true);
                          }}>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload New Version
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowVersions(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}>
                            <History className="h-4 w-4 mr-2" />
                            {showVersions[doc.id] ? "Hide" : "Show"} Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteDocument.mutate(doc.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
                              {version.is_latest_version && (
                                <Badge variant="outline" className="text-xs">Latest</Badge>
                              )}
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
        ))}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No documents found</p>
            <p className="text-sm text-slate-400 mt-1">Upload your first document to get started</p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <DocumentUpload
        entityType={entityType}
        entityId={entityId}
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          setUploadingVersion(null);
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents', entityType, entityId] })}
        existingDocument={uploadingVersion}
      />
    </div>
  );
}