import React from 'react';
import { Calendar, AlertTriangle, Check, X } from 'lucide-react';
import { PendingCalendarMutation } from '../types/birthday';

interface CalendarConfirmModalProps {
  mutation: PendingCalendarMutation | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CalendarConfirmModal: React.FC<CalendarConfirmModalProps> = ({
  mutation,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  if (!mutation) return null;

  const isDelete = mutation.type === 'delete_single';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-confirm-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
                isDelete
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {isDelete ? <AlertTriangle className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="calendar-confirm-title" className="text-base font-semibold text-slate-900">
                {mutation.title}
              </h2>
              <p className="text-xs text-slate-500">
                Explicit confirmation required before modifying your Google Calendar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{mutation.summaryDescription}</p>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-2 max-h-56 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-700">
              Affected Calendar Entry Details ({mutation.contacts.length}{' '}
              {mutation.contacts.length === 1 ? 'event' : 'events'})
            </div>
            {mutation.contacts.map((contact) => (
              <div
                key={contact.id}
                className="border-t border-slate-200 pt-2 first:border-t-0 first:pt-0 text-xs"
              >
                <div className="font-medium text-slate-900">
                  🎂 Wish {contact.name} Happy Birthday (12:00 AM Sharp)
                </div>
                <div className="mt-0.5 text-slate-500 font-mono-tabular">
                  {MONTH_NAMES[contact.month - 1]} {contact.day}, {mutation.targetYear} · 12:00:00 AM – 12:15:00 AM · Yearly Recurrence
                </div>
                {!isDelete && (
                  <div className="mt-1 text-slate-600 line-clamp-2 italic">
                    “{contact.customWish}”
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-md transition-colors whitespace-nowrap ${
              isDelete
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            {isSubmitting
              ? 'Updating Google Calendar...'
              : isDelete
              ? 'Confirm Delete from Calendar'
              : 'Confirm & Update Google Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
};
