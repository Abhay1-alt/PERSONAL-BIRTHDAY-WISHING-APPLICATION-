import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import {
  BirthdayContact,
  DeliveryChannel,
  RelationshipType,
  WishTemplate,
} from '../types/birthday';

interface ContactFormModalProps {
  isOpen: boolean;
  editingContact: BirthdayContact | null;
  templates: WishTemplate[];
  onClose: () => void;
  onSave: (contactData: Omit<BirthdayContact, 'id'>, existingId?: string) => void;
}

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function interpolateWishTemplate(
  rawBody: string,
  name: string,
  relationship: RelationshipType,
  birthYear?: number
): string {
  const cleanName = name.trim() || 'Friend';
  const firstName = cleanName.split(' ')[0] || cleanName;
  const currentYear = new Date().getFullYear();
  const age = birthYear && birthYear > 1900 ? String(currentYear - birthYear) : '';

  return rawBody
    .replace(/\{name\}/gi, cleanName)
    .replace(/\{firstName\}/gi, firstName)
    .replace(/\{relationship\}/gi, relationship.toLowerCase())
    .replace(/\{age\}/gi, age || 'another wonderful year');
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  editingContact,
  templates,
  onClose,
  onSave,
}) => {
  const today = new Date();
  const [name, setName] = useState('');
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [day, setDay] = useState<number>(today.getDate());
  const [birthYear, setBirthYear] = useState<string>('');
  const [relationship, setRelationship] = useState<RelationshipType>('Friend');
  const [preferredChannel, setPreferredChannel] = useState<DeliveryChannel>('WhatsApp');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || 'tpl-warm');
  const [customWish, setCustomWish] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name);
      setMonth(editingContact.month);
      setDay(editingContact.day);
      setBirthYear(editingContact.birthYear ? String(editingContact.birthYear) : '');
      setRelationship(editingContact.relationship);
      setPreferredChannel(editingContact.preferredChannel);
      setEmail(editingContact.email || '');
      setPhone(editingContact.phone || '');
      setTemplateId(editingContact.templateId || templates[0]?.id || 'tpl-warm');
      setCustomWish(editingContact.customWish);
      setNotes(editingContact.notes || '');
    } else {
      const now = new Date();
      const defaultTpl = templates[0];
      setName('');
      setMonth(now.getMonth() + 1);
      setDay(now.getDate());
      setBirthYear('1996');
      setRelationship('Friend');
      setPreferredChannel('WhatsApp');
      setEmail('');
      setPhone('');
      setTemplateId(defaultTpl?.id || 'tpl-warm');
      setCustomWish(
        defaultTpl
          ? interpolateWishTemplate(defaultTpl.body, 'Friend', 'Friend', 1996)
          : 'Wishing you the happiest of birthdays right as the clock strikes 12:00 AM midnight! May the year ahead bring you health, joy, and milestone wins.'
      );
      setNotes('');
    }
  }, [editingContact, isOpen, templates]);

  if (!isOpen) return null;

  const handleApplyTemplate = (selectedTemplateId: string) => {
    setTemplateId(selectedTemplateId);
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      const parsedYear = birthYear ? parseInt(birthYear, 10) : undefined;
      setCustomWish(interpolateWishTemplate(tpl.body, name || 'Friend', relationship, parsedYear));
    }
  };

  const handleSetTodayBirthday = () => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setDay(now.getDate());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedYear = birthYear ? parseInt(birthYear, 10) : undefined;
    const validYear =
      parsedYear && !isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= today.getFullYear()
        ? parsedYear
        : undefined;

    onSave(
      {
        name: name.trim(),
        month,
        day,
        birthYear: validYear,
        relationship,
        preferredChannel,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        templateId,
        customWish:
          customWish.trim() ||
          `Happy Birthday, ${name.trim()}! Sending you warm wishes right at 12:00 AM sharp!`,
        notes: notes.trim() || undefined,
        calendarEventId: editingContact?.calendarEventId,
        calendarEventLink: editingContact?.calendarEventLink,
        calendarSyncedAt: editingContact?.calendarSyncedAt,
        lastWishedYear: editingContact?.lastWishedYear,
        lastWishedTimestamp: editingContact?.lastWishedTimestamp,
      },
      editingContact?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="contact-modal-title" className="text-base font-semibold text-slate-900">
              {editingContact
                ? `Edit 12:00 AM Schedule — ${editingContact.name}`
                : 'Schedule New 12:00 AM Birthday Wish'}
            </h2>
            <p className="text-xs text-slate-500">
              Configured to trigger sharp at 12:00:00 AM (Midnight) on their birthday
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                id="contact-name"
                type="text"
                required
                placeholder="e.g. Aarav Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="contact-rel" className="block text-xs font-medium text-slate-700 mb-1">
                Relationship
              </label>
              <select
                id="contact-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as RelationshipType)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="Friend">Friend</option>
                <option value="Family">Family</option>
                <option value="Colleague">Colleague</option>
                <option value="Client">Client</option>
              </select>
            </div>
          </div>

          {/* Date Row */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                Birth Date & 12:00:00 AM (Midnight) Dispatch Target
              </span>
              <button
                type="button"
                onClick={handleSetTodayBirthday}
                className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
              >
                Set to Today’s Date
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="contact-month" className="block text-xs text-slate-600 mb-1">
                  Month
                </label>
                <select
                  id="contact-month"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contact-day" className="block text-xs text-slate-600 mb-1">
                  Day
                </label>
                <input
                  id="contact-day"
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={day}
                  onChange={(e) => setDay(Math.max(1, Math.min(31, Number(e.target.value))))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono-tabular text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="contact-year" className="block text-xs text-slate-600 mb-1">
                  Birth Year (Optional)
                </label>
                <input
                  id="contact-year"
                  type="number"
                  min={1920}
                  max={today.getFullYear()}
                  placeholder="1996"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono-tabular text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Delivery Channel & Contact Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="contact-channel" className="block text-xs font-medium text-slate-700 mb-1">
                12:00 AM Channel
              </label>
              <select
                id="contact-channel"
                value={preferredChannel}
                onChange={(e) => setPreferredChannel(e.target.value as DeliveryChannel)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="SMS / Copy">SMS / Copy</option>
                <option value="Calendar Prompt">Calendar Prompt</option>
              </select>
            </div>

            <div>
              <label htmlFor="contact-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Phone / WhatsApp
              </label>
              <input
                id="contact-phone"
                type="tel"
                placeholder="+1 555 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono-tabular text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="contact-email"
                type="email"
                placeholder="person@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Template & Custom Wish */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="contact-template" className="block text-xs font-medium text-slate-700">
                Message Preset
              </label>
              <button
                type="button"
                onClick={() => handleApplyTemplate(templateId)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                <Sparkles className="h-3 w-3" />
                Regenerate from Preset
              </button>
            </div>
            <select
              id="contact-template"
              value={templateId}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.category})
                </option>
              ))}
            </select>

            <div>
              <label htmlFor="contact-wish" className="block text-xs font-medium text-slate-700 mb-1">
                12:00:00 AM Birthday Wish Copy *
              </label>
              <textarea
                id="contact-wish"
                rows={3}
                required
                value={customWish}
                onChange={(e) => setCustomWish(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="contact-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Notes / Gift Reminder (Optional)
              </label>
              <input
                id="contact-notes"
                type="text"
                placeholder="e.g. Loves specialty coffee, send cake voucher"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Check className="h-3.5 w-3.5" />
              {editingContact ? 'Save 12:00 AM Schedule' : 'Add to 12:00 AM Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
