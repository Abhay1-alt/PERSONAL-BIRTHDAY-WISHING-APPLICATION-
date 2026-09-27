import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Copy,
  Mail,
  MessageSquare,
  Calendar,
  X,
  Volume2,
  Send,
  ExternalLink,
} from 'lucide-react';
import { BirthdayContact, DeliveryChannel } from '../types/birthday';

interface NoonStrikeModalProps {
  isOpen: boolean;
  contacts: BirthdayContact[];
  currentTimeFormatted: string;
  isSimulated: boolean;
  onClose: () => void;
  onDispatchWish: (
    contact: BirthdayContact,
    finalMessage: string,
    channel: DeliveryChannel,
    triggeredBy: 'Auto 12:00 AM Strike' | 'Manual 12:00 AM Dispatch'
  ) => void;
  onRequestCalendarSync: (contact: BirthdayContact) => void;
}

/**
 * Plays a gentle, pleasant 4-note 12:00 AM midnight chime using the Web Audio API
 */
export function playMidnightChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + idx * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.14 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.95);
    });
  } catch {
    // Ignore if browser autoplay policy blocks audio before interaction
  }
}

export const NoonStrikeModal: React.FC<NoonStrikeModalProps> = ({
  isOpen,
  contacts,
  currentTimeFormatted,
  isSimulated,
  onClose,
  onDispatchWish,
  onRequestCalendarSync,
}) => {
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [dispatchedIds, setDispatchedIds] = useState<Record<string, boolean>>({});
  const [statusNoticeById, setStatusNoticeById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && contacts.length > 0) {
      const initial: Record<string, string> = {};
      contacts.forEach((c) => {
        initial[c.id] = c.customWish;
      });
      setEditedMessages(initial);
      setDispatchedIds({});
      setStatusNoticeById({});
      playMidnightChime();
    }
  }, [isOpen, contacts]);

  if (!isOpen || contacts.length === 0) return null;

  const currentYear = new Date().getFullYear();

  const setTempStatus = (contactId: string, notice: string) => {
    setStatusNoticeById((prev) => ({ ...prev, [contactId]: notice }));
    setTimeout(() => {
      setStatusNoticeById((prev) => {
        const next = { ...prev };
        delete next[contactId];
        return next;
      });
    }, 4000);
  };

  const handleCopyAndLog = async (contact: BirthdayContact) => {
    const msg = editedMessages[contact.id] || contact.customWish;
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      // Fallback
    }
    onDispatchWish(
      contact,
      msg,
      'SMS / Copy',
      isSimulated ? 'Manual 12:00 AM Dispatch' : 'Auto 12:00 AM Strike'
    );
    setDispatchedIds((prev) => ({ ...prev, [contact.id]: true }));
    setTempStatus(contact.id, 'Copied wish to clipboard & logged 12:00 AM dispatch!');
  };

  const buildWhatsAppHref = (contact: BirthdayContact) => {
    const msg = editedMessages[contact.id] || contact.customWish;
    const cleanPhone = (contact.phone || '').replace(/[^\d]/g, '');
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const buildGmailComposeHref = (contact: BirthdayContact) => {
    const msg = editedMessages[contact.id] || contact.customWish;
    const subject = `Happy Birthday, ${contact.name.split(' ')[0]}! 🎂`;
    const to = contact.email || '';
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      to
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
  };

  const buildMailtoHref = (contact: BirthdayContact) => {
    const msg = editedMessages[contact.id] || contact.customWish;
    const subject = `Happy Birthday, ${contact.name.split(' ')[0]}! 🎂`;
    const to = contact.email || '';
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(msg)}`;
  };

  const handleChannelClickLog = async (
    contact: BirthdayContact,
    channel: DeliveryChannel,
    notice: string
  ) => {
    const msg = editedMessages[contact.id] || contact.customWish;
    try {
      await navigator.clipboard.writeText(msg);
    } catch {
      // Ignore clipboard error
    }
    onDispatchWish(
      contact,
      msg,
      channel,
      isSimulated ? 'Manual 12:00 AM Dispatch' : 'Auto 12:00 AM Strike'
    );
    setDispatchedIds((prev) => ({ ...prev, [contact.id]: true }));
    setTempStatus(contact.id, notice);
  };

  const handleInstantDispatchAll = async () => {
    const combinedMessages: string[] = [];
    contacts.forEach((contact) => {
      const msg = editedMessages[contact.id] || contact.customWish;
      combinedMessages.push(`${contact.name}: ${msg}`);
      if (!dispatchedIds[contact.id]) {
        onDispatchWish(
          contact,
          msg,
          contact.preferredChannel,
          isSimulated ? 'Manual 12:00 AM Dispatch' : 'Auto 12:00 AM Strike'
        );
      }
    });
    try {
      await navigator.clipboard.writeText(combinedMessages.join('\n\n'));
    } catch {
      // Ignore
    }
    const allMarked: Record<string, boolean> = {};
    contacts.forEach((c) => {
      allMarked[c.id] = true;
      setTempStatus(c.id, 'Dispatched & logged at 12:00 AM!');
    });
    setDispatchedIds(allMarked);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="midnight-strike-heading"
    >
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white overflow-hidden">
        {/* Top Strike Banner */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500 text-slate-950">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-amber-400">
                <span>12:00:00 AM SHARP MIDNIGHT DISPATCH WINDOW</span>
                <span aria-hidden="true">·</span>
                <span>{currentTimeFormatted}</span>
              </div>
              <h2 id="midnight-strike-heading" className="text-base font-semibold text-white">
                {contacts.length === 1
                  ? `It’s 12:00 AM — Time to Wish ${contacts[0].name} Happy Birthday!`
                  : `12:00 AM Birthday Strike — ${contacts.length} Celebrants Ready`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playMidnightChime}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
              title="Replay 12:00 AM Chime"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Chime
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close 12:00 AM dispatch window"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Celebrants List */}
        <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-200 px-6 py-4">
          {contacts.map((contact) => {
            const isDone =
              dispatchedIds[contact.id] || contact.lastWishedYear === currentYear;
            const turningAge = contact.birthYear ? currentYear - contact.birthYear : null;
            const statusNotice = statusNoticeById[contact.id];

            return (
              <div key={contact.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{contact.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span>{contact.relationship}</span>
                      {turningAge && turningAge > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">Turning {turningAge}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>Preferred: {contact.preferredChannel}</span>
                      {contact.phone && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{contact.phone}</span>
                        </>
                      )}
                      {contact.email && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{contact.email}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-medium">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Check className="h-3.5 w-3.5" />
                        Wished at 12:00 AM
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        Ready for 12:00 AM Dispatch
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`wish-msg-${contact.id}`}
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Personalized 12:00 AM Birthday Message
                  </label>
                  <textarea
                    id={`wish-msg-${contact.id}`}
                    rows={3}
                    value={editedMessages[contact.id] ?? contact.customWish}
                    onChange={(e) =>
                      setEditedMessages((prev) => ({
                        ...prev,
                        [contact.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {statusNotice && (
                  <div className="flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{statusNotice}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyAndLog(contact)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Wish & Mark Wished
                    </button>

                    <a
                      href={buildWhatsAppHref(contact)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        handleChannelClickLog(
                          contact,
                          'WhatsApp',
                          'Opened WhatsApp in new tab (wish also copied to clipboard) & logged!'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      WhatsApp
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>

                    <a
                      href={buildGmailComposeHref(contact)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        handleChannelClickLog(
                          contact,
                          'Email',
                          'Opened Gmail compose in new tab & logged 12:00 AM dispatch!'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                      Gmail Compose
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>

                    <a
                      href={buildMailtoHref(contact)}
                      onClick={() =>
                        handleChannelClickLog(
                          contact,
                          'Email',
                          'Triggered default mail client & logged 12:00 AM dispatch!'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      Mail App
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRequestCalendarSync(contact)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    <Calendar className="h-3.5 w-3.5 text-slate-600" />
                    {contact.calendarEventId
                      ? 'Update 12 AM Calendar Event'
                      : 'Add 12 AM Event to Calendar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-500">
            All dispatches are recorded in your 12:00 AM Dispatch Log.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleInstantDispatchAll}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              {contacts.length > 1
                ? 'Mark All Wished & Copy All'
                : 'Quick Mark Wished at 12:00 AM'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
