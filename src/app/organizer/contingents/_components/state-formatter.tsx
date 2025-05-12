"use client";

interface StateObject {
  name: string;
  id: number;
  zoneId: number;
}

type StateType = string | StateObject | null | undefined;

// Simple component to safely format state names
export function StateFormatter({ state }: { state: StateType }) {
  if (!state) return null;
  
  // Extract state name from object if needed
  const stateStr = typeof state === 'object' 
    ? (state as StateObject).name || ''
    : String(state);
    
  if (!stateStr) return null;
  
  const upperStateName = stateStr.toUpperCase();
  
  let formattedState = stateStr;
  
  if (upperStateName.includes('NEGERI SEMBILAN')) formattedState = 'N9';
  else if (upperStateName.includes('PULAU PINANG')) formattedState = 'P. PINANG';
  else if (upperStateName.includes('WILAYAH PERSEKUTUAN KUALA LUMPUR')) formattedState = 'WP KL';
  else if (upperStateName.includes('WILAYAH PERSEKUTUAN')) {
    formattedState = `WP ${upperStateName.replace('WILAYAH PERSEKUTUAN', '').trim()}`;
  }
  else if (upperStateName.includes('KUALA LUMPUR')) formattedState = 'KL';
  
  return (
    <span className="ml-1 text-xs">
      ({formattedState})
    </span>
  );
}
