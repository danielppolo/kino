import Link from "next/link";

import { SmtpMessage } from "../smtp-message";

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text, Title } from "@/components/ui/typography";

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<Message>;
}) {
  const message = await searchParams;
  if ("message" in message) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center gap-2 p-4 sm:max-w-md">
        <FormMessage message={message} />
      </div>
    );
  }

  return (
    <>
      <form className="mx-auto flex min-w-64 max-w-64 flex-col">
        <Title>Sign up</Title>
        <Text>
          Already have an account?{" "}
          <Link className="underline" href="/sign-in">
            <Text>Sign in</Text>
          </Link>
        </Text>
        <div className="mt-8 flex flex-col gap-2 [&>input]:mb-3">
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Your password"
            minLength={6}
            required
          />
          <SubmitButton formAction={signUpAction} pendingText="Signing up...">
            Sign up
          </SubmitButton>
          <FormMessage message={message} />
        </div>
      </form>
      <SmtpMessage />
    </>
  );
}
