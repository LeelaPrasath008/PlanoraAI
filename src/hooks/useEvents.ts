import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { PlanoraEvent } from '../types/event';
import { SAMPLE_PLANS } from '../data/samplePlans';
import {
  subscribeUserEvents,
  saveFullEventSubcollections,
  deleteFullEvent,
  seedInitialPlansForUser,
} from '../services/firestoreService';
import { logClientWarning } from '../utils/clientLogger';

const STORAGE_KEY = 'planora_ai_events_v2';
const ACTIVE_EVENT_KEY = 'planora_ai_active_event_id_v2';

/**
 * Custom hook managing local storage + Firestore persistence for the user's event blueprints.
 */
export function useEvents(
  currentUser: User | null,
  isAuthReady: boolean,
  notify: (message: string, tone?: 'info' | 'warning') => void
) {
  const [events, setEvents] = useState<PlanoraEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      logClientWarning({
        context: 'useEvents initial localStorage read failed',
        error,
      });
    }
    return SAMPLE_PLANS;
  });

  const [activeEventId, setActiveEventId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_EVENT_KEY);
      if (savedId) return savedId;
    } catch (error) {
      logClientWarning({
        context: 'useEvents activeEventId localStorage read failed',
        error,
      });
    }
    return SAMPLE_PLANS[0].id;
  });

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    let isCancelled = false;
    let unsubscribeFirestore: (() => void) | undefined;

    const initCloudSubscription = async () => {
      await Promise.resolve();
      if (isCancelled) return;
      setIsSyncingCloud(true);
      try {
        await seedInitialPlansForUser(currentUser.uid, SAMPLE_PLANS);
        if (isCancelled) return;
        unsubscribeFirestore = subscribeUserEvents(
          currentUser.uid,
          (cloudEvents) => {
            if (cloudEvents.length > 0) {
              setEvents(cloudEvents);
              setActiveEventId((prevId) =>
                cloudEvents.some((e) => e.id === prevId)
                  ? prevId
                  : cloudEvents[0].id
              );
            }
            setIsSyncingCloud(false);
          },
          (error) => {
            logClientWarning({
              context: 'useEvents Firestore subscription error',
              error,
            });
            setIsSyncingCloud(false);
            notify(
              'Cloud sync encountered an error. Using local cache.',
              'warning'
            );
          }
        );
      } catch (error) {
        logClientWarning({
          context: 'useEvents seedInitialPlansForUser error',
          error,
        });
        if (!isCancelled) {
          setIsSyncingCloud(false);
        }
      }
    };

    void initCloudSubscription();

    return () => {
      isCancelled = true;
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [currentUser, isAuthReady, notify]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      logClientWarning({
        context: 'useEvents localStorage write failed',
        error,
      });
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_EVENT_KEY, activeEventId);
    } catch (error) {
      logClientWarning({
        context: 'useEvents activeEventId write failed',
        error,
      });
    }
  }, [activeEventId]);

  const activeEvent = useMemo(
    () => events.find((e) => e.id === activeEventId) || events[0],
    [events, activeEventId]
  );

  const updateActiveEvent = useCallback(
    (updater: (prev: PlanoraEvent) => PlanoraEvent) => {
      setEvents((prevList) =>
        prevList.map((ev) => {
          if (ev.id !== activeEvent.id) return ev;
          const updated = updater(ev);
          const nextEvent: PlanoraEvent = {
            ...updated,
            updatedAt: new Date().toISOString().split('T')[0],
          };
          if (currentUser) {
            setIsSyncingCloud(true);
            saveFullEventSubcollections(currentUser.uid, nextEvent, false)
              .catch((error) => {
                logClientWarning({
                  context: 'useEvents saveFullEventSubcollections failed',
                  error,
                });
                notify('Cloud sync error while saving changes.', 'warning');
              })
              .finally(() => setIsSyncingCloud(false));
          }
          return nextEvent;
        })
      );
    },
    [activeEvent.id, currentUser, notify]
  );

  const createNewEvent = useCallback(
    (newEvent: PlanoraEvent, meta?: { usedFallback?: boolean }) => {
      setEvents((prev) => [newEvent, ...prev]);
      setActiveEventId(newEvent.id);
      if (currentUser) {
        setIsSyncingCloud(true);
        saveFullEventSubcollections(currentUser.uid, newEvent, true)
          .catch((error) =>
            logClientWarning({
              context: 'useEvents createNewEvent cloud save failed',
              error,
            })
          )
          .finally(() => setIsSyncingCloud(false));
      }
      if (meta?.usedFallback) {
        notify(
          `Created "${newEvent.title}" using smart template synthesis.`,
          'warning'
        );
      } else {
        notify(`Generated AI Blueprint for "${newEvent.title}".`);
      }
    },
    [currentUser, notify]
  );

  const duplicateEvent = useCallback(
    (eventToCopy: PlanoraEvent, e: React.MouseEvent) => {
      e.stopPropagation();
      const copy: PlanoraEvent = {
        ...eventToCopy,
        id: `evt_${Date.now()}`,
        title: `${eventToCopy.title} (Copy)`,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      setEvents((prev) => [copy, ...prev]);
      setActiveEventId(copy.id);
      if (currentUser) {
        setIsSyncingCloud(true);
        saveFullEventSubcollections(currentUser.uid, copy, true)
          .catch((error) =>
            logClientWarning({
              context: 'useEvents duplicateEvent cloud save failed',
              error,
            })
          )
          .finally(() => setIsSyncingCloud(false));
      }
      notify(`Duplicated "${eventToCopy.title}"`);
    },
    [currentUser, notify]
  );

  const deleteEventById = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (events.length <= 1) return;
      const filtered = events.filter((ev) => ev.id !== id);
      setEvents(filtered);
      if (activeEventId === id) {
        setActiveEventId(filtered[0].id);
      }
      if (currentUser) {
        setIsSyncingCloud(true);
        deleteFullEvent(id)
          .catch((error) =>
            logClientWarning({
              context: 'useEvents deleteFullEvent failed',
              error,
            })
          )
          .finally(() => setIsSyncingCloud(false));
      }
      notify('Removed event blueprint from portfolio.');
    },
    [events, activeEventId, currentUser, notify]
  );

  const resetDemoData = useCallback(() => {
    setEvents(SAMPLE_PLANS);
    setActiveEventId(SAMPLE_PLANS[0].id);
    localStorage.removeItem(STORAGE_KEY);
    notify('Reset workspace to default sample blueprints.');
  }, [notify]);

  return {
    events,
    activeEvent,
    activeEventId,
    setActiveEventId,
    isSyncingCloud,
    updateActiveEvent,
    createNewEvent,
    duplicateEvent,
    deleteEventById,
    resetDemoData,
  };
}
