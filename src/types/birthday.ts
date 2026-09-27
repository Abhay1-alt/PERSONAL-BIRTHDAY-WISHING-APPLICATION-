export type RelationshipType = 'Family' | 'Friend' | 'Colleague' | 'Client';

export type DeliveryChannel = 'WhatsApp' | 'Email' | 'SMS / Copy' | 'Calendar Prompt';

export interface BirthdayContact {
  id: string;
  name: string;
  month: number; // 1 - 12
  day: number;   // 1 - 31
  birthYear?: number;
  relationship: RelationshipType;
  email?: string;
  phone?: string;
  preferredChannel: DeliveryChannel;
  customWish: string;
  templateId: string;
  calendarEventId?: string;
  calendarEventLink?: string;
  calendarSyncedAt?: string;
  lastWishedYear?: number;
  lastWishedTimestamp?: string;
  notes?: string;
}

export interface WishTemplate {
  id: string;
  name: string;
  category: RelationshipType | 'Universal';
  subjectLine: string;
  body: string;
}

export interface DispatchLogEntry {
  id: string;
  contactId: string;
  contactName: string;
  relationship: RelationshipType;
  dispatchedAtIso: string;
  dispatchedTimeFormatted: string;
  channel: DeliveryChannel;
  messageSent: string;
  triggeredBy: 'Auto 12:00 AM Strike' | 'Manual 12:00 AM Dispatch' | 'Calendar Sync';
}

export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  startDate?: string;     // YYYY-MM-DD or ISO
  startDateTime?: string; // ISO
  htmlLink?: string;
  recurrence?: string[];
  isNoonWishManaged?: boolean;
  extractedMonth?: number;
  extractedDay?: number;
  extractedPersonName?: string;
}

export type CalendarMutationType = 'create_single' | 'create_bulk' | 'update_single' | 'delete_single';

export interface PendingCalendarMutation {
  type: CalendarMutationType;
  title: string;
  summaryDescription: string;
  contacts: BirthdayContact[];
  targetYear: number;
  eventIdToDelete?: string;
}
