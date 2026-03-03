import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";

const categories = ["contract", "permit", "plan", "report", "financial", "legal", "photo", "other"];

export default function DocumentUpload({ entityType, entityId, open, onClose }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      if (!uploadRes.file_url) throw new Error("Upload failed");

      return base44.entities.Document.create({
        name: file.name,
        file_url: uploadRes.file_url,
        file_size: file.size,
        file_type: file.type,
        category,
        description,
        tags: tags ? tags.split(",").map(t => t.trim()) : [],
        entity_type: entityType,
        entity_id: entityId,
        version: 1,
        is_latest_version: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      setFile(null);
      setCategory("other");
      setDescription("");
      setTags("");
      onClose();
    },
  });

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            {file && <p className="text-xs text-slate-500 mt-1">{file.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              placeholder="e.g., Initial contract draft"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
            <Input
              placeholder="e.g., urgent, review-needed"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />Upload</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}