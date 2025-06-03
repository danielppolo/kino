import { UpdateProfileForm } from "./update-profile-form";

import { Text, Title } from "@/components/ui/typography";
import { createClient } from "@/utils/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name || "";

  return (
    <div className="container max-w-2xl py-8">
      <div className="space-y-6">
        <div>
          <Title>Profile Settings</Title>
          <Text>Update your profile information</Text>
        </div>
        <UpdateProfileForm initialDisplayName={displayName} />
      </div>
    </div>
  );
}
