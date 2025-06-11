import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const AuthDebug: React.FC = () => {
  const { user, profile, session, loading } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Auth Debug Info:</h3>
      <div className="space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>User: {user ? `${user.id} (${user.email})` : 'None'}</div>
        <div>Profile: {profile ? `${profile.role} - ${profile.email}` : 'None'}</div>
        <div>Session: {session ? 'Active' : 'None'}</div>
      </div>
      {user && !profile && (
        <div className="mt-2 text-red-300">
          ⚠️ User exists but no profile found!
        </div>
      )}
    </div>
  );
};

export default AuthDebug; 