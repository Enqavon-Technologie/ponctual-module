import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';

interface BabysitterContractViewProps {
    choiceId: number;
}

const fmtFr = (d?: string | null): string => {
    if (!d) return '—';
    try {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return String(d);
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    } catch { return String(d); }
};

// Transport (Navigo) participation tier from the weekly hours, per Article 7.3.
const navigoTier = (weekly: number): string => {
    if (weekly >= 21) return '100 %';
    if (weekly > 5) return '50 %';
    if (weekly >= 4) return '25 %';
    if (weekly >= 3) return '15 %';
    if (weekly >= 2) return '10 %';
    return '0 %';
};

export const BabysitterContractView: React.FC<BabysitterContractViewProps> = ({ choiceId }) => {
    const { language } = useLanguage();
    const fr = language === 'fr';

    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dob, setDob] = useState('');
    const [ssn, setSsn] = useState('');
    const [signatureName, setSignatureName] = useState('');
    const [approved, setApproved] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [signed, setSigned] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true); setError(null);
            try {
                const res = await api.getBabysitterContract(choiceId);
                if (res.status) {
                    setData(res);
                    setSigned(!!res.already_signed);
                    const bs = res.babysitter || {};
                    setSignatureName(`${bs.first_name ?? ''} ${bs.last_name ?? ''}`.trim());
                    if (bs.dob) setDob(bs.dob);
                } else {
                    setError(res.message || (fr ? 'Contrat introuvable.' : 'Contract not found.'));
                }
            } catch {
                setError(fr ? 'Impossible de charger le contrat.' : 'Could not load the contract.');
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [choiceId]);

    const todayFr = useMemo(() => fmtFr(new Date().toISOString()), []);

    const canSign = !!dob && !!signatureName.trim() && approved && !submitting;

    const handleSign = async () => {
        if (!canSign) return;
        setSubmitting(true);
        try {
            const res = await api.signBabysitterContract(choiceId, {
                dob,
                ssn: ssn.trim() || undefined,
                signature_name: signatureName.trim(),
            });
            if (res.status) {
                setSigned(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                toast.error(res.message || (fr ? 'Échec de la signature.' : 'Signing failed.'));
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || (fr ? 'Échec de la signature.' : 'Signing failed.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-brand-accent animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">{fr ? 'Chargement du contrat…' : 'Loading the contract…'}</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl">
                    <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Oops!</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    const bs = data.babysitter || {};
    const bsName = `${bs.first_name ?? ''} ${bs.last_name ?? ''}`.trim();

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {signed && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
                        <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={22} />
                        <div>
                            <p className="font-bold text-green-800">{fr ? 'Contrat signé électroniquement' : 'Contract signed electronically'}</p>
                            <p className="text-sm text-green-700">{fr ? 'Merci ! Une copie sera transmise par notre équipe.' : 'Thank you! A copy will be shared by our team.'}</p>
                        </div>
                    </div>
                )}

                {/* The contract document */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-7 sm:p-12 text-slate-800 text-[13.5px] leading-relaxed">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center mx-auto mb-3">
                            <FileText size={22} />
                        </div>
                        <h1 className="text-xl font-bold tracking-wide">CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE</h1>
                        <p className="text-slate-400 text-sm font-semibold mt-1">C.D.D.</p>
                    </div>

                    <p className="font-bold mb-2">ENTRE LES SOUSSIGNÉS</p>
                    <p className="mb-4">
                        La société <strong>Enqavon Service (Bloom Buddies Babysitting)</strong> au capital de 1000€,
                        immatriculée 885130682 au RCS de Paris, ayant son siège social 7 rue Meyerbeer, représentée par
                        Enqavon Incorporated Président, dûment habilité à l'effet des présentes. Le code NAF/APE de la
                        société est : 8891A (accueil de jeunes enfants). Ci-après dénommé(s) l'« Employeur »
                    </p>
                    <p className="mb-2 font-semibold">D'UNE PART,</p>
                    <p className="mb-1">Et</p>
                    <p className="mb-4">
                        <strong>{bsName || '—'}</strong><br />
                        Né-e le {dob ? fmtFr(dob) : '……………………'}<br />
                        Demeurant au {bs.address || '……………………'}<br />
                        Joignable au {bs.phone || '……………………'}<br />
                        Numéro de sécurité sociale : {ssn || '……………………'}<br />
                        Ci-après dénommé-e le « Salarié »
                    </p>
                    <p className="mb-6 font-semibold">D'AUTRE PART.</p>

                    <Section title="Article 1 — Engagement">
                        La société Enqavon Service engage <strong>{bsName || '—'}</strong>, sous contrat de travail à durée
                        déterminée à partir du <strong>{fmtFr(data.start_date)}</strong> jusqu'au <strong>{fmtFr(data.end_date)}</strong>,
                        correspondant à la période de garde réservée par la famille. L'Employeur a déclaré préalablement à
                        son embauche auprès de l'URSSAF de Paris.
                    </Section>

                    <Section title="Article 2 — Conventions applicables">
                        Le présent contrat est régi par la Convention collective Service à la personne IDCC n° 3127
                        (Brochure n° 3370). En cas de contradiction entre le présent contrat et la Convention collective,
                        cette dernière prévaudra.
                    </Section>

                    <Section title="Article 3 — Durée et Période d'essai">
                        <p className="mb-2"><strong>3.1 — Durée du contrat.</strong> Le contrat est conclu pour la durée déterminée
                        mentionnée à l'article 1.</p>
                        <p><strong>3.2 — Période d'essai.</strong> Le présent contrat est conclu avec une période d'essai de
                        quatorze (14) jours calendaires à compter de la date de début d'exécution du travail. Pendant cette
                        période, le contrat peut être rompu par l'une ou l'autre des parties, sous réserve du délai de
                        prévenance de l'article L1221-25 du Code du travail.</p>
                    </Section>

                    <Section title="Article 4 — Fonctions du salarié">
                        Le Salarié exercera les fonctions de garde d'enfant, au niveau non-cadre : éveil et développement de
                        l'enfant par des activités adaptées à son âge, et accompagnement sécurisé lors des déplacements
                        extérieurs, conformément à la Charte nationale pour l'accueil du jeune enfant.
                    </Section>

                    <Section title="Article 5 — Lieu de travail">
                        Le Salarié exerce ses fonctions chez un client au <strong>{data.client_address || '……'}</strong> et les
                        environs d'Île-de-France.
                    </Section>

                    <Section title="Article 6 — Durée du travail">
                        <p className="mb-2">
                            Le Salarié interviendra pour une durée totale de <strong>{data.total_hours} heures</strong>
                            {data.weekly_hours ? <> (soit environ <strong>{data.weekly_hours} heures par semaine</strong>)</> : null},
                            aux dates et horaires suivants :
                        </p>
                        <ul className="list-disc pl-6 space-y-0.5">
                            {(data.days || []).map((d: any, i: number) => (
                                <li key={i}>
                                    {fmtFr(d.date)} : {(d.slots || []).map((s: any) => `${s.start} - ${s.end}`).join(', ') || '—'}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2">
                            Les horaires peuvent être modifiés à la demande du client dans le même mois, moyennant un délai de
                            prévenance de trois jours. Le Salarié pourra effectuer des heures complémentaires dans la limite de
                            24 heures par mois.
                        </p>
                    </Section>

                    <Section title="Article 7 — Rémunération et primes">
                        <p className="mb-2">
                            <strong>7.1 — Rémunération.</strong> Le Salarié percevra une rémunération horaire brute de
                            <strong> {data.base_rate.toFixed(2)} euros/heure</strong> (Salaire de Base). Conformément au mode de
                            versement dit « au fil de l'eau », une indemnité compensatrice de congés payés égale à 10 % de la
                            rémunération brute sera ajoutée à chaque échéance de paie. La rémunération horaire brute totale
                            (congés payés inclus) s'élève ainsi à <strong>{data.total_rate.toFixed(2)} euros/heure</strong>.
                        </p>
                        <p className="mb-2">
                            <strong>7.2 — Heures complémentaires.</strong> Les heures complémentaires demandées par l'Employeur
                            seront rémunérées dans les conditions prévues au présent contrat, dans la limite légale.
                        </p>
                        <p className="mb-2">
                            <strong>7.3 — Participation au titre du transport.</strong> Sur la base du forfait Navigo mensuel et
                            de la durée hebdomadaire prévue, la participation applicable est de <strong>{navigoTier(data.weekly_hours)}</strong>
                            (21 h ou plus : 100 % ; plus de 5 h : 50 % ; 4-5 h : 25 % ; 3 h : 15 % ; 2 h : 10 %), versée chaque
                            mois sur présentation des justificatifs.
                        </p>
                        <p>
                            <strong>7.4 — Mutuelle santé.</strong> Couverture de 50 % d'une mutuelle santé à la signature, portée
                            à 100 % lorsque le nombre d'heures travaillées dépasse 21 heures par semaine.
                        </p>
                    </Section>

                    <Section title="Article 8 — Entretien professionnel">
                        Conformément à l'article L6315 du Code du travail, le Salarié bénéficie tous les deux ans d'un entretien
                        professionnel consacré à ses perspectives d'évolution professionnelle.
                    </Section>

                    <Section title="Article 9 — Loyauté">
                        Pendant la durée du présent contrat, le Salarié s'engage à une totale loyauté vis-à-vis de son
                        employeur et à ne participer à aucune activité concurrente de la Société qui l'emploie.
                    </Section>

                    <Section title="Article 10 — Fin de contrat">
                        Les parties peuvent rompre le contrat dans le respect des dispositions légales et conventionnelles. Le
                        délai de préavis est de deux semaines ouvrées ; en cas de non-respect par le salarié, une indemnité
                        compensatrice correspondant à la durée du préavis sera due.
                    </Section>

                    <Section title="Article 11 — Confidentialité">
                        Le Salarié s'engage à observer la discrétion la plus stricte sur les informations relatives aux
                        activités de la Société et de ses clients, pour une durée de deux ans après la cessation du contrat.
                    </Section>

                    <Section title="Article 12 — Antécédents judiciaires et FIJAISV">
                        L'exercice des missions auprès de mineurs requiert une moralité irréprochable. L'embauche et le maintien
                        au poste sont subordonnés à l'absence de condamnations inscrites au bulletin n°3 du casier judiciaire
                        ou au FIJAISV incompatibles avec l'exercice de l'activité.
                    </Section>

                    <p className="mt-8 mb-1">Fait à Paris, le {todayFr}.</p>
                    <div className="grid grid-cols-2 gap-6 mt-6">
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wide text-slate-500">L'Employeur</p>
                            <p className="text-xs text-slate-400 italic">« Lu et approuvé »</p>
                            <p className="mt-3 font-[cursive] text-brand-accent">Enqavon Service</p>
                        </div>
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wide text-slate-500">Le Salarié</p>
                            <p className="text-xs text-slate-400 italic">« Lu et approuvé »</p>
                            {signed
                                ? <p className="mt-3 font-[cursive] text-brand-accent text-lg">{data.signature_name || signatureName}</p>
                                : <p className="mt-3 text-slate-300">……………………</p>}
                        </div>
                    </div>
                </div>

                {/* Signing form */}
                {!signed && (
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-7 sm:p-8 mt-6">
                        <div className="flex items-center gap-2 mb-5">
                            <ShieldCheck className="text-brand-accent" size={20} />
                            <h2 className="text-lg font-bold text-slate-900">{fr ? 'Signer le contrat' : 'Sign the contract'}</h2>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                                    {fr ? 'Date de naissance' : 'Date of birth'} *
                                </label>
                                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                                    {fr ? 'N° de sécurité sociale (optionnel)' : 'Social-security no. (optional)'}
                                </label>
                                <input type="text" value={ssn} onChange={(e) => setSsn(e.target.value)} maxLength={50}
                                    placeholder={fr ? 'Optionnel' : 'Optional'}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none text-sm" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1.5">
                                {fr ? 'Nom et prénom (signature)' : 'Full name (signature)'} *
                            </label>
                            <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} maxLength={120}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none text-sm" />
                        </div>

                        <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
                            <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-brand-accent" />
                            <span className="text-sm text-slate-600">
                                {fr
                                    ? 'J’ai lu et j’approuve le présent contrat (« Lu et approuvé ») et j’accepte de le signer électroniquement.'
                                    : 'I have read and approve this contract (“Lu et approuvé”) and agree to sign it electronically.'}
                            </span>
                        </label>

                        <button onClick={handleSign} disabled={!canSign}
                            className={`w-full py-4 rounded-2xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-all ${canSign ? 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-lg shadow-brand-accent/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            {fr ? 'Signer le contrat' : 'Sign the contract'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-4">
        <h3 className="font-bold text-slate-900 mb-1.5">{title}</h3>
        <div className="text-slate-700">{children}</div>
    </div>
);
