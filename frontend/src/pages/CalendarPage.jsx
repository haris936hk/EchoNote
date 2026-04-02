import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LuClock as Clock, 
  LuCalendar as CalendarIcon, 
  LuMapPin as MapPin, 
  LuExternalLink as ExternalLink, 
  LuVideo as Video, 
  LuSearch as Search,
  LuChevronRight as ChevronRight
} from 'react-icons/lu';
import { 
  Button, 
  Input, 
  Tooltip, 
  Spinner, 
  Chip,
  Card,
  CardBody,
  Divider
} from '@heroui/react';
import { 
  format, 
  isToday, 
  isTomorrow, 
  parseISO, 
  addDays, 
  startOfDay, 
  isSameDay 
} from 'date-fns';
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

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Grouping logic for 30 days
  const groupedEvents = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < 30; i++) {
    const currentDay = addDays(today, i);
    const dayEvents = filteredEvents.filter(event => 
      isSameDay(parseISO(event.start), currentDay)
    );

    if (dayEvents.length > 0) {
      groupedEvents.push({
        date: currentDay,
        events: dayEvents
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center px-4">
        <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <CalendarIcon size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4 font-plus-jakarta">Connect Your Calendar</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
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
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 font-plus-jakarta tracking-tight">Your Agenda</h1>
          <p className="text-slate-400">Manage and record your upcoming meetings from the next 30 days.</p>
        </div>
        
        <div className="w-full md:w-80">
          <Input
            placeholder="Search meetings..."
            startContent={<Search size={18} className="text-slate-500" />}
            value={searchQuery}
            onValueChange={setSearchQuery}
            classNames={{
              inputWrapper: "bg-echo-surface/50 border-echo-border/50 hover:border-accent-primary/30 transition-colors !rounded-[10px]"
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Spinner size="lg" color="primary" />
          <p className="text-slate-500 font-mono text-sm animate-pulse">Syncing with Google Calendar...</p>
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="text-center py-20 bg-echo-surface/20 rounded-3xl border border-dashed border-echo-border/50">
          <CalendarIcon size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No meetings found</h3>
          <p className="text-slate-400">Try adjusting your search or adding some events to your Google Calendar.</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:left-[21px] md:before:left-[35px] before:top-4 before:bottom-4 before:w-[2px] before:rounded-full before:bg-gradient-to-b before:from-accent-primary/40 before:via-accent-secondary/20 before:to-transparent">
          {groupedEvents.map((group, groupIdx) => (
            <div key={groupIdx} className="relative z-10">
              <div className="flex items-center gap-4 mb-6 sticky top-20 z-20 py-2">
                <div className="flex size-11 md:size-[72px] items-center justify-center rounded-full bg-echo-base border border-echo-border/50 shadow-2xl overflow-hidden shrink-0 ring-4 ring-[#020617]">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-accent-primary leading-none mb-1">
                      {format(group.date, 'MMM')}
                    </span>
                    <span className="text-lg md:text-2xl font-bold text-white leading-none">
                      {format(group.date, 'dd')}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-2 rounded-full bg-echo-surface/50 border border-echo-border/30 backdrop-blur-md">
                  <h2 className="text-sm md:text-base font-bold text-white font-plus-jakarta tracking-tight">
                    {getDayLabel(group.date)}
                  </h2>
                </div>
              </div>

              <div className="space-y-6 ml-14 md:ml-24">
                {group.events.map((event) => (
                  <Card 
                    key={event.id} 
                    className="bg-echo-surface/40 border-echo-border/50 hover:border-accent-primary/30 transition-all duration-500 group overflow-hidden !rounded-2xl"
                    shadow="none"
                  >
                    <CardBody className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Time Section */}
                        <div className="md:w-32 p-6 flex flex-col justify-center items-start md:items-center bg-accent-primary/5 md:border-r border-echo-border/30 shrink-0">
                          <span className="text-sm font-bold text-white font-mono">
                            {format(parseISO(event.start), 'h:mm a')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                            Starts
                          </span>
                        </div>

                        {/* Content Section */}
                        <div className="flex-grow p-6">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-accent-primary transition-colors">
                                {event.title}
                              </h3>
                              
                              <div className="flex flex-wrap gap-3">
                                {event.location && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <MapPin size={12} className="text-accent-secondary" />
                                    <span className="truncate max-w-[200px]">{event.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <Clock size={12} className="text-slate-500" />
                                  <span>{format(parseISO(event.start), 'h:mm a')} – {format(parseISO(event.end), 'h:mm a')}</span>
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
                                  className="bg-accent-secondary/10 text-accent-secondary font-semibold !rounded-[10px]"
                                  startContent={<Video size={14} />}
                                >
                                  Join Now
                                </Button>
                              )}
                              <Button
                                onPress={() => handleRecord(event)}
                                color="primary"
                                size="sm"
                                className="font-bold bg-accent-primary text-white shadow-lg shadow-accent-primary/20 !rounded-[10px]"
                                endContent={<ChevronRight size={14} />}
                              >
                                Record
                              </Button>
                            </div>
                          </div>

                          {event.description && (
                            <div className="mb-6 p-4 rounded-2xl bg-echo-base/50 text-sm text-slate-400 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar border border-white/5 italic">
                              <div dangerouslySetInnerHTML={{ __html: event.description }} />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-echo-border/30">
                            <div className="flex items-center -space-x-2">
                              {event.attendees && event.attendees.map((attendee, idx) => (
                                <Tooltip key={idx} content={attendee.name || attendee.email}>
                                  <div className="flex size-8 items-center justify-center rounded-full bg-echo-surface border-2 border-echo-base text-[10px] font-bold text-accent-secondary shadow-xl ring-1 ring-white/5 transition-transform hover:-translate-y-1 cursor-default">
                                    {(attendee.name || attendee.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                </Tooltip>
                              ))}
                              {event.attendees && event.attendees.length === 0 && (
                                <span className="text-[10px] text-slate-500 italic">No invitees found</span>
                              )}
                            </div>

                            {event.htmlLink && (
                              <a 
                                href={event.htmlLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-1"
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
