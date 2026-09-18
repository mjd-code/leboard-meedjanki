import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type AuthMode = 'login' | 'register' | 'reset' | 'update-password';

interface AuthFormProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export function AuthForm({ initialMode = 'login', onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword, updatePassword } = useAuth();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  const updatePasswordForm = useForm({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      onSuccess?.();
    }
  };

  const handleRegister = async (data: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.displayName);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Try logging in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created! Please check your email to verify your account.');
    }
  };

  const handleReset = async (data: z.infer<typeof resetSchema>) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setMode('login');
    }
  };

  const handleUpdatePassword = async (data: z.infer<typeof updatePasswordSchema>) => {
    setIsLoading(true);
    const { error } = await updatePassword(data.password);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      onSuccess?.();
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
    // Don't set loading to false on success - redirect will happen
  };

  const watchedPassword = mode === 'register' 
    ? registerForm.watch('password') 
    : mode === 'update-password' 
    ? updatePasswordForm.watch('password')
    : '';

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {mode === 'login' && 'Welcome back'}
          {mode === 'register' && 'Create an account'}
          {mode === 'reset' && 'Reset password'}
          {mode === 'update-password' && 'Set new password'}
        </CardTitle>
        <CardDescription>
          {mode === 'login' && 'Enter your credentials to access your account'}
          {mode === 'register' && 'Enter your information to get started'}
          {mode === 'reset' && "Enter your email and we'll send you a reset link"}
          {mode === 'update-password' && 'Choose a strong password for your account'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {mode === 'login' && (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  {...loginForm.register('email')}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10"
                  {...registerForm.register('displayName')}
                />
              </div>
              {registerForm.formState.errors.displayName && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  {...registerForm.register('email')}
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...registerForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={watchedPassword} />
              {registerForm.formState.errors.password && (
                <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  {...resetForm.register('email')}
                />
              </div>
              {resetForm.formState.errors.email && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}

        {mode === 'update-password' && (
          <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...updatePasswordForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={watchedPassword} />
              {updatePasswordForm.formState.errors.password && (
                <p className="text-xs text-destructive">{updatePasswordForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10"
                  {...updatePasswordForm.register('confirmPassword')}
                />
              </div>
              {updatePasswordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{updatePasswordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}

        {(mode === 'login' || mode === 'register') && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {mode === 'login' && (
          <>
            <button
              type="button"
              onClick={() => setMode('reset')}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot your password?
            </button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </>
        )}

        {mode === 'register' && (
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        )}

        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => setMode('login')}
            className="text-sm text-primary hover:underline"
          >
            Back to sign in
          </button>
        )}
      </CardFooter>
    </Card>
  );
}
