# ✅ Quick Start Checklist

Follow these steps to get your app running with full authentication and backend integration.

## Phase 1: Basic Setup (5 minutes)

- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file: `cp .env.example .env`
- [ ] Verify app runs: `npm run dev`

## Phase 2: Supabase Setup (10 minutes)

- [ ] Create account at [supabase.com](https://supabase.com)
- [ ] Create new project
- [ ] Copy Project URL from Settings → API
- [ ] Copy anon/public key from Settings → API
- [ ] Add both to `.env` file

## Phase 3: Database Setup (10 minutes)

- [ ] Open Supabase SQL Editor
- [ ] Run **all** table creation SQL from `SETUP_GUIDE.md` (line 70-200)
- [ ] Run **all** RLS policy SQL from `SETUP_GUIDE.md` (line 202-260)
- [ ] Verify tables exist in Table Editor

## Phase 4: Storage Setup (5 minutes)

- [ ] Go to Storage in Supabase dashboard
- [ ] Create bucket named `media`
- [ ] Make bucket public OR add policies from `SETUP_GUIDE.md` (line 262-278)
- [ ] Test by uploading a test file

## Phase 5: Test Authentication (5 minutes)

- [ ] Start dev server: `npm run dev`
- [ ] Navigate to `/register`
- [ ] Create test account
- [ ] Verify redirect to dashboard after registration
- [ ] Check Supabase Authentication tab for new user

## Phase 6: Test Features (10 minutes)

- [ ] Open Daily Check-in modal from dashboard
- [ ] Submit a check-in
- [ ] Verify data appears in Supabase `check_ins` table
- [ ] Go to Profile page
- [ ] Click Sign Out
- [ ] Verify redirect to login

## Phase 7: Replace Mock Data (30-60 minutes)

Choose components to update based on priority:

### High Priority
- [ ] `src/pages/dashboard.jsx` - Load real stats
- [ ] `src/components/modals/EnhancedChat.jsx` - Real-time notes
- [ ] `src/pages/schedule.jsx` - Events and tasks

### Medium Priority
- [ ] `src/pages/media.jsx` - Photos, videos, notes
- [ ] `src/pages/map.jsx` - Pins and location sharing
- [ ] `src/pages/bookmarks.jsx` - Saved places

### Low Priority
- [ ] `src/components/modals/MemoryConstellation.jsx` - Insights
- [ ] `src/components/modals/RelationshipInsights.jsx` - Tips

## Customization Checklist

- [ ] Update brand colors in `tailwind.config.js`
- [ ] Replace placeholder text with your content
- [ ] Add your logo/branding
- [ ] Customize email templates in Supabase Auth settings
- [ ] Set up custom domain (optional)

## Production Checklist

- [ ] Enable email confirmation in Supabase Auth
- [ ] Set up password requirements
- [ ] Add rate limiting
- [ ] Enable Captcha for registration
- [ ] Test on mobile devices
- [ ] Run `npm run build` successfully
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Update Supabase redirect URLs
- [ ] Set up monitoring/analytics

## Troubleshooting

**App won't start?**
- Check Node version (need 18+)
- Delete `node_modules` and `package-lock.json`, run `npm install` again
- Check for port conflicts (default: 5173)

**Can't create account?**
- Verify `.env` has correct Supabase credentials
- Check browser console for errors
- Verify Supabase project is active

**Database errors?**
- Confirm all SQL scripts ran successfully
- Check for typos in table names
- Verify RLS policies are enabled
- Check user_id matches auth.uid()

**Can't upload files?**
- Verify storage bucket exists and is named `media`
- Check storage policies
- Confirm file size is under limit

## Support Resources

- 📖 [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup instructions
- 💻 [API_EXAMPLES.md](./API_EXAMPLES.md) - Code examples for all features
- 🌐 [Supabase Docs](https://supabase.com/docs)
- 💬 [Supabase Discord](https://discord.supabase.com)

## Next Steps After Setup

1. **Customize the UI** - Update colors, fonts, and layout
2. **Add more features** - Implement wish lists, gift ideas, etc.
3. **Improve UX** - Add loading skeletons, error boundaries
4. **Add partner linking** - Allow couples to share one account
5. **Mobile app** - Use React Native or similar
6. **Push notifications** - Remind partners of events

---

🎉 **You're ready to go!** Start with Phase 1 and work through each step.

**Estimated Total Setup Time:** 45-60 minutes
