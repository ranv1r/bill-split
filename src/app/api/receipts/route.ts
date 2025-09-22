import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import { getClientIP, isIPAllowed, createIPProtectionResponse, getSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Initialize database tables if they don't exist
    await Database.createTables();

    const receipts = await Database.listReceipts();
    return NextResponse.json({ receipts }, { headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check IP restriction for receipt creation
    const clientIP = getClientIP(request);
    if (!isIPAllowed(clientIP)) {
      return createIPProtectionResponse();
    }

    const body = await request.json();
    const { name, image_url, image_type, items, people, tax_rates, tip_config } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Receipt name is required' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // Initialize database tables if they don't exist
    await Database.createTables();

    const receipt = await Database.createReceipt({
      name,
      image_url,
      image_type,
      items: items || [],
      people: people || [],
      tax_rates: tax_rates || [
        { id: 1, name: 'GST', rate: 5.00 },
        { id: 2, name: 'PLT', rate: 10.00 }
      ],
      tip_config: tip_config || { is_percentage: true, value: 20.00 }
    });

    return NextResponse.json({ receipt }, { status: 201, headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to create receipt' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}