import React, { useState, useEffect, useRef } from 'react';
import { generateContractPdf } from '../utils/contractPdfGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Baby,
  Clock,
  Euro,
  Calendar,
  CalendarDays,
  FileText,
  Download,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Receipt,
  Award,
  ArrowLeft,
  User as UserIcon,
  Trash2,
  LogOut,
  Loader2,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Plus,
  Video,
  CreditCard,
  Star,
  Check,
  ShieldCheck,
  Lock,
  Landmark,
  Upload
} from 'lucide-react';
import { api, ContractResponse } from '../services/api';
import { SlideToAccept } from './SlideToAccept';
import { useLanguage } from '../i18n/LanguageContext';
import { loadStripe, StripeCardNumberElement } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

interface ContractViewProps {
    userName: string;
    onBack: () => void;
    onAccept: () => void;
    onRefuse: () => void;
    choiceId: number;
    autoShowCongrats?: boolean;
    onCongratsClose?: () => void;
}

const ContractViewInner: React.FC<ContractViewProps> = ({ userName, onBack, onAccept, onRefuse, choiceId, autoShowCongrats, onCongratsClose }) => {
    const { t: trans, language, formatDate, formatNumber, formatCurrency } = useLanguage();
    const t = trans.contract;

    const [contractData, setContractData] = useState<ContractResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showCongratsModal, setShowCongratsModal] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // Payment method selection for the signing modal: card (Stripe), bank transfer, or CESU.
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'cesu'>('card');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const proofInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoShowCongrats) {
            setShowCongratsModal(true);
        }
    }, [autoShowCongrats]);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectError, setRejectError] = useState<string | null>(null);
    const contractRef = useRef<HTMLDivElement>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmColor?: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        confirmColor: 'bg-red-500',
        onConfirm: () => { },
    });

    const stripe = useStripe();
    const elements = useElements();

    // Payment translations using the same structure as App.tsx
    // (We cast to `any` because `t.payment` might not be in the LanguageContext type yet)
    const paymentT = (trans as any).payment || {
        cardNumber: "Numéro de carte",
        expiry: "Expiration",
        cvc: "CVC",
        securityNote: "Vos données de paiement sont cryptées et sécurisées",
        processing: "Traitement en cours...",
        payButton: "Payer {amount}",
        checkout: "Payer et Accepter"
    };

    const handleDownloadPDF = async () => {
        if (!contractData) return;

        try {
            setIsDownloading(true);
            await generateContractPdf(contractData, language, trans, choiceId);
        } catch (err) {
            // PDF generation failed silently
        } finally {
            setIsDownloading(false);
        }
    };

    const getFirstMonthAmount = (): number => {
        if (!contractData || !contractData.format2) return 57.0;
        const months = Object.keys(contractData.format2);
        if (months.length === 0) return 57.0;
        return contractData.format2[months[0]];
    };

    const handleSlideToAcceptAndPay = async () => {
        if (!stripe || !elements || !contractData) return;

        setIsPaymentProcessing(true);
        setPaymentError(null);

        try {
            const amount = Math.round(getFirstMonthAmount());

            // 1. Create Payment Intent
            const intentResponse = await api.createPaymentIntent(amount, contractData?.user?.id);

            const clientSecret = intentResponse.client_secret || intentResponse.clientSecret;

            if (!clientSecret) {
                throw new Error(language === 'fr' ? "Erreur d'initialisation du paiement" : "Payment initialization error");
            }

            // 2. Confirm Card Payment
            const cardNumberElement = elements.getElement(CardNumberElement);
            if (!cardNumberElement) throw new Error("Card element not found");

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                {
                    payment_method: {
                        card: cardNumberElement as unknown as StripeCardNumberElement,
                    }
                }
            );

            if (stripeError) {
                throw new Error(stripeError.message);
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {
                // 3. Confirm on Backend
                const confirmResponse = await api.confirmPayment(paymentIntent.id, contractData.contract_id);

                if (confirmResponse.status) {
                    setIsPaymentProcessing(false);
                    setIsAccepted(true);
                } else {
                    throw new Error(language === 'fr' ? "Erreur lors de la confirmation du contrat" : "Contract confirmation error");
                }
            } else {
                throw new Error(language === 'fr' ? "Le paiement n'a pas été finalisé" : "Payment was not finalized");
            }
        } catch (err: any) {
            setIsPaymentProcessing(false);
            setPaymentError(err.message || "Payment failed");
        }
    };

    // Company payment details shown for manual (non-card) methods.
    const RIB = {
        iban: 'FR76 2823 3000 0150 9805 3550 539',
        bic: 'REVOFRP2',
        accountName: 'ENQAVON SERVICE',
    };
    const CESU_NAN = '1761420';

    const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setProofFile(file);
        setPaymentError(null);
    };

    // Sign the contract via bank transfer / CESU: upload the proof of payment,
    // and on success mark the contract signed (same end state as the card flow).
    const handleManualSignAndPay = async () => {
        if (!contractData) return;
        if (!proofFile) {
            setPaymentError(language === 'fr'
                ? "Veuillez d'abord téléverser votre preuve de paiement."
                : "Please upload your proof of payment first.");
            return;
        }

        setIsPaymentProcessing(true);
        setPaymentError(null);

        try {
            const method = paymentMethod === 'bank' ? 'Bank Transfer' : 'CESU';
            const response = await api.submitPaymentProof(
                contractData.contract_id,
                method,
                getFirstMonthAmount(),
                proofFile,
            );

            if (response.status) {
                setIsPaymentProcessing(false);
                setIsAccepted(true);
            } else {
                throw new Error(response.message || (language === 'fr'
                    ? "Erreur lors de l'envoi de la preuve de paiement"
                    : "Error submitting proof of payment"));
            }
        } catch (err: any) {
            setIsPaymentProcessing(false);
            setPaymentError(err.message || (language === 'fr' ? "L'envoi a échoué" : "Upload failed"));
        }
    };

    useEffect(() => {
        const fetchContract = async () => {
            try {
                setLoading(true);
                const data = await api.getContract(choiceId);

                if (data.status == 0 || data.status == 1 || data.status == 2) {
                    setContractData(data);
                } else {
                    setError(language === 'fr' ? "Impossible de charger les détails du contrat" : "Could not load contract specifics");
                }
            } catch (err) {
                setError(language === 'fr' ? "Erreur lors de la récupération des données" : "Failed to fetch contract data");
            } finally {
                setLoading(false);
            }
        };

        fetchContract();
    }, [choiceId, language]);

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
            <div className="min-h-screen bg-brand-beige flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-brand-blue animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-bold">{t.actions.loading}</p>
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
                    <button onClick={onBack} className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl">
                        {t.actions.back}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-beige py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Navigation */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-brand-blue transition-colors mb-8 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold">{t.actions.back}</span>
                </button>

                {/* Contract Paper */}
                <div
                    ref={contractRef}
                    className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 sm:p-12 mb-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                    <div className="relative z-10">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                                    <FileText size={28} />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
                                    {t.title}
                                </h1>
                            </div>
                            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ID</p>
                                <p className="text-sm font-display font-bold text-slate-700">#CTR-{choiceId}-{contractData?.contract_id}</p>
                            </div>
                        </div>

                        {/* Contract Content */}
                        <div className="space-y-10 max-h-[70vh] overflow-y-auto pr-4 no-scrollbar custom-scroll font-sans text-slate-700 leading-relaxed">

                            {/* Parties */}
                            <section>
                                <h2 className="text-xl font-display font-bold text-slate-900 mb-6 uppercase tracking-wide">
                                    {t.between}
                                </h2>
                                <p className="mb-6 text-sm sm:text-base">
                                    {t.agency}
                                </p>
                                <p className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider">{t.part1}</p>
                                <p className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider">{t.part2}</p>
                                <div className="mb-4 text-sm sm:text-base">
                                    {contractData ? (
                                        <p>
                                            <strong className="text-slate-900">{contractData.user.first_name} {contractData.user.last_name}</strong>
                                            {contractData.user.user_address && (
                                                <span className="mx-1">{t.domiciledAt} {contractData.user.user_address}</span>
                                            )}
                                            {contractData.user.user_phone && (
                                                <span className="mx-1">{t.reachableAt} {contractData.user.user_phone}</span>
                                            )}
                                            {contractData.user.email && (
                                                <span className="mx-1">{language === 'fr' ? 'et' : 'and'} {contractData.user.email}</span>
                                            )}
                                        </p>
                                    ) : (
                                        <strong className="text-slate-900">{userName}</strong>
                                    )}
                                </div>
                                <p className="mb-4 italic text-slate-500 text-sm">{t.clientDesignation}</p>
                                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">{t.partOther}</p>
                            </section>

                            <p className="py-4 border-y border-slate-50 text-center font-medium text-slate-500 italic text-sm">
                                {t.agreedFollowing}
                            </p>

                            {/* Article 1 - Schedule */}
                            <section>
                                <h3 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue text-sm">1</span>
                                    {t.article1.title}
                                </h3>
                                <p className="mb-6 text-sm sm:text-base">{t.article1.content}</p>

                                <div className="space-y-6 mb-8">
                                    {contractData && contractData.format1 ? (
                                        Object.entries(contractData.format1 as Record<string, Record<string, string[]>>).map(([month, dates]) => {
                                            const monthlyHours = getMonthlyHours(dates);
                                            const formattedMonth = formatMonthString(month);
                                            return (
                                                <div key={month} className="bg-slate-50/50 rounded-[24px] p-6 border border-slate-100">
                                                    <h4 className="text-brand-blue font-bold text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                                                        {formattedMonth}
                                                    </h4>
                                                    <div className="space-y-3 mb-4">
                                                        {Object.entries(dates).map(([date, slots]) => (
                                                            <div key={date} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 border-b border-slate-100 last:border-0 gap-1 sm:gap-0">
                                                                <span className="text-sm font-medium text-slate-600 capitalize">
                                                                    {new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                </span>
                                                                <span className="text-xs sm:text-sm font-bold text-brand-blue bg-white px-4 py-1.5 rounded-full border border-brand-blue/10 shadow-sm self-start sm:self-auto">
                                                                    {(slots as string[]).join(' - ')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="text-right text-xs font-bold text-slate-400 border-t border-slate-100 pt-4">
                                                        {t.article1.totalMonth.replace('{month}', formattedMonth)} <span className="text-brand-blue ml-1 font-display text-sm">{formatNumber(monthlyHours, 2)} h</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">{t.actions.loading}</p>
                                    )}
                                </div>
                                <div className="p-5 bg-brand-blue/5 rounded-2xl border border-brand-blue/10 flex justify-between items-center shadow-inner">
                                    <span className="text-slate-700 font-bold text-sm">{t.article1.totalPeriod}</span>
                                    <span className="text-xl font-display font-bold text-brand-blue">
                                        {contractData ?
                                            formatNumber(Object.values(contractData.format1 as Record<string, Record<string, string[]>>).reduce((total: number, monthDates) => total + getMonthlyHours(monthDates as Record<string, string[]>), 0), 2)
                                            : '0,00'} h
                                    </span>
                                </div>
                            </section>

                            {/* Article 2 - Location */}
                            <section>
                                <h3 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue text-sm">2</span>
                                    {t.article2.title}
                                </h3>
                                <p className="text-sm sm:text-base leading-relaxed">{t.article2.content}</p>
                            </section>

                            {/* Article 3 - Duration */}
                            <section>
                                <h3 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue text-sm">3</span>
                                    {t.article3.title}
                                </h3>
                                <p className="mb-6 text-sm sm:text-base leading-relaxed">
                                    {t.article3.content
                                        .replace('{start}', contractData?.start_date ? new Date(contractData.start_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Date]')
                                        .replace('{end}', contractData?.end_date ? new Date(contractData.end_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '[Date]')
                                    }
                                </p>
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article3.subTitle}</h4>
                                    <p className="text-xs sm:text-sm text-slate-500 italic">{t.article3.subContent}</p>
                                </div>
                            </section>

                            {/* Article 4 - Payment Table */}
                            <section>
                                <h3 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue text-sm">4</span>
                                    {t.article4.title}
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article4.subTitle41}</h4>
                                        <p className="mb-4 text-sm sm:text-base leading-relaxed">{t.article4.content}</p>

                                        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                                                    <tr>
                                                        <th className="px-6 py-4">{t.article4.period}</th>
                                                        <th className="px-6 py-4">{t.article4.hrTotal}</th>
                                                        <th className="px-6 py-4">{t.article4.amountTtc}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {contractData && contractData.format2 ? (
                                                        Object.entries(contractData.format2 as Record<string, number>).map(([month, total]) => (
                                                            <tr key={month} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4 font-medium text-slate-700 capitalize">
                                                                    {formatMonthString(month)}
                                                                </td>
                                                                <td className="px-6 py-4 text-slate-500">
                                                                    {formatNumber(getMonthlyHours(contractData.format1[month]), 2)}h
                                                                </td>
                                                                <td className="px-6 py-4 font-bold text-brand-blue">{formatCurrency(total)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">
                                                                {t.actions.loading}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className="bg-brand-blue/5 border-t border-brand-blue/10">
                                                    <tr>
                                                        <td className="px-6 py-4 font-bold text-slate-900">{t.article4.hourlyRate}</td>
                                                        <td colSpan={2} className="px-6 py-4 text-right font-display font-black text-brand-blue text-lg italic">
                                                            {contractData?.hourly_rate ? formatCurrency(contractData.hourly_rate) + '/h' : '-- €/h'}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        <p className="mt-3 text-[10px] text-slate-400 italic italic">{t.article4.taxNote}</p>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                        <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article4.subTitle42}</h4>
                                        <p className="text-xs sm:text-sm text-slate-500 italic leading-relaxed">{t.article4.content42}</p>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                        <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{t.article4.subTitle43}</h4>
                                        <p className="text-xs sm:text-sm text-slate-500 italic leading-relaxed">{t.article4.content43}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Articles 5 to 19 systematically */}
                            {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((num) => {
                                const art = (t as any)[`article${num}`];
                                if (!art) return null;

                                return (
                                    <section key={num}>
                                        <h3 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue text-sm">{num}</span>
                                            {art.title}
                                        </h3>
                                        <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                                            {/* Article specific complex rendering */}
                                            {num === 6 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                </>
                                            )}
                                            {num === 9 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                    <p>{art.content4}</p>
                                                </>
                                            )}
                                            {num === 11 && (
                                                <>
                                                    <p>{art.content}</p>
                                                    <ul className="list-disc pl-5 space-y-2">
                                                        <li>{art.item1}</li>
                                                        <li>{art.item2}</li>
                                                        <li>{art.item3}</li>
                                                    </ul>
                                                </>
                                            )}
                                            {num === 13 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                </>
                                            )}
                                            {num === 14 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                    <p>{art.content4}</p>
                                                    <p>{art.content5}</p>
                                                    <p className="italic font-medium">{art.content6}</p>
                                                </>
                                            )}
                                            {num === 15 && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm mb-1">{art.subTitle151}</h4>
                                                        <p>{art.content151}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm mb-1">{art.subTitle152}</h4>
                                                        <p>{art.content152}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm mb-1">{art.subTitle153}</h4>
                                                        <p>{art.content153}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {num === 16 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                    <p>{art.content4}</p>
                                                    <p>{art.content5}</p>
                                                    <p className="italic font-medium">{art.content6}</p>
                                                </>
                                            )}
                                            {num === 17 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <div className="pl-4 space-y-3">
                                                        <p>{art.itemA}</p>
                                                        <p>{art.itemB}</p>
                                                    </div>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                    <p>{art.content4}</p>
                                                    <p className="italic font-medium">{art.content5}</p>
                                                </>
                                            )}
                                            {num === 18 && (
                                                <>
                                                    <p>{art.content1}</p>
                                                    <p>{art.content2}</p>
                                                    <p>{art.content3}</p>
                                                    <p>{art.content4}</p>
                                                </>
                                            )}
                                            {num === 19 && (
                                                <div className="space-y-6">
                                                    <div className="space-y-3">
                                                        <p>{art.contentA}</p>
                                                        <p>{art.contentB}</p>
                                                        <p>{art.contentC}</p>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                        <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{art.subTitle1}</h4>
                                                        <div className="space-y-2 text-xs sm:text-sm text-slate-500 italic">
                                                            <p>{art.subContent1A}</p>
                                                            <p>{art.subContent1B}</p>
                                                            <p>{art.subContent1C}</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                        <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">{art.subTitle2}</h4>
                                                        <div className="space-y-2 text-xs sm:text-sm text-slate-500 italic">
                                                            <p>{art.subContent2A}</p>
                                                            <p>{art.subContent2B}</p>
                                                            <p>{art.subContent2C}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Simple content for other articles (5, 7, 8, 10, 12) */}
                                            {art.content && ![6, 9, 11, 13, 14, 15, 16, 17, 18, 19].includes(num) && (
                                                <p>{art.content}</p>
                                            )}
                                        </div>
                                    </section>
                                );
                            })}

                            {/* Annex */}
                            <section className="mt-12 pt-12 border-t border-slate-100">
                                <h3 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                                        <FileText size={20} />
                                    </div>
                                    {t.annexe.title}
                                </h3>
                                <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                                    <p>{t.annexe.content1}</p>
                                    <p>{t.annexe.content2}</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>{t.annexe.item1}</li>
                                        <li>{t.annexe.item2}</li>
                                        <li>{t.annexe.item3}</li>
                                        <li>{t.annexe.item4}</li>
                                        <li>{t.annexe.item5}</li>
                                    </ul>
                                    <p className="italic text-slate-500">{t.annexe.content3}</p>
                                    <p>{t.annexe.content4}</p>
                                </div>
                            </section>

                            {/* Signature Line */}
                            <div className="pt-10 border-t border-slate-100 flex flex-col items-end gap-2 text-slate-500">
                                <p className="text-xs">
                                    {t.signatureLocationDate.replace('{date}', new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }))}
                                </p>
                                <div className="flex flex-col items-end">
                                    <p className="font-display font-bold text-brand-blue text-sm italic underline underline-offset-8 decoration-brand-blue/20">
                                        {t.electronicSignature}
                                    </p>
                                    {/* Show signer's name in a handwritten/cursive style when contract is accepted */}
                                    {contractData?.status === 1 && (
                                        <p className="mt-3 text-lg text-slate-800 font-display font-semibold" style={{ fontFamily: "'French Script MT', 'Great Vibes', 'Pacifico', cursive" }}>
                                            {contractData.user.first_name} {contractData.user.last_name}
                                        </p>
                                    )}
                                    <div className="w-32 h-0.5 bg-brand-blue/10 mt-2 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {contractData?.status === 1 ? (
                        <>
                            <div className="flex-1 py-4 bg-green-50 text-green-600 font-bold rounded-2xl border border-green-100 flex items-center justify-center gap-2">
                                <CheckCircle2 size={20} />
                                {language === 'fr' ? 'Accepté' : 'Accepted'}
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isDownloading}
                                className="flex-1 py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue-dark transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Download size={20} />
                                )}
                                {isDownloading
                                    ? (language === 'fr' ? 'Génération...' : 'Generating...')
                                    : (language === 'fr' ? 'Télécharger' : 'Download')
                                }
                            </button>
                        </>
                    ) : contractData?.status === 2 ? (
                        <>
                            <div className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 flex items-center justify-center gap-2">
                                <AlertCircle size={20} />
                                {language === 'fr' ? 'Refusé' : 'Rejected'}
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onBack}
                                className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                {t.actions.back}
                            </button>
                            <button
                                onClick={() => setShowAcceptModal(true)}
                                className="flex-1 py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue-dark transition-all shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {t.actions.accept}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Slide to Accept Modal */}
            <AnimatePresence>
                {showAcceptModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isAccepted && setShowAcceptModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] p-6 sm:p-8 w-full shadow-2xl relative z-10 overflow-x-hidden overflow-y-auto max-h-[92vh] no-scrollbar"
                            style={{ maxWidth: '620px' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                            {!isAccepted ? (
                                <>
                                    <div className="text-center mb-4">
                                        <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue mx-auto mb-2.5 shadow-inner relative">
                                            {isPaymentProcessing ? (
                                                <Loader2 size={24} className="animate-spin text-brand-blue" />
                                            ) : (
                                                <ShieldCheck size={24} />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-display font-bold text-slate-900 mb-2 uppercase tracking-tight">
                                            {isPaymentProcessing ? (paymentT.processing || 'Processing...') : (t.actions as any).slide || 'Sign'}
                                        </h3>
                                        <p className="text-slate-500 text-xs leading-relaxed px-4">
                                            {(t.actions as any).signingSubtitle || (language === 'fr'
                                                ? "En glissant, votre contrat sera signé et votre paiement reçu."
                                                : "By sliding, your contract will be signed and your payment received"
                                            )}
                                        </p>
                                    </div>

                                    {/* Payment body: amount + method on the left, inputs on the right */}
                                    <div className="grid sm:grid-cols-2 gap-5 mb-5 relative z-10 items-start">
                                      {/* LEFT: amount + payment method */}
                                      <div className="space-y-4">
                                        {/* Invoice Section */}
                                        {contractData && contractData.format2 && (
                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium pb-1">{language === 'fr' ? 'Montant du 1er mois' : 'First month amount'}</p>
                                                    <p className="text-sm font-bold text-slate-800 capitalize">{Object.keys(contractData.format2)[0]}</p>
                                                </div>
                                                <div className="text-xl font-display font-bold text-brand-blue">
                                                    {formatCurrency(getFirstMonthAmount())}
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment method selector */}
                                        <div className={`space-y-2 transition-opacity duration-300 ${isPaymentProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                            {([
                                                { key: 'card', label: language === 'fr' ? 'Carte de crédit' : 'Credit card', icon: <CreditCard size={16} /> },
                                                { key: 'bank', label: language === 'fr' ? 'Virement bancaire' : 'Bank transfer', icon: <Landmark size={16} /> },
                                                { key: 'cesu', label: 'CESU', icon: <FileText size={16} /> },
                                            ] as const).map(opt => (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => { setPaymentMethod(opt.key); setPaymentError(null); }}
                                                    className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-xs font-bold transition-all ${paymentMethod === opt.key ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                >
                                                    {opt.icon}
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                      </div>

                                      {/* RIGHT: method-specific inputs */}
                                      <div className="min-w-0">
                                    {/* Card fields */}
                                    {paymentMethod === 'card' && (
                                        <div className={`space-y-4 transition-opacity duration-300 ${isPaymentProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-slate-400">{paymentT.cardNumber}</label>
                                                <div className="relative">
                                                    <div className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 bg-white transition-all">
                                                        <CardNumberElement options={{ style: { base: { fontSize: '14px', color: '#334155', '::placeholder': { color: '#94a3b8' } }, invalid: { color: '#ef4444' } }, disabled: isPaymentProcessing }} />
                                                    </div>
                                                    <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400">{paymentT.expiry}</label>
                                                    <div className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 bg-white transition-all">
                                                        <CardExpiryElement options={{ style: { base: { fontSize: '14px', color: '#334155', '::placeholder': { color: '#94a3b8' } }, invalid: { color: '#ef4444' } }, disabled: isPaymentProcessing }} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400">{paymentT.cvc}</label>
                                                    <div className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 bg-white transition-all">
                                                        <CardCvcElement options={{ style: { base: { fontSize: '14px', color: '#334155', '::placeholder': { color: '#94a3b8' } }, invalid: { color: '#ef4444' } }, disabled: isPaymentProcessing }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
                                                    <Lock size={12} />
                                                    {paymentT.securityNote}
                                                </div>
                                                {paymentError && (
                                                    <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2 text-center max-w-sm mt-2">
                                                        <AlertCircle size={14} className="shrink-0" />
                                                        <span>{paymentError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bank transfer / CESU details + proof of payment upload */}
                                    {paymentMethod !== 'card' && (
                                        <div className={`space-y-3 transition-opacity duration-300 ${isPaymentProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                            {paymentMethod === 'bank' ? (
                                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'fr' ? 'Coordonnées bancaires' : 'Bank details'}</p>
                                                    {[
                                                        { label: 'IBAN', value: RIB.iban },
                                                        { label: 'BIC', value: RIB.bic },
                                                        { label: language === 'fr' ? 'Titulaire' : 'Account', value: RIB.accountName },
                                                    ].map(row => (
                                                        <div key={row.label} className="flex justify-between items-center gap-3">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">{row.label}</span>
                                                            <span className="text-xs font-bold text-slate-700 text-right break-all">{row.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'fr' ? "Numéro d'affiliation national (CESU)" : 'CESU affiliation number'}</p>
                                                    <div className="flex justify-between items-center gap-3">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">NAN</span>
                                                        <span className="text-xs font-bold text-slate-700 text-right break-all">{CESU_NAN}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                                                {language === 'fr'
                                                    ? 'Effectuez votre paiement, puis téléversez votre preuve de paiement pour signer le contrat.'
                                                    : 'Make your payment, then upload your proof of payment to sign the contract.'}
                                            </p>

                                            <input ref={proofInputRef} type="file" accept="image/*,application/pdf" onChange={handleProofChange} className="hidden" disabled={isPaymentProcessing} />
                                            <button
                                                type="button"
                                                onClick={() => proofInputRef.current?.click()}
                                                disabled={isPaymentProcessing}
                                                className={`w-full rounded-xl border-2 border-dashed px-4 py-4 flex flex-col items-center justify-center gap-1.5 transition-colors ${proofFile ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-brand-blue/40 bg-white'}`}
                                            >
                                                {proofFile ? (
                                                    <>
                                                        <CheckCircle2 size={20} className="text-green-500" />
                                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">{proofFile.name}</span>
                                                        <span className="text-[10px] text-slate-400">{language === 'fr' ? 'Cliquer pour changer' : 'Click to change'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={20} className="text-slate-400" />
                                                        <span className="text-xs font-bold text-slate-500">{language === 'fr' ? 'Téléverser la preuve de paiement' : 'Upload proof of payment'}</span>
                                                        <span className="text-[10px] text-slate-400">{language === 'fr' ? 'Image ou PDF' : 'Image or PDF'}</span>
                                                    </>
                                                )}
                                            </button>

                                            {paymentError && (
                                                <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2">
                                                    <AlertCircle size={14} className="shrink-0" />
                                                    <span>{paymentError}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                      </div>
                                    </div>

                                    <div className={`px-2 transition-opacity duration-300 relative z-10 ${isPaymentProcessing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                        <SlideToAccept
                                            onAccept={paymentMethod === 'card' ? handleSlideToAcceptAndPay : handleManualSignAndPay}
                                            text={(t.actions as any).signingSlider || (language === 'fr' ? 'Glisser pour signer' : 'Slide to sign')}
                                            reset={!!paymentError && !isPaymentProcessing}
                                        />
                                    </div>

                                    <button
                                        onClick={() => setShowAcceptModal(false)}
                                        disabled={isPaymentProcessing}
                                        className={`w-full mt-4 text-slate-400 font-bold text-sm tracking-wide transition-colors relative z-10 ${isPaymentProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-600'}`}
                                    >
                                        {paymentT.cancel || (language === 'fr' ? 'Annuler' : 'Cancel')}
                                    </button>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-4 relative z-10"
                                >
                                    <div className="w-24 h-24 bg-green-50 rounded-[40px] flex items-center justify-center text-green-500 mx-auto mb-8 shadow-[0_10px_40px_-10px_rgba(34,197,94,0.3)]">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <h3 className="text-3xl font-display font-bold text-slate-900 mb-3">
                                        {t.actions.success}
                                    </h3>
                                    <p className="text-slate-500 mb-10 font-medium text-sm leading-relaxed px-4">
                                        {paymentMethod === 'card'
                                            ? (language === 'fr'
                                                ? "Votre contrat a été signé électroniquement avec succès et le paiement a été traité."
                                                : "Your contract has been successfully signed electronically and payment processed.")
                                            : (language === 'fr'
                                                ? "Votre contrat a été signé électroniquement avec succès. Votre preuve de paiement a bien été reçue et sera vérifiée par notre équipe."
                                                : "Your contract has been successfully signed electronically. Your proof of payment has been received and will be verified by our team.")
                                        }
                                    </p>
                                    <button
                                        onClick={onAccept}
                                        className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue-dark transition-all shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]"
                                    >
                                        Back to Dashboard
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Loading Modal */}
            <AnimatePresence>
                {isDownloading && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl relative z-10 overflow-hidden text-center"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                            <div className="relative mb-8">
                                <div className="w-20 h-20 border-4 border-brand-blue/10 border-t-brand-blue rounded-full animate-spin mx-auto shadow-inner" />
                                <div className="absolute inset-0 flex items-center justify-center text-brand-blue">
                                    <Download size={28} className="animate-pulse" />
                                </div>
                            </div>

                            <h3 className="text-xl font-display font-bold text-slate-900 mb-2 uppercase tracking-tight">
                                {language === 'fr' ? 'Préparation du PDF...' : 'Preparing PDF...'}
                            </h3>
                            <p className="text-slate-500 text-xs leading-relaxed px-4">
                                {language === 'fr'
                                    ? "Nous préparons votre contrat pour le téléchargement. Cela ne prendra que quelques instants."
                                    : "We are preparing your contract for download. This will only take a moment."
                                }
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reject success modal */}
            <AnimatePresence>
                {showRejectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRejectModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            className="bg-white rounded-[28px] p-8 w-full max-w-sm shadow-2xl relative z-10 text-center"
                        >
                            {!rejectError ? (
                                <>
                                    <div className="w-20 h-20 bg-green-50 rounded-full mx-auto flex items-center justify-center mb-4">
                                        <Check size={28} className="text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-slate-900 mb-2">
                                        {language === 'fr' ? 'Contrat refusé' : 'Contract rejected'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        {language === 'fr'
                                            ? "Le contrat a été refusé avec succès."
                                            : 'The contract was rejected successfully.'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-red-50 rounded-full mx-auto flex items-center justify-center mb-4">
                                        <AlertCircle size={28} className="text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-slate-900 mb-2">
                                        {language === 'fr' ? 'Erreur' : 'Error'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        {rejectError}
                                    </p>
                                </>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowRejectModal(false); onRefuse(); }}
                                    className="w-full py-3 bg-brand-blue text-white font-bold rounded-2xl"
                                >
                                    {language === 'fr' ? 'Fermer' : 'Close'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`w-12 h-12 ${confirmModal.iconType === 'success' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-red-50 text-red-500'} rounded-2xl flex items-center justify-center border border-slate-50 shadow-sm`}>
                                        {confirmModal.iconType === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                    </div>
                                    <button
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <h3 className="text-xl font-display font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                                <p className="text-slate-500 mb-8 whitespace-pre-line leading-relaxed font-bold">
                                    {confirmModal.message}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                                    >
                                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            confirmModal.onConfirm();
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }}
                                        className={`flex-1 px-6 py-3 ${confirmModal.confirmColor || 'bg-brand-accent'} text-white font-bold rounded-2xl hover:opacity-90 transition-colors shadow-lg`}
                                    >
                                        {language === 'fr' ? 'Confirmer' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scroll::-webkit-scrollbar {
                  width: 5px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                  background: #f8fafc;
                  border-radius: 10px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                  background: #e2e8f0;
                  border-radius: 10px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                  background: #cbd5e1;
                }
            `}</style>
            <AnimatePresence>
                {showCongratsModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowCongratsModal(false);
                                onCongratsClose?.();
                            }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden text-center p-8"
                        >
                            <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Star size={40} className="text-brand-accent animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-slate-800 mb-4">{t.actions.congrats.title}</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                {t.actions.congrats.subtitle}
                            </p>
                            <button
                                onClick={() => {
                                    setShowCongratsModal(false);
                                    onCongratsClose?.();
                                }}
                                className="w-full py-4 bg-brand-accent text-white font-bold rounded-2xl hover:bg-brand-accent/90 transition-all shadow-lg shadow-brand-accent/20 active:scale-[0.98]"
                            >
                                {t.actions.congrats.ok}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};




export const ContractView: React.FC<ContractViewProps> = (props) => (
    <Elements stripe={stripePromise}>
        <ContractViewInner {...props} />
    </Elements>
);
