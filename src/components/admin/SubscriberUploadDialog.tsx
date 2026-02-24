import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SubscriberUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubscriberUploadDialog = ({ open, onOpenChange }: SubscriberUploadDialogProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractNumbersFromExcel = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          const numbers: string[] = [];
          for (const row of rows) {
            for (const cell of row) {
              if (cell == null) continue;
              const val = String(cell).trim().replace(/[^0-9]/g, "");
              if (val && /^\d{7,15}$/.test(val)) {
                numbers.push(val);
              }
            }
          }
          resolve(numbers);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const extractNumbersFromText = async (file: File): Promise<string[]> => {
    const text = await file.text();
    const lines = text.trim().split("\n");
    return lines
      .map((line) => line.trim().replace(/[",]/g, ""))
      .filter((line) => line && /^\d{7,15}$/.test(line));
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const rawNumbers = isExcel
        ? await extractNumbersFromExcel(file)
        : await extractNumbersFromText(file);

      const phoneNumbers = [...new Set(rawNumbers)];

      if (phoneNumbers.length === 0) {
        toast.error("No valid phone numbers found in file");
        setIsUploading(false);
        return;
      }

      const data = await api.subscriberUpload(phoneNumbers);
      toast.success(`Uploaded ${data.inserted ?? phoneNumbers.length} subscribers (Total: ${phoneNumbers.length})`);
      onOpenChange(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Error uploading subscribers:", err);
      toast.error("Failed to process file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload BTC Subscribers</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with subscriber phone numbers (one per line)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              Select a CSV or Excel file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Choose File"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Format:</strong> One phone number per line (digits only)</p>
            <p><strong>Example:</strong></p>
            <p className="font-mono pl-2">71234567</p>
            <p className="font-mono pl-2">76543210</p>
          </div>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriberUploadDialog;
