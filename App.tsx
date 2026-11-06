import React, { useState, useEffect } from 'react';
import { UserData, UserRole, Deal, Notification, AidmateProfile } from './types';
import SignUpPage from './components/auth/SignUpPage';
import HomeDashboard from './components/home/HomeDashboard';
import SettingsPage from './components/settings/SettingsPage';
import ChatPage from './components/chat/ChatPage';
import NotificationToast from './components/ui/NotificationToast';
import ActiveJobExecution from './components/jobs/ActiveJobExecution';
import { clearAuthSession, restoreAuthSession, submitReview } from './services/api';
import {
  acceptDeal,
  completeDeal,
  createDeal,
  subscribeToAidmates,
  subscribeToAidmateProfile,
  subscribeToDeals,
  updateAidmateAvailability,
  updateAidmateProfile,
} from './services/firestore';


type View = 'signup' | 'home-dashboard' | 'chat' | 'settings';

const App: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [view, setView] = useState<View>('signup');
  const [activeChatDeal, setActiveChatDeal] = useState<Deal | null>(null);
  const [activeChatRole, setActiveChatRole] = useState<'seeker' | 'provider'>('seeker');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isAuthRestoring, setIsAuthRestoring] = useState(true);

  const [isAidmateActive, setIsAidmateActive] = useState(false);

  // Centralized state management for application data
  const [verifiedAidmates, setVerifiedAidmates] = useState<AidmateProfile[]>([]);
  const [providerProfile, setProviderProfile] = useState<AidmateProfile | null>(null);
  const [jobBroadcasts, setJobBroadcasts] = useState<Deal[]>([]);
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<string | number>>(new Set());
  const [activeJob, setActiveJob] = useState<Deal | null>(null);

  useEffect(() => {
    let active = true;
    restoreAuthSession()
      .then(account => {
        if (!active || !account) return;
        setUserData(account);
        setUserRole(account.accountType === 'provider' ? 'provider' : 'seeker');
        setIsAidmateActive(account.isAvailable ?? false);
        setView('home-dashboard');
      })
      .catch(error => {
        if (active) {
          setNotification({
            title: 'Session could not be restored',
            body: error instanceof Error ? error.message : 'Please sign in again.',
            type: 'alert',
          });
        }
      })
      .finally(() => {
        if (active) setIsAuthRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCompleteRequest = async (dealId: string | number): Promise<boolean> => {
    try {
      await completeDeal(String(dealId));
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: { title: 'Request completed', body: 'Thank you for using AIDO.', type: 'success' }
      }));
      return true;
    } catch (error) {
      setNotification({
        title: 'Could not complete request',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
      return false;
    }
  };

  const handleCreateBroadcast = async (service: string, offer: string = "", description?: string, imageUrl?: string) => {
    if (!userData) return;
    try {
      await createDeal({
        service,
        location: 'Your Location',
        time: 'Just now',
        seekerName: userData.name,
        seekerMobile: userData.mobile,
        seekerLocation: { lat: 17.6868, lng: 83.2185 },
        offer,
        description,
        imageUrl,
      });
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: { title: 'Request broadcasted', body: `AidMates can now respond to: ${service}` }
      }));
    } catch (error) {
      setNotification({
        title: 'Could not create request',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
    }
  };

  useEffect(() => {
    const handleShowNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setNotification({ title: detail.title, body: detail.body, type: detail.type });
    };

    window.addEventListener('show-notification', handleShowNotification);
    return () => {
      window.removeEventListener('show-notification', handleShowNotification);
    };
  }, []);

  useEffect(() => {
    if (!userData?.id || !userRole) {
      setJobBroadcasts([]);
      return;
    }
    return subscribeToDeals(
      userData.id,
      userRole,
      setJobBroadcasts,
      error => setNotification({
        title: 'Requests could not be loaded',
        body: error.message,
        type: 'alert',
      }),
    );
  }, [userData?.id, userRole]);

  useEffect(() => {
    if (!userData?.id) {
      setVerifiedAidmates([]);
      return;
    }
    return subscribeToAidmates(
      setVerifiedAidmates,
      error => setNotification({
        title: 'AidMate profiles could not be loaded',
        body: error.message,
        type: 'alert',
      }),
    );
  }, [userData?.id]);

  useEffect(() => {
    if (!userData?.id || userRole !== 'provider') {
      setProviderProfile(null);
      return;
    }
    return subscribeToAidmateProfile(
      userData.id,
      setProviderProfile,
      error => setNotification({
        title: 'Your AidMate profile could not be loaded',
        body: error.message,
        type: 'alert',
      }),
    );
  }, [userData?.id, userRole]);

  const handleSignUpSuccess = (data: UserData, role?: UserRole) => {
    setUserData(data);
    setIsAidmateActive(Boolean(data.isAvailable));
    setUserRole(role === 'provider' ? 'provider' : 'seeker');
    setView('home-dashboard');
  };

  const handleLogout = async () => {
    try {
      await clearAuthSession();
    } catch (error) {
      setNotification({
        title: 'Could not sign out',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
      return;
    }
    setUserData(null);
    setUserRole(null);
    setIsAidmateActive(false);
    setView('signup');
  };

  const handleAcceptJob = async (deal: Deal) => {
    if (!userData?.id) return;
    try {
      await acceptDeal(String(deal.id));
      setActiveJob({
        ...deal,
        status: 'accepted',
        providerUid: userData.id,
        providerName: userData.name,
        providerMobile: userData.mobile,
      });
      setDismissedBroadcasts(prev => new Set(prev).add(deal.id));
    } catch (error) {
      setNotification({
        title: 'Could not accept request',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
    }
  };
  
  const handleTwoWayRating = async (
    rating: number,
    feedback: string,
    fromRole: 'seeker' | 'provider',
    job: Deal,
  ) => {
    const targetName = fromRole === 'seeker'
      ? job.providerName || 'Your AidMate'
      : job.seekerName;
    const targetMobile = fromRole === 'seeker' ? job.providerMobile : job.seekerMobile;
    const targetUserId = fromRole === 'seeker' ? job.providerUid : job.seekerUid;

    try {
      await submitReview({
        jobId: String(job.id),
        targetUserId,
        targetName,
        targetMobile,
        reviewerName: userData?.name || 'AIDO user',
        targetRole: fromRole === 'seeker' ? 'aidmate' : 'customer',
        rating,
        comment: feedback,
      });
    } catch (error) {
      setNotification({
        title: 'Review could not be saved',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
      throw error;
    }

    if (fromRole === 'seeker') {
      setVerifiedAidmates(prev => prev.map(aidmate => {
        if (aidmate.id === targetUserId) {
          const starKey = rating.toString() as '1' | '2' | '3' | '4' | '5';
          const newRatings = { ...aidmate.ratings, [starKey]: (aidmate.ratings[starKey] || 0) + 1 };
          const newCount = aidmate.reviewCount + 1;
          const totalScore = (aidmate.overallRating * aidmate.reviewCount) + rating;
          const newOverall = parseFloat((totalScore / newCount).toFixed(1));
          return {
            ...aidmate,
            ratings: newRatings,
            reviewCount: newCount,
            overallRating: newOverall
          };
        }
        return aidmate;
      }));
    } else if (userData) {
      setUserData(prev => {
        if (!prev) return prev;
        const starKey = rating.toString() as '1' | '2' | '3' | '4' | '5';
        const currentRatings = prev.ratings || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
        const currentCount = prev.reviewCount || 0;
        const currentOverall = prev.overallRating || 0;
        const newCount = currentCount + 1;
        const newRatings = { ...currentRatings, [starKey]: (currentRatings[starKey] || 0) + 1 };
        const newOverall = Number((((currentOverall * currentCount) + rating) / newCount).toFixed(1));

        return {
          ...prev,
          ratings: newRatings,
          reviewCount: newCount,
          overallRating: newOverall,
        };
      });
    }

    window.dispatchEvent(new CustomEvent('show-notification', {
      detail: {
        title: 'Review Submitted',
        body: `Your ${rating}-star rating and feedback have been saved.`,
        type: 'success',
      },
    }));
  };

  const handleCompleteJob = async (job: Deal) => {
    if (await handleCompleteRequest(job.id)) setActiveJob(null);
  };

  const handleContact = (deal: Deal, chatRole?: 'seeker' | 'provider') => {
    setActiveChatDeal(deal);
    setActiveChatRole(chatRole || 'seeker');
    setView('chat');
  };
  
  const handleBackFromChat = () => {
    setView('home-dashboard');
  };

  const handleToggleAidmateStatus = async (isActive: boolean) => {
    if (!userData?.id) return;
    if (isActive && (
      userData.isActiveAidmate !== true ||
      !verifiedAidmates.some(profile => profile.id === userData.id)
    )) {
      setNotification({
        title: 'AidMate approval required',
        body: 'An administrator must activate and verify your AidMate profile before you can receive requests.',
        type: 'alert',
      });
      return;
    }
    try {
      await updateAidmateAvailability(userData.id, isActive);
      setIsAidmateActive(isActive);
    } catch (error) {
      setNotification({
        title: 'Could not update availability',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
    }
  };

  const handleUpdateProfile = async (updatedProfile: AidmateProfile, photoFile?: File | null) => {
    try {
      const savedProfile = await updateAidmateProfile(updatedProfile, photoFile);
      setProviderProfile(savedProfile);
      setVerifiedAidmates(prev => prev.map(p => p.id === savedProfile.id ? savedProfile : p));
      window.dispatchEvent(new CustomEvent('show-notification', {
        detail: { title: 'Profile Updated', body: 'Your changes have been saved.' }
      }));
    } catch (error) {
      setNotification({
        title: 'Could not update profile',
        body: error instanceof Error ? error.message : 'Please try again.',
        type: 'alert',
      });
      throw error;
    }
  };


  const renderContent = () => {
    const currentProviderJob = activeJob || jobBroadcasts.find(
      deal => deal.providerUid === userData?.id && deal.status === 'accepted',
    ) || null;
    if (currentProviderJob) {
      return (
        <ActiveJobExecution 
          job={currentProviderJob}
          onComplete={() => handleCompleteJob(currentProviderJob)}
          onRate={handleTwoWayRating}
          onChat={() => handleContact(currentProviderJob, 'provider')}
          role="provider" 
        />
      );
    }
    
    const myActiveRequest = jobBroadcasts.find(j => j.seekerMobile === userData?.mobile && j.status === 'accepted');
    if (myActiveRequest) {
      return (
        <ActiveJobExecution 
          job={myActiveRequest} 
          onComplete={() => handleCompleteRequest(myActiveRequest.id as string)} 
          onRate={handleTwoWayRating}
          onChat={() => handleContact(myActiveRequest, 'seeker')}
          role="seeker" 
        />
      );
    }
    const matchedProfile = userData
        ? verifiedAidmates.find(p => p.id === userData.id)
        : undefined;

    const currentUserProfile: AidmateProfile | undefined = userRole === 'provider'
      ? providerProfile || matchedProfile
      : userData ? {
      id: userData.id || `user-${userData.mobile}`,
      name: userData.name,
      mobile: userData.mobile,
      profilePictureUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${userData.name}`,
      district: 'Local Area',
      state: 'India',
      overallRating: userData.overallRating ?? 0,
      reviewCount: userData.reviewCount ?? 0,
      services: ['Community Member'],
      skills: ['Community Member'],
      jobs: [],
      ratings: userData.ratings || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      isAvailable: isAidmateActive,
      isVerified: false,
      location: { lat: 17.6868, lng: 83.2185 },
      distance: '0 km',
      bio: 'Active community participant.'
    } : undefined;
        
    if (view === 'settings' && userData) {
        return <SettingsPage 
          userRole={userRole}
          profileData={currentUserProfile}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setView('home-dashboard')} 
          onLogout={handleLogout} 
        />
    }
    
    if (view === 'chat' && activeChatDeal && userData) {
        return <ChatPage 
          deal={activeChatDeal} 
          currentUser={userData} 
          onBack={handleBackFromChat} 
          userRole={activeChatRole}
          verifiedAidmates={verifiedAidmates}
        />
    }

    if (userData) {
      const previousAidmates = jobBroadcasts
        .filter(deal => deal.seekerUid === userData.id && deal.status === 'completed' && deal.providerUid)
        .map(deal => verifiedAidmates.find(profile => profile.id === deal.providerUid))
        .filter((profile): profile is AidmateProfile => Boolean(profile))
        .slice(0, 2);

      switch (view) {
        case 'home-dashboard':
          return <HomeDashboard 
            userData={userData}
            userRole={userRole}
            jobBroadcasts={jobBroadcasts}
            verifiedAidmates={verifiedAidmates}
            previousAidmates={previousAidmates}
            isAidmateActive={isAidmateActive}
            onToggleAidmateStatus={handleToggleAidmateStatus}
            onGoToSettings={() => setView('settings')}
            onScanForHelp={handleCreateBroadcast}
            onCompleteRequest={handleCompleteRequest}
            onContact={handleAcceptJob}
            onOpenChat={(deal) => handleContact(deal, 'seeker')}
            onDismissBroadcast={(id) => setDismissedBroadcasts(prev => new Set(prev).add(id))}
            dismissedBroadcasts={dismissedBroadcasts}
          />;
      }
    }

    return <SignUpPage onSignUpSuccess={handleSignUpSuccess} />;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {isAuthRestoring ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-gray-500">
            Restoring your session…
          </div>
        ) : renderContent()}
      </main>
      {notification && (
        <NotificationToast 
          title={notification.title} 
          body={notification.body} 
          type={notification.type}
          onClose={() => setNotification(null)} 
        />
      )}
    </div>
  );
};

export default App;