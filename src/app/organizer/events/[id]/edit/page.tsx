'use client';

import { EventForm } from '../../_components/event-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { eventApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const data = await eventApi.getEvent(parseInt(eventId));
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/organizer/events">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Event</h1>
        <p className="text-gray-500 mt-2">
          Update the details for this Techlympics event.
        </p>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <EventForm initialData={event} />
      )}
    </div>
  );
}
