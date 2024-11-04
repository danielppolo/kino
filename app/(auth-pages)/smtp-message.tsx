import { ArrowUpRight, InfoIcon } from "lucide-react";
import Link from "next/link";

import { Text } from "@/components/ui/typography";

export function SmtpMessage() {
  return (
    <div className="flex gap-4 rounded-md border bg-muted/50 px-5 py-3">
      <InfoIcon size={16} className="mt-0.5" />
      <div className="flex flex-col gap-1">
        <Text small>
          <Text strong> Note:</Text> Emails are rate limited. Enable Custom SMTP
          to increase the rate limit.
        </Text>
        <div>
          <Link
            href="https://supabase.com/docs/guides/auth/auth-smtp"
            target="_blank"
            className="flex items-center gap-1"
          >
            <Text>
              Learn more <ArrowUpRight size={14} />
            </Text>
          </Link>
        </div>
      </div>
    </div>
  );
}
