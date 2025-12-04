# Deploying to Vercel with Environment Variables

## Quick Setup

### 1. Push to GitHub
```bash
git add -A
git commit -m "deployment: add vercel environment configuration"
git push
```

### 2. Import Project on Vercel
1. Go to https://vercel.com/new
2. Select your GitHub repository: `braydenreesmusic-web/web2`
3. Click **Import**

### 3. Configure Environment Variables
Before clicking "Deploy", you need to add your environment variables:

In the **Environment Variables** section, add:

| Name | Value | Notes |
|------|-------|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL | Found in Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Found in Supabase project settings |
| `VITE_OPENAI_API_KEY` | Your OpenAI API Key | From https://platform.openai.com/api-keys |

**Getting Your Keys:**

**Supabase:**
1. Go to https://app.supabase.com
2. Select your project
3. Click **Settings** → **API**
4. Copy `Project URL` and `anon` key

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key

### 4. Deploy
Click the **Deploy** button and wait for completion.

### 5. Update Supabase Auth URLs
After deployment, your app has a public URL. Update Supabase Auth redirect URLs:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-project.vercel.app/`
   - `https://your-project.vercel.app/login`

### 6. Test Features
Visit your deployed app and test:
- ✅ Login/Register
- ✅ AI Insights (with OpenAI)
- ✅ Savings Goals
- ✅ Music (iTunes Search)
- ✅ Presence Tracking
- ✅ Check-ins

## Managing Environment Variables

To update environment variables after deployment:

1. Go to your project on https://vercel.com
2. Click **Settings**
3. Go to **Environment Variables**
4. Edit or add variables
5. Redeploy by pushing to GitHub or clicking the redeploy button

## Troubleshooting

### "OpenAI API key not configured"
- Verify `VITE_OPENAI_API_KEY` is set in Vercel settings
- Trigger a redeployment after adding the variable
- Check that the key starts with `sk-proj-`

### "Supabase connection failed"
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Make sure Supabase Auth redirect URLs include your Vercel domain

### Features not working
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors (F12)

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] SQL migration run in Supabase (`supabase-enhanced-features.sql`)
- [ ] Supabase Auth redirect URLs configured
- [ ] Custom domain configured (optional)
- [ ] Monitoring/logging enabled (optional)

## Support

For issues:
1. Check Vercel deployment logs
2. Check browser console (F12 → Console tab)
3. Verify all environment variables are set correctly
4. Test locally first with `npm run dev`
