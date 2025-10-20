import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCameras,
  addCamera,
  updateCamera,
  deleteCamera,
  updateTrafficStatus,
  updateAccidentStatus
} from '@/lib/firebase-service';
import type { CameraData, CameraUpdateRequest } from '@/lib/firebase-types';

// GET - Fetch all cameras
export async function GET() {
  try {
    const cameras = await getAllCameras();
    return NextResponse.json({ cameras, total: cameras.length });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}

// POST - Add new camera
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

    const result = await addCamera(cameraNumber, coordinates, name, location);
    return NextResponse.json({ success: true, cameraNumber: result });
  } catch (error) {
    console.error('Error adding camera:', error);
    return NextResponse.json(
      { error: 'Failed to add camera' },
      { status: 500 }
    );
  }
}

// PUT - Update camera
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

    await updateCamera(cameraNumber, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { error: 'Failed to update camera' },
      { status: 500 }
    );
  }
}

// DELETE - Delete camera
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

    await deleteCamera(cameraNumber);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting camera:', error);
    return NextResponse.json(
      { error: 'Failed to delete camera' },
      { status: 500 }
    );
  }
}