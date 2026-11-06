import React, { useState } from 'react';
import { UserData, Deal, AidmateProfile } from '../../types';
import { Bell, MapPin, Search, PlusCircle, Calendar, User, Wrench, Zap, ChevronRight, CheckCircle2, Map as MapIcon, ArrowLeft, Lock, Phone, MessageCircle, Star, ShieldCheck, History, Shield } from 'lucide-react';
import CreateRequestModal from '../seeker/CreateRequestModal';
import ReviewModal from '../reviews/ReviewModal';
import ProviderProfileModal from '../seeker/ProviderProfileModal';
import DiscoverMap from './DiscoverMap';

interface HomeDashboardProps {
  userData: UserData;
  userRole?: string | null;
  jobBroadcasts: Deal[];
  verifiedAidmates?: AidmateProfile[];
  previousAidmates?: AidmateProfile[];
  isAidmateActive: boolean;
  onToggleAidmateStatus: (isActive: boolean) => void;
  onGoToSettings: () => void;
  onScanForHelp: (service: string, offer?: string, description?: string, imageUrl?: string) => void;
  onContact: (deal: Deal) => void;
  onOpenChat?: (deal: Deal) => void;
  dismissedBroadcasts?: Set<string | number>;
  onDismissBroadcast?: (_id: string | number) => void;
  onCompleteRequest?: (_id: string | number) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  userData,
  userRole = 'seeker',
  jobBroadcasts,
  verifiedAidmates = [],
  previousAidmates = [],
  isAidmateActive,
  onToggleAidmateStatus,
  onGoToSettings,
  onScanForHelp,
  onContact,
  onOpenChat,
  dismissedBroadcasts = new Set(),
  onDismissBroadcast = (_id: string | number) => {},
  onCompleteRequest = (_id: string | number) => {}
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'discover' | 'bookings'>('home');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [initialServiceForModal, setInitialServiceForModal] = useState<string>('');
  const [selectedProfileForModal, setSelectedProfileForModal] = useState<AidmateProfile | null>(null);

  // Requests made by this user
  const activeRequests = jobBroadcasts.filter(j =>
    (j.seekerUid === userData.id || j.seekerMobile === userData.mobile) &&
    (j.status === 'pending' || j.status === 'accepted'),
  );
  const myActiveRequest = activeRequests.length > 0 ? activeRequests[0] : null;
  const completedRequests = jobBroadcasts.filter(j =>
    (j.seekerUid === userData.id || j.seekerMobile === userData.mobile) && j.status === 'completed',
  );

  // Requests available to work on (not made by user, not declined)
  const availableRequests = jobBroadcasts.filter(j =>
    j.status === 'pending' &&
    j.seekerUid !== userData.id &&
    j.seekerMobile !== userData.mobile &&
    !dismissedBroadcasts.has(j.id),
  );

  // Determine previous AidMates from prop or defaults
  const resolvedPreviousAidmates = previousAidmates.length > 0
    ? previousAidmates
    : verifiedAidmates.slice(0, 2);

  const previousAidmateIds = resolvedPreviousAidmates.map(p => p.id);

  const handlePostRequest = (service: string, offer: string, description?: string, imageUrl?: string) => {
    onScanForHelp(service, offer, description, imageUrl);
    setShowRequestModal(false);
    setInitialServiceForModal('');
  };

  const handleDeclineRequest = (id: string | number) => {
    onDismissBroadcast(id);
  };

  const openRequestModalForService = (serviceName: string) => {
    setInitialServiceForModal(serviceName);
    setShowRequestModal(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col pb-24 text-gray-900 font-sans">
      {/* 1. Top Header */}
      <header className="bg-white px-5 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            A
          </div>
          <div>
            <button 
              onClick={() => setActiveTab('discover')}
              className="flex items-center text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Visakhapatnam, India
              <span className="ml-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-md font-semibold">Map</span>
            </button>
            <h1 className="text-lg font-black tracking-tight text-gray-900 leading-tight">AIDO</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* User / AidMate Profile Rating Pill */}
          <div 
            onClick={onGoToSettings}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors"
            title="Your Community Rating"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-black">
              {(userData.overallRating ?? 0).toFixed(1)}
            </span>
          </div>

          <button 
            onClick={() => setActiveTab('discover')}
            className={`p-2 rounded-xl transition-colors ${activeTab === 'discover' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title="Open Leaflet Discover Map"
          >
            <MapIcon className="w-5 h-5" />
          </button>
          <button className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" />
            {availableRequests.length > 0 && isAidmateActive && (
               <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button onClick={onGoToSettings} className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
             <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userData.name}`} alt="Avatar" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* 2. TAB: DISCOVER LEAFLET MAP */}
      {activeTab === 'discover' && (
        <div className="flex-1 px-4 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('home')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <span className="text-xs font-semibold text-gray-500">
              Leaflet • OpenStreetMap
            </span>
          </div>
          <DiscoverMap 
            userData={userData}
            verifiedAidmates={verifiedAidmates}
            jobBroadcasts={jobBroadcasts}
            previousAidmateIds={previousAidmateIds}
            onRequestService={openRequestModalForService}
            onContactDeal={onContact}
          />
        </div>
      )}

      {/* 3. TAB: BOOKINGS & PREVIOUS AIDMATES */}
      {activeTab === 'bookings' && (
        <div className="flex-1 px-5 pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Your Activity</h2>
              <p className="text-xs text-gray-500">Track current jobs and previous AidMates</p>
            </div>
            <button 
              onClick={() => setShowRequestModal(true)}
              className="text-xs font-bold bg-indigo-600 text-white px-3.5 py-2 rounded-xl shadow-sm hover:bg-indigo-700"
            >
              + Request Help
            </button>
          </div>

          {/* Active Job or Requests */}
          {myActiveRequest ? (
            <div className="bg-white border-2 border-indigo-200 rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${myActiveRequest.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${myActiveRequest.status === 'accepted' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {myActiveRequest.status === 'accepted' ? 'AidMate Accepted' : 'Awaiting AidMate'}
                </span>
                <span className="text-lg font-black text-indigo-600">₹{myActiveRequest.offer || '500'}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{myActiveRequest.service}</h3>
              <p className="text-xs text-gray-500 mb-4">{myActiveRequest.location} • {myActiveRequest.time}</p>
              
              {/* If accepted, chat & call are unlocked */}
              {myActiveRequest.status === 'accepted' ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-green-900">{myActiveRequest.providerName || 'Rajesh Kumar'}</p>
                      <p className="text-[11px] text-green-700">Matched AidMate • En route</p>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`tel:${myActiveRequest.providerMobile || '9876543210'}`}
                        className="px-3 py-1.5 bg-white border border-green-300 text-green-700 font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                      <button 
                        onClick={() => {
                          if (onOpenChat) onOpenChat(myActiveRequest);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-600 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-800">Chat and Calling are locked</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Direct contact will activate automatically as soon as an AidMate accepts this task.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 text-center border border-gray-100 shadow-sm">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="font-bold text-gray-700">No active bookings right now</h4>
              <p className="text-xs text-gray-400 mt-1 mb-4">Post a task for help or explore your previous AidMates below.</p>
              <button 
                onClick={() => setShowRequestModal(true)}
                className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
              >
                Request Help Now
              </button>
            </div>
          )}

          {/* Previous AidMates Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-600" />
                Your Previous AidMates ({resolvedPreviousAidmates.length})
              </h3>
            </div>
            
            <div className="space-y-3">
              {resolvedPreviousAidmates.map((aidmate) => (
                <div key={aidmate.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <img 
                      src={aidmate.profilePictureUrl} 
                      alt={aidmate.name} 
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-100" 
                    />
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                        {aidmate.name}
                        {aidmate.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-green-600" />}
                      </h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {aidmate.services[0]} • <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {aidmate.overallRating}
                      </p>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-0.5">
                        Completed past jobs for you
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProfileForModal(aidmate)}
                    className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-xl transition-colors"
                  >
                    View Work
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Completed Tasks */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Past Services Completed</h3>
            <div className="space-y-3">
              {completedRequests.map(req => (
                <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm mb-1">{req.service}</h4>
                    <div className="flex items-center text-xs font-medium text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Completed • {req.time} • by {req.providerName || 'AidMate'}
                    </div>
                  </div>
                  <div className="font-extrabold text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    ₹{req.offer || '—'}
                  </div>
                </div>
              ))}
              {completedRequests.length === 0 && (
                <p className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-xs text-gray-500">
                  Completed requests will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB: HOME MAIN DASHBOARD */}
      {activeTab === 'home' && (
        <main className="flex-1 px-5 pt-6 space-y-6">
          {/* Greeting & Community Trust Rating Card */}
          <section className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
                  Good day, {userData.name.split(' ')[0]}
                </h2>
                <p className="text-xs text-gray-500">Need help with a task or available to work?</p>
              </div>

              <div className="bg-white border border-amber-200 rounded-2xl p-3 shadow-sm text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Your Rating</span>
                <div className="flex items-center gap-1.5 justify-end">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-lg font-black text-gray-900">
                    {(userData.overallRating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400">/ 5.0</span>
                </div>
                <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  {userData.reviewCount ? `${userData.reviewCount} reviews received` : 'No reviews yet'}
                </p>
              </div>
            </div>
          </section>

          {/* Active AidMate Toggle (Only shown when logged in as an AidMate/provider) */}
          {userRole === 'provider' && (
            <section>
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                     <h3 className="font-extrabold text-gray-900">Active AidMate Mode</h3>
                     <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200">
                       Work & Earn
                     </span>
                   </div>
                   <p className="text-xs text-gray-500 max-w-[220px]">
                     {isAidmateActive ? "You're Active. Nearby people can send you requests." : "Turn ON to receive nearby paid requests"}
                   </p>
                </div>
                <div className="flex flex-col items-center">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold mb-1.5 ${isAidmateActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {isAidmateActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                    {isAidmateActive ? 'ACTIVE' : 'OFF'}
                  </span>
                  <button 
                    onClick={() => onToggleAidmateStatus(!isAidmateActive)}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors ${isAidmateActive ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${isAidmateActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* REQUEST HELP BANNER */}
          <section>
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-200 bg-white/10 px-2.5 py-1 rounded-lg">
                  Community Assistance
                </span>
                <h3 className="text-2xl font-black mt-2 mb-1">What do you need help with?</h3>
                <p className="text-xs text-indigo-100 max-w-xs mb-4">
                  Broadcast your task to the neighborhood. Direct chat and calls unlock once an AidMate accepts!
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowRequestModal(true)}
                    className="bg-white text-indigo-600 font-extrabold py-3 px-5 rounded-2xl shadow-md hover:bg-gray-50 transition-colors flex items-center text-sm"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Request Help
                  </button>
                  <button 
                    onClick={() => setActiveTab('discover')}
                    className="bg-indigo-700/80 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-2xl transition-colors flex items-center text-sm border border-indigo-500"
                  >
                    <MapIcon className="w-4 h-4 mr-1.5" />
                    Leaflet Map
                  </button>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            </div>
          </section>

          {/* ACTIVE REQUEST STATUS CARD */}
          {myActiveRequest && (
            <section>
              <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      Your Broadcasted Request
                    </span>
                    <h4 className="font-extrabold text-gray-900 text-lg mt-1">{myActiveRequest.service}</h4>
                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" /> Visakhapatnam
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-400 font-medium">Bounty Offer</div>
                    <div className="font-black text-indigo-600 text-xl">₹{myActiveRequest.offer || '500'}</div>
                  </div>
                </div>
                
                {myActiveRequest.description && (
                  <div className="mb-3 text-gray-700 text-xs bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <span className="font-bold block mb-0.5">Details:</span>
                    {myActiveRequest.description}
                  </div>
                )}

                {/* State: Pending vs Accepted */}
                {myActiveRequest.status === 'accepted' ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-2">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                          AidMate Matched
                        </span>
                        <h5 className="font-extrabold text-gray-900 text-sm mt-1">
                          {myActiveRequest.providerName || 'Rajesh Kumar'}
                        </h5>
                        <p className="text-[11px] text-gray-500">Task accepted! You can now chat or call.</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a 
                        href={`tel:${myActiveRequest.providerMobile || '9876543210'}`}
                        className="flex-1 bg-white border border-green-300 hover:bg-green-100 text-green-800 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Phone className="w-4 h-4 text-green-600" /> Call AidMate
                      </a>
                      <button 
                        onClick={() => {
                          if (onOpenChat) onOpenChat(myActiveRequest);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" /> Chat with AidMate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50/70 rounded-2xl p-4 mb-2 border border-indigo-100">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                      <div>
                         <p className="text-xs font-bold text-indigo-900">Finding AIDMATES... Broadcasting nearby</p>
                         <p className="text-[11px] text-indigo-600/80">Active workers are receiving your alert</p>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-xl p-2.5 text-[11px] text-gray-600 flex items-center gap-2 border border-indigo-100/50 mb-3">
                      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Direct chat and calling are locked until an AidMate accepts this request.</span>
                    </div>

                  </div>
                )}
              </div>
            </section>
          )}

          {/* 5. PREVIOUS AIDMATES SECTION */}
          <section className="pt-1">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Your Previous AidMates</span>
                  </h3>
                  <p className="text-xs text-gray-500">Trusted helpers you've worked with before</p>
                </div>
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-bold text-indigo-600 flex items-center"
                >
                  View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resolvedPreviousAidmates.map((aidmate) => (
                  <div 
                    key={aidmate.id}
                    onClick={() => setSelectedProfileForModal(aidmate)}
                    className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={aidmate.profilePictureUrl} 
                        alt={aidmate.name} 
                        className="w-13 h-13 w-12 h-12 rounded-2xl object-cover border-2 border-indigo-100" 
                      />
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1">
                          {aidmate.name}
                          {aidmate.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-green-600" />}
                        </h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {aidmate.services[0]} • <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {aidmate.overallRating}
                        </p>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-0.5">
                          Previous AidMate
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProfileForModal(aidmate);
                      }}
                      className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
             </div>
          </section>

          {/* WORK & EARN SECTION (Only visible to AidMate professionals) */}
          {userRole === 'provider' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <Wrench className="w-5 h-5 text-indigo-600" />
                   <h3 className="text-lg font-bold text-gray-900">Work & Earn (AidMate Mode)</h3>
                 </div>
                 <button 
                   onClick={() => setActiveTab('discover')}
                   className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                 >
                   Discover on Map <ChevronRight className="w-3.5 h-3.5" />
                 </button>
              </div>
              
              {isAidmateActive ? (
                <div className="space-y-4">
                   {availableRequests.length > 0 ? (
                      <div className="bg-indigo-50/60 border border-indigo-100 rounded-3xl p-5 text-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                           <Zap className="w-6 h-6 text-indigo-600 animate-pulse" />
                        </div>
                        <h4 className="font-bold text-indigo-900 text-sm">Incoming Request Nearby!</h4>
                        <p className="text-xs text-indigo-600/80 mt-0.5 mb-3">A community member needs your help right now.</p>
                        <button 
                          onClick={() => onContact(availableRequests[0])}
                          className="bg-indigo-600 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md active:scale-95 transition-transform"
                        >
                          Review & Accept Job
                        </button>
                      </div>
                   ) : (
                      <div className="bg-indigo-50/50 border border-indigo-100 border-dashed rounded-3xl p-6 text-center">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                           <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h4 className="font-bold text-indigo-900 text-sm">Waiting for requests...</h4>
                        <p className="text-xs text-indigo-600/80 mt-0.5">Stay nearby or explore the OpenStreetMap view.</p>
                      </div>
                   )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center">
                  <p className="text-gray-600 text-xs mb-3">Turn on Active AidMate above to receive nearby paid requests.</p>
                  <button 
                    onClick={() => onToggleAidmateStatus(true)}
                    className="bg-green-600 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm hover:bg-green-700 transition-colors"
                  >
                    Turn ON Active Mode
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Incoming Request Modal (Popup for Providers) */}
          {isAidmateActive && availableRequests.length > 0 && (
            <div className="fixed inset-0 bg-black/70 flex flex-col justify-end z-[1200] animate-in fade-in duration-200 sm:items-center sm:justify-center backdrop-blur-sm p-0 sm:p-4">
               <div className="bg-white w-full rounded-t-3xl sm:rounded-3xl sm:max-w-md p-6 animate-in slide-in-from-bottom-8 duration-300 shadow-2xl">
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"></div>
                  <div className="flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mx-auto mb-3">
                     <Bell className="w-7 h-7 text-indigo-600 animate-[bounce_1s_infinite]" />
                  </div>
                  <h2 className="text-xl font-black text-center text-gray-900 mb-1">New Request Nearby!</h2>
                  <p className="text-center text-xs text-gray-500 mb-4">Someone in your area needs assistance right now.</p>

                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5">
                     <h3 className="font-extrabold text-gray-900 text-base mb-1.5 flex items-center gap-1.5">
                       <Wrench className="w-4 h-4 text-indigo-600" />
                       {availableRequests[0].service}
                     </h3>
                     <div className="flex items-center text-xs text-gray-500 mb-2">
                       <MapPin className="w-3.5 h-3.5 mr-1" /> 1.2 km away • Visakhapatnam
                     </div>
                     {availableRequests[0].description && (
                       <div className="mb-3 text-gray-700 text-xs bg-white p-3 rounded-xl border border-gray-100">
                         <span className="font-bold block mb-0.5">Details:</span>
                         {availableRequests[0].description}
                       </div>
                     )}
                     <div className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                       <span className="font-semibold text-gray-600 text-xs">Offered pay</span>
                       <span className="font-black text-xl text-indigo-600">₹{availableRequests[0].offer || '300'}</span>
                     </div>
                  </div>

                  <div className="flex gap-3">
                     <button 
                       onClick={() => handleDeclineRequest(availableRequests[0].id)} 
                       className="flex-1 py-3.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                     >
                       Decline
                     </button>
                     <button 
                       onClick={() => onContact(availableRequests[0])} 
                       className="flex-1 py-3.5 text-sm font-extrabold text-white bg-indigo-600 rounded-2xl shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-transform active:scale-95"
                     >
                       Accept & Track
                     </button>
                  </div>
               </div>
            </div>
          )}
        </main>
      )}

      {/* 6. Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-2.5 flex justify-between items-center pb-safe z-40">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'home' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Search className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'home' ? 2.8 : 2} />
          <span className="text-[10px]">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'discover' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <MapPin className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'discover' ? 2.8 : 2} />
          <span className="text-[10px]">Discover</span>
        </button>
        
        {/* Central Action Button */}
        <div className="relative -top-5">
          <button 
            onClick={() => {
              setInitialServiceForModal('');
              setShowRequestModal(true);
            }}
            className="w-13 h-13 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.4)] hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95"
            title="Post a Request"
          >
            <PlusCircle className="w-7 h-7" strokeWidth={2.2} />
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('bookings')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'bookings' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Calendar className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'bookings' ? 2.8 : 2} />
          <span className="text-[10px]">Bookings</span>
        </button>

        <button 
          onClick={onGoToSettings} 
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <User className="w-5 h-5 mb-0.5" strokeWidth={2} />
          <span className="text-[10px] font-semibold">Account</span>
        </button>
      </nav>

      {/* Request Modal */}
      {showRequestModal && (
        <CreateRequestModal 
          onClose={() => {
            setShowRequestModal(false);
            setInitialServiceForModal('');
          }}
          onSubmit={handlePostRequest}
        />
      )}

      {/* Provider Profile Modal (For Previous or Community AidMates) */}
      {selectedProfileForModal && (
        <ProviderProfileModal 
          provider={selectedProfileForModal}
          isPreviousAidmate={previousAidmateIds.includes(selectedProfileForModal.id)}
          onClose={() => setSelectedProfileForModal(null)}
          onRequestService={(serviceName) => {
            setSelectedProfileForModal(null);
            openRequestModalForService(serviceName);
          }}
        />
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60%, 100% { transform: rotate(0deg); }
        }
      `}} />
    </div>
  );
};

export default HomeDashboard;
