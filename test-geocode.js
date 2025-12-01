#!/usr/bin/env node

/**
 * Test script to verify Google Maps API integration
 * Run this after setting up your GOOGLE_MAPS_API_KEY
 */

const API_BASE_URL = 'http://localhost:3000';

async function testGeocodeAPI() {
  console.log('🧪 Testing Google Maps Geocode API Integration\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/geocode-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Mumbai Central Station'
      })
    });

    const data = await response.json();
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📊 Response Type: ${data.fallback ? 'Basic Suggestions (API key not set)' : 'Google Maps API'}`);
    
    if (data.suggestions && data.suggestions.length > 0) {
      console.log(`\n📍 Found ${data.suggestions.length} suggestions:`);
      
      data.suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.name}`);
        console.log(`      📍 Lat: ${suggestion.lat}, Lng: ${suggestion.lng}`);
      });
      
      if (data.suggestions.length > 3) {
        console.log(`   ... and ${data.suggestions.length - 3} more suggestions`);
      }
    } else {
      console.log('❌ No suggestions returned');
    }

    if (data.message) {
      console.log(`\n💡 Message: ${data.message}`);
    }

    // Test specific scenarios
    console.log('\n🎯 Testing different query types...\n');
    
    const testQueries = [
      'Connaught Place, Delhi',
      'IT Hub, Bangalore',
      'Marine Drive, Mumbai'
    ];
    
    for (const query of testQueries) {
      const testResponse = await fetch(`${API_BASE_URL}/api/geocode-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });
      
      const testData = await testResponse.json();
      const count = testData.suggestions?.length || 0;
      const status = testData.fallback ? '❌ (Basic)' : '✅ (Google API)';
      console.log(`   "${query}" → ${count} results ${status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure your development server is running (npm run dev)');
    console.log('   2. Verify your GOOGLE_MAPS_API_KEY in .env.local');
    console.log('   3. Check if the API key is properly configured in Google Cloud Console');
  }
}

// Check if running in browser environment
if (typeof window !== 'undefined') {
  console.log('📱 Running in browser environment');
  console.log('   Use the route suggestion page in your app to test the API');
} else {
  testGeocodeAPI();
}

export { testGeocodeAPI };