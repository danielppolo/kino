import Link from "next/link";

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text, Title } from "@/components/ui/typography";

export default function Login({ searchParams }: { searchParams: Message }) {
  return (
    <form className="flex min-w-64 flex-1 flex-col">
      <Title>Sign in</Title>
      <Text>
        Don&apos;t have an account?{" "}
        <Link className="underline" href="/sign-up">
          <Text>Sign up</Text>
        </Link>
      </Text>
      <div className="mt-8 flex flex-col gap-2 [&>input]:mb-3">
        <Label htmlFor="email">Email</Label>
        <Input name="email" placeholder="you@example.com" required />
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link className="underline" href="/forgot-password">
            <Text>Forgot Password?</Text>
          </Link>
        </div>
        <Input
          type="password"
          name="password"
          placeholder="Your password"
          required
        />
        <SubmitButton pendingText="Signing In..." formAction={signInAction}>
          Sign in
        </SubmitButton>
        <FormMessage message={searchParams} />
      </div>
    </form>
  );
}
