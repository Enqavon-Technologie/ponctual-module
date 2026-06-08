import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Loader2, AlertCircle, Check, Star, MapPin, CalendarDays, Clock,
    X, Video, CheckCircle2, ArrowRight, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';

interface MatchSelectionViewProps {
    requestId: number;
    onDone: () => void;
}

interface Candidate {
    id: number;
    choice_order: number;
    babysitter_first_name: string;
    babysitter_last_name?: string;
    babysitter_pic?: string;
    babysitter_address?: string;
    status?: string;
    age?: number | string;
    experienceMonths?: number;
}

interface Selection {
    selected: boolean;
    interview_date: string | null;
    interview_time: string | null;
}

const PHOTO_BASE = 'https://bloom-buddies.fr/uploads/profile_images/';

export const MatchSelectionView: React.FC<MatchSelectionViewProps> = ({ requestId, onDone }) => {
    const { language, formatDate } = useLanguage();
    const fr = language === 'fr';

    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [familyName, setFamilyName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    // keyed by choice_order
    const [selections, setSelections] = useState<Record<number, Selection>>({});
    const [schedulingFor, setSchedulingFor] = useState<Candidate | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.getProposedCandidates(requestId);
                if (res.status && res.candidates) {
                    setCandidates(res.candidates);
                    const user = res.request?.user;
                    setFamilyName(`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim());
                    // Pre-fill any previously-saved selection so the page is resumable.
                    const initial: Record<number, Selection> = {};
                    res.candidates.forEach((c: Candidate) => {
                        if (c.status === 'selected') {
                            initial[c.choice_order] = {
                                selected: true,
                                interview_date: (c as any).interview_date || null,
                                interview_time: ((c as any).interview_time || '').slice(0, 5) || null,
                            };
                        }
                    });
                    setSelections(initial);
                } else {
                    setError(res.message || (fr ? 'Aucune candidate trouvée.' : 'No candidates found.'));
                }
            } catch (e: any) {
                setError(fr ? 'Échec du chargement des candidates.' : 'Failed to load candidates.');
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId]);

    const selectedCount = useMemo(
        () => Object.values(selections).filter(s => s.selected).length,
        [selections],
    );

    const toggleSelect = (c: Candidate) => {
        const wasSelected = !!selections[c.choice_order]?.selected;
        setSelections(prev => {
            const cur = prev[c.choice_order];
            if (cur?.selected) {
                const { [c.choice_order]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [c.choice_order]: { selected: true, interview_date: null, interview_time: null } };
        });
        // On newly selecting a candidate, prompt to schedule the interview
        // (the parent can still skip it via "Pas d'entretien" / close).
        if (!wasSelected) {
            setSchedulingFor(c);
        }
    };

    const setInterview = (order: number, date: string | null, time: string | null) => {
        setSelections(prev => ({
            ...prev,
            [order]: { selected: true, interview_date: date, interview_time: time },
        }));
    };

    const handleSubmit = async () => {
        if (selectedCount === 0) {
            toast.error(fr ? 'Veuillez sélectionner au moins une candidate.' : 'Please select at least one candidate.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.selectCandidates({
                parent_request_id: requestId,
                selections: Object.entries(selections)
                    .filter(([, s]) => s.selected)
                    .map(([order, s]) => ({
                        choice_order: Number(order),
                        interview_date: s.interview_date,
                        interview_time: s.interview_time,
                    })),
            });
            if (res.status) {
                setDone(true);
            } else {
                toast.error(res.message || (fr ? 'Échec de l’enregistrement.' : 'Failed to save your selection.'));
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (fr ? 'Échec de l’enregistrement.' : 'Failed to save your selection.'));
        } finally {
            setSubmitting(false);
        }
    };

    const photoOf = (c: Candidate) =>
        c.babysitter_pic ? `${PHOTO_BASE}${c.babysitter_pic}` : `${PHOTO_BASE}default.jpg`;

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-beige flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-brand-accent animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-bold">{fr ? 'Chargement…' : 'Loading…'}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-brand-beige flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Oops!</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <button onClick={onDone} className="w-full py-4 bg-brand-accent text-white font-bold rounded-2xl">
                        {fr ? 'Retour' : 'Back'}
                    </button>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen bg-brand-beige flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-[32px] p-10 text-center shadow-xl"
                >
                    <div className="w-20 h-20 bg-green-50 rounded-[28px] flex items-center justify-center text-green-500 mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">
                        {fr ? 'Sélection confirmée !' : 'Selection confirmed!'}
                    </h2>
                    <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                        {fr
                            ? 'Merci ! Notre équipe organise la suite et vous recevrez les détails de vos entretiens.'
                            : 'Thank you! Our team is arranging the next steps and you’ll receive your interview details.'}
                    </p>
                    <button onClick={onDone} className="w-full py-4 bg-brand-accent text-white font-bold rounded-2xl hover:bg-[#66B2AC] transition-all">
                        {fr ? 'Aller à mon espace' : 'Go to my dashboard'}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-beige py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-brand-accent/10 text-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <ShieldCheck size={28} />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                        {fr ? 'Choisissez vos babysitters' : 'Choose your babysitters'}
                    </h1>
                    <p className="text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">
                        {fr
                            ? `Bonjour ${familyName || ''}, voici les candidates sélectionnées pour vous. Choisissez celles que vous souhaitez rencontrer et planifiez un entretien en ligne (optionnel).`
                            : `Hi ${familyName || ''}, here are the candidates picked for you. Select the ones you’d like to meet and schedule an online interview (optional).`}
                    </p>
                </div>

                {/* Candidate grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-28">
                    {candidates.map(c => {
                        const sel = selections[c.choice_order];
                        const active = !!sel?.selected;
                        const hasInterview = !!(sel?.interview_date && sel?.interview_time);
                        return (
                            <div
                                key={c.choice_order}
                                className={`bg-white rounded-3xl border p-5 transition-all relative ${active ? 'border-brand-accent ring-2 ring-brand-accent/30 shadow-lg' : 'border-slate-200 hover:shadow-md'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <img
                                        src={photoOf(c)}
                                        alt={c.babysitter_first_name}
                                        onError={(e) => { (e.target as HTMLImageElement).src = `${PHOTO_BASE}default.jpg`; }}
                                        className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-lg leading-tight">
                                            {c.babysitter_first_name} {c.babysitter_last_name}
                                        </p>
                                        {(c.experienceMonths || c.age) && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                {c.age ? <span>{c.age} {fr ? 'ans' : 'yrs'}</span> : null}
                                                <span className="inline-flex items-center gap-1">
                                                    <Star size={12} className="text-amber-400 fill-amber-400" />
                                                    {fr ? 'Vérifiée' : 'Vetted'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {c.babysitter_address && (
                                    <div className="flex items-start gap-1.5 mt-3 text-xs text-slate-400">
                                        <MapPin size={12} className="mt-0.5 shrink-0" />
                                        <span className="leading-tight line-clamp-1">{c.babysitter_address}</span>
                                    </div>
                                )}

                                {/* Interview state (only when selected) */}
                                {active && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        {hasInterview ? (
                                            <div className="flex items-center justify-between gap-2 bg-brand-accent/5 rounded-xl px-3 py-2">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-brand-accent min-w-0">
                                                    <Video size={14} className="shrink-0" />
                                                    <span className="truncate">
                                                        {formatDate(sel!.interview_date as string)} · {sel!.interview_time} ({fr ? 'heure de Paris' : 'Paris time'})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => setSchedulingFor(c)} className="text-[11px] font-bold text-brand-accent hover:underline">
                                                        {fr ? 'Modifier' : 'Edit'}
                                                    </button>
                                                    <button onClick={() => setInterview(c.choice_order, null, null)} className="p-1 text-slate-400 hover:text-red-500">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSchedulingFor(c)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-accent/10 text-brand-accent text-xs font-bold rounded-xl hover:bg-brand-accent/20 transition-all"
                                                >
                                                    <CalendarDays size={14} />
                                                    {fr ? 'Planifier un entretien' : 'Schedule interview'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Select toggle */}
                                <button
                                    onClick={() => toggleSelect(c)}
                                    className={`w-full mt-4 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {active ? <><Check size={16} strokeWidth={3} /> {fr ? 'Sélectionnée' : 'Selected'}</> : (fr ? 'Sélectionner' : 'Select')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sticky confirm bar */}
            <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                        <span className="font-bold text-slate-800">{selectedCount}</span>{' '}
                        {fr ? 'candidate(s) sélectionnée(s)' : 'candidate(s) selected'}
                    </p>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedCount === 0 || submitting}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm inline-flex items-center gap-2 transition-all ${selectedCount > 0 && !submitting ? 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-lg shadow-brand-accent/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                        {fr ? 'Confirmer ma sélection' : 'Confirm my selection'}
                    </button>
                </div>
            </div>

            {/* Interview scheduler popup */}
            <AnimatePresence>
                {schedulingFor && (
                    <InterviewScheduler
                        candidate={schedulingFor}
                        initialDate={selections[schedulingFor.choice_order]?.interview_date || null}
                        initialTime={selections[schedulingFor.choice_order]?.interview_time || null}
                        fr={fr}
                        onSkip={() => { setInterview(schedulingFor.choice_order, null, null); setSchedulingFor(null); }}
                        onConfirm={(date, time) => { setInterview(schedulingFor.choice_order, date, time); setSchedulingFor(null); }}
                        onClose={() => setSchedulingFor(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ---------------------------------------------------------------------------

interface InterviewSchedulerProps {
    candidate: Candidate;
    initialDate: string | null;
    initialTime: string | null;
    fr: boolean;
    onConfirm: (date: string, time: string) => void;
    onSkip: () => void;
    onClose: () => void;
}

const InterviewScheduler: React.FC<InterviewSchedulerProps> = ({
    candidate, initialDate, initialTime, fr, onConfirm, onSkip, onClose,
}) => {
    const [date, setDate] = useState(initialDate || '');
    const [time, setTime] = useState(initialTime || '');

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const canConfirm = !!date && !!time;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative z-10 w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center">
                            <Video size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 leading-tight">{fr ? 'Planifier un entretien vidéo' : 'Schedule a video interview'}</h3>
                            <p className="text-xs text-slate-400">{fr ? 'avec' : 'with'} {candidate.babysitter_first_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
                </div>

                <div className="px-6 pt-4">
                    <div className="flex items-start gap-2 text-xs text-brand-accent bg-brand-accent/5 border border-brand-accent/15 rounded-xl px-3 py-2.5 leading-snug">
                        <Video size={14} className="mt-0.5 shrink-0" />
                        <span>{fr ? 'Entretien vidéo en ligne — un lien de visioconférence vous sera envoyé.' : 'Online video interview — a video-call link will be sent to you.'}</span>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                    <div>
                        <label className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-slate-400 mb-2">
                            <CalendarDays size={13} /> {fr ? 'Date' : 'Date'}
                        </label>
                        <input
                            type="date"
                            value={date}
                            min={todayStr}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-slate-400 mb-2">
                            <Clock size={13} /> {fr ? 'Heure' : 'Time'}
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none text-sm"
                        />
                        <p className="mt-2 text-[11px] text-slate-400">{fr ? 'Tous les horaires sont en heure de Paris.' : 'All times are in Paris time.'}</p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                        onClick={onSkip}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
                    >
                        {fr ? 'Pas d’entretien' : 'No interview'}
                    </button>
                    <button
                        onClick={() => canConfirm && onConfirm(date, time)}
                        disabled={!canConfirm}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-all ${canConfirm ? 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-md shadow-brand-accent/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        <Check size={16} /> {fr ? 'Confirmer' : 'Confirm'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
