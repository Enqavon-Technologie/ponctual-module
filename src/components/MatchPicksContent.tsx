import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Video, Calendar, Mail, Phone, CheckCircle2, Clock, UserX, Crown, Loader2, AlertCircle, CalendarClock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n/LanguageContext';
import { api, ParentRequest } from '../services/api';
import { InterviewScheduler } from './InterviewScheduler';
import { interviewRoomUrl } from '../utils/interview';

interface MatchPicksContentProps {
    request: ParentRequest;
    onUpdated: () => void;
}

const PHOTO_BASE = 'https://bloom-buddies.fr/uploads/profile_images/';

const fmtDate = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d; }
};

/**
 * Inline candidate / interview panel for a matching request — the family's
 * selected babysitters (with interviews, Zoom links and the final-choice
 * action), plus proposed-and-awaiting and declined lists. Rendered directly
 * inside the request card (no modal). Returns null when there are no choices.
 */
export const MatchPicksContent: React.FC<MatchPicksContentProps> = ({ request, onUpdated }) => {
    const { language } = useLanguage();
    const fr = language === 'fr';

    const choices: any[] = (request.choices as any[]) ?? [];
    const selected = choices.filter(c => c.status === 'selected');
    const proposed = choices.filter(c => c.status === 'proposed');
    const rejected = choices.filter(c => c.status === 'rejected');

    const [confirmingFinal, setConfirmingFinal] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [schedulingFor, setSchedulingFor] = useState<any | null>(null);

    const handleSchedule = async (date: string, time: string) => {
        if (!schedulingFor) return;
        try {
            const res = await api.scheduleInterview(schedulingFor.id, date, time);
            if (res.status) {
                toast.success(fr ? 'Entretien planifié.' : 'Interview scheduled.');
                setSchedulingFor(null);
                onUpdated();
            } else {
                toast.error(res.message || (fr ? 'Échec.' : 'Failed.'));
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (fr ? 'Échec.' : 'Failed.'));
        }
    };

    const copyInvite = (c: any) => {
        const d = fmtDate(c.interview_date);
        const t = (c.interview_time || '').slice(0, 5);
        const name = `${c.babysitter_first_name ?? ''} ${c.babysitter_last_name ?? ''}`.trim();
        const lines: string[] = [];
        lines.push(fr
            ? `Bonjour, votre entretien vidéo avec ${name} est prévu le ${d} à ${t} (heure de Paris).`
            : `Hello, your video interview with ${name} is scheduled for ${d} at ${t} (Paris time).`);
        lines.push(fr
            ? `Lien de visioconférence : ${interviewRoomUrl(c.id)}`
            : `Video-call link: ${interviewRoomUrl(c.id)}`);
        navigator.clipboard.writeText(lines.join('\n'));
        toast.success(fr ? 'Invitation copiée !' : 'Invitation copied!');
    };

    const confirmFinalChoice = async () => {
        if (!confirmingFinal) return;
        setSubmitting(true);
        try {
            const res = await api.selectFinalChoice(confirmingFinal.id);
            if (res.status) {
                toast.success(fr ? 'Choix final confirmé.' : 'Final choice confirmed.');
                setConfirmingFinal(null);
                onUpdated();
            } else {
                toast.error(res.message || (fr ? 'Échec.' : 'Failed.'));
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (fr ? 'Échec.' : 'Failed.'));
        } finally {
            setSubmitting(false);
        }
    };

    const Avatar = ({ c }: { c: any }) => (
        <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
            {c.babysitter_pic
                ? <img src={`${PHOTO_BASE}${c.babysitter_pic}`} alt={c.babysitter_first_name} onError={(e) => { (e.target as HTMLImageElement).src = `${PHOTO_BASE}default.jpg`; }} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-slate-400">{(c.babysitter_first_name || '?').charAt(0)}</span>}
        </div>
    );

    if (choices.length === 0) return null;

    return (
        <>
            <div className="space-y-5">
                {/* Selected by family */}
                <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-3">
                        <CheckCircle2 size={13} /> {fr ? 'Sélectionnées par la famille' : 'Selected by family'} ({selected.length})
                    </p>
                    {selected.length === 0 ? (
                        <p className="text-xs text-slate-400">{fr ? 'La famille n’a pas encore choisi.' : 'The family hasn’t made their picks yet.'}</p>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            {selected.map(c => {
                                const date = fmtDate(c.interview_date);
                                const time = (c.interview_time || '').slice(0, 5);
                                const isFinal = Number(c.final_choice) === 1;
                                return (
                                    <div key={c.id} className={`rounded-2xl p-4 border ${isFinal ? 'bg-brand-accent/5 border-brand-accent/30' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <Avatar c={c} />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 truncate flex items-center gap-2">
                                                    {c.babysitter_first_name} {c.babysitter_last_name}
                                                    {isFinal && <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full"><Crown size={10} /> {fr ? 'Choix final' : 'Final'}</span>}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
                                                    {c.babysitter_email && <span className="inline-flex items-center gap-1 min-w-0"><Mail size={10} /><span className="truncate">{c.babysitter_email}</span></span>}
                                                    {c.babysitter_phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{c.babysitter_phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                            {date ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent">
                                                    <Calendar size={13} /> {date} @ {time} <span className="font-normal text-slate-400">({fr ? 'heure de Paris' : 'Paris time'})</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                                    <Clock size={13} /> {fr ? 'Pas d’entretien' : 'No interview scheduled'}
                                                </span>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button onClick={() => setSchedulingFor(c)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                                                    <CalendarClock size={13} /> {date ? (fr ? 'Reprogrammer' : 'Reschedule') : (fr ? 'Planifier' : 'Schedule')}
                                                </button>
                                                {date && (
                                                    <button onClick={() => copyInvite(c)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                                                        <Send size={13} /> {fr ? 'Invitation' : 'Invite'}
                                                    </button>
                                                )}
                                                {date && (
                                                    <a href={interviewRoomUrl(c.id)} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                                                        <Video size={13} /> {fr ? 'Rejoindre' : 'Join'}
                                                    </a>
                                                )}
                                                {!isFinal && (
                                                    <button onClick={() => setConfirmingFinal(c)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent text-white text-xs font-bold rounded-lg hover:bg-[#66B2AC] transition-colors">
                                                        <Crown size={13} /> {fr ? 'Choix final' : 'Make final choice'}
                                                    </button>
                                                )}
                                            </div>
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
                            <Clock size={13} /> {fr ? 'Proposées — en attente' : 'Proposed — awaiting family'} ({proposed.length})
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
                            <UserX size={13} /> {fr ? 'Refusées' : 'Declined'} ({rejected.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {rejected.map(c => (
                                <span key={c.id} className="text-xs text-slate-400 line-through">{c.babysitter_first_name} {c.babysitter_last_name}</span>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Final-choice confirmation (centered overlay) */}
            {confirmingFinal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !submitting && setConfirmingFinal(null)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-7 text-center"
                    >
                        <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{fr ? 'Confirmer le choix final' : 'Confirm Final Choice'}</h3>
                        <p className="text-sm text-slate-500 mb-2">
                            {confirmingFinal.babysitter_first_name} {confirmingFinal.babysitter_last_name}
                        </p>
                        <p className="text-sm text-slate-500 mb-6">{fr ? 'Êtes-vous sûr ? Cette décision est irréversible.' : 'Are you sure? This decision cannot be undone.'}</p>
                        <div className="flex gap-3">
                            <button onClick={() => !submitting && setConfirmingFinal(null)} disabled={submitting}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
                                {fr ? 'Retour' : 'Back'}
                            </button>
                            <button onClick={confirmFinalChoice} disabled={submitting}
                                className="flex-1 py-3 rounded-xl bg-brand-accent text-white font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-[#66B2AC] transition-colors disabled:opacity-60">
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                {fr ? 'Oui, confirmer' : 'Yes, confirm'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Admin: schedule / reschedule the candidate's interview */}
            {schedulingFor && (
                <InterviewScheduler
                    candidate={schedulingFor}
                    initialDate={schedulingFor.interview_date || null}
                    initialTime={(schedulingFor.interview_time || '').slice(0, 5) || null}
                    fr={fr}
                    onConfirm={handleSchedule}
                    onClose={() => setSchedulingFor(null)}
                    confirmLabel={schedulingFor.interview_date ? (fr ? 'Reprogrammer' : 'Reschedule') : undefined}
                />
            )}
        </>
    );
};
