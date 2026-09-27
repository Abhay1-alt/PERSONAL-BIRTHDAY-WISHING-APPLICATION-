import { BirthdayContact, GoogleCalendarEventItem } from '../types/birthday';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Formats a local Date's timezone offset as +HH:MM or -HH:MM for RFC3339
 */
function getLocalTimezoneOffsetString(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMins = Math.abs(offsetMinutes);
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;
  return `${sign}${pad2(hours)}:${pad2(mins)}`;
}

/**
 * Builds the exact 12:00:00 AM (00:00:00) to 12:15:00 AM (00:15:00) local RFC3339 timestamps for a contact's birthday
 */
export function buildMidnightWindowStrings(year: number, month: number, day: number) {
  const sampleDate = new Date(year, month - 1, day, 0, 0, 0);
  const tzOffset = getLocalTimezoneOffsetString(sampleDate);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const datePart = `${year}-${pad2(month)}-${pad2(day)}`;

  return {
    startDateTime: `${datePart}T00:00:00${tzOffset}`,
    endDateTime: `${datePart}T00:15:00${tzOffset}`,
    timeZone,
    datePart,
  };
}

/**
 * Extracts a person's name from a calendar event summary like "🎂 Wish Maya Lin Happy Birthday (12:00 AM)" or "Alex Rivera's Birthday"
 */
function extractNameFromSummary(summary: string): string {
  const cleaned = summary
    .replace(/^🎂\s*/i, '')
    .replace(/^Wish\s+/i, '')
    .replace(/\s+Happy\s+Birthday.*$/i, '')
    .replace(/'s\s+Birthday.*$/i, '')
    .replace(/’s\s+Birthday.*$/i, '')
    .replace(/\s+Birthday.*$/i, '')
    .replace(/\s*\(12:00\s*[AP]M.*$/i, '')
    .trim();
  return cleaned || summary.trim();
}

/**
 * Fetch birthday-related events and 12:00 AM scheduled events from the user's primary Google Calendar
 */
export async function fetchGoogleCalendarBirthdays(
  accessToken: string
): Promise<GoogleCalendarEventItem[]> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const endOfNextYear = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59).toISOString();

  const url = new URL(CALENDAR_API_BASE);
  url.searchParams.set('timeMin', startOfYear);
  url.searchParams.set('timeMax', endOfNextYear);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to read Google Calendar events.');
  }

  const data = await response.json();
  const rawItems: any[] = Array.isArray(data.items) ? data.items : [];

  const results: GoogleCalendarEventItem[] = [];

  for (const item of rawItems) {
    const summary: string = item.summary || 'Untitled Event';
    const description: string = item.description || '';
    const isBirthdayKeyword =
      /birthday|b-day|bday|🎂|noonwish|12:00 am/i.test(summary) ||
      /noonwish|birthday wish|12:00 am/i.test(description);

    const startDateTime: string | undefined = item.start?.dateTime;
    const startDate: string | undefined = item.start?.date;

    let month: number | undefined;
    let day: number | undefined;

    if (startDateTime) {
      const parsed = new Date(startDateTime);
      if (!isNaN(parsed.getTime())) {
        month = parsed.getMonth() + 1;
        day = parsed.getDate();
      }
    } else if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3 && parts[1] && parts[2]) {
        month = parts[1];
        day = parts[2];
      }
    }

    if (isBirthdayKeyword && month && day) {
      results.push({
        id: item.id,
        summary,
        description,
        startDate,
        startDateTime,
        htmlLink: item.htmlLink,
        recurrence: item.recurrence,
        isNoonWishManaged:
          description.includes('12:00 AM Dispatcher]') ||
          description.includes('[NoonWish') ||
          summary.includes('12:00 AM') ||
          summary.includes('12:00 PM'),
        extractedMonth: month,
        extractedDay: day,
        extractedPersonName: extractNameFromSummary(summary),
      });
    }
  }

  return results;
}

/**
 * Fetch general upcoming events from the user's primary calendar (next 30 days)
 */
export async function fetchUpcomingCalendarEvents(
  accessToken: string
): Promise<GoogleCalendarEventItem[]> {
  const now = new Date();
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const url = new URL(CALENDAR_API_BASE);
  url.searchParams.set('timeMin', now.toISOString());
  url.searchParams.set('timeMax', next30.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '40');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to list upcoming calendar events.');
  }

  const data = await response.json();
  const rawItems: any[] = Array.isArray(data.items) ? data.items : [];

  return rawItems.map((item) => ({
    id: item.id,
    summary: item.summary || 'Untitled Event',
    description: item.description || '',
    startDate: item.start?.date,
    startDateTime: item.start?.dateTime,
    htmlLink: item.htmlLink,
    isNoonWishManaged:
      (item.description || '').includes('12:00 AM Dispatcher]') ||
      (item.description || '').includes('[NoonWish') ||
      (item.summary || '').includes('12:00 AM'),
  }));
}

/**
 * Creates a recurring annual 12:00:00 AM (Midnight) Birthday Wish event on the user's primary Google Calendar
 */
export async function createMidnightBirthdayCalendarEvent(
  accessToken: string,
  contact: BirthdayContact,
  targetYear: number
): Promise<{ id: string; htmlLink: string }> {
  const { startDateTime, endDateTime, timeZone } = buildMidnightWindowStrings(
    targetYear,
    contact.month,
    contact.day
  );

  const body = {
    summary: `🎂 Wish ${contact.name} Happy Birthday (12:00 AM Sharp)`,
    description: `${contact.customWish}\n\n---\nRelationship: ${contact.relationship}\nPreferred Channel: ${contact.preferredChannel}${
      contact.phone ? `\nPhone: ${contact.phone}` : ''
    }${contact.email ? `\nEmail: ${contact.email}` : ''}\n[NoonWish 12:00 AM Dispatcher]`,
    start: {
      dateTime: startDateTime,
      timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone,
    },
    recurrence: ['RRULE:FREQ=YEARLY'],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 0 },
        { method: 'email', minutes: 0 },
      ],
    },
  };

  const response = await fetch(CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to create Google Calendar event.');
  }

  const created = await response.json();
  return {
    id: created.id,
    htmlLink: created.htmlLink || 'https://calendar.google.com',
  };
}

/**
 * Updates an existing 12:00:00 AM (Midnight) Birthday Wish event on Google Calendar
 */
export async function updateMidnightBirthdayCalendarEvent(
  accessToken: string,
  eventId: string,
  contact: BirthdayContact,
  targetYear: number
): Promise<{ id: string; htmlLink: string }> {
  const { startDateTime, endDateTime, timeZone } = buildMidnightWindowStrings(
    targetYear,
    contact.month,
    contact.day
  );

  const body = {
    summary: `🎂 Wish ${contact.name} Happy Birthday (12:00 AM Sharp)`,
    description: `${contact.customWish}\n\n---\nRelationship: ${contact.relationship}\nPreferred Channel: ${contact.preferredChannel}${
      contact.phone ? `\nPhone: ${contact.phone}` : ''
    }${contact.email ? `\nEmail: ${contact.email}` : ''}\n[NoonWish 12:00 AM Dispatcher]`,
    start: {
      dateTime: startDateTime,
      timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone,
    },
    recurrence: ['RRULE:FREQ=YEARLY'],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 0 },
        { method: 'email', minutes: 0 },
      ],
    },
  };

  const response = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to update Google Calendar event.');
  }

  const updated = await response.json();
  return {
    id: updated.id,
    htmlLink: updated.htmlLink || 'https://calendar.google.com',
  };
}

/**
 * Deletes an event from the user's primary Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to delete Google Calendar event.');
  }
}
