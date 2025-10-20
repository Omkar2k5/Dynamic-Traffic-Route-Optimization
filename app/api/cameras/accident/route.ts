import { NextRequest, NextResponse } from 'next/server';
import { updateAccidentStatus } from '@/lib/firebase-service';

// PUT - Update camera accident status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraNumber, accidentStatus } = body;

    if (!cameraNumber || !accidentStatus) {
      return NextResponse.json(
        { error: 'Camera number and accident status are required' },
        { status: 400 }
      );
    }

    await updateAccidentStatus(cameraNumber, accidentStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating accident status:', error);
    return NextResponse.json(
      { error: 'Failed to update accident status' },
      { status: 500 }
    );
  }
}