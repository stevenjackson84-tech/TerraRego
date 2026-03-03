import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function DocumentSearch() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allDocuments = [] } = useQuery({
    queryKey: ["all-documents"],
    queryFn: () => base44.entities.Document.list(),
  });

  const results = searchQuery.trim() ? allDocuments.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    return (
      doc.name?.toLowerCase().includes(searchLower) ||
      doc.description?.toLowerCase().includes(searchLower) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
      doc.ai_extracted_info?.dates?.some(d => d.includes(searchQuery)) ||
      doc.ai_extracted_info?.permit_numbers?.some(p => p.includes(searchQuery))
    );
  }) : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search all documents by name, tags, dates, permit numbers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchQuery && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <Card className="p-6 text-center text-slate-500">
              No documents match "{searchQuery}"
            </Card>
          ) : (
            <>
              <p className="text-sm text-slate-600">Found {results.length} document(s)</p>
              <div className="space-y-2">
                {results.map(doc => (
                  <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-indigo-600 hover:underline flex items-center gap-2"
                        >
                          {doc.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-sm text-slate-600 mt-1">{doc.description}</p>
                        <div className="flex flex-wrap gap-2 items-center mt-2">
                          <Badge className="text-xs">{doc.category}</Badge>
                          {doc.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.ai_extracted_info?.dates?.length > 0 && (
                            <span className="text-xs text-slate-500">
                              Dates: {doc.ai_extracted_info.dates.join(", ")}
                            </span>
                          )}
                          {doc.ai_extracted_info?.permit_numbers?.length > 0 && (
                            <span className="text-xs text-slate-500">
                              Permits: {doc.ai_extracted_info.permit_numbers.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {format(new Date(doc.created_date), "MMM d")}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}