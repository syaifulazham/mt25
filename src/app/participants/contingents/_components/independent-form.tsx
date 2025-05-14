'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/i18n/language-context';
import { Users, UserRound, UsersRound } from 'lucide-react';

// Define form validation schema
const independentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  town: z.string().optional(),
  postcode: z.string().optional(),
  stateId: z.string().min(1, 'State is required'),
  institution: z.string().optional(),
  type: z.enum(['PARENT', 'YOUTH_GROUP'], {
    required_error: 'Please select a type',
  }),
});

type FormValues = z.infer<typeof independentFormSchema>;

interface State {
  id: number;
  name: string;
}

interface IndependentFormProps {
  onSubmit: (data: FormValues) => void;
  isLoading: boolean;
  initialData?: Partial<FormValues>;
}

export function IndependentForm({ onSubmit, isLoading, initialData }: IndependentFormProps) {
  const [states, setStates] = useState<State[]>([]);
  const { t } = useLanguage();

  const form = useForm<FormValues>({
    resolver: zodResolver(independentFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      town: initialData?.town || '',
      postcode: initialData?.postcode || '',
      stateId: initialData?.stateId || '',
      institution: initialData?.institution || '',
      // Set Youth Group as the default selection
      type: (initialData?.type as 'PARENT' | 'YOUTH_GROUP') || 'YOUTH_GROUP',
    },
  });

  useEffect(() => {
    async function fetchStates() {
      try {
        const response = await fetch('/api/reference/states');
        if (!response.ok) {
          throw new Error('Failed to fetch states');
        }
        const data = await response.json();
        setStates(data);
      } catch (error) {
        console.error('Error fetching states:', error);
        toast({
          title: 'Error',
          description: 'Failed to load states. Please try again.',
          variant: 'destructive',
        });
      }
    }

    fetchStates();
  }, []);

  // Handle form submission
  const handleSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('independent.independent_type')}</FormLabel>
                  <div className="flex space-x-4">
                    <Button 
                      type="button"
                      variant={field.value === 'YOUTH_GROUP' ? "default" : "outline"}
                      className={`flex-1 justify-start py-6 ${field.value === 'YOUTH_GROUP' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => field.onChange('YOUTH_GROUP')}
                    >
                      <div className="flex flex-col items-center w-full">
                        <UsersRound className={`h-6 w-6 mb-2 ${field.value === 'YOUTH_GROUP' ? 'text-white' : 'text-purple-600'}`} />
                        <span className={`${field.value === 'YOUTH_GROUP' ? 'text-white' : ''}`}>{t('independent.youth_group')}</span>
                      </div>
                    </Button>
                    <Button 
                      type="button"
                      variant={field.value === 'PARENT' ? "default" : "outline"}
                      className={`flex-1 justify-start py-6 ${field.value === 'PARENT' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                      onClick={() => field.onChange('PARENT')}
                    >
                      <div className="flex flex-col items-center w-full">
                        <UserRound className={`h-6 w-6 mb-2 ${field.value === 'PARENT' ? 'text-white' : 'text-orange-600'}`} />
                        <span className={`${field.value === 'PARENT' ? 'text-white' : ''}`}>{t('independent.parent')}</span>
                      </div>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('independent.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('independent.name_placeholder')} onChange={field.onChange} value={field.value} name={field.name} ref={field.ref} onBlur={field.onBlur} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('independent.institution')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('independent.institution_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('independent.address')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('independent.address_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="town"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('independent.town')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('independent.town_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('independent.postcode')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('independent.postcode_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="stateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('independent.state')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('independent.state_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
