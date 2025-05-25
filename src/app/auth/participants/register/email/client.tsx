'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from "lucide-react";
import { useLanguage } from '@/lib/i18n/language-context';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  username: z.string().min(4, { message: "Username must be at least 4 characters." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
  ic: z.string().min(6, { message: "IC number must be at least 6 characters." }).optional(),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 characters." }).optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EmailRegisterClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  // Default form values
  const defaultValues: Partial<FormValues> = {
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    ic: "",
    phoneNumber: "",
    gender: "MALE",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/participants/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          username: values.username,
          password: values.password,
          ic: values.ic,
          phoneNumber: values.phoneNumber,
          gender: values.gender,
          requireEmailVerification: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setRegisterSuccess(true);
      toast.success("Registration successful! Please check your email for verification.");
    } catch (error: any) {
      setError(error.message || "Registration failed");
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link 
            href="/auth/participants/register" 
            className="inline-flex items-center text-white hover:text-yellow-400 transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('auth.back_to_register')}
          </Link>
          
          <h1 className="text-3xl font-bold text-center mb-2">
            <div className="flex flex-col items-center">
              <span className="text-xs sm:text-sm text-white tracking-wider font-medium mb-1">MALAYSIA</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500">
                {t('hero.title') || 'Techlympics 2025'}
              </span>
            </div>
            <span className="text-xl block mt-2 text-white">{t('hero.subtitle') || 'Extraordinary, Global, Inclusive'}</span>
          </h1>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">Register with Email</h2>
          
          {registerSuccess ? (
            <div className="space-y-4">
              <Alert variant="default" className="bg-green-900/70 border-green-600 text-white">
                <AlertDescription>
                  <p className="font-medium">Registration successful!</p>
                  <p className="mt-2">
                    We've sent a verification email to your email address. Please check your inbox and click the verification link to activate your account.
                  </p>
                  <p className="mt-2">
                    If you don't see the email, please check your spam folder.
                  </p>
                </AlertDescription>
              </Alert>
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/auth/participants/login")}
                  className="mx-auto bg-transparent border-white text-white hover:bg-white/20"
                >
                  Go to Login
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="mb-4 bg-red-900/70 border-red-600 text-white">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                      </FormControl>
                      <FormDescription className="text-zinc-400">
                        You'll need to verify this email address.
                      </FormDescription>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Choose a username" {...field} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                      </FormControl>
                      <FormDescription className="text-zinc-400">
                        This will be used to log in to your account.
                      </FormDescription>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Create a password" type="password" {...field} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Confirm Password</FormLabel>
                        <FormControl>
                          <Input placeholder="Confirm your password" type="password" {...field} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">IC Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your IC number" {...field} value={field.value || ""} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                      </FormControl>
                      <FormDescription className="text-zinc-400">
                        Your IC number will be used for identification purposes.
                      </FormDescription>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" {...field} value={field.value || ""} className="bg-white/20 border-zinc-600 text-white placeholder:text-zinc-400" />
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Gender (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/20 border-zinc-600 text-white">
                              <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-zinc-900" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register"
                  )}
                </Button>
                
                <div className="text-center text-sm text-zinc-400 mt-4">
                  Already have an account?{" "}
                  <Link href="/auth/participants/login" className="text-yellow-400 underline-offset-4 hover:underline">
                    Sign in here
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
