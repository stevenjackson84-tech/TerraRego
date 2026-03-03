import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, MapPin } from "lucide-react";

const contactTypeEmoji = {
  landowner: "👤",
  broker: "🏢",
  attorney: "⚖️",
  consultant: "💼",
  investor: "💰",
  contractor: "🔨",
  government: "🏛️",
  other: "📋",
};

const contactTypeLabels = {
  landowner: "Landowner",
  broker: "Broker",
  attorney: "Attorney",
  consultant: "Consultant",
  investor: "Investor",
  contractor: "Contractor",
  government: "Government",
  other: "Other",
};

export default function ContactCard({ contact }) {
  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Name and Type */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">{fullName}</h3>
              {contact.title && (
                <p className="text-sm text-slate-600">{contact.title}</p>
              )}
            </div>
            {contact.contact_type && (
              <Badge variant="secondary" className="flex-shrink-0">
                {contactTypeEmoji[contact.contact_type]} {contactTypeLabels[contact.contact_type]}
              </Badge>
            )}
          </div>
        </div>

        {/* Company */}
        {contact.company && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
            <Building2 className="h-4 w-4" />
            <span>{contact.company}</span>
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-1.5 mb-3">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <a
                href={`mailto:${contact.email}`}
                className="text-slate-600 hover:text-slate-900 break-all"
              >
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-slate-400" />
              <a href={`tel:${contact.phone}`} className="text-slate-600 hover:text-slate-900">
                {contact.phone}
              </a>
            </div>
          )}
        </div>

        {/* Address */}
        {contact.address || contact.city || contact.state || contact.zip ? (
          <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">
              {contact.address && <div>{contact.address}</div>}
              {(contact.city || contact.state || contact.zip) && (
                <div>
                  {[contact.city, contact.state, contact.zip]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Notes */}
        {contact.notes && (
          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mt-3">
            {contact.notes.substring(0, 100)}
            {contact.notes.length > 100 ? "..." : ""}
          </div>
        )}

        {/* Last Contacted */}
        {contact.last_contacted && (
          <div className="text-xs text-slate-400 mt-3">
            Last contacted: {new Date(contact.last_contacted).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}