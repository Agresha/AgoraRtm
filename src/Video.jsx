import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {Video,Phone,PhoneOff,Camera,CameraOff,User,Users,UserPlus,Monitor,CheckCircle,AlertCircle} from "lucide-react";

const APP_ID = "aacc38a143f04f4a95f3182c502ce32f";
const TOKEN_API = "https://celebstalks.pythonanywhere.com/abcd/";

export default function RtcCall() {
  const clientRef = useRef(null);
  const localTracksRef = useRef({ video: null });
  const remoteContainerRef = useRef(null);

  const [senderId, setSenderId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [joined, setJoined] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" });
  const [callStatus, setCallStatus] = useState("Disconnected");
  const [callDuration, setCallDuration] = useState(0);

  // Call timer
  useEffect(() => {
    let interval;
    if (joined) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [joined]);

  // Show notification
  const showNotification = (message, type = "info", duration = 3000) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), duration);
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        setRemoteUsers(prev => [...prev, { uid: user.uid, mediaType }]);
        
        if (mediaType === "video") {
          const remoteVideoContainer = document.createElement("div");
          remoteVideoContainer.className = "relative rounded-xl overflow-hidden bg-gray-900";
          remoteVideoContainer.id = `remote-${user.uid}`;
          
          user.videoTrack.play(remoteVideoContainer);
          
          if (remoteContainerRef.current) {
            remoteContainerRef.current.appendChild(remoteVideoContainer);
          }
        }
        
        showNotification(`${user.uid} joined the call`, "success");
      } catch (error) {
        console.error("Subscribe error:", error);
      }
    });

    client.on("user-unpublished", (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      document.getElementById(`remote-${user.uid}`)?.remove();
    });

    client.on("user-left", (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      document.getElementById(`remote-${user.uid}`)?.remove();
      showNotification(`${user.uid} left the call`, "info");
    });

    return () => {
      leaveCall();
    };
  }, []);

  const joinCall = async () => {
    if (!senderId || !receiverId) {
      showNotification("Please enter both user IDs", "error");
      return;
    }

    setIsLoading(true);
    setCallStatus("Connecting...");

    try {
      const res = await fetch(TOKEN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: Number(senderId),
          receiver_id: Number(receiverId),
          call_type: "video",
        }),
      });

      if (!res.ok) throw new Error("Failed to get token");

      const data = await res.json();
      const { channel, token, id } = data;
      
      console.log("Response:", data);
      
      const client = clientRef.current;
      await client.join(APP_ID, channel, token, Number(id));
      setCallStatus("Connected");

      setJoined(true);
      showNotification("Call started successfully!", "success");
      
    } catch (error) {
      console.error("Join call error:", error);
      setCallStatus("Connection failed");
      showNotification(`Failed to join call: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const leaveCall = async () => {
    const client = clientRef.current;
    if (!client) return;

    setCallStatus("Disconnecting...");

    try {
      // Stop and close local tracks
      Object.values(localTracksRef.current).forEach((track) => {
        if (track) {
          track.stop();
          track.close();
        }
      });

      await client.leave();
      
      localTracksRef.current = { video: null };
      setJoined(false);
      setIsVideoMuted(false);
      setRemoteUsers([]);
      setCallStatus("Disconnected");

      if (remoteContainerRef.current) {
        remoteContainerRef.current.innerHTML = "";
      }

      showNotification("Call ended", "info");
    } catch (error) {
      console.error("Leave call error:", error);
      showNotification("Error leaving call", "error");
    }
  };

  const toggleVideo = async () => {
    if (!localTracksRef.current.video) return;
    
    if (isVideoMuted) {
      await localTracksRef.current.video.setEnabled(true);
    } else {
      await localTracksRef.current.video.setEnabled(false);
    }
    setIsVideoMuted(!isVideoMuted);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
            notification.type === "success" ? "bg-green-900/90 border-l-4 border-green-500" :
            notification.type === "error" ? "bg-red-900/90 border-l-4 border-red-500" :
            "bg-blue-900/90 border-l-4 border-blue-500"
          }`}>
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : notification.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-400" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">
              <Video className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Agora Video Call
              </h1>
              <div className="flex items-center space-x-3 mt-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
                  callStatus === "Connected" ? "bg-green-900/50 text-green-400" :
                  callStatus === "Connecting..." ? "bg-yellow-900/50 text-yellow-400" :
                  "bg-gray-800 text-gray-400"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    callStatus === "Connected" ? "bg-green-500 animate-pulse" :
                    callStatus === "Connecting..." ? "bg-yellow-500 animate-pulse" :
                    "bg-gray-500"
                  }`} />
                  <span>{callStatus}</span>
                </div>
                {joined && (
                  <div className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium flex items-center space-x-2">
                    <Monitor className="h-4 w-4" />
                    <span>{formatTime(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Call Setup/Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Call Setup Section */}
            {!joined ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                  <Phone className="h-6 w-6 text-blue-400" />
                  <span>Start a New Call</span>
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-300">
                        <User className="h-4 w-4 inline mr-2" />
                        Your ID (Sender)
                      </label>
                      <input
                        type="number"
                        value={senderId}
                        onChange={(e) => setSenderId(e.target.value)}
                        placeholder="Enter your user ID"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-300">
                        <UserPlus className="h-4 w-4 inline mr-2" />
                        Recipient ID (Receiver)
                      </label>
                      <input
                        type="number"
                        value={receiverId}
                        onChange={(e) => setReceiverId(e.target.value)}
                        placeholder="Enter recipient user ID"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    onClick={joinCall}
                    disabled={isLoading || !senderId || !receiverId}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-4 px-6 font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="h-6 w-6" />
                        <span>Start Call</span>
                      </>
                    )}
                  </button>

                  <div className="pt-6 border-t border-gray-700/50">
                    <h3 className="text-lg font-semibold mb-3">How to use:</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li className="flex items-start space-x-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />
                        <span>Enter your user ID and recipient's ID</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />
                        <span>Both users need to be using the same channel</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Call Controls */
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center space-x-3">
                    <Phone className="h-6 w-6 text-green-400" />
                    <span>Active Call</span>
                  </h2>
                  <div className="text-sm text-gray-400">
                    Channel: <span className="text-blue-300 font-mono">{senderId}-{receiverId}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Call Controls */}
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={toggleVideo}
                      className={`p-4 rounded-full transition-all duration-200 ${
                        isVideoMuted 
                          ? "bg-red-600 hover:bg-red-700" 
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      {isVideoMuted ? (
                        <CameraOff className="h-6 w-6" />
                      ) : (
                        <Camera className="h-6 w-6" />
                      )}
                    </button>
                    <button
                      onClick={leaveCall}
                      className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors duration-200"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Status Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Duration</div>
                      <div className="font-medium">{formatTime(callDuration)}</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Participants</div>
                      <div className="font-medium">{remoteUsers.length + 1}</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Your ID</div>
                      <div className="font-medium">{senderId}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remote Videos Section */}
            {joined && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center space-x-3">
                    <Users className="h-6 w-6 text-blue-400" />
                    <span>Participants ({remoteUsers.length})</span>
                  </h2>
                  {remoteUsers.length === 0 && (
                    <div className="text-sm text-yellow-400">
                      Waiting for others to join...
                    </div>
                  )}
                </div>

                <div 
                  ref={remoteContainerRef}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px]"
                >
                  {remoteUsers.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                      <Users className="h-16 w-16 mb-4 opacity-30" />
                      <p className="text-lg">No participants yet</p>
                      <p className="text-sm mt-2">Share the recipient ID to invite others</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Info */}
          <div className="space-y-6">

            {/* Quick Help */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4">Quick Help</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-blue-300 mb-1">Cannot see video?</div>
                  <p className="text-sm text-gray-400">Check camera permissions in browser settings</p>
                </div>
                <div className="p-3 bg-green-900/20 rounded-lg">
                  <div className="font-medium text-green-300 mb-1">Trouble joining?</div>
                  <p className="text-sm text-gray-400">Make sure both users have different IDs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-700/50 text-center text-gray-500 text-sm">
          <p>Powered by Agora Video SDK • Real-time video communication</p>
          <p className="mt-2">
            Need help? Visit{" "}
            <a 
              href="https://docs.agora.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Agora Documentation
            </a>
          </p>
        </footer>
      </div>

      {/* Add Tailwind animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        /* Video container styling */
        #remote-container > div {
          min-height: 200px;
          position: relative;
        }
        
        #remote-container > div::before {
          content: 'Remote User';
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 10;
        }
      `}</style>
    </div>
  );
}