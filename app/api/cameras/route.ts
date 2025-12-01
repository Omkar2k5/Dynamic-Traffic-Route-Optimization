import { NextRequest, NextResponse } from 'next/server';
import { staticDatabase, CCTVLocation } from '@/lib/static-database';

// GET - Fetch all cameras
export async function GET() {
  try {
    const cameras = staticDatabase.getAllCameras();
    return NextResponse.json({ cameras, total: cameras.length });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}

// POST - Add new camera (not supported in static database)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraNumber, coordinates, name, location } = body;

    if (!cameraNumber || !coordinates || !coordinates.latitude || !coordinates.longitude) {
      return NextResponse.json(
        { error: 'Camera number and coordinates (latitude, longitude) are required' },
        { status: 400 }
      );
    }

    // Static database doesn't support adding new cameras
    return NextResponse.json(
      { error: 'Camera management is read-only in static database mode' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error adding camera:', error);
    return NextResponse.json(
      { error: 'Failed to add camera' },
      { status: 500 }
    );
  }
}

// PUT - Update camera (not supported in static database)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cameraNumber, updateData } = body;

    if (!cameraNumber) {
      return NextResponse.json(
        { error: 'Camera number is required' },
        { status: 400 }
      );
    }

    // Static database doesn't support updating cameras
    return NextResponse.json(
      { error: 'Camera management is read-only in static database mode' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { error: 'Failed to update camera' },
      { status: 500 }
    );
  }
}

// DELETE - Delete camera (not supported in static database)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraNumber = searchParams.get('cameraNumber');

    if (!cameraNumber) {
      return NextResponse.json(
        { error: 'Camera number is required' },
        { status: 400 }
      );
    }

    // Static database doesn't support deleting cameras
    return NextResponse.json(
      { error: 'Camera management is read-only in static database mode' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error deleting camera:', error);
    return NextResponse.json(
      { error: 'Failed to delete camera' },
      { status: 500 }
    );
  }
}