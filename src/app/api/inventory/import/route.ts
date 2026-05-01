// app/api/inventory/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';


interface CsvRecord {
  [key: string]: string | undefined;
}

interface InventoryItem {
  name: string;
  category: string;
  quantity: number;
  price: number;
  expiryDate?: Date;
  batch?: string;
  medicineId: string;
  pharmacyId: string;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
  columns?: string[];
}

interface ColumnMapping {
  name?: string;
  batch?: string;
  quantity?: string;
  expiry?: string;
  category?: string;
  price?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData, columnMapping } = body;
    
    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 });
    }

    // Parse CSV data
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      skip_records_with_error: true,
    }) as CsvRecord[];

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No valid data found in CSV' }, { status: 400 });
    }

    // Get column names from the first record
    const firstRecord = records[0];
    const columns = firstRecord ? Object.keys(firstRecord) : [];

    // Process and validate each record
    const results: ImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      columns,
    };

    for (const [index, record] of records.entries()) {
      try {
        // Map CSV record to inventory item structure using the provided mapping
        const inventoryItem = mapRecordToInventoryItem(record, columnMapping, session.user.id);
        
        // Save to database using Prisma
        await prisma.inventoryItem.create({
          data: inventoryItem
        });
        
        // Create activity log
        await prisma.activityLog.create({
          data: {
            type: 'ADD_STOCK',
            message: `Added ${inventoryItem.quantity} units of ${inventoryItem.name} (Batch: ${inventoryItem.batch}) via CSV import`,
            userId: session.user.id,
          }
        });
        results.successful++;
      } catch (error: unknown) {
        results.failed++;
        results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file: ' + (error instanceof Error ? error.message : 'Unknown error') }, 
      { status: 500 }
    );
  }
}

function mapRecordToInventoryItem(record: CsvRecord, columnMapping?: ColumnMapping, userId?: string): InventoryItem {
  // Helper function to get field value with better error reporting
  const getFieldValue = (field: keyof ColumnMapping, required: boolean = false): string => {
    // Use mapped column if provided
    if (columnMapping && columnMapping[field]) {
      const value = record[columnMapping[field]!];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    
    // Fallback to auto-detection
    const fieldPatterns = {
      name: ['item_name', 'name', 'medicine', 'product', 'drug', 'item', 'medication'],
      batch: ['variant_name', 'batch', 'batch_no', 'batch_number', 'lot', 'lot_number'],
      quantity: ['stock', 'quantity', 'qty', 'amount', 'count'],
      expiry: ['expirery_date', 'expiry', 'expiry_date', 'expiration', 'exp_date', 'expire'],
      category: ['category', 'type', 'class', 'group', 'item_type'],
      price: ['price', 'cost', 'unit_price', 'unit_cost']
    };
    
    for (const pattern of fieldPatterns[field]) {
      const value = record[pattern];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    
    if (required) {
      throw new Error(`${field} is required`);
    }
    
    return '';
  };

  try {
    // Validate required fields
    const name = getFieldValue('name', true);
    let batch = getFieldValue('batch', false);
    
    // If batch is empty, generate one from name and timestamp
    if (!batch) {
      const timestamp = new Date().getTime().toString(36);
      batch = `BATCH-${name.substring(0, 3).toUpperCase()}-${timestamp.slice(-4)}`;
    }
    
    const quantityStr = getFieldValue('quantity', true);
    const category = getFieldValue('category', true);
    const priceStr = getFieldValue('price', true);
    
    const quantity = Math.max(0, Number(quantityStr) || 0);
    if (isNaN(quantity)) {
      throw new Error(`Invalid quantity value: ${quantityStr}`);
    }
    
    const price = Math.max(0, Number(priceStr) || 0);
    if (isNaN(price)) {
      throw new Error(`Invalid price value: ${priceStr}`);
    }
    
    const expiry = getFieldValue('expiry');
    let expiryDate: Date | undefined;
    
    if (expiry) {
      expiryDate = new Date(expiry);
      if (isNaN(expiryDate.getTime())) {
        throw new Error(`Invalid expiry date format: ${expiry}`);
      }
    }
    
    return {
      name,
      category,
      quantity,
      price,
      expiryDate,
      batch,
      medicineId: '', // Update with actual medicine lookup logic
      pharmacyId: '', // Update with actual pharmacy lookup logic
    };
  } catch (error: unknown) {
    // Add more context to the error message
    throw new Error(`${error instanceof Error ? error.message : 'Unknown error'}. Record: ${JSON.stringify(record)}`);
  }
}
