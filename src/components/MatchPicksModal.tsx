import React from 'react';
import { motion } from 'motion/react';
import { X, Video, Calendar, Mail, Phone, CheckCircle2, Clock, UserX } from 'lucide-react';
import { ParentRequest } from '../services/api';

interface MatchPicksModalProps {
    request: ParentRequest;
    onClose: () => void;
}

const PHOTO_BASE = 'https://bloom-buddies.fr/uploads/profile_images/';

const fmtDate = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d; }
};

export const MatchPicksModal: React.FC<MatchPicksModalProps> = ({ request, onClose }) => {
    const familyName = `${request.user?.first_name ?? ''} ${request.user?.last_name ?? ''}`.trim() || 'Family';
    const choices: any[] = (request.choices as any[]) ?? [];
    const selected = choices.filter(c => c.status === 'selected');
    const proposed = choices.filter(c => c.status === 'proposed');
    const rejected = choices.filter(c => c.status === 'rejected');

    const Avatar = ({ c }: { c: any }) => (
        <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
            {c.babysitter_pic
                ? <img src={`${PHOTO_BASE}${c.babysitter_pic}`} alt={c.babysitter_first_name} onError={(e) => { (e.target as HTMLImageElement).src = `${PHOTO_BASE}default.jpg`; }} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-slate-400">{(c.babysitter_first_name || '?').charAt(0)}</span>}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="relative z-10 w-full max-w-lg bg-white rounded-[24px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Candidates &amp; interviews</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{familyName} · request #{request.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Selected by family */}
                    <section>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-3">
                            <CheckCircle2 size={13} /> Selected by family ({selected.length})
                        </p>
                        {selected.length === 0 ? (
                            <p className="text-xs text-slate-400">The family hasn&apos;t made their picks yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {selected.map(c => {
                                    const date = fmtDate(c.interview_date);
                                    const time = (c.interview_time || '').slice(0, 5);
                                    return (
                                        <div key={c.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <Avatar c={c} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-800 truncate">{c.babysitter_first_name} {c.babysitter_last_name}</p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
                                                        {c.babysitter_email && <span className="inline-flex items-center gap-1 min-w-0"><Mail size={10} /><span className="truncate">{c.babysitter_email}</span></span>}
                                                        {c.babysitter_phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{c.babysitter_phone}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                {date ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent">
                                                        <Calendar size={13} /> {date} @ {time}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                                        <Clock size={13} /> No interview scheduled
                                                    </span>
                                                )}
                                                {c.zoom_meeting_link && (
                                                    <a href={c.zoom_meeting_link} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent text-white text-xs font-bold rounded-lg hover:bg-[#66B2AC] transition-colors">
                                                        <Video size={13} /> Join
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Proposed, awaiting family */}
                    {proposed.length > 0 && (
                        <section>
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-3">
                                <Clock size={13} /> Proposed — awaiting family ({proposed.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {proposed.map(c => (
                                    <div key={c.id} className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full pl-1 pr-3 py-1">
                                        <Avatar c={c} />
                                        <span className="text-xs font-semibold text-slate-600">{c.babysitter_first_name} {c.babysitter_last_name}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Declined */}
                    {rejected.length > 0 && (
                        <section>
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">
                                <UserX size={13} /> Declined ({rejected.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {rejected.map(c => (
                                    <span key={c.id} className="text-xs text-slate-400 line-through">{c.babysitter_first_name} {c.babysitter_last_name}</span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
