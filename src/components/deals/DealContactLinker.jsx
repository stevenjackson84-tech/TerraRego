import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export default function DealContactLinker({ dealId, contacts = [], onContactsChange }) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState(contacts);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (linkedContacts) => {
      // This would be updated in the deal entity if you add a contacts field
      return Promise.resolve();
    },
    onSuccess: () => {
      onContactsChange(selectedContacts);
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const handleAddContact = (contact) => {
    if (!selectedContacts.find((c) => c.id === contact.id)) {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const handleRemoveContact = (contactId) => {
    setSelectedContacts(selectedContacts.filter((c) => c.id !== contactId));
  };

  const handleSave = () => {
    updateMutation.mutate(selectedContacts);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Link Contacts ({selectedContacts.length})
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Contacts to Deal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
            />

            {/* Selected Contacts */}
            {selectedContacts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Linked Contacts</p>
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((contact) => (
                    <Badge
                      key={contact.id}
                      variant="secondary"
                      className="flex items-center gap-1 pl-2"
                    >
                      {contact.first_name} {contact.last_name}
                      <button
                        onClick={() => handleRemoveContact(contact.id)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Contacts */}
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700">Available Contacts</p>
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-500">No contacts available</p>
              ) : (
                <div className="space-y-1">
                  {contacts
                    .filter(
                      (c) =>
                        `${c.first_name} ${c.last_name}`
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.company?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-2 hover:bg-slate-100 rounded text-sm cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.company && (
                            <p className="text-xs text-slate-500">{contact.company}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddContact(contact)}
                          disabled={selectedContacts.some((c) => c.id === contact.id)}
                          className="h-7 px-2 text-xs"
                        >
                          {selectedContacts.some((c) => c.id === contact.id) ? "✓" : "+"}
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {updateMutation.isPending ? "Saving..." : "Save Links"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}