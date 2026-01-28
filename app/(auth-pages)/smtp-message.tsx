import { ArrowUpRight, InfoIcon } from "lucide-react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function SmtpMessage() {
  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>Note:</AlertTitle>
      <AlertDescription>
        Emails are rate limited. Enable Custom SMTP to increase the rate limit.
        <Link
          href="https://supabase.com/docs/guides/auth/auth-smtp"
          target="_blank"
          className="mt-1 flex items-center gap-1 text-foreground underline underline-offset-4 hover:no-underline"
        >
          Learn more <ArrowUpRight size={14} />
        </Link>
      </AlertDescription>
    </Alert>
  );
}
