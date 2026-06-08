import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './i18n/LanguageContext';
import { api, User, ParentRequest } from './services/api';
import {
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  User as UserIcon,
  MapPin,
  Baby,
  Phone,
  Mail,
  AlertCircle,
  Clock,
  Trash2,
  Euro,
  Info,
  ShieldCheck,
  ShieldAlert,
  Languages,
  FileText,
  ArrowLeft,
  Star,
  Award,
  Calendar,
  Plus,
  Video,
  ExternalLink,
  Heart,
  CheckCircle2,
  Check,
  X,
  CalendarDays,
  CreditCard,
  Receipt,
  Calculator,
  Wallet,
  Lock,
  HelpCircle,
  Filter,
  LogOut,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';

import { ProfilePage } from './components/ProfilePage';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ContractView } from './components/ContractView';
import { MatchSelectionView } from './components/MatchSelectionView';
import { Toaster } from 'react-hot-toast';


interface TimeSlot {
  id: string;
  dbId?: number;
  startTime: string;
  endTime: string;
}

interface DateSchedule {
  id: string; // YYYY-MM-DD
  date: Date;
  slots: TimeSlot[];
  dbId?: number;
}

interface Babysitter {
  id: number;
  key: string;
  name: string;
  lastName?: string;
  age: number;
  languages: string[];
  experience: number;
  description: string;
  fullBio: string;
  photo: string;
  status: 'Online' | 'Available';
  rating: number;
  reviews: number;
  email?: string;
  phone?: string;
  address?: string;
  profile_pic?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  address: string;
  numChildren: number;
  childDOBs: string[];
  countryCode: string;
  telephone: string;
  email: string;
  lat?: number;
  lng?: number;
}

const Tooltip = ({ children, content, placement = 'top' }: { children: React.ReactNode, content: React.ReactNode, placement?: 'top' | 'right' | 'bottom' | 'left' }) => {
  const [isVisible, setIsVisible] = useState(false);

  // compute classes based on placement
  let containerClass = 'absolute bottom-full right-0 mb-2 w-28 p-2 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-[100] pointer-events-none';
  let arrow = <div className="absolute top-full right-4 border-6 border-transparent border-t-slate-900" />;

  if (placement === 'right') {
    containerClass = 'absolute left-full top-1/2 -translate-y-1/2 ml-2 w-auto p-2 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-[100] pointer-events-none';
    arrow = <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-6 border-transparent border-r-slate-900" />;
  } else if (placement === 'left') {
    containerClass = 'absolute right-full top-1/2 -translate-y-1/2 mr-2 w-auto p-2 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-[100] pointer-events-none';
    arrow = <div className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 border-6 border-transparent border-l-slate-900" />;
  }

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className={containerClass}
          >
            <div className="relative z-10 text-[12px]">
              {content}
            </div>
            {arrow}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CMG_FIXED_UNDER_3 = 848.47;
const CMG_FIXED_3_6 = 424.24;
const CMG_CEILING_UNDER_3 = 805.92;
const CMG_CEILING_3_PLUS = 402.50;

const calculateAge = (dob: string) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }

  if (today.getDate() < birthDate.getDate()) {
    months--;
  }

  if (months < 0) {
    months += 12;
  }

  return { years, months };
};

// Helper: parse YYYY-MM-DD into a local Date at midnight (avoids timezone shift)
const ymdToDate = (ymd: string) => {
  if (!ymd) return new Date();
  const parts = ymd.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d);
};

// Format a Date to YYYY-MM-DD using local date parts (avoid toISOString timezone issues)
const formatDateId = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Merge server-provided choices with local selections.
// local and server arrays are arrays of { sitterId, dbId?, interview }
const mergeServerAndLocalChoices = (local: any[], server: any[]) => {
  const byDbId = new Map<number, any>();
  const result: any[] = [];

  // First, add local selections keyed by dbId when available (preserve interview config)
  for (const l of local) {
    if (l.dbId) {
      byDbId.set(l.dbId, { ...l });
    } else {
      // push local-only picks (no dbId) directly
      result.push({ ...l });
    }
  }

  // Merge server entries, preferring local interview config when dbId matches
  for (const s of server) {
    if (s.dbId && byDbId.has(s.dbId)) {
      // use local version (preserves interview)
      result.push(byDbId.get(s.dbId));
      byDbId.delete(s.dbId);
    } else {
      result.push({ ...s });
    }
  }

  // Any remaining local entries that had dbIds but weren't in server list should be appended
  for (const leftover of byDbId.values()) {
    result.push(leftover);
  }

  return result;
};

interface FormErrors {
  [key: string]: string;
}

export default function App() {
  const { t, language, setLanguage, formatCurrency, formatNumber, formatDate } = useLanguage();
  const [hourlyRate, setHourlyRate] = useState(27.99);
  const [externalSitters, setExternalSitters] = useState<Babysitter[]>([]);
  const [sitterPage, setSitterPage] = useState(1);
  const [hasMoreSitters, setHasMoreSitters] = useState(true);
  const [isFetchingSitters, setIsFetchingSitters] = useState(false);
  const [filters, setFilters] = useState({
    language: [] as string[],
    age_group: [] as string[],
    experience: '' as string,
    s: '' as string,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, s: searchTerm }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatAge = (age: { years: number, months: number } | null) => {
    if (!age) return '';
    const { years, months } = age;

    if (years === 0) {
      return `${months} ${language === 'fr' ? 'mois' : `month${months > 1 ? 's' : ''}`}`;
    }

    if (months === 0) {
      return `${years} ${language === 'fr' ? (years > 1 ? 'ans' : 'an') : `year${years > 1 ? 's' : ''}`}`;
    }

    return `${years}y ${months}m`;
  };

  // Experience helpers (months -> years/months) available inside App to access `language`
  const parseMonths = (monthsInput: any) => {
    const m = parseInt(String(monthsInput || '0'), 10);
    if (isNaN(m) || m < 0) return { years: 0, months: 0 };
    const years = Math.floor(m / 12);
    const months = m % 12;
    return { years, months };
  };

  const formatExperienceShortFromMonths = (monthsInput: any) => {
    const { years, months } = parseMonths(monthsInput);
    if (years === 0) return `${months} ${language === 'fr' ? 'mois' : months > 1 ? 'months' : 'month'}`;
    if (months === 0) return `${years}${language === 'fr' ? (years > 1 ? 'ans' : 'an') : `${years}y`}`;
    return `${years}y ${months}m`;
  };

  const formatExperienceLongFromMonths = (monthsInput: any) => {
    const { years, months } = parseMonths(monthsInput);
    if (years === 0) return `${months} ${language === 'fr' ? 'mois' : months > 1 ? 'months' : 'month'}`;
    if (months === 0) return `${years} ${language === 'fr' ? (years > 1 ? 'ans' : 'an') : years > 1 ? 'years' : 'year'}`;
    if (language === 'fr') {
      return `${years} ${years > 1 ? 'ans' : 'an'} ${months} mois`;
    }
    return `${years} ${years > 1 ? 'years' : 'year'} ${months} ${months > 1 ? 'months' : 'month'}`;
  };

  const localizedSitters = React.useMemo(() => {
    return externalSitters.map(sitter => ({
      ...sitter,
      description: (t.sitters as any)[sitter.key]?.description || sitter.description,
      fullBio: (t.sitters as any)[sitter.key]?.fullBio || sitter.fullBio,
    }));
  }, [t.sitters, externalSitters]);

  const [currentStep, setCurrentStep] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.match(/\/price\/\d+/) ? 3 : 1;
  });
  const [view, setView] = useState<'booking' | 'profile' | 'login' | 'admin-dashboard' | 'contract' | 'match'>(() => {
    return typeof window !== 'undefined' && window.location.pathname.match(/\/price\/\d+/) ? 'booking' : 'booking';
  });
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    address: '',
    numChildren: 1,
    childDOBs: [''],
    countryCode: '+1',
    telephone: '',
    email: '',
    lat: undefined,
    lng: undefined,
  });

  const [dateSchedule, setDateSchedule] = useState<DateSchedule[]>([]);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [timeSelectionDate, setTimeSelectionDate] = useState<Date | null>(null);
  const [tempTimeConfig, setTempTimeConfig] = useState({ startTime: '', endTime: '' });

  const [errors, setErrors] = useState<FormErrors>({});

  const [isSubmitted, setIsSubmitted] = useState(false);

  const [isRegistering, setIsRegistering] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.match(/\/price\/\d+/) ? true : false;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [parentRequestId, setParentRequestId] = useState<number | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [matchRequestId, setMatchRequestId] = useState<number | null>(null);
  const [autoShowCongrats, setAutoShowCongrats] = useState(false);

  // Step 4 State (Babysitter Matching)
  const [selectedCandidates, setSelectedCandidates] = useState<Array<{
    sitterId: number,
    dbId?: number,
    interview: { date: string, time: string, skipped: boolean },
    sitterInfo?: {
      name?: string,
      lastName?: string,
      email?: string,
      phone?: string,
      address?: string,
      profile_pic?: string
    }
  }>>([]);

  // Load persisted selections from sessionStorage (survive back/next & tab navigation)
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem('selectedCandidates') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSelectedCandidates(parsed);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Persist selected candidates to sessionStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('selectedCandidates', JSON.stringify(selectedCandidates));
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [selectedCandidates]);
  const [viewingBabysitter, setViewingBabysitter] = useState<Babysitter | null>(null);
  const [schedulingSitter, setSchedulingSitter] = useState<Babysitter | null>(null);
  const [modalInterviewConfig, setModalInterviewConfig] = useState({
    date: '',
    time: '10:00',
    skipped: false
  });
  const [modalError, setModalError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirmModalProcessing, setIsConfirmModalProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'requests' | 'invoices' | 'tax' | 'cmg'>('requests');

  const autocompleteRef = useRef<any>(null);
  const initAutocomplete = useCallback((node: HTMLInputElement | null) => {
    if (node && (window as any).google) {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(node, {
        fields: ['formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address && place.geometry && place.geometry.location) {
          const newAddress = place.formatted_address;
          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();

          setFormData(prev => ({
            ...prev,
            address: newAddress,
            lat: newLat,
            lng: newLng,
          }));

          // Clear address error if it exists
          setErrors(prev => {
            const next = { ...prev };
            delete next.address;
            return next;
          });
        }
      });
      autocompleteRef.current = autocomplete;
    }
  }, []);

  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    dateSchedule.forEach(item => {
      const monthStr = item.date.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });
      monthsSet.add(monthStr);
    });
    return Array.from(monthsSet);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const initialPath = window.location.pathname;
      const token = api.getToken();
      if (!token) return;

      const isDeepLink = ['/contract/', '/price/', '/cmg/', '/match/'].some(p => initialPath.includes(p));
      const routeForRole = (role: string | null) => {
        if (isDeepLink) return;
        setView(role === 'admin' ? 'admin-dashboard' : 'profile');
      };

      // Optimistically restore the session from the persisted role so a refresh —
      // or a backend hiccup / expired-token 401 — never bounces a logged-in user
      // back to the login screen.
      const cachedRole = localStorage.getItem('auth_role');
      if (cachedRole) {
        setIsLoggedIn(true);
        routeForRole(cachedRole);
      }

      try {
        const response = await api.getUser();
        if (response.status && response.data) {
          setIsLoggedIn(true);
          setUser(response.data);
          const role = (response.data.email?.toLowerCase() === 'ponctuel@bloom-buddies.fr' || response.data.user_role === 1) ? 'admin' : 'parent';
          localStorage.setItem('auth_role', role);
          routeForRole(role);
          // Pre-fill form data if user is logged in
          setFormData(prev => ({
            ...prev,
            firstName: response.data?.first_name || '',
            lastName: response.data?.last_name || '',
            email: response.data?.email || '',
            telephone: response.data?.user_phone || '',
            address: response.data?.user_address || '',
            numChildren: response.data?.children?.length || 1,
            childDOBs: response.data?.children?.map(c => c.child_dob) || ['']
          }));
        }
        // We deliberately do NOT log the user out on a 401/failure. As long as a
        // token is stored we keep the session and let the user log out explicitly.
        // This keeps logins persistent across refreshes and transient/expired-token
        // backend responses instead of kicking the user to the login screen.
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  // Handle URL Routing for /price/:id
  useEffect(() => {
    const handleUrlRoute = async () => {
      const path = window.location.pathname;
      const priceMatch = path.match(/\/price\/(\d+)/);

      if (priceMatch && currentStep < 4) {
        const id = parseInt(priceMatch[1]);

        try {
          setIsRegistering(true);
          const data = await api.getSingleParentRequest(id);
          if (data) {
            mapRequestToState(data, 3);
          }
        } catch (error) {
          console.error('Failed to fetch parent request from URL:', error);
        } finally {
          setIsRegistering(false);
        }
      }

      const cmgMatch = path.match(/\/cmg\/(\d+)/);
      if (cmgMatch) {
        const token = api.getToken();
        setProfileInitialTab('cmg');
        if (token) {
          setView('profile');
        } else {
          setView('login');
        }
      }

      const contractMatch = path.match(/\/contract\/(\d+)/);
      if (contractMatch) {
        const id = parseInt(contractMatch[1]);
        setSelectedChoiceId(id);
        setView('contract');
      }

      // Parent candidate-selection link: /match/:requestId
      const matchMatch = path.match(/\/match\/(\d+)/);
      if (matchMatch) {
        setMatchRequestId(parseInt(matchMatch[1]));
        setView('match');
      }
    };
    handleUrlRoute();
  }, [localizedSitters, currentStep]);

  useEffect(() => {
    if (currentStep === 3 && !selectedMonth && dateSchedule.length > 0) {
      const months = getAvailableMonths();
      if (months.length > 0) {
        setSelectedMonth(months[0]);
      }
    }
  }, [currentStep, dateSchedule, selectedMonth]);

  const mapRequestToState = (data: ParentRequest, targetStep?: number) => {
    setParentRequestId(data.id);
    if (data.hourly_rate) {
      setHourlyRate(parseFloat(data.hourly_rate));
    }
    setFormData({
      firstName: data.user?.first_name || user?.first_name || '',
      lastName: data.user?.last_name || user?.last_name || '',
      email: data.user?.email || user?.email || '',
      address: data.parent_address,
      numChildren: data.children?.length || 1,
      childDOBs: data.children?.map(c => c.child_dob) || [''],
      telephone: data.user?.user_phone || user?.user_phone || '',
      countryCode: '+1',
    });

    if (data.schedules) {
      const mappedSchedules = data.schedules.map(s => ({
        id: s.schedule_date,
        date: ymdToDate(s.schedule_date),
        dbId: s.id,
        slots: s.slots.map(slot => ({
          id: Math.random().toString(36).substr(2, 9),
          dbId: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time
        }))
      }));
      setDateSchedule(mappedSchedules);
    }

    // Merge server-provided choices with any locally persisted selections
    if (data.choices && data.choices.length > 0) {
      const serverMapped = data.choices.map(c => {
        // Try to find sitter id from localized list if available
        const sitter = localizedSitters.find(s =>
          (c.bb_bs_id && s.id === c.bb_bs_id) ||
          s.email === c.babysitter_email ||
          (s.name.toLowerCase() === c.babysitter_first_name?.toLowerCase() &&
            s.lastName?.toLowerCase() === c.babysitter_last_name?.toLowerCase())
        );

        // Normalize time to HH:mm
        let normalizedTime = c.interview_time || '';
        if (normalizedTime.includes(':')) {
          const parts = normalizedTime.split(':');
          if (parts.length >= 2) normalizedTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }

        return {
          sitterId: sitter?.id || c.bb_bs_id || 0,
          dbId: c.id,
          interview: {
            date: c.interview_date || '',
            time: normalizedTime,
            skipped: !c.interview_date
          },
          // Cache some sitter info for display before full list loads
          sitterInfo: {
            name: c.babysitter_first_name,
            lastName: c.babysitter_last_name,
            email: c.babysitter_email,
            phone: c.babysitter_phone,
            address: c.babysitter_address,
            profile_pic: c.babysitter_pic
          }
        };
      });

      // Prefer in-memory selectedCandidates if available, otherwise fall back to sessionStorage
      let localSelections = selectedCandidates;
      try {
        if ((!localSelections || localSelections.length === 0) && typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem('selectedCandidates');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localSelections = parsed;
          }
        }
      } catch (e) {
        // ignore
      }

      const merged = mergeServerAndLocalChoices(localSelections || [], serverMapped);
      setSelectedCandidates(merged);
    }

    const hasSchedules = data.schedules && data.schedules.length > 0;
    const hasChoices = data.choices && data.choices.length > 0;

    if (targetStep) {
      setCurrentStep(targetStep);
    } else if (data.quote_status === 1 || hasChoices) {
      setCurrentStep(4);
    } else if (hasSchedules) {
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }

    setView('booking');
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      if (currentStep === 2 && parentRequestId) {
        try {
          setIsRegistering(true);
          const response = await api.getParentSchedules(parentRequestId);
          if (response.status && response.data) {
            const mappedSchedules = response.data.map((s: any) => ({
              id: s.schedule_date,
              date: ymdToDate(s.schedule_date),
              dbId: s.id,
              slots: s.slots.map((slot: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                dbId: slot.id,
                startTime: slot.start_time,
                endTime: slot.end_time
              }))
            }));
            setDateSchedule(mappedSchedules);
          }
        } catch (error) {
          console.error('Failed to fetch schedules:', error);
        } finally {
          setIsRegistering(false);
        }
      }
    };
    fetchSchedules();
  }, [currentStep, parentRequestId]);

  useEffect(() => {
    const fetchChoices = async () => {
      if (currentStep === 4 && parentRequestId && selectedCandidates.length === 0) {
        try {
          setIsRegistering(true);
          const response = await api.getParentBabysitterChoices(parentRequestId);
          if (response.status && response.data) {
            const mappedChoices = response.data.map((choice: any) => {
              // Try to find the sitter in our local list by email or name
              const sitter = localizedSitters.find(s =>
                (choice.bb_bs_id && s.id === choice.bb_bs_id) ||
                s.email === choice.babysitter_email ||
                (s.name.toLowerCase() === choice.babysitter_first_name?.toLowerCase() &&
                  s.lastName?.toLowerCase() === choice.babysitter_last_name?.toLowerCase())
              );

              // Normalize time to HH:mm
              let normalizedTime = choice.interview_time || '';
              if (normalizedTime.includes(':')) {
                const parts = normalizedTime.split(':');
                if (parts.length >= 2) normalizedTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
              }

              return {
                sitterId: sitter?.id || choice.bb_bs_id || choice.babysitter_id || 0,
                dbId: choice.id,
                interview: {
                  date: choice.interview_date || '',
                  time: normalizedTime,
                  skipped: !choice.interview_date
                },
                sitterInfo: {
                  name: choice.babysitter_first_name,
                  lastName: choice.babysitter_last_name,
                  email: choice.babysitter_email,
                  phone: choice.babysitter_phone,
                  address: choice.babysitter_address,
                  profile_pic: choice.babysitter_pic
                }
              };
            });
            // Merge with any locally persisted selections to avoid overwriting interview times
            let localSelections = selectedCandidates;
            try {
              if ((!localSelections || localSelections.length === 0) && typeof window !== 'undefined') {
                const raw = window.sessionStorage.getItem('selectedCandidates');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (Array.isArray(parsed)) localSelections = parsed;
                }
              }
            } catch (e) {
              // ignore
            }

            const merged = mergeServerAndLocalChoices(localSelections || [], mappedChoices);
            setSelectedCandidates(merged);
          }
        } catch (error) {
          console.error('Failed to fetch babysitter choices:', error);
        } finally {
          setIsRegistering(false);
        }
      }
    };
    fetchChoices();
  }, [currentStep, parentRequestId]);

  const handleLoginSuccess = async (isAdmin?: boolean) => {
    setIsLoggedIn(true);
    // Persist the role so the session restores instantly on the next load.
    try { localStorage.setItem('auth_role', isAdmin ? 'admin' : 'parent'); } catch (e) { /* ignore */ }

    try {
      const response = await api.getUser();
      if (response.status && response.data) {
        const userData = response.data;
        setUser(userData);

        // Sync formData with user data if it's a parent
        if (!isAdmin) {
          setFormData(prev => ({
            ...prev,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            telephone: userData.user_phone || '',
            address: userData.user_address || '',
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user after login:', error);
    }

    if (isAdmin) {
      setView('admin-dashboard');
    } else {
      setView('profile');
    }
  };

  useEffect(() => {
    const fetchExternalSitters = async () => {
      if (currentStep === 4 && hasMoreSitters && !isFetchingSitters) {
        try {
          setIsFetchingSitters(true);
          const response = await api.getExternalBabysitters(sitterPage, filters);
          if (response && response.data) {
            const mapped = response.data.map((item: any) => {
              const photoBaseUrl = 'https://bloom-buddies.fr/uploads/profile_images/';
              const photo = item.profile_pic
                ? `${photoBaseUrl}${item.profile_pic}`
                : `${photoBaseUrl}default.jpg`;

             const languages = item.bs_languages
                ? item.bs_languages.map((l: any) => `${l.language_name} (${l.language_expertise})`)
                : [];
              if (languages.length === 0) {
                if (item.english_language > 0) languages.push('English');
                if (item.french_language > 0) languages.push('French');
              }

              return {
                id: item.user_id,
                key: `external-${item.user_id}`,
                name: item.name || item.first_name || 'Babysitter',
                lastName: item.user_last_name || '',
                age: item.age || calculateAgeFromDOB(item.user_dob),
                languages,
                // keep raw numeric years for some existing logic but persist months from API
                experience: item.experienceMonths || 0,
                experienceMonths: item.experienceMonths || 0,
                description: item.babysitter_profiles_about || '',
                fullBio: item.babysitter_profiles_personal || '',
                photo,
                profile_pic: item.profile_pic,
                status: item.user_status === 1 ? 'Online' : 'Available',
               // rating: (item.rating1 && !isNaN(parseFloat(item.rating1))) ? parseFloat(item.rating1) : 4.5,
                reviews: Math.floor(Math.random() * 50),
                email: item.email,
                phone: item.user_phone,
                address: item.babysitter_profiles_address
              };
            });

            setExternalSitters(prev => {
              if (sitterPage === 1) return mapped;
              const existingIds = new Set(prev.map(s => s.id));
              const newSitters = mapped.filter((s: any) => !existingIds.has(s.id));
              return [...prev, ...newSitters];
            });

            if (response.current_page >= response.last_page) {
              setHasMoreSitters(false);
            }
          }
        } catch (error) {
          console.error('Failed to fetch external babysitters:', error);
        } finally {
          setIsFetchingSitters(false);
        }
      }
    };

    fetchExternalSitters();
  }, [currentStep, sitterPage, filters]);

  // Reset pagination when filters change
  useEffect(() => {
    if (currentStep === 4) {
      setSitterPage(1);
      setHasMoreSitters(true);
      setExternalSitters([]);
    }
  }, [filters, currentStep]);

  const calculateAgeFromDOB = (dob: string) => {
    if (!dob) return 20;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 20;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreSitters && !isFetchingSitters && currentStep === 4) {
        setSitterPage(prev => prev + 1);
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMoreSitters, isFetchingSitters, currentStep]);

  const handleModifyRequest = useCallback((request: any) => {
    setIsModifying(true);
    mapRequestToState(request);
  }, [user]);

  const handleCreateNewRequest = useCallback(() => {
    setParentRequestId(null);
    setIsModifying(false);
    setHourlyRate(27.99); // Reset to default
    setFormData({
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      address: '',
      numChildren: 1,
      childDOBs: [''],
      countryCode: '+1',
      telephone: user?.user_phone || '',
      email: user?.email || '',
    });
    setDateSchedule([]);
    setSelectedCandidates([]);
    setIsSubmitted(false);
    setErrors({});
    setView('booking');
    setCurrentStep(1);
  }, [user]);

  const handleLogout = useCallback(() => {
    api.removeToken();
    try { localStorage.removeItem('auth_role'); } catch (e) { /* ignore */ }
    setIsLoggedIn(false);
    setUser(null);
    setView('booking');
    setCurrentStep(1);
    setIsModifying(false);
    setParentRequestId(null);
  }, []);

  const handleBackToBooking = useCallback(() => setView('booking'), []);
  const handleGoToAdmin = useCallback(() => setView('admin-dashboard'), []);
  const handleViewContract = useCallback((choiceId: number, showCongrats = false) => {
    setSelectedChoiceId(choiceId);
    setAutoShowCongrats(showCongrats);
    setView('contract');
  }, []);

  const handleUserLoaded = useCallback((userData: User) => {
    setUser(userData);
    setFormData(prev => ({
      ...prev,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      email: userData.email || '',
      telephone: userData.user_phone || '',
      address: userData.user_address || '',
    }));
  }, []);

  // Update childDOBs array when numChildren changes
  useEffect(() => {
    setFormData(prev => {
      const newDOBs = [...prev.childDOBs];
      if (prev.numChildren > newDOBs.length) {
        // Add fields
        for (let i = newDOBs.length; i < prev.numChildren; i++) {
          newDOBs.push('');
        }
      } else if (prev.numChildren < newDOBs.length) {
        // Remove fields
        newDOBs.splice(prev.numChildren);
      }
      return { ...prev, childDOBs: newDOBs };
    });
  }, [formData.numChildren]);


  const validateStep1 = () => {
    const newErrors: FormErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (!formData.lat || !formData.lng) {
      newErrors.address = 'Please select a valid address from the suggestions';
    }
    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Telephone is required';
    } else if (!isValidPhoneNumber(formData.telephone)) {
      newErrors.telephone = 'Invalid phone number format';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    formData.childDOBs.forEach((dob, index) => {
      if (!dob.trim()) {
        newErrors[`childDOB_${index}`] = 'DOB is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};

    if (dateSchedule.length === 0) {
      newErrors.schedule = 'Please select at least one babysitting date.';
    }

    dateSchedule.forEach(item => {
      if (item.slots.length === 0) {
        newErrors[`${item.id}_slots`] = 'Please add at least one time slot for this date.';
      }

      item.slots.forEach(slot => {
        // Validate presence
        if (!slot.startTime || !slot.endTime) {
          newErrors[`${item.id}_${slot.id}_time`] = 'Please provide both start and end times';
          return;
        }

        const start = new Date(`2000-01-01T${slot.startTime}`);
        const end = new Date(`2000-01-01T${slot.endTime}`);

        if (start.getTime() === end.getTime()) {
          newErrors[`${item.id}_${slot.id}_time`] = 'Start and end time cannot be the same';
        } else if (end.getTime() < start.getTime()) {
          newErrors[`${item.id}_${slot.id}_time`] = 'End time must be after start time';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Runtime check for invalid slots (used for enabling/disabling Next button instantly)
  const hasInvalidSlots = () => {
    if (dateSchedule.length === 0) return true;
    for (const item of dateSchedule) {
      if (!item.slots || item.slots.length === 0) return true;
      for (const slot of item.slots) {
        if (!slot.startTime || !slot.endTime) return true;
        const start = new Date(`2000-01-01T${slot.startTime}`);
        const end = new Date(`2000-01-01T${slot.endTime}`);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
        if (end.getTime() <= start.getTime()) return true;
      }
    }
    return false;
  };

  const validateStep4 = () => {
    const newErrors: FormErrors = {};
    const selectedCount = selectedCandidates.length;

    if (selectedCount < 1) {
      newErrors.candidates = 'Please select at least 1 candidate to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const refreshUser = async () => {
    const token = api.getToken();
    if (token) {
      try {
        const response = await api.getUser();
        if (response.status && response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  // Status tracking effect removed

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setIsRegistering(true);
        setErrors({});

        try {
          let response;
          if (isModifying && parentRequestId) {
            response = await api.updateParentRequest(parentRequestId, {
              first_name: formData.firstName,
              last_name: formData.lastName,
              parent_address: formData.address,
              children: formData.childDOBs.map((dob, idx) => {
                // Try to find existing child ID if we have it
                const existingRequest = user?.parent_requests?.find(r => r.id === parentRequestId);
                const existingChild = existingRequest?.children[idx];
                return {
                  id: existingChild?.id,
                  child_dob: dob
                };
              }),
              lat: formData.lat,
              lng: formData.lng,
            });
          } else if (isLoggedIn) {
            // If logged in and not modifying a specific request, create a new one
            response = await api.createParentRequest({
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
              user_phone: formData.telephone,
              parent_address: formData.address,
              children: formData.childDOBs.map(dob => ({ child_dob: dob })),
              schedules: [], // Schedules will be added in step 2
              lat: formData.lat,
              lng: formData.lng,
            });
          } else {
            response = await api.register({
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
              user_phone: formData.telephone,
              user_address: formData.address,
              children: formData.childDOBs.map(dob => ({ child_dob: dob })),
              lat: formData.lat,
              lng: formData.lng,
            }, parentRequestId || undefined);
          }

          if (response.status && response.data) {
            // Case 1 & 2: Success
            if (response.data.token) {
              api.setToken(response.data.token);
              setIsLoggedIn(true);
            }

            const requestId =
              response.data?.parent_request?.id ||
              response.data?.id ||
              response.parent_request?.id ||
              response.id;

            if (requestId) {
              setParentRequestId(requestId);
            }

            // Refresh user data to reflect new/updated request
            refreshUser();

            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (response.code === 409) {
            // Case 3: Conflict - Redirect to login
            setView('login');
            setErrors({ email: response.message });
          } else if (response.errors) {
            // Case 4: Validation Errors
            const apiErrors: FormErrors = {};
            Object.entries(response.errors).forEach(([key, messages]) => {
              // Map API keys to form keys
              let formKey = key;
              if (key === 'first_name') formKey = 'firstName';
              if (key === 'last_name') formKey = 'lastName';
              if (key === 'user_phone') formKey = 'telephone';
              if (key === 'user_address') formKey = 'address';

              // Handle nested children errors: children.0.child_dob -> childDOB_0
              if (key.startsWith('children.')) {
                const parts = key.split('.');
                if (parts.length >= 2) {
                  formKey = `childDOB_${parts[1]}`;
                }
              }

              apiErrors[formKey] = messages[0];
            });
            setErrors(apiErrors);
          } else {
            setErrors({ email: response.message || 'Registration failed' });
          }
        } catch (error) {
          setErrors({ email: 'Network error. Please try again.' });
        } finally {
          setIsRegistering(false);
        }
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        let idToUse = parentRequestId;

        // Fallback: If parentRequestId is null, try to find the latest request from the user object
        if (!idToUse && isLoggedIn && user?.parent_requests?.length) {
          const sortedRequests = [...user.parent_requests].sort((a, b) => b.id - a.id);
          idToUse = sortedRequests[0].id;
        }

        if (idToUse) {
          const saveSchedules = async () => {
            try {
              setIsRegistering(true);

              // Separate existing and new schedules
              const existingSchedules = dateSchedule.filter(s => s.dbId);
              const newSchedules = dateSchedule.filter(s => !s.dbId);

              // Update existing schedules
              for (const schedule of existingSchedules) {
                await api.updateParentSchedule(schedule.dbId!, {
                  date: schedule.id,
                  slots: schedule.slots.map(slot => ({
                    id: slot.dbId,
                    start_time: slot.startTime,
                    end_time: slot.endTime
                  }))
                });
              }

              // Create new schedules
              if (newSchedules.length > 0) {
                await api.createParentSchedules({
                  parent_request_id: idToUse,
                  schedules: newSchedules.map(s => ({
                    date: s.id,
                    slots: s.slots.map(slot => ({
                      start_time: slot.startTime,
                      end_time: slot.endTime
                    }))
                  }))
                });
              }

              // Refresh to get all IDs
              const refreshResponse = await api.getParentSchedules(idToUse);
              if (refreshResponse.status && refreshResponse.data) {
                const mappedSchedules = refreshResponse.data.map((s: any) => ({
                  id: s.schedule_date,
                  date: ymdToDate(s.schedule_date),
                  dbId: s.id,
                  slots: s.slots.map((slot: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    dbId: slot.id,
                    startTime: slot.start_time,
                    endTime: slot.end_time
                  }))
                }));
                setDateSchedule(mappedSchedules);
              }

              setCurrentStep(3);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
              console.error('Failed to save schedules:', error);
              setErrors({ schedule: t.common.failedtosaveschedule });
            } finally {
              setIsRegistering(false);
            }
          };
          saveSchedules();
        } else {
          setCurrentStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else if (currentStep === 3) {
      // Final step: open the confirmation modal. On confirm we accept the price
      // quote and send the user to their dashboard — matching is handled
      // afterward by the admin / back-office.
      setIsConfirmModalOpen(true);
    } else if (currentStep === 4) {
      if (validateStep4()) {
        setIsConfirmModalOpen(true);
      }
    }
  };

  const handleConfirmSubmission = async () => {
    setIsConfirmModalProcessing(true);
    setErrors({});

    try {
      let idToUse = parentRequestId;
      if (!idToUse && isLoggedIn && user?.parent_requests?.length) {
        const sortedRequests = [...user.parent_requests].sort((a, b) => b.id - a.id);
        idToUse = sortedRequests[0].id;
      }

      // Confirm the request by accepting the price quote. Matching to
      // babysitters is handled afterward by the admin / back-office.
      if (idToUse) {
        await api.acceptPriceQuote(idToUse);
      }

      try {
        if (typeof window !== 'undefined') window.sessionStorage.removeItem('selectedCandidates');
      } catch (e) {
        // ignore
      }

      setIsConfirmModalProcessing(false);
      setIsConfirmModalOpen(false);
      setIsSubmitted(true);

      // Lead the user into their personal dashboard.
      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (error) {
      console.error('Failed to confirm price quote:', error);
      setErrors({ candidates: language === 'fr' ? 'Échec de la confirmation. Veuillez réessayer.' : 'Failed to confirm your request. Please try again.' });
      setIsConfirmModalProcessing(false);
      // Keep the modal open so the user can see the error.
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const confirmCandidateSelection = (isSkipped?: boolean) => {
    if (!schedulingSitter) return;

    const finalSkipped = isSkipped !== undefined ? isSkipped : modalInterviewConfig.skipped;
    
    if (!finalSkipped) {
      if (!modalInterviewConfig.date || !modalInterviewConfig.time) {
        setModalError(t.common.pleaseselectdate);
        return;
      }

      const selectedDate = new Date(modalInterviewConfig.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setModalError('You cannot select a past date');
        return;
      }
    }

    setSelectedCandidates(prev => {
      const existingIndex = prev.findIndex(c => c.sitterId === schedulingSitter.id);
      if (existingIndex !== -1) {
        // Update existing
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          interview: { ...modalInterviewConfig, skipped: finalSkipped }
        };
        return next;
      } else {
        // Add new
        return [...prev, {
          sitterId: schedulingSitter.id,
          interview: { ...modalInterviewConfig, skipped: finalSkipped },
          sitterInfo: {
            name: schedulingSitter.name,
            lastName: schedulingSitter.lastName,
            email: schedulingSitter.email,
            phone: schedulingSitter.phone,
            address: schedulingSitter.address,
            profile_pic: schedulingSitter.profile_pic
          }
        }];
      }
    });

    setSchedulingSitter(null);
    setModalInterviewConfig({ date: '', time: '10:00', skipped: false });
    setModalError('');

    if (errors.candidates) {
      setErrors(prev => {
        const { candidates, ...rest } = prev;
        return rest;
      });
    }
  };

  const removeCandidate = (id: number) => {
    setSelectedCandidates(prev => prev.filter(c => c.sitterId !== id));
  };

  const editInterview = (sitterId: number) => {
    const candidate = selectedCandidates.find(c => c.sitterId === sitterId);
    let sitter = localizedSitters.find(s => s.id === sitterId);

    // If not found in primary list, build a "proxy" sitter from candidate info
    if (!sitter && candidate && (candidate as any).sitterInfo) {
      const info = (candidate as any).sitterInfo;
      sitter = {
        id: sitterId,
        key: `proxy-${sitterId}`,
        name: info.name,
        lastName: info.lastName,
        email: info.email,
        phone: info.phone,
        address: info.address,
        age: 20,
        languages: ['English', 'French'],
        experience: 0,
        description: '',
        fullBio: '',
        photo: 'https://bloom-buddies.fr/public/uploads/profile_images/default.jpg',
        status: 'Available',
        rating: 4.5,
        reviews: 0
      };
    }

    if (candidate && sitter) {
      setSchedulingSitter(sitter);
      setModalInterviewConfig({ ...candidate.interview });
    }
  };

  const calculateTotalHours = () => {
    return dateSchedule
      .filter(item => {
        if (!selectedMonth) return true;
        const monthStr = item.date.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });
        return monthStr === selectedMonth;
      })
      .reduce((total, item) => {
        const dayTotal = item.slots.reduce((daySum, slot) => {
          if (!slot.startTime || !slot.endTime) return daySum;
          const start = new Date(`2000-01-01T${slot.startTime}`);
          const end = new Date(`2000-01-01T${slot.endTime}`);
          const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return daySum + (diff > 0 ? diff : 0);
        }, 0);
        return total + dayTotal;
      }, 0);
  };

  const totalHours = calculateTotalHours();
  const baseSubtotal = totalHours * hourlyRate;

  // 7 Free Hours Benefit
  const hasFreeHour = totalHours >= 1;
  //const freeHourValue = hasFreeHour ? hourlyRate : 0;
  const freeHourValue = 0;
  const subtotalAfterFreeHours = baseSubtotal - freeHourValue;

  const totalBeforeAid = subtotalAfterFreeHours;

  const youngestAge = Math.min(...formData.childDOBs.map(dob => {
    const age = calculateAge(dob);
    return age !== null ? age.years : 99;
  }));

  // 3. CAF AID CALCULATION LOGIC
  const cafCeiling = youngestAge < 3 ? CMG_CEILING_UNDER_3 : CMG_CEILING_3_PLUS;
  const cmgFixedReimbursement = youngestAge < 3 ? 848.47 : youngestAge < 6 ? 424.24 : 0;

  let estimatedCMG = 0;
  let cmgDisplayFormat = "";
  let parentShareAfterCAF = 0;

  if (totalBeforeAid < cafCeiling) {
    if (youngestAge < 6) {
      const cafAidAmount = totalBeforeAid * 0.85;
      parentShareAfterCAF = totalBeforeAid - cafAidAmount;
      cmgDisplayFormat = `${formatCurrency(totalBeforeAid)} - ${formatCurrency(cafAidAmount)}`;
    } else {
      parentShareAfterCAF = totalBeforeAid;
      cmgDisplayFormat = `${formatCurrency(totalBeforeAid)} - ${formatCurrency(0)}`;
    }
  } else {
    parentShareAfterCAF = totalBeforeAid - cmgFixedReimbursement;
    cmgDisplayFormat = `${formatCurrency(totalBeforeAid)} - ${formatCurrency(cmgFixedReimbursement)}`;
  }

  estimatedCMG = parentShareAfterCAF; // Showing the parent share as the "Estimated CMG" result to match reference

  // 4. TAX CREDIT CALCULATION LOGIC
  const annualSpendingLimit = 12000 + (1500 * formData.numChildren);
  const monthlyCreditLimit = (annualSpendingLimit / 2) / 12;

  let estimatedTaxCredit = 0;
  let taxCreditDisplayFormat = "";

  if (parentShareAfterCAF > monthlyCreditLimit) {
    estimatedTaxCredit = parentShareAfterCAF - monthlyCreditLimit;
    taxCreditDisplayFormat = `${formatCurrency(parentShareAfterCAF)} - ${formatCurrency(monthlyCreditLimit)}`;
  } else {
    estimatedTaxCredit = parentShareAfterCAF * 0.5;
    taxCreditDisplayFormat = `${formatCurrency(parentShareAfterCAF)} x ${formatNumber(0.5)}`;
  }

  // 6. FINAL MONTHLY COST
  const finalCostAfterAid = parentShareAfterCAF - estimatedTaxCredit;

  const totalPrice = totalBeforeAid; // For the animated price in Step 2/3

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'numChildren' ? parseInt(value) : value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDOBChange = (index: number, value: string) => {
    const newDOBs = [...formData.childDOBs];
    newDOBs[index] = value;
    setFormData(prev => ({ ...prev, childDOBs: newDOBs }));

    if (errors[`childDOB_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`childDOB_${index}`];
        return newErrors;
      });
    }
  };

  const toggleDateSelection = (date: Date) => {
    const dateId = formatDateId(date);
    const exists = dateSchedule.find(item => item.id === dateId);

    if (exists) {
      setDateSchedule(prev => prev.filter(item => item.id !== dateId));
    } else {
      // insert at start so newest selected appears first
      setDateSchedule(prev => [{
        id: dateId,
        date: ymdToDate(dateId),
        slots: [{ id: Math.random().toString(36).substr(2, 9), startTime: '', endTime: '' }]
      }, ...prev]);
    }

    if (errors.schedule) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.schedule;
        return newErrors;
      });
    }
  };

  const addTimeSlot = (dateId: string) => {
    setDateSchedule(prev => prev.map(item => {
      if (item.id === dateId) {
        return {
          ...item,
          slots: [...item.slots, { id: Math.random().toString(36).substr(2, 9), startTime: '', endTime: '' }]
        };
      }
      return item;
    }));
  };

  const removeTimeSlot = (dateId: string, slotId: string) => {
    setDateSchedule(prev => prev.map(item => {
      if (item.id === dateId) {
        const newSlots = item.slots.filter(s => s.id !== slotId);
        if (newSlots.length === 0) {
          // If no slots left, we could either keep it with 0 slots or remove the date.
          // Let's keep it but it will fail validation if empty.
          // Or just don't allow removing the last slot?
          // For now, let's allow it.
        }
        return { ...item, slots: newSlots };
      }
      return item;
    }));
  };

  const updateTimeSlot = (dateId: string, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setDateSchedule(prev => prev.map(item => {
      if (item.id === dateId) {
        return {
          ...item,
          slots: item.slots.map(slot =>
            slot.id === slotId ? { ...slot, [field]: value } : slot
          )
        };
      }
      return item;
    }));

    if (errors[`${dateId}_${slotId}_time`] || errors.schedule) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${dateId}_${slotId}_time`];
        delete newErrors.schedule;
        return newErrors;
      });
    }
  };

  const [animatedPrice, setAnimatedPrice] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (animatedPrice < totalPrice) {
        setAnimatedPrice(prev => Math.min(totalPrice, prev + (totalPrice - prev) * 0.2 + 0.1));
      } else if (animatedPrice > totalPrice) {
        setAnimatedPrice(prev => Math.max(totalPrice, prev - (prev - totalPrice) * 0.2 - 0.1));
      }
    }, 30);
    return () => clearTimeout(timeout);
  }, [totalPrice, animatedPrice]);

  return (
    <div className={`min-h-screen flex flex-col items-center overflow-x-hidden ${view === 'admin-dashboard' ? 'bg-slate-50' : 'bg-brand-beige'}`}>
      {/* Header / Navigation */}
      {view !== 'admin-dashboard' && (
        <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">

            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setView('booking')}
            >
              <img
                src="https://ponctuel.bloom-buddies.fr/logo-png.png"
                alt="Logo"
                className="h-20 w-auto object-contain group-hover:scale-110 transition-transform"
              />
            </div>

            <div className="flex items-center gap-6">
              {/* Language Switcher */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${language === 'en' ? 'bg-white text-brand-accent shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('fr')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${language === 'fr' ? 'bg-white text-brand-accent shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  FR
                </button>
              </div>

              {isLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 transition-all group"
                  title="Logout"
                >
                  <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-red-500 group-hover:bg-red-50 transition-all">
                    <LogOut size={14} />
                  </div>
                  <span className="hidden md:inline text-[10px] font-bold uppercase tracking-[0.2em]">Logout</span>
                </button>
              )}

              {view !== 'profile' && (
                <button
                  onClick={() => {
                    if (view === 'profile' || view === 'login') {
                      setView('booking');
                    } else {
                      setView(isLoggedIn ? 'profile' : 'login');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${view === 'profile' || view === 'login'
                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-accent hover:text-brand-accent'
                    }`}
                >
                  <UserIcon size={18} />
                  <span className="hidden md:inline">
                    {view === 'profile' || view === 'login'
                      ? t.common.newrequestbtn || 'Booking'
                      : (isLoggedIn ? t.profilePage.title : t.login.title)}
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={`${view === 'admin-dashboard' ? 'w-full' : 'w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col items-center'}`}>
        <AnimatePresence mode="wait">
          {view === 'admin-dashboard' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <AdminDashboard
                onLogout={handleLogout}
              />
            </motion.div>
          ) : view === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <ProfilePage
                onBack={handleBackToBooking}
                onLogout={handleLogout}
                onModifyRequest={handleModifyRequest}
                onGoToAdmin={handleGoToAdmin}
                onCreateRequest={handleCreateNewRequest}
                onViewContract={handleViewContract}
                onUserLoaded={handleUserLoaded}
                initialTab={profileInitialTab}
              />
            </motion.div>
          ) : view === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <LoginScreen
                onLoginSuccess={handleLoginSuccess}
                onBackToBooking={() => setView('booking')}
                initialEmail={formData.email}
              />
            </motion.div>
          ) : view === 'contract' ? (
            <motion.div
              key="contract"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <ContractView
                choiceId={selectedChoiceId || 0}
                userName={user ? `${user.first_name} ${user.last_name}` : ''}
                autoShowCongrats={autoShowCongrats}
                onCongratsClose={() => setAutoShowCongrats(false)}
                onBack={() => setView('profile')}
                onAccept={() => {
                  setView('profile');
                }}
                onRefuse={() => setView('profile')}
              />
            </motion.div>
          ) : view === 'match' ? (
            <motion.div
              key="match"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <MatchSelectionView
                requestId={matchRequestId || 0}
                onDone={() => { window.location.href = '/'; }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="booking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* Progress Indicator */}
              <div className="w-full max-w-2xl mb-8">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.common.step} {currentStep} {t.common.of} 3</span>
                  <span className="text-xs font-bold text-brand-accent uppercase tracking-wider">
                    {currentStep === 1 ? t.steps.familyInfo : currentStep === 2 ? t.steps.scheduleQuote : t.step3.title}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / 3) * 100}%` }}
                    className="h-full bg-brand-accent transition-all duration-500"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {currentStep === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="w-full max-w-2xl bg-white rounded-[24px] shadow-xl shadow-slate-200/50 p-8 md:p-12 relative overflow-hidden"
                  >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/30 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue/30 rounded-full -ml-16 -mb-16 blur-3xl" />

                    <div className="relative z-10">
                      <h1 className="text-3xl font-display font-bold text-slate-800 mb-2">{t.step1.title}</h1>
                      <p className="text-slate-500 mb-8">{t.step1.subtitle}</p>

                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* First Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <UserIcon size={16} className="text-brand-accent" />
                              {t.step1.firstName}
                            </label>
                            <input
                              type="text"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              placeholder={t.step1.placeholders.firstName}
                              className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${errors.firstName ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus:border-brand-accent'
                                }`}
                            />
                            {errors.firstName && (
                              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} /> {errors.firstName}
                              </p>
                            )}
                          </div>

                          {/* Last Name */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <UserIcon size={16} className="text-brand-accent" />
                              {t.step1.lastName}
                            </label>
                            <input
                              type="text"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              placeholder={t.step1.placeholders.lastName}
                              className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${errors.lastName ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus:border-brand-accent'
                                }`}
                            />
                            {errors.lastName && (
                              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} /> {errors.lastName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <MapPin size={16} className="text-brand-accent" />
                            {t.step1.address}
                          </label>
                          <input
                            type="text"
                            name="address"
                            ref={initAutocomplete}
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder={t.step1.placeholders.address}
                            className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${errors.address ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus:border-brand-accent'
                              }`}
                          />
                          {errors.address && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                              <AlertCircle size={12} /> {errors.address}
                            </p>
                          )}
                        </div>

                        {/* Number of Children */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Baby size={16} className="text-brand-accent" />
                            {t.step1.numChildren}
                          </label>
                          <select
                            name="numChildren"
                            value={formData.numChildren}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent appearance-none cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? t.common.child : t.common.children}</option>
                            ))}
                          </select>
                        </div>

                        {/* Dynamic DOBs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <AnimatePresence mode="popLayout">
                            {formData.childDOBs.map((dob, index) => {
                              const age = calculateAge(dob);
                              return (
                                <motion.div
                                  key={`dob-${index}`}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 relative"
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                      {t.step1.childDob.replace('{n}', (index + 1).toString())}
                                    </label>
                                    {age !== null && (
                                      <span className="text-[10px] font-bold bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full">
                                        {formatAge(age)} {language === 'fr' ? '' : 'old'}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => handleDOBChange(index, e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${errors[`childDOB_${index}`] ? 'border-red-400 ring-1 ring-red-100' : 'border-slate-200 focus:border-brand-accent'
                                      }`}
                                  />
                                  {errors[`childDOB_${index}`] && (
                                    <p className="text-[10px] text-red-500 mt-1">{errors[`childDOB_${index}`]}</p>
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Telephone */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Phone size={16} className="text-brand-accent" />
                              {t.step1.phone}
                            </label>
                            <div className="relative phone-input-container">
                              <PhoneInput
                                country={'fr'}
                                value={formData.telephone}
                                onChange={(phone) => setFormData(prev => ({ ...prev, telephone: phone.startsWith('+') ? phone : `+${phone}` }))}
                                enableSearch={true}
                                searchPlaceholder={language === 'fr' ? 'Chercher...' : 'Search...'}
                                containerClass="w-full !border-none"
                                inputClass={`!w-full !h-[50px] !bg-slate-50/50 !border !rounded-xl !text-slate-900 !font-medium !pl-14 focus:!ring-2 focus:!ring-brand-accent/20 focus:!border-brand-accent ${errors.telephone ? '!border-red-400' : '!border-slate-200'}`}
                                buttonClass="!h-[50px] !bg-slate-50/50 !border !border-slate-200 !rounded-l-xl !px-2 hover:!bg-slate-100/50 !transition-colors !min-w-[50px] !z-10"
                                dropdownClass="!max-h-80 !overflow-y-auto !bg-white !border !border-slate-200 !rounded-xl !shadow-2xl !z-[100]"
                                searchClass="!bg-white !p-2 !sticky !top-0 !z-20"
                                inputProps={{
                                  name: 'telephone',
                                  required: true,
                                }}
                              />
                            </div>
                            {errors.telephone && (
                              <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1">
                                <AlertCircle size={12} /> {errors.telephone}
                              </p>
                            )}
                          </div>



                          {/* Email */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Mail size={16} className="text-brand-accent" />
                              {t.step1.email}
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              readOnly={isLoggedIn}
                              placeholder={t.step1.placeholders.email}
                              className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isLoggedIn ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50'
                                } ${errors.email ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus:border-brand-accent'
                                }`}
                            />
                            {errors.email && (
                              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} /> {errors.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="space-y-8 mt-8">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleNextStep}
                            disabled={isRegistering}
                            className={`w-full bg-brand-accent hover:bg-[#66B2AC] text-white font-display font-bold py-4 rounded-xl shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-colors ${isRegistering ? 'opacity-70 cursor-not-allowed' : ''
                              }`}
                          >
                            {isRegistering ? t.common.loading : t.common.next}
                            {!isRegistering && <ChevronRight size={20} />}
                          </motion.button>

                          {!isLoggedIn && !isModifying && (
                            <div className="pt-2 text-center">
                              <button
                                onClick={() => setView('login')}
                                className="text-sm font-bold text-slate-400 hover:text-brand-accent transition-colors"
                              >
                                {t.login.existingAccount}
                              </button>
                            </div>
                          )}


                          {isModifying && (
                            <div className="pt-4 text-center">
                              <button
                                onClick={() => {
                                  setIsModifying(false);
                                  setParentRequestId(null);
                                  setView('profile');
                                }}
                                className="text-sm font-bold text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto transition-colors"
                              >
                                <X size={16} />
                                {t.common.cancel}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : currentStep === 2 ? (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-6 md:p-10 relative overflow-hidden"
                  >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/30 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue/30 rounded-full -ml-16 -mb-16 blur-3xl" />

                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-8">
                        <button
                          onClick={handleBackStep}
                          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <div>
                          <h1 className="text-3xl font-display font-bold text-slate-800 mb-1">{t.step2.title}</h1>
                          <p className="text-slate-500 text-sm">{t.step2.subtitle}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Calendar Selection */}
                        <div className="lg:col-span-6 space-y-8">
                          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                              <h2 className="font-display font-bold text-slate-800">
                                {calendarViewDate.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })}
                              </h2>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() - 1)))}
                                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-brand-accent border border-transparent hover:border-slate-100"
                                >
                                  <ChevronLeft size={20} />
                                </button>
                                <button
                                  onClick={() => setCalendarViewDate(new Date(calendarViewDate.setMonth(calendarViewDate.getMonth() + 1)))}
                                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-brand-accent border border-transparent hover:border-slate-100"
                                >
                                  <ChevronRight size={20} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-7 gap-2 mb-2">
                              {Object.values(t.common.days).map(d => (
                                <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-2">
                                  {d}
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                              {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} />
                              ))}
                              {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), i + 1);
                                const dateId = formatDateId(date);
                                const isSelected = dateSchedule.some(item => item.id === dateId);
                                const isToday = formatDateId(new Date()) === dateId;

                                return (
                                  <motion.button
                                    key={dateId}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => toggleDateSelection(date)}
                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative ${isSelected
                                      ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20'
                                      : isToday
                                        ? 'bg-brand-blue/30 text-slate-900 border border-brand-blue'
                                        : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'
                                      }`}
                                  >
                                    {i + 1}
                                    {isSelected && (
                                      <motion.div
                                        layoutId="dot"
                                        className="w-1 h-1 bg-white rounded-full mt-0.5"
                                      />
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Time Slots Management */}
                        <div className="lg:col-span-6 space-y-6">
                          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                              {isRegistering && dateSchedule.length === 0 ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200"
                                >
                                  <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                  <p className="text-slate-400 text-sm font-medium">{t.common.loading}</p>
                                </motion.div>
                              ) : dateSchedule.length === 0 ? (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200"
                                >
                                  <CalendarDays size={40} className="mx-auto text-slate-300 mb-3" />
                                  <p className="text-slate-400 text-sm font-medium">{t.step2.noDates}</p>
                                </motion.div>
                              ) : (
                                dateSchedule.map((item) => (
                                  <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group"
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                                          <Calendar size={18} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            {item.date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long' })}
                                          </p>
                                          <p className="font-display font-bold text-slate-800">
                                            {formatDate(item.date)}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => toggleDateSelection(item.date)}
                                        className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                      {item.slots.map((slot, sIdx) => (
                                        <div key={slot.id} className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                              {t.common.Slot} #{sIdx + 1}
                                            </span>
                                            {item.slots.length > 1 && (
                                              <button
                                                onClick={() => removeTimeSlot(item.id, slot.id)}
                                                className="text-slate-300 hover:text-red-400 transition-colors"
                                              >
                                                <X size={14} />
                                              </button>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1">
                                              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                <Clock size={10} /> {t.step2.startTime}
                                              </label>
                                              <input
                                                type="time"
                                                value={slot.startTime}
                                                onChange={(e) => updateTimeSlot(item.id, slot.id, 'startTime', e.target.value)}
                                                className={`w-full px-3 py-2 rounded-xl border outline-none transition-all text-sm font-medium ${errors[`${item.id}_${slot.id}_time`] ? 'border-red-400 ring-red-100' : 'border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'}`}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                <Clock size={10} /> {t.step2.endTime}
                                              </label>
                                              <input
                                                type="time"
                                                value={slot.endTime}
                                                onChange={(e) => updateTimeSlot(item.id, slot.id, 'endTime', e.target.value)}
                                                className={`w-full px-3 py-2 rounded-xl border focus:ring-2 outline-none transition-all text-sm font-medium ${errors[`${item.id}_${slot.id}_time`] ? 'border-red-400 ring-red-100' : 'border-slate-200 focus:border-brand-accent focus:ring-brand-accent/20'
                                                  }`}
                                              />
                                            </div>
                                          </div>
                                          {errors[`${item.id}_${slot.id}_time`] && (
                                            <p className="text-[10px] text-red-500 flex items-center gap-1 font-medium">
                                              <AlertCircle size={10} /> {errors[`${item.id}_${slot.id}_time`]}
                                            </p>
                                          )}
                                        </div>
                                      ))}

                                      <button
                                        onClick={() => addTimeSlot(item.id)}
                                        className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-brand-accent hover:border-brand-accent hover:bg-brand-accent/5 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                                      >
                                        <Plus size={14} />
                                        {t.common.AddTimeSlot}
                                      </button>
                                    </div>
                                  </motion.div>
                                ))
                              )}
                            </AnimatePresence>
                            {errors.schedule && (
                              <p className="text-sm text-red-500 text-center font-medium">{errors.schedule}</p>
                            )}
                          </div>

                          <div className="pt-6">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={isRegistering || hasInvalidSlots()}
                              onClick={handleNextStep}
                              className={`w-full font-display font-bold py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all text-lg ${isRegistering || hasInvalidSlots()
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-brand-accent hover:bg-[#66B2AC] text-white shadow-brand-accent/30'
                                }`}
                            >
                              {isRegistering ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ChevronRight size={22} />
                              )}
                              {isRegistering ? t.common.loading : t.step2.validateButton}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : currentStep === 3 ? (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full max-w-4xl bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-5 md:p-10 relative overflow-hidden"
                  >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/20 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/20 rounded-full -ml-32 -mb-32 blur-3xl" />

                    <div className="relative z-10">
                      {isRegistering && (
                        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-[32px] -m-6 md:-m-10">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 font-bold animate-pulse">{t.common.loading}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mb-8">
                        <button
                          onClick={handleBackStep}
                          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <div>
                          <h1 className="text-3xl font-display font-bold text-slate-800 mb-1">{t.step3.title}</h1>
                          <p className="text-slate-500 text-sm">{t.step3.subtitle}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="bg-slate-50 rounded-3xl p-4 md:p-6 border border-slate-100 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <UserIcon size={16} className="text-brand-accent" />
                              {t.common.UserInformation}
                            </h3>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">{t.common.FirstName}</span>
                                <span className="text-sm font-bold text-slate-800">{formData.firstName}</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">{t.common.LastName}</span>
                                <span className="text-sm font-bold text-slate-800">{formData.lastName}</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">{t.common.Email}</span>
                                <span className="text-sm font-bold text-slate-800">{formData.email}</span>
                              </div>

                              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <span className="text-xs text-slate-500">{t.common.QuoteDate}</span>
                                <span className="text-sm font-bold text-brand-accent">
                                  {new Date().toLocaleDateString(
                                    language === 'fr' ? 'fr-FR' : 'en-US',
                                    { day: 'numeric', month: 'long', year: 'numeric' }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-3xl p-4 md:p-6 border border-slate-100 space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Calendar size={16} className="text-brand-accent" />
                              {t.common.ScheduleSummary} {selectedMonth && `(${selectedMonth})`}
                            </h3>

                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                              {dateSchedule
                                .filter(item => {
                                  if (!selectedMonth) return true;
                                  const monthStr = item.date.toLocaleString(
                                    language === 'fr' ? 'fr-FR' : 'en-US',
                                    { month: 'long', year: 'numeric' }
                                  );
                                  return monthStr === selectedMonth;
                                })
                                .map(item => (
                                  <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-200 last:border-0">
                                    <span className="text-xs font-medium text-slate-600">
                                      {item.date.toLocaleDateString(
                                        language === 'fr' ? 'fr-FR' : 'en-US',
                                        { day: 'numeric', month: 'short' }
                                      )}
                                    </span>

                                    <div className="flex flex-col items-end">
                                      {item.slots.map(slot => (
                                        <span key={slot.id} className="text-[10px] text-slate-400">
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="bg-white rounded-[32px] p-5 md:p-8 border border-slate-100 shadow-sm flex flex-col space-y-6 md:space-y-8">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Receipt size={16} className="text-brand-accent" />
                                {t.step2.priceBreakdown}
                              </h3>
                              {getAvailableMonths().length > 1 && (
                                <select
                                  value={selectedMonth}
                                  onChange={(e) => setSelectedMonth(e.target.value)}
                                  className="text-xs font-bold text-brand-accent bg-brand-accent/5 px-3 py-1.5 rounded-xl border border-brand-accent/20 focus:outline-none transition-all cursor-pointer"
                                >
                                  {getAvailableMonths().map(month => (
                                    <option key={month} value={month}>{month}</option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div className="space-y-4 md:space-y-6">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{t.step2.childcarePackage}</span>
                                  <span className="text-[11px] text-slate-400">({formatNumber(totalHours)}h × {formatCurrency(hourlyRate)})</span>
                                </div>
                                <span className="font-bold text-slate-700">{formatCurrency(baseSubtotal)}</span>
                              </div>

                              <div className="flex justify-between items-start pt-4 md:pt-6 border-t border-slate-50">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{t.step2.cafAssistance}</span>
                                  <span className="text-[11px] font-mono text-slate-400">{cmgDisplayFormat}</span>
                                </div>
                                <span className="font-bold text-brand-accent">{formatCurrency(estimatedCMG)}</span>
                              </div>

                              <div className="flex justify-between items-start pt-4 md:pt-6 border-t border-slate-50">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{t.step2.taxCredit}</span>
                                  <span className="text-[11px] font-mono text-slate-400">{taxCreditDisplayFormat}</span>
                                </div>
                                <span className="font-bold text-emerald-500">{formatCurrency(estimatedTaxCredit)}</span>
                              </div>

                              <div className="pt-8 mt-2 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t.step2.finalCost}</span>
                                </div>
                                <span className="text-3xl md:text-4xl font-display font-bold text-brand-accent">{formatCurrency(finalCostAfterAid)}</span>
                              </div>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleNextStep}
                            disabled={isRegistering}
                            aria-busy={isRegistering}
                            className={`w-full font-display font-bold py-5 ${isRegistering ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-brand-accent hover:bg-[#66B2AC] text-white'} rounded-2xl shadow-xl shadow-brand-accent/30 flex items-center justify-center gap-3 transition-all text-lg`}
                          >
                            {isRegistering ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>{language === 'fr' ? 'Traitement...' : 'Processing...'}</span>
                              </>
                            ) : (
                              <>
                                <ChevronRight size={22} />
                                {t.modals.confirmSelection.title}
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-5 md:p-10 relative overflow-hidden"
                  >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/20 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/20 rounded-full -ml-32 -mb-32 blur-3xl" />

                    <div className="relative z-10">
                      {isRegistering && (
                        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-[32px]">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 font-bold animate-pulse">{t.common.loading}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleBackStep}
                            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <div>
                            <h1 className="text-3xl font-display font-bold text-slate-800 mb-1">{t.step4.title}</h1>
                            <p className="text-slate-500 text-sm">{t.step4.subtitle}</p>
                          </div>
                        </div>
                      </div>

                      {/* Your Selected Candidates Section */}
                      <AnimatePresence>
                        {selectedCandidates.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-8"
                          >
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Award size={16} className="text-brand-accent" />
                              {t.step4.selectedTitle}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {selectedCandidates.map((candidate, index) => {
                                let sitter = localizedSitters.find(s => s.id === candidate.sitterId);

                                // Fallback to proxy sitter if not loaded yet
                                if (!sitter && (candidate as any).sitterInfo) {
                                  const info = (candidate as any).sitterInfo;
                                  sitter = {
                                    id: candidate.sitterId,
                                    key: `proxy-${candidate.sitterId}`,
                                    name: info.name,
                                    lastName: info.lastName,
                                    photo: 'https://bloom-buddies.fr/public/uploads/profile_images/default.jpg',
                                    age: 20,
                                    experience: 0,
                                    languages: [],
                                    description: '',
                                    fullBio: '',
                                    status: 'Available',
                                    rating: 4.5,
                                    reviews: 0
                                  };
                                }

                                if (!sitter) return null;
                                const rankLabel = t.step4.rankLabels[index];

                                return (
                                  <motion.div
                                    key={candidate.sitterId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white border-2 border-brand-accent/20 rounded-2xl p-4 shadow-sm relative group"
                                  >
                                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-accent text-white rounded-full flex items-center justify-center font-bold text-xs shadow-lg">
                                      {rankLabel}
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                      <img src={sitter.photo} alt={sitter.name} className="w-10 h-10 rounded-xl object-cover" />
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{sitter.name}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                          {candidate.interview.skipped ? (
                                            <span className="flex items-center gap-1"><X size={10} /> {t.common.noInterview}</span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                              <Calendar size={10} /> {candidate.interview.date}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => editInterview(sitter.id)}
                                        className="flex-1 py-1.5 text-[10px] font-bold text-brand-accent bg-brand-accent/5 hover:bg-brand-accent/10 rounded-lg transition-colors"
                                      >
                                        {t.common.modify}
                                      </button>
                                      <button
                                        onClick={() => removeCandidate(sitter.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Filters Section */}
                      <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-white rounded-[32px] border border-slate-100 mb-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                        {/* Header */}
                        <div
                          className="flex items-center justify-between border-b border-slate-100 relative z-10 cursor-pointer"
                          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        >
                          <div className="flex items-center gap-2 text-slate-400">
                            <Filter size={18} className="text-brand-accent" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">{t.common.filters}</span>
                          </div>
                          <button
                            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                            aria-label={isFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
                          >
                            {isFiltersExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>

                        <AnimatePresence>
                          {isFiltersExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              {/* Search Bar */}
                              <div className="mb-8 relative z-10">
                                <div className="relative group">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-accent transition-colors" size={20} />
                                  <input
                                    type="text"
                                    placeholder={language === 'fr' ? 'Rechercher une babysitter...' : 'Search babysitters...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="mt-4 w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent transition-all shadow-sm group-hover:shadow-md"
                                  />
                                </div>
                              </div>

                              {/* Categories Container */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                                {/* By Languages Category */}
                                <div className="flex flex-col gap-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.byLanguages}</span>
                                  <div className="flex flex-wrap gap-2">
                                    {['English', 'French'].map(lang => (
                                      <button
                                        key={lang}
                                        onClick={() => {
                                          setFilters(prev => ({
                                            ...prev,
                                            language: prev.language.includes(lang)
                                              ? prev.language.filter(l => l !== lang)
                                              : [...prev.language, lang]
                                          }));
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border whitespace-nowrap ${filters.language.includes(lang)
                                          ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20 scale-105'
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-brand-accent/40 hover:bg-slate-50'
                                          }`}
                                      >
                                        {lang}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* By Age Group Category */}
                                <div className="flex flex-col gap-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.byAgeGroup}</span>
                                  <div className="flex flex-wrap gap-2">
                                    {['Infants', 'Toddlers', 'Preschoolers', 'Young Learners'].map(age => (
                                      <button
                                        key={age}
                                        onClick={() => {
                                          setFilters(prev => ({
                                            ...prev,
                                            age_group: prev.age_group.includes(age)
                                              ? prev.age_group.filter(a => a !== age)
                                              : [...prev.age_group, age]
                                          }));
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border whitespace-nowrap ${filters.age_group.includes(age)
                                          ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20 scale-105'
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-brand-accent/40 hover:bg-slate-50'
                                          }`}
                                      >
                                        {age === 'Infants' ? t.common.infants :
                                          age === 'Toddlers' ? t.common.toddlers :
                                            age === 'Preschoolers' ? t.common.preschoolers :
                                              t.common.youngLearners}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* By Experience Category */}
                                <div className="flex flex-col gap-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.byExperience}</span>
                                  <div className="flex flex-wrap gap-2">
                                    {['1+', '3+', '5+', '10+'].map(exp => (
                                      <button
                                        key={exp}
                                        onClick={() => {
                                          setFilters(prev => ({
                                            ...prev,
                                            experience: prev.experience === exp ? '' : exp
                                          }));
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border whitespace-nowrap ${filters.experience === exp
                                          ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20 scale-105'
                                          : 'bg-white border-slate-200 text-slate-600 hover:border-brand-accent/40 hover:bg-slate-50'
                                          }`}
                                      >
                                        {exp} {t.step4.exp}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Babysitter Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {localizedSitters.map((sitter) => {
                          const isSelected = selectedCandidates.some(c => c.sitterId === sitter.id);
                          const isMaxReached = selectedCandidates.length >= 4;

                          return (
                            <motion.div
                              key={sitter.id}
                              whileHover={{ y: -5 }}
                              className={`group relative bg-white rounded-3xl border transition-all duration-300 flex flex-col h-full overflow-hidden ${isSelected
                                ? 'border-brand-accent ring-4 ring-brand-accent/5 shadow-xl'
                                : 'border-slate-100 hover:border-brand-accent/30 hover:shadow-lg'
                                }`}
                            >
                              {/* Status badge moved inline with header (no absolute badge) */}

                              <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-4 mb-4">
                                  <div className="relative">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                      <img
                                        src={sitter.photo}
                                        alt={sitter.name}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    {isSelected && (
                                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                        <Check size={14} strokeWidth={3} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 flex items-start justify-between">
                                    <div>
                                      <h3 className="font-display font-bold text-slate-800">{sitter.name} {sitter.lastName}</h3>
                                      <p className="text-xs text-slate-500">{sitter.age} {t.step4.years} • {formatExperienceShortFromMonths((sitter as any).experienceMonths || 0)}</p>
                                     {/* 
                                      <div className="flex items-center gap-1 mt-1">
                                        <Star size={12} className="text-amber-400 fill-amber-400" />
                                        <span className="text-xs font-bold text-slate-700">{sitter.rating}</span>
                                      </div> 
                                      */}
                                    </div>

                                    {/* Status dot with tooltip on hover */}
                                    <div className="ml-3 self-center">
                                      <Tooltip placement="left" content={<span className="text-xs font-bold">{sitter.status === 'Online' ? t.common.online : t.common.available}</span>}>
                                        <div
                                          className={`w-3 h-3 rounded-full ${sitter.status === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}
                                          aria-hidden
                                        />
                                      </Tooltip>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                  <div className="flex flex-wrap gap-1.5">
                                    {sitter.languages.map(lang => (
                                      <span key={lang} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded-md border border-slate-100">
                                        {lang}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                    {sitter.description}
                                  </p>
                                </div>

                                <div className="space-y-3 mt-auto">
                                  <button
                                    onClick={() => setViewingBabysitter(sitter)}
                                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-brand-accent hover:bg-brand-accent/5 rounded-xl transition-colors flex items-center justify-center gap-2"
                                  >
                                    {t.common.viewProfile} <ExternalLink size={14} />
                                  </button>

                                  {isSelected ? (
                                    <div className="w-full py-2.5 rounded-xl flex items-center justify-between px-3 bg-emerald-50 border border-emerald-100">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                          {selectedCandidates.findIndex(c => c.sitterId === sitter.id) + 1}
                                        </div>
                                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-tighter">{t.step4.selected}</span>
                                      </div>
                                      <button
                                        onClick={() => removeCandidate(sitter.id)}
                                        className="text-[10px] font-bold text-red-500 hover:underline"
                                      >
                                        {t.common.remove}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setSchedulingSitter(sitter)}
                                      disabled={isMaxReached}
                                      className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg ${isMaxReached
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200'
                                        }`}
                                    >
                                      {isMaxReached ? t.step4.maxCandidates : (
                                        selectedCandidates.length === 0 ? t.step4.selectFirst :
                                          selectedCandidates.length === 1 ? t.step4.selectSecond :
                                            selectedCandidates.length === 2 ? t.step4.selectThird :
                                              selectedCandidates.length === 3 ? t.step4.selectFourth :
                                                t.step4.selectCandidate
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Infinite Scroll Loader */}
                      <div ref={loaderRef} className="py-10 flex justify-center">
                        {isFetchingSitters && hasMoreSitters && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.common.loading}</p>
                          </div>
                        )}
                        {!hasMoreSitters && localizedSitters.length > 0 && (
                          <p className="text-xs text-slate-400 font-medium italic">No more babysitters to load.</p>
                        )}
                      </div>

                      {errors.candidates && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                          <AlertCircle size={20} />
                          <p className="text-sm font-medium">{errors.candidates}</p>
                        </div>
                      )}

                      {/* Sticky Footer */}
                      <div className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md p-4 -mx-6 md:-mx-10 border-t border-slate-100 flex flex-col sm:flex-row gap-4 z-20">
                        <button
                          onClick={handleBackStep}
                          className="flex-1 py-4 px-8 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                        >
                          {t.common.back}
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleNextStep}
                          disabled={isRegistering || selectedCandidates.length === 0}
                          className={`flex-[2] font-display font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all ${isRegistering || selectedCandidates.length === 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-brand-accent hover:bg-[#66B2AC] text-white shadow-brand-accent/30'
                            }`}
                        >
                          {isRegistering ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              {t.step4.submitSelection}
                              <ChevronRight size={20} />
                            </>
                          )}
                        </motion.button>
                      </div>
                      {/* 
                      <p className="text-[10px] text-slate-400 text-center mt-6 px-4">
                        {t.step4.paymentNote.replace('{amount}', formatCurrency(19))}
                      </p>*/}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isConfirmModalProcessing && setIsConfirmModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
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
                  <div className="w-12 h-12 bg-brand-accent/10 text-brand-accent rounded-2xl flex items-center justify-center border border-slate-50 shadow-sm">
                    <CheckCircle2 size={24} />
                  </div>
                  <button
                    onClick={() => !isConfirmModalProcessing && setIsConfirmModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">
                  {t.modals.confirmSelection.title}
                </h3>
                <p className="text-slate-500 mb-8 whitespace-pre-line leading-relaxed font-bold">
                  {t.modals.confirmSelection.subtitle}
                </p>

                {errors.candidates && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                    <AlertCircle size={20} />
                    {errors.candidates}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => !isConfirmModalProcessing && setIsConfirmModalOpen(false)}
                    disabled={isConfirmModalProcessing}
                    className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                  >
                    {t.modals.confirmSelection.cancel}
                  </button>
                  <button
                    onClick={handleConfirmSubmission}
                    disabled={isConfirmModalProcessing}
                    className="flex-1 py-4 px-6 bg-brand-accent hover:bg-[#66B2AC] text-white font-bold rounded-2xl shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {isConfirmModalProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      t.modals.confirmSelection.confirm
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPaymentProcessing && setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              {!isPaymentSuccess ? (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-display font-bold text-slate-800">{t.payment.title}</h3>
                    <button
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500">{t.payment.subtitle}</span>
                      <span className="font-bold text-slate-800">{formatCurrency(19)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Transaction ID</span>
                      <span>#NM-88291-Q</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">{t.payment.cardNumber}</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all"
                        />
                        <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t.payment.expiry}</label>
                        <input
                          type="text"
                          placeholder={t.payment.expiry}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t.payment.cvc}</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-2 text-[10px] text-slate-400 justify-center mb-6">
                    <Lock size={12} />
                    {t.payment.securityNote}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsPaymentProcessing(true);
                      setTimeout(() => {
                        setIsPaymentProcessing(false);
                        setIsPaymentSuccess(true);
                        setTimeout(() => {
                          setIsPaymentModalOpen(false);
                          setIsSubmitted(true);
                          // Reset for future if needed
                          setTimeout(() => setIsPaymentSuccess(false), 500);
                        }, 2000);
                      }, 2500);
                    }}
                    disabled={isPaymentProcessing}
                    className="w-full bg-brand-accent hover:bg-[#66B2AC] text-white font-display font-bold py-4 rounded-2xl shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {isPaymentProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        {t.payment.processing}
                      </>
                    ) : (
                      <>
                        {t.payment.payButton.replace('{amount}', formatCurrency(19))}
                        <ChevronRight size={20} />
                      </>
                    )}
                  </motion.button>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
                  >
                    <Check size={40} />
                  </motion.div>
                  <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">{t.payment.success}</h3>
                  <p className="text-slate-500">{t.payment.redirecting}</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interview Scheduling Modal */}
      <AnimatePresence>
        {schedulingSitter && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSchedulingSitter(null);
                setModalError('');
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-display font-bold text-slate-800">{t.modals.interview.title}</h3>
                  <button
                    onClick={() => {
                      setSchedulingSitter(null);
                      setModalError('');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
                  <img src={schedulingSitter.photo} alt={schedulingSitter.name} className="w-14 h-14 rounded-xl object-cover" />
                  <div>
                    <h4 className="font-bold text-slate-800">{schedulingSitter.name}</h4>
                    <p className="text-xs text-slate-500">{formatExperienceLongFromMonths((schedulingSitter as any).experienceMonths || 0)}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                              {t.modals.interview.preferredDate} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent" size={18} />
                              <input
                                type="date"
                                value={modalInterviewConfig.date}
                                required
                                onChange={(e) => {
                                  setModalInterviewConfig(prev => ({ ...prev, date: e.target.value }));
                                  setModalError('');
                                }}
                                min={formatDateId(new Date())}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400">
                              {t.modals.interview.preferredTime} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent" size={18} />
                              <input
                                type="time"
                                value={modalInterviewConfig.time}
                                required
                                onChange={(e) => {
                                  setModalInterviewConfig(prev => ({ ...prev, time: e.target.value }));
                                  setModalError('');
                                }}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all"
                                placeholder="HH:MM"
                              />
                            </div>
                          </div>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                      <Info size={10} /> {t.modals.interview.timezone}
                    </p>
                  </div>

                  {modalError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                      <AlertCircle size={14} />
                      {modalError}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      onClick={() => confirmCandidateSelection(false)}
                      className="w-full py-4 px-4 bg-brand-accent hover:bg-[#66B2AC] text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-accent/20 transition-all"
                    >
                      {t.modals.interview.confirm}
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSchedulingSitter(null);
                          setModalError('');
                        }}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        {t.common.back}
                      </button>
                      <button
                        onClick={() => confirmCandidateSelection(true)}
                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
                      >
                        {t.modals.interview.skipBtn}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {viewingBabysitter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setViewingBabysitter(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] md:rounded-[40px] max-w-2xl w-full overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingBabysitter(null)}
                className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
              >
                <X size={20} className="text-slate-500" />
              </button>

              <div className="flex flex-col md:flex-row">
                <div className="md:w-2/5 relative">
                  <img
                    src={viewingBabysitter.photo.replace('200/200', '600/800')}
                    alt={viewingBabysitter.name}
                    className="w-full h-full object-cover min-h-[300px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
                  <div className="absolute bottom-6 left-6 text-white md:hidden">
                    <h2 className="text-2xl font-display font-bold">{viewingBabysitter.name}</h2>
                    <p className="text-sm opacity-90">{viewingBabysitter.age} {t.modals.profile.yearsOld}</p>
                  </div>
                </div>

                <div className="md:w-3/5 p-6 md:p-10 max-h-[80vh] overflow-y-auto">
                  <div className="hidden md:block mb-6">
                    <h2 className="text-3xl font-display font-bold text-slate-800 mb-1">{viewingBabysitter.name}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium">{viewingBabysitter.age} {t.modals.profile.yearsOld}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      {/* 
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="font-bold text-slate-700">{viewingBabysitter.rating}</span>
                        <span className="text-slate-400 text-sm">({viewingBabysitter.reviews} {t.common.reviews})</span>
                      </div>

                      */}

                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t.modals.profile.experience}</p>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Award size={16} className="text-brand-accent" /> {formatExperienceLongFromMonths((viewingBabysitter as any).experienceMonths || 0)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t.modals.profile.languages}</p>
                      <div className="flex flex-wrap gap-1">
                        {viewingBabysitter.languages.map(l => (
                          <span key={l} className="text-[10px] font-bold text-brand-accent">{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <UserIcon size={16} className="text-brand-accent" /> {t.modals.profile.aboutMe}
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {viewingBabysitter.fullBio}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      {selectedCandidates.some(c => c.sitterId === viewingBabysitter.id) ? (
                        <button
                          onClick={() => {
                            // Remove the candidate for the currently viewed babysitter
                            removeCandidate(viewingBabysitter.id);
                            setViewingBabysitter(null);
                          }}
                          className="w-full py-4 rounded-2xl font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                        >
                          {t.common.remove}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSchedulingSitter(viewingBabysitter);
                            setViewingBabysitter(null);
                          }}
                          disabled={selectedCandidates.length >= 4}
                          className={`w-full py-4 rounded-2xl font-bold transition-all ${selectedCandidates.length >= 4
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-brand-accent text-white hover:bg-[#66B2AC] shadow-lg shadow-brand-accent/20'
                            }`}
                        >
                          {selectedCandidates.length >= 4 ? t.step4.maxCandidates : t.step4.selectCandidate}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Footer Message */}
      <div className="mt-12 text-center">
        <a 
          href="https://wa.me/33780857676" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-400 text-sm hover:text-brand-accent transition-colors flex items-center justify-center gap-2"
        >
          {t.footer.assistance}
        </a>
      </div>

      {/* WhatsApp Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#25D366] text-white rounded-full shadow-xl flex items-center justify-center z-50"
        onClick={() => window.open('https://wa.me/33780857676', '_blank')}
      >
        <MessageCircle size={28} fill="currentColor" />
      </motion.button>

      {/* Success Modal (Mock) */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-brand-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <Baby size={40} className="text-brand-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">{t.modals.success.title}</h2>
              <p className="text-slate-500 mb-8">{t.modals.success.subtitle}</p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setView('profile');
                  setCurrentStep(1);
                  setSelectedCandidates([]);
                  setSchedulingSitter(null);
                  setModalInterviewConfig({ date: '', time: '10:00', skipped: false });
                  setIsPaymentSuccess(false);
                }}
                className="w-full bg-brand-accent text-white font-bold py-3 rounded-xl hover:bg-[#66B2AC] transition-colors"
              >
                {t.modals.success.backToStart}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster position="top-right" />
    </div>
  );
}
