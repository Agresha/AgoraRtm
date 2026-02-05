import Chat from "./Chat";
import VideoCall from "./Video"; 
import AudioCall from "./Audio";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { MessageSquare, Video, Headphones, Home,Bell,User,Shield,Wifi} from "lucide-react";

// Navigation Component
function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", label: "Chat", icon: MessageSquare, color: "from-blue-500 to-cyan-500" },
    { path: "/videocall", label: "Video Call", icon: Video, color: "from-purple-500 to-pink-500" },
    { path: "/audiocall", label: "Audio Call", icon: Headphones, color: "from-green-500 to-emerald-500" },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-b border-gray-700/50 sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Agora Connect
              </h1>
              <div className="flex items-center space-x-2">
                <Wifi className="h-3 w-3 text-green-500 animate-pulse" />
                <p className="text-xs text-gray-400">Live Connection</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <div key={item.path} className="relative">
                  <a
                    href={item.path}
                    className={`
                      relative px-5 py-3 rounded-xl transition-all duration-300
                      flex items-center space-x-3 group
                      ${active 
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      }
                    `}
                  >
                    {/* Active indicator glow */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r opacity-30 blur-xl rounded-xl" />
                    )}
                    
                    <Icon className={`h-5 w-5 ${active ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                    <span className="font-semibold">{item.label}</span>
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl" />
                    </div>
                  </a>
                  
                  {/* Active underline */}
                  {active && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full animate-pulse" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <div key={item.path} className="relative">
                  <a
                    href={item.path}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                      ${active 
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${active ? 'text-white' : ''}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                    
                    {active && (
                      <div className="absolute -bottom-2 w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full" />
                    )}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navigation />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/videocall" element={<VideoCall />} />
            <Route path="/audiocall" element={<AudioCall />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-400">End-to-end encrypted • Secure communication</span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Support</a>
                <a href="https://agora.io" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                  Powered by Agora
                </a>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 mt-4">
              <p>© {new Date().getFullYear()} Agora Connect. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>

    </Router>
  );
}

export default App;