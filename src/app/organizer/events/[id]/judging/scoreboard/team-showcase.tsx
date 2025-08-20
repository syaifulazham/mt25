import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, ChevronLeft, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Member {
  id: number;
  name: string;
}

export interface TeamShowcaseProps {
  team: {
    attendanceTeamId: number;
    teamName: string;
    contingentName: string;
    contestName: string;
    totalScore: number | null;
    stateName?: string | null;
    contingentLogoUrl?: string | null;
    members?: Member[];
  };
  position: number;
  onClose: () => void;
}

export default function TeamShowcase({ team, position, onClose }: TeamShowcaseProps) {
  const positionText = position === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${position}`;
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-full h-full flex flex-col relative text-white shadow-2xl overflow-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 z-[1]"></div>
          <Image 
            src="/images/poster/mt-bg.png" 
            alt="Background" 
            fill 
            sizes="100vw"
            className="object-cover"
          />
        </div>
        
        {/* Content Container with z-index to appear above the background image */}
        <div className="relative z-20 w-full h-full flex flex-col">
          <div className="relative flex flex-col items-center text-center">
            {/* Header with close button */}
            <div className="absolute right-4 top-4 z-10">
              <Button 
                variant="outline"
                size="icon" 
                onClick={onClose}
                className="rounded-full bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Logo and contest info */}
            <div className="flex flex-col items-center justify-center px-6 w-full">
              {/* Techlympics logo */}
              <div className="relative w-40 h-40">
                <Image
                  src="/images/poster/mt-logo.png"
                  alt="Techlympics Logo"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain"
                />
              </div>
              <h2 className="text-3xl font-bold mb-2">{team.contestName}</h2>
            </div>
            
            {/* Position indicator */}
            <motion.div 
              className="py-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 w-full flex justify-center items-center gap-4"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {/* State flag to the left of ranking name */}
              {team.stateName && (
                <div className="relative w-12 h-8 md:w-16 md:h-10 flex-shrink-0">
                  <Image
                    src={`/images/flags/${team.stateName?.toLowerCase()}.png`}
                    alt={`${team.stateName} Flag`}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain"
                  />
                </div>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-wide">{positionText}</h1>
            </motion.div>
            
            {/* Team info */}
            <div className="px-8 py-8 w-full max-w-4xl">
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Contingent logo above team name */}
                <div className="flex items-center justify-center mb-4">
                  {/* Contingent Logo */}
                  {team.contingentLogoUrl && (
                    <div className="relative w-16 h-16 md:w-20 md:h-20">
                      <Image 
                        src={team.contingentLogoUrl}
                        alt={`${team.contingentName} Logo`}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
                
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3 text-center text-[#ffa400]">{team.teamName}</h2>
                <div className="flex flex-col items-center">
                  <h3 className="text-3xl md:text-4xl text-gray-200 mb-3 font-semibold">
                    {team.contingentName ? team.contingentName.replace(/\sContingent$|^Contingent\s/i, '') : ''}
                  </h3>
                </div>
              </motion.div>
              
              {/* Team members */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-center mb-4 mt-8">
                  <Users className="mr-2 h-5 w-5 text-[#ffa400]" />
                  <h3 className="text-2xl font-semibold text-[#ffa400]">Ahli Pasukan</h3>
                </div>
                
                {team.members && team.members.length > 0 ? (
                  <div className="flex flex-col space-y-4 max-w-2xl mx-auto">
                    {team.members.map((member) => (
                      <div key={member.id} className="border-b border-white/10 pb-3 text-center">
                        <p className="text-white text-lg md:text-xl font-bold">{member.name.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-300 text-center">Tiada maklumat ahli pasukan</p>
                )}
              </motion.div>
            </div>
            
            {/* No back button as requested */}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
