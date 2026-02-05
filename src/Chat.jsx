import { useState, useRef } from "react";
import AgoraRTM from "agora-rtm-sdk";
import { MessageSquare, Send, LogIn, LogOut, User, Users, MessageCircle,Loader2,Bell,Shield,CheckCircle,XCircle} from "lucide-react";

const APP_ID = "5a6591e3ec6b438f9095dfbf7add91ce";
const TOKEN_API = "https://celebstalks.pythonanywhere.com/chat/";

export default function App() {
  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [username, setUsername] = useState("");
  const [peer, setPeer] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");


  // Show notification
  const showNotificationMessage = (message, duration = 3000) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), duration);
  };

  const addMessage = (msg, type = "message") => {
    setMessages((prev) => [...prev, { text: msg, type, timestamp: new Date() }]);
  };

  const login = async () => {
    if (!username.trim()) {
      showNotificationMessage("Please enter a username", 2000);
      return;
    }

    setLoading(true);
    addMessage("Connecting to chat service...", "system");

    try {
      const res = await fetch(TOKEN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) throw new Error("Failed to get token");

      const data = await res.json();
      const token = data.chat_token;

      if (!token) throw new Error("No token received");

      const client = AgoraRTM.createInstance(APP_ID);
      clientRef.current = client;

      client.on("ConnectionStateChanged", (state, reason) => {
        console.log("Connection state:", state, reason);
        setConnectionStatus(state);
        
        if (state === "CONNECTED") {
          showNotificationMessage("Connected to chat service", 2000);
        } else if (state === "DISCONNECTED") {
          addMessage("Disconnected from chat service", "system");
        } else if (state === "ABORTED") {
          addMessage("Session terminated", "system");
          setLoggedIn(false);
        }
      });

      client.on("MessageFromPeer", (message, peerId) => {
        const newMsg = `${peerId}: ${message.text}`;
        addMessage(newMsg, "received");
        
        // Show notification for new messages
        if (document.hidden) {
          showNotificationMessage(`New message from ${peerId}`);
        }
      });

      await client.login({ uid: username, token });
      
      setLoggedIn(true);
      setConnectionStatus("CONNECTED");
      addMessage(`Welcome ${username}! You are now connected.`, "system");
      showNotificationMessage("Login successful!", 2000);
      
    } catch (err) {
      console.error("Login error:", err);
      addMessage(`Login failed: ${err.message}`, "error");
      showNotificationMessage("Login failed. Please try again.", 3000);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!peer.trim() || !text.trim()) {
      showNotificationMessage("Please enter recipient and message", 2000);
      return;
    }

    if (!clientRef.current) {
      showNotificationMessage("Not connected to chat", 2000);
      return;
    }

    try {
      await clientRef.current.sendMessageToPeer({ text }, peer);
      addMessage(`You → ${peer}: ${text}`, "sent");
      setText("");
    } catch (err) {
      console.error("Send error:", err);
      addMessage(`Failed to send: ${err.message}`, "error");
      showNotificationMessage("Failed to send message", 2000);
    }
  };

  const logout = async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.logout();
        addMessage("Logged out successfully", "system");
      } catch (err) {
        console.error("Logout error:", err);
      }
      clientRef.current = null;
    }
    
    setLoggedIn(false);
    setConnectionStatus("Disconnected");
    setMessages([]);
    showNotificationMessage("Logged out", 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (loggedIn) {
        sendMessage();
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-6">
      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-gray-800 border-l-4 border-blue-500 p-4 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-blue-400 mr-3" />
              <span className="text-sm">{notificationMessage}</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-2xl">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Agora RTM Chat
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === "CONNECTED" ? "bg-green-500 animate-pulse" :
                    connectionStatus === "CONNECTING" ? "bg-yellow-500 animate-pulse" :
                    "bg-red-500"
                  }`} />
                  <span className="text-sm text-gray-400">
                    {connectionStatus.charAt(0) + connectionStatus.slice(1).toLowerCase()}
                  </span>
                  {loggedIn && (
                    <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
                      {username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {loggedIn && (
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Login/Chat Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Login Section */}
            {!loggedIn ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="flex items-center space-x-3 mb-6">
                  <Shield className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-semibold">Secure Login</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Enter your username
                    </label>
                    <div className="flex">
                      <div className="flex items-center px-4 bg-gray-700 rounded-l-lg border border-r-0 border-gray-600">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., john_doe"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={login}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-3 px-4 font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-5 w-5" />
                        <span>Login to Chat</span>
                      </>
                    )}
                  </button>
                  
                  <div className="text-sm text-gray-500 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>End-to-end encrypted</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Real-time messaging</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Input Section */
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        <Users className="h-4 w-4 inline mr-2" />
                        Send to
                      </label>
                      <input
                        type="text"
                        value={peer}
                        onChange={(e) => setPeer(e.target.value)}
                        placeholder="Recipient username"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        <MessageCircle className="h-4 w-4 inline mr-2" />
                        Your message
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message..."
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!peer || !text}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 flex items-center justify-between">
                    <span>Press Enter to send • Shift+Enter for new line</span>
                    <span className="text-blue-400">
                      {text.length}/500 characters
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Display */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Messages</span>
                </h2>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="h-[400px] overflow-y-auto pr-2 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg">No messages yet</p>
                    <p className="text-sm mt-2">
                      {loggedIn ? "Start a conversation by sending a message" : "Login to start chatting"}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg ${
                        msg.type === "sent"
                          ? "bg-blue-900/30 border-l-4 border-blue-500 ml-8"
                          : msg.type === "received"
                          ? "bg-gray-700/50 border-l-4 border-green-500 mr-8"
                          : msg.type === "error"
                          ? "bg-red-900/20 border-l-4 border-red-500"
                          : "bg-gray-800/30 border-l-4 border-gray-500"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          {msg.type === "sent" && (
                            <div className="text-blue-300 text-sm font-medium mb-1">
                              You → {peer}
                            </div>
                          )}
                          {msg.type === "received" && (
                            <div className="text-green-300 text-sm font-medium mb-1">
                              {msg.text.split(":")[0]}
                            </div>
                          )}
                          {msg.type === "error" && (
                            <div className="text-red-300 text-sm font-medium mb-1 flex items-center">
                              <XCircle className="h-4 w-4 mr-2" />
                              Error
                            </div>
                          )}
                          {msg.type === "system" && (
                            <div className="text-gray-400 text-sm font-medium mb-1">
                              System
                            </div>
                          )}
                          <p className={
                            msg.type === "error" ? "text-red-200" :
                            msg.type === "system" ? "text-gray-300" : "text-white"
                          }>
                            {msg.type === "received" ? msg.text.split(": ").slice(1).join(": ") : msg.text}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* Right Panel - Info/Online Users */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setText("Hello! 👋")}
                  disabled={!loggedIn}
                  className="p-3 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-1">👋</div>
                  <div className="text-sm">Say Hello</div>
                </button>
                <button
                  onClick={() => setText("Are you available?")}
                  disabled={!loggedIn}
                  className="p-3 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-1">🤔</div>
                  <div className="text-sm">Check Availability</div>
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(username)}
                  disabled={!loggedIn}
                  className="p-3 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-1">📋</div>
                  <div className="text-sm">Copy Username</div>
                </button>
                <button
                  onClick={() => window.open("https://agora.io", "_blank")}
                  className="p-3 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-1">🌐</div>
                  <div className="text-sm">Agora Docs</div>
                </button>
              </div>
            </div>

            {/* Connection Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4">Connection Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    connectionStatus === "CONNECTED" ? "bg-green-900/30 text-green-400" :
                    connectionStatus === "CONNECTING" ? "bg-yellow-900/30 text-yellow-400" :
                    "bg-red-900/30 text-red-400"
                  }`}>
                    {connectionStatus}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Messages</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="pt-3 border-t border-gray-700/50">
                  <div className="text-sm text-gray-500">
                    Powered by Agora Real-Time Messaging
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}