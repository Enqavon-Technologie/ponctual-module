import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Search, Loader2, Check, Star, MapPin, Globe, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, ParentRequest } from '../services/api';

interface ProposeCandidatesModalProps {
    request: ParentRequest;
    onClose: () => void;
    onProposed: () => void;
}

interface Candidate {
    id: number | string;
    name: string;
    lastName: string;
    age?: number | string;
    languages: string[];
    experienceMonths: number;
    photo: string;
    profile_pic?: string;
    email?: string;
    phone?: string;
    address?: string;
}

const PHOTO_BASE = 'https://bloom-buddies.fr/uploads/profile_images/';
const MIN_PICK = 3;
const MAX_PICK = 5;

const mapSitter = (item: any): Candidate => {
    const languages: string[] = item.bs_languages
        ? item.bs_languages.map((l: any) => l.language_name).filter(Boolean)
        : [];
    if (languages.length === 0) {
        if (item.english_language > 0) languages.push('English');
        if (item.french_language > 0) languages.push('French');
    }
    return {
        id: item.user_id,
        name: item.name || item.first_name || 'Babysitter',
        lastName: item.user_last_name || '',
        age: item.age,
        languages,
        experienceMonths: item.experienceMonths || 0,
        photo: item.profile_pic ? `${PHOTO_BASE}${item.profile_pic}` : `${PHOTO_BASE}default.jpg`,
        profile_pic: item.profile_pic,
        email: item.email,
        phone: item.user_phone,
        address: item.babysitter_profiles_address,
    };
};

const formatExperience = (months: number): string => {
    if (!months) return 'New';
    const years = Math.floor(months / 12);
    if (years >= 1) return `${years} yr${years > 1 ? 's' : ''} exp`;
    return `${months} mo exp`;
};

export const ProposeCandidatesModal: React.FC<ProposeCandidatesModalProps> = ({ request, onClose, onProposed }) => {
    const familyName = `${request.user?.first_name ?? ''} ${request.user?.last_name ?? ''}`.trim() || 'this family';

    const [sitters, setSitters] = useState<Candidate[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [langFilter, setLangFilter] = useState<string>('all');
    const [selected, setSelected] = useState<Candidate[]>([]);
    const [isProposing, setIsProposing] = useState(false);

    const loadPage = async (p: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.getExternalBabysitters(p, {});
            const list: any[] = response?.data ?? [];
            const mapped = list.map(mapSitter);
            setSitters(prev => {
                if (p === 1) return mapped;
                const ids = new Set(prev.map(s => s.id));
                return [...prev, ...mapped.filter(s => !ids.has(s.id))];
            });
            setHasMore(list.length > 0 && (response?.next_page_url ?? null) !== null);
        } catch (e: any) {
            setError('Failed to load babysitters. Please try again.');
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Available languages across loaded sitters (for the filter dropdown).
    const availableLanguages = useMemo(() => {
        const set = new Set<string>();
        sitters.forEach(s => s.languages.forEach(l => set.add(l)));
        return Array.from(set).sort();
    }, [sitters]);

    const visibleSitters = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sitters.filter(s => {
            const matchesSearch = !q || `${s.name} ${s.lastName}`.toLowerCase().includes(q);
            const matchesLang = langFilter === 'all' || s.languages.includes(langFilter);
            return matchesSearch && matchesLang;
        });
    }, [sitters, search, langFilter]);

    const isSelected = (id: Candidate['id']) => selected.some(s => s.id === id);

    const toggleSelect = (c: Candidate) => {
        setSelected(prev => {
            if (prev.some(s => s.id === c.id)) return prev.filter(s => s.id !== c.id);
            if (prev.length >= MAX_PICK) {
                toast.error(`You can propose at most ${MAX_PICK} candidates.`);
                return prev;
            }
            return [...prev, c];
        });
    };

    const canPropose = selected.length >= MIN_PICK && selected.length <= MAX_PICK && !isProposing;

    const handlePropose = async () => {
        if (selected.length < MIN_PICK) {
            toast.error(`Please select at least ${MIN_PICK} candidates.`);
            return;
        }
        setIsProposing(true);
        try {
            const res = await api.proposeCandidates({
                parent_request_id: request.id,
                choices: selected.map(c => ({
                    babysitter_first_name: c.name,
                    babysitter_last_name: c.lastName,
                    babysitter_email: c.email,
                    babysitter_phone: c.phone,
                    babysitter_address: c.address,
                    babysitter_pic: c.profile_pic,
                    bb_bs_id: c.id,
                })),
            });
            if (res.status) {
                toast.success(`Proposed ${selected.length} candidates to ${familyName}.`);
                onProposed();
                onClose();
            } else {
                toast.error(res.message || 'Failed to propose candidates.');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to propose candidates.');
        } finally {
            setIsProposing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isProposing && onClose()}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="relative z-10 w-full max-w-5xl bg-slate-50 rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="bg-white px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Propose Candidates</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pick {MIN_PICK}–{MAX_PICK} babysitters to propose to <span className="font-semibold text-slate-700">{familyName}</span> (request #{request.id})
                        </p>
                    </div>
                    <button onClick={() => !isProposing && onClose()} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search + filters */}
                <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name…"
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-slate-300 rounded-xl text-sm outline-none transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={langFilter}
                            onChange={(e) => setLangFilter(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-slate-300 rounded-xl text-sm outline-none transition-all appearance-none"
                        >
                            <option value="all">All languages</option>
                            {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 ml-auto">
                        <Users size={14} />
                        <span className={selected.length >= MIN_PICK ? 'text-brand-accent' : ''}>{selected.length}</span>
                        <span>/ {MAX_PICK} selected</span>
                    </div>
                </div>

                {/* Candidate grid */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    {visibleSitters.length === 0 && !isLoading && !error && (
                        <div className="text-center text-slate-400 text-sm py-16">No babysitters match your search.</div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleSitters.map(c => {
                            const active = isSelected(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggleSelect(c)}
                                    className={`text-left bg-white rounded-2xl border p-4 transition-all relative ${active ? 'border-brand-accent ring-2 ring-brand-accent/30 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                                >
                                    {active && (
                                        <div className="absolute top-3 right-3 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center shadow">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={c.photo}
                                            alt={c.name}
                                            onError={(e) => { (e.target as HTMLImageElement).src = `${PHOTO_BASE}default.jpg`; }}
                                            className="w-14 h-14 rounded-2xl object-cover bg-slate-100 shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{c.name} {c.lastName}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                {c.age ? <span>{c.age} yrs</span> : null}
                                                <span className="inline-flex items-center gap-1"><Star size={11} className="text-amber-400 fill-amber-400" />{formatExperience(c.experienceMonths)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {c.languages.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {c.languages.slice(0, 3).map(l => (
                                                <span key={l} className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{l}</span>
                                            ))}
                                        </div>
                                    )}
                                    {c.address && (
                                        <div className="flex items-start gap-1 mt-2 text-[10px] text-slate-400">
                                            <MapPin size={10} className="mt-0.5 shrink-0" />
                                            <span className="leading-tight line-clamp-1">{c.address}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-center mt-6">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={18} className="animate-spin" /> Loading…</div>
                        ) : hasMore ? (
                            <button
                                onClick={() => { const next = page + 1; setPage(next); loadPage(next); }}
                                className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                Load more
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                        {selected.length < MIN_PICK
                            ? `Select at least ${MIN_PICK} candidates to propose.`
                            : `${selected.length} candidate${selected.length > 1 ? 's' : ''} ready to propose.`}
                    </p>
                    <button
                        onClick={handlePropose}
                        disabled={!canPropose}
                        className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${canPropose ? 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-lg shadow-brand-accent/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {isProposing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Propose {selected.length > 0 ? `${selected.length} ` : ''}to {request.user?.first_name || familyName}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
