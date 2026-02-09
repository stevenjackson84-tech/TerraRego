import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import ContactCard from "@/components/contacts/ContactCard";
import ContactForm from "@/components/contacts/ContactForm";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [filterType, setFilterType] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowForm(false);
      setEditingContact(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] })
  });

  const handleSave = (data) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleDelete = (contact) => {
    if (window.confirm(`Delete ${contact.first_name} ${contact.last_name}?`)) {
      deleteMutation.mutate(contact.id);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const matchesSearch = !search || 
      fullName.includes(search.toLowerCase()) ||
      contact.company?.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || contact.contact_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Contacts</h1>
            <p className="text-slate-500 mt-1">Manage your network of landowners, brokers, and partners</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList className="bg-white border">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="landowner">Landowners</TabsTrigger>
              <TabsTrigger value="broker">Brokers</TabsTrigger>
              <TabsTrigger value="investor">Investors</TabsTrigger>
              <TabsTrigger value="contractor">Contractors</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <ContactCard 
              key={contact.id} 
              contact={contact}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {filteredContacts.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No contacts found. Add your first contact to get started.
            </div>
          )}
        </div>

        {/* Form Modal */}
        <ContactForm
          contact={editingContact}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingContact(null);
          }}
          onSave={handleSave}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}