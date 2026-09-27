import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Clock,
  Calendar,
  Plus,
  Search,
  Send,
  RefreshCw,
  Check,
  ExternalLink,
  Trash2,
  Edit3,
  Download,
  Bell,
  LogOut,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  BirthdayContact,
  DeliveryChannel,
  DispatchLogEntry,
  GoogleCalendarEventItem,
  PendingCalendarMutation,
  RelationshipType,
  WishTemplate,
} from './types/birthday';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  clearCachedToken,
  logout,
} from './services/googleAuth';
import {
  fetchGoogleCalendarBirthdays,
  fetchUpcomingCalendarEvents,
  createMidnightBirthdayCalendarEvent,
  updateMidnightBirthdayCalendarEvent,
  deleteGoogleCalendarEvent,
} from './services/calendarApi';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { CalendarConfirmModal } from './components/CalendarConfirmModal';
import { NoonStrikeModal } from './components/NoonStrikeModal';
import { ContactFormModal, interpolateWishTemplate } from './components/ContactFormModal';

type WorkspaceTab = 'queue' | 'calendar' | 'templates' | 'logs';
type QueueFilter = 'all' | 'today' | 'upcoming30' | 'synced' | 'unsynced';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DEFAULT_TEMPLATES: WishTemplate[] = [
  {
    id: 'tpl-warm',
    name: '12:00 AM Midnight Warm Wish',
    category: 'Friend',
    subjectLine: 'Happy Birthday, {firstName}! 🎂',
    body: 'Happy Birthday, {firstName}! Wishing you right at 12:00 AM midnight sharp — may your year ahead be filled with good health, great adventures, and unforgettable moments!',
  },
  {
    id: 'tpl-family',
    name: 'Family 12:00 AM Celebration',
    category: 'Family',
    subjectLine: 'Happy Birthday {firstName}! Sending love at 12 AM',
    body: 'Happy Birthday, {firstName}! Right as the clock strikes 12:00 AM midnight, sending you the biggest hug and warmest wishes for a joyful, healthy year ahead.',
  },
  {
    id: 'tpl-colleague',
    name: 'Executive & Colleague Note',
    category: 'Colleague',
    subjectLine: 'Wishing you a great Birthday, {firstName}',
    body: 'Happy Birthday, {firstName}! Wishing you right at 12:00 AM a fantastic day and continued success in the year ahead. Grateful to work alongside you!',
  },
  {
    id: 'tpl-client',
    name: 'VIP Client Appreciation',
    category: 'Client',
    subjectLine: 'Warmest Birthday Wishes, {firstName}',
    body: 'Happy Birthday, {firstName}! Wishing you a wonderful celebration starting right at 12:00 AM and a prosperous, rewarding year ahead.',
  },
];

function createInitialContacts(): BirthdayContact[] {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const inTwentyFiveDays = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'c-today-1',
      name: 'Rohan Verma',
      month: todayMonth,
      day: todayDay,
      birthYear: 1997,
      relationship: 'Friend',
      preferredChannel: 'WhatsApp',
      phone: '+91 98201 44120',
      email: 'rohan.verma@example.com',
      templateId: 'tpl-warm',
      customWish:
        'Happy Birthday, Rohan! Wishing you right at 12:00 AM midnight sharp — may your year ahead be filled with good health, great adventures, and unforgettable moments!',
    },
    {
      id: 'c-tomorrow-2',
      name: 'Ananya Nair',
      month: tomorrow.getMonth() + 1,
      day: tomorrow.getDate(),
      birthYear: 1995,
      relationship: 'Family',
      preferredChannel: 'WhatsApp',
      phone: '+91 98114 22098',
      email: 'ananya.nair@example.com',
      templateId: 'tpl-family',
      customWish:
        'Happy Birthday, Ananya! Right as the clock strikes 12:00 AM midnight, sending you the biggest hug and warmest wishes for a joyful, healthy year ahead.',
    },
    {
      id: 'c-nextweek-3',
      name: 'Vikramaditya Mehta',
      month: nextWeek.getMonth() + 1,
      day: nextWeek.getDate(),
      birthYear: 1991,
      relationship: 'Colleague',
      preferredChannel: 'Email',
      email: 'vikram.mehta@example.com',
      phone: '+1 415 890 3312',
      templateId: 'tpl-colleague',
      customWish:
        'Happy Birthday, Vikramaditya! Wishing you right at 12:00 AM a fantastic day and continued success in the year ahead. Grateful to work alongside you!',
    },
    {
      id: 'c-2weeks-4',
      name: 'Meera Krishnan',
      month: inTwoWeeks.getMonth() + 1,
      day: inTwoWeeks.getDate(),
      birthYear: 1998,
      relationship: 'Friend',
      preferredChannel: 'WhatsApp',
      phone: '+91 97650 11890',
      email: 'meera.k@example.com',
      templateId: 'tpl-warm',
      customWish:
        'Happy Birthday, Meera! Wishing you right at 12:00 AM midnight sharp — hope your day is packed with celebration, great food, and your favorite people!',
    },
    {
      id: 'c-25days-5',
      name: 'Siddharth Kapoor',
      month: inTwentyFiveDays.getMonth() + 1,
      day: inTwentyFiveDays.getDate(),
      birthYear: 1989,
      relationship: 'Client',
      preferredChannel: 'Email',
      email: 'siddharth@kapoorventures.example.com',
      templateId: 'tpl-client',
      customWish:
        'Happy Birthday, Siddharth! Wishing you a wonderful celebration starting right at 12:00 AM and a prosperous, rewarding year ahead.',
    },
  ];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Computes exact next 12:00:00 AM (00:00:00 Midnight) occurrence for a given birth month and day
 */
function getNextBirthdayMidnightDetails(month: number, day: number, now: Date) {
  const currentYear = now.getFullYear();
  const isTodayBirthday = now.getMonth() + 1 === month && now.getDate() === day;

  const thisYearMidnight = new Date(currentYear, month - 1, day, 0, 0, 0, 0);
  const endOfToday = new Date(currentYear, month - 1, day, 23, 59, 59, 999);

  let targetMidnightDate: Date;
  if (isTodayBirthday) {
    targetMidnightDate = thisYearMidnight;
  } else if (now.getTime() <= endOfToday.getTime()) {
    targetMidnightDate = thisYearMidnight;
  } else {
    targetMidnightDate = new Date(currentYear + 1, month - 1, day, 0, 0, 0, 0);
  }

  const diffMs = targetMidnightDate.getTime() - now.getTime();
  const daysAway = isTodayBirthday
    ? 0
    : Math.ceil(
        (new Date(targetMidnightDate.getFullYear(), month - 1, day).getTime() -
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
          (1000 * 60 * 60 * 24)
      );

  const isTomorrowMidnightTonight = daysAway === 1;

  return {
    isTodayBirthday,
    isTomorrowMidnightTonight,
    targetYear: targetMidnightDate.getFullYear(),
    targetMidnightDate,
    diffMs,
    daysAway,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('queue');

  // Live 1-second precision clock
  const [now, setNow] = useState<Date>(() => new Date());

  // Persistent Roster, Templates, and Dispatch Logs
  const [contacts, setContacts] = useState<BirthdayContact[]>(() => {
    try {
      const saved = localStorage.getItem('noonwish_contacts_12am_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return createInitialContacts();
  });

  const [templates, setTemplates] = useState<WishTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('noonwish_templates_12am_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_TEMPLATES;
  });

  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('noonwish_logs_12am_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipType | 'All'>('All');

  // Modals
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<BirthdayContact | null>(null);

  // 12:00 AM Strike Modal state
  const [strikeModalContacts, setStrikeModalContacts] = useState<BirthdayContact[]>([]);
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false);
  const [isSimulatedStrike, setIsSimulatedStrike] = useState(false);
  const lastAutoStrikeDateKeyRef = useRef<string | null>(null);

  // Auto-arm toggle for 12:00:00 AM
  const [isAutoStrikeArmed, setIsAutoStrikeArmed] = useState(true);
  // 5-second live countdown simulator to 12:00:00 AM
  const [simCountdownSeconds, setSimCountdownSeconds] = useState<number | null>(null);

  // Google Auth & Calendar State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authBannerMessage, setAuthBannerMessage] = useState<string | null>(null);

  // Calendar Sync State
  const [calendarBirthdays, setCalendarBirthdays] = useState<GoogleCalendarEventItem[]>([]);
  const [upcomingCalendarEvents, setUpcomingCalendarEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Mandatory Confirmation Dialog for Google Calendar Mutations
  const [pendingMutation, setPendingMutation] = useState<PendingCalendarMutation | null>(null);
  const [isExecutingMutation, setIsExecutingMutation] = useState<boolean>(false);

  // Template Editor State
  const [editingTemplateId, setEditingTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [templateDraftName, setTemplateDraftName] = useState<string>(DEFAULT_TEMPLATES[0].name);
  const [templateDraftCategory, setTemplateDraftCategory] = useState<RelationshipType | 'Universal'>(
    DEFAULT_TEMPLATES[0].category
  );
  const [templateDraftBody, setTemplateDraftBody] = useState<string>(DEFAULT_TEMPLATES[0].body);
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);

  // Save state to localStorage (only application roster/templates/logs, never OAuth tokens)
  useEffect(() => {
    try {
      localStorage.setItem('noonwish_contacts_12am_v2', JSON.stringify(contacts));
    } catch {
      // Ignore
    }
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem('noonwish_templates_12am_v2', JSON.stringify(templates));
    } catch {
      // Ignore
    }
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem('noonwish_logs_12am_v2', JSON.stringify(dispatchLogs));
    } catch {
      // Ignore
    }
  }, [dispatchLogs]);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      (maybeUser) => {
        setUser(maybeUser || null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Tick clock every 1 second & check for 12:00:00 AM (00:00:00 Midnight) sharp auto-strike
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNow(current);

      const hours = current.getHours();
      const minutes = current.getMinutes();
      const seconds = current.getSeconds();
      const dateKey = `${current.getFullYear()}-${pad2(current.getMonth() + 1)}-${pad2(
        current.getDate()
      )}`;

      // Check if clock is within the 12:00:00 AM – 12:00:59 AM (00:00) window today
      if (
        isAutoStrikeArmed &&
        hours === 0 &&
        minutes === 0 &&
        seconds >= 0 &&
        lastAutoStrikeDateKeyRef.current !== dateKey
      ) {
        const todaysBirthdays = contacts.filter(
          (c) =>
            c.month === current.getMonth() + 1 &&
            c.day === current.getDate() &&
            c.lastWishedYear !== current.getFullYear()
        );

        if (todaysBirthdays.length > 0) {
          lastAutoStrikeDateKeyRef.current = dateKey;
          setStrikeModalContacts(todaysBirthdays);
          setIsSimulatedStrike(false);
          setIsStrikeModalOpen(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [contacts, isAutoStrikeArmed]);

  // Calculate live 12:00:00 AM clock & countdown metrics
  const clockMetrics = useMemo(() => {
    const hours24 = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

    const currentTimeFormatted = `${pad2(hours12)}:${pad2(minutes)}:${pad2(seconds)} ${ampm}`;
    const currentDateFormatted = `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    // Next 12:00:00 AM (Midnight) target is the start of the next day (00:00:00)
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );

    const diffSeconds = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
    const cdHours = Math.floor(diffSeconds / 3600);
    const cdMinutes = Math.floor((diffSeconds % 3600) / 60);
    const cdSeconds = diffSeconds % 60;

    const countdownToMidnight = `${pad2(cdHours)}:${pad2(cdMinutes)}:${pad2(cdSeconds)}`;
    const isMidnightMinuteNow = hours24 === 0 && minutes === 0;

    return {
      currentTimeFormatted,
      currentDateFormatted,
      countdownToMidnight,
      isMidnightMinuteNow,
      nextMidnightLabel: 'Tonight at 12:00:00 AM',
    };
  }, [now]);

  // Enrich contacts with countdowns and sort by next upcoming birthday
  const enrichedContacts = useMemo(() => {
    return contacts
      .map((contact) => {
        const details = getNextBirthdayMidnightDetails(contact.month, contact.day, now);
        return {
          ...contact,
          ...details,
        };
      })
      .sort((a, b) => a.daysAway - b.daysAway);
  }, [contacts, now]);

  // Filtered contacts for Schedule Queue
  const filteredContacts = useMemo(() => {
    return enrichedContacts.filter((c) => {
      if (relationshipFilter !== 'All' && c.relationship !== relationshipFilter) {
        return false;
      }
      if (queueFilter === 'today' && !c.isTodayBirthday && !c.isTomorrowMidnightTonight)
        return false;
      if (queueFilter === 'upcoming30' && c.daysAway > 30) return false;
      if (queueFilter === 'synced' && !c.calendarEventId) return false;
      if (queueFilter === 'unsynced' && c.calendarEventId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const monthName = MONTH_NAMES[c.month - 1].toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.relationship.toLowerCase().includes(q) ||
          monthName.includes(q) ||
          c.customWish.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedContacts, queueFilter, relationshipFilter, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    const todaysCelebrants = enrichedContacts.filter((c) => c.isTodayBirthday);
    const tonightMidnightCelebrants = enrichedContacts.filter(
      (c) => c.isTomorrowMidnightTonight
    );
    const activeStrikeQueue =
      todaysCelebrants.length > 0 ? todaysCelebrants : tonightMidnightCelebrants;
    const upcoming30Count = enrichedContacts.filter((c) => c.daysAway <= 30).length;
    const syncedCount = enrichedContacts.filter((c) => Boolean(c.calendarEventId)).length;
    return {
      total: enrichedContacts.length,
      todayCount: todaysCelebrants.length + tonightMidnightCelebrants.length,
      todaysCelebrants,
      tonightMidnightCelebrants,
      activeStrikeQueue,
      upcoming30Count,
      syncedCount,
    };
  }, [enrichedContacts]);

  // Sign in with Google handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setCalendarError(null);
    setAuthBannerMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        setAuthBannerMessage(
          `Connected Google Calendar for ${
            result.user.email || result.user.displayName || 'your account'
          }.`
        );
        await loadGoogleCalendarData(result.accessToken);
      }
    } catch (err: any) {
      setCalendarError(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setCalendarBirthdays([]);
    setUpcomingCalendarEvents([]);
    setAuthBannerMessage('Signed out of Google Calendar.');
  };

  // Load events from Google Calendar
  const loadGoogleCalendarData = async (tokenOverride?: string) => {
    const token = tokenOverride || (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const [bdayItems, upcomingItems] = await Promise.all([
        fetchGoogleCalendarBirthdays(token),
        fetchUpcomingCalendarEvents(token),
      ]);
      setCalendarBirthdays(bdayItems);
      setUpcomingCalendarEvents(upcomingItems);
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        clearCachedToken();
        setAccessToken(null);
        setNeedsAuth(true);
        setCalendarError('Your Google Calendar session expired. Please sign in again.');
      } else {
        setCalendarError(err?.message || 'Could not load Google Calendar events.');
      }
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Request confirmation before creating/updating a single 12:00 AM Google Calendar event
  const requestSingleCalendarSync = async (contact: BirthdayContact) => {
    let token = await getAccessToken();
    if (!token || needsAuth) {
      try {
        setIsLoggingIn(true);
        const signInRes = await googleSignIn();
        if (!signInRes) return;
        setUser(signInRes.user);
        setAccessToken(signInRes.accessToken);
        setNeedsAuth(false);
        token = signInRes.accessToken;
        loadGoogleCalendarData(token);
      } catch (err: any) {
        setActiveTab('calendar');
        setCalendarError(
          err?.message ||
            'Please sign in with Google to schedule 12:00 AM events on your Google Calendar.'
        );
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    const details = getNextBirthdayMidnightDetails(contact.month, contact.day, now);
    const isUpdate = Boolean(contact.calendarEventId);

    setPendingMutation({
      type: isUpdate ? 'update_single' : 'create_single',
      title: isUpdate
        ? `Update 12:00 AM Event on Google Calendar?`
        : `Schedule 12:00 AM Birthday Event on Google Calendar?`,
      summaryDescription: isUpdate
        ? `This will update the existing annual 12:00:00 AM midnight birthday reminder for ${contact.name} on your primary Google Calendar.`
        : `This will create a recurring annual event sharp at 12:00:00 AM (Midnight) on ${
            MONTH_NAMES[contact.month - 1]
          } ${contact.day} for ${contact.name} on your primary Google Calendar with popup & email notifications.`,
      contacts: [contact],
      targetYear: details.targetYear,
    });
  };

  // Request confirmation before bulk syncing all unsynced contacts to Google Calendar
  const requestBulkCalendarSync = async () => {
    let token = await getAccessToken();
    if (!token || needsAuth) {
      try {
        setIsLoggingIn(true);
        const signInRes = await googleSignIn();
        if (!signInRes) return;
        setUser(signInRes.user);
        setAccessToken(signInRes.accessToken);
        setNeedsAuth(false);
        token = signInRes.accessToken;
        loadGoogleCalendarData(token);
      } catch (err: any) {
        setActiveTab('calendar');
        setCalendarError(
          err?.message || 'Please sign in with Google first to sync 12:00 AM events.'
        );
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    const unsynced = contacts.filter((c) => !c.calendarEventId);
    const targetList = unsynced.length > 0 ? unsynced : contacts;

    if (targetList.length === 0) return;

    setPendingMutation({
      type: 'create_bulk',
      title: `Schedule ${targetList.length} Birthday Events at 12:00 AM on Google Calendar?`,
      summaryDescription: `You are about to create or update ${targetList.length} recurring annual 12:00:00 AM (Midnight) birthday wish events on your primary Google Calendar.`,
      contacts: targetList,
      targetYear: now.getFullYear(),
    });
  };

  // Request confirmation before deleting a synced event from Google Calendar
  const requestDeleteCalendarEvent = async (contact: BirthdayContact) => {
    if (!contact.calendarEventId) return;
    const token = await getAccessToken();
    if (!token || needsAuth) {
      setNeedsAuth(true);
      setCalendarError('Please sign in with Google before deleting a calendar event.');
      return;
    }

    setPendingMutation({
      type: 'delete_single',
      title: `Delete ${contact.name}’s 12:00 AM Event from Google Calendar?`,
      summaryDescription: `This will permanently remove the recurring 12:00:00 AM birthday event for ${contact.name} from your primary Google Calendar.`,
      contacts: [contact],
      targetYear: now.getFullYear(),
      eventIdToDelete: contact.calendarEventId,
    });
  };

  // Execute confirmed Google Calendar mutation
  const handleConfirmCalendarMutation = async () => {
    if (!pendingMutation) return;
    const token = await getAccessToken();
    if (!token) {
      setPendingMutation(null);
      setNeedsAuth(true);
      return;
    }

    setIsExecutingMutation(true);
    setCalendarError(null);

    try {
      if (pendingMutation.type === 'delete_single' && pendingMutation.eventIdToDelete) {
        const targetContact = pendingMutation.contacts[0];
        await deleteGoogleCalendarEvent(token, pendingMutation.eventIdToDelete);
        setContacts((prev) =>
          prev.map((c) =>
            c.id === targetContact.id
              ? {
                  ...c,
                  calendarEventId: undefined,
                  calendarEventLink: undefined,
                  calendarSyncedAt: undefined,
                }
              : c
          )
        );
        setAuthBannerMessage(
          `Removed ${targetContact.name}’s 12:00 AM event from your Google Calendar.`
        );
      } else if (
        pendingMutation.type === 'create_single' ||
        pendingMutation.type === 'update_single'
      ) {
        const targetContact = pendingMutation.contacts[0];
        const details = getNextBirthdayMidnightDetails(
          targetContact.month,
          targetContact.day,
          now
        );

        const res =
          pendingMutation.type === 'update_single' && targetContact.calendarEventId
            ? await updateMidnightBirthdayCalendarEvent(
                token,
                targetContact.calendarEventId,
                targetContact,
                details.targetYear
              )
            : await createMidnightBirthdayCalendarEvent(
                token,
                targetContact,
                details.targetYear
              );

        const syncedIso = new Date().toISOString();
        setContacts((prev) =>
          prev.map((c) =>
            c.id === targetContact.id
              ? {
                  ...c,
                  calendarEventId: res.id,
                  calendarEventLink: res.htmlLink,
                  calendarSyncedAt: syncedIso,
                }
              : c
          )
        );

        // Log calendar sync in Dispatch Log
        const newLog: DispatchLogEntry = {
          id: `log-${Date.now()}`,
          contactId: targetContact.id,
          contactName: targetContact.name,
          relationship: targetContact.relationship,
          dispatchedAtIso: syncedIso,
          dispatchedTimeFormatted: clockMetrics.currentTimeFormatted,
          channel: 'Calendar Prompt',
          messageSent: `Scheduled 12:00:00 AM Google Calendar Event (${
            MONTH_NAMES[targetContact.month - 1]
          } ${targetContact.day}): "${targetContact.customWish}"`,
          triggeredBy: 'Calendar Sync',
        };
        setDispatchLogs((prev) => [newLog, ...prev]);
        setAuthBannerMessage(
          `Scheduled 12:00 AM birthday event for ${targetContact.name} on Google Calendar.`
        );
      } else if (pendingMutation.type === 'create_bulk') {
        const updatedMap: Record<
          string,
          { id: string; htmlLink: string; syncedAt: string }
        > = {};

        for (const contact of pendingMutation.contacts) {
          const details = getNextBirthdayMidnightDetails(contact.month, contact.day, now);
          const res = contact.calendarEventId
            ? await updateMidnightBirthdayCalendarEvent(
                token,
                contact.calendarEventId,
                contact,
                details.targetYear
              )
            : await createMidnightBirthdayCalendarEvent(token, contact, details.targetYear);

          updatedMap[contact.id] = {
            id: res.id,
            htmlLink: res.htmlLink,
            syncedAt: new Date().toISOString(),
          };
        }

        setContacts((prev) =>
          prev.map((c) =>
            updatedMap[c.id]
              ? {
                  ...c,
                  calendarEventId: updatedMap[c.id].id,
                  calendarEventLink: updatedMap[c.id].htmlLink,
                  calendarSyncedAt: updatedMap[c.id].syncedAt,
                }
              : c
          )
        );

        setAuthBannerMessage(
          `Synced ${pendingMutation.contacts.length} recurring 12:00 AM birthday events to Google Calendar.`
        );
      }

      await loadGoogleCalendarData(token);
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        clearCachedToken();
        setAccessToken(null);
        setNeedsAuth(true);
        setCalendarError('Session expired. Please sign in with Google again.');
      } else {
        setCalendarError(err?.message || 'Failed to update Google Calendar.');
      }
    } finally {
      setIsExecutingMutation(false);
      setPendingMutation(null);
    }
  };

  // Import a birthday event found on Google Calendar into roster
  const handleImportCalendarBirthday = (item: GoogleCalendarEventItem) => {
    if (!item.extractedMonth || !item.extractedDay) return;
    const personName = item.extractedPersonName || item.summary;

    const alreadyExists = contacts.some(
      (c) =>
        c.name.toLowerCase() === personName.toLowerCase() &&
        c.month === item.extractedMonth &&
        c.day === item.extractedDay
    );
    if (alreadyExists) {
      setAuthBannerMessage(`${personName} is already in your 12:00 AM schedule queue.`);
      return;
    }

    const defaultTpl = templates[0] || DEFAULT_TEMPLATES[0];
    const newContact: BirthdayContact = {
      id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: personName,
      month: item.extractedMonth,
      day: item.extractedDay,
      relationship: 'Friend',
      preferredChannel: 'WhatsApp',
      templateId: defaultTpl.id,
      customWish: interpolateWishTemplate(defaultTpl.body, personName, 'Friend'),
      calendarEventId: item.isNoonWishManaged ? item.id : undefined,
      calendarEventLink: item.htmlLink,
      calendarSyncedAt: item.isNoonWishManaged ? new Date().toISOString() : undefined,
    };

    setContacts((prev) => [newContact, ...prev]);
    setAuthBannerMessage(
      `Imported ${personName} (${SHORT_MONTHS[item.extractedMonth - 1]} ${
        item.extractedDay
      }) into your 12:00 AM birthday queue.`
    );
  };

  // Save new or edited contact
  const handleSaveContact = (
    contactData: Omit<BirthdayContact, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setContacts((prev) =>
        prev.map((c) => (c.id === existingId ? { ...contactData, id: existingId } : c))
      );
      setAuthBannerMessage(`Updated 12:00 AM schedule for ${contactData.name}.`);
    } else {
      const created: BirthdayContact = {
        ...contactData,
        id: `c-${Date.now()}`,
      };
      setContacts((prev) => [created, ...prev]);
      setAuthBannerMessage(`Added ${contactData.name} to the 12:00 AM Birthday Queue.`);
    }
  };

  const handleDeleteContact = (contact: BirthdayContact) => {
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    setAuthBannerMessage(`Removed ${contact.name} from local schedule.`);
  };

  // Dispatch a 12:00 AM wish and log it
  const handleDispatchWish = (
    contact: BirthdayContact,
    finalMessage: string,
    channel: DeliveryChannel,
    triggeredBy: 'Auto 12:00 AM Strike' | 'Manual 12:00 AM Dispatch'
  ) => {
    const dispatchedIso = new Date().toISOString();
    const currentYear = now.getFullYear();

    setContacts((prev) =>
      prev.map((c) =>
        c.id === contact.id
          ? {
              ...c,
              customWish: finalMessage,
              lastWishedYear: currentYear,
              lastWishedTimestamp: dispatchedIso,
            }
          : c
      )
    );

    const entry: DispatchLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      contactId: contact.id,
      contactName: contact.name,
      relationship: contact.relationship,
      dispatchedAtIso: dispatchedIso,
      dispatchedTimeFormatted: clockMetrics.currentTimeFormatted,
      channel,
      messageSent: finalMessage,
      triggeredBy,
    };

    setDispatchLogs((prev) => [entry, ...prev]);
    setAuthBannerMessage(
      `Dispatched 12:00 AM birthday wish to ${contact.name} via ${channel}.`
    );
  };

  // Trigger a simulated 12:00:00 AM strike for today's/tonight's birthdays
  const handleSimulateMidnightStrike = () => {
    const targetList =
      stats.activeStrikeQueue.length > 0
        ? stats.activeStrikeQueue
        : enrichedContacts.slice(0, 2);

    if (targetList.length === 0) return;
    setStrikeModalContacts(targetList);
    setIsSimulatedStrike(true);
    setIsStrikeModalOpen(true);
  };

  // Run a live 5-second countdown to 12:00:00 AM that automatically triggers the strike modal
  useEffect(() => {
    if (simCountdownSeconds === null) return;
    if (simCountdownSeconds <= 0) {
      setSimCountdownSeconds(null);
      const targetList =
        stats.activeStrikeQueue.length > 0
          ? stats.activeStrikeQueue
          : enrichedContacts.slice(0, 2);
      if (targetList.length > 0) {
        setStrikeModalContacts(targetList);
        setIsSimulatedStrike(false);
        setIsStrikeModalOpen(true);
      }
      return;
    }
    const timer = setTimeout(() => {
      setSimCountdownSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [simCountdownSeconds, stats.activeStrikeQueue, enrichedContacts]);

  const handleStart5SecondCountdownDemo = () => {
    setSimCountdownSeconds(5);
    setAuthBannerMessage(
      'Simulating final 5-second countdown to 12:00:00 AM Midnight Strike...'
    );
  };

  const handleCreateNewTemplate = () => {
    const newId = `tpl-custom-${Date.now()}`;
    const newTpl: WishTemplate = {
      id: newId,
      name: 'Custom 12:00 AM Birthday Note',
      category: 'Universal',
      subjectLine: 'Happy Birthday, {firstName}! 🎂',
      body: 'Happy Birthday, {firstName}! Wishing you right as the clock hits 12:00 AM midnight — hope this year brings you everything you have been working toward!',
    };
    setTemplates((prev) => [...prev, newTpl]);
    handleSelectTemplateForEdit(newTpl);
    setAuthBannerMessage('Created new 12:00 AM wish template.');
  };

  const handleDeleteTemplate = (tplId: string) => {
    if (templates.length <= 1) return;
    const remaining = templates.filter((t) => t.id !== tplId);
    setTemplates(remaining);
    if (editingTemplateId === tplId && remaining[0]) {
      handleSelectTemplateForEdit(remaining[0]);
    }
    setAuthBannerMessage('Deleted template.');
  };

  const handleImportAllCalendarBirthdays = () => {
    let added = 0;
    const defaultTpl = templates[0] || DEFAULT_TEMPLATES[0];
    const newItems: BirthdayContact[] = [];

    calendarBirthdays.forEach((item) => {
      if (!item.extractedMonth || !item.extractedDay) return;
      const personName = item.extractedPersonName || item.summary;
      const exists = contacts.some(
        (c) =>
          c.name.toLowerCase() === personName.toLowerCase() &&
          c.month === item.extractedMonth &&
          c.day === item.extractedDay
      );
      if (!exists) {
        added += 1;
        newItems.push({
          id: `imported-${Date.now()}-${added}`,
          name: personName,
          month: item.extractedMonth,
          day: item.extractedDay,
          relationship: 'Friend',
          preferredChannel: 'WhatsApp',
          templateId: defaultTpl.id,
          customWish: interpolateWishTemplate(defaultTpl.body, personName, 'Friend'),
          calendarEventId: item.isNoonWishManaged ? item.id : undefined,
          calendarEventLink: item.htmlLink,
          calendarSyncedAt: item.isNoonWishManaged ? new Date().toISOString() : undefined,
        });
      }
    });

    if (added > 0) {
      setContacts((prev) => [...newItems, ...prev]);
      setAuthBannerMessage(`Imported ${added} birthday(s) from Google Calendar into your 12:00 AM queue.`);
    } else {
      setAuthBannerMessage('All detected Google Calendar birthdays are already in your 12:00 AM queue.');
    }
  };

  // Open Strike Modal for a specific contact
  const handleOpenWishModalForContact = (contact: BirthdayContact) => {
    setStrikeModalContacts([contact]);
    setIsSimulatedStrike(true);
    setIsStrikeModalOpen(true);
  };

  // Quick copy wish from row
  const handleQuickCopyWish = async (contact: BirthdayContact) => {
    try {
      await navigator.clipboard.writeText(contact.customWish);
      setCopiedContactId(contact.id);
      setTimeout(() => setCopiedContactId(null), 2000);
    } catch {
      // Ignore
    }
  };

  // Export Dispatch Logs as CSV
  const handleExportLogsCsv = () => {
    if (dispatchLogs.length === 0) return;
    const headers = ['Timestamp', 'Recipient', 'Relationship', 'Channel', 'Trigger', 'Message'];
    const rows = dispatchLogs.map((l) => [
      l.dispatchedAtIso,
      `"${l.contactName.replace(/"/g, '""')}"`,
      l.relationship,
      l.channel,
      l.triggeredBy,
      `"${l.messageSent.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `birthday-12am-dispatch-log-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Select Template for editing
  const handleSelectTemplateForEdit = (tpl: WishTemplate) => {
    setEditingTemplateId(tpl.id);
    setTemplateDraftName(tpl.name);
    setTemplateDraftCategory(tpl.category);
    setTemplateDraftBody(tpl.body);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              name: templateDraftName.trim() || t.name,
              category: templateDraftCategory,
              body: templateDraftBody.trim() || t.body,
            }
          : t
      )
    );
    setAuthBannerMessage(`Saved template "${templateDraftName}".`);
  };

  const handleApplyTemplateToAllMatching = (tpl: WishTemplate) => {
    let count = 0;
    setContacts((prev) =>
      prev.map((c) => {
        if (tpl.category === 'Universal' || c.relationship === tpl.category) {
          count += 1;
          return {
            ...c,
            templateId: tpl.id,
            customWish: interpolateWishTemplate(
              tpl.body,
              c.name,
              c.relationship,
              c.birthYear
            ),
          };
        }
        return c;
      })
    );
    setAuthBannerMessage(
      `Applied "${tpl.name}" to ${count} ${
        count === 1 ? 'contact' : 'contacts'
      } scheduled for 12:00 AM.`
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#queue"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('queue');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          NoonWish
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a
            href="#queue"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('queue');
            }}
            className={`py-1 transition-colors whitespace-nowrap ${
              activeTab === 'queue'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:underline hover:underline-offset-8'
            }`}
          >
            Schedule Queue
          </a>
          <a
            href="#calendar"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('calendar');
            }}
            className={`py-1 transition-colors whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:underline hover:underline-offset-8'
            }`}
          >
            Calendar Sync
          </a>
          <a
            href="#templates"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('templates');
            }}
            className={`py-1 transition-colors whitespace-nowrap ${
              activeTab === 'templates'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:underline hover:underline-offset-8'
            }`}
          >
            Wish Templates
          </a>
          <a
            href="#logs"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('logs');
            }}
            className={`py-1 transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-slate-900 font-semibold'
                : 'hover:text-slate-900 hover:underline hover:underline-offset-8'
            }`}
          >
            Dispatch Log
          </a>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-3">
          {needsAuth || !accessToken ? (
            <GoogleSignInButton
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
            />
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              <span className="truncate max-w-[150px]">
                {user?.email || 'Calendar Connected'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setIsContactModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Birthday
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar (visible only on small screens) */}
      <div className="flex md:hidden items-center justify-around border-b border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-2.5 py-1 rounded ${
            activeTab === 'queue' ? 'bg-slate-900 text-white font-semibold' : ''
          }`}
        >
          Queue
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`px-2.5 py-1 rounded ${
            activeTab === 'calendar' ? 'bg-slate-900 text-white font-semibold' : ''
          }`}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-2.5 py-1 rounded ${
            activeTab === 'templates' ? 'bg-slate-900 text-white font-semibold' : ''
          }`}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-2.5 py-1 rounded ${
            activeTab === 'logs' ? 'bg-slate-900 text-white font-semibold' : ''
          }`}
        >
          Logs ({dispatchLogs.length})
        </button>
      </div>

      {/* PRECISION 12:00:00 AM MIDNIGHT INSTRUMENT HEADER */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1360px] px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-900">
                  Automated 12:00:00 AM (Midnight) Birthday Dispatcher
                </span>
                <span aria-hidden="true">·</span>
                <span>{clockMetrics.currentDateFormatted}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    isAutoStrikeArmed
                      ? 'text-emerald-700 font-medium'
                      : 'text-amber-700 font-medium'
                  }
                >
                  {isAutoStrikeArmed
                    ? '12:00 AM Auto-Trigger Armed'
                    : '12:00 AM Auto-Trigger Paused'}
                </span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
                style={{ textWrap: 'balance' }}
              >
                Wish everyone on their birthday sharp at 12:00 AM.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Synchronizes with your Google Calendar and monitors the local clock down to the
                second. At exactly 12:00:00 AM midnight as their birthday begins, NoonWish
                triggers their personalized birthday dispatch and annual calendar alert.
              </p>
            </div>

            {/* Hardware-Style Tabular Numeral 12:00 AM Clock Readout */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-900 px-5 py-4 text-white shrink-0">
              <div className="pr-4 sm:border-r sm:border-slate-800">
                <div className="text-[11px] text-slate-400">Current Local Time</div>
                <div className="mt-0.5 text-xl font-semibold font-mono-tabular tracking-tight text-white">
                  {clockMetrics.currentTimeFormatted}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Target: 12:00:00 AM Sharp
                </div>
              </div>

              <div className="pr-4 sm:border-r sm:border-slate-800">
                <div className="text-[11px] text-amber-400">
                  {simCountdownSeconds !== null
                    ? 'SIMULATING 12:00 AM IN'
                    : 'Next 12:00 AM Strike In'}
                </div>
                <div className="mt-0.5 text-xl font-semibold font-mono-tabular tracking-tight text-amber-400">
                  {simCountdownSeconds !== null
                    ? `00:00:0${simCountdownSeconds}`
                    : clockMetrics.countdownToMidnight}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {simCountdownSeconds !== null
                    ? 'Auto-firing at 00:00:00'
                    : clockMetrics.nextMidnightLabel}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleSimulateMidnightStrike}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Test 12:00 AM Strike
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleStart5SecondCountdownDemo}
                    disabled={simCountdownSeconds !== null}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-slate-700 transition-colors whitespace-nowrap"
                  >
                    <Clock className="h-3 w-3" />
                    {simCountdownSeconds !== null
                      ? `T-${simCountdownSeconds}s...`
                      : '5s Countdown'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutoStrikeArmed((prev) => !prev)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition-colors whitespace-nowrap"
                  >
                    {isAutoStrikeArmed ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback notification bar */}
          {authBannerMessage && (
            <div className="mt-4 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
              <span>{authBannerMessage}</span>
              <button
                type="button"
                onClick={() => setAuthBannerMessage(null)}
                className="font-medium text-slate-500 hover:text-slate-900 ml-4"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </section>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-6 py-6 space-y-6">
        {/* TAB 1: SCHEDULE QUEUE */}
        {activeTab === 'queue' && (
          <>
            {/* Today's / Tonight's 12:00 AM Priority Callout */}
            {stats.activeStrikeQueue.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50/70 px-5 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <Bell className="h-4 w-4 text-amber-700" />
                    <span>12:00:00 AM MIDNIGHT BIRTHDAY DISPATCH READY</span>
                  </div>
                  <p className="text-sm text-slate-800">
                    {stats.todaysCelebrants.length > 0 && (
                      <>
                        <strong>{stats.todaysCelebrants.map((c) => c.name).join(', ')}</strong>{' '}
                        {stats.todaysCelebrants.length === 1 ? 'celebrates' : 'celebrate'} their
                        birthday today.{' '}
                      </>
                    )}
                    {stats.tonightMidnightCelebrants.length > 0 && (
                      <>
                        <strong>
                          {stats.tonightMidnightCelebrants.map((c) => c.name).join(', ')}
                        </strong>{' '}
                        {stats.tonightMidnightCelebrants.length === 1 ? 'is' : 'are'} armed for
                        tonight’s 12:00:00 AM midnight strike (in {clockMetrics.countdownToMidnight}).
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setStrikeModalContacts(stats.activeStrikeQueue);
                      setIsSimulatedStrike(true);
                      setIsStrikeModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Open 12:00 AM Dispatch Console
                  </button>
                </div>
              </div>
            )}

            {/* Structured Stat Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 rounded-lg border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="p-4">
                <div className="text-xs text-slate-500">Total 12:00 AM Schedules</div>
                <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900">
                  {stats.total}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Annual recurring midnight triggers
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-slate-500">Today & Tonight 12:00 AM</div>
                <div className="mt-1 text-2xl font-bold font-mono-tabular text-amber-700">
                  {stats.todayCount}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {stats.todayCount > 0
                    ? 'Armed for 12:00:00 AM strike'
                    : 'No immediate 12:00 AM birthdays'}
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-slate-500">Upcoming in 30 Days</div>
                <div className="mt-1 text-2xl font-bold font-mono-tabular text-slate-900">
                  {stats.upcoming30Count}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Next 30 calendar days
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-slate-500">Google Calendar Synced</div>
                <div className="mt-1 text-2xl font-bold font-mono-tabular text-emerald-700">
                  {stats.syncedCount} / {stats.total}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  12:00 AM yearly calendar events
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Interactive Segmented Filter Controls */}
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {(
                  [
                    { id: 'all', label: `All (${stats.total})` },
                    { id: 'today', label: `12 AM Queue (${stats.todayCount})` },
                    { id: 'upcoming30', label: `Next 30 Days (${stats.upcoming30Count})` },
                    { id: 'synced', label: `Calendar Synced (${stats.syncedCount})` },
                    {
                      id: 'unsynced',
                      label: `Unsynced (${stats.total - stats.syncedCount})`,
                    },
                  ] as { id: QueueFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQueueFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      queueFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search & Relationship Filter + Bulk Sync */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, month, wish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 rounded-md border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <select
                  aria-label="Filter by relationship"
                  value={relationshipFilter}
                  onChange={(e) =>
                    setRelationshipFilter(e.target.value as RelationshipType | 'All')
                  }
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
                >
                  <option value="All">All Relationships</option>
                  <option value="Friend">Friends</option>
                  <option value="Family">Family</option>
                  <option value="Colleague">Colleagues</option>
                  <option value="Client">Clients</option>
                </select>

                <button
                  type="button"
                  onClick={requestBulkCalendarSync}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-700" />
                  Sync All 12 AM to Google Calendar
                </button>
              </div>
            </div>

            {/* High-Density Schedule Table (Single-Elevation Depth, Zero-Pill Metadata) */}
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              {filteredContacts.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-3">
                  <div className="text-sm font-semibold text-slate-900">
                    No birthday schedules match the current filter
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Add a person’s birthday or import events from your Google Calendar to arm
                    their automated 12:00:00 AM midnight birthday wish.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setQueueFilter('all');
                        setRelationshipFilter('All');
                        setSearchQuery('');
                      }}
                      className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Reset Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(null);
                        setIsContactModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add First Birthday
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-3 pl-5 pr-3">Celebrant & Metadata</th>
                        <th className="px-3 py-3">12:00 AM Target Date</th>
                        <th className="px-3 py-3 text-right">Countdown</th>
                        <th className="px-3 py-3">Prepared 12:00 AM Wish Message</th>
                        <th className="px-3 py-3">Google Calendar Status</th>
                        <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredContacts.map((contact) => {
                        const turningAge = contact.birthYear
                          ? contact.targetYear - contact.birthYear
                          : null;
                        const isWishedThisYear =
                          contact.lastWishedYear === now.getFullYear();

                        return (
                          <tr
                            key={contact.id}
                            className={`transition-colors hover:bg-slate-50/90 ${
                              contact.isTodayBirthday || contact.isTomorrowMidnightTonight
                                ? 'bg-amber-50/40'
                                : ''
                            }`}
                          >
                            {/* Column 1: Celebrant + Zero-Pill Unboxed Metadata */}
                            <td className="py-3.5 pl-5 pr-3 align-top">
                              <div className="font-semibold text-slate-900">
                                {contact.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                <span>{contact.relationship}</span>
                                <span aria-hidden="true">·</span>
                                <span>{contact.preferredChannel}</span>
                                {turningAge && turningAge > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono-tabular">
                                      Turns {turningAge}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Column 2: 12:00 AM Target Date */}
                            <td className="px-3 py-3.5 align-top whitespace-nowrap">
                              <div className="text-xs font-semibold font-mono-tabular text-slate-900">
                                {SHORT_MONTHS[contact.month - 1]}{' '}
                                {pad2(contact.day)}, {contact.targetYear}
                              </div>
                              <div className="mt-0.5 text-xs font-mono-tabular text-slate-500">
                                12:00:00 AM Sharp
                              </div>
                            </td>

                            {/* Column 3: Tabular Countdown */}
                            <td className="px-3 py-3.5 align-top text-right whitespace-nowrap font-mono-tabular">
                              {contact.isTodayBirthday ? (
                                <div className="text-xs font-semibold text-amber-700">
                                  TODAY (12:00 AM)
                                </div>
                              ) : contact.isTomorrowMidnightTonight ? (
                                <div className="text-xs font-semibold text-amber-700">
                                  TONIGHT @ 12:00 AM
                                </div>
                              ) : (
                                <div className="text-xs font-medium text-slate-900">
                                  In {contact.daysAway}{' '}
                                  {contact.daysAway === 1 ? 'day' : 'days'}
                                </div>
                              )}
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {isWishedThisYear
                                  ? `Dispatched ${now.getFullYear()}`
                                  : 'Armed'}
                              </div>
                            </td>

                            {/* Column 4: Prepared Wish Copy */}
                            <td className="px-3 py-3.5 align-top max-w-xs">
                              <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                                “{contact.customWish}”
                              </p>
                              <button
                                type="button"
                                onClick={() => handleQuickCopyWish(contact)}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900"
                              >
                                {copiedContactId === contact.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span className="text-emerald-700">Copied text</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy message</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Column 5: Google Calendar Status */}
                            <td className="px-3 py-3.5 align-top whitespace-nowrap">
                              {contact.calendarEventId ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                    <Check className="h-3.5 w-3.5 shrink-0" />
                                    <span>Synced @ 12:00 AM</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    {contact.calendarEventLink && (
                                      <a
                                        href={contact.calendarEventLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 underline hover:text-slate-900"
                                      >
                                        Open Event
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => requestDeleteCalendarEvent(contact)}
                                      className="text-red-600 hover:underline"
                                    >
                                      Unsync
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => requestSingleCalendarSync(contact)}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                                >
                                  <Calendar className="h-3.5 w-3.5 text-slate-600" />
                                  Sync 12 AM Event
                                </button>
                              )}
                            </td>

                            {/* Column 6: Direct Actions */}
                            <td className="py-3.5 pl-3 pr-5 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenWishModalForContact(contact)}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                                >
                                  <Send className="h-3 w-3" />
                                  Wish Now
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingContact(contact);
                                    setIsContactModalOpen(true);
                                  }}
                                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                  title="Edit 12:00 AM schedule"
                                  aria-label={`Edit ${contact.name}`}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContact(contact)}
                                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Remove from local roster"
                                  aria-label={`Remove ${contact.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: GOOGLE CALENDAR SYNC WORKSPACE */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">
                    Google Calendar 12:00 AM (Midnight) Synchronization
                  </h2>
                  <p className="text-xs text-slate-600 max-w-2xl">
                    Import existing birthday events from your primary Google Calendar or push
                    recurring annual 12:00:00 AM midnight birthday wish events with zero-minute
                    popup and email reminders.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {needsAuth || !accessToken ? (
                    <GoogleSignInButton
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      label={isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => loadGoogleCalendarData()}
                        disabled={isLoadingCalendar}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isLoadingCalendar ? 'animate-spin' : ''}`}
                        />
                        {isLoadingCalendar ? 'Scanning Calendar...' : 'Refresh Calendar Events'}
                      </button>

                      <button
                        type="button"
                        onClick={requestBulkCalendarSync}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Schedule All at 12:00 AM on Calendar
                      </button>

                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              </div>

              {calendarError && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{calendarError}</span>
                </div>
              )}

              {needsAuth || !accessToken ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Connect Google Calendar to Read & Schedule 12:00 AM Birthday Wishes
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Sign in with your Google account to scan your primary calendar for
                      birthdays and create recurring annual 12:00:00 AM midnight reminder events.
                    </p>
                  </div>
                  <div className="flex justify-center pt-1">
                    <GoogleSignInButton
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Column A: Detected Birthday Events on Google Calendar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Birthday Events Found on Your Google Calendar ({calendarBirthdays.length})
                      </h3>
                      {calendarBirthdays.length > 0 && (
                        <button
                          type="button"
                          onClick={handleImportAllCalendarBirthdays}
                          className="text-xs font-semibold text-slate-900 underline hover:text-slate-700"
                        >
                          Import All ({calendarBirthdays.length})
                        </button>
                      )}
                    </div>

                    <div className="rounded-md border border-slate-200 divide-y divide-slate-200">
                      {isLoadingCalendar ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Loading birthday events from Google Calendar...
                        </div>
                      ) : calendarBirthdays.length === 0 ? (
                        <div className="p-6 text-center space-y-2">
                          <div className="text-xs font-medium text-slate-700">
                            No birthday-titled events found on your primary calendar yet
                          </div>
                          <p className="text-xs text-slate-500">
                            Click “Schedule All at 12:00 AM on Calendar” above to push your
                            birthday roster to Google Calendar.
                          </p>
                        </div>
                      ) : (
                        calendarBirthdays.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">
                                {item.summary}
                              </div>
                              <div className="mt-0.5 text-slate-500 font-mono-tabular">
                                {item.extractedMonth && item.extractedDay
                                  ? `${SHORT_MONTHS[item.extractedMonth - 1]} ${pad2(
                                      item.extractedDay
                                    )}`
                                  : item.startDate || item.startDateTime}
                                {' · '}
                                {item.isNoonWishManaged
                                  ? '12:00 AM Scheduled Event'
                                  : 'Calendar Event'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.htmlLink && (
                                <a
                                  href={item.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
                                >
                                  Open
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleImportCalendarBirthday(item)}
                                className="rounded bg-slate-900 px-2.5 py-1 font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                              >
                                Import to Queue
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column B: Upcoming 30-Day Primary Calendar Feed */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Upcoming Google Calendar Schedule (Next 30 Days)
                      </h3>
                      <span className="text-xs text-slate-500 font-mono-tabular">
                        {upcomingCalendarEvents.length} events
                      </span>
                    </div>

                    <div className="rounded-md border border-slate-200 divide-y divide-slate-200 max-h-96 overflow-y-auto">
                      {isLoadingCalendar ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Reading upcoming schedule...
                        </div>
                      ) : upcomingCalendarEvents.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No upcoming events found in the next 30 days.
                        </div>
                      ) : (
                        upcomingCalendarEvents.map((ev) => {
                          const formattedStart = ev.startDateTime
                            ? new Date(ev.startDateTime).toLocaleString([], {
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ev.startDate;

                          return (
                            <div
                              key={ev.id}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">
                                  {ev.summary}
                                </div>
                                <div className="text-slate-500 font-mono-tabular">
                                  {formattedStart}
                                  {ev.isNoonWishManaged && ' · 12:00 AM Trigger'}
                                </div>
                              </div>
                              {ev.htmlLink && (
                                <a
                                  href={ev.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 shrink-0"
                                >
                                  View
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WISH TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  12:00 AM Birthday Message Presets
                </h2>
                <button
                  type="button"
                  onClick={handleCreateNewTemplate}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3 w-3" />
                  New Preset
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
                {templates.map((tpl) => {
                  const isSelected = tpl.id === editingTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      className={`p-4 transition-colors ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectTemplateForEdit(tpl)}
                          className="text-left font-semibold text-sm text-slate-900 hover:underline"
                        >
                          {tpl.name}
                        </button>
                        <span className="text-xs text-slate-500">{tpl.category}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        “{tpl.body}”
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectTemplateForEdit(tpl)}
                          className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                        >
                          Edit Template
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={() => handleApplyTemplateToAllMatching(tpl)}
                          className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                        >
                          Apply to All {tpl.category} Contacts
                        </button>
                        {templates.length > 1 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7">
              <form
                onSubmit={handleSaveTemplate}
                className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
              >
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    Customize 12:00 AM Wish Template
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use placeholders like {'{firstName}'}, {'{name}'}, and {'{age}'} to
                    personalize every midnight dispatch automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="tpl-name"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Template Name
                    </label>
                    <input
                      id="tpl-name"
                      type="text"
                      value={templateDraftName}
                      onChange={(e) => setTemplateDraftName(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tpl-category"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Target Relationship
                    </label>
                    <select
                      id="tpl-category"
                      value={templateDraftCategory}
                      onChange={(e) =>
                        setTemplateDraftCategory(
                          e.target.value as RelationshipType | 'Universal'
                        )
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="Friend">Friend</option>
                      <option value="Family">Family</option>
                      <option value="Colleague">Colleague</option>
                      <option value="Client">Client</option>
                      <option value="Universal">Universal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="tpl-body"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    12:00:00 AM Message Body
                  </label>
                  <textarea
                    id="tpl-body"
                    rows={4}
                    value={templateDraftBody}
                    onChange={(e) => setTemplateDraftBody(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                  <div className="text-xs font-semibold text-slate-700">
                    Live 12:00 AM Output Preview (Sample: Rohan Verma, Turning 29)
                  </div>
                  <p className="text-xs text-slate-700 italic">
                    “
                    {interpolateWishTemplate(
                      templateDraftBody,
                      'Rohan Verma',
                      'Friend',
                      now.getFullYear() - 29
                    )}
                    ”
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save Template Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: DISPATCH LOG */}
        {activeTab === 'logs' && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  12:00 AM Birthday Dispatch Audit Log
                </h2>
                <p className="text-xs text-slate-500">
                  Complete timestamped record of automated 12:00:00 AM midnight birthday strikes,
                  manual wishes, and Google Calendar event syncs.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {dispatchLogs.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportLogsCsv}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchLogs([]);
                        setAuthBannerMessage('Cleared 12:00 AM dispatch log.');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear Log
                    </button>
                  </>
                )}
              </div>
            </div>

            {dispatchLogs.length === 0 ? (
              <div className="px-6 py-12 text-center space-y-3">
                <div className="text-sm font-semibold text-slate-900">
                  No 12:00 AM dispatches recorded yet
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When the clock hits 12:00:00 AM on a contact’s birthday—or when you trigger a
                  test strike—every wish sent or synced to Google Calendar appears here.
                </p>
                <button
                  type="button"
                  onClick={handleSimulateMidnightStrike}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Test 12:00 AM Strike Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                      <th className="py-3 pl-6 pr-3">Dispatch Timestamp</th>
                      <th className="px-3 py-3">Recipient</th>
                      <th className="px-3 py-3">Channel & Trigger</th>
                      <th className="py-3 pl-3 pr-6">Dispatched Message Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {dispatchLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 pl-6 pr-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {entry.dispatchedTimeFormatted}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(entry.dispatchedAtIso).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {entry.contactName}
                          </div>
                          <div className="text-slate-500">{entry.relationship}</div>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-slate-600">
                          <span className="font-medium text-slate-900">{entry.channel}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{entry.triggeredBy}</span>
                        </td>
                        <td className="py-3.5 pl-3 pr-6 text-slate-700 max-w-md">
                          “{entry.messageSent}”
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QUIET FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1360px] flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            NoonWish — 12:00:00 AM (Midnight) Precision Birthday Scheduler & Google Calendar Dispatcher
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className="hover:text-slate-900"
            >
              Schedule Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="hover:text-slate-900"
            >
              Google Calendar Sync
            </button>
            <button
              type="button"
              onClick={handleSimulateMidnightStrike}
              className="hover:text-slate-900"
            >
              Test 12:00 AM Strike
            </button>
          </div>
        </div>
      </footer>

      {/* ADD / EDIT CONTACT MODAL */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        editingContact={editingContact}
        templates={templates}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
      />

      {/* 12:00:00 AM LIVE BIRTHDAY STRIKE DISPATCH MODAL */}
      <NoonStrikeModal
        isOpen={isStrikeModalOpen}
        contacts={strikeModalContacts}
        currentTimeFormatted={clockMetrics.currentTimeFormatted}
        isSimulated={isSimulatedStrike}
        onClose={() => setIsStrikeModalOpen(false)}
        onDispatchWish={handleDispatchWish}
        onRequestCalendarSync={(contact) => {
          setIsStrikeModalOpen(false);
          requestSingleCalendarSync(contact);
        }}
      />

      {/* MANDATORY GOOGLE CALENDAR CONFIRMATION MODAL */}
      <CalendarConfirmModal
        mutation={pendingMutation}
        isSubmitting={isExecutingMutation}
        onConfirm={handleConfirmCalendarMutation}
        onCancel={() => {
          if (!isExecutingMutation) setPendingMutation(null);
        }}
      />
    </div>
  );
}
