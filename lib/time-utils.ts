/**
 * Time-based utility functions for route preferences
 */

// Define day/night hours (24-hour format)
export const DAY_START_HOUR = 6; // 6 AM
export const DAY_END_HOUR = 18;  // 6 PM

export interface TimePreference {
  isDay: boolean;
  preference: 'fastest' | 'safest';
  reason: string;
}

/**
 * Determine if it's day or night based on current time
 * and return appropriate route preference
 */
export function getTimePreference(currentTime?: Date): TimePreference {
  const now = currentTime || new Date();
  const hour = now.getHours();
  
  const isDay = hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
  
  if (isDay) {
    return {
      isDay: true,
      preference: 'fastest',
      reason: 'Daytime: Prioritizing speed and efficiency'
    };
  } else {
    return {
      isDay: false,
      preference: 'safest',
      reason: 'Nighttime: Prioritizing safety and highway routes'
    };
  }
}

/**
 * Get current time status for display
 */
export function getCurrentTimeStatus(currentTime?: Date): {
  timeString: string;
  period: 'Day' | 'Night';
  nextChange: string;
} {
  const now = currentTime || new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  const isDay = hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
  
  let nextChange: string;
  if (isDay) {
    // Day -> Night change
    const nextNightHour = hour < DAY_END_HOUR ? DAY_END_HOUR : (DAY_END_HOUR + 24);
    const hoursUntil = nextNightHour - hour - (minute > 0 ? 0 : 1);
    nextChange = `Sunset in ${hoursUntil}h ${60 - minute}m`;
  } else {
    // Night -> Day change
    const nextDayHour = hour < DAY_START_HOUR ? DAY_START_HOUR : (DAY_START_HOUR + 24);
    const hoursUntil = nextDayHour - hour - (minute > 0 ? 0 : 1);
    nextChange = `Sunrise in ${hoursUntil}h ${60 - minute}m`;
  }
  
  return {
    timeString,
    period: isDay ? 'Day' as const : 'Night' as const,
    nextChange
  };
}

/**
 * Calculate route score based on time preference and route characteristics
 */
export function calculateRouteScore(
  route: {
    distance: number;
    estimatedTime: number;
    hasHighway?: boolean;
    trafficIssuesCount?: number;
  },
  timePreference: TimePreference,
  trafficDensity: number = 0.5
): number {
  let score = 0;
  
  // Base score from time (faster routes get higher scores)
  const speedScore = Math.max(0, 100 - (route.estimatedTime * 2));
  score += speedScore * 0.4;
  
  // Distance factor
  const distanceScore = Math.max(0, 100 - (route.distance * 10));
  score += distanceScore * 0.3;
  
  // Time-based preferences
  if (timePreference.preference === 'fastest') {
    // During day: prioritize speed, even with some traffic
    const trafficPenalty = route.trafficIssuesCount ? route.trafficIssuesCount * 10 : 0;
    score += Math.max(0, 50 - trafficPenalty);
    
    // Slightly prefer highways if they don't add much time
    if (route.hasHighway && route.distance < 50) {
      score += 20;
    }
  } else {
    // During night: prioritize safety
    if (route.hasHighway) {
      score += 40; // High bonus for highways at night
    }
    
    // Penalize routes with traffic issues more heavily at night
    if (route.trafficIssuesCount && route.trafficIssuesCount > 0) {
      score -= route.trafficIssuesCount * 25;
    }
    
    // Slightly penalize very long routes at night (safety concern)
    if (route.distance > 100) {
      score -= 10;
    }
  }
  
  // Traffic density factor
  if (trafficDensity > 0.7) {
    score -= 15; // High traffic penalty
  } else if (trafficDensity < 0.3) {
    score += 10; // Light traffic bonus
  }
  
  return Math.max(0, score);
}