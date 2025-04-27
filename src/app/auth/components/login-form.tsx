'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LoginFormProps, LoginFormValues } from '../types';
import { FcGoogle } from 'react-icons/fc';

export function LoginForm({
  onSubmit,
  isLoading,
  error,
  csrfToken,
  callbackUrl,
  userType
}: LoginFormProps) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<LoginFormValues>({
    username: '',
    password: '',
    csrfToken: csrfToken || '',
    callbackUrl: callbackUrl || `/${userType}/dashboard`,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formValues);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({
      ...formValues,
      [e.target.name]: e.target.value,
    });
  };

  // Use different colors based on user type to provide clear visual distinction
  const buttonColor = userType === 'organizer' 
    ? 'bg-blue-600 hover:bg-blue-700'
    : 'bg-indigo-600 hover:bg-indigo-700';
  
  const title = userType === 'organizer' 
    ? 'Organizer Login' 
    : 'Participant Login';
  
  const subtitle = userType === 'organizer'
    ? 'Enter your credentials to access the admin area'
    : 'Enter your credentials to access your participant account';

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-2">{subtitle}</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded text-red-700">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {csrfToken && (
          <input 
            name="csrfToken" 
            type="hidden" 
            value={csrfToken}
            onChange={handleChange}
          />
        )}
        
        <input 
          name="callbackUrl" 
          type="hidden" 
          value={formValues.callbackUrl}
          onChange={handleChange}
        />
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input 
            id="username" 
            name="username" 
            type="text" 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            required 
            value={formValues.username}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
            required 
            value={formValues.password}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          className={`${buttonColor} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
        
        {/* Show Google login option only for participant logins */}
        {userType === 'participant' && (
          <>
            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            <button 
              type="button"
              className="flex items-center justify-center w-full border border-gray-300 py-2 px-4 rounded focus:outline-none focus:border-blue-400 hover:bg-gray-50 transition-colors"
              onClick={() => signIn('google', { callbackUrl: formValues.callbackUrl })}
              disabled={isLoading}
            >
              <FcGoogle className="w-5 h-5 mr-2" />
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </form>
    </div>
  );
}
