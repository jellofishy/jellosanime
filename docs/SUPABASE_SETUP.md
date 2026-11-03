# Supabase setup (one time, about 5 minutes)

This adds user profiles, comments and "continue watching" to your database. You only paste one file into Supabase. Your existing My List data is not touched.

## 1. Run the SQL

1. Open the SQL editor for your project: https://supabase.com/dashboard/project/lfxqfrkyfbewonhpjqhv/sql/new
   (log in if asked).
2. In this project open the file `supabase/migrations/20261104_profiles_comments.sql`, select ALL of it (Ctrl+A) and copy it (Ctrl+C).
3. Click into the big empty box in the SQL editor and paste (Ctrl+V).
4. Click the green **Run** button (or press Ctrl+Enter).
5. If Supabase shows a warning about "destructive operations" or "RLS", it is about the `drop policy if exists` lines which only replace the rules this file creates. Click **Run this query** to continue.
6. You should see "Success. No rows returned". Running it a second time is safe too.

## 2. Check it worked

1. In the left menu click **Table Editor**.
2. You should see two new tables: **profiles** and **comments**. Click **profiles**: there should be one row for each person who already signed up.
3. Click **my_list** and check there is a new column called **last_episode** (all zeros).
4. Click **Authentication** > **Policies** and check that profiles, comments and my_list show the green "RLS enabled" label.

## 3. Google login reminder

1. Click **Authentication** > **Sign In / Providers** (older dashboards: Providers) > **Google**.
2. Turn **Enable Sign in with Google** on and paste your Google Client ID and Client Secret.
3. In Google Cloud Console, under your OAuth client, the **Authorized redirect URI** must be exactly:
   `https://lfxqfrkyfbewonhpjqhv.supabase.co/auth/v1/callback`
4. Click **Save**.

## 4. Site URL

1. Click **Authentication** > **URL Configuration**.
2. **Site URL**: `https://jellosanime.netlify.app`
3. Under **Redirect URLs** add `https://jellosanime.netlify.app` (and `http://localhost:5173` if you test on your own computer).
4. Click **Save**.

## 5. How to test comments

- [ ] Open the site, log in with Google. In Table Editor > profiles your row appears with a username made from your Google name.
- [ ] Open any anime page, scroll to Comments and write a comment, then press Post. It shows at the top.
- [ ] Press Post again within 10 seconds: you see "You are commenting too fast. Please wait a few seconds."
- [ ] Tick "Spoiler" on a comment: it is blurred until you tap it.
- [ ] Open the site in a private window (logged out): you can read comments but see "Log in to comment".
- [ ] Delete your own comment with the delete button: it disappears. You cannot delete other people's.
- [ ] Add an anime to My List, press "+1" on the Home page "Continue watching" row: the episode number goes up (check `last_episode` in Table Editor).
- [ ] Change the colour or language in the menu, refresh: your choice is remembered (profiles row: accent, mode, title_lang).

## If something goes wrong

- "relation public.my_list does not exist": create My List first (see docs/DEPLOY.md), then run the file again.
- Red error text in the SQL editor: copy it and send it to your helper together with the line number it shows.
- Until the SQL is run, the site still works: comments show "Comments aren't set up yet" and themes are saved in the browser only.
