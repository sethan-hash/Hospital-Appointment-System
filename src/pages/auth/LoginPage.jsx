import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { isValidEmail, isNonEmptyString } from '../../utils/validators';

import { getDashboardPathForRole } from '../../components/common/RoleRoute';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!isNonEmptyString(password)) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const user = await login(email, password);
      const targetDashboard = getDashboardPathForRole(user.role);
      navigate(targetDashboard);
    } catch (err) {
      setErrors({ form: err.message || 'Invalid email or password.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8 w-full max-w-md px-2">
        {/* Logo and Welcome Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center shadow-card">
            <Icon
              name="local_hospital"
              filled={true}
              className="text-[32px] text-white"
            />
          </div>
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold">
              MedLink Care
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
              Welcome back
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          {errors.form && (
            <div className="bg-error-container/20 border border-error/40 text-error text-body-sm rounded-xl p-3 flex items-center gap-2">
              <Icon name="error" className="text-xl shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          <Input
            label="Email Address"
            id="email"
            type="email"
            placeholder="patient@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            iconLeading="mail"
            error={errors.email}
            required
          />

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="password"
                className="font-label-md text-label-md text-on-surface-variant font-medium ml-1"
              >
                Password <span className="text-error">*</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to demo email.')}
                className="font-label-md text-label-md text-primary hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              iconLeading="lock"
              error={errors.password}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            rounded="full"
            fullWidth
            loading={isLoading}
            iconTrailing="arrow_forward"
            className="mt-2"
          >
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="font-body-md text-body-md text-on-surface-variant">
            New to MedLink?{' '}
            <Link
              to="/register"
              className="font-label-lg text-label-lg text-primary font-semibold hover:underline"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
