import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Building2, MapPin, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const typeStyles = {
  landowner: "bg-emerald-100 text-emerald-700",
  broker: "bg-blue-100 text-blue-700",
  attorney: "bg-purple-100 text-purple-700",
  consultant: "bg-amber-100 text-amber-700",
  investor: "bg-rose-100 text-rose-700",
  contractor: "bg-slate-100 text-slate-700",
  government: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-700"
};

export default function ContactCard({ contact, onEdit, onDelete }) {
  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold">
          {initials}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{fullName}</h3>
              {contact.title && contact.company && (
                <p className="text-sm text-slate-500">{contact.title} at {contact.company}</p>
              )}
              {!contact.title && contact.company && (
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {contact.company}
                </div>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(contact)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(contact)} className="text-red-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn("text-xs", typeStyles[contact.contact_type])}>
              {contact.contact_type}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-xs",
              contact.status === 'active' ? "border-emerald-200 text-emerald-700" :
              contact.status === 'lead' ? "border-amber-200 text-amber-700" :
              "border-slate-200 text-slate-600"
            )}>
              {contact.status}
            </Badge>
          </div>

          <div className="mt-3 space-y-1.5">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 transition-colors">
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 transition-colors">
                <Phone className="h-3.5 w-3.5" />
                {contact.phone}
              </a>
            )}
            {contact.city && contact.state && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {contact.city}, {contact.state}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}