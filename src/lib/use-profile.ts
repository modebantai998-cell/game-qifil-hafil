import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; username: string; player_id: string };

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("id,username,player_id").eq("id", data.user.id).maybeSingle();
      if (p) setProfile(p);
    });
  }, []);
  return profile;
}
