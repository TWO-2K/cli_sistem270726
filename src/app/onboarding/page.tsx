import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (usuario) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-4">
      <OnboardingForm
        userId={user.id}
        userEmail={user.email ?? ""}
        userNome={(user.user_metadata?.nome as string | undefined) ?? ""}
      />
    </div>
  );
}
