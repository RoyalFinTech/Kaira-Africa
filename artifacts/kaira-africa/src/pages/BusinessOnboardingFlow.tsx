import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Check, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { KairaLogo } from '@/components/common/KairaLogo';
import { useCreateBusiness, ApiError } from '@workspace/api-client-react';

const step1Schema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  industry: z.string().min(1, 'Industry is required'),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(2, 'City is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email('Invalid email'),
});

const step2Schema = z.object({
  description: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
});

const step3Schema = z.object({
  teamSize: z.string().min(1, 'Team size is required'),
});

export default function BusinessOnboardingFlow() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [completeError, setCompleteError] = useState<string | null>(null);

  const form1 = useForm({ resolver: zodResolver(step1Schema), defaultValues: { businessName: '', businessType: '', industry: '', country: 'The Gambia', city: '', phone: '', email: '' } });
  const form2 = useForm({ resolver: zodResolver(step2Schema), defaultValues: { description: '', website: '', address: '' } });
  const form3 = useForm({ resolver: zodResolver(step3Schema), defaultValues: { teamSize: '' } });

  const progress = (currentStep / 4) * 100;

  const handleStep1 = (data: any) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
  };

  const handleStep2 = (data: any) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(3);
  };

  const handleStep3 = (data: any) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(4);
  };

  const createBusiness = useCreateBusiness({
    mutation: {
      onSuccess: () => setLocation('/dashboard'),
      onError: (error) => {
        // 409 = this user already belongs to a business (see the
        // backend's createBusinessForUser) — not really a failure
        // from the person's point of view, just means onboarding was
        // already completed (e.g. they hit back/refresh mid-flow).
        // Treat it as success rather than showing an error for
        // something that isn't actually wrong.
        if (error instanceof ApiError && error.status === 409) {
          setLocation('/dashboard');
          return;
        }
        setCompleteError(error.message);
      },
    },
  });

  const handleComplete = () => {
    setCompleteError(null);
    createBusiness.mutate({
      data: {
        name: formData.businessName,
        type: formData.businessType,
        industry: formData.industry,
        country: formData.country,
        city: formData.city,
        phone: formData.phone,
        email: formData.email,
        description: formData.description || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        teamSize: formData.teamSize,
      },
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <KairaLogo width={120} />
          <div className="flex flex-col items-end gap-1.5 text-right">
            <div className="text-sm text-muted-foreground">Step {currentStep} of 4</div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <a href="tel:+220874071510" className="text-primary hover:underline whitespace-nowrap">Call support</a>
              <a href="https://wa.me/220874071510" target="_blank" rel="noreferrer" className="text-primary hover:underline whitespace-nowrap">WhatsApp</a>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-display text-3xl font-bold mb-2">Business Information</h1>
              <p className="text-muted-foreground mb-8">Tell us about your business</p>

              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-5">
                  <FormField control={form1.control} name="businessName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form1.control} name="businessType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Corporation">Corporation</SelectItem>
                            <SelectItem value="LLC">LLC</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="Sole Proprietor">Sole Proprietor</SelectItem>
                            <SelectItem value="NGO">NGO</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form1.control} name="industry" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Financial Services">Financial Services</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                            <SelectItem value="Retail">Retail</SelectItem>
                            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="Agriculture">Agriculture</SelectItem>
                            <SelectItem value="Healthcare">Healthcare</SelectItem>
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form1.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="The Gambia">The Gambia</SelectItem>
                            <SelectItem value="Senegal">Senegal</SelectItem>
                            <SelectItem value="Sierra Leone">Sierra Leone</SelectItem>
                            <SelectItem value="Ghana">Ghana</SelectItem>
                            <SelectItem value="Nigeria">Nigeria</SelectItem>
                            <SelectItem value="Kenya">Kenya</SelectItem>
                            <SelectItem value="South Africa">South Africa</SelectItem>
                            <SelectItem value="Egypt">Egypt</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form1.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form1.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} placeholder="+220 87 407 1510" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form1.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Continue <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-display text-3xl font-bold mb-2">Business Profile</h1>
              <p className="text-muted-foreground mb-8">Additional details about your business</p>

              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-5">
                  <FormField control={form2.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea {...field} rows={4} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form2.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl><Input {...field} placeholder="https://yourwebsite.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form2.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Physical Address (Optional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-display text-3xl font-bold mb-2">Team Size</h1>
              <p className="text-muted-foreground mb-8">How many people work in your business?</p>

              <Form {...form3}>
                <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-5">
                  <FormField control={form3.control} name="teamSize" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Size</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select team size" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="1-5">1-5 employees</SelectItem>
                          <SelectItem value="6-20">6-20 employees</SelectItem>
                          <SelectItem value="21-50">21-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="200+">200+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-primary" />
              </motion.div>
              <h1 className="font-display text-4xl font-bold mb-4">Your Kaira workspace is ready</h1>
              <p className="text-lg text-muted-foreground mb-8">Let's set up your dashboard and start growing your business</p>
              {completeError && (
                <p className="flex items-center justify-center gap-2 text-sm text-destructive mb-4" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  {completeError}
                </p>
              )}
              <Button onClick={handleComplete} size="lg" className="px-8" disabled={createBusiness.isPending}>
                {createBusiness.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Setting up your workspace…
                  </span>
                ) : (
                  <>
                    Enter Dashboard <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
