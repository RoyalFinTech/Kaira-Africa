import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, AlertTriangle, ChevronLeft } from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAdminLogin, ApiError } from '@workspace/api-client-react';
import { setToken, setAdminInfo } from '@/lib/api-client';

const adminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type AdminForm = z.infer<typeof adminSchema>;

type LoginState = 'idle' | 'loading' | 'error' | 'locked';

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const form = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
    defaultValues: { email: '', password: '' },
  });

  const adminLogin = useAdminLogin({
    mutation: {
      onSuccess: (result) => {
        setToken(result.token);
        setAdminInfo(result.admin);
        setLoginState('idle');
        setLocation('/admin/dashboard');
      },
      onError: (error) => {
        // 403 = account temporarily locked from repeated failures
        // (see the backend's admin lockout logic) — distinct from a
        // plain wrong-credentials 401, worth telling the person so
        // they don't keep retrying a password that might be correct.
        const locked = error instanceof ApiError && error.status === 403;
        setLoginState(locked ? 'locked' : 'error');
        setErrorMsg(
          locked
            ? error.message
            : 'Invalid credentials. Please check your email and password.',
        );
        form.setValue('password', '');
      },
    },
  });

  const onSubmit = (data: AdminForm) => {
    setLoginState('loading');
    setErrorMsg('');
    adminLogin.mutate({ data: { email: data.email, password: data.password } });
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* ── Left Panel — Admin Identity ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f2417 100%)' }}>

        {/* Circuit/grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" viewBox="0 0 400 600">
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="400" height="600" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <div className="relative z-10">
          <div className="w-fit rounded-xl bg-white p-2 shadow-sm">
            <KairaLogo width={140} />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Shield badge */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-amber-400/30 bg-amber-400/10">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold text-white mb-2">
              Admin Portal
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Restricted access. This portal is reserved for authorized Kaira Africa administrators only.
            </p>
          </div>

          {/* Security notice */}
          <div className="p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1">
                  Restricted Access
                </p>
                <p className="text-xs text-slate-500">
                  Unauthorized access attempts are logged and monitored.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-600">
          © {new Date().getFullYear()} Kaira Africa — Administration
        </div>
      </div>

      {/* ── Right Panel — Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-slate-50 dark:bg-background">
        <div className="w-full max-w-sm">
          {/* Back to user login */}
          <button
            onClick={() => setLocation('/login')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to user login
          </button>

          {/* Mobile logo */}
          <div className="mb-6 lg:hidden">
            <KairaLogo width={110} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Shield header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-800">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground leading-tight">
                  Administrator Login
                </h1>
                <p className="text-xs text-muted-foreground">Authorized personnel only</p>
              </div>
            </div>

            {/* Security warning */}
            <div className="mb-6 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                🛡️ This portal is reserved for authorized Kaira Africa administrators. Unauthorized access attempts may be logged and monitored.
              </p>
            </div>

            {/* Error state */}
            {loginState === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </motion.div>
            )}

            {loginState === 'locked' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <KairaLogo width={26} className="shrink-0 rounded bg-white p-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Account Restricted</p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                    Your administrator access has been temporarily restricted. Contact the system administrator.
                  </p>
                </div>
              </motion.div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Administrator Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@kaira.africa"
                          autoComplete="email"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Link href="/admin/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                  disabled={loginState === 'loading'}
                >
                  {loginState === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 animate-spin" />
                      Authenticating…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Sign In to Admin Portal
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
