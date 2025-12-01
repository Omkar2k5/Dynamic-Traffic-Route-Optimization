'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  AlertTriangle,
  Settings,
  Maximize2,
  Users,
  RefreshCw
} from 'lucide-react';

const LiveCCTVMonitor: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor stream health
  useEffect(() => {
    const checkStreamHealth = () => {
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'ended') {
          console.log('Stream ended unexpectedly, attempting to restart');
          handleStreamError();
        }
      }
    };

    const interval = setInterval(checkStreamHealth, 2000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStreamError = () => {
    console.error('Stream error detected');
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    retryTimeoutRef.current = setTimeout(() => {
      if (!isStarting && !isStreaming) {
        console.log('Auto-retrying camera start...');
        startCamera();
      }
    }, 2000);
  };

  const startCamera = async () => {
    if (isStarting) return;
    
    setIsStarting(true);
    setStreamError(null);
    
    try {
      console.log('Requesting camera access...');
      
      // Check if video element is available
      if (!videoRef.current) {
        throw new Error('Video element not available. Please wait for the component to fully load.');
      }
      
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Try to get camera with basic constraints first (most compatible)
      let stream: MediaStream;
      
      try {
        // First attempt: Basic constraints for maximum compatibility
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        console.log('Camera access granted with basic constraints');
      } catch (basicError) {
        console.warn('Basic camera access failed, trying with audio...');
        try {
          // Second attempt: Include audio (some browsers require this)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          console.log('Camera access granted with audio');
        } catch (audioError) {
          // Final attempt: Different video constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 }
              },
              audio: false
            });
            console.log('Camera access granted with specific constraints');
          } catch (finalError) {
            throw new Error(`All camera access attempts failed: ${finalError}`);
          }
        }
      }

      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Attach stream to video element
      const videoElement = videoRef.current;
      
      // Remove any existing srcObject
      videoElement.srcObject = null;
      
      // Set up the new stream
      videoElement.srcObject = stream;
      streamRef.current = stream;
      
      // Set up video event handlers
      const handleLoadedData = () => {
        console.log('Video data loaded');
        videoElement.play().then(() => {
          console.log('Video playing successfully');
          setIsStreaming(true);
          setDemoMode(false);
        }).catch((playError) => {
          console.warn('Video play failed:', playError);
          // Still mark as streaming even if play fails
          setIsStreaming(true);
          setDemoMode(false);
        });
      };

      const handleError = (error: Event) => {
        console.error('Video element error:', error);
        setIsStreaming(false);
      };

      const handlePlay = () => {
        console.log('Video started playing');
      };

      const handlePause = () => {
        console.log('Video paused');
      };

      // Add event listeners
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('error', handleError);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);

      // Clean up old event listeners
      const cleanup = () => {
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('error', handleError);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('pause', handlePause);
      };

      // Store cleanup function
      (videoElement as any).cleanup = cleanup;

      // Set attributes for better compatibility
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.controls = false;
      
      // Force load the video
      videoElement.load();

    } catch (error) {
      console.error('Camera access failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown camera error';
      setStreamError(`Camera access failed: ${errorMessage}`);
      
      // Enable demo mode
      setDemoMode(true);
      setIsStreaming(true);
      
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Clean up video element
    if (videoRef.current) {
      const cleanup = (videoRef.current as any).cleanup;
      if (cleanup) {
        cleanup();
      }
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset video element
    }
    
    // Stop all stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    setIsStreaming(false);
    setDemoMode(false);
    setStreamError(null);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Auto-start camera on component mount with proper timing
  useEffect(() => {
    const startCameraWhenReady = () => {
      if (videoRef.current && containerRef.current) {
        console.log('Video element is ready, starting camera...');
        startCamera();
      } else {
        console.log('Waiting for video element to be ready...');
        // Try again after a short delay
        setTimeout(startCameraWhenReady, 100);
      }
    };

    // Start after a longer delay to ensure everything is mounted
    const timer = setTimeout(startCameraWhenReady, 1000);
    
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <Card className="bg-slate-900/50 border-glow-cyan/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-glow-cyan">
            <Camera className="h-5 w-5" />
            Live CCTV Monitor
            <Badge variant="outline" className="border-glow-cyan/50 text-glow-cyan">
              {isStarting ? 'STARTING...' : (demoMode ? 'DEMO MODE' : 'LIVE FEED')}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                setTimeout(() => startCamera(), 100);
              }}
              disabled={isStarting}
              className="border-glow-cyan/50 text-glow-cyan hover:bg-glow-cyan/10"
              title="Restart Camera"
            >
              <RefreshCw className={`h-4 w-4 ${isStarting ? 'animate-spin' : ''}`} />
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="border-glow-cyan/50 text-glow-cyan hover:bg-glow-cyan/10"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Settings */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopCamera();
                setTimeout(() => startCamera(), 500);
              }}
              disabled={isStarting}
              className="border-glow-cyan/50 text-glow-cyan hover:bg-glow-cyan/10"
              title="Restart Camera"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Camera Controls */}
            {!isStreaming ? (
              <Button
                variant="default"
                size="sm"
                onClick={startCamera}
                disabled={isStarting}
                className="bg-glow-cyan hover:bg-glow-cyan/80"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isStarting ? 'Starting...' : 'Start Camera'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopCamera}
                disabled={isStarting}
              >
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stream Error */}
        {streamError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div className="flex-1">
              <span className="text-red-400 text-sm font-medium">Camera Error: </span>
              <span className="text-red-300 text-sm">{streamError}</span>
            </div>
          </div>
        )}

        {/* Demo Mode Notice */}
        {demoMode && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm">Demo Mode: Simulated camera feed - Camera access not available</span>
          </div>
        )}

        {/* Starting Notice */}
        {isStarting && (
          <div className="bg-glow-cyan/20 border border-glow-cyan/50 rounded-lg p-4 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-glow-cyan"></div>
            <span className="text-glow-cyan text-sm">Starting camera...</span>
          </div>
        )}

        {/* Auto-start Notice */}
        {!isStreaming && !isStarting && !demoMode && !streamError && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm">
              Camera will auto-start when ready. If it doesn't start automatically, click "Start Camera" above.
            </span>
          </div>
        )}

        {/* Video Stream Container */}
        <div 
          ref={containerRef}
          className="relative bg-slate-900 rounded-lg overflow-hidden group"
          style={{ aspectRatio: '16/9' }}
        >
          {(isStreaming && !demoMode) ? (
            <div className="relative w-full h-full">
              {/* Show loading overlay while starting */}
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-glow-cyan mx-auto mb-2"></div>
                    <p className="text-glow-cyan text-sm">Initializing camera...</p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover bg-slate-900"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video
                onCanPlay={() => console.log('Video can play')}
                onPlay={() => console.log('Video playing')}
                onError={(e) => {
                  console.error('Video error:', e);
                  handleStreamError();
                }}
                onLoadedData={() => console.log('Video data loaded')}
              />
              
              {/* Camera Info Overlay */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-white text-sm">
                  <div className={`w-2 h-2 rounded-full ${isStarting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                  <span>LIVE</span>
                </div>
              </div>

              {/* Camera Stats */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-white text-sm">
                  <Users className="h-3 w-3" />
                  <span>{isStarting ? 'Loading...' : 'Camera Active'}</span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="text-white text-sm font-mono">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Debug info for troubleshooting */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>Stream: {streamRef.current ? `Active (${streamRef.current.getVideoTracks().length} tracks)` : 'None'}</div>
                    <div>Video: {videoRef.current?.readyState || 'Unknown'}</div>
                    <div>Starting: {isStarting ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="text-center text-slate-400">
                {demoMode ? (
                  <>
                    <div className="w-96 h-72 bg-slate-700 rounded-lg border-2 border-glow-cyan/30 relative overflow-hidden mx-auto mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
                      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-1 p-4">
                        {Array.from({ length: 24 }, (_, i) => (
                          <div 
                            key={i}
                            className={`rounded ${Math.random() > 0.7 ? 'bg-blue-400/30' : 'bg-slate-600/50'}`}
                          ></div>
                        ))}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/50 rounded p-2">
                          <div className="text-glow-cyan text-sm font-mono">DEMO MODE</div>
                          <div className="text-slate-400 text-xs">Simulated Feed</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-lg font-medium">Demo Camera Feed</p>
                    <p className="text-sm">Simulated surveillance camera view</p>
                  </>
                ) : isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-glow-cyan mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Starting Camera...</p>
                    <p className="text-sm">Please wait while we initialize the camera</p>
                  </>
                ) : (
                  <>
                    <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Camera not active</p>
                    <p className="text-sm">Click "Start Camera" to begin live monitoring</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Camera Information Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-glow-cyan" />
              <span className="text-xs text-slate-400">Status</span>
            </div>
            <div className="text-lg font-bold text-glow-cyan">
              {isStarting ? 'STARTING' : (isStreaming ? (demoMode ? 'DEMO' : 'ACTIVE') : 'INACTIVE')}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-glow-cyan" />
              <span className="text-xs text-slate-400">Resolution</span>
            </div>
            <div className="text-lg font-bold text-glow-cyan">
              {isStarting ? '...' : (isStreaming && !demoMode ? 'Auto' : 'N/A')}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-glow-cyan" />
              <span className="text-xs text-slate-400">Mode</span>
            </div>
            <div className="text-lg font-bold text-glow-cyan">
              {isStarting ? 'INIT' : (demoMode ? 'SIMULATION' : 'LIVE')}
            </div>
          </div>
        </div>

        {/* Status Footer */}
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2 flex justify-between items-center">
          <div className="flex gap-4">
            <span>
              {isStarting 
                ? 'Camera: Initializing...' 
                : isStreaming 
                  ? `Camera: ${demoMode ? 'Demo Mode' : 'Live Feed'}`
                  : 'Camera: Inactive'
              }
            </span>
            <span>
              {isStreaming && !demoMode ? 'Privacy Mode: No Recording' : 'Ready to Start'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isStarting ? 'bg-yellow-500 animate-pulse' :
              isStreaming && !demoMode ? 'bg-red-500 animate-pulse' : 
              demoMode ? 'bg-blue-500' : 'bg-gray-500'
            }`}></div>
            <span>
              {isStarting 
                ? 'Starting' 
                : isStreaming 
                  ? (demoMode ? 'Demo' : 'Live')
                  : 'Offline'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveCCTVMonitor;