import React, { useState } from 'react';
import { LogoIcon } from './Icons';
import { loginUser, registerUser } from '../services/userService';
import Spinner from './common/Spinner';
import { type User } from '../types';

interface LoginPageProps {
    onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const result = await loginUser(loginIdentifier);
        // FIX: Added a type guard to correctly handle the `LoginResult` discriminated union type.
        // This ensures `result.user` is accessed on success and `result.message` is accessed on failure.
        if (result.success) {
            onLoginSuccess(result.user);
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const result = await registerUser(username, email, phone);
        // FIX: `registerUser` now logs the user in directly on success.
        if (result.success) {
            onLoginSuccess(result.user);
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError(null);
        setLoginIdentifier('');
        setEmail('');
        setPhone('');
        setUsername('');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-black rounded-xl shadow-lg">
                <div className="text-center">
                    <LogoIcon className="w-48 mx-auto mb-4 text-gray-800 dark:text-gray-200" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {isRegistering ? 'Cipta Akaun' : 'Log Masuk'}
                    </h1>
                     <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {isRegistering 
                            ? 'Isi butiran di bawah untuk mendaftar.' 
                            : 'Masukkan e-mel anda untuk log masuk.'
                        }
                    </p>
                </div>

                <>
                    {error && <p className="text-center text-sm text-red-500 dark:text-red-400">{error}</p>}

                    <form className="mt-6 space-y-4" onSubmit={isRegistering ? handleRegister : handleLogin}>
                        {isRegistering ? (
                            <>
                                 <div>
                                    <label htmlFor="username-input" className="sr-only">Nama Penuh</label>
                                    <input
                                        id="username-input"
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                        placeholder="Nama Penuh"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email-input" className="sr-only">Alamat E-mel</label>
                                    <input
                                        id="email-input"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                        placeholder="Alamat E-mel"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone-input" className="sr-only">Nombor Telefon</label>
                                    <input
                                        id="phone-input"
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                        placeholder="Nombor Telefon"
                                    />
                                </div>
                            </>
                        ) : (
                             <div>
                                <label htmlFor="email-input" className="sr-only">Alamat E-mel</label>
                                <input
                                    id="email-input"
                                    type="email"
                                    required
                                    value={loginIdentifier}
                                    onChange={(e) => setLoginIdentifier(e.target.value)}
                                    className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                                    placeholder="Alamat E-mel"
                                />
                            </div>
                        )}
                       
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                                {isLoading ? <Spinner /> : (isRegistering ? 'Daftar' : 'Log Masuk')}
                            </button>
                        </div>
                    </form>

                    <div className="text-center">
                        <button onClick={toggleMode} className="text-sm text-primary-500 hover:underline">
                            {isRegistering ? 'Sudah mempunyai akaun? Log Masuk' : 'Tiada akaun? Daftar di sini'}
                        </button>
                    </div>
                </>
            </div>
        </div>
    );
};

export default LoginPage;