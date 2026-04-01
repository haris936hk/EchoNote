import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuClock as Clock, LuCalendar as CalendarIcon } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoginButton from '../auth/LoginButton';
import { Tooltip, Spinner } from '@heroui/react';
import { format, isToday, isTomorrow, isThisWeek, parseISO, isSameDay } from 'date-fns';
import { useMeeting } from '../../contexts/MeetingContext';

const CalendarSidebar = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // eslint-disable-line no-unused-vars
  const { meetings } = useMeeting();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // e.g. 403

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/calendar/events');
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (err) {
      if (err.name === 'CanceledError') {
        // Silently ignore aborted requests from deduplication
        return;
      }
      if (err.response?.status === 403 || err.response?.status === 401) {
        setErrorStatus(err.response?.status);
      } else {
        console.error('Failed to fetch calendar events', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRecord = (event) => {
    navigate('/record', {
      state: {
        title: event.title,
        attendees: event.attendees,
        googleEventId: event.id,
      },
    });
  };

  // Grouping logic
  const groupedEvents = {
    today: [],
    tomorrow: [],
    thisWeek: [],
  };

  events.forEach((event) => {
    const start = parseISO(event.start);
    if (isToday(start)) {
      groupedEvents.today.push(event);
    } else if (isTomorrow(start)) {
      groupedEvents.tomorrow.push(event);
    } else if (isThisWeek(start)) {
      groupedEvents.thisWeek.push(event);
    }
  });

  const renderEventCard = (event) => {
    const startObj = parseISO(event.start);
    const endObj = parseISO(event.end);
    const startTime = format(startObj, 'h:mm a');
    const endTime = format(endObj, 'h:mm a');

    return (
      <div
        key={event.id}
        className="group relative rounded-xl border border-echo-border/50 bg-echo-surface/30 p-4 transition-all hover:border-accent-primary/30 hover:bg-echo-surface-hover"
      >
        <h4
          className="font-plus-jakarta mb-2 truncate font-semibold text-white"
          title={event.title}
        >
          {event.title}
        </h4>
        <div className="mb-4 flex flex-wrap items-center gap-4 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-1.5 rounded-md bg-accent-primary/5 px-2 py-1 text-accent-primary/90">
            <CalendarIcon size={12} />
            <span>{format(startObj, 'MMM d')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-slate-500" />
            <span>
              {startTime} – {endTime}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          {event.attendees && event.attendees.length > 0 ? (
            <div className="flex items-center -space-x-2">
              {event.attendees.slice(0, 3).map((attendee, idx) => {
                const nameStr = attendee.name || attendee.email || '?';
                const initial = nameStr.substring(0, 1).toUpperCase();
                return (
                  <Tooltip key={idx} content={attendee.name || attendee.email}>
                    <div className="flex size-7 items-center justify-center rounded-full bg-echo-surface text-[10px] font-semibold text-accent-secondary shadow-sm ring-2 ring-echo-base">
                      {initial}
                    </div>
                  </Tooltip>
                );
              })}
              {event.attendees.length > 3 && (
                <div className="flex size-7 items-center justify-center rounded-full bg-echo-surface text-[10px] font-medium text-slate-400 shadow-sm ring-2 ring-echo-base">
                  +{event.attendees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs italic text-slate-500">No attendees</div>
          )}

          <button
            onClick={() => handleRecord(event)}
            className="rounded-full bg-accent-primary/10 px-3 py-1.5 text-xs font-semibold text-accent-primary opacity-0 transition-opacity hover:bg-accent-primary hover:text-white group-hover:opacity-100"
          >
            Record Meeting
          </button>
        </div>
      </div>
    );
  };

  // ── Missing Token State ──
  if (errorStatus === 403 || errorStatus === 401) {
    return (
      <div className="rounded-card border border-echo-border bg-echo-surface p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <CalendarIcon size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Google Calendar</h3>
            <p className="text-xs text-slate-400">Sync meetings</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-echo-border/80 p-6 text-center">
          <CalendarIcon size={24} className="mx-auto mb-3 text-slate-500" />
          <h4 className="mb-2 text-sm font-semibold text-white">Connect Calendar</h4>
          <p className="mb-5 text-xs leading-relaxed text-slate-400">
            Connect your Google Calendar to magically pre-fill meeting details and attendees.
          </p>
          <div className="origin-top scale-90">
            <LoginButton fullWidth={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent-primary/10">
          <CalendarIcon size={18} className="text-accent-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Upcoming Meetings</h3>
          <p className="text-xs text-slate-400">Next 7 days</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="md" color="primary" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-echo-border/50 py-8 text-center text-sm text-slate-500">
          No upcoming events found
        </div>
      ) : (
        <div className="custom-scrollbar max-h-[500px] space-y-6 overflow-y-auto pr-2">
          {groupedEvents.today.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                Today
              </h4>
              <div className="space-y-3">{groupedEvents.today.map(renderEventCard)}</div>
            </div>
          )}

          {groupedEvents.tomorrow.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tomorrow
              </h4>
              <div className="space-y-3">{groupedEvents.tomorrow.map(renderEventCard)}</div>
            </div>
          )}

          {groupedEvents.thisWeek.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Later This Week
              </h4>
              <div className="space-y-3">{groupedEvents.thisWeek.map(renderEventCard)}</div>
            </div>
          )}
        </div>
      )}

      {/* Mini Meeting History Grid */}
      <div className="border-t border-echo-border pt-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Meeting History
        </h4>
        <div className="grid grid-cols-7 gap-1">
          {/* Generate 28 days of mini dots */}
          {Array.from({ length: 28 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (27 - i));
            const hasMeeting = meetings.some(
              (m) => m.createdAt && isSameDay(new Date(m.createdAt), d)
            );

            return (
              <Tooltip key={i} content={format(d, 'MMM d')}>
                <div
                  className={`aspect-square w-full rounded-sm ${hasMeeting ? 'bg-accent-primary/80 ring-1 ring-accent-primary' : 'bg-echo-surface-hover'}`}
                />
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;
