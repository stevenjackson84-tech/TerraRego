import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Users, FileText, RefreshCw, Mail, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import EmailCompose from "@/components/contacts/EmailCompose";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AISuggestionsPanel({ project, phases, milestones, documents = [] }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailContact, setEmailContact] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list()
  });

  const contextSummary = [
    `Project: ${project.name}`,
    `Status: ${project.status}`,
    project.description ? `Description: ${project.description}` : null,
    phases.length ? `Phases: ${phases.map(p => `${p.name} (${p.status})`).join(', ')}` : null,
    milestones.length ? `Milestones: ${milestones.map(m => `${m.name} (${m.status})`).join(', ')}` : null,
    documents.length ? `Existing docs: ${documents.map(d => `${d.name} [${d.category}]`).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const fetchSuggestions = async () => {
    setLoading(true);
    const contactSummaries = contacts.map(c => ({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      type: c.contact_type,
      company: c.company,
      email: c.email
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI assistant for a real estate land development company. Based on the project context, suggest relevant contacts and documents.

Project Context:
${contextSummary}

Available Contacts:
${JSON.stringify(contactSummaries, null, 2)}

Return:
1. Up to 4 most relevant contacts (by ID) with a brief reason why they're relevant now
2. Up to 4 document types that should be collected or reviewed at this project stage, with a brief note

Focus on what's most actionable given the current phase/milestone statuses.`,
      response_json_schema: {
        type: "object",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          documents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Enrich contact suggestions with full contact data
    const enriched = {
      contacts: (result.contacts || []).map(s => ({
        ...s,
        contact: contacts.find(c => c.id === s.id)
      })).filter(s => s.contact),
      documents: result.documents || []
    };

    setSuggestions(enriched);
    setLoading(false);
  };

  const categoryColors = {
    contract: "bg-blue-100 text-blue-700",
    permit: "bg-green-100 text-green-700",
    plan: "bg-purple-100 text-purple-700",
    report: "bg-amber-100 text-amber-700",
    financial: "bg-emerald-100 text-emerald-700",
    legal: "bg-red-100 text-red-700",
    other: "bg-slate-100 text-slate-700"
  };

  const contactTypeColors = {
    landowner: "bg-emerald-100 text-emerald-700",
    broker: "bg-blue-100 text-blue-700",
    attorney: "bg-purple-100 text-purple-700",
    consultant: "bg-amber-100 text-amber-700",
    contractor: "bg-slate-100 text-slate-700",
    government: "bg-red-100 text-red-700",
    other: "bg-gray-100 text-gray-700"
  };

  return (
    <>
      <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Suggestions
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchSuggestions}
              disabled={loading}
              className="bg-white"
            >
              {loading
                ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                : suggestions
                  ? <RefreshCw className="h-3 w-3 mr-1.5" />
                  : <Sparkles className="h-3 w-3 mr-1.5 text-purple-600" />
              }
              {suggestions ? "Refresh" : "Get Suggestions"}
            </Button>
          </div>
          {!suggestions && !loading && (
            <p className="text-xs text-slate-500 mt-1">
              AI analyzes your project phases & milestones to suggest relevant contacts and documents.
            </p>
          )}
        </CardHeader>

        {loading && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-purple-700 py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing project context...
            </div>
          </CardContent>
        )}

        {suggestions && !loading && (
          <CardContent className="space-y-5">
            {/* Suggested Contacts */}
            {suggestions.contacts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">Relevant Contacts</span>
                </div>
                <div className="space-y-2">
                  {suggestions.contacts.map((s, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 flex items-start gap-3 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {s.contact.first_name?.[0]}{s.contact.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-900">
                            {s.contact.first_name} {s.contact.last_name}
                          </span>
                          <Badge className={cn("text-xs", contactTypeColors[s.contact.contact_type])}>
                            {s.contact.contact_type}
                          </Badge>
                        </div>
                        {s.contact.company && (
                          <p className="text-xs text-slate-500">{s.contact.company}</p>
                        )}
                        <p className="text-xs text-purple-700 mt-1 italic">{s.reason}</p>
                      </div>
                      {s.contact.email && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEmailContact(s.contact)}
                          title="Send email"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Documents */}
            {suggestions.documents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">Recommended Documents</span>
                </div>
                <div className="space-y-2">
                  {suggestions.documents.map((doc, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-slate-900">{doc.name}</span>
                        {doc.category && (
                          <Badge className={cn("text-xs", categoryColors[doc.category] || categoryColors.other)}>
                            {doc.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-purple-700 italic">{doc.reason}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Upload these in the <span className="font-medium">Documents</span> tab.
                </p>
              </div>
            )}

            {suggestions.contacts.length === 0 && suggestions.documents.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-2">No suggestions at this time.</p>
            )}
          </CardContent>
        )}
      </Card>

      {emailContact && (
        <EmailCompose
          contact={emailContact}
          open={!!emailContact}
          onClose={() => setEmailContact(null)}
        />
      )}
    </>
  );
}