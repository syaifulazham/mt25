'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { eventApi } from '@/lib/api-client';
import { stateApi } from '@/lib/api-client';
import { zoneApi } from '@/lib/api-client';
import { format } from 'date-fns';

// Define event form schema with Zod
const eventFormSchema = z.object({
  name: z.string().min(3, {
    message: "Event name must be at least 3 characters.",
  }),
  code: z.string().min(2, {
    message: "Event code must be at least 2 characters.",
  }),
  description: z.string().optional(),
  startDate: z.string({
    required_error: "Please select a start date.",
  }),
  endDate: z.string({
    required_error: "Please select an end date.",
  }),
  venue: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  addressState: z.string().optional(),
  scopeArea: z.enum(['NATIONAL', 'ZONE', 'STATE', 'OPEN', 'DISTRICT', 'ONLINE_NATIONAL', 'ONLINE_ZONE', 'ONLINE_STATE', 'ONLINE_OPEN']).default('OPEN'),
  zoneId: z.string().optional(),
  stateId: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Define the form values type
type EventFormValues = z.infer<typeof eventFormSchema>;

// Default values for the form
const defaultValues: Partial<EventFormValues> = {
  name: "",
  code: "",
  description: "",
  startDate: "",
  endDate: "",
  venue: "",
  address: "",
  city: "",
  addressState: "_none",
  scopeArea: "OPEN",
  zoneId: "",
  stateId: "",
  latitude: "",
  longitude: "",
  isActive: true,
};

interface EventFormProps {
  initialData?: any;
}

export function EventForm({ initialData }: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [states, setStates] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!initialData;

  // Fetch states for dropdown
  useEffect(() => {
    const fetchStates = async () => {
      try {
        setIsLoading(true);
        const response = await stateApi.getStates();
        setStates(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Error fetching states:', error);
        toast.error('Failed to load states');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStates();
  }, []);

  // Fetch zones for dropdown
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setIsLoading(true);
        const response = await zoneApi.getZones();
        setZones(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Error fetching zones:', error);
        toast.error('Failed to load zones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchZones();
  }, []);

  // Prepare initial values for the form
  const getInitialValues = () => {
    if (!initialData) return defaultValues;

    return {
      name: initialData.name,
      code: initialData.code,
      description: initialData.description || "",
      startDate: format(new Date(initialData.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(initialData.endDate), 'yyyy-MM-dd'),
      venue: initialData.venue || "",
      address: initialData.address || "",
      city: initialData.city || "",
      addressState: initialData.addressState || "_none",
      scopeArea: initialData.scopeArea || "OPEN",
      zoneId: initialData.zoneId || "",
      stateId: initialData.stateId || "",
      latitude: initialData.latitude ? initialData.latitude.toString() : "",
      longitude: initialData.longitude ? initialData.longitude.toString() : "",
      isActive: initialData.isActive ?? true,
    };
  };

  // Initialize the form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: getInitialValues(),
  });

  // Watch the scopeArea field to conditionally show zone/state fields
  const watchScopeArea = form.watch("scopeArea");

  // Reset zoneId and stateId when scope area changes
  useEffect(() => {
    // Reset zoneId when scope area is not ZONE
    if (watchScopeArea !== "ZONE") {
      form.setValue("zoneId", "");
    }
    
    // Reset stateId when scope area is not STATE
    if (watchScopeArea !== "STATE") {
      form.setValue("stateId", "");
    }
  }, [watchScopeArea, form]);

  // Handle form submission
  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);
    
    try {
      // Convert latitude and longitude from string to number if they're not empty
      const latitudeValue = data.latitude ? parseFloat(data.latitude) : null;
      const longitudeValue = data.longitude ? parseFloat(data.longitude) : null;
      
      // Handle the addressState field - convert "_none" to null
      const addressStateValue = data.addressState === "_none" ? null : data.addressState;
      
      // Handle zone and state IDs based on scope area
      let zoneIdValue = null;
      let stateIdValue = null;
      
      if ((data.scopeArea === "ZONE" || data.scopeArea === "ONLINE_ZONE") && data.zoneId) {
        zoneIdValue = parseInt(data.zoneId);
      }
      
      if ((data.scopeArea === "STATE" || data.scopeArea === "ONLINE_STATE") && data.stateId) {
        // Special case: If 'Online State' selected and 'National' selected as 'State',
        // then stateId shall save as NULL (open to all states)
        // Check for both string "national" and numeric "0" (which represents "National" selection)
        if (data.scopeArea === "ONLINE_STATE" && (data.stateId === "national" || data.stateId === "0")) {
          stateIdValue = null;
        } else {
          stateIdValue = parseInt(data.stateId);
        }
      }
      
      if (isEditMode) {
        // Update existing event
        await eventApi.updateEvent(initialData.id, {
          ...data,
          addressState: addressStateValue,
          zoneId: zoneIdValue,
          stateId: stateIdValue,
          latitude: latitudeValue,
          longitude: longitudeValue,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        });
        toast.success('Event updated successfully');
      } else {
        // Create new event
        await eventApi.createEvent({
          ...data,
          addressState: addressStateValue,
          zoneId: zoneIdValue,
          stateId: stateIdValue,
          latitude: latitudeValue,
          longitude: longitudeValue,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        });
        toast.success('Event created successfully');
      }
      
      // Redirect back to events list
      router.push('/organizer/events');
      router.refresh();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Event Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Techlympics 2025" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of your event as it will appear to participants.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Event Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. TECH-2025" {...field} disabled={isEditMode} />
                    </FormControl>
                    <FormDescription>
                      A unique code for the event. Cannot be changed after creation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scope Area, Zone, and State Section */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Scope Area */}
              <FormField
                control={form.control}
                name="scopeArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope Area</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NATIONAL">National</SelectItem>
                        <SelectItem value="ZONE">Zone (requires zone selection)</SelectItem>
                        <SelectItem value="STATE">State (requires state selection)</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="ONLINE_NATIONAL">Online National</SelectItem>
                        <SelectItem value="ONLINE_ZONE">Online Zone (requires zone selection)</SelectItem>
                        <SelectItem value="ONLINE_STATE">Online State (requires state selection)</SelectItem>
                        <SelectItem value="ONLINE_OPEN">Online Open</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The scope area of the event.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Zone - Only show when scope area is ZONE or ONLINE_ZONE */}
              {(watchScopeArea === "ZONE" || watchScopeArea === "ONLINE_ZONE") && (
                <FormField
                  control={form.control}
                  name="zoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id.toString()}>
                              {zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The zone where the event will be held.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* State - Only show when scope area is STATE or ONLINE_STATE */}
              {(watchScopeArea === "STATE" || watchScopeArea === "ONLINE_STATE") && (
                <FormField
                  control={form.control}
                  name="stateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {watchScopeArea === "ONLINE_STATE" && (
                            <SelectItem value="0">National</SelectItem>
                          )}
                          {states.map((state) => (
                            <SelectItem key={state.id} value={state.id.toString()}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The state where the event will be held.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the event, its objectives, and what participants can expect..." 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A detailed description of the event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the event starts.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the event ends.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Venue */}
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kuala Lumpur Convention Centre" {...field} />
                  </FormControl>
                  <FormDescription>
                    The venue where the event will be held.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* State */}
              <FormField
                control={form.control}
                name="addressState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.name}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The state where the event will be held.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Latitude and Longitude - Side by side */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Latitude */}
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 3.1390" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional GPS coordinate.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Longitude */}
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 101.6869" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional GPS coordinate.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Set whether this event is active and visible to users.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/organizer/events')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
