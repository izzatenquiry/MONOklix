import React, { useState } from 'react';
import { LogoIcon } from './Icons';
import { loginUser } from '../services/userService';
import Spinner from './common/Spinner';

const LoginPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);
        const result = await loginUser(loginIdentifier);
        if (result.success === false) {
            setError(result.message);
        } else {
            // FIX: The loginUser function returns a user object on success, but this component expects a message.
            // Displaying a generic success message to resolve the type error.
            setMessage("Login successful. Please refresh the page to continue.");
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-black rounded-xl shadow-lg">
                <div className="text-center">
                    <LogoIcon className="w-48 mx-auto mb-4 text-gray-800 dark:text-gray-200" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Log In
                    </h1>
                     <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Enter your email to log in.
                    </p>
                </div>

                <>
                    {error && <p className="text-center text-sm text-red-500 dark:text-red-400 p-3 bg-red-500/10 rounded-md">{error}</p>}
                    {message && <p className="text-center text-sm text-green-500 dark:text-green-400 p-3 bg-green-500/10 rounded-md">{message}</p>}

                    <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                         <div>
                            <label htmlFor="email-input" className="sr-only">Email Address</label>
                            <input
                                id="email-input"
                                type="email"
                                required
                                value={loginIdentifier}
                                onChange={(e) => setLoginIdentifier(e.target.value)}
                                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                placeholder="Email Address"
                                disabled={isLoading || !!message}
                             />
                        </div>
                       
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading || !!message}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                                {isLoading ? <Spinner /> : 'Send Login Link'}
                            </button>
                        </div>
                    </form>

                     <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                       <p>No account? Please register and pay at our main website to get access.</p>
                    </div>
                </>
            </div>
        </div>
    );
};

export default LoginPage;