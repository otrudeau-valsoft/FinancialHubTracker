import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, type: string) => Promise<void>;
  title?: string;
  description?: string;
  importTypes?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export const CsvImportModal = ({
  isOpen,
  onClose,
  onImport,
  title = "Import CSV Data",
  description = "Upload a CSV file to import data into the system.",
  importTypes = [
    { id: "portfolio", name: "Portfolio", description: "Import portfolio holdings data" },
    { id: "etf", name: "ETF", description: "Import ETF benchmark holdings data" },
    { id: "matrix", name: "Matrix Rules", description: "Import matrix decision rules" }
  ]
}: CsvImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(importTypes[0]?.id || "portfolio");
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };
  
  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please select a file to import");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      await onImport(selectedFile, activeTab);
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error("Import error:", error);
      setError("Failed to import file. Please check the file format and try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            {importTypes.map(type => (
              <TabsTrigger key={type.id} value={type.id}>{type.name}</TabsTrigger>
            ))}
          </TabsList>
          
          {importTypes.map(type => (
            <TabsContent key={type.id} value={type.id}>
              <p className="text-sm text-gray-400 mb-4">{type.description}</p>
            </TabsContent>
          ))}
        </Tabs>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div 
          className="border-2 border-dashed border-gray-700 rounded-md p-8 text-center cursor-pointer hover:bg-gray-800/30 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center">
              <FileText className="h-10 w-10 text-primary-foreground mb-2" />
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "text/csv"}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium">Drag and drop your CSV file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse files</p>
            </div>
          )}
          <input 
            id="file-upload" 
            type="file" 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileChange} 
          />
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!selectedFile || isLoading}>
            {isLoading ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
