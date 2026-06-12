import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { ArrowLeft, Mail, Lock, User, Key } from 'lucide-react';

const AuthPage = () => {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'signup', 'forgot-password'
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (currentView === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;
        
        toast.success('Welcome back!');
        navigate('/dashboard');
      } 
      else if (currentView === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          toast.success('Check your email for confirmation link!');
        } else {
          toast.success('Account created successfully!');
          navigate('/dashboard');
        }
      }
      else if (currentView === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/auth?reset=true`
        });

        if (error) throw error;

        toast.success('Password reset email sent! Check your inbox.');
        setCurrentView('login');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      fullName: ''
    });
  };

  const switchView = (view) => {
    setCurrentView(view);
    resetForm();
  };

  const getViewConfig = () => {
    switch (currentView) {
      case 'login':
        return {
          title: 'Welcome Back',
          subtitle: 'Sign in to your account',
          buttonText: 'Sign In',
          icon: Lock
        };
      case 'signup':
        return {
          title: 'Join BeePro Academy',
          subtitle: 'Create your account to start learning',
          buttonText: 'Sign Up',
          icon: User
        };
      case 'forgot-password':
        return {
          title: 'Reset Password',
          subtitle: 'Enter your email to receive reset instructions',
          buttonText: 'Send Reset Email',
          icon: Key
        };
      default:
        return {};
    }
  };

  const config = getViewConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          {currentView === 'forgot-password' && (
            <button
              onClick={() => setCurrentView('login')}
              className="flex items-center text-blue-400 hover:text-blue-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </button>
          )}
          
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {config.title}
          </h1>
          <p className="text-gray-400">
            {config.subtitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name - Only for signup */}
          {currentView === 'signup' && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your full name"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
            />
          </div>

          {/* Password - Not for forgot password */}
          {currentView !== 'forgot-password' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                minLength={6}
              />
            </div>
          )}

          {/* Forgot Password Link - On login and signup */}
          {(currentView === 'login' || currentView === 'signup') && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setCurrentView('forgot-password')}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              config.buttonText
            )}
          </button>
        </form>

        {/* Footer Links */}
        {currentView !== 'forgot-password' && (
          <div className="mt-6 text-center space-y-2">
            {currentView === 'login' ? (
              <button
                onClick={() => switchView('signup')}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Don't have an account? <span className="font-medium">Sign up</span>
              </button>
            ) : (
              <button
                onClick={() => switchView('login')}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Already have an account? <span className="font-medium">Sign in</span>
              </button>
            )}
          </div>
        )}

        {/* Additional Help Text */}
        {currentView === 'forgot-password' && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-gray-300 text-sm text-center">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        )}

        {currentView === 'signup' && (
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-gray-400 text-xs text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuthPage;