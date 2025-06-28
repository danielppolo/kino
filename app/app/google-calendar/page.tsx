import GoogleCalendarChart from "@/components/charts/google-calendar-chart";
import { Title } from "@/components/ui/typography";

// Force dynamic rendering since this page uses user-specific data
export const dynamic = "force-dynamic";

export default function GoogleCalendarPage() {
  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <Title>Google Calendar Stats</Title>
      <GoogleCalendarChart />
    </div>
  );
}
