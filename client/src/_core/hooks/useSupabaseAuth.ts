import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setUser(data.session?.user ?? null); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (mounted) { setSession(nextSession); setUser(nextSession?.user ?? null); setLoading(false); } });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  const signIn = async (email: string, password: string) => { setError(""); if (!isSupabaseConfigured) { const error = new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY para entrar."); setError(error.message); throw error; } const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) { setError(result.error.message); throw result.error; } return result.data; };
  const signUp = async (email: string, password: string) => { setError(""); if (!isSupabaseConfigured) { const error = new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY para criar uma conta."); setError(error.message); throw error; } const result = await supabase.auth.signUp({ email, password }); if (result.error) { setError(result.error.message); throw result.error; } return result.data; };
  const requestPasswordReset = async (email: string, redirectTo: string) => { setError(""); if (!isSupabaseConfigured) { const error = new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY para redefinir a senha."); setError(error.message); throw error; } const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo }); if (result.error) { setError(result.error.message); throw result.error; } return result.data; };
  const updatePassword = async (password: string) => { setError(""); if (!isSupabaseConfigured) { const error = new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY para atualizar a senha."); setError(error.message); throw error; } const result = await supabase.auth.updateUser({ password }); if (result.error) { setError(result.error.message); throw result.error; } return result.data; };
  const signOut = () => supabase.auth.signOut();
  return { session, user, loading, error, signIn, signUp, requestPasswordReset, updatePassword, signOut };
}
