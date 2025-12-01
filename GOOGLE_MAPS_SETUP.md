# Google Maps API Setup Guide

## Overview
Your application is configured to use the Google Maps Places API for accurate geocoding suggestions. Currently, it's falling back to basic suggestions because the API key is not configured.

## Step 1: Get a Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Create a new project or select an existing one
   - Enable billing for your project (required for API usage)

3. **Enable Required APIs**
   - Enable the following APIs:
     - Places API
     - Maps JavaScript API
     - Geocoding API

4. **Create API Credentials**
   - Go to "Credentials" section
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

## Step 2: Configure the API Key

1. **Edit the environment file**
   - Open `.env.local` in your project root
   - Replace `your_google_maps_api_key_here` with your actual API key:

   ```env
   GOOGLE_MAPS_API_KEY=AIzaSyB-your-actual-api-key-here
   ```

2. **Secure the API key** (Recommended)
   - Go back to Google Cloud Console
   - Edit your API key
   - Add restrictions:
     - **Application restrictions**: HTTP referrers (web sites)
     - **API restrictions**: Restrict key to Places API and Maps JavaScript API only
     - Add your domain if deploying publicly

## Step 3: Test the Configuration

1. **Restart your development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Test the geocoding API**
   - Navigate to your route suggestion page
   - Try searching for a location
   - Check the browser console - you should see the API requests succeeding

3. **Monitor API usage**
   - Check Google Cloud Console → APIs & Services → Quotas
   - Monitor your usage to stay within free limits

## API Usage and Costs

**Google Maps Places API Pricing:**
- First 1,000 requests per month: Free
- Additional requests: $0.032 per request
- Rate limit: 100 requests per second per API key

**Tips to minimize costs:**
- Implement proper caching
- Limit autocomplete requests (debounce user input)
- Use the API efficiently in your application

## Verification

Once configured correctly, you should see:
- ✅ Accurate location suggestions instead of basic ones
- ✅ Specific addresses with coordinates
- ✅ Better search results with proper formatting
- ✅ No "Google Maps API key not configured" messages in console

## Troubleshooting

**Common Issues:**

1. **Still getting basic suggestions**
   - Check if API key is correctly set in `.env.local`
   - Ensure the server was restarted after adding the key
   - Verify the API key has no restrictions blocking requests

2. **API quota exceeded**
   - Check your usage in Google Cloud Console
   - Add billing information to your project
   - Consider implementing caching

3. **CORS errors**
   - Ensure your API key is not restricted to specific domains during development
   - Add localhost to allowed referrers for development

**Environment Variables:**
- Never commit API keys to version control
- Use different keys for development and production
- Regularly rotate your API keys

## Security Best Practices

1. **API Key Restrictions**
   - Restrict keys to specific APIs only
   - Add domain/IP restrictions when possible
   - Use different keys for different environments

2. **Monitoring**
   - Set up usage alerts in Google Cloud Console
   - Monitor for unusual usage patterns
   - Regularly review API key permissions

3. **Backup Plan**
   - Keep the basic suggestions as a fallback
   - Implement graceful error handling
   - Have a process to handle API outages