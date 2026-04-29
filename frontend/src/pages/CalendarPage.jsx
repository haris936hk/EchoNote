import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuClock as Clock,
  LuCalendar as CalendarIcon,
  LuMapPin as MapPin,
  LuExternalLink as ExternalLink,
  LuVideo as Video,
  LuSearch as Search,
  LuChevronRight as ChevronRight,
} from 'react-icons/lu';
import { Button, Input, Tooltip, Spinner, Card, CardBody } from '@heroui/react';
import { format, isToday, isTomorrow, parseISO, addDays, startOfDay, isSameDay } from 'date-fns';
import { calendarAPI } from '../services/api';
import LoginButton from '../components/auth/LoginButton';

const CalendarPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const result = await calendarAPI.getEvents(30);
      if (result.success) {
        setEvents(result.data || []);
      } else {
        if (result.status === 403 || result.status === 401) {
          setErrorStatus(result.status);
        }
      }
    } catch (err) {
      console.error('Failed to fetch calendar events', err);
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

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedEvents = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < 30; i++) {
    const currentDay = addDays(today, i);
    const dayEvents = filteredEvents.filter((event) =>
      isSameDay(parseISO(event.start), currentDay)
    );

    if (dayEvents.length > 0) {
      groupedEvents.push({
        date: currentDay,
        events: dayEvents,
      });
    }
  }

  const getDayLabel = (date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM do');
  };

  if (errorStatus === 403 || errorStatus === 401) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CalendarIcon size={40} className="text-emerald-400" />
        </div>
        <h1 className="font-plus-jakarta mb-4 text-3xl font-bold text-white">
          Connect Your Calendar
        </h1>
        <p className="mb-8 leading-relaxed text-slate-400">
          EchoNote needs access to your Google Calendar to sync meetings, pre-fill attendee lists,
          and help you organize your productivity archive.
        </p>
        <div className="w-full max-w-sm">
          <LoginButton fullWidth={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-20">
      {}
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="font-plus-jakarta mb-2 text-4xl font-bold tracking-tight text-white">
            Your Agenda
          </h1>
          <p className="text-slate-400">
            Manage and record your upcoming meetings from the next 30 days.
          </p>
        </div>

        <div className="w-full md:w-80">
          <Input
            placeholder="Search meetings..."
            startContent={<Search size={18} className="text-slate-500" />}
            value={searchQuery}
            onValueChange={setSearchQuery}
            classNames={{
              inputWrapper:
                'transition-colors !rounded-btn border-echo-border/50 bg-echo-surface/50 hover:border-accent-primary/30',
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <Spinner size="lg" color="primary" />
          <p className="animate-pulse font-mono text-sm text-slate-500">
            Syncing with Google Calendar...
          </p>
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-echo-border/50 bg-echo-surface/20 py-20 text-center">
          <CalendarIcon size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="mb-2 text-xl font-semibold text-white">No meetings found</h3>
          <p className="text-slate-400">
            Try adjusting your search or adding some events to your Google Calendar.
          </p>
        </div>
      ) : (
        <div className="relative space-y-12 before:absolute before:inset-y-4 before:left-[21px] before:w-[2px] before:rounded-full before:bg-gradient-to-b before:from-accent-primary/40 before:via-accent-secondary/20 before:to-transparent md:before:left-[35px]">
          {groupedEvents.map((group, groupIdx) => (
            <div key={groupIdx} className="relative z-10">
              <div className="sticky top-20 z-20 mb-6 flex items-center gap-4 py-2">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-echo-border/50 bg-echo-base shadow-2xl ring-4 ring-echo-base md:size-[72px]">
                  <div className="flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-bold uppercase leading-none tracking-widest text-accent-primary md:text-xs">
                      {format(group.date, 'MMM')}
                    </span>
                    <span className="text-lg font-bold leading-none text-white md:text-2xl">
                      {format(group.date, 'dd')}
                    </span>
                  </div>
                </div>
                <div className="rounded-full border border-echo-border/30 bg-echo-surface/50 px-5 py-2 backdrop-blur-md">
                  <h2 className="font-plus-jakarta text-sm font-bold tracking-tight text-white md:text-base">
                    {getDayLabel(group.date)}
                  </h2>
                </div>
              </div>

              <div className="ml-14 space-y-6 md:ml-24">
                {group.events.map((event) => (
                  <Card
                    key={event.id}
                    className="group overflow-hidden !rounded-2xl border-echo-border/50 bg-echo-surface/40 transition-all duration-500 hover:border-accent-primary/30"
                    shadow="none"
                  >
                    <CardBody className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {}
                        <div className="flex shrink-0 flex-col items-start justify-center border-echo-border/30 bg-accent-primary/5 p-6 md:w-32 md:items-center md:border-r">
                          <span className="font-mono text-sm font-bold text-white">
                            {format(parseISO(event.start), 'h:mm a')}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-tighter text-slate-500">
                            Starts
                          </span>
                        </div>

                        {}
                        <div className="grow p-6">
                          <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                            <div>
                              <h3 className="mb-2 text-xl font-bold tracking-tight text-white transition-colors group-hover:text-accent-primary">
                                {event.title}
                              </h3>

                              <div className="flex flex-wrap gap-3">
                                {event.location && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <MapPin size={12} className="text-accent-secondary" />
                                    <span className="max-w-[200px] truncate">{event.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <Clock size={12} className="text-slate-500" />
                                  <span>
                                    {format(parseISO(event.start), 'h:mm a')} –{' '}
                                    {format(parseISO(event.end), 'h:mm a')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {event.hangoutLink && (
                                <Button
                                  as="a"
                                  href={event.hangoutLink}
                                  target="_blank"
                                  variant="flat"
                                  size="sm"
                                  className="!rounded-btn bg-accent-secondary/10 font-semibold text-accent-secondary"
                                  startContent={<Video size={14} />}
                                >
                                  Join Now
                                </Button>
                              )}
                              <Button
                                onPress={() => handleRecord(event)}
                                color="primary"
                                size="sm"
                                className="!rounded-btn bg-accent-primary font-bold text-white shadow-lg shadow-accent-primary/20"
                                endContent={<ChevronRight size={14} />}
                              >
                                Record
                              </Button>
                            </div>
                          </div>

                          {event.description && (
                            <div className="custom-scrollbar mb-6 max-h-24 overflow-y-auto rounded-2xl border border-white/5 bg-echo-base/50 p-4 text-sm italic leading-relaxed text-slate-400">
                              <div dangerouslySetInnerHTML={{ __html: event.description }} />
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-echo-border/30 pt-4">
                            <div className="flex items-center -space-x-2">
                              {event.attendees &&
                                event.attendees.map((attendee, idx) => (
                                  <Tooltip key={idx} content={attendee.name || attendee.email}>
                                    <div className="flex size-8 cursor-default items-center justify-center rounded-full border-2 border-echo-base bg-echo-surface text-[10px] font-bold text-accent-secondary shadow-xl ring-1 ring-white/5 transition-transform hover:-translate-y-1">
                                      {(attendee.name || attendee.email || '?')
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                  </Tooltip>
                                ))}
                              {event.attendees && event.attendees.length === 0 && (
                                <span className="text-[10px] italic text-slate-500">
                                  No invitees found
                                </span>
                              )}
                            </div>

                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
                              >
                                Google Calendar <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
