import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Trophy, Trash2, Building2, Folder, Users, Calendar, DollarSign, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const categoryLabels = {
  surveying: "Surveying", civil_engineering: "Civil Engineering", grading: "Grading",
  utilities: "Utilities", entitlement_consulting: "Entitlement Consulting", legal: "Legal",
  architecture: "Architecture", environmental: "Environmental", geotechnical: "Geotechnical",
  general_contractor: "General Contractor", other: "Other",
};

const statusStyles = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-blue-100 text-blue-700",
  awarded: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

export default function BidRequestDetail({ bid, contacts, deals, projects, onUpdate, onDelete, onClose, isUpdating }) {
  const [sendingEmail, setSendingEmail] = useState(null);
  const [awardingContact, setAwardingContact] = useState(false);

  const invitedContacts = (bid.invited_contacts || []).map(id => contacts.find(c => c.id === id)).filter(Boolean);
  const awardedContact = bid.awarded_contact_id ? contacts.find(c => c.id === bid.awarded_contact_id) : null;

  const linkedEntity = bid.entity_type === "deal"
    ? deals.find(d => d.id === bid.entity_id)
    : bid.entity_type === "project"
    ? projects.find(p => p.id === bid.entity_id)
    : null;

  const sendBidEmail = async (contact) => {
    if (!contact.email) {
      toast.error(`${contact.first_name} has no email address`);
      return;
    }
    setSendingEmail(contact.id);
    const subject = `Bid Request: ${bid.title}`;
    const body = `Hi ${contact.first_name},

You are invited to submit a bid for the following project:

Project: ${bid.title}
Category: ${categoryLabels[bid.bid_category] || bid.bid_category}
${bid.entity_name ? `Linked to: ${bid.entity_name}` : ""}
${bid.due_date ? `Bid Deadline: ${new Date(bid.due_date).toLocaleDateString()}` : ""}
${bid.budget_estimate ? `Budget Estimate: $${bid.budget_estimate.toLocaleString()}` : ""}

Scope of Work:
${bid.description || "Please contact us for full scope details."}

${bid.notes ? `Additional Notes:\n${bid.notes}` : ""}

Please reply to this email with your bid or any questions.

Thank you,`;

    await base44.integrations.Core.SendEmail({ to: contact.email, subject, body });
    setSendingEmail(null);
    toast.success(`Bid request sent to ${contact.first_name} ${contact.last_name}`);
  };

  const sendToAll = async () => {
    const withEmails = invitedContacts.filter(c => c.email);
    if (withEmails.length === 0) { toast.error("No invited contacts have email addresses"); return; }
    for (const contact of withEmails) {
      await sendBidEmail(contact);
    }
    if (bid.status === "draft") onUpdate({ status: "open" });
  };

  const awardBid = (contactId) => {
    onUpdate({ awarded_contact_id: contactId, status: "awarded" });
    setAwardingContact(false);
    toast.success("Bid awarded!");
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-xl">{bid.title}</SheetTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`text-xs ${statusStyles[bid.status]}`}>{bid.status}</Badge>
                <Badge className="text-xs bg-slate-100 text-slate-600">{categoryLabels[bid.bid_category]}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Linked entity */}
          {linkedEntity && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              {bid.entity_type === "deal" ? <Building2 className="h-4 w-4 text-slate-400" /> : <Folder className="h-4 w-4 text-slate-400" />}
              <span className="font-medium">{linkedEntity.name}</span>
              <span className="text-slate-400">({bid.entity_type})</span>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {bid.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Deadline</p>
                  <p className="font-medium text-slate-700">{new Date(bid.due_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}
            {bid.budget_estimate && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Budget Estimate</p>
                  <p className="font-medium text-slate-700">${bid.budget_estimate.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {bid.description && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Scope of Work</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{bid.description}</p>
            </div>
          )}

          {/* Awarded */}
          {awardedContact && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">Awarded to {awardedContact.first_name} {awardedContact.last_name}</p>
                {awardedContact.company && <p className="text-xs text-green-600">{awardedContact.company}</p>}
              </div>
            </div>
          )}

          <Separator />

          {/* Status management */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-slate-400">Update Status</Label>
            <Select value={bid.status} onValueChange={(v) => onUpdate({ status: v })}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Invited contacts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4" /> Invited Contacts ({invitedContacts.length})
              </p>
              {invitedContacts.length > 0 && (
                <Button size="sm" variant="outline" onClick={sendToAll} disabled={!!sendingEmail}>
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Send to All
                </Button>
              )}
            </div>

            {invitedContacts.length === 0 ? (
              <p className="text-sm text-slate-400">No contacts invited yet.</p>
            ) : (
              <div className="space-y-2">
                {invitedContacts.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5 bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {contact.first_name} {contact.last_name}
                        {bid.awarded_contact_id === contact.id && (
                          <CheckCircle2 className="inline h-3.5 w-3.5 text-green-500 ml-1.5" />
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{contact.company}{contact.email ? ` — ${contact.email}` : ""}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={sendingEmail === contact.id}
                        onClick={() => sendBidEmail(contact)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        {sendingEmail === contact.id ? "Sending..." : "Send"}
                      </Button>
                      {bid.status !== "awarded" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => awardBid(contact.id)}
                        >
                          <Trophy className="h-3 w-3 mr-1" /> Award
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
              onClick={() => { if (confirm("Delete this bid request?")) onDelete(); }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}