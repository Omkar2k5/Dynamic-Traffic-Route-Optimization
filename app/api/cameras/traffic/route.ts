import { NextRequest, NextResponse } from 'next/server';
import { staticDatabase } from '@/lib/static-database';

// PUT - Update camera traffic status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraNumber, trafficStatus } = body;

    if (!cameraNumber || !trafficStatus) {
      return NextResponse.json(
        { error: 'Camera number and traffic status are required' },
        { status: 400 }
      );
    }

    staticDatabase.updateTrafficData(cameraNumber, trafficStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating traffic status:', error);
    return NextResponse.json(
      { error: 'Failed to update traffic status' },
      { status: 500 }
    );
  }
}