# Clear Authentication Issue

## Problem
Frontend stuck in infinite loading loop due to invalid JWT token in browser storage.

## Quick Fix

### Option 1: Browser DevTools (Recommended)
1. Open browser at `http://localhost:3000`
2. Press `F12` or `Cmd+Option+I` (Mac) to open DevTools
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Under **Storage** → **Local Storage** → `http://localhost:3000`
5. Delete these keys:
   - `token`
   - `user`
6. Refresh the page (`Cmd+R` or `F5`)

### Option 2: Browser Console (Faster)
1. Open browser at `http://localhost:3000`
2. Press `F12` or `Cmd+Option+I` to open DevTools
3. Go to **Console** tab
4. Run this command:
   ```javascript
   localStorage.clear()
   ```
5. Refresh the page (`Cmd+R` or `F5`)

### Option 3: Incognito/Private Window
1. Open a new Incognito/Private browser window
2. Go to `http://localhost:3000`
3. The app should load without the invalid token

## What Happened?

The JWT token in your browser points to a user that doesn't exist in the database anymore. This causes:
- `/api/v1/auth/me` → "User not found" error
- `/api/v1/auth/refresh` → "User not found" error
- Frontend stuck trying to authenticate

## After Clearing Storage

You'll need to create a new account:
1. Go to `http://localhost:3000/auth/register`
2. Register a new user
3. You should be able to access the app normally

## Prevent This Issue

This typically happens when:
- Database was reset/cleared but browser still has old tokens
- User was deleted from database
- Testing with different database instances

**Best Practice:** Clear localStorage when resetting the database during development.
