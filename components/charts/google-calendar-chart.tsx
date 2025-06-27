"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { Title } from "@/components/ui/typography";

export default function GoogleCalendarChart() {
  const { signedIn, signIn, signOut, totals, loading, error } =
    useGoogleCalendar();

  return (
    <div className="h-96 w-full space-y-4">
      <div className="flex items-center justify-between">
        <Title>Google Calendar Usage (Last 30 days)</Title>
        <button
          onClick={signedIn ? signOut : signIn}
          className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
        >
          {signedIn ? "Sign out" : "Connect"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive-foreground">{error}</p>
      )}
      {signedIn && (
        <div className="h-72 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">Loading...</div>
          ) : totals.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totals}
                  dataKey="totalHours"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {totals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v}h`, "Hours"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No events in the last month
            </div>
          )}
        </div>
      )}
      {!signedIn && !error && (
        <p className="text-sm text-muted-foreground">
          Connect your Google Calendar to view usage statistics.
        </p>
      )}
    </div>
  );
}
