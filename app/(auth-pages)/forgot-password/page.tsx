import Link from "next/link";

import { SmtpMessage } from "../smtp-message";

import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text, Title } from "@/components/ui/typography";

export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<Message>;
}) {
  const message = await searchParams;
  return (
    <>
      <form className="mx-auto flex w-full min-w-64 max-w-64 flex-1 flex-col gap-2 [&>input]:mb-6">
        <div>
          <Title>Reset Password</Title>
          <Text>
            Already have an account?{" "}
            <Link className="underline" href="/sign-in">
              <Text>Sign in</Text>
            </Link>
          </Text>
        </div>
        <div className="mt-8 flex flex-col gap-2 [&>input]:mb-3">
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
          <SubmitButton formAction={forgotPasswordAction}>
            Reset Password
          </SubmitButton>
          <FormMessage message={message} />
        </div>
      </form>
      <SmtpMessage />
    </>
  );
}
