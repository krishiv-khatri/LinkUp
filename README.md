# LinkUp

A React Native app built with Expo for connecting friends and organizing events.

## Features

- User authentication with Supabase
- Event creation and management
- Friend connections
- Profile management
- Real-time updates

## Authentication Persistence

The app now properly persists authentication state between app reloads and restarts. This was implemented by:

1. **Secure Session Storage**: Using `expo-secure-store` to securely store Supabase session tokens
2. **Proper Session Initialization**: The app checks for existing sessions on startup
3. **Auth State Management**: Robust handling of auth state changes and token refresh

### Testing Authentication Persistence

To verify that authentication persistence is working:

1. Sign in to the app
2. Reload the app (fast refresh or full reload)
3. The user should remain logged in and not be redirected to the login screen

### Debugging

The app includes detailed logging for authentication events. Check the console for:
- `🔐 Initializing auth state...` - App startup
- `✅ Found existing session for user:` - Session restored
- `🔄 Auth state changed:` - Auth state changes
- `🔄 Token refreshed for user:` - Token refresh events

You can also use the debug utilities in `utils/sessionDebug.ts` to manually check session storage.

## Development

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Environment Setup

Make sure you have the following environment variables set up in your Supabase project:
- Database URL
- Anon Key

The app is configured to use secure storage for session persistence on mobile platforms.
