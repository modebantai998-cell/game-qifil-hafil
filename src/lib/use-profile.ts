import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; username: string; player_id: string };

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async (tries: number) => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (uid) {
        const { data: p } = await supabase.from("profiles").select("id,username,player_id").eq("id", uid).maybeSingle();
        if (p && alive) return setProfile(p);
      }
      if (tries > 0 && alive) setTimeout(() => load(tries - 1), 600);
    };
    load(10);
    return () => { alive = false; };
  }, []);
  return profile;
}
