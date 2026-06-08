import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { api, User, Invoice, Attestation } from '../services/api';
import { interviewRoomUrl } from '../utils/interview';
import { InvoicePaymentModal } from './InvoicePaymentModal';
import { AddCardModal } from './AddCardModal';
import { StatusBadge } from './StatusBadge';

interface ProfilePageProps {
  onBack: () => void;
  onLogout: () => void;
  onModifyRequest: (request: any) => void;
  onGoToAdmin: () => void;
  onCreateRequest: () => void;
  onViewContract?: (choiceId: number, autoShowCongrats?: boolean) => void;
  onUserLoaded?: (user: User) => void;
  initialTab?: 'requests' | 'invoices' | 'tax' | 'cmg';
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBack,
  onLogout,
  onModifyRequest,
  onGoToAdmin,
  onCreateRequest,
  onViewContract,
  onUserLoaded,
  initialTab = 'requests'
}) => {
  const { t, language, formatDate, formatNumber, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState<'requests' | 'invoices' | 'tax' | 'cmg'>(initialTab);
  const [user, setUser] = useState<User | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [invoiceSubTab, setInvoiceSubTab] = useState<'invoices' | 'cards'>('invoices');
  const [cmgValue, setCmgValue] = useState('');
  const [isCmgUpdating, setIsCmgUpdating] = useState(false);
  const [cmgMessage, setCmgMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmColor?: string;
    iconType?: 'warning' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmColor: 'bg-red-500',
    iconType: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => { },
  });
  const [rejectingChoice, setRejectingChoice] = useState<number | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.getUser();
        if (response.status && response.data) {
          const userData = response.data;
          // Merge cards into user data if present at root
          if (response.cards) {
            userData.cards = response.cards;
          }
          setUser(userData);
          setCmgValue(userData.cmg_num || '');
          onUserLoaded?.(userData);

          if (userData.email === 'ponctuel@bloom-buddies.fr') {
            onGoToAdmin();
          }
        } else {
          // Do NOT auto-logout on a 401/expired token — keep the session so a
          // transient or expired-token response doesn't bounce the user to login.
          // They can log out explicitly via the Logout button.
          console.error('Fetch user failed with status:', response.code, response.message);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [onLogout, onGoToAdmin]);

  useEffect(() => {
    const fetchAttestations = async () => {
      try {
        const response = await api.getAttestations();
        if (response && response.data) {
          setAttestations(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch attestations:', error);
      }
    };

    fetchAttestations();
  }, []);



  const handleRemoveRequest = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'fr' ? 'Supprimer la demande' : 'Remove Request',
      message: language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette demande ?' : 'Are you sure you want to remove this request?',
      confirmColor: 'bg-red-500',
      iconType: 'warning',
      confirmText: t.modals.confirmSelection.confirm,
      cancelText: t.modals.confirmSelection.cancel,
      onConfirm: async () => {
        if (!user) return;

        const res = await api.removeParentRequest(Number(id));

        if (res.status) {
          // ✓ update UI only if API success
          setUser({
            ...user,
            parent_requests: user.parent_requests?.filter(
              (req) => req.id.toString() !== id
            ),
          });
        } else {
          // ✖ handle error (you can improve this)
          alert(res.message || 'Failed to delete request');
        }
      },
    });
  };

  const handleFinalChoice = (choiceId: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.modals.confirmSelection.hireTitle,
      message: t.modals.confirmSelection.hireSubtitle,
      confirmColor: 'bg-brand-accent',
      iconType: 'success',
      confirmText: t.modals.confirmSelection.confirm,
      cancelText: t.modals.confirmSelection.cancel,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const response = await api.selectFinalChoice(choiceId);
          if (response.status) {
            const userResponse = await api.getUser();
            if (userResponse.status && userResponse.data) {
              setUser(userResponse.data);
              // Auto-redirect to contract with congratulations pop-up
              setTimeout(() => {
                onViewContract?.(choiceId, true);
              }, 500);
            }
          }
        } catch (error) {
          console.error('Final choice selection failed:', error);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };
  const handleUndoRejection = async (choiceId: number) => {
    try {
      setIsLoading(true);
      // Reset final_choice to 0 (Pending) using the update API
      const response = await api.updateBabysitterChoice(choiceId, { final_choice: 0 });
      if (response.status) {
        const userResponse = await api.getUser();
        if (userResponse.status && userResponse.data) {
          setUser(userResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to undo rejection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultCard = async (paymentMethodId: string) => {
    try {
      setIsLoading(true);
      const response = await api.setDefaultCard(paymentMethodId);
      if (response.status) {
        const userResponse = await api.getUser();
        if (userResponse.status && userResponse.data) {
          const userData = userResponse.data;
          if (userResponse.cards) {
            userData.cards = userResponse.cards;
          }
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Failed to set default card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = (paymentMethodId: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'fr' ? 'Supprimer la carte' : 'Delete Card',
      message: language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette carte ?' : 'Are you sure you want to delete this card?',
      confirmColor: 'bg-red-500',
      iconType: 'warning',
      confirmText: t.modals.confirmSelection.confirm,
      cancelText: t.modals.confirmSelection.cancel,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const response = await api.deleteCard(paymentMethodId);
          if (response.status) {
            const userResponse = await api.getUser();
            if (userResponse.status && userResponse.data) {
              const userData = userResponse.data;
              if (userResponse.cards) {
                userData.cards = userResponse.cards;
              }
              setUser(userData);
            }
          }
        } catch (error) {
          console.error('Failed to delete card:', error);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const invoices = user?.invoices || [];

  const handleDownloadAttestation = (fileName: string) => {
    const link = document.createElement('a');
    link.href = `/certificates/${fileName}`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  };


  const taxCertificatesToDisplay = attestations.length > 0 ? attestations.map(a => ({

    id: a.id,
    year: a.year,
    type: language === 'fr' ? 'Attestation Fiscale Annuelle' : 'Annual Tax Certificate',
    file: a.file
  })) : [];


  const tabs = [
    { id: 'requests', label: t.profilePage.tabs.requests, icon: Baby },
    { id: 'cmg', label: t.profilePage.tabs.cmg || 'CMG', icon: ShieldCheck },
    { id: 'invoices', label: t.profilePage.tabs.invoices, icon: Receipt },
    { id: 'tax', label: t.profilePage.tabs.tax, icon: FileText },

  ];

  const calculateTotalHours = (schedules?: any[]) => {
    if (!schedules) return 0;
    let totalMinutes = 0;
    schedules.forEach(schedule => {
      schedule.slots?.forEach((slot: any) => {
        const [startH, startM] = slot.start_time.split(':').map(Number);
        const [endH, endM] = slot.end_time.split(':').map(Number);
        totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
      });
    });
    return totalMinutes / 60;
  };

  const formatBillingMonth = (dateString?: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-brand-accent animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      {/* Creative Header */}
      <div className="relative mb-16">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onCreateRequest}
                className="inline-flex items-center gap-3 px-6 py-2.5 bg-brand-accent text-white rounded-full shadow-lg shadow-brand-accent/20 hover:bg-[#66B2AC] hover:-translate-y-0.5 transition-all group"
              >
                <Plus size={16} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t.profilePage.createRequest}</span>
              </button>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-slate-900 tracking-tight">
              {t.profilePage?.title?.split(' ')[0] || 'VOTRE'}
              <span className="text-brand-accent">.</span>
              <span className="block text-xl md:text-3xl text-slate-400 font-medium mt-1 leading-tight">{t.profilePage?.subtitle}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-2 pr-4 sm:pr-6 rounded-[24px] sm:rounded-[32px] border border-white shadow-xl shadow-slate-200/50">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-accent rounded-[18px] sm:rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-brand-accent/30 shrink-0">
              <UserIcon size={24} className="sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-brand-accent tracking-wide mb-0.5 truncate">
                {language === 'fr' ? 'Famille Bloom' : 'Bloom Family'}
              </p>
              <p className="text-lg sm:text-xl font-display font-bold text-slate-800 truncate">{user?.first_name} {user?.last_name}</p>
              {user?.children && user.children.length > 0 && (
                <p className="text-[10px] text-slate-400 font-medium">
                  {user.children.length} {user.children.length > 1 ? t.common.children : t.common.child}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Children Section */}
      {user?.children && user.children.length > 0 && (
        <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {user.children.map((child, idx) => (
            <div key={child.id || idx} className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                <Baby size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Child {idx + 1}</p>
                <p className="text-sm font-bold text-slate-800">{child.child_dob}</p>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Minimal Inline Tab Navigation */}
      <div className="relative mb-12 border-b border-slate-100">
        <style dangerouslySetInnerHTML={{
          __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ` }} />
        <div className="flex items-center overflow-x-auto no-scrollbar gap-8 scroll-smooth">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 transition-all relative whitespace-nowrap group ${isActive ? 'text-brand-accent' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <Icon size={16} className={isActive ? 'text-brand-accent' : 'text-slate-400 group-hover:text-slate-500'} />
                <span className="text-sm font-bold tracking-tight">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {user?.parent_requests && user.parent_requests.length > 0 ? (
                  user.parent_requests.map((req) => (
                    <div key={req.id} className="group bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 relative">
                      <div className="space-y-10">
                        {/* Compact Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-[16px] sm:rounded-[20px] flex items-center justify-center text-slate-400 group-hover:bg-brand-accent group-hover:text-white transition-all duration-500 shadow-sm">
                              <Baby size={24} className="sm:w-7 sm:h-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                <span className="text-lg sm:text-xl font-display font-bold text-slate-900 tracking-tight">REQ-{req.id}</span>
                                {(() => {
                                  const hasSchedules = req.schedules && req.schedules.length > 0;
                                  const hasSlots = hasSchedules && req.schedules.every((s: any) => s.slots && s.slots.length > 0);
                                  const hasChoices = req.choices && req.choices.length > 0;
                                  const isActive = hasSchedules && hasSlots && hasChoices;

                                  const status = req.request_current_status || (isActive ? 'active' : 'new');
                                  return <StatusBadge status={status} />;
                                })()}
                              </div>
                              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                                Created on {req.created_at ? new Date(req.created_at).toLocaleDateString('en-GB') : '--'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={() => onModifyRequest(req)}
                              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900 text-white text-[10px] sm:text-xs font-bold rounded-xl sm:rounded-2xl hover:bg-brand-accent transition-all shadow-lg shadow-slate-900/10 hover:shadow-brand-accent/20 flex items-center justify-center gap-2"
                            >
                              {t.common.modify} <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveRequest(req.id.toString())}
                              className="p-2.5 bg-slate-50 sm:bg-transparent text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl sm:rounded-2xl transition-all"
                              title="Remove Request"
                            >
                              <Trash2 size={18} className="sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 p-5 sm:p-8 bg-slate-50/50 rounded-[28px] sm:rounded-[32px] border border-slate-100/50">
                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.profilePage.requests.children}</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900">{req.children?.length || 0}</p>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">Kids</span>
                            </div>
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.profilePage.requests.hours}</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900">{formatNumber(calculateTotalHours(req.schedules), 2)}</p>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">Hrs</span>
                            </div>
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.profilePage.requests.amount}</p>
                            <p className="text-xl sm:text-3xl font-display font-bold text-brand-accent truncate">
                              {formatCurrency((calculateTotalHours(req.schedules) || 0) * 27.99)}
                            </p>
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Schedules</p>
                            <div className="flex items-baseline gap-1">
                              <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900">{req.schedules?.length || 0}</p>
                              <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">Days</span>
                            </div>
                          </div>
                        </div>

                        {/* Booking Calendar Section */}
                        {req.schedules && req.schedules.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={16} className="text-brand-accent" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.profilePage.requests.calendar || 'Booking Calendar'}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {req.schedules.map((s: any) => (
                                <div key={s.id} className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-accent/20 transition-colors">
                                  <span className="text-[10px] sm:text-xs font-bold text-slate-900">
                                    {new Date(s.schedule_date).toLocaleDateString('en-GB')}
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    {s.slots?.map((slot: any) => (
                                      <div key={slot.id} className="flex items-center gap-1.5 sm:gap-2">
                                        <Clock size={10} className="text-slate-300" />
                                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-tight">
                                          {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Babysitter Interviews Section */}
                        {req.choices && req.choices.length > 0 && (
                          <div className="pt-10 border-t border-slate-100">
                            {req.choices.some((c: any) => c.status === 'proposed') && !req.choices.some((c: any) => c.status === 'selected') && (
                              <div className="mb-8 p-5 sm:p-6 rounded-[24px] bg-brand-accent/5 border border-brand-accent/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="font-display font-bold text-slate-800">{language === 'fr' ? 'Vos candidates sont prêtes !' : 'Your candidates are ready!'}</p>
                                  <p className="text-sm text-slate-500 leading-snug mt-0.5">{language === 'fr' ? 'Choisissez les babysitters que vous souhaitez rencontrer et planifiez vos entretiens.' : 'Choose the babysitters you’d like to meet and schedule your interviews.'}</p>
                                </div>
                                <a href={`/match/${req.id}`} className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-brand-accent text-white font-bold rounded-2xl hover:bg-[#66B2AC] transition-all shadow-lg shadow-brand-accent/20 text-sm whitespace-nowrap">
                                  {language === 'fr' ? 'Choisir mes babysitters' : 'Choose my babysitters'} <ChevronRight size={16} />
                                </a>
                              </div>
                            )}
                            <div className="flex items-start sm:items-center justify-between gap-4 mb-8">
                              <div className="space-y-1 min-w-0">
                                <h3 className="text-lg font-display font-bold text-slate-800">{t.profilePage.interviews.sectionTitle}</h3>
                                <p className="text-sm text-slate-500 leading-tight">{t.profilePage.interviews.sectionSubtitle}</p>
                              </div>
                              <div className="px-3 py-1.5 bg-brand-blue/10 rounded-full shrink-0 whitespace-nowrap self-start sm:self-center">
                                <span className="text-[9px] font-bold text-brand-blue uppercase tracking-wider">{req.choices.length} Candidates</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              {req.choices.map((choice: any) => (
                                <div key={choice.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group/choice relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover/choice:bg-brand-accent/10 transition-colors" />

                                  <div className="relative flex items-center sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                                    <div className="w-14 min-w-[56px] h-14 sm:w-16 sm:min-w-[64px] sm:h-16 bg-slate-50 flex items-center justify-center text-brand-accent group-hover/choice:bg-brand-accent group-hover/choice:text-white transition-all duration-500 shadow-inner shrink-0 overflow-hidden rounded-2xl">
                                      {choice.babysitter_pic ? (
                                        <img 
                                          src={`https://bloom-buddies.fr/uploads/profile_images/${choice.babysitter_pic}`} 
                                          alt={`${choice.babysitter_first_name}`}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <UserIcon size={24} className="sm:w-7 sm:h-7" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-base sm:text-lg font-display font-bold text-slate-900 truncate mb-1">
                                        <a
                                          href={`https://bloom-buddies.fr/babysitter/${choice.bb_bs_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:underline"
                                        >
                                          {choice.babysitter_first_name} {choice.babysitter_last_name}
                                        </a>
                                      </p>
                                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
                                        <div className="w-fit px-2 py-0.5 sm:px-2.5 sm:py-1 bg-brand-blue/5 rounded-lg flex items-center gap-1.5 self-start">
                                          <Calendar size={10} className="text-brand-blue sm:w-3 sm:h-3" />
                                          <span className="text-[9px] sm:text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                                            {choice.interview_date
                                              ? new Date(choice.interview_date).toLocaleDateString('en-GB')
                                              : '--'} @ {choice.interview_time?.substring(0, 5)} ({language === 'fr' ? 'heure de Paris' : 'Paris time'})
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                          {choice.babysitter_phone && (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                              <Phone size={12} className="text-slate-300 sm:w-3.5 sm:h-3.5" />
                                              <span className="text-[10px] sm:text-xs font-medium">{choice.babysitter_phone}</span>
                                            </div>
                                          )}
                                          {choice.babysitter_email && (
                                            <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                                              <Mail size={12} className="text-slate-300 sm:w-3.5 sm:h-3.5" />
                                              <span className="text-[10px] sm:text-xs font-medium truncate">{choice.babysitter_email}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="relative z-10 flex items-center wrap gap-3 shrink-0 self-end sm:self-center w-full sm:w-auto">
                                    {Number(choice.final_choice) === 1 ? (
                                      <button
                                        onClick={() => onViewContract?.(choice.id)}
                                        className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-brand-accent/10 text-brand-accent font-bold rounded-xl sm:rounded-2xl hover:bg-brand-accent hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm hover:shadow-brand-accent/20 text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-2"
                                      >
                                        <FileText size={14} className="sm:w-4 sm:h-4" />
                                        {t.profilePage.interviews.viewContract}
                                      </button>
                                    ) : req.choices?.some((c: any) => Number(c.final_choice) === 1) ? null : (
                                      <>
                                        {Number(choice.final_choice) !== 2 && (
                                          <>
                                            {choice.interview_date ? (
                                              <a
                                                href={interviewRoomUrl(choice.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-brand-accent/10 text-brand-accent font-bold rounded-xl sm:rounded-2xl hover:bg-brand-accent hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm hover:shadow-brand-accent/20 text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-2"
                                              >
                                                <Video size={14} className="sm:w-4 sm:h-4" />
                                                {t.profilePage.interviews.joinMeeting}
                                              </a>
                                            ) : (
                                              <button
                                                disabled
                                                className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-100 text-slate-400 font-bold rounded-xl sm:rounded-2xl cursor-not-allowed opacity-60 text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-2"
                                              >
                                                <Video size={14} className="sm:w-4 sm:h-4" />
                                                {t.profilePage.interviews.joinMeeting}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleFinalChoice(choice.id, `${choice.babysitter_first_name} ${choice.babysitter_last_name}`)}
                                              className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-brand-accent/10 text-brand-accent font-bold rounded-xl sm:rounded-2xl hover:bg-brand-accent hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm hover:shadow-brand-accent/20 text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-2"
                                            >
                                              <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                                              {t.profilePage.interviews.finalChoice || 'Hire'}
                                            </button>
                                          </>
                                        )}
                                        {Number(choice.final_choice) === 2 ? (
                                          <div className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-red-50 text-red-500 font-bold rounded-xl sm:rounded-2xl border border-red-100 text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-2 cursor-not-allowed">
                                            <X size={14} className="sm:w-4 sm:h-4" />
                                            {language === 'fr' ? 'Refusé' : 'Rejected'}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setConfirmModal({
                                                isOpen: true,
                                                title: language === 'fr' ? 'Refuser le choix' : 'Reject Choice',
                                                message:
                                                  language === 'fr'
                                                    ? 'Êtes-vous sûr de vouloir refuser ce choix ?'
                                                    : 'Are you sure you want to reject this choice?',
                                                confirmColor: 'bg-red-500',
                                                onConfirm: async () => {
                                                  setRejectingChoice(choice.id);

                                                  try {
                                                    const resp = await api.rejectChoice(choice.id);

                                                    if (resp && resp.status) {
                                                      // ✓ refresh user data
                                                      const userResp = await api.getUser();
                                                      if (userResp.status && userResp.data) {
                                                        setUser(userResp.data);
                                                      }
                                                    } else {
                                                      console.error('Reject choice failed', resp.message);
                                                      alert(resp.message || 'Failed to reject choice');
                                                    }
                                                  } catch (err) {
                                                    console.error('Reject call error', err);
                                                    alert('Something went wrong');
                                                  } finally {
                                                    setRejectingChoice(null);
                                                  }
                                                },
                                              });
                                            }}
                                            disabled={rejectingChoice === choice.id}
                                            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-3.5 bg-red-500/10 text-red-500 font-bold rounded-xl sm:rounded-2xl hover:bg-red-500 hover:text-white hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm hover:shadow-red-500/10 text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-2"
                                          >
                                            {rejectingChoice === choice.id ? (
                                              <div className="flex items-center gap-2">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-xs">
                                                  {language === 'fr' ? 'Refus...' : 'Rejecting...'}
                                                </span>
                                              </div>
                                            ) : (
                                              <>
                                                <X size={16} />
                                                {t.profilePage.interviews.reject}
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-32 bg-white rounded-[48px] border-2 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                      <Baby size={40} />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">{t.profilePage.requests.noRequests}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-6">
                {/* Sub-tab Toggle */}
                <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/50">
                  <button
                    onClick={() => setInvoiceSubTab('invoices')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${invoiceSubTab === 'invoices'
                      ? 'bg-white text-brand-accent shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {t.profilePage.tabs.invoices}
                  </button>
                  <button
                    onClick={() => setInvoiceSubTab('cards')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${invoiceSubTab === 'cards'
                      ? 'bg-white text-brand-accent shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {language === 'fr' ? 'Gestion des cartes' : 'Card Management'}
                  </button>
                </div>

                {invoiceSubTab === 'invoices' ? (
                  <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-bottom border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.profilePage.invoices.number}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.profilePage.invoices.date}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.profilePage.invoices.amount}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.profilePage.invoices.billingMonth}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.profilePage.invoices.status}</th>
                            <th className="px-6 py-4 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {invoices.length > 0 ? (
                            invoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700 text-sm">{inv.invoice_num}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">{inv.due_date
                                  ? new Date(inv.due_date).toLocaleDateString('en-GB')
                                  : '--'}</td>
                                <td className="px-6 py-4 font-bold text-slate-800 text-sm">{formatCurrency(parseFloat(inv.amount))}</td>
                                <td className="px-6 py-4 text-slate-600 text-sm font-medium capitalize">{formatBillingMonth(inv.due_date)}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inv.payment_status === 'Paid'
                                    ? 'bg-green-50 text-green-600 border border-green-100'
                                    : inv.payment_status === 'Suspended'
                                      ? 'bg-red-50 text-red-600 border border-red-100'
                                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                                    }`}>
                                    {inv.payment_status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {inv.payment_status === 'Paid' ? (
                                    <button
                                      onClick={async () => {
                                        const { generateInvoicePdf } = await import('../utils/invoicePdfGenerator');
                                        if (user) {
                                          generateInvoicePdf(inv, user, language, t);
                                        }
                                      }}
                                      className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-xl transition-colors inline-flex items-center gap-2 text-xs font-bold"
                                    >
                                      <Download size={14} />
                                      <span className="hidden sm:inline">{t.profilePage.invoices.download}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedInvoice(inv);
                                        setIsInvoiceModalOpen(true);
                                      }}
                                      className="px-4 py-2 bg-brand-accent text-white rounded-xl hover:bg-[#66B2AC] transition-all text-xs font-bold shadow-sm"
                                    >
                                      {language === 'fr' ? 'Payer' : 'Pay'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center">
                                <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium">{t.profilePage.invoices.noInvoices}</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-slate-800">
                        {language === 'fr' ? 'Mes Cartes Enregistrées' : 'My Saved Cards'}
                      </h4>
                      <button
                        onClick={() => setIsAddCardModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white font-bold rounded-2xl hover:bg-brand-accent/90 transition-all shadow-lg shadow-brand-accent/20"
                      >
                        <Plus size={18} />
                        {language === 'fr' ? 'Ajouter une carte' : 'Add Card'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {user?.cards?.data && user.cards.data.length > 0 ? (
                        user.cards.data.map((card) => (
                          <div key={card.id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-brand-accent/10 transition-colors" />

                            <div className="relative flex items-center justify-between mb-8">
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-all duration-500 shadow-inner">
                                <CreditCard size={28} />
                              </div>
                              <div className="px-3 py-1 bg-brand-accent/10 rounded-full">
                                <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest">{card.card.brand}</span>
                              </div>
                            </div>

                            <div className="relative space-y-4">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Card Number</p>
                                <p className="text-2xl font-display font-bold text-slate-900 tracking-wider">
                                  •••• •••• •••• {card.card.last4}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">{language === 'fr' ? 'Expire' : 'Expires'}</p>
                                  <p className="text-sm font-bold text-slate-800">{String(card.card.exp_month).padStart(2, '0')}/{card.card.exp_year}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Type</p>
                                  <p className="text-sm font-bold text-slate-800 capitalize">{card.card.funding}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-4">
                                {user?.default_payment_method === card.id ? (
                                  <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-accent/10 rounded-xl text-brand-accent">
                                    <Star size={16} className="fill-brand-accent" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                      {language === 'fr' ? 'Par défaut' : 'Default'}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleSetDefaultCard(card.id)}
                                    className="flex-1 px-4 py-2.5 bg-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-brand-accent hover:text-white transition-all flex items-center justify-center gap-2"
                                  >
                                    <Star size={14} />
                                    {language === 'fr' ? 'Par défaut' : 'Set Default'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteCard(card.id)}
                                  className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all group/delete"
                                  title={language === 'fr' ? 'Supprimer' : 'Delete'}
                                >
                                  <Trash2 size={14} className="group-hover/delete:scale-110 transition-transform" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                          <CreditCard size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-medium">No saved cards found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tax' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {taxCertificatesToDisplay.length > 0 ? (
                  taxCertificatesToDisplay.map((cert) => (
                    <div key={cert.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-accent/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-pink/10 rounded-2xl flex items-center justify-center text-brand-pink">
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{cert.type}</p>
                          <p className="text-xs text-slate-400">{t.profilePage.tax.year} {cert.year}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAttestation(cert.file)}
                        className="p-3 bg-slate-50 text-slate-400 group-hover:bg-brand-accent group-hover:text-white rounded-2xl transition-all"
                      >
                        <Download size={18} />
                      </button>

                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                    <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">{t.profilePage.tax.noCertificates}</p>
                  </div>
                )}
              </div>
            )}


            {activeTab === 'cmg' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                  <div className="relative space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-accent/10 rounded-[24px] flex items-center justify-center text-brand-accent shadow-sm">
                        <ShieldCheck size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                          {(t.profilePage as any).cmg?.title || 'CAF Numéro allocataire'}
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">{(t.profilePage as any).cmg?.subtitle || 'Renseigner votre numéro allocataire CAF.'}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">
                          {(t.profilePage as any).cmg?.fieldLabel || 'Votre numéro CMG'}
                        </label>
                        <div className="relative group">
                          <input
                            type="text"
                            value={cmgValue}
                            onChange={(e) => setCmgValue(e.target.value)}
                            placeholder={(t.profilePage as any).cmg?.placeholder || 'ex. abc123456'}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:bg-white transition-all group-hover:border-slate-200"
                          />
                        </div>
                      </div>

                      {cmgMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl flex items-center gap-3 ${cmgMessage.type === 'success'
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                            }`}
                        >
                          {cmgMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                          <span className="text-xs font-bold">{cmgMessage.text}</span>
                        </motion.div>
                      )}

                      <button
                        onClick={async () => {
                          try {
                            setIsCmgUpdating(true);
                            setCmgMessage(null);
                            const response = await api.updateCmg(cmgValue);
                            if (response.status) {
                              setCmgMessage({
                                text: (t.profilePage as any).cmg?.updateSuccess || 'Numéro CMG mis à jour avec succès',
                                type: 'success'
                              });
                              // Refresh user data to sync
                              const userRes = await api.getUser();
                              if (userRes.status && userRes.data) {
                                setUser(userRes.data);
                              }
                            } else {
                              setCmgMessage({ text: response.message || 'Error updating CMG', type: 'error' });
                            }
                          } catch (error) {
                            setCmgMessage({ text: 'An unexpected error occurred', type: 'error' });
                          } finally {
                            setIsCmgUpdating(false);
                          }
                        }}
                        disabled={isCmgUpdating}
                        className={`w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/10 hover:bg-brand-accent hover:shadow-brand-accent/20 transition-all flex items-center justify-center gap-3 ${isCmgUpdating ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                      >
                        {isCmgUpdating ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Check size={20} />
                        )}
                        {(t.profilePage as any).cmg?.submit || 'Enregistrer'}
                      </button>
                    </div>

                    <div className="pt-8 border-t border-slate-50">
                      <div className="flex items-start gap-4 p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/10">
                        <div className="mt-1 text-brand-blue">
                          <AlertCircle size={16} />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {(t.profilePage as any).cmg?.description || 'Votre numéro allocataire est important pour la transmission de vos données de garde afin d\'avoir vos remboursements CAF.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Support Banner */}
      <div className="mt-12 bg-brand-blue/10 rounded-[32px] p-8 border border-brand-blue/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.open('https://wa.me/33780857676', '_blank')}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-blue shadow-sm hover:bg-brand-blue hover:text-white transition-colors"
            aria-label="Open WhatsApp support"
            title="WhatsApp Support"
          >
            <MessageCircle size={24} />
          </button>
          <div>
            <p className="font-bold text-slate-800">{(t.profilePage as any).support?.title || 'Need help with your documents?'}</p>
            <p className="text-sm text-slate-500">{(t.profilePage as any).support?.subtitle || 'Our support team is available 24/7 to assist you.'}</p>
          </div>
        </div>
        <button
          type="button"
          className="px-6 py-3 bg-brand-blue text-white font-bold rounded-2xl shadow-lg shadow-brand-blue/20 cursor-default"
        >
          {(t.profilePage as any).support?.button || 'Contact Support'}
        </button>
      </div>

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
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/10 rounded-full -mr-16 -mt-16 blur-3xl" />

              <div className="relative">
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
                    {confirmModal.cancelText}
                  </button>
                  <button
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className={`flex-1 px-6 py-3 ${confirmModal.confirmColor || 'bg-red-500'} text-white font-bold rounded-2xl hover:opacity-90 transition-colors shadow-lg`}
                  >
                    {confirmModal.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onSuccess={async () => {
          const response = await api.getUser();
          if (response.status && response.data) {
            const userData = response.data;
            if (response.cards) {
              userData.cards = response.cards;
            }
            setUser(userData);
          }
        }}
      />

      {selectedInvoice && (
        <InvoicePaymentModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          savedCards={user?.cards?.data}
          defaultPaymentMethod={user?.default_payment_method}
          onSuccess={async () => {
            // Refresh user data to show updated invoice status
            const response = await api.getUser();
            if (response.status && response.data) {
              const userData = response.data;
              if (response.cards) {
                userData.cards = response.cards;
              }
              setUser(userData);
            }
          }}
        />
      )}
    </div>
  );
};
