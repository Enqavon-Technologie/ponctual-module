import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, User } from '../services/api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { toast } from 'react-hot-toast';


import {
    LayoutDashboard,
    ClipboardList,
    Calendar,
    Receipt,
    FileText,
    Users,
    Search,
    Bell,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronLeft,
    MoreVertical,
    Download,
    Filter,
    TrendingUp,
    Eye,
    Trash2,
    Edit2,
    Clock,
    Phone,
    Mail,
    MapPin,
    CheckCircle2,
    AlertCircle,
    Baby,
    User as UserIcon,
    Shield,
    LayoutGrid,
    Table as TableIcon,
    ShieldCheck,
    Loader2,
    History,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    CreditCard,
    DollarSign,
    Briefcase,
    Plus,
    Link as LinkIcon,
    Video,
    ExternalLink
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// Generic date formatter used by many subviews in this file when a locale-aware
// formatter from context is not available.
const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleString();
    } catch {
        return String(dateStr);
    }
};

const formatDateDMY = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return String(dateStr);
    }
};
import { KanbanBoard, RequestDetailsModal, transformToKanbanRequest, KanbanRequest } from './KanbanBoard';
import { AddNewActiveRequestModal } from './AddNewActiveRequestModal';
import { ProposeCandidatesModal } from './ProposeCandidatesModal';
import { MatchPicksContent } from './MatchPicksContent';
import { buildRequestDetailsText } from '../utils/requestDetails';
import { interviewRoomUrl } from '../utils/interview';
import { generateContractPdf } from '../utils/contractPdfGenerator';
import { generateBabysitterContractPdf } from '../utils/babysitterContractPdf';
import { Pagination } from './Pagination';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { StatusBadge } from './StatusBadge';

interface AdminDashboardProps {
    onLogout: () => void;
}

type AdminPage = 'dashboard' | 'new-requests' | 'completed-requests' | 'completed' | 'ongoing-requests' | 'requests' | 'active-requests' | 'pending-signature' | 'pending-babysitter-signature' | 'signed-contracts' | 'interviews' | 'invoices' | 'contracts' | 'attestations' | 'users';


export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [activePage, setActivePage] = useState<AdminPage>('new-requests');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [viewingUserId, setViewingUserId] = useState<number | null>(null);
    const [viewingChoiceId, setViewingChoiceId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserIdForInvoices, setSelectedUserIdForInvoices] = useState<number | null>(null);
    // New Request modal is opened from the top-nav CTA; refresh key re-fetches the pending list after an add.
    const [isAddRequestModalOpen, setIsAddRequestModalOpen] = useState(false);
    const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);

    const menuItems = [
        // { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        // { id: 'requests', label: 'All Requests', icon: ClipboardList },
        { id: 'new-requests', label: 'Pending Requests', icon: ClipboardList },
        { id: 'active-requests', label: 'Requests in Matching', icon: Activity },
        { id: 'pending-signature', label: 'Pending Signature & Payment', icon: CreditCard },
        { id: 'pending-babysitter-signature', label: 'Pending Babysitter Signature', icon: FileText },
        { id: 'completed', label: 'Completed Requests', icon: CheckCircle2 },
        // { id: 'ongoing-requests', label: 'Ongoing Requests', icon: Clock },
        // { id: 'completed-requests', label: 'Completed Request', icon: CheckCircle2 },
        // { id: 'signed-contracts', label: 'Signed Contract', icon: ShieldCheck },
        { id: 'invoices', label: 'Invoices', icon: Receipt },
        { id: 'contracts', label: 'Contracts', icon: FileText },
        { id: 'attestations', label: 'Attestations Fiscales', icon: History },
        { id: 'users', label: 'All Parents', icon: Users },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);



    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                                <Shield size={24} />
                            </div>
                            {isSidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-xl font-bold tracking-tight whitespace-nowrap"
                                >
                                    AdminPanel
                                </motion.span>
                            )}
                        </div>

                        {/* Desktop Collapse Toggle */}
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>

                    {/* Sidebar Menu */}
                    <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActivePage(item.id as AdminPage);
                                        if (item.id === 'invoices') setSelectedUserIdForInvoices(null);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${isActive
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                                    {isSidebarOpen && (
                                        <span className="font-medium text-sm">{item.label}</span>
                                    )}
                                    {!isSidebarOpen && isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-900 rounded-r-full" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-slate-100">
                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all group ${!isSidebarOpen && 'justify-center'}`}
                        >
                            <LogOut size={20} />
                            {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                {/* Top Header Bar */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors md:hidden"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 capitalize hidden sm:block">
                            {viewingUserId ? 'User Details' : viewingChoiceId ? 'Contract Details' : (menuItems.find(m => m.id === activePage)?.label || activePage.replace('-', ' '))}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* New Request CTA */}
                        <button
                            onClick={() => setIsAddRequestModalOpen(true)}
                            className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200/60 flex items-center gap-2"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">New Request</span>
                        </button>


                        <div className="flex items-center gap-3">
                            {/* Notification bell hidden for now
                            <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all relative">
                                <Bell size={20} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                            </button>
                            */}

                            <div className="h-8 w-px bg-slate-200 mx-1" />

                            <div className="flex items-center gap-3 pl-2">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-900">Admin User</p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Super Admin</p>
                                </div>
                                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
                                    AD
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* New Request modal — triggered from the top-nav CTA, available on any page */}
                <AnimatePresence>
                    {isAddRequestModalOpen && (
                        <AddNewActiveRequestModal
                            onClose={() => setIsAddRequestModalOpen(false)}
                            onSuccess={() => setRequestsRefreshKey(k => k + 1)}
                        />
                    )}
                </AnimatePresence>

                {/* Dynamic Content Area */}
                <main className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activePage === 'dashboard' && <DashboardView />}
                            {activePage === 'new-requests' && <NewRequestsView key={requestsRefreshKey} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'completed-requests' && <CompletedRequestsView searchQuery={searchQuery} onSearchChange={setSearchQuery} onViewInvoices={(userId) => { setSelectedUserIdForInvoices(userId); setActivePage('invoices'); }} />}
                            {activePage === 'ongoing-requests' && <OngoingRequestsView searchQuery={searchQuery} onSearchChange={setSearchQuery} onViewInvoices={(userId) => { setSelectedUserIdForInvoices(userId); setActivePage('invoices'); }} />}
                            {activePage === 'requests' && <RequestsView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'active-requests' && <ActiveRequestsView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'pending-signature' && <PendingSignatureView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'pending-babysitter-signature' && <PendingBabysitterSignatureView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'completed' && <CompletedSignedRequestsView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'signed-contracts' && <SignedContractsView searchQuery={searchQuery} onSearchChange={setSearchQuery} onViewInvoices={(userId) => { setSelectedUserIdForInvoices(userId); setActivePage('invoices'); }} />}
                            {activePage === 'interviews' && <InterviewsView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {activePage === 'invoices' && <InvoicesView searchQuery={searchQuery} onSearchChange={setSearchQuery} userId={selectedUserIdForInvoices} onClearUserFilter={() => setSelectedUserIdForInvoices(null)} />}
                            {activePage === 'attestations' && <AttestationsView searchQuery={searchQuery} onSearchChange={setSearchQuery} />}
                            {viewingChoiceId ? (

                                <ContractDetailView
                                    choiceId={viewingChoiceId}
                                    onBack={() => setViewingChoiceId(null)}
                                />
                            ) : activePage === 'contracts' ? (
                                <ContractsView searchQuery={searchQuery} onSearchChange={setSearchQuery} onViewContract={(id) => setViewingChoiceId(id)} />
                            ) : null}
                            {activePage === 'users' && (
                                viewingUserId ? (
                                    <UserDetailsView
                                        id={viewingUserId}
                                        onBack={() => setViewingUserId(null)}
                                    />
                                ) : (
                                    <UsersView searchQuery={searchQuery} onSearchChange={setSearchQuery} onViewUser={(id) => setViewingUserId(id)} />
                                )
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

// --- Sub-Views ---

const DashboardView = () => {
    const stats = [
        { label: 'Total Requests', value: '1,284', trend: '+12.5%', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Interviews', value: '42', trend: '+5.2%', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Pending Payments', value: '€3,450', trend: '-2.4%', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Total Revenue', value: '€48,290', trend: '+18.7%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                                <stat.icon size={24} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Placeholder */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-slate-900">Revenue Analytics</h3>
                        <select className="bg-slate-50 border-none text-xs font-bold rounded-lg px-3 py-2 outline-none">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64 bg-slate-50 rounded-xl flex items-end justify-between px-8 pb-4 gap-2">
                        {[40, 70, 45, 90, 65, 85, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-slate-200 rounded-t-lg hover:bg-slate-900 transition-colors cursor-pointer group relative" style={{ height: `${h}%` }}>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {h * 100}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                    <UserIcon size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">New request from Family Smith</p>
                                    <p className="text-xs text-slate-400">2 minutes ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NewRequestsView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<KanbanRequest | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (req: import('../services/api').ParentRequest) => {
        setEditingRequest(transformToKanbanRequest(req));
    };

    const handleDeleteClick = (id: number) => {
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.removeParentRequest(requestToDelete);
            if (response.status) {
                toast.success('Request deleted successfully');
                setRequests(requests.filter(r => r.id !== requestToDelete));
                setIsDeleteModalOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete request');
            }
        } catch (err) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
        try {
            const response = await api.updateParentRequest(reqId, {
                first_name: updatedFields.user?.first_name || '',
                last_name: updatedFields.user?.last_name || '',
                parent_address: updatedFields.parent_address || '',
                email: updatedFields.email || '',
                children: (updatedFields.children || []).map((c: any) => ({ id: c.id, child_dob: c.child_dob })),
                choices: (updatedFields.choices || []).map((c: any) => ({
                    choice_order: c.choice_order,
                    bb_bs_id: c.bb_bs_id,
                    babysitter_first_name: c.babysitter_first_name,
                    babysitter_last_name: c.babysitter_last_name,
                    interview_date: c.interview_date,
                    interview_time: c.interview_time
                })),
                schedules: (updatedFields.schedules || []).map((s: any) => ({
                    schedule_date: s.schedule_date,
                    slots: (s.slots || []).map((slot: any) => ({ start_time: slot.start_time, end_time: slot.end_time }))
                })),
                hourly_rate: updatedFields.hourly_rate,
                user_language: updatedFields.user?.user_language,
                _method: 'put'
            } as any);

            if (response.status && response.data) {
                toast.success('Request updated successfully');
                setRequests(prev => prev.map(r => r.id === reqId ? response.data! : r));
                setEditingRequest(null);
            } else {
                toast.error(response.message || 'Update failed');
            }
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const fetchNewRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getNewRequests();
            setRequests(result);
            setCurrentPage(1);
        } catch (err: any) {
            setError('Failed to load new requests. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNewRequests();
    }, []);

    const filteredRequests = requests.filter(req => {
        // Pending = the parent has NOT validated step 3 (the price quote).
        // quote_status === 1 means the quote was accepted, so exclude those.
        if (req.quote_status === 1) return false;
        const parentName = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return parentName.includes(searchLower) ||
            req.id.toString().includes(searchLower) ||
            req.parent_address?.toLowerCase().includes(searchLower);
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Pending Requests List</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter new requests..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>

                    <button
                        onClick={fetchNewRequests}
                        className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <History size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[23%]">Parent Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[27%]">Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Rate</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[11%]">Created At</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-[12%]">Price Quote</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[9%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700">
                            {isLoading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span className="text-sm font-medium">Loading new requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && error && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-red-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle size={18} />
                                            <span className="text-sm font-medium">{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No new requests found.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && paginatedRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                            <span className="text-xs text-slate-400">{req.user?.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate align-top">{req.parent_address || 'No address provided'}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900 align-top">€{req.hourly_rate}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 align-top">
                                        {formatDateDMY(req.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-center align-top">
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/price/${req.id}`;
                                                navigator.clipboard.writeText(link);
                                                toast.success('Link copied!');
                                            }}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 mx-auto bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs shadow-sm shadow-emerald-200/50"
                                            title="Copy Price Quote Message"
                                        >
                                            <LinkIcon size={14} />
                                            <span>Copy Link</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleDeleteClick(req.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <AnimatePresence>
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRequestToDelete(null);
                        }}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title="Delete Request"
                        message="Are you sure you want to delete this new request? This action cannot be undone."
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingRequest && (
                    <RequestDetailsModal
                        request={editingRequest}
                        onClose={() => setEditingRequest(null)}
                        onUpdate={(updatedFields) => handleUpdate(editingRequest.id, updatedFields)}
                        hideBabysittersTab={true}
                    />
                )}
            </AnimatePresence>

        </div>

    );
};

const OngoingRequestsView = ({ onViewInvoices, searchQuery, onSearchChange }: { onViewInvoices?: (userId: number) => void; searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<KanbanRequest | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (req: import('../services/api').ParentRequest) => {
        setEditingRequest(transformToKanbanRequest(req));
    };

    const handleDeleteClick = (id: number) => {
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.removeParentRequest(requestToDelete);
            if (response.status) {
                toast.success('Request deleted successfully');
                setRequests(requests.filter(r => r.id !== requestToDelete));
                setIsDeleteModalOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete request');
            }
        } catch (err) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
        try {
            const response = await api.updateParentRequest(reqId, {
                first_name: updatedFields.user?.first_name || '',
                last_name: updatedFields.user?.last_name || '',
                parent_address: updatedFields.parent_address || '',
                email: updatedFields.email || '',
                children: (updatedFields.children || []).map((c: any) => ({ id: c.id, child_dob: c.child_dob })),
                choices: (updatedFields.choices || []).map((c: any) => ({
                    choice_order: c.choice_order,
                    bb_bs_id: c.bb_bs_id,
                    babysitter_first_name: c.babysitter_first_name,
                    babysitter_last_name: c.babysitter_last_name,
                    interview_date: c.interview_date,
                    interview_time: c.interview_time
                })),
                schedules: (updatedFields.schedules || []).map((s: any) => ({
                    schedule_date: s.schedule_date,
                    slots: (s.slots || []).map((slot: any) => ({ start_time: slot.start_time, end_time: slot.end_time }))
                })),
                hourly_rate: updatedFields.hourly_rate,
                user_language: updatedFields.user?.user_language,
                _method: 'put'
            } as any);

            if (response.status && response.data) {
                toast.success('Request updated successfully');
                setRequests(prev => prev.map(r => r.id === reqId ? response.data! : r));
                setEditingRequest(null);
            } else {
                toast.error(response.message || 'Update failed');
            }
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const fetchOngoingRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getOngoingRequests();
            setRequests(result);
            setCurrentPage(1);
        } catch (err: any) {
            setError('Failed to load ongoing requests. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOngoingRequests();
    }, []);

    const filteredRequests = requests.filter(req => {
        const parentName = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const hiredSitter = req.choices?.find(c => Number(c.final_choice) === 1);
        const sitterName = hiredSitter ? `${hiredSitter.babysitter_first_name} ${hiredSitter.babysitter_last_name}`.toLowerCase() : '';
        const searchLower = searchQuery.toLowerCase();
        return parentName.includes(searchLower) ||
            sitterName.includes(searchLower) ||
            req.id.toString().includes(searchLower) ||
            req.parent_address?.toLowerCase().includes(searchLower);
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Ongoing Requests List</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search ongoing requests..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={fetchOngoingRequests}
                        className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <History size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[28%]">Parent Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[26%]">Hired Sitter</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">Rate</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[16%]">Created At</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span className="text-sm font-medium">Loading ongoing requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && error && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle size={18} />
                                            <span className="text-sm font-medium">{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No ongoing requests found.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && paginatedRequests.map((req) => {
                                const hiredSitter = req.choices?.find(c => Number(c.final_choice) === 1);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                                <span className="text-xs text-slate-400">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            {hiredSitter ? (
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{hiredSitter.babysitter_first_name} {hiredSitter.babysitter_last_name}</span>
                                                        <span className="text-xs text-slate-400">{hiredSitter.babysitter_email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                        <Phone size={10} />
                                                        <span>{hiredSitter.babysitter_phone}</span>
                                                    </div>
                                                    {hiredSitter.interview_date && (
                                                        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-medium">
                                                            <Calendar size={10} />
                                                            <span>Interview: {formatDateDMY(hiredSitter.interview_date)} {hiredSitter.interview_time}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">Not assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 align-top">€{req.hourly_rate}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 align-top whitespace-nowrap w-[16%]">
                                            {formatDateDMY(req.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right align-top w-[10%] min-w-0">
                                            <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onViewInvoices?.(req.user_id)}
                                                    className="group/btn relative flex items-center justify-center p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm shadow-slate-200"
                                                    title="View Invoices"
                                                >
                                                    <Receipt size={18} />
                                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl opacity-0 hover:invisible group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                                                        View Invoices
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(req.id)}
                                                    className="w-full sm:w-auto max-w-[48px] p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <AnimatePresence>
                {editingRequest && (
                    <RequestDetailsModal
                        request={editingRequest}
                        onClose={() => setEditingRequest(null)}
                        onUpdate={(updatedFields) => handleUpdate(editingRequest.id, updatedFields)}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRequestToDelete(null);
                        }}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title="Delete Request"
                        message="Are you sure you want to delete this ongoing request? This action cannot be undone."
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const CompletedRequestsView = ({ onViewInvoices, searchQuery, onSearchChange }: { onViewInvoices?: (userId: number) => void; searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<KanbanRequest | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (req: import('../services/api').ParentRequest) => {
        setEditingRequest(transformToKanbanRequest(req));
    };

    const handleDeleteClick = (id: number) => {
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.removeParentRequest(requestToDelete);
            if (response.status) {
                toast.success('Request deleted successfully');
                setRequests(requests.filter(r => r.id !== requestToDelete));
                setIsDeleteModalOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete request');
            }
        } catch (err) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
        try {
            const response = await api.updateParentRequest(reqId, {
                first_name: updatedFields.user?.first_name || '',
                last_name: updatedFields.user?.last_name || '',
                parent_address: updatedFields.parent_address || '',
                email: updatedFields.email || '',
                children: (updatedFields.children || []).map((c: any) => ({ id: c.id, child_dob: c.child_dob })),
                choices: (updatedFields.choices || []).map((c: any) => ({
                    choice_order: c.choice_order,
                    bb_bs_id: c.bb_bs_id,
                    babysitter_first_name: c.babysitter_first_name,
                    babysitter_last_name: c.babysitter_last_name,
                    interview_date: c.interview_date,
                    interview_time: c.interview_time
                })),
                schedules: (updatedFields.schedules || []).map((s: any) => ({
                    schedule_date: s.schedule_date,
                    slots: (s.slots || []).map((slot: any) => ({ start_time: slot.start_time, end_time: slot.end_time }))
                })),
                hourly_rate: updatedFields.hourly_rate,
                user_language: updatedFields.user?.user_language,
                _method: 'put'
            } as any);

            if (response.status && response.data) {
                toast.success('Request updated successfully');
                setRequests(prev => prev.map(r => r.id === reqId ? response.data! : r));
                setEditingRequest(null);
            } else {
                toast.error(response.message || 'Update failed');
            }
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const fetchCompletedRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getCompletedRequests();
            setRequests(result);
            setCurrentPage(1);
        } catch (err: any) {
            setError('Failed to load completed requests. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompletedRequests();
    }, []);

    const filteredRequests = requests.filter(req => {
        const parentName = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const hiredSitter = req.choices?.find(c => Number(c.final_choice) === 1);
        const sitterName = hiredSitter ? `${hiredSitter.babysitter_first_name} ${hiredSitter.babysitter_last_name}`.toLowerCase() : '';
        const searchLower = searchQuery.toLowerCase();
        return parentName.includes(searchLower) ||
            sitterName.includes(searchLower) ||
            req.id.toString().includes(searchLower) ||
            req.parent_address?.toLowerCase().includes(searchLower);
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Completed Requests List</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter completed requests..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={fetchCompletedRequests}
                        className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <History size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[29%]">Parent Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[29%]">Hired Sitter</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">Rate</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">Completed At</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span className="text-sm font-medium">Loading completed requests...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && error && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle size={18} />
                                            <span className="text-sm font-medium">{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No completed requests found.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && paginatedRequests.map((req) => {
                                const hiredSitter = req.choices?.find(c => Number(c.final_choice) === 1);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                                <span className="text-xs text-slate-400">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            {hiredSitter ? (
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{hiredSitter.babysitter_first_name} {hiredSitter.babysitter_last_name}</span>
                                                        <span className="text-xs text-slate-400">{hiredSitter.babysitter_email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                        <Phone size={10} />
                                                        <span>{hiredSitter.babysitter_phone}</span>
                                                    </div>
                                                    {hiredSitter.interview_date && (
                                                        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-medium">
                                                            <Calendar size={10} />
                                                            <span>Interview: {formatDateDMY(hiredSitter.interview_date)} {hiredSitter.interview_time}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">Not assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 align-top">€{req.hourly_rate}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 align-top">
                                            {formatDateDMY(req.updated_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onViewInvoices?.(req.user_id)}
                                                    className="group/btn relative flex items-center justify-center p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm shadow-slate-200"
                                                    title="View Invoices"
                                                >
                                                    <Receipt size={18} />
                                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl opacity-0 hover:invisible group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                                                        View Invoices
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <AnimatePresence>
                {editingRequest && (
                    <RequestDetailsModal
                        request={editingRequest}
                        onClose={() => setEditingRequest(null)}
                        onUpdate={(updatedFields) => handleUpdate(editingRequest.id, updatedFields)}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRequestToDelete(null);
                        }}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title="Delete Request"
                        message="Are you sure you want to delete this completed request? This action cannot be undone."
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const SitterChoicesModal: React.FC<{
    choices: any[],
    requestId: number,
    parentName?: string,
    userLanguage?: string,
    onClose: () => void,
    onRefresh?: () => void
}> = ({ choices, requestId, parentName, userLanguage, onClose, onRefresh }) => {
    const { formatDate } = useLanguage();
    const handleSelectFinal = async (choiceId: number) => {

        try {
            const response = await api.selectFinalChoice(choiceId);
            if (response.status) {
                toast.success(response.message || 'Choice finalized successfully');
                if (onRefresh) onRefresh();
                onClose(); // Close modal to show updated status in table
            } else {
                toast.error(response.message || 'Failed to finalize choice');
            }
        } catch (error) {
            toast.error('An error occurred while finalizing choice');
        }
    };

    const hasAcceptedChoice = choices.some(c => Number(c.final_choice) === 1);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-full sm:max-w-4xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Sitter Choices</h3>
                        <p className="text-sm text-slate-500">Request #{requestId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="flex flex-col gap-4">
                        {choices.map((choice) => (
                            <div key={choice.id} className="group relative bg-white border border-slate-100 rounded-3xl p-6 transition-all hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-0.5 overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] items-center gap-4">
                                    {/* Sitter Identity */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                                            {choice.babysitter_pic ? (
                                                <img
                                                    src={`https://bloom-buddies.fr/uploads/profile_images/${choice.babysitter_pic}`}
                                                    alt={`${choice.babysitter_first_name}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <UserIcon size={24} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-base font-bold text-slate-900 truncate">
                                                {choice.babysitter_first_name} {choice.babysitter_last_name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5 mt-1">
                                                <Mail size={12} className="text-slate-400" />
                                                {choice.babysitter_email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Center Details Section */}
                                    <div className="min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                                            <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold">
                                                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                                    <Phone size={14} />
                                                </div>
                                                <span className="truncate">{choice.babysitter_phone || 'N/A'}</span>
                                            </div>

                                            <div className="mt-3 sm:mt-0">
                                                {choice.interview_date ? (
                                                    <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50 text-xs">
                                                        <div className="flex items-center gap-1.5 text-blue-600 font-bold whitespace-nowrap">
                                                            <Calendar size={13} />
                                                            <span>{formatDate(choice.interview_date)}</span>
                                                        </div>
                                                        <div className="w-px h-3 bg-blue-200/50" />
                                                        <div className="flex items-center gap-1.5 text-blue-500 font-bold whitespace-nowrap">
                                                            <Clock size={13} />
                                                            <span>{choice.interview_time?.substring(0, 5)}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium px-3 py-1.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 italic whitespace-nowrap">
                                                        <Clock size={13} className="text-slate-300" />
                                                        Not scheduled
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="flex flex-wrap items-center gap-2 justify-end">
                                        {Number(choice.final_choice) === 1 ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/contract/${choice.id}`;
                                                        const lang = userLanguage || 'en';
                                                        const name = parentName || 'Client';
                                                        
                                                        let message = '';
                                                        if (lang === 'fr') {
                                                            message = `Cher/Chère ${name},

Un nouveau contrat a été préparé pour votre demande. Vous pouvez maintenant le consulter et le valider.

Voir le contrat
${link}

Veuillez cliquer sur le lien ci-dessus pour consulter et signer votre contrat.

Cordialement,
Team Bloom`;
                                                        } else {
                                                            message = `Dear ${name},

A new contract has been prepared for your request. You can now review and validate it.

View Contract
${link}

Please click the link above to review and sign your contract.

Best regards,
Team Bloom`;
                                                        }
                                                        
                                                        navigator.clipboard.writeText(message);
                                                        toast.success('Contract message copied!');
                                                    }}
                                                    className="px-3 py-2 bg-brand-accent/5 text-brand-accent rounded-xl hover:bg-brand-accent hover:text-white transition-all border border-brand-accent/10 shadow-sm font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap"
                                                    title="Copy Contract Message"
                                                >
                                                    <FileText size={14} />
                                                    <span>Contract</span>
                                                </button>
                                                <div className="px-3 py-2 bg-emerald-500 text-white text-[11px] font-black rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-1.5 uppercase tracking-wide whitespace-nowrap">
                                                    <CheckCircle2 size={14} />
                                                    Accepted
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleSelectFinal(choice.id)}
                                                className="px-4 py-2.5 bg-slate-900 text-white text-[11px] font-extrabold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                                            >
                                                <CheckCircle2 size={16} />
                                                Final Choice
                                            </button>
                                        )}

                                        {choice.bb_bs_id && (
                                            <a
                                                href={`https://bloom-buddies.fr/babysitter/${choice.bb_bs_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 flex items-center justify-center bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                                                title="View Public Profile"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}

                                        {choice.interview_date && (
                                            <a
                                                href={interviewRoomUrl(choice.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                                                title="Join video interview"
                                            >
                                                <Video size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>


    );
};

const ActiveRequestChoicesCell: React.FC<{
    choices: any[],
    requestId: number,
    onShowMore: (choices: any[], reqId: number) => void,
    onRefresh?: () => void
}> = ({ choices, requestId, onShowMore, onRefresh }) => {
    if (!choices || choices.length === 0) return <span className="text-slate-400 text-sm italic">No choices</span>;

    const visibleChoices = choices.slice(0, 2);
    const hasMore = choices.length > 2;

    const handleSelectFinal = async (choiceId: number) => {
        try {
            const response = await api.selectFinalChoice(choiceId);
            if (response.status) {
                toast.success(response.message || 'Choice finalized successfully');
                if (onRefresh) onRefresh();
            } else {
                toast.error(response.message || 'Failed to finalize choice');
            }
        } catch (error) {
            toast.error('An error occurred while finalizing choice');
        }
    };
    const hasAcceptedChoice = choices.some(c => Number(c.final_choice) === 1);

    return (
        <div className="flex flex-col gap-3 min-w-[200px]">
            {visibleChoices.map((choice) => (
                <div key={choice.id} className="flex flex-col space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100 group/choice hover:bg-white transition-all">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                                {choice.babysitter_pic ? (
                                    <img
                                        src={`https://bloom-buddies.fr/uploads/profile_images/${choice.babysitter_pic}`}
                                        alt={`${choice.babysitter_first_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon size={16} />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-800 text-sm truncate">{choice.babysitter_first_name} {choice.babysitter_last_name}</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{choice.babysitter_email}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {choice.bb_bs_id && (
                                <a
                                    href={`https://bloom-buddies.fr/babysitter/${choice.bb_bs_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-emerald-500 bg-emerald-50 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"
                                    title="View Public Profile"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://bloom-buddies.fr/babysitter/${choice.bb_bs_id}`, '_blank');
                                    }}
                                >
                                    <ExternalLink size={14} />
                                </a>
                            )}
                            {choice.interview_date && (
                                <a
                                    href={interviewRoomUrl(choice.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                                    title="Join video interview"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(interviewRoomUrl(choice.id), '_blank');
                                    }}
                                >
                                    <Video size={14} />
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Phone size={10} />
                        <span>{choice.babysitter_phone}</span>
                    </div>
                    {choice.interview_date && (
                        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/50">
                            <Calendar size={10} />
                            <span>Interview: {formatDateDMY(choice.interview_date)} {choice.interview_time}</span>
                        </div>
                    )}
                    {Number(choice.final_choice) === 1 && (
                        <div className="mt-1 flex items-center gap-1 w-full">
                            <div className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-default pointer-events-none">
                                <CheckCircle2 size={12} />
                                Accepted
                            </div>
                        </div>
                    )}
                    {Number(choice.final_choice) !== 1 && !hasAcceptedChoice && (
                        <button
                            onClick={() => handleSelectFinal(choice.id)}
                            className="mt-1 w-full py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                            <CheckCircle2 size={12} />
                            Make it Final Choice
                        </button>
                    )}
                </div>
            ))}
            {hasMore && (
                <button
                    onClick={() => onShowMore(choices, requestId)}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 w-fit"
                >
                    <Plus size={10} />
                    <span>{choices.length - 2} more</span>
                </button>
            )}
        </div>
    );
};

const PendingSignatureView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        setIsLoading(true); setError(null);
        try {
            const result = await api.getPendingSignatureRequests();
            setRequests(result); setCurrentPage(1);
        } catch {
            setError('Failed to load. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    React.useEffect(() => { fetchData(); }, []);

    const filtered = requests.filter(req => {
        const name = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || req.id.toString().includes(q) || req.parent_address?.toLowerCase().includes(q);
    });
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const copyContractLink = (choiceId: number) => {
        navigator.clipboard.writeText(`${window.location.origin}/contract/${choiceId}`);
        toast.success('Contract link copied!');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Pending Signature &amp; Payment</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Filter requests..." value={searchQuery}
                            onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm" />
                    </div>
                    <button onClick={fetchData} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Refresh">
                        <History size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[30%]">Family</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[28%]">Chosen Babysitter</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[16%]">Status</th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[18%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (<tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400"><div className="flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={20} /><span className="text-sm font-medium">Loading…</span></div></td></tr>)}
                            {!isLoading && error && (<tr><td colSpan={5} className="px-6 py-12 text-center text-red-500"><div className="flex items-center justify-center gap-2"><AlertCircle size={18} /><span className="text-sm font-medium">{error}</span></div></td></tr>)}
                            {!isLoading && !error && filtered.length === 0 && (<tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">No requests pending signature.</td></tr>)}
                            {!isLoading && !error && paginated.map(req => {
                                const finalChoice = (req.choices ?? []).find((c: any) => Number(c.final_choice) === 1);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                                <span className="text-xs text-slate-400">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            {finalChoice ? (
                                                <span className="font-semibold text-slate-700 text-sm">{(finalChoice as any).babysitter_first_name} {(finalChoice as any).babysitter_last_name}</span>
                                            ) : <span className="text-slate-400 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Awaiting signature</span>
                                        </td>
                                        <td className="px-4 py-4 text-right align-top">
                                            {finalChoice && (
                                                <button onClick={() => copyContractLink((finalChoice as any).id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-accent/10 text-brand-accent text-xs font-bold rounded-xl hover:bg-brand-accent hover:text-white transition-all">
                                                    <LinkIcon size={14} /> Copy contract link
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

// Requests where the family has signed and we now need the babysitter's
// signature. The admin generates the babysitter's contract here.
const PendingBabysitterSignatureView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const { language } = useLanguage();
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        setIsLoading(true); setError(null);
        try {
            const result = await api.getPendingBabysitterSignatureRequests();
            setRequests(result); setCurrentPage(1);
        } catch {
            setError('Failed to load. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    React.useEffect(() => { fetchData(); }, []);

    const filtered = requests.filter(req => {
        const name = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || req.id.toString().includes(q) || req.parent_address?.toLowerCase().includes(q);
    });
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const babysitterContractUrl = (choiceId: number) => `${window.location.origin}/babysitter-contract/${choiceId}`;

    const copyLink = (choiceId: number) => {
        navigator.clipboard.writeText(babysitterContractUrl(choiceId));
        toast.success(language === 'fr' ? 'Lien du contrat copié !' : 'Contract link copied!');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Pending Babysitter Signature</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Filter requests..." value={searchQuery}
                            onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm" />
                    </div>
                    <button onClick={fetchData} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Refresh">
                        <History size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[28%]">Family</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[26%]">Chosen Babysitter</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[18%]">Status</th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[20%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (<tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400"><div className="flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={20} /><span className="text-sm font-medium">Loading…</span></div></td></tr>)}
                            {!isLoading && error && (<tr><td colSpan={5} className="px-6 py-12 text-center text-red-500"><div className="flex items-center justify-center gap-2"><AlertCircle size={18} /><span className="text-sm font-medium">{error}</span></div></td></tr>)}
                            {!isLoading && !error && filtered.length === 0 && (<tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">No requests pending babysitter signature.</td></tr>)}
                            {!isLoading && !error && paginated.map(req => {
                                const finalChoice = (req.choices ?? []).find((c: any) => Number(c.final_choice) === 1);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                                <span className="text-xs text-slate-400">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            {finalChoice ? (
                                                <span className="font-semibold text-slate-700 text-sm">{(finalChoice as any).babysitter_first_name} {(finalChoice as any).babysitter_last_name}</span>
                                            ) : <span className="text-slate-400 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Awaiting babysitter signature</span>
                                        </td>
                                        <td className="px-4 py-4 text-right align-top">
                                            {finalChoice && (
                                                <div className="inline-flex items-center gap-2">
                                                    <a href={babysitterContractUrl((finalChoice as any).id)} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">
                                                        <FileText size={14} /> Preview
                                                    </a>
                                                    <button onClick={() => copyLink((finalChoice as any).id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-accent/10 text-brand-accent text-xs font-bold rounded-xl hover:bg-brand-accent hover:text-white transition-all">
                                                        <LinkIcon size={14} /> Copy contract link
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

// Fully completed requests (babysitter has signed): totals + downloadable
// parent and babysitter contract PDFs.
const CompletedSignedRequestsView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const { t: trans, language } = useLanguage();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        setIsLoading(true); setError(null);
        try {
            const result = await api.getCompletedSignedRequests();
            setRequests(result); setCurrentPage(1);
        } catch {
            setError('Failed to load. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    React.useEffect(() => { fetchData(); }, []);

    const filtered = requests.filter(req => {
        const name = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || req.id.toString().includes(q) || req.parent_address?.toLowerCase().includes(q);
    });
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalHours = filtered.reduce((s, r) => s + Number(r.total_hours || 0), 0);
    const totalRevenue = filtered.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    const eur = (n: number) => `${Number(n || 0).toFixed(2)} €`;

    const downloadParent = async (choiceId: number) => {
        setDownloading(`p-${choiceId}`);
        try {
            const data = await api.getContract(choiceId);
            await generateContractPdf(data, language, trans, choiceId);
        } catch {
            toast.error(language === 'fr' ? 'Échec du téléchargement.' : 'Download failed.');
        } finally { setDownloading(null); }
    };

    const downloadBabysitter = async (choiceId: number) => {
        setDownloading(`b-${choiceId}`);
        try {
            const data = await api.getBabysitterContract(choiceId);
            await generateBabysitterContractPdf(data, choiceId);
        } catch {
            toast.error(language === 'fr' ? 'Échec du téléchargement.' : 'Download failed.');
        } finally { setDownloading(null); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Completed Requests</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Filter requests..." value={searchQuery}
                            onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm" />
                    </div>
                    <button onClick={fetchData} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" title="Refresh">
                        <History size={18} />
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Completed</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{filtered.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total hours of care</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalHours.toFixed(2)} h</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total revenue generated</p>
                    <p className="text-2xl font-bold text-brand-accent mt-1">{eur(totalRevenue)}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[7%]">ID</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[24%]">Family</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[20%]">Babysitter</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[11%]">Hours</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">Revenue</th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[26%]">Contracts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (<tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400"><div className="flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={20} /><span className="text-sm font-medium">Loading…</span></div></td></tr>)}
                            {!isLoading && error && (<tr><td colSpan={6} className="px-6 py-12 text-center text-red-500"><div className="flex items-center justify-center gap-2"><AlertCircle size={18} /><span className="text-sm font-medium">{error}</span></div></td></tr>)}
                            {!isLoading && !error && filtered.length === 0 && (<tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">No completed requests yet.</td></tr>)}
                            {!isLoading && !error && paginated.map(req => {
                                const finalChoice = (req.choices ?? []).find((c: any) => Number(c.final_choice) === 1);
                                const choiceId = finalChoice?.id;
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                                <span className="text-xs text-slate-400">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            {finalChoice ? (
                                                <span className="font-semibold text-slate-700 text-sm">{finalChoice.babysitter_first_name} {finalChoice.babysitter_last_name}</span>
                                            ) : <span className="text-slate-400 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-4 align-top font-semibold text-slate-700">{Number(req.total_hours || 0).toFixed(2)} h</td>
                                        <td className="px-4 py-4 align-top font-bold text-brand-accent">{eur(req.total_revenue)}</td>
                                        <td className="px-4 py-4 text-right align-top">
                                            {choiceId && (
                                                <div className="inline-flex items-center gap-2">
                                                    <button onClick={() => downloadParent(choiceId)} disabled={downloading === `p-${choiceId}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-60">
                                                        {downloading === `p-${choiceId}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Parent
                                                    </button>
                                                    <button onClick={() => downloadBabysitter(choiceId)} disabled={downloading === `b-${choiceId}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-accent/10 text-brand-accent text-xs font-bold rounded-xl hover:bg-brand-accent hover:text-white transition-all disabled:opacity-60">
                                                        {downloading === `b-${choiceId}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Babysitter
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

const ActiveRequestsView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const { language } = useLanguage();
    const copyDetails = (req: any) => {
        navigator.clipboard.writeText(buildRequestDetailsText(req, language === 'fr'));
        toast.success(language === 'fr' ? 'Détails copiés !' : 'Details copied!');
    };
    const copyMatchLink = (req: any) => {
        navigator.clipboard.writeText(`${window.location.origin}/match/${req.id}`);
        toast.success(language === 'fr' ? 'Lien copié !' : 'Link copied!');
    };
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<KanbanRequest | null>(null);
    const [viewingSitterChoices, setViewingSitterChoices] = useState<{ choices: any[], reqId: number, parentName?: string, userLanguage?: string } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [proposingFor, setProposingFor] = useState<import('../services/api').ParentRequest | null>(null);

    const fetchActiveRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getMatchingRequests();
            setRequests(result);
            setCurrentPage(1); // Reset to first page on refresh
        } catch (err: any) {
            setError('Failed to load requests in matching. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchActiveRequests();
    }, []);

    const handleEdit = (req: import('../services/api').ParentRequest) => {
        setEditingRequest(transformToKanbanRequest(req));
    };

    const handleDeleteClick = (id: number) => {
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.removeParentRequest(requestToDelete);
            if (response.status) {
                toast.success('Request deleted successfully');
                setRequests(requests.filter(r => r.id !== requestToDelete));
                setIsDeleteModalOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete request');
            }
        } catch (err) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
        try {
            // Clean children payload
            const childrenPayload = (updatedFields.children || []).map((c: any) => ({
                id: c.id,
                child_dob: c.child_dob
            }));

            // Clean choices payload
            const choicesPayload = (updatedFields.choices || []).map((c: any) => ({
                choice_order: c.choice_order,
                bb_bs_id: c.bb_bs_id,
                babysitter_first_name: c.babysitter_first_name,
                babysitter_last_name: c.babysitter_last_name,
                babysitter_email: c.babysitter_email,
                babysitter_phone: c.babysitter_phone,
                babysitter_address: c.babysitter_address,
                interview_date: c.interview_date,
                interview_time: c.interview_time
            }));

            // Clean schedules payload
            const schedulesPayload = (updatedFields.schedules || []).map((s: any) => ({
                schedule_date: s.schedule_date,
                slots: (s.slots || []).map((slot: any) => ({
                    start_time: slot.start_time,
                    end_time: slot.end_time
                }))
            }));

            const response = await api.updateParentRequest(reqId, {
                first_name: updatedFields.user?.first_name || '',
                last_name: updatedFields.user?.last_name || '',
                parent_address: updatedFields.parent_address || '',
                email: updatedFields.email || '',
                children: childrenPayload,
                choices: choicesPayload,
                schedules: schedulesPayload,
                hourly_rate: updatedFields.hourly_rate,
                user_language: updatedFields.user?.user_language,
                _method: 'put'
            } as any);

            if (response.status && response.data) {
                toast.success('Request updated successfully');
                setRequests(prev => prev.map(r => r.id === reqId ? response.data! : r));
                setEditingRequest(null);
            } else {
                toast.error(response.message || 'Update failed');
            }
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const filteredRequests = requests.filter(req => {
        const parentName = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return parentName.includes(searchLower) ||
            req.id.toString().includes(searchLower) ||
            req.parent_address?.toLowerCase().includes(searchLower);
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Requests in Matching List</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter active requests..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={fetchActiveRequests}
                        className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <History size={18} />
                    </button>
                </div>
            </div>

            <div className="space-y-4 min-h-[400px]">
                {isLoading && (
                    <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="text-sm font-medium">Loading requests in matching...</span>
                    </div>
                )}
                {!isLoading && error && (
                    <div className="flex items-center justify-center gap-2 py-16 text-red-500">
                        <AlertCircle size={18} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}
                {!isLoading && !error && filteredRequests.length === 0 && (
                    <div className="py-16 text-center text-slate-400 text-sm font-medium">No requests in matching.</div>
                )}

                {!isLoading && !error && paginatedRequests.map((req) => {
                    const choices = req.choices ?? [];
                    const selectedCount = choices.filter((c: any) => c.status === 'selected').length;
                    const hasChoices = choices.length > 0;
                    const statusBadge = !hasChoices
                        ? <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Awaiting proposal</span>
                        : selectedCount > 0
                            ? <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">{selectedCount} selected by family</span>
                            : <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Proposed — awaiting family</span>;
                    return (
                        <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                            {/* Header */}
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span className="text-sm font-bold text-slate-400">#{req.id}</span>
                                        <span className="text-lg font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                        {statusBadge}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{req.user?.email}</p>
                                    <div className="flex items-start gap-1.5 mt-1 text-xs text-slate-500">
                                        <MapPin size={12} className="mt-0.5 shrink-0" />
                                        <span className="leading-tight">{req.parent_address}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5">Quote validated: {formatDateDMY(req.created_at)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => copyDetails(req)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                                        title="Copy request details to share with babysitters"
                                    >
                                        <ClipboardList size={14} /> Copy details
                                    </button>
                                    {hasChoices && (
                                        <button
                                            onClick={() => copyMatchLink(req)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                                            title="Copy the candidate-selection link sent to the family"
                                        >
                                            <LinkIcon size={14} /> Copy link
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setProposingFor(req)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent text-white text-xs font-bold rounded-xl hover:bg-[#66B2AC] transition-all shadow-sm shadow-brand-accent/20"
                                    >
                                        <Users size={14} /> {hasChoices ? 'Re-propose' : 'Propose candidates'}
                                    </button>
                                </div>
                            </div>

                            {/* Inline candidates & interviews */}
                            {hasChoices && (
                                <div className="mt-5 pt-5 border-t border-slate-100">
                                    <MatchPicksContent request={req} onUpdated={fetchActiveRequests} />
                                </div>
                            )}
                        </div>
                    );
                })}

                <Pagination
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <AnimatePresence>
                {proposingFor && (
                    <ProposeCandidatesModal
                        request={proposingFor}
                        onClose={() => setProposingFor(null)}
                        onProposed={fetchActiveRequests}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewingSitterChoices && (
                    <SitterChoicesModal
                        requestId={viewingSitterChoices.reqId}
                        choices={viewingSitterChoices.choices}
                        parentName={viewingSitterChoices.parentName}
                        userLanguage={viewingSitterChoices.userLanguage}
                        onClose={() => setViewingSitterChoices(null)}
                        onRefresh={fetchActiveRequests}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingRequest && (
                    <RequestDetailsModal
                        request={editingRequest}
                        onClose={() => setEditingRequest(null)}
                        onUpdate={(updatedFields) => handleUpdate(editingRequest.id, updatedFields)}
                        showOnlySitters={true}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRequestToDelete(null);
                        }}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title="Delete Request"
                        message="Are you sure you want to delete this active request? This action cannot be undone."
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

const SignedContractsView = ({ onViewInvoices, searchQuery, onSearchChange }: { onViewInvoices?: (userId: number) => void; searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<KanbanRequest | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (req: import('../services/api').ParentRequest) => {
        setEditingRequest(transformToKanbanRequest(req));
    };

    const handleDeleteClick = (id: number) => {
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.removeParentRequest(requestToDelete);
            if (response.status) {
                toast.success('Request deleted successfully');
                setRequests(requests.filter(r => r.id !== requestToDelete));
                setIsDeleteModalOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete request');
            }
        } catch (err) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
        try {
            const response = await api.updateParentRequest(reqId, {
                first_name: updatedFields.user?.first_name || '',
                last_name: updatedFields.user?.last_name || '',
                parent_address: updatedFields.parent_address || '',
                email: updatedFields.email || '',
                children: (updatedFields.children || []).map((c: any) => ({ id: c.id, child_dob: c.child_dob })),
                choices: (updatedFields.choices || []).map((c: any) => ({
                    choice_order: c.choice_order,
                    bb_bs_id: c.user_id,
                    babysitter_first_name: c.babysitter_first_name,
                    babysitter_last_name: c.babysitter_last_name,
                    interview_date: c.interview_date,
                    interview_time: c.interview_time
                })),
                schedules: (updatedFields.schedules || []).map((s: any) => ({
                    schedule_date: s.schedule_date,
                    slots: (s.slots || []).map((slot: any) => ({ start_time: slot.start_time, end_time: slot.end_time }))
                })),
                hourly_rate: updatedFields.hourly_rate,
                user_language: updatedFields.user?.user_language,
                _method: 'put'
            } as any);

            if (response.status && response.data) {
                toast.success('Request updated successfully');
                setRequests(prev => prev.map(r => r.id === reqId ? response.data! : r));
                setEditingRequest(null);
            } else {
                toast.error(response.message || 'Update failed');
            }
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const fetchSignedContracts = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getSignedContractRequests();
            setRequests(result);
            setCurrentPage(1);
        } catch (err: any) {
            setError('Failed to load signed contracts. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSignedContracts();
    }, []);

    const filteredRequests = requests.filter(req => {
        const parentName = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const hiredSitter = req.choices?.find(c => Number(c.final_choice) === 1);
        const sitterName = hiredSitter ? `${hiredSitter.babysitter_first_name} ${hiredSitter.babysitter_last_name}`.toLowerCase() : '';
        const searchLower = searchQuery.toLowerCase();
        return parentName.includes(searchLower) ||
            sitterName.includes(searchLower) ||
            req.id.toString().includes(searchLower);
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Signed Contracts List</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[29%]">Parent Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[29%]">Hired Babysitter</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Created At</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[19%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span className="text-sm font-medium">Loading signed contracts...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && error && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <AlertCircle size={18} />
                                            <span className="text-sm font-medium">{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No signed contracts found.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && paginatedRequests.map((req) => {
                                const hiredSitter = req.choices?.find(c => Number(c.final_choice) === 1);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{req.user?.first_name} {req.user?.last_name}</span>
                                                <span className="text-xs text-slate-400">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            {hiredSitter ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{hiredSitter.babysitter_first_name} {hiredSitter.babysitter_last_name}</span>
                                                    <span className="text-xs text-slate-400">{hiredSitter.babysitter_email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-sm">Not assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 align-top">
                                            {formatDateDMY(req.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onViewInvoices?.(req.user_id)}
                                                    className="group/btn relative flex items-center justify-center p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm shadow-slate-200 ml-2"
                                                    title="View Invoices"
                                                >
                                                    <Receipt size={18} />
                                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg shadow-xl opacity-0 hover:invisible group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                                                        View Invoices
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <AnimatePresence>
                {editingRequest && (
                    <RequestDetailsModal
                        request={editingRequest}
                        onClose={() => setEditingRequest(null)}
                        onUpdate={(updatedFields) => handleUpdate(editingRequest.id, updatedFields)}
                        showOnlySitters={true}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRequestToDelete(null);
                        }}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title="Delete Request"
                        message="Are you sure you want to delete this content? This action cannot be undone."
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const RequestsView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
    const [requests, setRequests] = useState<import('../services/api').ParentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRequest, setEditingRequest] = useState<KanbanRequest | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.getParentRequests();
            setRequests(result.data);
            setCurrentPage(1);
        } catch {
            setError('Failed to load requests. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleEdit = (req: import('../services/api').ParentRequest) => {
        setEditingRequest(transformToKanbanRequest(req));
    };

    const handleDeleteClick = (id: number) => {
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.removeParentRequest(requestToDelete);
            if (response.status) {
                toast.success('Request deleted successfully');
                setRequests(requests.filter(r => r.id !== requestToDelete));
                setIsDeleteModalOpen(false);
                setRequestToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete request');
            }
        } catch (err) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async (reqId: number, updatedFields: Partial<KanbanRequest>) => {
        try {
            const response = await api.updateParentRequest(reqId, {
                first_name: updatedFields.user?.first_name || '',
                last_name: updatedFields.user?.last_name || '',
                parent_address: updatedFields.parent_address || '',
                email: updatedFields.email || '',
                children: (updatedFields.children || []).map((c: any) => ({ id: c.id, child_dob: c.child_dob })),
                choices: (updatedFields.choices || []).map((c: any) => ({
                    choice_order: c.choice_order,
                    bb_bs_id: c.bb_bs_id,
                    babysitter_first_name: c.babysitter_first_name,
                    babysitter_last_name: c.babysitter_last_name,
                    interview_date: c.interview_date,
                    interview_time: c.interview_time
                })),
                schedules: (updatedFields.schedules || []).map((s: any) => ({
                    schedule_date: s.schedule_date,
                    slots: (s.slots || []).map((slot: any) => ({ start_time: slot.start_time, end_time: slot.end_time }))
                })),
                hourly_rate: updatedFields.hourly_rate,
                user_language: updatedFields.user?.user_language,
                bb_bs_id: updatedFields.bb_bs_id,
                _method: 'put'
            } as any);

            if (response.status && response.data) {
                toast.success('Request updated successfully');
                setRequests(prev => prev.map(r => r.id === reqId ? response.data! : r));
                setEditingRequest(null);
            } else {
                toast.error(response.message || 'Update failed');
            }
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const filteredRequests = requests.filter(req => {
        const parentName = `${req.user?.first_name} ${req.user?.last_name}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return parentName.includes(searchLower) || req.id.toString().includes(searchLower);
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Filter requests..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        <Filter size={18} />
                    </button>
                    <button
                        onClick={fetchRequests}
                        className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <History size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center shadow-sm">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <TableIcon size={14} />
                            Table View
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <LayoutGrid size={14} />
                            Kanban View
                        </button>
                    </div>

                    <button className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                        Export CSV
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'table' ? (
                    <motion.div
                        key="table"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                    >
                        <div className="overflow-x-auto min-h-[500px]">
                            <table className="w-full text-left table-fixed min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[25%]">Family Name</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Children</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[37%]">Dates</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right w-[15%]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {isLoading && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex items-center justify-center gap-3 text-slate-400">
                                                    <Loader2 className="animate-spin w-5 h-5" />
                                                    <span className="text-sm font-medium">Loading requests…</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {!isLoading && error && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex items-center justify-center gap-2 text-red-500">
                                                    <AlertCircle size={18} />
                                                    <span className="text-sm font-medium">{error}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {!isLoading && !error && filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                                No requests found.
                                            </td>
                                        </tr>
                                    )}
                                    {!isLoading && !error && paginatedRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 align-top">#{req.id}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 align-top">
                                                {req.user?.first_name} {req.user?.last_name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 align-top">
                                                {req.children?.length}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 align-top">
                                                <ScheduleDatesCell schedules={req.schedules ?? []} />
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(req)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(req.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            totalItems={filteredRequests.length}
                            itemsPerPage={itemsPerPage}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="kanban"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <KanbanBoard initialRequests={requests} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingRequest && (
                    <RequestDetailsModal
                        request={editingRequest}
                        onClose={() => setEditingRequest(null)}
                        onUpdate={(updatedFields) => handleUpdate(editingRequest.id, updatedFields)}
                    />
                )}
                {isDeleteModalOpen && (
                    <DeleteConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setRequestToDelete(null);
                        }}
                        onConfirm={confirmDelete}
                        isLoading={isDeleting}
                        title="Delete Request"
                        message="Are you sure you want to delete this new request? This action cannot be undone."
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Helper: Schedule Dates Cell ---

interface ScheduleDatesCellProps {
    schedules: import('../services/api').Schedule[];
}

const MAX_VISIBLE_DATES = 4;

const ActiveRequestSchedulesCell: React.FC<{ schedules: any[] }> = ({ schedules }) => {
    const [tooltipOpen, setTooltipOpen] = useState(false);
    if (!schedules || schedules.length === 0) return <span className="text-slate-400 text-sm italic">No schedules</span>;

    const visibleSchedules = schedules.slice(0, 2);
    const hiddenSchedules = schedules.slice(2);

    return (
        <div className="flex flex-wrap gap-2 max-w-[400px]">
            {visibleSchedules.map((sch) => (
                <div key={sch.id} className="flex items-center gap-1.5 p-1.5 px-2 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-white transition-all shadow-sm">
                    <div className="flex items-center gap-1 shrink-0">
                        <Calendar size={11} className="text-brand-accent/70" />
                        <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">{sch.schedule_date}</span>
                    </div>
                    {sch.slots && sch.slots.length > 0 && (
                        <>
                            <div className="w-px h-3 bg-slate-200" />
                            <div className="flex items-center gap-1">
                                <Clock size={10} className="text-slate-400" />
                                <span className="text-[9px] font-medium text-slate-500 whitespace-nowrap">
                                    {sch.slots.map((slot: any) => `${slot.start_time?.substring(0, 5)}-${slot.end_time?.substring(0, 5)}`).join(', ')}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            ))}
            {hiddenSchedules.length > 0 && (
                <div className="relative">
                    <button
                        onMouseEnter={() => setTooltipOpen(true)}
                        onMouseLeave={() => setTooltipOpen(false)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-slate-200 transition-colors h-full whitespace-nowrap"
                    >
                        <History size={10} />
                        <span>+{hiddenSchedules.length} more</span>
                    </button>
                    {tooltipOpen && (
                        <div className="absolute z-[100] top-full left-1/2 -translate-x-1/2 mt-3 bg-white border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-2xl p-4 min-w-[300px] animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Remaining Schedules
                                </span>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {hiddenSchedules.length} dates
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {hiddenSchedules.map((sch) => (
                                    <div key={sch.id} className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} className="text-brand-accent/70" />
                                            <span className="text-[11px] font-bold text-slate-700">{sch.schedule_date}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 ml-5">
                                            {sch.slots?.map((slot: any) => (
                                                <div key={slot.id} className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-500">
                                                    <Clock size={10} className="text-slate-400" />
                                                    <span>{slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Pointer Arrow pointing UP */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[2px] rotate-180">
                                <div className="border-[6px] border-transparent border-t-white relative z-10" />
                                <div className="border-[7px] border-transparent border-t-slate-200 -mt-[14px]" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ScheduleDatesCell: React.FC<ScheduleDatesCellProps> = ({ schedules }) => {
    const [tooltipOpen, setTooltipOpen] = useState(false);

    if (schedules.length === 0) {
        return <span className="text-slate-400 text-sm italic">No dates</span>;
    }

    const dates = schedules.map((s) => s.schedule_date);
    const visibleDates = dates.slice(0, MAX_VISIBLE_DATES);
    const hiddenDates = dates.slice(MAX_VISIBLE_DATES);

    return (
        <span className="flex items-center flex-wrap gap-x-1 gap-y-0.5">
            <span>{visibleDates.join(', ')}</span>
            {hiddenDates.length > 0 && (
                <span className="relative inline-block">
                    <button
                        onMouseEnter={() => setTooltipOpen(true)}
                        onMouseLeave={() => setTooltipOpen(false)}
                        onClick={() => setTooltipOpen((v) => !v)}
                        className="ml-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap"
                        aria-label={`Show ${hiddenDates.length} more dates`}
                    >
                        +{hiddenDates.length} more
                    </button>
                    {tooltipOpen && (
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs font-medium rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                            {hiddenDates.join(', ')}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </div>
                    )}
                </span>
            )}
        </span>
    );
};



const InterviewsView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const allInterviews = [
        { id: '1', family: 'Smith Family', sitter: 'Amélie Laurent', date: '15/03/2026', status: 'Scheduled' },
        { id: '2', family: 'Dupont Family', sitter: 'Thomas Dubois', date: '16/03/2026', status: 'Completed' },
        { id: '3', family: 'Miller Family', sitter: 'Chloé Mercier', date: '18/03/2026', status: 'Cancelled' },
        { id: '4', family: 'Garcia Family', sitter: 'Lucas Martin', date: '20/03/2026', status: 'Scheduled' },
        { id: '5', family: 'Lefevre Family', sitter: 'Manon Petit', date: '22/03/2026', status: 'Completed' },
        { id: '6', family: 'Dubois Family', sitter: 'Arthur Bernard', date: '25/03/2026', status: 'Scheduled' },
        { id: '7', family: 'Moreau Family', sitter: 'Emma Robert', date: '28/03/2026', status: 'Cancelled' },
        { id: '8', family: 'Fournier Family', sitter: 'Jules Richard', date: '01/04/2026', status: 'Scheduled' },
        { id: '9', family: 'Roux Family', sitter: 'Alice Durand', date: '03/04/2026', status: 'Completed' },
        { id: '10', family: 'Lambert Family', sitter: 'Gabriel Leroy', date: '05/04/2026', status: 'Scheduled' },
        { id: '11', family: 'Petit Family', sitter: 'Louise Morel', date: '07/04/2026', status: 'Scheduled' },
        { id: '12', family: 'Thomas Family', sitter: 'Hugo Fournier', date: '09/04/2026', status: 'Completed' },
    ];

    const filteredInterviews = allInterviews.filter(item =>
        item.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sitter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const paginatedInterviews = filteredInterviews.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">Interviews List</h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Filter interviews..."
                        value={searchQuery}
                        onChange={(e) => {
                            onSearchChange(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                    />
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left table-fixed min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[8%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[22%]">Family</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[22%]">Babysitter</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[18%]">Interview Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {paginatedInterviews.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No interviews found.
                                    </td>
                                </tr>
                            )}
                            {paginatedInterviews.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 align-top">{item.family}</td>
                                    <td className="px-6 py-4 text-slate-600 align-top">{item.sitter}</td>
                                    <td className="px-6 py-4 text-slate-600 align-top">{formatDateDMY(item.date)}</td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                            item.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                            <Edit2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredInterviews.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

const InvoicesView = ({ userId, onClearUserFilter, searchQuery, onSearchChange }: { userId: number | null; onClearUserFilter: () => void; searchQuery: string; onSearchChange: (val: string) => void }) => {
    const { formatCurrency } = useLanguage();
    const [invoices, setInvoices] = useState<import('../services/api').Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    React.useEffect(() => {
        let cancelled = false;
        const fetchInvoices = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { api } = await import('../services/api');
                const result = await api.getAllInvoices({
                    month: selectedMonth,
                    year: selectedYear,
                    user_id: userId || undefined
                });

                if (!cancelled) {
                    setInvoices(result.data);
                    setCurrentPage(1);
                }
            } catch {
                if (!cancelled) {
                    setError('Failed to load invoices. Please try again.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        fetchInvoices();
        return () => { cancelled = true; };
    }, [selectedMonth, selectedYear, userId]);

    const formatBillingMonth = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
        } catch {
            return dateStr;
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const customerName = inv.user ? `${inv.user.first_name || ''} ${inv.user.last_name || ''}`.toLowerCase() : '';
        const searchLower = searchQuery.toLowerCase();
        return customerName.includes(searchLower) ||
            inv.invoice_num.toLowerCase().includes(searchLower) ||
            inv.parent_request_id.toString().includes(searchLower);
    });

    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                        >
                            {[2023, 2024, 2025, 2026, 2027, 2028].map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                value={searchQuery}
                                onChange={(e) => {
                                    onSearchChange(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {userId && (
                        <button
                            onClick={onClearUserFilter}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors"
                        >
                            Show All Invoices
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Invoice ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[25%]">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Due Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Billing Month</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[13%]">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {isLoading && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-3 text-slate-400">
                                            <Loader2 className="animate-spin w-5 h-5" />
                                            <span className="text-sm font-medium">Loading invoices…</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!isLoading && error && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-red-500 text-sm font-medium">
                                        {error}
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                                        No invoices found.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !error && paginatedInvoices.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 align-top">{item.invoice_num}</td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">
                                                {item.user ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || `User #${item.user_id}` : `User #${item.user_id}`}
                                            </span>
                                            <span className="text-[10px] text-slate-400">Request #{item.parent_request_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 align-top">{item.due_date}</td>
                                    <td className="px-6 py-4 text-slate-600 capitalize align-top">{formatBillingMonth(item.due_date)}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900 align-top">{formatCurrency(parseFloat(item.amount))}</td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                            item.payment_status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {item.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <button
                                            onClick={async () => {
                                                const { generateInvoicePdf } = await import('../utils/invoicePdfGenerator');
                                                const pdfUser = item.user || { first_name: 'Customer', last_name: `(#${item.user_id})`, email: '-', user_address: '-' } as any;
                                                generateInvoicePdf(item, pdfUser, 'fr', {} as any);
                                            }}
                                            className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-xl transition-colors inline-flex items-center gap-2 text-xs font-bold"
                                        >
                                            <Download size={14} />
                                            <span className="hidden xl:inline">Download PDF</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredInvoices.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

const ContractsView = ({ onViewContract, searchQuery, onSearchChange }: { onViewContract: (id: number) => void; searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const data = await api.getContracts();
                setContracts(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching contracts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContracts();
    }, []);

    const filteredContracts = contracts.filter(contract => {
        const userName = `${contract.user?.first_name || ''} ${contract.user?.last_name || ''}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return userName.includes(searchLower) ||
            contract.id.toString().includes(searchLower);
    });

    const paginatedContracts = filteredContracts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search contracts..."
                        value={searchQuery}
                        onChange={(e) => {
                            onSearchChange(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Contract ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[25%]">User Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[20%]">Contract Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[18%]">Hourly Rate</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading && (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-16" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-12" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 rounded-xl w-24 ml-auto" /></td>
                                    </tr>
                                ))
                            )}
                            {!loading && filteredContracts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No contracts found.
                                    </td>
                                </tr>
                            )}
                            {!loading && paginatedContracts.map((contract) => (
                                <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-black text-slate-900 align-top">#{contract.id}</td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <UserIcon size={14} />
                                            </div>
                                            <span className="font-bold text-slate-800">
                                                {contract.user?.first_name} {contract.user?.last_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium text-sm align-top">
                                        {formatDate(contract.created_at ?? contract.date ?? '')}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${contract.status === 1
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {contract.status === 1 ? 'Signed' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 align-top">
                                        {contract.hourly_rate ? `${contract.hourly_rate}€/hr` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <button
                                            onClick={() => onViewContract(contract.choice_id)}
                                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                            title="View Contract"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredContracts.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

const AttestationsView = ({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [attestations, setAttestations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchAttestations = async () => {
            try {
                const result = await api.getAttestations();
                setAttestations(result.data || []);
            } catch (error) {
                console.error("Error fetching attestations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttestations();
    }, []);

    const handleDownload = (fileName: string) => {
        const link = document.createElement('a');
        link.href = `/certificates/${fileName}`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    };

    const filteredAttestations = attestations.filter(a => {
        const userName = `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return userName.includes(searchLower) ||
            a.id.toString().includes(searchLower) ||
            a.year.toString().includes(searchLower);
    });

    const paginatedAttestations = filteredAttestations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search attestations..."
                        value={searchQuery}
                        onChange={(e) => {
                            onSearchChange(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none w-64 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[40%]">User Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Year</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[20%]">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading && (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-8" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 rounded-xl w-24 ml-auto" /></td>
                                    </tr>
                                ))
                            )}
                            {!loading && filteredAttestations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No attestations found.
                                    </td>
                                </tr>
                            )}
                            {!loading && paginatedAttestations.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-black text-slate-900 align-top">#{a.id}</td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <UserIcon size={14} />
                                            </div>
                                            <span className="font-bold text-slate-800">
                                                {a.user?.first_name} {a.user?.last_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium text-sm align-top">
                                        {a.year}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium text-sm align-top">
                                        {formatDate(a.created_at ?? a.date ?? '')}
                                    </td>
                                    <td className="px-6 py-4 text-right align-top">
                                        <button
                                            onClick={() => handleDownload(a.file)}
                                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                            title="Download Attestation"
                                        >
                                            <Download size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredAttestations.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};


const UsersView = ({ onViewUser, searchQuery, onSearchChange }: { onViewUser: (id: number) => void; searchQuery: string; onSearchChange: (val: string) => void }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await api.getAllUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        const id = userToDelete.id;
        setIsDeleting(id);
        try {
            const response = await api.deleteUser(id);
            if (response.status) {
                setUsers(users.filter(u => u.id !== id));
                toast.success(response.message || 'User deleted successfully');
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
            } else {
                toast.error(response.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error('An error occurred while deleting the user');
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredUsers = users.filter(user =>
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search parents..."
                            value={searchQuery}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none w-64 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                        />
                    </div>
                    <div className="text-sm text-slate-400 font-medium">
                        {filteredUsers.length} Parents Total
                    </div>
                </div>
                <div className="overflow-x-auto min-h-[580px]">
                    <table className="w-full text-left table-fixed min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[20%]">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[20%]">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[12%]">SMG Num</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Requests</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[13%]">Phone</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Address</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-12" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 rounded-xl w-24 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <UserIcon size={14} />
                                                </div>
                                                <span className="font-bold text-slate-800">{user.first_name || ''} {user.last_name || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium text-sm align-top">{user.email || 'N/A'}</td>
                                        <td className="px-6 py-4 text-slate-600 font-medium text-sm align-top">{user.cmg_num || 'N/A'}</td>
                                        <td className="px-6 py-4 align-top">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                                {user.parent_requests_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium text-sm align-top">{user.user_phone || 'N/A'}</td>
                                        <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate align-top">{user.user_address || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => onViewUser(user.id)}
                                                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                                                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    disabled={isDeleting === user.id}
                                                    className={`p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all ${isDeleting === user.id ? 'animate-pulse' : ''}`}
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    totalItems={filteredUsers.length}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {isEditModalOpen && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                    onUpdate={() => { fetchUsers(); setIsEditModalOpen(false); setSelectedUser(null); }}
                />
            )}

            {isDeleteModalOpen && userToDelete && (
                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => { setIsDeleteModalOpen(false); setUserToDelete(null); }}
                    onConfirm={confirmDelete}
                    isLoading={isDeleting === userToDelete.id}
                    title="Delete User"
                    message={`Are you sure you want to delete ${userToDelete.first_name || ''} ${userToDelete.last_name || ''}? This action cannot be undone.`}
                />
            )}
        </div>
    );
};

const UserDetailsView = ({ id, onBack }: { id: number; onBack: () => void }) => {
    const [user, setUser] = useState<User & { parent_requests: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await api.getUserDetails(id);
                setUser(data);
            } catch (error) {
                console.error("Error fetching user details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="h-48 bg-white rounded-3xl border border-slate-100 shadow-sm" />
                <div className="h-96 bg-white rounded-3xl border border-slate-100 shadow-sm" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Back Button & Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-all group"
                >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ChevronLeft size={18} />
                    </div>
                    Back to Users
                </button>
            </div>

            {/* User Info Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                            <UserIcon size={40} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-1">{user?.first_name} {user?.last_name}</h2>
                            <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                                <span className="flex items-center gap-1.5"><Mail size={14} /> {user?.email || 'N/A'}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="flex items-center gap-1.5"><Phone size={14} /> {user?.user_phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Address</label>
                        <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <MapPin size={18} className="text-slate-400 mt-0.5" />
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">{user?.user_address || 'Not Provided'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">CMG Identification</label>
                        <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 group">
                            <Shield size={18} className="text-emerald-500" />
                            <div>
                                <p className="text-[10px] font-bold text-emerald-600/60 uppercase">CMG</p>
                                <p className="text-lg font-black text-emerald-600 tracking-wider">
                                    {user?.cmg_num || 'PENDING'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Stats</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Requests</p>
                                <p className="text-xl font-black text-slate-900">{user?.parent_requests?.length || 0}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Role</p>
                                <p className="text-xl font-black text-slate-900">Parent</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList size={20} className="text-slate-400" /> Parent Requests
                    </h3>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left table-fixed min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[10%]">ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Rate</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[30%]">Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Children</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-[15%]">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {user?.parent_requests?.map((req: any) => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-black text-slate-900 align-top">#{req.id}</td>
                                    <td className="px-6 py-4 align-top">
                                        <StatusBadge status={req.request_current_status || req.board_status} />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700 align-top">{req.hourly_rate}€/hr</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate align-top">{req.parent_address}</td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center gap-1.5">
                                            <Baby size={14} className="text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700">{req.children?.length || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400 font-medium align-top">
                                        {formatDate(req.created_at ?? req.createdAt ?? '')}
                                    </td>
                                </tr>
                            ))}
                            {(!user?.parent_requests || user.parent_requests.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No requests found for this user.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ContractDetailView = ({ choiceId, onBack }: { choiceId: number; onBack: () => void }) => {
    const { t: trans, language, formatNumber, formatCurrency } = useLanguage();
    const t = trans.contract;
    const [contractData, setContractData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContract = async () => {
            try {
                setLoading(true);
                const data = await api.getContract(choiceId);
                setContractData(data);
            } catch (err) {
                console.error("Failed to fetch contract:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [choiceId]);

    const calculateHoursFromSlot = (slot: string): number => {
        try {
            const separator = slot.includes(' : ') ? ' : ' : ' - ';
            const [start, end] = slot.split(separator).map(s => s.trim());
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            const startDecimal = startH + (startM / 60);
            const endDecimal = endH + (endM / 60);
            return Math.max(0, endDecimal - startDecimal);
        } catch (e) {
            return 0;
        }
    };

    const getMonthlyHours = (monthDates: Record<string, string[]>): number => {
        let total = 0;
        Object.values(monthDates).forEach(slots => {
            (slots as string[]).forEach(slot => {
                total += calculateHoursFromSlot(slot);
            });
        });
        return total;
    };

    const formatMonthString = (monthStr: string) => {
        try {
            const [monthName, year] = monthStr.split(' ');
            const date = new Date(Date.parse(`${monthName} 1, ${year}`));
            if (isNaN(date.getTime())) return monthStr;
            return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
        } catch {
            return monthStr;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-bold">Loading contract details...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <ChevronLeft size={18} />
                </div>
                Back to Contracts
            </button>

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 md:p-12 relative overflow-hidden max-w-4xl mx-auto">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-900/10 rounded-2xl flex items-center justify-center text-slate-900">
                                <FileText size={28} />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                {t.title}
                            </h1>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ID</p>
                            <p className="text-sm font-bold text-slate-700">#CTR-{choiceId}-{contractData?.contract_id}</p>
                        </div>
                    </div>

                    <div className="space-y-10 text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto pr-4 custom-scroll">
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">{t.between}</h2>
                            <p className="mb-6">{t.agency}</p>
                            <p className="font-bold text-slate-900 text-[10px] uppercase tracking-wider mb-2">{t.part1}</p>
                            <p className="font-bold text-slate-900 text-[10px] uppercase tracking-wider mb-2">{t.part2}</p>
                            <div className="mb-4">
                                <p>
                                    <strong className="text-slate-900">{contractData?.user?.first_name} {contractData?.user?.last_name}</strong>
                                    {contractData?.user?.user_address && (
                                        <span className="mx-1">{t.domiciledAt} {contractData.user.user_address}</span>
                                    )}
                                    {contractData?.user?.user_phone && (
                                        <span className="mx-1">{t.reachableAt} {contractData.user.user_phone}</span>
                                    )}
                                    {contractData?.user?.email && (
                                        <span className="mx-1">{language === 'fr' ? 'et' : 'and'} {contractData.user.email}</span>
                                    )}
                                </p>
                            </div>
                            <p className="italic text-slate-500 text-sm mb-4">{t.clientDesignation}</p>
                            <p className="font-bold text-slate-900 text-[10px] uppercase tracking-wider">{t.partOther}</p>
                        </section>

                        <p className="py-4 border-y border-slate-50 text-center font-medium text-slate-400 italic text-sm">
                            {t.agreedFollowing}
                        </p>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 text-sm">1</span>
                                {t.article1.title}
                            </h3>
                            <p className="mb-6">{t.article1.content}</p>

                            <div className="space-y-4 mb-6">
                                {contractData?.format1 && Object.entries(contractData.format1 as Record<string, any>).map(([month, dates]) => {
                                    const monthlyHours = getMonthlyHours(dates);
                                    const formattedMonth = formatMonthString(month);
                                    return (
                                        <div key={month} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <h4 className="text-slate-900 font-bold text-xs uppercase tracking-widest mb-4">{formattedMonth}</h4>
                                            <div className="space-y-2 mb-4">
                                                {Object.entries(dates as Record<string, string[]>).map(([date, slots]) => (
                                                    <div key={date} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                                        <span className="text-sm capitalize">{new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                        <span className="text-sm font-bold text-slate-900">{(slots as string[]).join(' - ')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="text-right text-xs font-bold text-slate-400 border-t border-slate-100 pt-4">
                                                {t.article1.totalMonth.replace('{month}', formattedMonth)} <span className="text-slate-900 ml-1 font-bold text-sm">{formatNumber(monthlyHours, 2)} h</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-5 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-lg">
                                <span className="font-bold text-sm">{t.article1.totalPeriod}</span>
                                <span className="text-xl font-bold">
                                    {contractData ? formatNumber(Object.values(contractData.format1 as Record<string, any>).reduce((total: number, monthDates) => total + getMonthlyHours(monthDates), 0), 2) : '0,00'} h
                                </span>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 text-sm">2</span>
                                {t.article2.title}
                            </h3>
                            <p className="text-sm leading-relaxed">{t.article2.content}</p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 text-sm">3</span>
                                {t.article3.title}
                            </h3>
                            <p className="mb-6">
                                {t.article3.content
                                    .replace('{start}', contractData?.start_date ? new Date(contractData.start_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Date]')
                                    .replace('{end}', contractData?.end_date ? new Date(contractData.end_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Date]')
                                }
                            </p>
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article3.subTitle}</h4>
                                <p className="text-xs text-slate-500 italic">{t.article3.subContent}</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 text-sm">4</span>
                                {t.article4.title}
                            </h3>
                            <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article4.subTitle41}</h4>
                            <p className="mb-4">{t.article4.content}</p>

                            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-inner bg-slate-50 mb-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">{t.article4.period}</th>
                                            <th className="px-6 py-4">{t.article4.hrTotal}</th>
                                            <th className="px-6 py-4">{t.article4.amountTtc}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {contractData?.format2 && Object.entries(contractData.format2 as Record<string, number>).map(([month, amount]) => (
                                            <tr key={month}>
                                                <td className="px-6 py-4 font-bold text-slate-700 capitalize">{formatMonthString(month)}</td>
                                                <td className="px-6 py-4 text-slate-500">{formatNumber(getMonthlyHours(contractData.format1[month]), 2)}h</td>
                                                <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-900 text-white">
                                        <tr>
                                            <td className="px-6 py-4 font-bold">{t.article4.hourlyRate}</td>
                                            <td colSpan={2} className="px-6 py-4 text-right font-bold text-lg">
                                                {contractData?.hourly_rate ? formatCurrency(contractData.hourly_rate) + '/h' : '-- €/h'}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article4.subTitle42}</h4>
                                    <p className="text-xs text-slate-500 italic leading-relaxed">{t.article4.content42}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article4.subTitle43}</h4>
                                    <p className="text-xs text-slate-500 italic leading-relaxed">{t.article4.content43}</p>
                                </div>
                            </div>
                        </section>

                        {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((num) => {
                            const art = (t as any)[`article${num}`];
                            if (!art) return null;
                            return (
                                <section key={num}>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 text-sm">{num}</span>
                                        {art.title}
                                    </h3>
                                    <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                                        {num === 6 && (
                                            <><p>{art.content1}</p><p>{art.content2}</p><p>{art.content3}</p></>
                                        )}
                                        {num === 9 && (
                                            <><p>{art.content1}</p><p>{art.content2}</p><p>{art.content3}</p><p>{art.content4}</p></>
                                        )}
                                        {num === 11 && (
                                            <>
                                                <p>{art.content}</p>
                                                <ul className="list-disc pl-5 space-y-2">
                                                    <li>{art.item1}</li><li>{art.item2}</li><li>{art.item3}</li>
                                                </ul>
                                            </>
                                        )}
                                        {num === 13 && (
                                            <><p>{art.content1}</p><p>{art.content2}</p><p>{art.content3}</p></>
                                        )}
                                        {num === 14 && (
                                            <>
                                                <p>{art.content1}</p><p>{art.content2}</p><p>{art.content3}</p>
                                                <p>{art.content4}</p><p>{art.content5}</p>
                                                <p className="italic font-medium">{art.content6}</p>
                                            </>
                                        )}
                                        {num === 15 && (
                                            <div className="space-y-4">
                                                <div><h4 className="font-bold text-slate-700 text-sm mb-1">{art.subTitle151}</h4><p>{art.content151}</p></div>
                                                <div><h4 className="font-bold text-slate-700 text-sm mb-1">{art.subTitle152}</h4><p>{art.content152}</p></div>
                                                <div><h4 className="font-bold text-slate-700 text-sm mb-1">{art.subTitle153}</h4><p>{art.content153}</p></div>
                                            </div>
                                        )}
                                        {num === 16 && (
                                            <>
                                                <p>{art.content1}</p><p>{art.content2}</p><p>{art.content3}</p>
                                                <p>{art.content4}</p><p>{art.content5}</p>
                                                <p className="italic font-medium">{art.content6}</p>
                                            </>
                                        )}
                                        {num === 17 && (
                                            <>
                                                <p>{art.content1}</p>
                                                <div className="pl-4 space-y-3"><p>{art.itemA}</p><p>{art.itemB}</p></div>
                                                <p>{art.content2}</p><p>{art.content3}</p><p>{art.content4}</p>
                                                <p className="italic font-medium">{art.content5}</p>
                                            </>
                                        )}
                                        {num === 18 && (
                                            <><p>{art.content1}</p><p>{art.content2}</p><p>{art.content3}</p><p>{art.content4}</p></>
                                        )}
                                        {num === 19 && (
                                            <div className="space-y-6">
                                                <div className="space-y-3"><p>{art.contentA}</p><p>{art.contentB}</p><p>{art.contentC}</p></div>
                                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{art.subTitle1}</h4>
                                                    <div className="space-y-2 text-xs text-slate-500 italic">
                                                        <p>{art.subContent1A}</p><p>{art.subContent1B}</p><p>{art.subContent1C}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{art.subTitle2}</h4>
                                                    <div className="space-y-2 text-xs text-slate-500 italic">
                                                        <p>{art.subContent2A}</p><p>{art.subContent2B}</p><p>{art.subContent2C}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {art.content && ![6, 9, 11, 13, 14, 15, 16, 17, 18, 19].includes(num) && (
                                            <p>{art.content}</p>
                                        )}
                                    </div>
                                </section>
                            );
                        })}

                        <section className="mt-12 pt-12 border-t border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-900/10 flex items-center justify-center text-slate-900">
                                    <FileText size={20} />
                                </div>
                                {t.annexe.title}
                            </h3>
                            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                                <p>{t.annexe.content1}</p><p>{t.annexe.content2}</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{t.annexe.item1}</li><li>{t.annexe.item2}</li>
                                    <li>{t.annexe.item3}</li><li>{t.annexe.item4}</li><li>{t.annexe.item5}</li>
                                </ul>
                                <p className="italic text-slate-500">{t.annexe.content3}</p>
                                <p>{t.annexe.content4}</p>
                            </div>
                        </section>

                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-end gap-2 text-slate-400">
                        <p className="text-xs">
                            {t.signatureLocationDate.replace('{date}', new Date(contractData?.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }))}
                        </p>
                        {contractData?.status === 1 && (
                            <div className="text-right py-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Signature du Client</p>
                                <p className="font-['Caveat',_cursive] text-4xl text-slate-900 mb-1 leading-none transform -rotate-2">
                                    {contractData?.user?.first_name} {contractData?.user?.last_name}
                                </p>
                                <div className="w-56 h-0.5 bg-slate-900/10 rounded-full mt-2" />
                            </div>
                        )}
                        <p className="font-bold text-slate-900 text-sm italic">
                            {contractData?.status === 1 ? 'Electronic Signature Verified' : 'Pending Signature'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditUserModal = ({ user, onClose, onUpdate }: { user: User; onClose: () => void; onUpdate: () => void }) => {
    const [formData, setFormData] = useState({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        user_phone: user.user_phone || '',
        user_address: user.user_address || '',
        cmg_num: user.cmg_num || '',
        lat: '',
        lng: ''
    });
    const [saving, setSaving] = useState(false);
    const addressRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!addressRef.current || !window.google) return;
        const autocomplete = new window.google.maps.places.Autocomplete(addressRef.current, {
            types: ['address'],
            fields: ['formatted_address', 'geometry']
        });
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                setFormData(prev => ({
                    ...prev,
                    user_address: place.formatted_address || '',
                    lat: place.geometry!.location.lat().toString(),
                    lng: place.geometry!.location.lng().toString()
                }));
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await api.updateUser(user.id, formData);
            if (response.status) {
                toast.success(response.message || 'User profile updated successfully!');
                onUpdate();
                onClose();
            } else {
                toast.error(response.message || 'Failed to update user profile');
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error('An error occurred while updating the profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <Edit2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Edit User Profile</h2>
                                <p className="text-xs text-slate-400 font-medium">Update account information for {user.first_name}</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                            <PhoneInput
                                country={'fr'}
                                value={formData.user_phone}
                                onChange={(phone) => setFormData({ ...formData, user_phone: phone })}
                                enableSearch={true}
                                inputClass="!w-full !h-[48px] !bg-slate-50 !border !border-slate-100 !rounded-xl !text-sm !font-bold !pl-12 focus:!bg-white focus:!ring-2 focus:!ring-slate-900/10 focus:!border-slate-900"
                                containerClass="phone-input-container"
                                buttonClass="!bg-transparent !border-none !rounded-l-xl"
                                searchClass="!bg-white !text-slate-900"
                                dropdownClass="!bg-white !text-slate-900 !rounded-xl !shadow-xl !border-slate-100"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    ref={addressRef}
                                    type="text"
                                    defaultValue={formData.user_address}
                                    placeholder="Street address, city..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">CMG Number</label>
                            <input
                                type="text"
                                placeholder="e.g. ABC123456"
                                value={formData.cmg_num}
                                onChange={(e) => setFormData({ ...formData, cmg_num: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Update Profile'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

