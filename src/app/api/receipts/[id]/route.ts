import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import { getClientIP, isIPAllowed, createIPProtectionResponse, getSecurityHeaders } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check IP restriction for direct ID access
    const clientIP = getClientIP(request);
    if (!isIPAllowed(clientIP)) {
      return createIPProtectionResponse();
    }

    const receipt = await Database.getReceipt(params.id);

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json({ receipt }, { headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check IP restriction for direct ID access
    const clientIP = getClientIP(request);
    if (!isIPAllowed(clientIP)) {
      return createIPProtectionResponse();
    }

    const body = await request.json();
    const updates = body;

    const receipt = await Database.updateReceipt(params.id, updates);

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json({ receipt }, { headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check IP restriction for direct ID access
    const clientIP = getClientIP(request);
    if (!isIPAllowed(clientIP)) {
      return createIPProtectionResponse();
    }

    const success = await Database.deleteReceipt(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json({ success: true }, { headers: getSecurityHeaders() });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}