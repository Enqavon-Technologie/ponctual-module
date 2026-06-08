import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Video, CalendarDays, Clock, X, Check } from 'lucide-react';

interface InterviewSchedulerProps {
    candidate: { babysitter_first_name?: string };
    initialDate: string | null;
    initialTime: string | null;
    fr: boolean;
    onConfirm: (date: string, time: string) => void;
    /** Optional — when provided, shows a "No interview" button (parent flow). */
    onSkip?: () => void;
    onClose: () => void;
    /** Optional confirm-button label override (e.g. "Reschedule"). */
    confirmLabel?: string;
}

export const InterviewScheduler: React.FC<InterviewSchedulerProps> = ({
    candidate, initialDate, initialTime, fr, onConfirm, onSkip, onClose, confirmLabel,
}) => {
    const [date, setDate] = useState(initialDate || '');
    const [time, setTime] = useState(initialTime || '');

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const canConfirm = !!date && !!time;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            {fr ? 'Pas d’entretien' : 'No interview'}
                        </button>
                    )}
                    <button
                        onClick={() => canConfirm && onConfirm(date, time)}
                        disabled={!canConfirm}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-all ${canConfirm ? 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-md shadow-brand-accent/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        <Check size={16} /> {confirmLabel || (fr ? 'Confirmer' : 'Confirm')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
