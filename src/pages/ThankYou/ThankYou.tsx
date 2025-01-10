import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from "react-router-dom";

const Thankyou=() =>{
    const location = useLocation();
    const navigate = useNavigate();
    const { name } = location.state || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 transform hover:scale-105 transition-all duration-300">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-12 h-12 text-amber-300 animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-amber-200 to-yellow-400 text-transparent bg-clip-text mb-4">
            Thank you, {name}
          </h1>
          
          <div className="space-y-4 text-center">
            <p className="text-gray-200 text-lg leading-relaxed">
              Our mystical journey through your palm lines has been enlightening.
              Thank you for sharing your energy with us today.
            </p>
            
            <p className="text-amber-300/80 italic">
              "The lines on your palm tell stories of yesterday, guide you today, and illuminate tomorrow."
            </p>
          </div>
          
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => navigate('/')}
              className="group px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full text-black font-semibold 
                         hover:from-amber-500 hover:to-amber-700 transform hover:scale-105 transition-all duration-300
                         flex items-center gap-2 shadow-lg hover:shadow-amber-500/25"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Thankyou;