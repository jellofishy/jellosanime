// All the Supabase calls for comments, in one place.
// Why a "factory" (makeCommentsApi)? So tests can pass a FAKE Supabase client.
// The real site uses the default `commentsApi` at the bottom of this file.
//
// Every function NEVER throws. It returns { data, error } where error is either
// null or { kind, message }:
//   kind "missing" -> the comments table does not exist yet (SQL not applied)
//   kind "off"     -> login/database is switched off (no Supabase settings)
//   kind "limit"   -> the database's rate limit said "slow down" (message shown as is)
//   kind "other"   -> anything else
import { supabase } from "./auth/supabaseClient.js";

// The columns we read (the profile is joined in, so we get the username + avatar).
export const COMMENT_COLUMNS =
  "id,mal_id,anime_title,anime_image,episode,body,spoiler,created_at,user_id,profiles(username,avatar_url)";
export const PAGE_SIZE = 20;
export const MISSING_TEXT = "Comments aren't set up yet";

// Turns a Supabase error into a friendly { kind, message }.
export function friendlyError(err) {
  const raw = String((err && err.message) || "");
  const code = String((err && err.code) || "");
  const status = err && err.status;
  // 42P01 = table missing, PGRST205/PGRST200 = not in the schema cache, 404 = REST path not found
  if (code === "42P01" || code === "PGRST205" || code === "PGRST200" || status === 404 ||
      /does not exist|schema cache|Could not find the/i.test(raw)) {
    return { kind: "missing", message: MISSING_TEXT };
  }
  // Our rate-limit trigger raises a friendly sentence: show it exactly as it is.
  if (code === "P0001" || /too (many|fast)|slow down|wait a few|rate/i.test(raw)) {
    return { kind: "limit", message: raw || "You're posting too fast. Please wait a moment." };
  }
  if (code === "42501" || /row-level security|permission denied/i.test(raw)) {
    return { kind: "other", message: "You need to be logged in to do that." };
  }
  return { kind: "other", message: "Something went wrong. Please try again." };
}

// The joined profile can come back as an object or a one-item array: make it an object.
function cleanRow(row) {
  if (!row || typeof row !== "object") return null;
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return { ...row, profiles: p && typeof p === "object" ? p : null };
}

export function makeCommentsApi(client) {
  const off = { data: null, error: { kind: "off", message: "Comments aren't available right now." } };

  // Runs a query and never throws.
  async function run(build) {
    if (!client) return off;
    try {
      const { data, error } = await build();
      if (error) return { data: null, error: friendlyError(error) };
      return { data: (Array.isArray(data) ? data : []).map(cleanRow).filter(Boolean), error: null };
    } catch (e) {
      return { data: null, error: friendlyError(e) };
    }
  }

  return {
    // Comments for ONE anime, newest first. `from` = how many we already have (for "Load more").
    listForAnime(malId, from = 0) {
      return run(() => {
        let q = client.from("comments").select(COMMENT_COLUMNS).eq("mal_id", malId)
          .order("created_at", { ascending: false });
        return from > 0 ? q.range(from, from + PAGE_SIZE - 1) : q.limit(PAGE_SIZE);
      });
    },
    // Newest comments across ALL anime (Home page).
    listLatest(limit = 6) {
      return run(() => client.from("comments").select(COMMENT_COLUMNS)
        .order("created_at", { ascending: false }).limit(limit));
    },
    // Adds a comment. user_id is NOT sent: the database fills it in from the login.
    async post({ malId, title, image, episode, body, spoiler }) {
      if (!client) return off;
      try {
        const row = {
          mal_id: malId,
          anime_title: String(title || "Untitled").slice(0, 200),
          anime_image: typeof image === "string" && image.startsWith("https://") ? image : null,
          episode: episode === "" || episode == null ? null : Number(episode),
          body: String(body).trim(),
          spoiler: Boolean(spoiler),
        };
        const { error } = await client.from("comments").insert(row);
        return { data: error ? null : true, error: error ? friendlyError(error) : null };
      } catch (e) {
        return { data: null, error: friendlyError(e) };
      }
    },
    // Deletes one of YOUR comments (the database refuses anyone else's).
    async remove(id) {
      if (!client) return off;
      try {
        const { error } = await client.from("comments").delete().eq("id", id);
        return { data: error ? null : true, error: error ? friendlyError(error) : null };
      } catch (e) {
        return { data: null, error: friendlyError(e) };
      }
    },
  };
}

// The real one used by the site.
export const commentsApi = makeCommentsApi(supabase);

// "5 min ago" style text. A pure function (easy to test): pass `now` to control the clock.
export function timeAgo(value, now = Date.now()) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.floor((now - t) / 1000);
  if (sec < 60) return "just now"; // also covers dates slightly in the future
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  return new Date(t).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
