import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Search, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

const categoryColors = {
  contract: "bg-red-100 text-red-800",
  permit: "bg-yellow-100 text-yellow-800",
  plan: "bg-blue-100 text-blue-800",
  report: "bg-purple-100 text-purple-800",
  financial: "bg-green-100 text-green-800",
  legal: "bg-orange-100 text-orange-800",
  photo: "bg-pink-100 text-pink-800",
  other: "bg-slate-100 text-slate-800",
};

export default function DocumentList({ entityType, entityId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", entityType, entityId],
    queryFn: () =>
      base44.entities.Document.filter({
        entity_type: entityType,
        entity_id: entityId,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
    },
  });

  // Filter to latest versions and search
  const latestDocuments = documents.filter(doc => doc.is_latest_version !== false);
  const filtered = latestDocuments.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    return (
      doc.name?.toLowerCase().includes(searchLower) ||
      doc.description?.toLowerCase().includes(searchLower) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // Group by category
  const byCategory = filtered.reduce((acc, doc) => {
    const cat = doc.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-slate-500">
          {documents.length === 0
            ? "No documents yet"
            : "No documents match your search"}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, docs]) => (
            <div key={category}>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h3>
              <div className="space-y-2">
                {docs.map(doc => (
                  <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-slate-900 hover:text-indigo-600 truncate"
                          >
                            {doc.name}
                          </a>
                          {doc.version && doc.version > 1 && (
                            <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          {doc.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.file_size && (
                            <span className="text-xs text-slate-500">
                              {(doc.file_size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          )}
                          <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                            <Clock className="h-3 w-3" />
                            {format(new Date(doc.created_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-8 w-8 p-0"
                        >
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Download">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this document?")) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}