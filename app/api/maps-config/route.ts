import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check for Google Maps API key in environment variables
    const clientApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const serverApiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Use server API key for backend services, client API key for frontend
    const apiKey = serverApiKey || clientApiKey;
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here' || apiKey === 'demo') {
      console.log('Google Maps API key not configured, using demo mode');
      return NextResponse.json({ 
        apiKey: 'demo',
        demo: true,
        message: 'Maps running in demo mode - configure GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for full functionality'
      });
    }

    console.log('Google Maps API key found, enabling full functionality');
    return NextResponse.json({ 
      apiKey: clientApiKey || apiKey, 
      demo: false,
      hasServerKey: !!serverApiKey,
      hasClientKey: !!clientApiKey
    });
  } catch (error) {
    console.error('Maps config error:', error);
    // Return demo mode instead of 500 error
    return NextResponse.json({ 
      apiKey: 'demo',
      demo: true,
      message: 'Maps configuration error - running in demo mode' 
    });
  }
}