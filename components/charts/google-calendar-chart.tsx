"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Title } from "@/components/ui/typography";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";

export default function GoogleCalendarChart() {
  const { signedIn, signIn, signOut, totals, loading, error } =
    useGoogleCalendar();

  return (
    <div className="h-96 w-full space-y-4">
      <div className="flex items-center justify-between">
        <Title>Google Calendar Usage (Last 30 days)</Title>
        <button
          onClick={signedIn ? signOut : signIn}
          className="bg-primary text-primary-foreground rounded px-3 py-1 text-sm font-medium"
        >
          {signedIn ? "Sign out" : "Connect"}
        </button>
      </div>
      {error && <p className="text-destructive-foreground text-sm">{error}</p>}
      {signedIn && (
        <div className="h-72 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              Loading...
            </div>
          ) : totals.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totals}
                  dataKey="totalHours"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {totals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}h`, "Hours"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No events in the last month
            </div>
          )}
        </div>
      )}
      {!signedIn && !error && (
        <p className="text-muted-foreground text-sm">
          Connect your Google Calendar to view usage statistics.
        </p>
      )}
    </div>
  );
}
