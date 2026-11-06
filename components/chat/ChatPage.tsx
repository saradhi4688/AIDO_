import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Deal, Message, UserData, UserRole, AidmateProfile } from '../../types';
import { sendMessage, onNewMessage, uploadChatMedia } from '../../services/firestore';
import SeekerLocationModal from './SeekerLocationModal';
import VerifiedBadge from '../ui/VerifiedBadge';

interface ChatPageProps {
  deal: Deal;
  currentUser: UserData;
  onBack: () => void;
  userRole: UserRole;
  verifiedAidmates: AidmateProfile[];
}

const ChatPage: React.FC<ChatPageProps> = ({ deal, currentUser, onBack, userRole, verifiedAidmates }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showProviderActions, setShowProviderActions] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const provider = useMemo(() => {
    if (userRole === 'seeker') {
      const providerId = typeof deal.id === 'string' ? deal.id.split('-').slice(1).join('-') : null;
      return verifiedAidmates.find(p => p.id === providerId);
    }
    
    if (userRole === 'provider') {
      const loggedInProvider = verifiedAidmates.find(p => p.name === currentUser.name);
      return loggedInProvider || verifiedAidmates[0];
    }

    return undefined;
  }, [deal.id, userRole, currentUser.name, verifiedAidmates]);


  useEffect(() => {
    const unsubscribe = onNewMessage(deal.id, (message) => {
      setMessages((prevMessages) => {
        if (prevMessages.find(m => m.id === message.id)) {
            return prevMessages;
        }
        return [...prevMessages, message];
      });
    }, error => setSendError(error.message));
    return () => unsubscribe();
  }, [deal.id]);

  const derivedMessages = useMemo(() => {
    const hasRealSeekerMessage = messages.some(m => m.senderId === 'seeker');

    if (userRole === 'provider' && !hasRealSeekerMessage) {
        return [...messages].sort((a, b) => a.timestamp - b.timestamp);
    }
    
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, userRole, deal.service]);

  useEffect(() => {
    const providerHasReplied = messages.some(m => m.senderId === 'provider');
    const hasSeekerMessage = derivedMessages.some(m => m.senderId === 'seeker');
    
    if (userRole === 'provider' && hasSeekerMessage && !providerHasReplied) {
        setShowProviderActions(true);
    } else {
        setShowProviderActions(false);
    }
  }, [messages, derivedMessages, userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [derivedMessages]);
  
  const handleAcceptJob = async () => {
    try {
      await sendMessage(deal.id, { text: "I'd be happy to help. What are the details?", senderId: 'provider' });
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Message could not be sent.');
    }
  };
  
  const handleDenyJob = async () => {
    try {
      await sendMessage(deal.id, { text: "Sorry, I am unable to take this request at the moment.", senderId: 'provider' });
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Message could not be sent.');
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    const senderId = userRole === 'provider' ? 'provider' : 'seeker';
    setSendError('');
    try {
      await sendMessage(deal.id, { text: newMessage.trim(), senderId });
      setNewMessage('');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Message could not be sent.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const senderId = userRole === 'provider' ? 'provider' : 'seeker';
      setIsUploading(true);
      setSendError('');
      try {
        const mediaUrl = await uploadChatMedia(deal.id, file);
        await sendMessage(deal.id, { text: '', senderId, mediaUrl });
      } catch (error) {
        setSendError(error instanceof Error ? error.message : 'Image could not be uploaded.');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleHeaderClick = () => {
    if (userRole === 'provider' && deal.seekerLocation && provider?.location) {
      setIsLocationModalOpen(true);
    }
  };
  
  const senderId = userRole === 'provider' ? 'provider' : 'seeker';

  return (
    <div className="flex flex-col h-[90vh] bg-white rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div 
          className={`text-center ${userRole === 'provider' && deal.seekerLocation ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-md' : ''}`}
          onClick={handleHeaderClick}
        >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              {deal.seekerName}
              {provider?.isVerified && <VerifiedBadge className="ml-1.5" />}
            </h3>
            <p className="text-sm text-gray-500">{deal.service}</p>
        </div>
        <div className="flex items-center space-x-2">
            {provider?.mobile ? (
              <a href={`tel:${provider.mobile}`} className="p-2 rounded-full hover:bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </a>
            ) : (
              <button onClick={() => alert('Caller functionality not available for this chat.')} className="p-2 rounded-full hover:bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </button>
            )}
            <button onClick={() => alert('Starting video call...')} className="p-2 rounded-full hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {derivedMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.senderId === senderId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.senderId === senderId ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {msg.mediaUrl ? (
                <img src={msg.mediaUrl} alt="uploaded media" className="rounded-lg max-h-60" />
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Provider Actions */}
      {showProviderActions && (
        <div className="p-3 border-t bg-gray-100 flex items-center justify-around animate-fade-in-down">
            <button onClick={handleAcceptJob} className="px-6 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md">
                Continue
            </button>
            <button onClick={handleDenyJob} className="px-6 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md">
                Deny
            </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t flex items-center space-x-2">
        <label htmlFor="file-upload" className={`cursor-pointer p-2 rounded-full ${showProviderActions ? 'opacity-50' : 'hover:bg-gray-100'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
           <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={showProviderActions || isUploading} />
        </label>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && void handleSendMessage()}
          placeholder={showProviderActions ? 'Please respond to the request above' : 'Type a message...'}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          disabled={showProviderActions}
        />
        <button 
            onClick={() => void handleSendMessage()}
            className="p-2 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-indigo-300"
            disabled={showProviderActions || isUploading || !newMessage.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </div>

      {sendError && (
        <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {sendError}
        </p>
      )}

       {isLocationModalOpen && deal.seekerLocation && provider?.location && (
        <SeekerLocationModal
            seekerLocation={deal.seekerLocation}
            providerLocation={provider.location}
            onClose={() => setIsLocationModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;