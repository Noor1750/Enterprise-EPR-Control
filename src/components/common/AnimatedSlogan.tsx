import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap } from 'lucide-react';

interface AnimatedSloganProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  className?: string;
  showSparkle?: boolean;
}

export default function AnimatedSlogan({ 
  size = 'responsive', 
  className = '',
  showSparkle = true 
}: AnimatedSloganProps) {
  // Size presets
  const sizeClasses = {
    sm: 'text-sm sm:text-base font-bold',
    md: 'text-base sm:text-lg md:text-xl font-extrabold',
    lg: 'text-xl sm:text-2xl md:text-3xl font-black',
    xl: 'text-2xl sm:text-3xl md:text-4xl font-black',
    responsive: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, transition: { duration: 0.25 } }}
      className={`relative inline-flex items-center justify-center select-none cursor-default py-1 px-2 group ${className}`}
    >
      {/* Ambient Realistic Glow Backdrop */}
      <div 
        className="absolute inset-0 -z-10 rounded-full opacity-40 group-hover:opacity-75 blur-xl transition-opacity duration-700 pointer-events-none bg-gradient-to-r from-indigo-500/20 via-emerald-400/25 to-rose-400/20"
      />

      {/* Main Text Content */}
      <div className={`flex items-center tracking-tight italic whitespace-nowrap drop-shadow-xs ${sizeClasses[size]}`}>
        
        {/* "Work" - Deep Indigo with gentle lift */}
        <motion.span
          animate={{
            y: [0, -1.5, 0],
          }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative inline-block bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(79,70,229,0.25)]"
        >
          Work&nbsp;
        </motion.span>

        {/* "Smarter," - Emerald with iridescent shine and subtle particle sparkle */}
        <motion.span
          animate={{
            y: [0, -2.5, 0],
          }}
          transition={{
            duration: 3.6,
            delay: 0.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative inline-flex items-center bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-[0_1px_3px_rgba(16,185,129,0.35)]"
        >
          Smarter,
          {showSparkle && (
            <motion.span
              animate={{
                scale: [0.85, 1.2, 0.85],
                rotate: [0, 15, -10, 0],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block ml-0.5 text-emerald-400 align-top"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 fill-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </motion.span>
          )}
        </motion.span>

        {/* "Not" - Refined Slate with subtle pulse */}
        <motion.span
          animate={{
            y: [0, -1, 0],
            opacity: [0.85, 1, 0.85]
          }}
          transition={{
            duration: 3.6,
            delay: 0.4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-slate-400 mx-1.5 sm:mx-2.5 font-semibold not-italic text-[0.88em]"
        >
          Not
        </motion.span>

        {/* "Harder" - Coral/Rose with warm energy pulse */}
        <motion.span
          animate={{
            y: [0, -2, 0],
          }}
          transition={{
            duration: 3.6,
            delay: 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative inline-flex items-center bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(244,63,94,0.3)]"
        >
          Harder
        </motion.span>
      </div>

      {/* Realistic Specular Highlight Beam (Sweeps across every 4 seconds) */}
      <motion.div
        aria-hidden="true"
        initial={{ x: '-120%', opacity: 0 }}
        animate={{
          x: ['-120%', '220%'],
          opacity: [0, 0.85, 0.85, 0]
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          repeatDelay: 2.6,
          ease: [0.4, 0, 0.2, 1]
        }}
        className="absolute inset-y-0 w-24 sm:w-36 pointer-events-none -skew-x-25 bg-gradient-to-r from-transparent via-white/40 to-transparent mix-blend-overlay"
      />
    </motion.div>
  );
}
