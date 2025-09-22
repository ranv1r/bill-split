import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import { isValidAccessToken, getSecurityHeaders } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Validate token format
    if (!isValidAccessToken(params.token)) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    const receipt = await Database.getReceiptByToken(params.token);

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json({ receipt }, { headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error fetching receipt by token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Validate token format
    if (!isValidAccessToken(params.token)) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // First get the receipt to find its ID
    const existingReceipt = await Database.getReceiptByToken(params.token);
    if (!existingReceipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: getSecurityHeaders() }
      );
    }

    const body = await request.json();
    const updates = body;

    const receipt = await Database.updateReceipt(existingReceipt.id, updates);

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json({ receipt }, { headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error updating receipt by token:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}