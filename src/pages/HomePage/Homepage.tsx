import { ArrowRight } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const HomePage=()=> {

    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4 text-white">
          {/* Logo Section */}
          <div className="flex items-center justify-center mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 p-1">
          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTTUwIDkwQzI4LjE5IDkwIDEwIDcxLjgxIDEwIDUwQzEwIDI4LjE5IDI4LjE5IDEwIDUwIDEwQzcxLjgxIDEwIDkwIDI4LjE5IDkwIDUwQzkwIDcxLjgxIDcxLjgxIDkwIDUwIDkwWiIgZmlsbD0iI0ZGOTk2NiIvPgogIDxwYXRoIGQ9Ik01MCAyNUM0Mi4yNyAyNSAzNiAzMS4yNyAzNiAzOUMzNiA0Ni43MyA0Mi4yNyA1MyA1MCA1M0M1Ny43MyA1MyA2NCA0Ni43MyA2NCAzOUM2NCAzMS4yNyA1Ny43MyAyNSA1MCAyNVoiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+Cg=="
              alt="Clara Palm Icon"
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>
          </div>
    
          {/* Main Content */}
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
              "Welcome to Clara Palmistry!"
            </h2>
    
            <p className="text-xl md:text-2xl mb-8 text-purple-200">Ready to Laugh and Discover Your Destiny?</p>
            <p className="text-xl md:text-2xl mb-8 text-purple-200">
              Press 'Start' and let Clara see what your palm says about you!
            </p>
    
            <button 
              onClick={()=> navigate('/input')}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-full overflow-hidden transition-all duration-300 ease-in-out hover:bg-purple-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-purple-900"
            >
              <span className="mr-2" >Start</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
    
            <p className="mt-12 text-purple-300 text-sm">
              Powered by AI • Just for Fun • Not Financial Advice 😉
            </p>
          </div>
        </div>
      );
}

export default HomePage;