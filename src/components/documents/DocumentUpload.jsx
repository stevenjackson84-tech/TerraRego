import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DocumentUpload({ entityType, entityId, open, onClose, onSuccess, existingDocument }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    name: existingDocument?.name || "",
    category: existingDocument?.category || "other",
    tags: existingDocument?.tags || [],
    description: existingDocument?.description || ""
  });
  const [newTag, setNewTag] = useState("");

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: selectedFile.name }));
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleUpload = async () => {
    if (!file && !existingDocument) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      let fileUrl = existingDocument?.file_url;
      let fileSize = existingDocument?.file_size;
      let fileType = existingDocument?.file_type;

      // Upload new file if provided
      if (file) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadResult.file_url;
        fileSize = file.size;
        fileType = file.type || file.name.split('.').pop();
      }

      const documentData = {
        name: formData.name,
        file_url: fileUrl,
        file_size: fileSize,
        file_type: fileType,
        category: formData.category,
        tags: formData.tags,
        description: formData.description,
        entity_type: entityType,
        entity_id: entityId
      };

      // If uploading a new version
      if (existingDocument) {
        // Mark old version as not latest
        await base44.entities.Document.update(existingDocument.id, { is_latest_version: false });

        // Create new version
        documentData.version = (existingDocument.version || 1) + 1;
        documentData.parent_document_id = existingDocument.parent_document_id || existingDocument.id;
        documentData.is_latest_version = true;
      }

      await base44.entities.Document.create(documentData);
      
      toast.success(existingDocument ? "New version uploaded" : "Document uploaded successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingDocument ? "Upload New Version" : "Upload Document"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select File *</Label>
            <div className="mt-2">
              <Input
                type="file"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-sm text-slate-600 mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div>
            <Label>Document Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Zoning Approval Letter"
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="permit">Permit</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="pl-3 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            disabled={uploading || (!file && !existingDocument) || !formData.name}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {existingDocument ? "Upload New Version" : "Upload"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}