import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/button';
import { useAuth } from './auth-provider';
interface Values {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export function AuthPage() {
  const mode = useLocation().pathname.slice(1);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>();
  const password = watch('password') ?? '';
  const settingPassword = [
    'signup',
    'reset-password',
    'accept-invite',
  ].includes(mode);
  const checks = [
    [password.length >= 9, 'At least 9 characters'],
    [/[A-Z]/.test(password), 'One uppercase letter'],
    [/[a-z]/.test(password), 'One lowercase letter'],
    [/[^a-zA-Z0-9]/.test(password), 'One special character'],
  ] as const;
  const title =
    mode === 'signup'
      ? 'Create your account'
      : mode === 'forgot-password'
        ? 'Forgot your password?'
        : mode === 'reset-password'
          ? 'Choose a new password'
          : mode === 'accept-invite'
            ? 'Welcome to the team'
            : 'Welcome back.';
  async function submit(values: Values) {
    setError('');
    setMessage('');
    try {
      if (mode === 'login' || mode === 'signup') {
        const { confirmPassword: _, ...body } = values;
        void _;
        const user = await auth.authenticate(`/auth/${mode}`, body);
        navigate(user.role === 'CUSTOMER' ? '/portal' : '/app/dashboard');
      } else {
        const token = params.get('token');
        if (settingPassword && !token)
          throw new Error(
            'This link is missing its token. Please request a new link.',
          );
        await apiClient(`/auth/${mode}`, {
          method: 'POST',
          body: JSON.stringify(
            mode === 'forgot-password'
              ? { email: values.email }
              : { token, password: values.password },
          ),
        });
        setMessage(
          mode === 'forgot-password'
            ? 'If an account exists, a reset link has been sent.'
            : 'Password saved. You can now sign in.',
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to continue. Please try again.',
      );
    }
  }
  return (
    <>
      <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Brightloop workspace
      </p>
      <h1 className="font-heading text-3xl font-semibold">{title}</h1>
      <p className="mt-3 mb-8 text-muted-foreground">
        {mode === 'login'
          ? 'Everything recurring. Everything in focus.'
          : 'One step closer to simpler subscription management.'}
      </p>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        {mode === 'signup' && (
          <label className="block">
            Full name
            <input
              className="input mt-2"
              autoComplete="name"
              {...register('name', { required: 'Enter your name' })}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <span className="text-danger">{errors.name.message}</span>
            )}
          </label>
        )}
        {['login', 'signup', 'forgot-password'].includes(mode) && (
          <label className="block">
            Email address
            <input
              className="input mt-2"
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Enter your email' })}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <span className="text-danger">{errors.email.message}</span>
            )}
          </label>
        )}
        {mode !== 'forgot-password' && (
          <label className="block">
            Password
            <input
              className="input mt-2"
              type="password"
              autoComplete={
                settingPassword ? 'new-password' : 'current-password'
              }
              {...register('password', {
                required: 'Enter a password',
                validate: () =>
                  !settingPassword ||
                  checks.every(([ok]) => ok) ||
                  'Meet all password requirements',
              })}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <span className="text-danger">{errors.password.message}</span>
            )}
          </label>
        )}
        {settingPassword && (
          <>
            <ul
              className="grid gap-2 text-xs"
              aria-label="Password requirements"
            >
              {checks.map(([ok, label]) => (
                <li
                  key={label}
                  className={ok ? 'text-success' : 'text-muted-foreground'}
                >
                  <Check className="mr-2 inline size-3" aria-hidden="true" />
                  {label}
                  {ok ? ' ✓' : ''}
                </li>
              ))}
            </ul>
            <label className="block">
              Confirm password
              <input
                className="input mt-2"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  validate: (value) =>
                    value === password || 'Passwords must match',
                })}
              />
              {errors.confirmPassword && (
                <span className="text-danger">
                  {errors.confirmPassword.message}
                </span>
              )}
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-success">
            {message}
          </p>
        )}
        <Button className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? 'Please wait…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'forgot-password'
                  ? 'Send reset link'
                  : 'Save password'}
          <ArrowRight className="size-4" />
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm text-muted-foreground">
        <Link to={mode === 'login' ? '/signup' : '/login'}>
          {mode === 'login' ? 'Create an account' : 'Back to sign in'}
        </Link>
        {mode === 'login' && (
          <Link to="/forgot-password">Forgot password?</Link>
        )}
      </div>
    </>
  );
}
