import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import UyraUserPortal from './uyra_user';

export default function App() {
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1039368575776-8o2trif67dec4imvo8mktfk2ik5de1lo.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <UyraUserPortal />
      </div>
    </GoogleOAuthProvider>
  );
}
