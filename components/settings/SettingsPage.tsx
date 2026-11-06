import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Toggle from '../ui/Toggle';
import { requestNotificationPermission } from '../../firebase';
import { AidmateProfile, UserRole } from '../../types';
import ProviderSettings from './ProviderSettings';

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
  userRole: UserRole;
  profileData?: AidmateProfile;
  onUpdateProfile?: (updatedProfile: AidmateProfile, photoFile?: File | null) => Promise<void> | void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onLogout, userRole, profileData, onUpdateProfile }) => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'loading'>('loading');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('denied');
    }
  }, []);

  const handleEnableNotifications = async () => {
    const newStatus = await requestNotificationPermission();
    if (newStatus) {
      setPermissionStatus(newStatus);
    }
  };

  const renderNotificationSettings = () => {
    // ... (Notification settings UI remains the same)
      switch (permissionStatus) {
      case 'loading':
        return <p className="text-sm text-gray-500">Loading notification settings...</p>;
      
      case 'denied':
        return (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <h4 className="font-bold text-yellow-800">Notifications Blocked</h4>
            <p className="text-sm text-yellow-700 mt-1">
              You have blocked notifications. To enable them, please go to your browser's site settings and allow notifications for this page.
            </p>
          </div>
        );
      
      case 'default':
        return (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Enable push notifications to stay updated.</p>
            <Button onClick={handleEnableNotifications}>
              Enable Push Notifications
            </Button>
          </div>
        );

      case 'granted':
        return (
          <div className="space-y-4">
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">Notifications are enabled.</p>
            <Toggle label="New Messages" />
            <Toggle label="Deal Updates" />
            <Toggle label="Verification Status" />
            <Toggle label="Promotions & Updates" initialValue={false} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      </div>

      {/* Community Trust & Two-Way Rating Breakdown */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Your Community Rating</h3>
            <p className="text-xs text-gray-500">
              {userRole === 'provider' ? 'AidMate Rating earned from customers you served' : 'User Rating earned from AidMates who helped you'}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
            <svg className="w-5 h-5 text-amber-500 fill-amber-500" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span className="text-xl font-black text-gray-900">
              {(profileData?.overallRating ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">/ 5.0</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 text-center p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
          {([5, 4, 3, 2, 1] as const).map(star => {
            const count = profileData?.ratings?.[star] ?? 0;
            return (
              <div key={star} className="p-1">
                <p className="text-base font-black text-gray-800">{count}</p>
                <p className="text-[10px] text-gray-400 font-semibold">{star} Stars</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-500 text-center">
          {profileData?.reviewCount ? `${profileData.reviewCount} total verified ratings` : 'No ratings yet'}
        </p>
      </Card>

      {userRole === 'provider' && profileData && onUpdateProfile && (
        <ProviderSettings profileData={profileData} onUpdateProfile={onUpdateProfile} />
      )}

      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Settings</h3>
        {renderNotificationSettings()}
      </Card>
      
      <div className="pt-4 border-t">
         <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600">
            Logout
         </Button>
      </div>

    </div>
  );
};

export default SettingsPage;