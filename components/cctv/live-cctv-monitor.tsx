'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Camera, 
  CameraOff, 
  Play, 
  Pause, 
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Activity
} from 'lucide-react';
import { staticDatabase } from '@/lib/static-database';

interface AnalysisResult {
  priority: 'normal' | 'attention' | 'urgent';
  traffic: {
    congestionLevel: 'FREE_FLOW' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'TRAFFIC_JAM';
    vehicleCount: number;
    averageSpeed: number;
    confidence: number;
    timestamp: number;
  };
  accident: {
    isAccident: boolean;
    severity: 'minor' | 'major' | 'critical' | null;
    confidence: number;
    timestamp: number;
  };
  recommendations: string[];
}

const LiveCCTVMonitor: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<'traffic' | 'accident'>('traffic');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generate mock analysis data
  const generateMockAnalysis = (modelType: 'traffic' | 'accident'): AnalysisResult => {
    const congestionLevels = ['FREE_FLOW', 'LIGHT', 'MODERATE', 'HEAVY', 'TRAFFIC_JAM'] as const;
    const severities = ['minor', 'major', 'critical'] as const;
    
    return {
      priority: Math.random() > 0.8 ? 'attention' : 'normal',
      traffic: {
        congestionLevel: congestionLevels[Math.floor(Math.random() * congestionLevels.length)],
        vehicleCount: Math.floor(Math.random() * 50) + 10,
        averageSpeed: Math.floor(Math.random() * 60) + 20,
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: Date.now()
      },
      accident: {
        isAccident: Math.random() > 0.9,
        severity: Math.random() > 0.7 ? severities[Math.floor(Math.random() * severities.length)] : null,
        confidence: 0.6 + Math.random() * 0.4,
        timestamp: Date.now()
      },
      recommendations: modelType === 'traffic' 
        ? ['Monitor traffic flow', 'Adjust signal timing if needed']
        : ['Monitor intersection for safety', 'Check emergency protocols']
    };
  };

  const startCamera = async () => {
    try {
      setStreamError(null);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }
      
      // Try to get camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        // Start auto-analysis when camera starts
        setTimeout(() => {
          performAnalysis();
        }, 1000);
      }
    } catch (error) {
      console.log('Camera access failed, enabling demo mode');
      setStreamError('Camera access failed, running in demo mode');
      setDemoMode(true);
      setIsStreaming(true);
      
      // Start analysis in demo mode
      setTimeout(() => {
        performAnalysis();
      }, 1000);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setAnalysisResult(null);
  };

  const performAnalysis = async () => {
    if (!isStreaming || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = generateMockAnalysis(currentModel);
      setAnalysisResult(result);
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analysis every 10 seconds when streaming
  useEffect(() => {
    if (!isStreaming) return;
    
    const interval = setInterval(() => {
      performAnalysis();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isStreaming, currentModel]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 text-white animate-pulse';
      case 'attention': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'FREE_FLOW': return 'text-green-500';
      case 'LIGHT': return 'text-green-400';
      case 'MODERATE': return 'text-yellow-500';
      case 'HEAVY': return 'text-orange-500';
      case 'TRAFFIC_JAM': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card className="bg-slate-900/50 border-glow-cyan/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-glow-cyan">
            <Camera className="h-5 w-5" />
            Live CCTV Monitor
            {analysisResult && (
              <Badge className={getPriorityColor(analysisResult.priority)}>
                {analysisResult.priority.toUpperCase()}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Model Selection */}
            <Select value={currentModel} onValueChange={(value) => setCurrentModel(value as 'traffic' | 'accident')}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-600">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="traffic">Traffic Analysis</SelectItem>
                <SelectItem value="accident">Accident Detection</SelectItem>
              </SelectContent>
            </Select>

            {/* Camera Controls */}
            {!isStreaming ? (
              <Button
                variant="default"
                size="sm"
                onClick={startCamera}
                className="bg-glow-cyan hover:bg-glow-cyan/80"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopCamera}
              >
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Camera
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={performAnalysis}
              disabled={!isStreaming || isAnalyzing}
              className="border-glow-cyan/50 text-glow-cyan hover:bg-glow-cyan/10"
            >
              {isAnalyzing ? (
                <RotateCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stream Error */}
        {streamError && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-orange-400 text-sm">{streamError}</span>
          </div>
        )}

        {/* Demo Mode Notice */}
        {demoMode && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm">Demo Mode: Simulated camera feed with AI analysis</span>
          </div>
        )}

        {/* Video Stream */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {isStreaming && !demoMode ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
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
                    <p className="text-sm">Simulated surveillance with AI analysis</p>
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

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-glow-cyan" />
                  <span className="text-xs text-slate-400">Vehicles</span>
                </div>
                <div className="text-2xl font-bold text-glow-cyan">
                  {analysisResult.traffic.vehicleCount}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-400">Avg Speed</span>
                </div>
                <div className="text-2xl font-bold text-glow-cyan">
                  {analysisResult.traffic.averageSpeed} km/h
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-glow-cyan" />
                  <span className="text-xs text-slate-400">Traffic Status</span>
                </div>
                <div className={`text-lg font-bold ${getCongestionColor(analysisResult.traffic.congestionLevel)}`}>
                  {analysisResult.traffic.congestionLevel.replace('_', ' ')}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-glow-cyan" />
                  <span className="text-xs text-slate-400">Safety</span>
                </div>
                <div className="text-lg font-bold text-glow-cyan">
                  {analysisResult.accident.isAccident ? 'ALERT' : 'SAFE'}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-600">
              <h4 className="text-sm font-medium text-slate-300 mb-2">AI Recommendations</h4>
              <div className="space-y-1">
                {analysisResult.recommendations.map((rec, index) => (
                  <div key={index} className="text-xs text-slate-400 flex items-center gap-2">
                    <div className="w-1 h-1 bg-glow-cyan rounded-full"></div>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status Footer */}
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-2 flex justify-between items-center">
          <div className="flex gap-4">
            <span>
              {isStreaming 
                ? `Streaming: Active (${currentModel} model)` 
                : 'Camera: Inactive'
              }
            </span>
            <span>
              Last analysis: {analysisResult ? new Date(analysisResult.traffic.timestamp).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span>{isStreaming ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveCCTVMonitor;