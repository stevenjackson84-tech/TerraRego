import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Loader2, Copy, Mail, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

export default function DealCommunicationAssistant({ deal, emailHistory = [], activities = [], contacts = [] }) {
  const [draftEmail, setDraftEmail] = useState(null);
  const [emailSummary, setEmailSummary] = useState(null);
  const [contactTimes, setContactTimes] = useState(null);
  const [loading, setLoading] = useState(null);
  const [activeTab, setActiveTab] = useState("draft");

  // Extract email content for summary
  const emailThreadContent = emailHistory
    .slice(0, 10)
    .map(e => `To: ${e.to}\nSubject: ${e.subject}\n${e.body}`)
    .join("\n\n---\n\n");

  const draftFollowUpEmail = async () => {
    setLoading("draft");
    try {
      const recentActivity = activities.slice(0, 3).map(a => a.description).join("; ") || "No recent activity";
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Draft a professional follow-up email for a real estate deal in the ${deal?.stage || "prospecting"} stage.

Deal Details:
- Property: ${deal?.name}
- Location: ${deal?.address}, ${deal?.city}, ${deal?.state}
- Stage: ${deal?.stage?.replace('_', ' ')}
- Recent Activity: ${recentActivity}

Write a concise, professional follow-up email that:
- References the deal stage appropriately
- Mentions recent progress/activity if available
- Includes a clear call to action
- Is warm but professional in tone
- Is 3-5 sentences maximum

Provide the email in this format:
SUBJECT: [subject line]
BODY: [email body]`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      setDraftEmail(result);
      setActiveTab("draft");
      toast.success("Email draft generated");
    } catch (error) {
      console.error("Draft failed:", error);
      toast.error("Failed to generate email draft");
    } finally {
      setLoading(null);
    }
  };

  const summarizeEmailThread = async () => {
    if (emailHistory.length === 0) {
      toast.error("No emails to summarize. Send emails first.");
      return;
    }

    setLoading("summary");
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize the following email thread related to a real estate deal. Extract key points, decisions made, action items, and any important dates or deadlines mentioned.

DEAL: ${deal?.name} (${deal?.stage?.replace('_', ' ')})

EMAIL THREAD:
${emailThreadContent}

Provide a concise summary that includes:
1. Main topics discussed
2. Key decisions made
3. Outstanding action items
4. Important dates/deadlines
5. Next steps`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_topics: { type: "array", items: { type: "string" } },
            decisions: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } },
            important_dates: { type: "array", items: { type: "string" } },
            next_steps: { type: "string" }
          }
        }
      });

      setEmailSummary(result);
      setActiveTab("summary");
      toast.success("Email thread summarized");
    } catch (error) {
      console.error("Summary failed:", error);
      toast.error("Failed to summarize emails");
    } finally {
      setLoading(null);
    }
  };

  const suggestContactTimes = async () => {
    setLoading("times");
    try {
      // Analyze activity patterns from email history
      const activityByDay = {};
      const activityByHour = {};
      
      emailHistory.forEach(email => {
        const sentDate = new Date(email.sent_date);
        const day = sentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = sentDate.getHours();
        
        activityByDay[day] = (activityByDay[day] || 0) + 1;
        activityByHour[hour] = (activityByHour[hour] || 0) + 1;
      });

      const topHours = Object.entries(activityByHour)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(e => e[0] + ":00")
        .join(", ");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the communication patterns shown in the activity analysis for deal "${deal?.name}", suggest optimal times to contact key stakeholders.

Communication Pattern Analysis:
- Most active days: ${Object.entries(activityByDay).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]).join(", ")}
- Most active hours: ${topHours}
- Total communications: ${emailHistory.length}
- Deal Stage: ${deal?.stage?.replace('_', ' ')}

Provide recommendations for:
1. Best days of the week to contact stakeholders
2. Best times of day to reach them
3. Frequency of follow-ups recommended for this stage
4. Communication channel suggestions (email vs. call)
5. Tips for maximizing response rates`,
        response_json_schema: {
          type: "object",
          properties: {
            best_days: { type: "array", items: { type: "string" } },
            best_times: { type: "array", items: { type: "string" } },
            recommended_frequency: { type: "string" },
            communication_channels: { type: "array", items: { type: "string" } },
            response_tips: { type: "array", items: { type: "string" } },
            overall_strategy: { type: "string" }
          }
        }
      });

      setContactTimes(result);
      setActiveTab("times");
      toast.success("Contact time suggestions generated");
    } catch (error) {
      console.error("Suggestion failed:", error);
      toast.error("Failed to generate contact suggestions");
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Communication Assistant
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="draft" className="text-xs sm:text-sm">
              <Mail className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Draft Email</span>
              <span className="sm:hidden">Draft</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs sm:text-sm">
              <Zap className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Summarize</span>
              <span className="sm:hidden">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="times" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Best Times</span>
              <span className="sm:hidden">Times</span>
            </TabsTrigger>
          </TabsList>

          {/* Draft Email Tab */}
          <TabsContent value="draft" className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={draftFollowUpEmail}
                disabled={loading === "draft"}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading === "draft" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Mail className="h-4 w-4 mr-2" />Generate Follow-Up Email</>
                )}
              </Button>
            </div>

            {draftEmail && (
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">SUBJECT</p>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{draftEmail.subject}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(draftEmail.subject)}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">BODY</p>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-700 whitespace-pre-wrap text-sm">{draftEmail.body}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(draftEmail.body)}
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Summarize Tab */}
          <TabsContent value="summary" className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={summarizeEmailThread}
                disabled={loading === "summary" || emailHistory.length === 0}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {loading === "summary" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" />Summarize Email Thread</>
                )}
              </Button>
            </div>

            {emailHistory.length === 0 && !emailSummary && (
              <Alert>
                <AlertDescription>
                  No emails to summarize. Send some emails first.
                </AlertDescription>
              </Alert>
            )}

            {emailSummary && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">{emailSummary.summary}</p>
                </div>

                {emailSummary.key_topics && emailSummary.key_topics.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Key Topics</p>
                    <div className="flex flex-wrap gap-2">
                      {emailSummary.key_topics.map((topic, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {emailSummary.decisions && emailSummary.decisions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Decisions Made</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {emailSummary.decisions.map((decision, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span>•</span>
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {emailSummary.action_items && emailSummary.action_items.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-orange-900 mb-2">Action Items</p>
                    <ul className="text-sm text-orange-900 space-y-1">
                      {emailSummary.action_items.map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span>→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {emailSummary.important_dates && emailSummary.important_dates.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Important Dates</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {emailSummary.important_dates.map((date, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span>📅</span>
                          <span>{date}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {emailSummary.next_steps && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-900 mb-2">Next Steps</p>
                    <p className="text-sm text-green-900">{emailSummary.next_steps}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Contact Times Tab */}
          <TabsContent value="times" className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={suggestContactTimes}
                disabled={loading === "times" || emailHistory.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading === "times" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <><Clock className="h-4 w-4 mr-2" />Analyze Optimal Contact Times</>
                )}
              </Button>
            </div>

            {emailHistory.length === 0 && !contactTimes && (
              <Alert>
                <AlertDescription>
                  Need email history to analyze patterns. Send some emails first.
                </AlertDescription>
              </Alert>
            )}

            {contactTimes && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Best Days</h4>
                    <div className="flex flex-wrap gap-2">
                      {contactTimes.best_days?.map((day, idx) => (
                        <Badge key={idx} className="bg-blue-200 text-blue-900">{day}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">Best Times</h4>
                    <div className="flex flex-wrap gap-2">
                      {contactTimes.best_times?.map((time, idx) => (
                        <Badge key={idx} className="bg-purple-200 text-purple-900">{time}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {contactTimes.recommended_frequency && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-1">Recommended Follow-Up Frequency</p>
                    <p className="text-slate-700">{contactTimes.recommended_frequency}</p>
                  </div>
                )}

                {contactTimes.communication_channels && contactTimes.communication_channels.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">Recommended Channels</p>
                    <div className="flex flex-wrap gap-2">
                      {contactTimes.communication_channels.map((channel, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{channel}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {contactTimes.response_tips && contactTimes.response_tips.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-900 mb-2">Tips for Higher Response Rates</p>
                    <ul className="text-sm text-green-900 space-y-1">
                      {contactTimes.response_tips.map((tip, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span>✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {contactTimes.overall_strategy && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-900 mb-2">Overall Strategy</p>
                    <p className="text-sm text-amber-900">{contactTimes.overall_strategy}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}