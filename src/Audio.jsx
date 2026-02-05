import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {Phone,PhoneOff,Mic,MicOff,User,UserPlus,Headphones,Volume2,Copy,CheckCircle,AlertCircle,Users,Clock,Shield} from "lucide-react";

const APP_ID = "aacc38a143f04f4a95f3182c502ce32f";
const TOKEN_API = "https://celebstalks.pythonanywhere.com/abcd/";

export default function AudioCall() {
  const clientRef = useRef(null);
  const localAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const [senderId, setSenderId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [callStatus, setCallStatus] = useState("Disconnected");
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "info" });

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

  // Audio visualization
  useEffect(() => {
    if (joined && localAudioRef.current) {
      setupAudioVisualization();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [joined]);

  const setupAudioVisualization = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(localAudioRef.current.getMediaStreamTrack());
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    const updateAudioLevel = () => {
      if (!analyserRef.current) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const level = Math.min(100, (average / 128) * 100);
      
      setAudioLevel(level);
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
  };

  const showNotification = (message, type = "info", duration = 3000) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "info" }), duration);
  };

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
        
        if (mediaType === "audio") {
          setRemoteUsers(prev => [...prev, { uid: user.uid, isSpeaking: false }]);
          user.audioTrack.play();
          
          // Monitor remote user audio levels
          const context = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = context.createAnalyser();
          const source = context.createMediaStreamSource(user.audioTrack.getMediaStreamTrack());
          
          analyser.fftSize = 256;
          source.connect(analyser);
          
          const monitorAudio = () => {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            
            setRemoteUsers(prev => 
              prev.map(u => u.uid === user.uid 
                ? { ...u, isSpeaking: average > 20, audioLevel: average } 
                : u
              )
            );
            
            requestAnimationFrame(monitorAudio);
          };
          
          monitorAudio();
          
          showNotification(`${user.uid} joined the call`, "success");
        }
      } catch (error) {
        console.error("Subscribe error:", error);
      }
    });

    client.on("user-unpublished", (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on("user-left", (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      showNotification(`${user.uid} left the call`, "info");
    });

    return () => {
      leaveCall();
    };
  }, []);

  const joinCall = async () => {
    if (!senderId.trim() || !receiverId.trim()) {
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
          call_type: "audio",
        }),
      });

      if (!res.ok) throw new Error("Failed to get token");

      const data = await res.json();
      const { channel, token, id } = data;

      const client = clientRef.current;

      await client.join(APP_ID, channel, token, Number(id));
      setCallStatus("Connected");

      setJoined(true);
      showNotification("Audio call started successfully!", "success");

    } catch (err) {
      console.error("Audio join failed", err);
      setCallStatus("Connection failed");
      showNotification(`Failed to join call: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const leaveCall = async () => {
    setCallStatus("Disconnecting...");

    try {
      if (localAudioRef.current) {
        localAudioRef.current.stop();
        localAudioRef.current.close();
        localAudioRef.current = null;
      }

      if (clientRef.current) {
        await clientRef.current.leave();
      }

      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      setJoined(false);
      setIsMuted(false);
      setRemoteUsers([]);
      setCallStatus("Disconnected");
      showNotification("Call ended", "info");
      
    } catch (err) {
      console.error("Leave call error:", err);
      showNotification("Error leaving call", "error");
    }
  };

  const toggleMute = async () => {
    if (localAudioRef.current) {
      if (isMuted) {
        await localAudioRef.current.setEnabled(true);
      } else {
        await localAudioRef.current.setEnabled(false);
      }
      setIsMuted(!isMuted);
      showNotification(isMuted ? "Microphone unmuted" : "Microphone muted", "info");
    }
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl">
              <Headphones className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Agora Audio Call
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
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Call Setup / Controls */}
            {!joined ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                  <Phone className="h-6 w-6 text-blue-400" />
                  <span>Start Audio Call</span>
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
                        <span>Start Audio Call</span>
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
                        <span>Both users need to use the same IDs</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />
                        <span>Grant microphone permission when prompted</span>
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
                    <span>Active Audio Call</span>
                  </h2>
                  <div className="text-sm text-gray-400">
                    Channel: <span className="text-blue-300 font-mono">{senderId}-{receiverId}</span>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Audio Visualization */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-300">Your Audio Level</div>
                      <div className="text-sm text-gray-400">{Math.round(audioLevel)}%</div>
                    </div>
                    <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Volume2 className="h-16 w-16 text-blue-400" />
                    </div>
                  </div>

                  {/* Call Controls */}
                  <div className="flex justify-center space-x-6">
                    <button
                      onClick={toggleMute}
                      className={`p-4 rounded-full transition-all duration-200 flex flex-col items-center space-y-2 ${
                        isMuted 
                          ? "bg-red-600 hover:bg-red-700" 
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      {isMuted ? (
                        <MicOff className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                      <span className="text-sm">{isMuted ? "Unmute" : "Mute"}</span>
                    </button>

                    <button
                      onClick={leaveCall}
                      className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors duration-200 flex flex-col items-center space-y-2"
                    >
                      <PhoneOff className="h-8 w-8" />
                      <span className="text-sm">End Call</span>
                    </button>
                  </div>

                  {/* Status Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Duration</div>
                      <div className="font-medium text-lg">{formatTime(callDuration)}</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Participants</div>
                      <div className="font-medium text-lg">{remoteUsers.length + 1}</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Your ID</div>
                      <div className="font-medium text-lg">{senderId}</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Status</div>
                      <div className="font-medium text-green-400">Connected</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Participants Section */}
            {joined && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6 flex items-center space-x-3">
                  <Users className="h-6 w-6 text-blue-400" />
                  <span>Participants ({remoteUsers.length + 1})</span>
                </h2>

                <div className="space-y-4">
                  {/* Local User */}
                  <div className="bg-gray-700/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6" />
                          </div>
                          {!isMuted && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">You</div>
                          <div className="text-sm text-gray-400">ID: {senderId}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          isMuted ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"
                        }`}>
                          {isMuted ? "Muted" : "Speaking"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-100"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remote Users */}
                  {remoteUsers.map((user) => (
                    <div key={user.uid} className="bg-gray-700/30 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6" />
                            </div>
                            {user.isSpeaking && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">User {user.uid}</div>
                            <div className="text-sm text-gray-400">Remote Participant</div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          user.isSpeaking ? "bg-green-900/50 text-green-300" : "bg-gray-800 text-gray-400"
                        }`}>
                          {user.isSpeaking ? "Speaking" : "Silent"}
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-100"
                            style={{ width: `${user.audioLevel || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {remoteUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Waiting for others to join...</p>
                      <p className="text-sm mt-2">Share the recipient ID to invite others</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Quick Tips */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4">Audio Tips</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-blue-300 mb-1 flex items-center space-x-2">
                    <Headphones className="h-4 w-4" />
                    <span>Better Audio Quality</span>
                  </div>
                  <p className="text-sm text-gray-400">Use headphones to prevent echo</p>
                </div>
                <div className="p-3 bg-purple-900/20 rounded-lg">
                  <div className="font-medium text-purple-300 mb-1 flex items-center space-x-2">
                    <Mic className="h-4 w-4" />
                    <span>Microphone Position</span>
                  </div>
                  <p className="text-sm text-gray-400">Keep mic 10-15cm from your mouth</p>
                </div>
                <div className="p-3 bg-green-900/20 rounded-lg">
                  <div className="font-medium text-green-300 mb-1 flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Privacy</span>
                  </div>
                  <p className="text-sm text-gray-400">All calls are end-to-end encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-700/50 text-center text-gray-500 text-sm">
          <p>Powered by Agora Audio SDK • Crystal clear voice communication</p>
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

      {/* Audio Visualization CSS */}
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
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
        
        /* Audio wave animation */
        .audio-wave {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          gap: 4px;
        }
        
        .audio-wave-bar {
          width: 4px;
          background: linear-gradient(to top, #3b82f6, #8b5cf6);
          border-radius: 2px;
          animation: audio-wave 1.2s ease-in-out infinite;
        }
        
        @keyframes audio-wave {
          0%, 100% {
            height: 20px;
          }
          50% {
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}