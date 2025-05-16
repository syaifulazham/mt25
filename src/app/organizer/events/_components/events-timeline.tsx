'use client';

import { useState } from 'react';
import { CalendarIcon, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { format, isAfter, isBefore, isEqual, isFuture, isPast, isWithinInterval } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Event {
  id: number;
  name: string;
  code: string;
  venue?: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  scopeArea: string;
  addressState?: string;
  zone?: { name: string } | null;
  state?: { name: string } | null;
}

interface EventsTimelineProps {
  events: Event[];
  onEventClick: (id: number) => void;
}

export default function EventsTimeline({ events, onEventClick }: EventsTimelineProps) {
  const [expanded, setExpanded] = useState<boolean>(true);

  // Sort events chronologically by start date
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Group events by month and year
  const groupedEvents = sortedEvents.reduce((groups: Record<string, Event[]>, event) => {
    const startDate = new Date(event.startDate);
    const monthYearKey = format(startDate, 'MMMM yyyy');
    
    if (!groups[monthYearKey]) {
      groups[monthYearKey] = [];
    }
    
    groups[monthYearKey].push(event);
    return groups;
  }, {});
  
  // Get current date for determining if event is past, current, or upcoming
  const now = new Date();
  
  // Function to determine event status
  const getEventStatus = (startDate: Date, endDate: Date) => {
    if (isWithinInterval(now, { start: startDate, end: endDate })) {
      return { label: 'Ongoing', color: 'bg-blue-500' };
    } else if (isPast(endDate)) {
      return { label: 'Past', color: 'bg-gray-400' };
    } else {
      return { label: 'Upcoming', color: 'bg-green-500' };
    }
  };

  // Get ordered list of month/year keys for the timeline
  const timelineKeys = Object.keys(groupedEvents).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  if (events.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6 text-center text-muted-foreground">
          No events found to display on timeline.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Chronological Events Timeline</h3>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse' : 'Expand'} All
          {expanded ? <ChevronDown className="ml-1 h-4 w-4" /> : <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
      <CardContent className="p-0">
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[21px] top-0 bottom-0 w-[2px] bg-gray-200" />
          
          <div className="py-2">
            {timelineKeys.map((monthYear, groupIndex) => {
              const events = groupedEvents[monthYear];
              
              return (
                <Collapsible
                  key={monthYear}
                  open={expanded}
                  onOpenChange={setExpanded}
                  className="mb-1"
                >
                  <div className="relative z-10">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground mr-3 shrink-0">
                          <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div className="font-medium">{monthYear}</div>
                        <ChevronDown className="ml-auto h-4 w-4" />
                      </div>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent>
                    {events.map((event, eventIndex) => {
                      const startDate = new Date(event.startDate);
                      const endDate = new Date(event.endDate);
                      const status = getEventStatus(startDate, endDate);
                      
                      return (
                        <div 
                          key={event.id}
                          onClick={() => onEventClick(event.id)}
                          className="relative pl-16 pr-4 py-3 hover:bg-gray-50 cursor-pointer"
                        >
                          {/* Timeline dot */}
                          <span className={cn(
                            "absolute left-[18px] w-[8px] h-[8px] rounded-full border-2 border-white",
                            status.color
                          )} />
                          
                          <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-sm">{event.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {event.code}
                                  {event.venue && ` • ${event.venue}`}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {status.label}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                            </div>
                            
                            <div className="text-xs">
                              <Badge variant="outline" className="text-xs">
                                {event.scopeArea === 'NATIONAL' ? 'National' :
                                 event.scopeArea === 'ZONE' ? `Zone: ${event.zone?.name || 'N/A'}` :
                                 event.scopeArea === 'STATE' ? `State: ${event.state?.name || 'N/A'}` : 'Open'}
                              </Badge>
                              {event.addressState && (
                                <span className="ml-2 text-muted-foreground">{event.addressState}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
