import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataImportDialog({ 
  open, 
  onOpenChange, 
  onImport, 
  title = "Import Data",
  fields = [],
  fileTypes = ".csv,.xlsx,.xls"
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: review
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [validationResults, setValidationResults] = useState([]);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true);
    setErrors([]);
    setWarnings([]);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      // Extract data for preview
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: { type: "object" }
            }
          }
        }
      });

      if (result.status === "success" && result.output?.records?.length > 0) {
        setFile({ url: file_url, name: selectedFile.name });
        
        // Get column names from first record
        const firstRecord = result.output.records[0];
        const detectedColumns = Object.keys(firstRecord);
        setPreview({
          records: result.output.records.slice(0, 5),
          allRecords: result.output.records,
          columns: detectedColumns,
          totalRecords: result.output.records.length
        });

        // Auto-map columns
        const autoMapping = {};
        fields.forEach(field => {
          const match = detectedColumns.find(col => 
            col.toLowerCase().includes(field.id.toLowerCase()) ||
            field.aliases?.some(alias => col.toLowerCase().includes(alias.toLowerCase()))
          );
          if (match) autoMapping[match] = field.id;
        });
        setColumnMapping(autoMapping);
        setStep(2);
      } else {
        setErrors([result.details || "Could not parse file"]);
      }
    } catch (err) {
      setErrors([err.message || "Failed to upload file"]);
    } finally {
      setLoading(false);
    }
  };

  const handleMapColumn = (fileColumn, fieldId) => {
    const newMapping = { ...columnMapping };
    if (fieldId) {
      newMapping[fileColumn] = fieldId;
    } else {
      delete newMapping[fileColumn];
    }
    setColumnMapping(newMapping);
  };

  const validateData = () => {
    const results = [];
    const newWarnings = [];
    const newErrors = [];

    preview.allRecords.forEach((record, idx) => {
      const mappedRecord = {};
      let hasRequiredFields = true;

      Object.entries(columnMapping).forEach(([fileCol, fieldId]) => {
        const value = record[fileCol];
        const fieldDef = fields.find(f => f.id === fieldId);
        
        if (fieldDef?.required && !value) {
          hasRequiredFields = false;
          newErrors.push(`Row ${idx + 2}: Missing required field "${fieldDef.label}"`);
        }
        
        if (value && fieldDef?.type === "number" && isNaN(Number(value))) {
          newWarnings.push(`Row ${idx + 2}: "${fieldDef.label}" has non-numeric value "${value}"`);
        }
        
        if (value && fieldDef?.type === "date") {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            newWarnings.push(`Row ${idx + 2}: Invalid date format for "${fieldDef.label}"`);
          }
        }

        mappedRecord[fieldId] = value;
      });

      if (hasRequiredFields) {
        results.push(mappedRecord);
      }
    });

    setValidationResults(results);
    setWarnings(newWarnings);
    setErrors(newErrors);
    setStep(3);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await onImport(validationResults);
      onOpenChange(false);
      reset();
    } catch (err) {
      setErrors([err.message || "Import failed"]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setColumnMapping({});
    setStep(1);
    setErrors([]);
    setWarnings([]);
    setValidationResults([]);
  };

  const unmappedColumns = preview?.columns.filter(col => !columnMapping[col]) || [];
  const mappedCount = Object.keys(columnMapping).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) reset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => document.getElementById("file-input").click()}>
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-500 mt-1">CSV, Excel (.xlsx, .xls)</p>
              <input
                id="file-input"
                type="file"
                accept={fileTypes}
                onChange={handleFileSelect}
                disabled={loading}
                className="hidden"
              />
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing file...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && preview && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Map the columns from your file to the data fields below. {unmappedColumns.length > 0 && 
                `${unmappedColumns.length} column(s) not mapped.`}
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {preview.columns.map(col => (
                <div key={col} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{col}</p>
                    <p className="text-xs text-slate-500">
                      Sample: {preview.records[0]?.[col]?.toString().substring(0, 40) || "—"}
                    </p>
                  </div>
                  <Select value={columnMapping[col] || ""} onValueChange={(v) => handleMapColumn(col, v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Don't import</SelectItem>
                      {fields.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Total records: <span className="font-semibold">{preview.totalRecords}</span>
            </p>
          </div>
        )}

        {/* Step 3: Review & Validation */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">{errors.length} error(s) found:</p>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                    {errors.length > 5 && <li className="text-slate-600">... and {errors.length - 5} more</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">{warnings.length} warning(s):</p>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {warnings.slice(0, 5).map((w, i) => <li key={i}>• {w}</li>)}
                    {warnings.length > 5 && <li className="text-slate-600">... and {warnings.length - 5} more</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {errors.length === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {validationResults.length} record(s) ready to import
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {step === 2 && mappedCount > 0 && (
                <Button onClick={validateData} className="bg-slate-900 hover:bg-slate-800">
                  Review & Validate
                </Button>
              )}
              {step === 3 && errors.length === 0 && (
                <Button onClick={handleImport} disabled={loading} className="bg-slate-900 hover:bg-slate-800">
                  {loading ? "Importing..." : `Import ${validationResults.length} Records`}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}