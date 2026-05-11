// app/api/inventory/import/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface CsvRecord {
  [key: string]: string | undefined
}

interface ColumnMapping {
  name?: string
  batch?: string
  quantity?: string
  expiry?: string
  category?: string
  price?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with pharmacy
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      include: {
        pharmacy: true
      }
    })

    if (!user?.pharmacyId) {
      return NextResponse.json(
        { error: 'User is not assigned to a pharmacy' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const { csvData, columnMapping } = body

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        { error: 'CSV data is required' },
        { status: 400 }
      )
    }

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      skip_records_with_error: true,
    }) as CsvRecord[]

    if (!records.length) {
      return NextResponse.json(
        { error: 'No valid records found' },
        { status: 400 }
      )
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      columns: Object.keys(records[0] || {})
    }

    for (const [index, record] of records.entries()) {
      try {
        const mapped = mapRecord(record, columnMapping)

        // Find or create medicine
        let medicine = await prisma.medicine.findUnique({
          where: {
            name: mapped.name
          }
        })

        if (!medicine) {
          medicine = await prisma.medicine.create({
            data: {
              name: mapped.name
            }
          })
        }

        // Create inventory item
        await prisma.inventoryItem.create({
          data: {
            medicineId: medicine.id,
            pharmacyId: user.pharmacyId,
            category: mapped.category,
            quantity: mapped.quantity,
            price: mapped.price,
            expiryDate: mapped.expiryDate,
            batch: mapped.batch
          }
        })

        // Activity log
        await prisma.activityLog.create({
          data: {
            type: 'ADD_STOCK',
            message: `Imported ${mapped.quantity} units of ${mapped.name}`,
            userId: user.id
          }
        })

        results.successful++

      } catch (error) {
        results.failed++

        results.errors.push(
          `Row ${index + 2}: ${
            error instanceof Error
              ? error.message
              : 'Unknown error'
          }`
        )
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('CSV Import Error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

function mapRecord(
  record: CsvRecord,
  columnMapping?: ColumnMapping
) {
  const getField = (
    field: keyof ColumnMapping,
    required = false
  ): string => {

    if (columnMapping?.[field]) {
      const value = record[columnMapping[field]!]

      if (value) return value
    }

    const patterns = {
      name: ['name', 'medicine', 'drug', 'product', 'item'],
      batch: ['batch', 'batch_no', 'lot'],
      quantity: ['quantity', 'qty', 'stock'],
      expiry: ['expiry', 'expiry_date', 'expiration'],
      category: ['category', 'type'],
      price: ['price', 'cost']
    }

    for (const key of patterns[field]) {
      const value = record[key]

      if (value) return value
    }

    if (required) {
      throw new Error(`${field} is required`)
    }

    return ''
  }

  const name = getField('name', true)
  const category = getField('category', true)

  const quantity = Number(getField('quantity', true))
  const price = Number(getField('price', true))

  if (isNaN(quantity)) {
    throw new Error('Invalid quantity')
  }

  if (isNaN(price)) {
    throw new Error('Invalid price')
  }

  let batch = getField('batch')

  if (!batch) {
    batch = `BATCH-${Date.now()}`
  }

  const expiry = getField('expiry')

  let expiryDate: Date | undefined

  if (expiry) {
    expiryDate = new Date(expiry)

    if (isNaN(expiryDate.getTime())) {
      throw new Error('Invalid expiry date')
    }
  }

  return {
    name,
    category,
    quantity,
    price,
    batch,
    expiryDate
  }
}