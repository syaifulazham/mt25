"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

interface FilterControlsProps {
  searchTerm: string;
  stateFilter: string;
  viewMode: string;
  availableStates: any[];
}

export function FilterControls({ 
  searchTerm, 
  stateFilter, 
  viewMode, 
  availableStates 
}: FilterControlsProps) {
  return (
    <form method="get" id="filterForm" className="flex gap-2 items-center w-full">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          name="search" 
          defaultValue={searchTerm}
          placeholder="Search contingents..." 
          className="pl-8 bg-white w-full" 
        />
        <Button type="submit" size="sm" className="absolute right-1 top-1">
          Search
        </Button>
      </div>
      
      <div className="relative min-w-[180px]">
        <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <select 
          name="state" 
          defaultValue={stateFilter}
          onChange={() => {
            const form = document.getElementById('filterForm') as HTMLFormElement;
            form?.submit();
          }}
          className="h-10 w-full rounded-md border border-input bg-white px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All States</option>
          {availableStates.map((state) => (
            <option key={state.id} value={state.id}>{state.name}</option>
          ))}
        </select>
      </div>
      
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="view" value={viewMode} />
    </form>
  );
}
