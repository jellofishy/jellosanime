// Connects the website to Supabase (our login + My List database).
// The URL and publishable key are meant to be public. The database's Row Level
// Security rules are what keep each person's data private.
// NEVER put the Supabase "service_role" / secret key anywhere in this project's front end.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// If the settings are missing the site still works; only login is turned off.
export const loginEnabled = Boolean(url && key);
export const supabase = loginEnabled ? createClient(url, key) : null;
