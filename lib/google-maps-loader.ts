// Google Maps API loader utility to prevent duplicate loading
export interface GoogleMapsLoaderConfig {
  apiKey: string;
  libraries?: string[];
  version?: string;
  language?: string;
  region?: string;
}

// Global state to track Google Maps loading
let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
let googleMapsPromise: Promise<void> | null = null;

/**
 * Load Google Maps JavaScript API
 * Prevents duplicate loading and handles multiple concurrent requests
 */
export function loadGoogleMapsAPI(config: GoogleMapsLoaderConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isGoogleMapsLoaded && window.google && window.google.maps) {
      resolve();
      return;
    }

    // If currently loading, return the existing promise
    if (isGoogleMapsLoading && googleMapsPromise) {
      googleMapsPromise.then(resolve).catch(reject);
      return;
    }

    // Check if script is already in DOM (prevents duplicate script tags)
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
    if (existingScript) {
      // Script exists, wait for it to load
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          isGoogleMapsLoaded = true;
          isGoogleMapsLoading = false;
          resolve();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
      return;
    }

    // Set loading flag
    isGoogleMapsLoading = true;

    // Build script URL
    const params = new URLSearchParams({
      key: config.apiKey,
      libraries: (config.libraries || ['marker']).join(','),
      v: config.version || 'weekly',
      callback: '__googleMapsCallback'
    });

    if (config.language) {
      params.set('language', config.language);
    }
    if (config.region) {
      params.set('region', config.region);
    }

    const scriptUrl = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    // Create global callback
    (window as any).__googleMapsCallback = () => {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      delete (window as any).__googleMapsCallback;
      resolve();
    };

    // Create and append script tag
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    
    script.onerror = (error) => {
      isGoogleMapsLoading = false;
      googleMapsPromise = null;
      delete (window as any).__googleMapsCallback;
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);

    // Store promise for concurrent requests
    googleMapsPromise = new Promise<void>((promiseResolve, promiseReject) => {
      const originalCallback = (window as any).__googleMapsCallback;
      (window as any).__googleMapsCallback = () => {
        originalCallback();
        promiseResolve();
      };
      
      script.onerror = (error) => {
        isGoogleMapsLoading = false;
        googleMapsPromise = null;
        delete (window as any).__googleMapsCallback;
        promiseReject(new Error('Failed to load Google Maps API'));
      };
    });
  });
}

/**
 * Check if Google Maps API is loaded
 */
export function isGoogleMapsAPILoaded(): boolean {
  return isGoogleMapsLoaded && !!(window as any).google?.maps;
}

/**
 * Reset the loader state (useful for testing or development)
 */
export function resetGoogleMapsLoader(): void {
  isGoogleMapsLoaded = false;
  isGoogleMapsLoading = false;
  googleMapsPromise = null;
  delete (window as any).__googleMapsCallback;
}

/**
 * Get Google Maps API configuration from environment or API
 */
export async function getGoogleMapsConfig(): Promise<GoogleMapsLoaderConfig> {
  try {
    const response = await fetch('/api/maps-config');
    if (!response.ok) {
      throw new Error('Failed to fetch Google Maps configuration');
    }
    const { apiKey } = await response.json();
    
    return {
      apiKey,
      libraries: ['marker', 'geometry', 'places'],
      version: 'weekly'
    };
  } catch (error) {
    throw new Error(`Failed to get Google Maps config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}