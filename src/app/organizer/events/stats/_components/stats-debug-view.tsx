"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

type DebugDataProps = {
  title: string;
  data: any;
  expanded?: boolean;
};

function DebugDataSection({ title, data, expanded = false }: DebugDataProps) {
  const [isOpen, setIsOpen] = useState(expanded);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-t-md">
        <h3 className="text-sm font-medium">{title}</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? "Hide" : "Show"}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="p-4 bg-slate-50 dark:bg-slate-900 rounded-b-md border border-slate-200 dark:border-slate-700">
        <pre className="text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

type StatsDebugViewProps = {
  stateStats: any[];
  totalStats: any;
  zones: any[];
  states: any[];
};

export function StatsDebugView({ stateStats, totalStats, zones, states }: StatsDebugViewProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="mt-8 border-t border-gray-200 pt-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsVisible(!isVisible)}
        className="mb-4"
      >
        {isVisible ? "Hide Debug Data" : "Show Debug Data"}
      </Button>
      
      {isVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stats Debug View</CardTitle>
          </CardHeader>
          <CardContent>
            <DebugDataSection 
              title="State Stats Array Data (First 3 items)" 
              data={stateStats.slice(0, 3)} 
              expanded={true} 
            />
            <DebugDataSection 
              title="Total Stats Summary" 
              data={totalStats} 
              expanded={true} 
            />
            <DebugDataSection 
              title="Full State Stats (All Items)" 
              data={stateStats} 
            />
            <DebugDataSection 
              title="Available Zones" 
              data={zones} 
            />
            <DebugDataSection 
              title="Available States" 
              data={states} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
