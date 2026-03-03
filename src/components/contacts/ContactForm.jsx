import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const contactTypes = [
  { value: "landowner", label: "Landowner" },
  { value: "broker", label: "Broker" },
  { value: "attorney", label: "Attorney" },
  { value: "consultant", label: "Consultant" },
  { value: "investor", label: "Investor" },
  { value: "contractor", label: "Contractor" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

export default function ContactForm({ contact, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(
    contact || {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      title: "",
      contact_type: "other",
      address: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>{contact ? "Edit Contact" : "Add New Contact"}</CardTitle>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name" className="text-sm">
                First Name *
              </Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="John"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="last_name" className="text-sm">
                Last Name *
              </Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="Doe"
                className="mt-1"
              />
            </div>
          </div>

          {/* Contact Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>
          </div>

          {/* Company & Title Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="company" className="text-sm">
                Company
              </Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="title" className="text-sm">
                Role/Title
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Project Manager"
                className="mt-1"
              />
            </div>
          </div>

          {/* Contact Type */}
          <div>
            <Label htmlFor="contact_type" className="text-sm">
              Contact Type
            </Label>
            <Select
              value={formData.contact_type}
              onValueChange={(value) => handleSelectChange("contact_type", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contactTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address" className="text-sm">
              Address
            </Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St"
              className="mt-1"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="city" className="text-sm">
                City
              </Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Salt Lake City"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-sm">
                State
              </Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="UT"
                className="mt-1 uppercase"
              />
            </div>
            <div>
              <Label htmlFor="zip" className="text-sm">
                ZIP
              </Label>
              <Input
                id="zip"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                placeholder="84101"
                className="mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm">
              Notes
            </Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this contact..."
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isLoading ? "Saving..." : contact ? "Update Contact" : "Add Contact"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}