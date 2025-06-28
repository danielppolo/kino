"use client";

import { useEffect, useState } from "react";

// TypeScript declarations for Google API
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: {
          apiKey: string;
          clientId: string;
          discoveryDocs: string[];
          scope: string;
        }) => Promise<void>;
        calendar: {
          calendarList: {
            list: () => Promise<{
              result: {
                items?: Array<{
                  id?: string;
                  summary?: string;
                }>;
              };
            }>;
          };
          events: {
            list: (params: {
              calendarId: string;
              timeMin: string;
              timeMax: string;
              showDeleted: boolean;
              singleEvents: boolean;
            }) => Promise<{
              result: {
                items?: Array<{
                  start?: {
                    dateTime?: string;
                    date?: string;
                  };
                  end?: {
                    dateTime?: string;
                    date?: string;
                  };
                }>;
              };
            }>;
          };
        };
      };
      auth2: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
            listen: (callback: (signedIn: boolean) => void) => void;
          };
          signIn: () => void;
          signOut: () => void;
        };
      };
    };
  }
}

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
];

interface CalendarTotal {
  name: string;
  totalHours: number;
  color: string;
}

export function useGoogleCalendar() {
  const [signedIn, setSignedIn] = useState(false);
  const [totals, setTotals] = useState<CalendarTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  useEffect(() => {
    if (!clientId || !apiKey) return;

    // Load the Google API script dynamically
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load("client:auth2", () => {
          window.gapi.client
            .init({
              apiKey,
              clientId,
              discoveryDocs: DISCOVERY_DOCS,
              scope: SCOPES,
            })
            .then(() => {
              const auth = window.gapi.auth2.getAuthInstance();
              setSignedIn(auth.isSignedIn.get());
              auth.isSignedIn.listen(setSignedIn);
            })
            .catch(() => setError("Failed to initialize Google API"));
        });
      }
    };
    script.onerror = () => setError("Failed to load Google API");
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [clientId, apiKey]);

  const signIn = () => {
    if (window.gapi) {
      const auth = window.gapi.auth2.getAuthInstance();
      auth.signIn();
    }
  };

  const signOut = () => {
    if (window.gapi) {
      const auth = window.gapi.auth2.getAuthInstance();
      auth.signOut();
    }
  };

  useEffect(() => {
    if (!signedIn || !window.gapi) return;

    async function fetchData() {
      try {
        setLoading(true);
        const now = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);

        const calendarRes =
          await window.gapi.client.calendar.calendarList.list();
        const calendars = calendarRes.result.items || [];
        const colors = [
          "#0088FE",
          "#00C49F",
          "#FFBB28",
          "#FF8042",
          "#8884D8",
          "#82CA9D",
          "#FF6B6B",
          "#4ECDC4",
        ];

        const totals: CalendarTotal[] = [];
        for (let i = 0; i < calendars.length; i++) {
          const cal = calendars[i];
          const eventsRes = await window.gapi.client.calendar.events.list({
            calendarId: cal.id!,
            timeMin: monthAgo.toISOString(),
            timeMax: now.toISOString(),
            showDeleted: false,
            singleEvents: true,
          });
          const events = eventsRes.result.items || [];
          let total = 0;
          for (const ev of events) {
            if (ev.start && ev.end) {
              const start = new Date(ev.start.dateTime || ev.start.date!);
              const end = new Date(ev.end.dateTime || ev.end.date!);
              total += end.getTime() - start.getTime();
            }
          }
          totals.push({
            name: cal.summary || "Unnamed",
            totalHours: Number((total / 36e5).toFixed(2)),
            color: colors[i % colors.length],
          });
        }
        setTotals(totals);
      } catch (err) {
        console.error("Failed to load calendar data:", err);
        setError("Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [signedIn]);

  return { signedIn, signIn, signOut, totals, loading, error };
}
