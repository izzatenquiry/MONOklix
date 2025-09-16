




import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllUsers, updateUserStatus, replaceUsers, exportAllUserData } from '../../services/userService';
import { type User, type UserStatus } from '../../types';
import { UsersIcon, XIcon, DownloadIcon, UploadIcon } from '../Icons';

const formatStatus = (user: User): { text: string; color: 'green' | 'yellow' | 'red' | 'blue' } => {
    switch(user.status) {
        case 'admin':
            return { text: 'Admin', color: 'blue' };
        case 'lifetime':
            return { text: 'Seumur Hidup', color: 'green' };
        case 'trial':
            // This is a fallback, the countdown component will be used instead.
            return { text: 'Percubaan', color: 'yellow' };
        case 'inactive':
            return { text: 'Tidak Aktif', color: 'red' };
        default:
            return { text: 'Tidak Diketahui', color: 'red' };
    }
};

const statusColors: Record<'green' | 'yellow' | 'red' | 'blue', string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

const TrialCountdown: React.FC<{ expiry: number }> = ({ expiry }) => {
    const calculateRemainingTime = useCallback(() => {
        const now = Date.now();
        const timeLeft = expiry - now;

        if (timeLeft <= 0) {
            return { text: 'Telah tamat', color: 'red' as const };
        }

        const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);

        return { text: `Tamat dalam ${minutes}m ${seconds}s`, color: 'yellow' as const };
    }, [expiry]);
    
    const [timeInfo, setTimeInfo] = useState(calculateRemainingTime());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeInfo(calculateRemainingTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [expiry, calculateRemainingTime]);

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[timeInfo.color]}`}>
            {timeInfo.text}
        </span>
    );
};


const AIAgentPanel: React.FC = () => {
    const SETTINGS_KEY = '1za7-ai-agent-settings';

    const getInitialState = () => {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        } catch (e) {
            console.error("Failed to parse AI Agent settings:", e);
        }
        return {
          '1za7-gpt': true,
          'jana-foto': true,
          'foto-model': true,
          'foto-produk': true,
        };
    };

    const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean>>(getInitialState());

    const handleToggle = (id: string) => {
        setEnabledAgents(prev => {
            const newState = { ...prev, [id]: !prev[id] };
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(newState));
            } catch (e) {
                console.error("Failed to save AI Agent settings:", e);
            }
            return newState;
        });
    };

    const mainAgents = [
        { id: '1za7-gpt', label: '1za7-GPT' },
        { id: 'jana-foto', label: 'Jana Foto' },
        { id: 'jana-video', label: 'Jana Video' },
        { id: 'jana-copywriting', label: 'Jana Copywriting' },
        { id: 'ulasan-produk', label: 'Ulasan Produk' },
    ];
    const ugcAgents = [
        { id: 'foto-model', label: 'Foto Model' },
        { id: 'foto-produk', label: 'Foto Produk' },
        { id: 'gabung-video', label: 'Gabung Video' },
    ];

    const ToggleItem: React.FC<{
        service: { id: string; label: string };
        isChecked: boolean;
        onToggle: (id: string) => void;
    }> = ({ service, isChecked, onToggle }) => (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900/50 rounded-lg">
            <span className="font-medium text-gray-800 dark:text-gray-200">{service.label}</span>
            <label htmlFor={`toggle-${service.id}`} className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    id={`toggle-${service.id}`}
                    className="sr-only peer"
                    checked={isChecked}
                    onChange={() => onToggle(service.id)}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
        </div>
    );

    return (
        <>
            <h2 className="text-xl font-semibold">AI Agent</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
                Aktifkan atau nyahaktifkan ciri janaan AI untuk semua pengguna. Perubahan berkuat kuasa serta-merta.
            </p>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">AI Agent</h3>
                    <div className="space-y-2">
                        {mainAgents.map(service => (
                            <ToggleItem key={service.id} service={service} isChecked={!!enabledAgents[service.id]} onToggle={handleToggle} />
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Kandungan UGC</h3>
                    <div className="space-y-2">
                        {ugcAgents.map(service => (
                            <ToggleItem key={service.id} service={service} isChecked={!!enabledAgents[service.id]} onToggle={handleToggle} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};


const AdminDashboardView: React.FC = () => {
    const [users, setUsers] = useState<User[] | null>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newStatus, setNewStatus] = useState<UserStatus>('trial');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const allUsers = await getAllUsers();
        if (allUsers) {
            setUsers(allUsers.filter(user => user.role !== 'admin'));
        } else {
            setUsers(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setNewStatus(user.status);
        setIsModalOpen(true);
    };

    const handleSaveStatus = async () => {
        if (!selectedUser) return;
        
        if (await updateUserStatus(selectedUser.id, newStatus)) {
            fetchUsers();
            setStatusMessage({ type: 'success', message: `Status untuk ${selectedUser.username} telah dikemaskini.` });
        } else {
            setStatusMessage({ type: 'error', message: 'Gagal mengemas kini status.' });
        }
        setIsModalOpen(false);
        setSelectedUser(null);
        setTimeout(() => setStatusMessage(null), 4000);
    };
    

    const handleExport = async () => {
        setStatusMessage(null);
        const usersToExport = await exportAllUserData();
        if (!usersToExport) {
            setStatusMessage({ type: 'error', message: 'Gagal mengeksport: Pangkalan data pengguna rosak.' });
            setTimeout(() => setStatusMessage(null), 4000);
            return;
        }

        try {
            const dataStr = JSON.stringify(usersToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `1za7_users_backup_${timestamp}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setStatusMessage({ type: 'success', message: 'Data pengguna berjaya dieksport.' });
        } catch (error) {
             setStatusMessage({ type: 'error', message: 'Gagal mencipta fail eksport.' });
        }
        setTimeout(() => setStatusMessage(null), 4000);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStatusMessage(null);
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("Adakah anda pasti mahu menggantikan semua data pengguna sedia ada dengan kandungan fail ini? Tindakan ini tidak boleh diubah kembali.")) {
            if(event.target) event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Gagal membaca fail.");
                
                const importedUsers = JSON.parse(text);
                const result = await replaceUsers(importedUsers);

                if (result.success) {
                    setStatusMessage({ type: 'success', message: result.message });
                    fetchUsers(); // Refresh the view
                } else {
                    setStatusMessage({ type: 'error', message: result.message });
                }
            } catch (error) {
                setStatusMessage({ type: 'error', message: `Ralat mengimport fail: ${error instanceof Error ? error.message : 'Format fail tidak sah.'}` });
            } finally {
                 if(event.target) event.target.value = '';
                 setTimeout(() => setStatusMessage(null), 5000);
            }
        };
        reader.readAsText(file);
    };


    const filteredUsers = users
        ? users.filter(user =>
              (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        : [];
    
    if (loading) {
        return <div>Memuatkan pengguna...</div>;
    }

    if (users === null) {
        return (
            <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Ralat Kritikal:</strong>
                <span className="block sm:inline"> Pangkalan data pengguna rosak dan tidak dapat dibaca. Sila hubungi sokongan.</span>
            </div>
        );
    }

    return (
        <>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">User Database</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Urus pengguna, langganan, dan sandaran pangkalan data.</p>
                
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <input
                        type="text"
                        placeholder="Cari mengikut nama pengguna atau e-mel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    />
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                        <button onClick={handleImportClick} className="flex items-center gap-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <UploadIcon className="w-4 h-4" />
                            Import
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 text-sm bg-primary-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                            Eksport
                        </button>
                    </div>
                </div>

                 {statusMessage && (
                    <div className={`p-3 rounded-md mb-4 text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
                        {statusMessage.message}
                    </div>
                )}

                <div className="bg-white dark:bg-black rounded-lg shadow-inner">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        Nama Pengguna
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        E-mel
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Nombor Telefon
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Status Akaun
                                    </th>
                                    <th scope="col" className="px-6 py-3">
                                        Tindakan
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => {
                                        const { text, color } = formatStatus(user);
                                        return (
                                            <tr key={user.id} className="bg-white dark:bg-black border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                    {user.username || '-'}
                                                </th>
                                                <td className="px-6 py-4">
                                                    {user.email || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.phone || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.status === 'trial' && user.subscriptionExpiry ? (
                                                        <TrialCountdown expiry={user.subscriptionExpiry} />
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[color]}`}>
                                                            {text}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => openEditModal(user)}
                                                        className="font-medium text-primary-600 dark:text-primary-500 hover:underline"
                                                    >
                                                        Update
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10">
                                            {users.length > 0 ? (
                                                <div>
                                                    <p className="mt-2 font-semibold">Tiada pengguna ditemui.</p>
                                                    <p className="text-xs">Tiada pengguna yang sepadan dengan "{searchTerm}".</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <UsersIcon className="w-12 h-12 mx-auto text-gray-400" />
                                                    <p className="mt-2 font-semibold">Tiada pengguna berdaftar lagi.</p>
                                                    <p className="text-xs">Apabila pengguna baharu mendaftar, mereka akan muncul di sini.</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg mt-8">
                <AIAgentPanel />
            </div>

            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Ubah Status Pengguna</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm">Mengemas kini status untuk <span className="font-semibold">{selectedUser.username}</span>.</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Status Akaun
                                </label>
                                <select
                                    id="status-select"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                >
                                    <option value="trial">Percubaan</option>
                                    <option value="lifetime">Seumur Hidup</option>
                                    <option value="inactive">Tidak Aktif</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveStatus}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Kemas Kini Status
                                </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminDashboardView;