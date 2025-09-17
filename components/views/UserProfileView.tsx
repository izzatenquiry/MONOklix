import React, { useState, useEffect, useCallback } from 'react';
import { type User } from '../../types';
import { updateUserProfile } from '../../services/userService';
import { CreditCardIcon } from '../Icons';

interface UserProfileViewProps {
  theme: string;
  setTheme: (theme: string) => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
}

const TrialCountdownDisplay: React.FC<{ expiry: number }> = ({ expiry }) => {
    const calculateTimeLeft = useCallback(() => {
        const now = Date.now();
        const timeLeft = expiry - now;

        if (timeLeft <= 0) {
            return " - Expired";
        }

        const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        return ` - Expires in ${minutes}m ${seconds}s`;
    }, [expiry]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (timeLeft.includes("Expired")) {
            return; // No need to set up an interval if already expired
        }

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, calculateTimeLeft]);

    return <span className="italic">{timeLeft}</span>;
};

const BillingUsagePanel: React.FC = () => {
    // Mock data for demonstration
    const totalCredits = 5000;
    const usedCredits = 1850;
    const remainingCredits = totalCredits - usedCredits;
    const usagePercentage = (usedCredits / totalCredits) * 100;
    const currentBill = 25.00;

    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
                <CreditCardIcon className="w-6 h-6" />
                API Usage & Billing
            </h2>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-medium text-neutral-600 dark:text-neutral-400">Monthly Usage</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{usedCredits.toLocaleString()} / {totalCredits.toLocaleString()} Credits</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                        <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                    <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Credits Used</p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{usedCredits.toLocaleString()}</p>
                    </div>
                     <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Remaining Balance</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{remainingCredits.toLocaleString()}</p>
                    </div>
                     <div className="bg-neutral-100 dark:bg-neutral-800/50 p-4 rounded-lg">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Current Bill</p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">${currentBill.toFixed(2)}</p>
                    </div>
                </div>

                <div className="text-right mt-2">
                    <a href="#" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-semibold">View Billing Details</a>
                </div>
            </div>
        </div>
    );
};

const ProfileAndAppearancePanel: React.FC<UserProfileViewProps> = ({ theme, setTheme, currentUser, onUserUpdate }) => {
    const [fullName, setFullName] = useState(currentUser.fullName || currentUser.username);
    const [email, setEmail] = useState(currentUser.email);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

    const getAccountStatus = (user: User): { text: string; colorClass: string } => {
        switch (user.status) {
            case 'admin':
                return { text: 'Admin (Lifetime)', colorClass: 'text-green-500' };
            case 'lifetime':
                return { text: 'Active (Lifetime)', colorClass: 'text-green-500' };
            case 'trial':
                return { text: 'Active (Trial)', colorClass: 'text-yellow-500 dark:text-yellow-400' };
            case 'inactive':
                return { text: 'Inactive (Trial Expired)', colorClass: 'text-red-500' };
            default:
                return { text: 'Unknown', colorClass: 'text-neutral-500' };
        }
    };
    

    const handleSave = async () => {
        setStatus({ type: 'idle', message: '' });
        const result = await updateUserProfile(currentUser.id, {
            fullName: fullName,
            email: email,
        });

        if (result.success === false) {
            setStatus({ type: 'error', message: `Failed: ${result.message}` });
        } else {
            onUserUpdate(result.user);
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
        }
        
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
    };

    const isDarkMode = theme === 'dark';
    const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');
    const accountStatus = getAccountStatus(currentUser);

    return (
      <div className="space-y-8">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-6">User Profile</h2>

            <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Account Status: <span className={`font-bold ${accountStatus.colorClass}`}>{accountStatus.text}</span>
                    {currentUser.status === 'trial' && currentUser.subscriptionExpiry && (
                        <TrialCountdownDisplay expiry={currentUser.subscriptionExpiry} />
                    )}
                </p>
            </div>
           
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Dark Mode</h3>
                     <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {isDarkMode ? 'Enjoy a darker interface.' : 'Switch to a lighter interface.'}
                    </p>
                </div>
                <label htmlFor="dark-mode-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="dark-mode-toggle" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme}/>
                    <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-600"></div>
                </label>
            </div>

            <hr className="my-8 border-neutral-200 dark:border-neutral-700/50" />

            <div className="space-y-6">
                
                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email Address</label>
                    <input type="email" value={email} readOnly disabled className="w-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition cursor-not-allowed" />
                    <p className="text-xs text-neutral-400 mt-1">Changing email is not currently supported.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleSave} className="bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors">
                        Save Changes
                    </button>
                    {status.message && (
                        <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{status.message}</p>
                    )}
                </div>
            </div>
        </div>
        <BillingUsagePanel />
      </div>
    );
};

const UserProfileView: React.FC<UserProfileViewProps> = (props) => {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">User Profile & Settings</h1>
            <ProfileAndAppearancePanel {...props} />
        </div>
    );
};

export default UserProfileView;
