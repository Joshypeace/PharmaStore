// components/import-wizard/import-wizard.tsx
'use client';

import { useState, useRef } from 'react';
import { CheckCircle, AlertCircle, Upload, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
  columns?: string[];
}

interface ColumnMapping {
  name: string;
  batch: string;
  quantity: string;
  expiry: string;
  category: string;
  price: string;
}

export default function ImportWizard({ isOpen, onClose, onSuccess }: ImportWizardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    batch: '',
    quantity: '',
    expiry: '',
    category: '',
    price: ''
  });
  const [showMapping, setShowMapping] = useState(false);
  const [csvData, setCsvData] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsProcessing(true);
        const data = e.target?.result as ArrayBuffer | string;
        
        let csvData: string;
        
        if (fileExtension === '.csv') {
          csvData = data as string;
        } else {
          const workbook = XLSX.read(data, { type: fileExtension === '.xls' ? 'array' : 'buffer' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          csvData = XLSX.utils.sheet_to_csv(worksheet);
        }
        
        setCsvData(csvData);
        
        // Parse just the headers to detect columns
        const firstLine = csvData.split('\n')[0];
        const columns = firstLine.split(',').map(col => col.trim());
        setDetectedColumns(columns);
        
        // Try to auto-map columns
        const autoMapped = autoMapColumns(columns);
        setColumnMapping(autoMapped);
        
        setShowMapping(true);

      } catch {
        console.error('File processing error:');
        toast.error('Failed to process file: ');
      } finally {
        setIsProcessing(false);
      }
    };
    
    if (fileExtension === '.csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const autoMapColumns = (columns: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      name: '',
      batch: '',
      quantity: '',
      expiry: '',
      category: '',
      price: ''
    };

    const fieldPatterns = {
      name: ['item_name', 'name', 'medicine', 'product', 'drug', 'item', 'medication'],
      batch: ['variant_name', 'batch', 'batch_no', 'batch_number', 'lot', 'lot_number'],
      quantity: ['stock', 'quantity', 'qty', 'amount', 'count'],
      expiry: ['expirery_date', 'expiry', 'expiry_date', 'expiration', 'exp_date', 'expire'],
      category: ['category', 'type', 'class', 'group', 'item_type'],
      price: ['price', 'cost', 'unit_price', 'unit_cost']
    };

    columns.forEach(column => {
      const colLower = column.toLowerCase();
      
      for (const [field, patterns] of Object.entries(fieldPatterns)) {
        if (patterns.some(pattern => colLower.includes(pattern.toLowerCase()))) {
          // Only set if not already mapped or if this is a better match
          if (!mapping[field as keyof ColumnMapping]) {
            mapping[field as keyof ColumnMapping] = column;
          }
          break;
        }
      }
    });

    return mapping;
  };

  const handleImport = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          csvData,
          columnMapping
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to import file');
      }

      const result: ImportResult = await response.json();
      
      setResults(result);
      setShowMapping(false);
      
      if (result.successful > 0) {
        toast.success(`Imported ${result.successful} items successfully`);
        onSuccess();
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} items failed to import`);
      }
    } catch {
      console.error('Import error:');
      toast.error('Failed to import file');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setResults(null);
    setShowMapping(false);
    setDetectedColumns([]);
    setColumnMapping({
      name: '',
      batch: '',
      quantity: '',
      expiry: '',
      category: '',
      price: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import Inventory from Excel/CSV</DialogTitle>
        </DialogHeader>

        {!results ? (
          <>
            {!showMapping ? (
              <div className="space-y-6 py-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Drag and drop your Excel or CSV file here
                      </p>
                      <p className="text-sm text-gray-500">or</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      Browse Files
                    </Button>
                    <p className="text-xs text-gray-500">
                      Supported formats: CSV, XLSX, XLS
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">File Format Tips</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Include columns for medicine name, category, quantity, and price</li>
                    <li>• Common column names are automatically detected</li>
                    <li>• Expiry dates should be in YYYY-MM-DD format</li>
                    <li>• Quantity and price values should be numbers</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-4 flex items-center">
                    <Map className="mr-2 h-5 w-5" />
                    Map Your Columns
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    We detected these columns in your file. Please map them to the appropriate fields in our system.
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-2 font-medium text-sm">
                      <div>Your Column</div>
                      <div>Map to Field</div>
                    </div>
                    
                    {Object.entries(columnMapping).map(([field, mappedColumn]) => (
                      <div key={field} className="grid grid-cols-2 gap-2 items-center">
                        <Label htmlFor={field} className="capitalize">
                          {field.replace('_', ' ')}
                        </Label>
                        <Select
                          value={mappedColumn}
                          onValueChange={(value) => setColumnMapping(prev => ({
                            ...prev,
                            [field]: value
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {detectedColumns.map(column => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowMapping(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleImport} 
                      disabled={!columnMapping.name || !columnMapping.quantity || !columnMapping.category || !columnMapping.price}
                    >
                      Import Data
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 py-4">
            <div className="text-center">
              {results.failed === 0 ? (
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              )}
              
              <h3 className="text-lg font-medium mb-2">
                Import {results.failed === 0 ? 'Completed' : 'Completed with Errors'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{results.successful}</p>
                  <p className="text-sm text-green-600">Successful</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">{results.failed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="text-left">
                  <p className="font-medium text-sm mb-2">Errors:</p>
                  <div className="max-h-40 overflow-y-auto text-xs text-red-600 space-y-1">
                    {results.errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Import Another File
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Processing your file...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}