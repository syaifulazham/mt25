'use client';

import { EventForm } from '../_components/event-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function NewEventPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/organizer/events">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-gray-500 mt-2">
          Create a new event for Techlympics with all the necessary details.
        </p>
      </div>
      
      <EventForm />
    </div>
  );
}
