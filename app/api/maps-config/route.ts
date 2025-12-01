import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In a real app, you would fetch this from environment variables or a secure config
    // For demo purposes, we'll use a placeholder that won't break the app
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      // Return a demo mode instead of error
      return NextResponse.json({ 
        error: 'Google Maps API key not configured',
        demo: true,
        message: 'Maps will run in demo mode without actual API key' 
      });
    }

    return NextResponse.json({ apiKey, demo: false });
  } catch (error) {
    console.error('Maps config error:', error);
    // Return demo mode instead of 500 error
    return NextResponse.json({ 
      error: 'Maps configuration unavailable',
      demo: true,
      message: 'Running in demo mode' 
    });
  }
}